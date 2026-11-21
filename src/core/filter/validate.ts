export interface FilterIssue {
  line: number;
  message: string;
}

const BLOCKS = new Set(['Show', 'Hide', 'Minimal']);

const CONDITIONS = new Set([
  'AlternateQuality',
  'AnyEnchantment',
  'ArchnemesisMod',
  'AreaLevel',
  'BaseArmour',
  'BaseDefencePercentile',
  'BaseEnergyShield',
  'BaseEvasion',
  'BaseType',
  'BaseWard',
  'BlightedMap',
  'Class',
  'Corrupted',
  'CorruptedMods',
  'DropLevel',
  'ElderItem',
  'ElderMap',
  'EnchantmentPassiveNode',
  'EnchantmentPassiveNum',
  'FracturedItem',
  'GemLevel',
  'HasCruciblePassiveTree',
  'HasEaterOfWorldsImplicit',
  'HasEnchantment',
  'HasExplicitMod',
  'HasImplicitMod',
  'HasInfluence',
  'HasSearingExarchImplicit',
  'Height',
  'Identified',
  'Imbued',
  'ItemLevel',
  'LinkedSockets',
  'MapTier',
  'MemoryStrands',
  'MirageMap',
  'Mirrored',
  'Quality',
  'Rarity',
  'Replica',
  'Scourged',
  'ShapedMap',
  'ShaperItem',
  'SocketGroup',
  'Sockets',
  'StackSize',
  'SynthesisedItem',
  'TransfiguredGem',
  'TwiceCorrupted',
  'UberBlightedMap',
  'UnidentifiedItemTier',
  'Vestigial',
  'WaystoneTier',
  'Width',
  'ZanaMemory',
]);

const ACTIONS = new Set([
  'SetTextColor',
  'SetBorderColor',
  'SetBackgroundColor',
  'SetFontSize',
  'PlayAlertSound',
  'PlayAlertSoundPositional',
  'CustomAlertSound',
  'CustomAlertSoundOptional',
  'DisableDropSound',
  'EnableDropSound',
  'DisableDropSoundIfAlertSound',
  'EnableDropSoundIfAlertSound',
  'MinimapIcon',
  'PlayEffect',
]);

const RARITIES = new Set([
  'Normal',
  'Magic',
  'Rare',
  'Unique',
  'NonUnique',
  'Any',
]);

const QUOTED_LIST = /^(?:"[^"]*")(?:\s+"[^"]*")*$/;
const QUOTED = /^"[^"]*"$/;

const MINIMAP_COLORS = new Set([
  'Red',
  'Green',
  'Blue',
  'Yellow',
  'Cyan',
  'Purple',
  'White',
  'Gray',
]);
const MINIMAP_SHAPES = new Set([
  'Circle',
  'Diamond',
  'Hexagon',
  'Square',
  'Star',
  'Triangle',
  'Kite',
  'Moon',
  'Pentagon',
]);
const EFFECT_COLORS = new Set([
  'Red',
  'Green',
  'Blue',
  'Yellow',
  'Cyan',
  'Purple',
  'White',
  'Grey',
]);

const NUMERIC = /^(?:(?:>=|<=|==|=|<|>|!=)\s*)?-?\d+(?:\.\d+)?$/;
const ITEM_FILTER_NAME = /^[A-Za-z0-9 _-]+\.filter$/;

function isColor(value: string): boolean {
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 3 && parts.length !== 4) return false;
  return parts.every((part) => {
    const number = Number(part);
    return Number.isInteger(number) && number >= 0 && number <= 255;
  });
}

function isAlertSound(value: string): boolean {
  const parts = value.trim().split(/\s+/);
  if (parts.length < 1 || parts.length > 2) return false;
  if (parts[0] === 'None') return parts.length === 1;
  const id = Number(parts[0]);
  if (!Number.isInteger(id) || id < 1 || id > 16) return false;
  if (parts.length === 2) {
    const volume = Number(parts[1]);
    if (!Number.isInteger(volume) || volume < 0 || volume > 300) return false;
  }
  return true;
}

function isMinimapIcon(value: string): boolean {
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 3) return false;
  const size = Number(parts[0]);
  return (
    Number.isInteger(size) &&
    size >= 0 &&
    size <= 2 &&
    MINIMAP_COLORS.has(parts[1]!) &&
    MINIMAP_SHAPES.has(parts[2]!)
  );
}

function isPlayEffect(value: string): boolean {
  const parts = value.trim().split(/\s+/);
  if (parts.length < 1 || parts.length > 2) return false;
  if (!EFFECT_COLORS.has(parts[0]!)) return false;
  return parts.length === 1 || parts[1] === 'Temp' || parts[1] === 'Perm';
}

