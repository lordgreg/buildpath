-- Dumps the passive tree geometry as JSON so the site can draw a real tree
-- instead of six dots. Run from the pinned PoB `src/` directory:
--
--   TREE_OUT=src/generated/tree-geometry.json luajit ../../scripts/.../geometry.lua
--
-- Output: { version, nodes: [{id,x,y,notable,keystone,socket,name}], edges: [[a,b]] }

dofile("HeadlessWrapper.lua")

local dkjson = require("dkjson")
local version = assert(os.getenv("TREE_VERSION"), "TREE_VERSION is not set")
local outPath = assert(os.getenv("TREE_OUT"), "TREE_OUT is not set")

local data = dofile("TreeData/" .. version .. "/tree.lua")

-- Positions come from PoB's own loader, which derives them from the group
-- centre plus the node's orbit radius and angle.
newBuild()
local spec = build.spec
local tree = spec and spec.tree

local nodes, edges = {}, {}
local seenEdge = {}
for id, node in pairs(data.nodes) do
  local gnode = tree and tree.nodes and (tree.nodes[tonumber(id)] or tree.nodes[id])
  if gnode and gnode.x and gnode.y and not gnode.ascendancyName then
    nodes[#nodes + 1] = {
      id = tonumber(id),
      x = math.floor(gnode.x + 0.5),
      y = math.floor(gnode.y + 0.5),
      notable = gnode.isNotable and true or false,
      keystone = gnode.isKeystone and true or false,
      socket = gnode.isJewelSocket and true or false,
      name = gnode.name or "",
    }
    for _, other in ipairs(node.out or {}) do
      local a, b = tonumber(id), tonumber(other)
      if a and b then
        local key = a < b and (a .. ":" .. b) or (b .. ":" .. a)
        if not seenEdge[key] then
          seenEdge[key] = true
          edges[#edges + 1] = { a, b }
        end
      end
    end
  end
end

table.sort(nodes, function(a, b) return a.id < b.id end)
table.sort(edges, function(a, b)
  if a[1] ~= b[1] then return a[1] < b[1] end
  return a[2] < b[2]
end)

local handle = assert(io.open(outPath, "w"))
handle:write(dkjson.encode({ version = version, nodes = nodes, edges = edges }, { indent = false }))
handle:close()
print(string.format("geometry: %d nodes, %d edges -> %s", #nodes, #edges, outPath))
