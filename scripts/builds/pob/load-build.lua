-- Loads the XML a published PoB code carries and reports what PoB parsed.
-- Called by scripts/builds/check-pob-code.mjs (R3).
--
--   POB_XML=/path/build.xml luajit /path/load-build.lua
--
-- Prints one `RESULT <nodes> <items> <gems>` line. A build that parses but
-- imports with nothing allocated is the failure this exists to catch.
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

local allocated = 0
for _ in pairs((build.spec and build.spec.allocNodes) or {}) do allocated = allocated + 1 end

local items, flasks = 0, 0
for _, item in ipairs((build.itemsTab and build.itemsTab.items) or {}) do
  items = items + 1
  if item.base and item.base.flask then flasks = flasks + 1 end
end

local gems = 0
for _, group in ipairs((build.skillsTab and build.skillsTab.socketGroupList) or {}) do
  for _ in ipairs(group.gemList or {}) do gems = gems + 1 end
end

print(string.format("RESULT %d %d %d %d", allocated, items, gems, flasks))
