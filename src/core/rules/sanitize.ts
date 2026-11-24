import {
  EMIT_SAFE_BASE_TYPES,
  EMIT_SAFE_CLASSES,
} from '../data/emit-safe.ts';
import type {
  MinimapColor,
  MinimapShape,
  NamedAlertSound,
  Rarity,
  Rule,
  RuleSection,
  Style,
  StyleKind,
} from '../filter/types.ts';
import { migrateRuleClasses } from './class-migration.ts';

const LIST_KEYS = ['classNames', 'baseTypes', 'hasExplicitMod'] as const;
type ListKey = (typeof LIST_KEYS)[number];

const LIST_LABELS: Record<ListKey, string> = {
  classNames: 'Classes',
  baseTypes: 'Base types',
  hasExplicitMod: 'Explicit mods',
};

const RANGE_KEYS = [
  'itemLevel',
  'dropLevel',
  'areaLevel',
  'stackSize',
  'quality',
  'sockets',
  'linkedSockets',
  'mapTier',
] as const;

const RANGE_LABELS: Record<(typeof RANGE_KEYS)[number], string> = {
  itemLevel: 'item level',
  dropLevel: 'drop level',
  areaLevel: 'area level',
  stackSize: 'stack size',
  quality: 'quality',
  sockets: 'sockets',
  linkedSockets: 'links',
  mapTier: 'map tier',
};

/** Generous upper bound; gold stacks are the largest values in practice. */
const RANGE_MAX = 1_000_000;

const STRING_KEYS = ['id', 'section', 'comment', 'rarity', 'styleKind'] as const;
const BOOLEAN_KEYS = ['disabled', 'continue', 'corrupted', 'identified'] as const;

const RARITIES = new Set<string>([
  'Normal',
  'Magic',
  'Rare',
  'Unique',
] satisfies Rarity[]);

const SECTIONS = new Set<string>([
  'gear',
  'gems',
  'currency',
  'maps',
  'uniques',
  'quest',
  'veiled',
  'junk',
  'league',
  'custom',
] satisfies RuleSection[]);

const STYLE_KINDS = new Set<string>([
  's-tier',
  'currency-top',
  'currency-mid',
  'card',
  'gem',
  'map',
  'fragment',
  'unique',
  'jewel-best',
  'jewel',
  'flask',
  'gold',
  'league',
  'quest',
  'veiled',
  'chase',
] satisfies StyleKind[]);

const ICON_COLORS = new Set<string>([
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
] satisfies MinimapColor[]);

const ICON_SHAPES = new Set<string>([
  'Circle',
  'Diamond',
  'Hexagon',
  'Square',
  'Star',
  'Triangle',
  'Kite',
  'Moon',
  'Pentagon',
] satisfies MinimapShape[]);

const NAMED_SOUNDS = new Set<string>([
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
] satisfies NamedAlertSound[]);

function isPrintable(value: string): boolean {
  return (
    /^[\x20-\x7E]+$/.test(value) &&
    value.trim() !== '' &&
    !value.includes('"')
  );
}

/**
 * Values the emitter can write exactly. Anything else is dropped, never
 * altered: the game rejects the whole filter for a name it does not know, and a
 * quoted name would change under `==`. Class names must be in the registry;
 * base names must also survive the emitter's quote handling.
 */
