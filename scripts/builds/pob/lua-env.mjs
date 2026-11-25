/**
 * The LuaJIT environment the PoB oracle needs.
 *
 * PoB is 5.1 Lua and uses `utf8` as a library; stock LuaJIT has no such module,
 * so `lua-utf8` has to be on `LUA_CPATH` or PoB dies before a number is read.
 * Asking the operator to export it is how the pipeline silently degrades into
 * "PoB produced no output", so it is discovered once here.
 */
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/** PoB's own Lua files plus the spec's `dofile` paths. */
export const LUA_PATH = './?.lua;../runtime/lua/?.lua;../runtime/lua/?/init.lua;;';

/** Where `lua-utf8.so` lives, as a LuaJIT `LUA_CPATH` value. */
export function findUtf8Cpath() {
  if (process.env.LUA_CPATH) return process.env.LUA_CPATH;
  const candidates = [
    '/nix/store',
    '/usr/lib/x86_64-linux-gnu',
    '/usr/lib64',
    '/usr/local/lib',
  ];
  for (const base of candidates) {
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base)) {
      if (!/luautf8|lua-utf8/i.test(entry)) continue;
      // Nix layout: <store>/<pkg>/lib/lua/5.1/lua-utf8.so
      const dir = resolve(base, entry, 'lib/lua/5.1');
      if (existsSync(resolve(dir, 'lua-utf8.so'))) return `${dir}/?.so;;`;
    }
  }
  return '';
}
