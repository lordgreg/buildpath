# FilterPath

Build-specific Path of Exile 1 loot filters in three clicks.

Pick your archetype, get a valid `.filter` that highlights the bases your build
actually wants and hides the rest. No account, no simulator.

**Status:** M0 — foundation. Nothing is selectable yet.

## Development

```bash
npm install
npm run dev      # http://localhost:5173/filterpath/
npm test
npm run build
```

## Refresh base item data

```bash
npm run extract:repoe
# pin for reproducible output
REPOE_REF=3.27.0 npm run extract:repoe
```

Writes `src/core/data/base-types.json` from
[RePoE](https://github.com/brather1ng/RePoE). The trimmed file is committed so
builds never depend on the network.

## Layout

```
src/core/     framework-free: archetypes, rules, emit, tiering
src/ui/       React wizard and preview
src/sync/     download, clipboard, File System Access, future API
scripts/      data extractors
```

See [PLAN.md](./PLAN.md) for the milestones and constraints.

## Legal

This product isn't affiliated with or endorsed by Grinding Gear Games in any
way. Base item data from RePoE. Economy data, when shown, from poe.ninja.