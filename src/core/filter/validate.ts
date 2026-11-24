import type {
  Color,
  MinimapColor,
  MinimapShape,
  NamedAlertSound,
  Range,
  Rule,
  Style,
} from './types.ts';

export interface FilterIssue {
  /** 1-based line in the filter text, when the issue points at one. */
  line?: number;
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
const EXACT_PREFIX = /^==\s+/;

/** `Class == "A"` and `Class "A"` name the same list. */
function listValue(value: string): string {
  return value.replace(EXACT_PREFIX, '');
}

const MINIMAP_COLORS = new Set([
  'Red',
  'Green',
  'Blue',
  'Brown',
  'White',
  'Yellow',
  'Cyan',
  'Grey',
  'Orange',
  'Pink',
  'Purple',
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
const EFFECT_COLORS = MINIMAP_COLORS;

const NUMERIC = /^(?:(?:>=|<=|==|=|<|>|!=)\s*)?-?\d+(?:\.\d+)?$/;
const ITEM_FILTER_NAME = /^[A-Za-z0-9 ._-]+\.filter$/;

function isColor(value: string): boolean {
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 3 && parts.length !== 4) return false;
  return parts.every((part) => {
    const number = Number(part);
    return Number.isInteger(number) && number >= 0 && number <= 255;
  });
}

const NAMED_ALERT_SOUNDS = new Set([
  'ShAlchemy',
  'ShBlessed',
  'ShChaos',
  'ShDivine',
  'ShExalted',
  'ShFusing',
  'ShGeneral',
  'ShMirror',
  'ShRegal',
  'ShVaal',
]);

function isAlertSound(value: string): boolean {
  const parts = value.trim().split(/\s+/);
  if (parts.length < 1 || parts.length > 2) return false;
  if (parts[0] === 'None') return parts.length === 1;
  if (NAMED_ALERT_SOUNDS.has(parts[0]!)) return parts.length === 1;
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
      if (!QUOTED_LIST.test(listValue(value))) {
        return 'expects one or more quoted values';
      }
      return null;
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
        : 'expects a sound id 1-16, a Sh... voice line (or None) and an optional volume 0-300';
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

export interface ParsedFilter {
  rules: Rule[];
  issues: FilterIssue[];
}

const RANGE_CONDITIONS = {
  ItemLevel: 'itemLevel',
  DropLevel: 'dropLevel',
  AreaLevel: 'areaLevel',
  StackSize: 'stackSize',
  Quality: 'quality',
  Sockets: 'sockets',
  LinkedSockets: 'linkedSockets',
  MapTier: 'mapTier',
} as const;

type RangeKey = (typeof RANGE_CONDITIONS)[keyof typeof RANGE_CONDITIONS];

const RANGE_COMPARISON = /^(>=|<=|==|=|>|<|!=)?\s*(-?\d+(?:\.\d+)?)$/;
const QUOTED_VALUE = /"([^"]*)"/g;

function parseQuotedList(value: string): string[] {
  const values: string[] = [];
  for (const match of value.matchAll(QUOTED_VALUE)) {
    values.push(match[1]!);
  }
  return values;
}

function parseColor(value: string): Color | null {
  const parts = value.trim().split(/\s+/).map(Number);
  if (parts.length === 3) {
    return [parts[0]!, parts[1]!, parts[2]!] as Color;
  }
  if (parts.length === 4) {
    return [parts[0]!, parts[1]!, parts[2]!, parts[3]!] as Color;
  }
  return null;
}

interface PendingRule {
  rule: Rule;
  style: Style;
  styleUsed: boolean;
}

function parseCondition(
  rule: Rule,
  keyword: string,
  value: string,
  line: number,
  issues: FilterIssue[],
): void {
  switch (keyword) {
    case 'Class':
      rule.classNames = parseQuotedList(listValue(value));
      return;
    case 'BaseType':
      rule.baseTypes = parseQuotedList(listValue(value));
      return;
    case 'HasExplicitMod':
      rule.hasExplicitMod = parseQuotedList(value);
      return;
    case 'Rarity':
      if (
        value === 'Normal' ||
        value === 'Magic' ||
        value === 'Rare' ||
        value === 'Unique'
      ) {
        rule.rarity = value;
      } else {
        issues.push({
          line,
          message: `Rarity "${value}" cannot be represented by the parser`,
        });
      }
      return;
    case 'Corrupted':
      rule.corrupted = value === 'True';
      return;
    case 'Identified':
      rule.identified = value === 'True';
      return;
    default: {
      const key = RANGE_CONDITIONS[keyword as keyof typeof RANGE_CONDITIONS];
      if (!key) {
        issues.push({
          line,
          message: `${keyword} is a valid condition but the parser cannot represent it`,
        });
        return;
      }
      const match = RANGE_COMPARISON.exec(value);
      if (!match) {
        issues.push({
          line,
          message: `${keyword} expects a number with an optional comparison`,
        });
        return;
      }
      const operator = match[1] ?? '=';
      const number = Number(match[2]);
      const range: Range = rule[key as RangeKey] ?? {};
      if (operator === '>=') {
        range.min = number;
      } else if (operator === '<=') {
        range.max = number;
      } else if (operator === '=' || operator === '==') {
        range.min = number;
        range.max = number;
      } else {
        issues.push({
          line,
          message: `${keyword} ${operator} cannot be represented; use >= or <=`,
        });
        return;
      }
      rule[key as RangeKey] = range;
    }
  }
}

function parseAction(
  current: PendingRule,
  keyword: string,
  value: string,
  line: number,
  issues: FilterIssue[],
): void {
  const { style } = current;
  switch (keyword) {
    case 'SetFontSize':
      style.fontSize = Number(value);
      current.styleUsed = true;
      return;
    case 'SetTextColor': {
      const color = parseColor(value);
      if (!color) {
        issues.push({ line, message: 'SetTextColor expects 3 or 4 numbers' });
        return;
      }
      style.textColor = color;
      current.styleUsed = true;
      return;
    }
    case 'SetBorderColor': {
      const color = parseColor(value);
      if (!color) {
        issues.push({ line, message: 'SetBorderColor expects 3 or 4 numbers' });
        return;
      }
      style.borderColor = color;
      current.styleUsed = true;
      return;
    }
    case 'SetBackgroundColor': {
      const color = parseColor(value);
      if (!color) {
        issues.push({ line, message: 'SetBackgroundColor expects 3 or 4 numbers' });
        return;
      }
      style.backgroundColor = color;
      current.styleUsed = true;
      return;
    }
    case 'PlayAlertSound': {
      const parts = value.trim().split(/\s+/);
      const first = parts[0]!;
      if (first === 'None') {
        style.alertSound = 'None';
      } else if (NAMED_ALERT_SOUNDS.has(first)) {
        style.alertSound = first as NamedAlertSound;
      } else {
        style.alertSound = Number(first);
        if (parts[1] !== undefined) style.alertVolume = Number(parts[1]);
      }
      current.styleUsed = true;
      return;
    }
    case 'PlayEffect': {
      const parts = value.trim().split(/\s+/);
      style.playEffect = parts[0] as MinimapColor;
      if (parts.length > 1) {
        issues.push({
          line,
          message: `PlayEffect ${parts[1]} cannot be represented by the parser`,
        });
      }
      current.styleUsed = true;
      return;
    }
    case 'MinimapIcon': {
      const [size, color, shape] = value.trim().split(/\s+/);
      style.minimapIcon = {
        size: Number(size) as 0 | 1 | 2,
        color: color as MinimapColor,
        shape: shape as MinimapShape,
      };
      current.styleUsed = true;
      return;
    }
    default:
      issues.push({
        line,
        message: `${keyword} is a valid action but the parser cannot represent it`,
      });
  }
}

/**
 * Reads emitted filter text back into rules. It shares the keyword sets and
 * value checks with `validateFilter`, so a line that validates parses here.
 * The returned rules carry only what the text carries: metadata such as `id`,
 * `section` and `styleKind` is not emitted and cannot come back.
 */
export function parseFilter(text: string): ParsedFilter {
  const rules: Rule[] = [];
  const issues: FilterIssue[] = [];
  const lines = text.split('\n');

  let pendingComment: string | undefined;
  let current: PendingRule | undefined;
  let skipBlock = false;

  const finish = () => {
    if (!current) return;
    if (current.styleUsed) current.rule.style = current.style;
    rules.push(current.rule);
    current = undefined;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const raw = lines[index]!;
    const line = raw.trim();

    if (line === '') {
      finish();
      pendingComment = undefined;
      skipBlock = false;
      continue;
    }

    if (line.startsWith('#')) {
      // A comment ends the previous block and may label the next one. Header
      // comments are followed by a blank line, so they are dropped there.
      if (skipBlock) continue;
      finish();
      pendingComment = line.slice(1).trimStart();
      continue;
    }

    const [keyword, ...rest] = line.split(/\s+/);
    const value = rest.join(' ').trim();

    if (BLOCKS.has(keyword!)) {
      finish();
      skipBlock = false;
      if (value !== '') {
        issues.push({
          line: lineNumber,
          message: `${keyword} does not take a value on the same line`,
        });
      }
      if (keyword !== 'Show' && keyword !== 'Hide') {
        issues.push({
          line: lineNumber,
          message: `cannot parse a ${keyword} block`,
        });
        pendingComment = undefined;
        skipBlock = true;
        continue;
      }
      current = {
        rule: {
          action: keyword,
          ...(pendingComment ? { comment: pendingComment } : {}),
        },
        style: {},
        styleUsed: false,
      };
      pendingComment = undefined;
      continue;
    }

    if (skipBlock) continue;

    if (!current) {
      issues.push({
        line: lineNumber,
        message: `"${keyword}" appears outside a Show/Hide block`,
      });
      pendingComment = undefined;
      continue;
    }

    if (!/^\s/.test(raw)) {
      issues.push({
        line: lineNumber,
        message: `"${keyword}" is not indented inside a block`,
      });
    }

    if (keyword === 'Continue') {
      if (value !== '') {
        issues.push({ line: lineNumber, message: 'Continue takes no value' });
        continue;
      }
      current.rule.continue = true;
      continue;
    }

    if (CONDITIONS.has(keyword!)) {
      const problem = validateCondition(keyword!, value);
      if (problem) {
        issues.push({ line: lineNumber, message: `${keyword} ${problem}` });
        continue;
      }
      parseCondition(current.rule, keyword!, value, lineNumber, issues);
      continue;
    }

    if (ACTIONS.has(keyword!)) {
      const problem = validateAction(keyword!, value);
      if (problem) {
        issues.push({ line: lineNumber, message: `${keyword} ${problem}` });
        continue;
      }
      parseAction(current, keyword!, value, lineNumber, issues);
      continue;
    }

    issues.push({
      line: lineNumber,
      message: `unknown keyword "${keyword}"`,
    });
  }

  finish();
  return { rules, issues };
}

export function filterNameFor(name: string): string {
  const base = name
    .replace(/[^A-Za-z0-9 ._-]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .trim();
  if (!base) return 'FilterPath.filter';
  return base.endsWith('.filter') ? base : `${base}.filter`;
}

export function isValidFilterName(name: string): boolean {
  return ITEM_FILTER_NAME.test(filterNameFor(name));
}