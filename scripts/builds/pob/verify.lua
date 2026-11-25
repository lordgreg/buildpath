-- Runs inside the pinned Path of Building checkout (its `src/` directory).
--
--   BUILD_SPEC=/path/spec.json luajit /path/verify.lua
--
-- Plans a passive tree from the spec's target patterns, assembles a build, and
-- prints one `RESULT {json}` line. Everything PoB-specific lives here so the
-- Node side never has to know the tree format.
--
-- Not shipped to the browser: this is a CI/dev oracle (PLAN-BUILDS.md D6).

dofile("HeadlessWrapper.lua")

local dkjson = require("dkjson")

local function readFile(path)
  local handle = assert(io.open(path, "r"), "cannot read " .. tostring(path))
  local text = handle:read("*a")
  handle:close()
  return text
end

local specPath = assert(os.getenv("BUILD_SPEC"), "BUILD_SPEC is not set")
local spec = dkjson.decode(readFile(specPath))

local data = dofile("TreeData/" .. spec.treeVersion .. "/tree.lua")
local nodes = data.nodes

-- Adjacency: the tree stores both directions, but not always symmetrically.
local neighbours = {}
local function addEdge(from, to)
  -- Node ids arrive as strings from the tree file; everything else here is
  -- numeric, so normalise once at the edge.
  from, to = tonumber(from) or from, tonumber(to) or to
  if from == nil or to == nil then return end
  neighbours[from] = neighbours[from] or {}
  neighbours[from][#neighbours[from] + 1] = to
end
for id, node in pairs(nodes) do
  for _, to in ipairs(node.out or {}) do addEdge(id, to) end
  for _, from in ipairs(node["in"] or {}) do addEdge(id, from) end
end

local function slug(text)
  return (text:lower():gsub("[^a-z0-9]+", "-"):gsub("^-+", ""):gsub("-+$", ""))
end

local function statText(node)
  return table.concat(node.stats or {}, " ")
end

-- Class start node: `classStartIndex` is 0-based, in ladder order.
local classIndex
for index, class in ipairs(data.classes) do
  if class.name == spec.className then classIndex = index - 1 end
end
assert(classIndex, "unknown class " .. tostring(spec.className))

local startNode
for id, node in pairs(nodes) do
  if node.classStartIndex == classIndex then startNode = id end
end
assert(startNode, "no start node for " .. spec.className)

local allocated = { [startNode] = true }
local function allocatedCount()
  local n = 0
  for _ in pairs(allocated) do n = n + 1 end
  return n
end

-- Paths may only run through ordinary passives: a keystone such as Chaos
-- Inoculation sits on the way to places we want and would silently gut the
-- build. Masteries and ascendancy nodes are never pathing material either.
local function traversable(id)
  local node = nodes[id] or nodes[tostring(id)]
  if not node then return false end
  if node.isKeystone or node.isMastery or node.ascendancyName or node.isAscendancyStart then
    return false
  end
  -- Cluster jewels and their proxies live in the tree data but only exist when
  -- the jewel is socketed. PoB drops them silently, so a planner that walked
  -- into them would report points the character never has.
  if node.isProxy then return false end
  if node.isJewelSocket and node.name ~= "Basic Jewel Socket" then return false end
  -- Basic jewel sockets are ordinary passives you pay a point for.

  return true
end

-- One multi-source breadth-first pass per iteration gives every reachable node
-- its distance from the allocated set, so candidates can be compared by how
-- much they cost to reach instead of in file order.
local function distances()
  local depth, parent, queue, head = {}, {}, {}, 1
  for id in pairs(allocated) do
    depth[id] = 0
    queue[#queue + 1] = id
  end
  while head <= #queue do
    local id = queue[head]
    head = head + 1
    for _, other in ipairs(neighbours[id] or {}) do
      if depth[other] == nil and (allocated[other] or traversable(other)) then
        depth[other] = depth[id] + 1
        parent[other] = id
        queue[#queue + 1] = other
      end
    end
  end
  return depth, parent
end

-- Candidate notables: which target pattern they satisfy sets their weight.
local candidates = {}
for id, node in pairs(nodes) do
  if node.isNotable and not node.isAscendancyStart and not node.ascendancyName and not node.isMastery and not node.isKeystone then
    local text = statText(node):lower()
    local priority
    for index, pattern in ipairs(spec.targets or {}) do
      if text:find(pattern:lower(), 1, true) then
        priority = index
        break
      end
    end
    if priority then
      candidates[#candidates + 1] = { id = tonumber(id), priority = priority, name = node.name }
    end
  end
end
table.sort(candidates, function(a, b)
  if a.priority ~= b.priority then return a.priority < b.priority end
  return a.id < b.id
end)

-- Earlier patterns are worth more; the score is value per point spent, so a
-- cheap minion notable beats a distant life notable and travel is not free.
-- The curve is graded rather than "first three matter": a seed lists more than
-- three things it wants, and flattening everything past the third made the
-- planner ignore attack speed or crit in favour of whatever was nearest.
local WEIGHTS = { 4.0, 3.0, 2.2, 1.7, 1.3, 1.0, 0.8 }
local function weight(priority)
  return WEIGHTS[priority] or 0.6
end

local budget = math.max(2, (spec.points or 100) - 1)
local planned, taken, skipped = {}, {}, 0

-- Keystones the seed declares are bought first. A build that takes Resolute
-- Technique must have it, not "if the greedy loop happens to reach it": the
-- whole point of the node is that every attack hits. The path is bought like
-- any other, so the point budget still decides whether the seed is legal.
-- Keystones are not traversable, so the search allows the target itself.
local function pathTo(target)
  local parent, queue, head, seen = {}, {}, 1, {}
  for id in pairs(allocated) do
    seen[id] = true
    queue[#queue + 1] = id
  end
  while head <= #queue do
    local current = queue[head]
    head = head + 1
    if current == target then break end
    for _, other in ipairs(neighbours[current] or {}) do
      other = tonumber(other)
      if other and not seen[other] then
        local nextNode = nodes[other] or nodes[tostring(other)]
        if nextNode and (traversable(other) or other == target) then
          seen[other] = true
          parent[other] = current
          queue[#queue + 1] = other
        end
      end
    end
  end
  if not seen[target] then return nil end
  local path, cursor = {}, target
  while cursor and not allocated[cursor] do
    table.insert(path, 1, cursor)
    cursor = parent[cursor]
  end
  return path
end

for _, name in ipairs(spec.keystones or {}) do
  local target
  for id, node in pairs(nodes) do
    if node.isKeystone and slug(node.name) == slug(name) then
      target = tonumber(id)
      break
    end
  end
  if not target then error("unknown keystone: " .. tostring(name)) end
  if not allocated[target] then
    local path = pathTo(target)
    if not path then error("keystone " .. name .. " is unreachable from the class start") end
    if allocatedCount() + #path > budget then
      -- A level-12 character cannot have taken a keystone ten points away.
      -- Defer it to the checkpoint whose budget can afford it, and say so.
      print("WARN " .. name .. " deferred: " .. #path .. " points do not fit this checkpoint")
    else
      for _, id in ipairs(path) do allocated[id] = true end
      planned[#planned + 1] = name
    end
  end
end

-- Jewel sockets first. They cost one point each and carry a Ghastly Eye, which
-- is worth more than most notables. Allocating them *after* the notable loop
-- left no budget for them, so the jewels were listed in the gear but never
-- socketed and contributed nothing.
local socketIds, socketsTaken = {}, 0
local wantedSockets = math.min(spec.jewelCount or 0, 8)
if wantedSockets > 0 then
  local depth, parent = distances()
  local reachable = {}
  for id, node in pairs(nodes) do
    local key = tonumber(id)
    if node.isJewelSocket and node.name == "Basic Jewel Socket" and not allocated[key] and depth[key] then
      reachable[#reachable + 1] = { id = key, cost = depth[key] }
    end
  end
  table.sort(reachable, function(a, b)
    if a.cost ~= b.cost then return a.cost < b.cost end
    return a.id < b.id
  end)
  for _, socket in ipairs(reachable) do
    if socketsTaken >= wantedSockets or allocatedCount() >= budget then break end
    local path = {}
    local cursor = socket.id
    while cursor and not allocated[cursor] do
      table.insert(path, 1, cursor)
      cursor = parent[cursor]
    end
    if #path > 0 and allocatedCount() + #path <= budget then
      for _, id in ipairs(path) do allocated[id] = true end
      socketIds[#socketIds + 1] = socket.id
      socketsTaken = socketsTaken + 1
    end
  end
end

while allocatedCount() < budget do
  local depth, parent = distances()
  local best, bestScore
  for _, candidate in ipairs(candidates) do
    if not taken[candidate.id] then
      local cost = depth[candidate.id]
      if cost == nil then
        skipped = skipped + 1
        taken[candidate.id] = true
      elseif cost > 0 then
        local score = weight(candidate.priority) / cost
        if bestScore == nil or score > bestScore
          or (score == bestScore and candidate.priority < best.priority) then
          best, bestScore = candidate, score
        end
      else
        taken[candidate.id] = true
      end
    end
  end
  if not best then break end
  -- Walk back to the allocated set and buy the whole path if it fits.
  local path = {}
  local cursor = best.id
  while cursor and not allocated[cursor] do
    table.insert(path, 1, cursor)
    cursor = parent[cursor]
  end
  if #path == 0 or allocatedCount() + #path > budget then
    taken[best.id] = true
  else
    for _, id in ipairs(path) do allocated[id] = true end
    taken[best.id] = true
    planned[#planned + 1] = best.name or best.id
  end
end

-- Jewel sockets are allocated before the notable loop, above.

-- Ascendancy points: matched by name slug, granted by the labs the seed allows.
-- A notable is only allocatable through the ascendancy's own small passives, and
-- PoB drops an unconnected notable without saying so, so the path is bought too.
local ascendNodes = {}
if spec.ascendancyClass then
  local bySlug = {}
  for id, node in pairs(nodes) do
    if node.ascendancyName == spec.ascendancyClass and node.isNotable then
      bySlug[slug(node.name)] = tonumber(id)
    end
  end
  local ascendStart
  for id, node in pairs(nodes) do
    if node.isAscendancyStart and node.ascendancyName == spec.ascendancyClass then ascendStart = tonumber(id) end
  end
  local taken = {}
  if ascendStart then taken[ascendStart] = true end
  for _, point in ipairs(spec.ascendancyPoints or {}) do
    if (point.lab or 1) <= (spec.labs or 4) then
      local target = bySlug[slug(point.node)]
      if target and not taken[target] then
        -- Breadth-first inside the ascendancy subtree, starting from what is
        -- already allocated, so the notable is reached through its own chain.
        local parent, queue, head, seen, found = {}, {}, 1, {}, nil
        for id in pairs(taken) do
          seen[id] = true
          queue[#queue + 1] = id
        end
        while head <= #queue and not found do
          local current = queue[head]
          head = head + 1
          if current == target then found = current break end
          local node = nodes[current] or nodes[tostring(current)]
          for _, other in ipairs(node and node.out or {}) do
            other = tonumber(other)
            local nextNode = other and (nodes[other] or nodes[tostring(other)])
            if other and not seen[other] and nextNode
              and nextNode.ascendancyName == spec.ascendancyClass then
              seen[other] = true
              parent[other] = current
              queue[#queue + 1] = other
            end
          end
        end
        if found then
          local cursor = found
          while cursor and not taken[cursor] do
            taken[cursor] = true
            cursor = parent[cursor]
          end
        end
      end
    end
  end
  for id in pairs(taken) do ascendNodes[#ascendNodes + 1] = id end
  table.sort(ascendNodes)
end

-- Item text: one block per slot, already rendered by the Node synthesizer.
local itemBlocks = {}
for _, item in ipairs(spec.items or {}) do
  itemBlocks[#itemBlocks + 1] = {
    slot = item.slot,
    text = item.text,
  }
end
-- Flasks are items in their own slots; an equipped flask counts as active in
-- PoB's calc, which is what "declared uptime" means here.
for _, flask in ipairs(spec.flasks or {}) do
  itemBlocks[#itemBlocks + 1] = {
    slot = flask.slot,
    text = flask.text,
  }
end

-- PoB resolves a gem by its metadata path plus its granted-effect id; without
-- the effect id a <Gem> loads as an inert entry with no gemData, so supports
-- silently do nothing and the gate measures an unsupported skill.
local gemData = {}
do
  local gems = dofile("Data/Gems.lua")
  for path, gem in pairs(gems) do
    if gem.name and not gemData[gem.name] then
      gemData[gem.name] = { path = path, effectId = gem.gameId or gem.grantedEffectId }
    end
  end
end

local function gemXml(group, gem, level, quality, main)
  local data = gemData[gem]
  if not data then
    -- PoB silently drops a gem it does not know, and the gate then measures a
    -- different build from the one the page lists. Fail instead.
    error("PoB has no gem data for \"" .. tostring(gem) .. "\"")
  end
  return string.format(
    '\t\t\t<Gem gemId="%s" skillId="%s" nameSpec="%s" level="%d" quality="%d" qualityId="Default" enabled="true"%s/>\n',
    data.path, data.effectId or "", gem, level, quality, main and ' mainActiveSkill="1"' or ""
  )
end

-- The spec lists the normal tree plus the ascendancy nodes: counting points
-- without emitting them measured a build with no ascendancy at all.
local specNodeIds, seenSpec = {}, {}
for id in pairs(allocated) do seenSpec[id] = true; specNodeIds[#specNodeIds + 1] = id end
for _, id in ipairs(ascendNodes) do
  if not seenSpec[id] then seenSpec[id] = true; specNodeIds[#specNodeIds + 1] = id end
end
table.sort(specNodeIds)

local xml = {}
local function add(text) xml[#xml + 1] = text end

add('<?xml version="1.0" encoding="UTF-8"?>\n<PathOfBuilding>\n')
local mainGroup = 1
for index, group in ipairs(spec.skillGroups or {}) do
  local first = group.gems and group.gems[1]
  if first and spec.mainSkill and first.name == spec.mainSkill then mainGroup = index end
end

add(string.format(
  '\t<Build level="%d" targetVersion="3_0" className="%s" ascendClassName="%s" mainSocketGroup="%d" bandit="%s" pantheonMajorGod="%s" pantheonMinorGod="%s" viewMode="CALCS">\n',
  spec.level or 90, spec.className, spec.ascendancyClass or "", mainGroup, spec.bandit or "None",
  spec.pantheon and spec.pantheon.major or "None", spec.pantheon and spec.pantheon.minor or "None"
))
add('\t</Build>\n')

-- PoB requires classId and ascendClassId on a Spec that carries a node list.
local ascendClassId = 0
if spec.ascendancyClass then
  for index, name in ipairs(data.classes[classIndex + 1].ascendancies or {}) do
    if name == spec.ascendancyClass then ascendClassId = index end
  end
end

add(string.format('\t<Tree activeSpec="1">\n\t\t<Spec treeVersion="%s" classId="%d" ascendClassId="%d" nodes="%s"', spec.treeVersion, classIndex, ascendClassId, table.concat((function()
  local list = {}
  for _, id in ipairs(specNodeIds) do list[#list + 1] = tostring(id) end
  return list
end)(), ",")))
add('>\n')
if #socketIds > 0 then
  add('\t\t\t<Sockets>\n')
  for index, nodeId in ipairs(socketIds) do
    add(string.format('\t\t\t\t<Socket nodeId="%d" itemId="%d"/>\n', nodeId, #itemBlocks + index))
  end
  add('\t\t\t</Sockets>\n')
end
add('\t\t</Spec>\n\t</Tree>\n')

add('\t<Skills>\n')
for _, group in ipairs(spec.skillGroups or {}) do
  add(string.format('\t\t<Skill enabled="true" slot="%s" mainActiveSkill="1">\n', group.slot or "Body Armour"))
  for _, gem in ipairs(group.gems or {}) do
    local line = gemXml(group, gem.name, gem.level or 20, gem.quality or 0, true)
    if line then add(line) end
  end
  add('\t\t</Skill>\n')
end
add('\t</Skills>\n')

add('\t<TreeView zoomX="0" zoomY="0" zoomLevel="3">\n\t</TreeView>\n')
add('\t<Items activeItemSet="1">\n')
local slotMap = {}
for index, jewel in ipairs(spec.jewels or {}) do
  add(string.format('\t\t<Item id="%d">\n%s\n\t\t</Item>\n', #itemBlocks + index, jewel.text))
end
for index, item in ipairs(itemBlocks) do
  add(string.format('\t\t<Item id="%d">\n%s\n\t\t</Item>\n', index, item.text))
  -- Flasks carry an `active` flag on the slot; without it PoB equips the flask
  -- but applies no buff, so a gate would measure a build nobody plays.
  local active = item.slot:match('^Flask') and ' active="true"' or ''
  slotMap[#slotMap + 1] = string.format('\t\t\t<Slot name="%s" itemId="%d"%s/>\n', item.slot, index, active)
end
-- Slots are only read from inside an ItemSet; a bare <Slot> is legacy and
-- silently ignored, which would leave every item unequipped.
add('\t\t<ItemSet id="1" title="Default" useSecondWeaponSet="false">\n')
for _, line in ipairs(slotMap) do add(line) end
add('\t\t</ItemSet>\n')
add('\t</Items>\n')
add('\t<Config>\n')
for _, input in ipairs(spec.config or {}) do
  add(string.format('\t\t<Input name="%s" %s/>\n', input.name, input.value))
end
add('\t</Config>\n</PathOfBuilding>\n')

local buildXml = table.concat(xml)
if os.getenv("BUILD_XML_OUT") then
  local out = assert(io.open(os.getenv("BUILD_XML_OUT"), "w"))
  out:write(buildXml)
  out:close()
end

loadBuildFromXML(buildXml, spec.name or "verification")
local output = build.calcsTab.mainOutput
assert(output, "PoB produced no calculation output: " .. tostring(__mainObject__ and __mainObject__.promptMsg))

-- Minion damage lives on the minion's own output, not the player's. Report the
-- better of the two and say which, so a gate never compares against a zero that
-- just means "the damage is not yours".
local minion = build.calcsTab.mainEnv and build.calcsTab.mainEnv.minion
local playerDps = output.CombinedDPS or 0
local minionDps = minion and minion.output and minion.output.CombinedDPS or 0
local dps, dpsSource = playerDps, "player"
if minionDps > playerDps then dps, dpsSource = minionDps, "minion" end

-- Per-item parse count: the Node side asserts this against what it synthesised,
-- because PoB drops unparseable lines without saying so (S6).
local itemReport = {}
for index, item in ipairs(build.itemsTab.items or {}) do
  local parsed = 0
  for _, line in ipairs(item.explicitModLines or {}) do
    if line.modList and #line.modList > 0 then parsed = parsed + 1 end
  end
  itemReport[index] = { slot = tostring(item.slotName or spec.items[index] and spec.items[index].slot or index), parsed = parsed }
end

-- Exact node positions: PoB derives them from the group centre plus the node's
-- orbit radius and angle, so the thumbnail has the same shape as the real tree
-- instead of one dot per cluster.
local coords = {}
for id, node in pairs((build.spec and build.spec.nodes) or {}) do
  if node.x and node.y then coords[tonumber(id)] = { x = node.x, y = node.y } end
end
for _, group in ipairs(data.groups or {}) do
  for _, id in ipairs(group.nodes or {}) do
    local key = tonumber(id)
    if coords[key] == nil then
      coords[key] = { x = group.x or 0, y = group.y or 0 }
    end
  end
end

local allocatedIds, notableList, edgeList = {}, {}, {}
for id in pairs(allocated) do allocatedIds[#allocatedIds + 1] = id end
table.sort(allocatedIds)
local allocatedSet = {}
for _, id in ipairs(allocatedIds) do
  allocatedSet[id] = true
  local node = nodes[id] or nodes[tostring(id)]
  if node and node.isNotable and not node.ascendancyName then
    notableList[#notableList + 1] = node.name or tostring(id)
  end
end
-- `out` is directional: an edge may be listed on only one of its two nodes.
-- Recording it only when the lower id holds it drops the other half, which
-- left the taken path visibly disconnected (6 edges for 10 nodes).
local seenEdges = {}
for _, id in ipairs(allocatedIds) do
  local node = nodes[id] or nodes[tostring(id)]
  for _, other in ipairs(node and node.out or {}) do
    other = tonumber(other)
    if other and allocatedSet[other] then
      local key = id < other and (id .. ":" .. other) or (other .. ":" .. id)
      if not seenEdges[key] then
        seenEdges[key] = true
        edgeList[#edgeList + 1] = { math.min(id, other), math.max(id, other) }
      end
    end
  end
end
local treeNodes = {}
for _, id in ipairs(allocatedIds) do
  local point = coords[id]
  local node = nodes[id] or nodes[tostring(id)]
  treeNodes[#treeNodes + 1] = {
    id = id,
    x = math.floor((point and point.x or 0) + 0.5),
    y = math.floor((point and point.y or 0) + 0.5),
    notable = (node and node.isNotable and not node.ascendancyName) or false,
    name = node and node.name or "",
  }
end

local result = {
  items = itemReport,
  tree = { nodes = treeNodes, edges = edgeList, notables = notableList },
  dpsSource = dpsSource,
  minionDps = minionDps,
  minionLife = minion and minion.output and minion.output.Life or nil,
  life = output.Life,
  energyShield = output.EnergyShield,
  ward = output.Ward,
  ehp = output.TotalEHP,
  physicalMaxHit = output.PhysicalMaximumHitTaken,
  dps = dps,
  fireResist = output.FireResist,
  coldResist = output.ColdResist,
  lightningResist = output.LightningResist,
  chaosResist = output.ChaosResist,
  manaCost = output.ManaCost,
  manaUnreserved = output.ManaUnreserved,
  allocated = allocatedCount(),
  specNodes = (function() local n = 0 for _ in pairs(build.spec.allocNodes or {}) do n = n + 1 end return n end)(),
  sockets = #socketIds,
  ascendancy = #ascendNodes,
  notables = #planned,
  skipped = skipped,
}
print("RESULT " .. dkjson.encode(result))

-- Diagnostics are opt-in; without BUILD_DEBUG the RESULT line stands alone.
if os.getenv("BUILD_DEBUG") then
  local alloc = 0
  for _ in pairs((build.spec and build.spec.allocNodes) or {}) do alloc = alloc + 1 end
  print("DEBUG allocatedNodes(in PoB)=" .. alloc)
  print("DEBUG socketGroups=" .. tostring(build.skillsTab and #(build.skillsTab.socketGroupList or {})))
  local env = build.calcsTab and build.calcsTab.mainEnv
  print("DEBUG mainEnv=" .. tostring(env ~= nil) .. " minion=" .. tostring(env and env.minion ~= nil))
  for _, item in ipairs(build.itemsTab.items or {}) do
    local mods = 0
    for _ in pairs(item.modList or {}) do mods = mods + 1 end
    print(string.format("DEBUG item slot=%s base=%s mods=%d", tostring(item.slotName), tostring(item.baseName), mods))
  end
  local group = build.skillsTab and build.skillsTab.socketGroupList and build.skillsTab.socketGroupList[1]
  if group then
    for _, gem in ipairs(group.gemList or {}) do
      print(string.format("DEBUG gem %s lvl=%s enabled=%s supports=%s", tostring(gem.nameSpec), tostring(gem.level), tostring(gem.enabled), tostring(gem.gemData and gem.gemData.support or false)))
    end
    if env and env.minion and env.minion.activeSkillList then
      for _, skill in ipairs(env.minion.activeSkillList) do
        print("DEBUG minion skill " .. tostring(skill.activeSkillId) .. " " .. tostring(skill.name))
      end
    end
  end
  if group then
    print(string.format("DEBUG group slot=%s gems=%d label=%s", tostring(group.slot), #(group.gemList or {}), tostring(group.displayLabel)))
  end
  if env and env.minion and env.minion.output then
    local m = env.minion.output
    print(string.format("DEBUG minion dps=%s life=%s ehp=%s",
      tostring(m.CombinedDPS), tostring(m.Life), tostring(m.TotalEHP)))
  end
end