function validateCondition(keyword: string, value: string): string | null {
  switch (keyword) {
    case 'Class':
    case 'BaseType':
    case 'HasInfluence':
    case 'ArchnemesisMod':
    case 'EnchantmentPassiveNode':
      if (!QUOTED_LIST.test(value)) {
        return 'expects one or more quoted values';
      }
      return null;
    case 'Rarity':
      if (!RARITIES.has(value)) {
        return `unknown rarity "${value}"`;
      }
      return null;
    case 'SocketGroup':
      if (!QUOTED.test(value)) return 'expects a quoted socket group';
      return null;
    case 'Corrupted':
    case 'Identified':
    case 'Mirrored':
    case 'AlternateQuality':
    case 'AnyEnchantment':
    case 'BlightedMap':
    case 'ElderItem':
    case 'ElderMap':
    case 'FracturedItem':
    case 'HasCruciblePassiveTree':
    case 'Imbued':
    case 'Replica':
    case 'Scourged':
    case 'ShapedMap':
    case 'ShaperItem':
    case 'SynthesisedItem':
    case 'TransfiguredGem':
    case 'TwiceCorrupted':
    case 'UberBlightedMap':
    case 'Vestigial':
    case 'ZanaMemory':
      if (value !== 'True' && value !== 'False') {
        return 'expects True or False';
      }
      return null;
    case 'HasExplicitMod':
    case 'HasImplicitMod':
    case 'HasEnchantment':
      // Optional numeric comparison, then a quoted list.
      if (!/^\d+\s+/.test(value) && !/^(?:>=|<=|==|=|<|>|!=)\s*\d+\s+/.test(value)) {
        if (!QUOTED_LIST.test(value)) {
          return 'expects one or more quoted mod names';
        }
        return null;
      }
      return null;
    default:
      if (!NUMERIC.test(value)) {
        return 'expects a number, optionally with a comparison operator';
      }
      return null;
  }
}

function validateAction(keyword: string, value: string): string | null {
  switch (keyword) {
    case 'SetTextColor':
    case 'SetBorderColor':
    case 'SetBackgroundColor':
      return isColor(value) ? null : 'expects 3 or 4 numbers between 0 and 255';
    case 'SetFontSize': {
      const size = Number(value);
      return Number.isInteger(size) && size >= 1 && size <= 100
        ? null
        : 'expects a font size between 1 and 100';
    }
    case 'PlayAlertSound':
    case 'PlayAlertSoundPositional':
      return isAlertSound(value)
        ? null
        : 'expects a sound id 1-16 (or None) and an optional volume 0-300';
    case 'CustomAlertSound':
    case 'CustomAlertSoundOptional': {
      const parts = value.trim().split(/\s+/);
      if (!QUOTED.test(parts[0] ?? '')) return 'expects a quoted sound file';
      if (parts.length === 2) {
        const volume = Number(parts[1]);
        if (!Number.isInteger(volume) || volume < 0 || volume > 300) {
          return 'volume must be between 0 and 300';
        }
      }
      return parts.length <= 2 ? null : 'too many values';
    }
    case 'MinimapIcon':
      return isMinimapIcon(value)
        ? null
        : 'expects "size color shape", e.g. "1 Yellow Star"';
    case 'PlayEffect':
      return isPlayEffect(value)
        ? null
        : 'expects a colour and optional Temp/Perm';
    case 'DisableDropSound':
    case 'EnableDropSound':
    case 'DisableDropSoundIfAlertSound':
    case 'EnableDropSoundIfAlertSound':
      return value === '' ? null : 'does not take a value';
    default:
      return `unknown action "${keyword}"`;
  }
}

/**
 * Lightweight syntax check for generated filters. It catches the mistakes a
 * generator actually makes (bad colours, missing conditions, unknown
 * keywords); it is not a full grammar for hand-written filters.
 */
export function validateFilter(text: string): FilterIssue[] {
  const issues: FilterIssue[] = [];
  const lines = text.split('\n');

  let inBlock = false;
  let blockStart = 0;
  let conditionCount = 0;

  const closeBlock = (line: number) => {
    if (inBlock && conditionCount === 0) {
      issues.push({ line: blockStart, message: 'block has no conditions' });
    }
    inBlock = false;
    conditionCount = 0;
    void line;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index]!.trim();

    if (line === '' || line.startsWith('#')) continue;

    const [keyword, ...rest] = line.split(/\s+/);
    const value = rest.join(' ').trim();

    if (BLOCKS.has(keyword!)) {
      closeBlock(lineNumber);
      if (value !== '') {
        issues.push({
          line: lineNumber,
          message: `${keyword} does not take a value on the same line`,
        });
      }
      inBlock = true;
      blockStart = lineNumber;
      conditionCount = 0;
      continue;
    }

    if (!inBlock) {
      issues.push({
        line: lineNumber,
        message: `"${keyword}" appears outside a Show/Hide block`,
      });
      continue;
    }

    if (keyword === 'Continue') {
      if (value !== '') {
        issues.push({ line: lineNumber, message: 'Continue takes no value' });
      }
      continue;
    }

    if (CONDITIONS.has(keyword!)) {
      conditionCount += 1;
      const problem = validateCondition(keyword!, value);
      if (problem) {
        issues.push({ line: lineNumber, message: `${keyword} ${problem}` });
      }
      continue;
    }

    if (ACTIONS.has(keyword!)) {
      const problem = validateAction(keyword!, value);
      if (problem) {
        issues.push({ line: lineNumber, message: `${keyword} ${problem}` });
      }
      continue;
    }

    issues.push({
      line: lineNumber,
      message: `unknown keyword "${keyword}"`,
    });
  }

  closeBlock(lines.length);

  return issues;
}

export function filterNameFor(name: string): string {
  const base = name.replace(/[^A-Za-z0-9 _-]/g, '').trim() || 'FilterPath';
  return base.endsWith('.filter') ? base : `${base}.filter`;
}

export function isValidFilterName(name: string): boolean {
  return ITEM_FILTER_NAME.test(filterNameFor(name));
}