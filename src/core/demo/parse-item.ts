import type { ItemRarity, PreviewItem } from '../../core/preview/match.ts';

const RARITIES = new Set<ItemRarity>([
  'Normal',
  'Magic',
  'Rare',
  'Unique',
  'Quest',
  'Currency',
  'Gem',
  'Divination Card',
]);

/** League drops such as Viscera are copied without a Rarity line. */
const CLASS_ONLY_RARITIES = new Set(['Viscera']);

/** Explicit mod name, e.g. `{ Prefix Modifier "Veiled" }`. */
const EXPLICIT_MOD = /^\{\s*(?:\w+ )*(?:Prefix|Suffix) Modifier "([^"]+)"/;

function field(lines: string[], name: string): string | undefined {
  const prefix = `${name}:`;
  const line = lines.find((entry) => entry.trim().startsWith(prefix));
  return line?.slice(line.indexOf(':') + 1).trim();
}

function nameLines(lines: string[]): string[] {
  const rarityIndex = lines.findIndex((line) => line.startsWith('Rarity:'));
  const classIndex = lines.findIndex((line) => line.startsWith('Item Class:'));
  const start = rarityIndex === -1 ? classIndex + 1 : rarityIndex + 1;
  if (start <= 0) return [];
  const names: string[] = [];
  for (const line of lines.slice(start)) {
    const trimmed = line.trim();
    if (trimmed === '' || /^-+$/.test(trimmed)) break;
    names.push(trimmed);
  }
  return names;
}

function parseSockets(value: string | undefined): {
  sockets?: number;
  linkedSockets?: number;
  socketGroups?: string[];
} {
  if (!value) return {};
  const groups = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  let sockets = 0;
  let linkedSockets = 0;
  const socketGroups: string[] = [];
  for (const group of groups) {
    const links = group.split('-').filter(Boolean);
    sockets += links.length;
    linkedSockets = Math.max(linkedSockets, links.length);
    socketGroups.push(links.join('').toUpperCase());
  }
  return { sockets, linkedSockets, socketGroups };
}

/** Numbers in a copied block may carry thousands separators. */
function count(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value.replace(/[,\s]/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Parses one or more copied item blocks from the game. Rare and unique items
 * use the second line as the base type, and a magic item pasted with its base
 * line does the same; otherwise the name is the base, with a quality prefix
 * stripped.
 *
 * A pasted item carries no area level, but leveling stages match on it. The
 * caller supplies the area it dropped in; omit it for endgame filters.
 */
export function parseItemText(
  text: string,
  options: { areaLevel?: number } = {},
): PreviewItem[] {
  const normalized = text.replace(/\r\n/g, '\n');
  const blocks = normalized
    .split(/\n\s*\n(?=Item Class:)/i)
    .filter((block) => /Item Class:/i.test(block));

  const items: PreviewItem[] = [];

  for (const [index, block] of blocks.entries()) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');

    const itemClass = field(lines, 'Item Class');
    const rarityField = field(lines, 'Rarity');
    const rarity =
      rarityField && RARITIES.has(rarityField as ItemRarity)
        ? (rarityField as ItemRarity)
        : itemClass && CLASS_ONLY_RARITIES.has(itemClass)
          ? 'Normal'
          : undefined;
    if (!itemClass || !rarity) continue;

    const names = nameLines(lines);
    if (names.length === 0) continue;

    const named = rarity === 'Rare' || rarity === 'Unique' || rarity === 'Magic';
    const name = names[0]!;
    const baseType = (
      named && names[1] ? names[1] : name.replace(/^Superior\s+/i, '')
    ).trim();

    const sockets = parseSockets(field(lines, 'Sockets'));
    const quality = field(lines, 'Quality');
    const stack = field(lines, 'Stack Size');
    const stackSize = stack ? count(stack.split('/')[0]) : undefined;
    const mapTier = field(lines, 'Map Tier');
    const explicitMods = lines
      .map((line) => EXPLICIT_MOD.exec(line)?.[1])
      .filter((name): name is string => Boolean(name));

    items.push({
      id: `paste-${index}`,
      name,
      itemClass,
      baseType,
      rarity,
      itemLevel: count(field(lines, 'Item Level')) ?? 0,
      ...(options.areaLevel !== undefined
        ? { areaLevel: options.areaLevel }
        : {}),
      ...(sockets.sockets !== undefined ? sockets : {}),
      ...(quality ? { quality: count(quality.replace(/[^\d,]/g, '')) } : {}),
      ...(stackSize !== undefined ? { stackSize } : {}),
      ...(mapTier ? { mapTier: count(mapTier) } : {}),
      ...(explicitMods.length ? { explicitMods } : {}),
      corrupted: lines.includes('Corrupted'),
      identified: !lines.includes('Unidentified'),
    });
  }

  return items;
}