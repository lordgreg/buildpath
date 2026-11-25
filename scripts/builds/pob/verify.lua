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

-- Breadth-first path from anywhere allocated to `target`, through unallocated
-- nodes. Returns the list of nodes to add, or nil when the target is reachable
-- only through the allocated set (already connected) or not at all.
-- Paths may only run through ordinary passives: a keystone such as Chaos
-- Inoculation sits on the way to places we want and would silently gut the
-- build. Masteries and ascendancy nodes are never pathing material either.
local function traversable(id)
  local node = nodes[id] or nodes[tostring(id)]
  if not node then return false end
  if node.isKeystone or node.isMastery or node.ascendancyName or node.isAscendancyStart then
    return false
  end
  return true
end

local function pathTo(target)
  if allocated[target] then return {} end
  if not traversable(target) and not allocated[target] then
    local node = nodes[target] or nodes[tostring(target)]
    if node and (node.isKeystone or node.isMastery) then return nil end
  end
  local parent, queue, head = {}, {}, 1
  local seen = {}
  for id in pairs(allocated) do
    for _, other in ipairs(neighbours[id] or {}) do
      if not allocated[other] and not seen[other] and traversable(other) then
        seen[other] = true
        parent[other] = nil
        queue[#queue + 1] = other
      end
    end
  end
  while head <= #queue do
    local id = queue[head]
    head = head + 1
    if id == target then
      local path = {}
      local cursor = id
      while cursor and not allocated[cursor] do
        table.insert(path, 1, cursor)
        cursor = parent[cursor]
      end
      return path
    end
    for _, other in ipairs(neighbours[id] or {}) do
      if not allocated[other] and not seen[other] and traversable(other) then
        seen[other] = true
        parent[other] = id
        queue[#queue + 1] = other
      end
    end
  end
  return nil
end

-- Candidates: notables first, then keystones, ranked by which target pattern
-- they satisfy (earlier patterns win), then by id for determinism.
local candidates = {}
for id, node in pairs(nodes) do
  local kind = node.isNotable and "notable" or (node.isKeystone and "keystone") or nil
  if kind and not node.isAscendancyStart and not node.ascendancyName and not node.isMastery then
    local text = statText(node)
    local priority
    for index, pattern in ipairs(spec.targets or {}) do
      if text:lower():find(pattern:lower(), 1, true) then
        priority = index
        break
      end
    end
    if priority then
      candidates[#candidates + 1] = { id = tonumber(id), priority = priority, kind = kind, name = node.name, seats = pathTo(id) }
    end
  end
end
-- Stable, deterministic order: pattern priority, then notable before keystone,
-- then id. `pathTo` was computed before allocation so it is only a hint; real
-- paths are recomputed as the tree fills.
table.sort(candidates, function(a, b)
  if a.priority ~= b.priority then return a.priority < b.priority end
  if a.kind ~= b.kind then return a.kind < b.kind end
  return a.id < b.id
end)

local budget = math.max(2, (spec.points or 100) - 1)
local planned, skipped = {}, 0
for _, candidate in ipairs(candidates) do
  if allocatedCount() >= budget then break end
  local path = pathTo(candidate.id)
  if path and #path > 0 and allocatedCount() + #path <= budget then
    for _, id in ipairs(path) do allocated[id] = true end
    planned[#planned + 1] = candidate.name or candidate.id
  elseif path == nil then
    skipped = skipped + 1
  end
end

-- Ascendancy points: matched by name slug, granted by the labs the seed allows.
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
  if ascendStart then ascendNodes[#ascendNodes + 1] = ascendStart end
  for _, point in ipairs(spec.ascendancyPoints or {}) do
    if (point.lab or 1) <= (spec.labs or 4) then
      local id = bySlug[slug(point.node)]
      if id then ascendNodes[#ascendNodes + 1] = id end
    end
  end
end

-- Item text: one block per slot, already rendered by the Node synthesizer.
local itemBlocks = {}
for _, item in ipairs(spec.items or {}) do
  itemBlocks[#itemBlocks + 1] = {
    slot = item.slot,
    text = item.text,
  }
end

local gemPath = {}
do
  local gems = dofile("Data/Gems.lua")
  for path, gem in pairs(gems) do
    if gem.name and not gemPath[gem.name] then gemPath[gem.name] = path end
  end
end

local function gemXml(group, gem, level, quality, main)
  local path = gemPath[gem]
  if not path then return nil end
  return string.format(
    '\t\t\t<Gem gemId="%s" nameSpec="%s" level="%d" quality="%d" enabled="true"%s/>\n',
    path, gem, level, quality, main and ' mainActiveSkill="1"' or ""
  )
end

local xml = {}
local function add(text) xml[#xml + 1] = text end

add('<?xml version="1.0" encoding="UTF-8"?>\n<PathOfBuilding>\n')
add(string.format(
  '\t<Build level="%d" targetVersion="3_0" className="%s" ascendClassName="%s" mainSocketGroup="1" bandit="%s" pantheonMajorGod="%s" pantheonMinorGod="%s" viewMode="CALCS">\n',
  spec.level or 90, spec.className, spec.ascendancyClass or "", spec.bandit or "None",
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
  for id in pairs(allocated) do list[#list + 1] = tostring(id) end
  table.sort(list, function(a, b) return tonumber(a) < tonumber(b) end)
  return list
end)(), ",")))
add('>\n\t\t</Spec>\n\t</Tree>\n')

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
for index, item in ipairs(itemBlocks) do
  add(string.format('\t\t<Item id="%d">\n%s\n\t\t</Item>\n', index, item.text))
  slotMap[#slotMap + 1] = string.format('\t\t\t<Slot name="%s" itemId="%d"/>\n', item.slot, index)
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

local result = {
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
    print(string.format("DEBUG group slot=%s gems=%d label=%s", tostring(group.slot), #(group.gemList or {}), tostring(group.displayLabel)))
  end
  if env and env.minion and env.minion.output then
    local m = env.minion.output
    print(string.format("DEBUG minion dps=%s life=%s ehp=%s",
      tostring(m.CombinedDPS), tostring(m.Life), tostring(m.TotalEHP)))
  end
end
