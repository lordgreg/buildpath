import type { ItemRarity, PreviewItem } from '../../core/preview/match.ts';

const RARITIES = new Set<ItemRarity>(['Normal', 'Magic', 'Rare', 'Unique']);

function field(lines: string[], name: string): string | undefined {
  const prefix = `${name}:`;
  const line = lines.find((entry) => entry.trim().startsWith(prefix));
  return line?.slice(line.indexOf(':') + 1).trim();
}

function nameLines(lines: string[]): string[] {
  const rarityIndex = lines.findIndex((line) => line.startsWith('Rarity:'));
  if (rarityIndex === -1) return [];
  const names: string[] = [];
  for (const line of lines.slice(rarityIndex + 1)) {
    const trimmed = line.trim();
    if (trimmed === '' || /^-+$/.test(trimmed)) break;
    names.push(trimmed);
  }
  return names;
}

function parseSockets(value: string | undefined): {
  sockets?: number;
  linkedSockets?: number;
} {
  if (!value) return {};
  const groups = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  let sockets = 0;
  let linkedSockets = 0;
  for (const group of groups) {
    const links = group.split('-').filter(Boolean);
    sockets += links.length;
    linkedSockets = Math.max(linkedSockets, links.length);
  }
  return { sockets, linkedSockets };
}

/**
 * Parses one or more copied item blocks from the game. Rare and unique items
 * use the second line as the base type; normal quality prefixes are stripped.
 */
export function parseItemText(text: string): PreviewItem[] {
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
    if (!itemClass || !rarityField || !RARITIES.has(rarityField as ItemRarity)) {
      continue;
    }

    const names = nameLines(lines);
    if (names.length === 0) continue;

    const isRare = rarityField === 'Rare' || rarityField === 'Unique';
    const name = names[0]!;
    const baseType = (
      isRare && names[1] ? names[1] : name.replace(/^Superior\s+/i, '')
    ).trim();

    const sockets = parseSockets(field(lines, 'Sockets'));
    const quality = field(lines, 'Quality');
    const stack = field(lines, 'Stack Size');
    const mapTier = field(lines, 'Map Tier');

    items.push({
      id: `paste-${index}`,
      name,
      itemClass,
      baseType,
      rarity: rarityField as ItemRarity,
      itemLevel: Number(field(lines, 'Item Level') ?? 0),
      ...(sockets.sockets !== undefined ? sockets : {}),
      ...(quality
        ? { quality: Number(quality.replace(/[^\d]/g, '')) }
        : {}),
      ...(stack ? { stackSize: Number(stack) } : {}),
      ...(mapTier ? { mapTier: Number(mapTier) } : {}),
      corrupted: lines.includes('Corrupted'),
      identified: !lines.includes('Unidentified'),
    });
  }

  return items;
}