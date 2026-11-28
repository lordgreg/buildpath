-- Loads the XML a published PoB code carries and reports what PoB parsed.
-- Called by scripts/builds/check-pob-code.mjs (R3).
--
--   POB_XML=/path/build.xml luajit /path/load-build.lua
--
-- Prints one `RESULT` line with the active tree, the set counts and the totals
-- across every tree, item set and skill set. A build that parses but imports
-- with nothing allocated is the failure this exists to catch.
--
-- The deflate/base64 wrapper is decoded in Node, not here: `Inflate` is a host
-- function of the desktop app, and the headless wrapper stubs it out. Node uses
-- the same url-safe base64 + zlib scheme PoB's import tab uses, so what PoB
-- loads here is byte-for-byte what a reader's paste decompresses to.

dofile("HeadlessWrapper.lua")

local path = assert(os.getenv("POB_XML"), "POB_XML is not set")
local handle = assert(io.open(path, "r"))
local xml = handle:read("*a")
handle:close()

loadBuildFromXML(xml, "round-trip")

local function gemCount(groups)
  local total = 0
  for _, group in ipairs(groups or {}) do
    for _, gem in ipairs(group.gemList or {}) do
      if gem.nameSpec and gem.nameSpec ~= "" then total = total + 1 end
    end
  end
  return total
end

local activeNodes = 0
for _ in pairs((build.spec and build.spec.allocNodes) or {}) do activeNodes = activeNodes + 1 end

local specs = #((build.treeTab and build.treeTab.specList) or {})

local itemSets = #((build.itemsTab and build.itemsTab.itemSetOrderList) or {})
local skillSets = #((build.skillsTab and build.skillsTab.skillSetOrderList) or {})

local items, flasks = 0, 0
for _, item in ipairs((build.itemsTab and build.itemsTab.items) or {}) do
  items = items + 1
  if item.base and item.base.flask then flasks = flasks + 1 end
end

local gems = 0
for _, set in pairs((build.skillsTab and build.skillsTab.skillSets) or {}) do
  gems = gems + gemCount(set.socketGroupList)
end

local activeSlots = 0
local activeSet = build.itemsTab and build.itemsTab.activeItemSet
if activeSet then
  for _, slot in ipairs(build.itemsTab.orderedSlots or {}) do
    local entry = activeSet[slot.slotName]
    if type(entry) == "table" and (entry.selItemId or 0) > 0 then
      activeSlots = activeSlots + 1
    end
  end
end

local activeGems = gemCount(build.skillsTab and build.skillsTab.socketGroupList)

print(string.format(
  "RESULT %d %d %d %d %d %d %d %d %d",
  activeNodes, specs, itemSets, skillSets, items, gems, flasks, activeSlots, activeGems
))