function usableValues(key: ListKey, values: readonly string[]): string[] {
  if (key === 'baseTypes') {
    return values.filter((value) => EMIT_SAFE_BASE_TYPES.has(value));
  }
  if (key === 'classNames') {
    return values.filter((value) => EMIT_SAFE_CLASSES.has(value));
  }
  return values.filter(isPrintable).filter((value) => !value.includes('"'));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRange(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  return (['min', 'max'] as const).every(
    (key) =>
      value[key] === undefined ||
      (typeof value[key] === 'number' && Number.isFinite(value[key])),
  );
}

function isWellFormed(value: unknown): value is Rule {
  if (!isPlainObject(value)) return false;
  if (value.action !== 'Show' && value.action !== 'Hide') return false;
  for (const key of STRING_KEYS) {
    if (value[key] !== undefined && typeof value[key] !== 'string') return false;
  }
  for (const key of BOOLEAN_KEYS) {
    if (value[key] !== undefined && typeof value[key] !== 'boolean') return false;
  }
  for (const key of [...LIST_KEYS, 'chips'] as const) {
    const list = value[key];
    if (
      list !== undefined &&
      !(Array.isArray(list) && list.every((entry) => typeof entry === 'string'))
    ) {
      return false;
    }
  }
  for (const key of RANGE_KEYS) {
    if (value[key] !== undefined && !isRange(value[key])) return false;
  }
  if (value.style !== undefined && !isPlainObject(value.style)) return false;
  return true;
}

/**
 * Why a custom rule cannot be written as it stands, or null when it can. A
 * rule is never written with a condition removed or a value altered: that
 * would widen it or make the game reject the filter.
 */
export function customRuleProblem(rule: Rule): string | null {
  if (!isWellFormed(rule)) {
    return 'one of its fields is malformed. Delete the rule and add it again.';
  }
  if (rule.rarity !== undefined && !RARITIES.has(rule.rarity)) {
    return `its rarity "${rule.rarity}" is not one the game knows.`;
  }
  for (const key of RANGE_KEYS) {
    const range = rule[key];
    if (!range) continue;
    for (const value of [range.min, range.max]) {
      if (
        value !== undefined &&
        !(Number.isInteger(value) && value >= 0 && value <= RANGE_MAX)
      ) {
        return `its ${RANGE_LABELS[key]} must be a whole number from 0 to ${RANGE_MAX}.`;
      }
    }
  }
  for (const key of LIST_KEYS) {
    const values = rule[key];
    if (!values || usableValues(key, values).length > 0) continue;
    if (values.length === 0) {
      return `its ${LIST_LABELS[key]} list is empty. Add a value or delete the rule.`;
    }
    if (key === 'baseTypes') {
      return `none of its base types are known and safe to write (${values.join(', ')}). Fix the names or delete the rule.`;
    }
    if (key === 'classNames') {
      return `none of its Classes values are known classes (${values.join(', ')}). Fix them or delete the rule.`;
    }
    return `none of its ${LIST_LABELS[key]} values can be written (only plain ASCII without quotes). Fix them or delete the rule.`;
  }
  return null;
}

function isColor(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    (value.length === 3 || value.length === 4) &&
    value.every(
      (channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255,
    )
  );
}

function isIntegerIn(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

/** Keeps only the style lines the game accepts; an invalid one is left out. */
function cleanStyle(style: Record<string, unknown>): Style {
  const clean: Record<string, unknown> = {};
  if (isIntegerIn(style.fontSize, 18, 45)) clean.fontSize = style.fontSize;
  for (const key of ['textColor', 'borderColor', 'backgroundColor'] as const) {
    if (isColor(style[key])) clean[key] = style[key];
  }
  const sound = style.alertSound;
  if (
    isIntegerIn(sound, 1, 16) ||
    sound === 'None' ||
    (typeof sound === 'string' && NAMED_SOUNDS.has(sound))
  ) {
    clean.alertSound = sound;
  }
  if (isIntegerIn(style.alertVolume, 0, 300)) clean.alertVolume = style.alertVolume;
  if (typeof style.playEffect === 'string' && ICON_COLORS.has(style.playEffect)) {
    clean.playEffect = style.playEffect;
  }
  const icon = style.minimapIcon;
  if (
    isPlainObject(icon) &&
    (icon.size === 0 || icon.size === 1 || icon.size === 2) &&
    typeof icon.color === 'string' &&
    ICON_COLORS.has(icon.color) &&
    typeof icon.shape === 'string' &&
    ICON_SHAPES.has(icon.shape)
  ) {
    clean.minimapIcon = { size: icon.size, color: icon.color, shape: icon.shape };
  }
  return clean as Style;
}

/** Comments are free text, so only they are repaired: unsafe characters go. */
function cleanComment(comment: string): string | undefined {
  const clean = comment.replace(/[^\x20-\x7E]/g, '').trim();
  return clean || undefined;
}

function cleanRule(rule: Rule): Rule {
  const next: Rule = { ...rule };
  for (const key of LIST_KEYS) {
    const values = next[key];
    if (values) next[key] = usableValues(key, values);
  }
  if (next.comment !== undefined) {
    const comment = cleanComment(next.comment);
    if (comment === undefined) delete next.comment;
    else next.comment = comment;
  }
  if (next.style) next.style = cleanStyle(next.style as Record<string, unknown>);
  // The theme looks both up by name; an unknown one could resolve to an
  // inherited object property such as "constructor" and crash the build.
  if (next.section !== undefined && !SECTIONS.has(next.section)) delete next.section;
  if (next.styleKind !== undefined && !STYLE_KINDS.has(next.styleKind)) {
    delete next.styleKind;
  }
  return next;
}

export interface SkippedRule {
  /** Position in the list that was passed in. */
  index: number;
  reason: string;
}

/**
 * Custom rules ready to emit. Unsafe or unknown list values are dropped, bad
 * style lines and comment characters removed, and any rule that would be
 * widened or rejected by the game is skipped and reported instead.
 */
export function prepareCustomRules(rules: readonly Rule[]): {
  rules: Rule[];
  skipped: SkippedRule[];
} {
  const kept: Rule[] = [];
  const skipped: SkippedRule[] = [];
  rules.forEach((rule, index) => {
    const problem = customRuleProblem(rule);
    if (problem) {
      skipped.push({ index, reason: problem });
      return;
    }
    kept.push(cleanRule(rule));
  });
  return { rules: kept, skipped };
}

/**
 * Keeps only structurally sound rules from stored or imported data, so the
 * editor and generator never meet a string where a list belongs. Unknown base
 * names are kept for the editor to show; a rule with a malformed field is
 * dropped whole rather than repaired, since dropping one field could widen it.
 * Legacy class names are migrated to exact registered names here, on the read
 * path, so the editor and generator only ever see names the game accepts.
 */
export function shapeRules(input: unknown): {
  rules: Rule[];
  dropped: number;
  notices: string[];
} {
  if (!Array.isArray(input)) return { rules: [], dropped: 0, notices: [] };
  const rules = input.filter(isWellFormed);
  const migration = migrateRuleClasses(rules);
  return {
    rules: migration.rules,
    dropped: input.length - rules.length,
    notices: migration.notices,
  };
}
