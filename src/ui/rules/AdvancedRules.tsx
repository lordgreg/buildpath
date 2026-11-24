import { useEffect, useMemo, useRef, useState } from 'react';
import type { Rule, RuleSection } from '../../core/filter/types.ts';
import { SLOT_STYLES } from '../../core/filter/types.ts';
import { colorToHex, hexToColor } from '../../core/filter/style-utils.ts';
import { EQUIPMENT_CLASSES } from '../../core/filter/classes.ts';
import { parseItemText } from '../../core/demo/parse-item.ts';
import known from '../../core/data/known-base-types.json';
import { evaluateRules } from '../../core/preview/match.ts';
import { TEMPLATES } from '../../core/rules/templates.ts';
import { rulesOverlap, templateIsCovered } from '../../core/rules/coverage.ts';
import { emittedRuleOrder } from '../../core/rules/order.ts';
import { focusTargetAt } from '../../core/rules/focus.ts';
import { customRuleProblem } from '../../core/rules/sanitize.ts';
import { hasEmptyListCondition } from '../../core/filter/rule-lists.ts';
import {
  CHIPS,
  chipLabel,
  type ChipId,
  unionChipBases,
} from '../../core/rules/chips.ts';
import CollapseChevron from '../CollapseChevron.tsx';
import { usePersistedOpen } from '../usePersistedOpen.ts';
const SECTION_LABELS: Record<RuleSection, string> = {
  gear: 'Build gear',
  gems: 'Gems',
  currency: 'Currency',
  maps: 'Maps & fragments',
  quest: 'Quest items',
  veiled: 'Veiled items',
  uniques: 'Uniques',
  junk: 'Junk hides',
  league: 'League drops',
  custom: 'Custom',
};

const CLASS_OPTIONS = [
  ...EQUIPMENT_CLASSES,
  'Maps',
  'Map Fragments',
  'Stackable Currency',
  'Skill Gems',
  'Support Gems',
  'Divination Cards',
];

const RARITIES = ['Any', 'Normal', 'Magic', 'Rare', 'Unique'] as const;
const KNOWN_BASES = new Set(known.names);

interface Draft {
  action: 'Show' | 'Hide';
  classes: string[];
  chips: ChipId[];
  bases: string;
  rarity: (typeof RARITIES)[number];
  ilvlMin: string;
  ilvlMax: string;
  socketsMin: string;
  linksMin: string;
  qualityMin: string;
  stackMin: string;
  mapTierMin: string;
  comment: string;
  continue: boolean;
}

const EMPTY_DRAFT: Draft = {
  action: 'Show',
  classes: [],
  chips: [],
  bases: '',
  rarity: 'Any',
  ilvlMin: '',
  ilvlMax: '',
  socketsMin: '',
  linksMin: '',
  qualityMin: '',
  stackMin: '',
  mapTierMin: '',
  comment: '',
  continue: false,
};

/** Seeds the rule editor, e.g. when the demo asks to turn an item into a rule. */
export interface RulePrefill {
  classes?: string[];
  bases?: string;
  rarity?: 'Normal' | 'Magic' | 'Rare' | 'Unique';
  ilvlMin?: string;
}

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

function groupRules(rules: readonly Rule[]): [RuleSection, Rule[]][] {
  const groups = new Map<RuleSection, Rule[]>();
  for (const rule of rules) {
    const section = rule.section ?? 'custom';
    const list = groups.get(section) ?? [];
    list.push(rule);
    groups.set(section, list);
  }
  return [...groups.entries()];
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * A comma-separated list input that keeps the text the user typed. Parsing on
 * every keystroke typed a comma away, so a second entry could not be started;
 * the draft only normalises when the field loses focus.
 */
function ListField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value?: string[];
  onCommit: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState(value?.join(', ') ?? '');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(value?.join(', ') ?? '');
  }, [value, focused]);

  return (
    <label className="text-[10px] text-zinc-500">
      {label}
      <input
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          onCommit(splitList(event.target.value));
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setDraft(value?.join(', ') ?? '');
        }}
        className="mt-0.5 block w-full rounded border border-ink-600 bg-ink-800 px-2 py-1 text-xs text-zinc-200"
      />
    </label>
  );
}

function number(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function targetLabel(rule: Rule): string {
  if (hasEmptyListCondition(rule)) return 'nothing (empty list, not written)';
  if (rule.baseTypes?.length) return `${rule.baseTypes.length} base types`;
  if (rule.classNames?.length) return rule.classNames.join(', ');
  return 'any item';
}

function ruleSummary(rule: Rule): string {
  const parts = [targetLabel(rule)];
  if (rule.chips?.length) {
    parts.push(rule.chips.map((chip) => chipLabel(chip)).join(' + '));
  }
  if (rule.hasExplicitMod?.length) {
    parts.push(`mod: ${rule.hasExplicitMod.join(', ')}`);
  }
  if (rule.rarity) parts.push(rule.rarity);
  if (rule.itemLevel?.min !== undefined) parts.push(`ilvl ${rule.itemLevel.min}+`);
  if (rule.itemLevel?.max !== undefined) parts.push(`ilvl <=${rule.itemLevel.max}`);
  if (rule.sockets?.min !== undefined) parts.push(`${rule.sockets.min}+ sockets`);
  if (rule.linkedSockets?.min !== undefined) {
    parts.push(`${rule.linkedSockets.min}+ links`);
  }
  if (rule.quality?.min !== undefined) parts.push(`${rule.quality.min}%+ quality`);
  if (rule.stackSize?.min !== undefined) parts.push(`stack ${rule.stackSize.min}+`);
  if (rule.mapTier?.min !== undefined) parts.push(`T${rule.mapTier.min}+`);
  return parts.join(', ');
}

function hasConditions(rule: Rule): boolean {
  return Boolean(
    rule.classNames?.length ||
      rule.baseTypes?.length ||
      rule.hasExplicitMod?.length ||
      rule.rarity ||
      rule.itemLevel ||
      rule.dropLevel ||
      rule.areaLevel ||
      rule.stackSize ||
      rule.quality ||
      rule.sockets ||
      rule.linkedSockets ||
      rule.mapTier ||
      rule.corrupted !== undefined ||
      rule.identified !== undefined,
  );
}

function conditionSignature(rule: Rule): string {
  return JSON.stringify({
    classNames: rule.classNames,
    baseTypes: rule.baseTypes,
    hasExplicitMod: rule.hasExplicitMod,
    rarity: rule.rarity,
    itemLevel: rule.itemLevel,
    dropLevel: rule.dropLevel,
    areaLevel: rule.areaLevel,
    stackSize: rule.stackSize,
    quality: rule.quality,
    sockets: rule.sockets,
    linkedSockets: rule.linkedSockets,
    mapTier: rule.mapTier,
    corrupted: rule.corrupted,
    identified: rule.identified,
  });
}

function makeId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

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

/**
 * Removes empty ranges so a cleared field stops counting as a condition. An
 * emptied Classes or Base types list is kept: dropping it would silently widen
 * the rule, so the generator skips it and the editor asks for a value instead.
 */
function tidyRule(rule: Rule): Rule {
  const next: Rule = { ...rule };
  for (const key of RANGE_KEYS) {
    const range = next[key];
    if (range && range.min === undefined && range.max === undefined) {
      delete next[key];
    }
  }
  if (next.chips?.length === 0) delete next.chips;
  return next;
}

function StyleEditor({
  rule,
  onChange,
}: {
  rule: Rule;
  onChange: (patch: Partial<Rule>) => void;
}) {
  const update = (style: Partial<NonNullable<Rule['style']>>) =>
    onChange({ style: { ...(rule.style ?? {}), ...style } });

  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-[10px] uppercase tracking-wide text-zinc-600">
        Style
      </summary>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="text-[10px] text-zinc-500">
          Text
          <input
            type="color"
            value={colorToHex(rule.style?.textColor)}
            onChange={(event) =>
              update({ textColor: hexToColor(event.target.value) })
            }
            className="mt-0.5 block h-7 w-full rounded border border-ink-600 bg-ink-800"
          />
        </label>
        <label className="text-[10px] text-zinc-500">
          Border
          <input
            type="color"
            value={colorToHex(rule.style?.borderColor)}
            onChange={(event) =>
              update({ borderColor: hexToColor(event.target.value) })
            }
            className="mt-0.5 block h-7 w-full rounded border border-ink-600 bg-ink-800"
          />
        </label>
        <label className="text-[10px] text-zinc-500">
          Background
          <input
            type="color"
            value={colorToHex(rule.style?.backgroundColor)}
            onChange={(event) =>
              update({ backgroundColor: hexToColor(event.target.value) })
            }
            className="mt-0.5 block h-7 w-full rounded border border-ink-600 bg-ink-800"
          />
        </label>
        <label className="text-[10px] text-zinc-500">
          Font
          <input
            type="number"
            min={18}
            max={45}
            value={rule.style?.fontSize ?? 40}
            onChange={(event) => update({ fontSize: Number(event.target.value) })}
            className="mt-0.5 block w-full rounded border border-ink-600 bg-ink-800 px-1 py-1 text-xs text-zinc-200"
          />
        </label>
        <label className="text-[10px] text-zinc-500">
          Sound
          <select
            value={String(rule.style?.alertSound ?? 'None')}
            onChange={(event) =>
              update({
                alertSound:
                  event.target.value === 'None'
                    ? 'None'
                    : Number(event.target.value),
              })
            }
            className="mt-0.5 block w-full rounded border border-ink-600 bg-ink-800 px-1 py-1 text-xs text-zinc-200"
          >
            <option value="None">None</option>
            {Array.from({ length: 16 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => onChange({ style: undefined })}
            className="rounded border border-ink-600 px-2 py-1 text-[10px] text-zinc-400"
          >
            Clear style
          </button>
        </div>
      </div>
    </details>
  );
}

function ConditionsEditor({
  rule,
  onChange,
}: {
  rule: Rule;
  onChange: (patch: Partial<Rule>) => void;
}) {
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-[10px] uppercase tracking-wide text-zinc-600">
        Conditions
      </summary>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <ListField
          label="Classes (comma separated)"
          value={rule.classNames}
          onCommit={(values) =>
            // Clearing an existing list keeps it, empty; see tidyRule.
            onChange({
              classNames: values.length || rule.classNames ? values : undefined,
            })
          }
        />
        <ListField
          label="Base types (comma separated)"
          value={rule.baseTypes}
          onCommit={(values) =>
            onChange({
              baseTypes: values.length || rule.baseTypes ? values : undefined,
            })
          }
        />
        <label className="text-[10px] text-zinc-500">
          Rarity
          <select
            value={rule.rarity ?? 'Any'}
            onChange={(event) =>
              onChange({
                rarity:
                  event.target.value === 'Any'
                    ? undefined
                    : (event.target.value as Rule['rarity']),
              })
            }
            className="mt-0.5 block w-full rounded border border-ink-600 bg-ink-800 px-1 py-1 text-xs text-zinc-200"
          >
            {RARITIES.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] text-zinc-500">
            ilvl min
            <input
              type="number"
              value={rule.itemLevel?.min ?? ''}
              onChange={(event) =>
                onChange({
                  itemLevel: {
                    ...rule.itemLevel,
                    min: number(event.target.value),
                  },
                })
              }
              className="mt-0.5 block w-full rounded border border-ink-600 bg-ink-800 px-1 py-1 text-xs text-zinc-200"
            />
          </label>
          <label className="text-[10px] text-zinc-500">
            ilvl max
            <input
              type="number"
              value={rule.itemLevel?.max ?? ''}
              onChange={(event) =>
                onChange({
                  itemLevel: {
                    ...rule.itemLevel,
                    max: number(event.target.value),
                  },
                })
              }
              className="mt-0.5 block w-full rounded border border-ink-600 bg-ink-800 px-1 py-1 text-xs text-zinc-200"
            />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-[10px] text-zinc-500">
            Sockets
            <input
              type="number"
              value={rule.sockets?.min ?? ''}
              onChange={(event) =>
                onChange({
                  sockets: { min: number(event.target.value) },
                })
              }
              className="mt-0.5 block w-full rounded border border-ink-600 bg-ink-800 px-1 py-1 text-xs text-zinc-200"
            />
          </label>
          <label className="text-[10px] text-zinc-500">
            Links
            <input
              type="number"
              value={rule.linkedSockets?.min ?? ''}
              onChange={(event) =>
                onChange({
                  linkedSockets: { min: number(event.target.value) },
                })
              }
              className="mt-0.5 block w-full rounded border border-ink-600 bg-ink-800 px-1 py-1 text-xs text-zinc-200"
            />
          </label>
          <label className="text-[10px] text-zinc-500">
            Map tier
            <input
              type="number"
              value={rule.mapTier?.min ?? ''}
              onChange={(event) =>
                onChange({ mapTier: { min: number(event.target.value) } })
              }
              className="mt-0.5 block w-full rounded border border-ink-600 bg-ink-800 px-1 py-1 text-xs text-zinc-200"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] text-zinc-500">
            Quality min
            <input
              type="number"
              value={rule.quality?.min ?? ''}
              onChange={(event) =>
                onChange({ quality: { min: number(event.target.value) } })
              }
              className="mt-0.5 block w-full rounded border border-ink-600 bg-ink-800 px-1 py-1 text-xs text-zinc-200"
            />
          </label>
          <label className="text-[10px] text-zinc-500">
            Stack min
            <input
              type="number"
              value={rule.stackSize?.min ?? ''}
              onChange={(event) =>
                onChange({ stackSize: { min: number(event.target.value) } })
              }
              className="mt-0.5 block w-full rounded border border-ink-600 bg-ink-800 px-1 py-1 text-xs text-zinc-200"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-[10px] text-zinc-500">
          <input
            type="checkbox"
            checked={!!rule.continue}
            onChange={(event) => onChange({ continue: event.target.checked })}
            className="size-3 accent-gold-400"
          />
          Continue to later rules
        </label>
      </div>
    </details>
  );
}

export default function AdvancedRules({
  baseRules,
  customRules,
  focusIndex,
  prefill,
  onChange,
}: {
  baseRules: Rule[];
  customRules: Rule[];
  /** Index into the emitted rule list to scroll to and highlight. */
  focusIndex?: number;
  prefill?: RulePrefill;
  onChange: (rules: Rule[]) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => ({
    ...EMPTY_DRAFT,
    ...(prefill?.classes ? { classes: prefill.classes } : {}),
    ...(prefill?.bases ? { bases: prefill.bases } : {}),
    ...(prefill?.rarity ? { rarity: prefill.rarity } : {}),
    ...(prefill?.ilvlMin ? { ilvlMin: prefill.ilvlMin } : {}),
  }));
  const [open, setOpen] = usePersistedOpen('advanced-rules-open');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  // A deep link from the loot simulator waits here until the section is open:
  // content inside a closed <details> cannot be scrolled to.
  const [pendingFocus, setPendingFocus] = useState(
    prefill !== undefined || focusIndex !== undefined,
  );
  const editorRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDetailsElement | null>>({});

  const scratch = baseRules.some((rule) => rule.id === 'scratch-base');
  const locked = groupRules(
    baseRules.filter((rule) => rule.id !== 'scratch-base'),
  );
  const lockedCount = locked.reduce((sum, [, rules]) => sum + rules.length, 0);

  const presetRules = useMemo(
    () =>
      baseRules.filter(
        (rule) =>
          // Quest and veiled rules are always-on safety nets, not something a
          // custom rule is said to override.
          rule.section !== 'quest' &&
          rule.section !== 'veiled' &&
          rule.section !== 'custom',
      ),
    [baseRules],
  );

  // Preset rules each custom rule can match, and therefore override, because
  // My rules are evaluated first.
  const overrides = useMemo(
    () =>
      customRules.map((rule) =>
        presetRules.filter((preset) => rulesOverlap(rule, preset)),
      ),
    [customRules, presetRules],
  );

  const reveal = (elementId: string, key: string) => {
    setHighlightKey(key);
    requestAnimationFrame(() => {
      document
        .getElementById(elementId)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    window.setTimeout(() => setHighlightKey(null), 2500);
  };

  const jumpToPresetRule = (rule: Rule) => {
    if (!rule.id) return;
    if (rule.section) sectionRefs.current[rule.section]?.setAttribute('open', '');
    reveal(`preset-rule-${rule.id}`, `preset:${rule.id}`);
  };

  const jumpToCustomRule = (index: number) => {
    const key = customRules[index]?.id ?? String(index);
    reveal(`custom-rule-${key}`, `custom:${key}`);
  };

  // Deep link from the loot simulator: reveal the deciding rule, or seed the
  // editor from the item that was pasted. Opens the section first, then acts
  // once it has rendered open.
  useEffect(() => {
    if (!pendingFocus) return;
    if (!open) {
      setOpen(true);
      return;
    }
    setPendingFocus(false);
    if (prefill) {
      requestAnimationFrame(() => {
        editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    if (focusIndex === undefined) return;
    const target = focusTargetAt(focusIndex, baseRules, customRules);
    if (target?.kind === 'custom') jumpToCustomRule(target.index);
    else if (target) jumpToPresetRule(target.rule);
    // Runs for the deep link only; later edits must not re-scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pendingFocus]);
  const coveredTemplates = new Set(
    TEMPLATES.filter((template) => templateIsCovered(template, baseRules)).map(
      (template) => template.id,
    ),
  );
  const addRules = (rules: Rule[]) => {
    onChange([...customRules, ...rules]);
  };

  const copyRule = (rule: Rule) => {
    addRules([
      {
        ...JSON.parse(JSON.stringify(rule)),
        id: makeId(),
        section: 'custom',
        comment: `Copy: ${rule.comment ?? ruleSummary(rule)}`,
      },
    ]);
    setMessage('Copied preset rule into My rules. It is evaluated first.');
  };

  const copyGroup = (rules: Rule[]) => {
    addRules(
      rules.map((rule) => ({
        ...JSON.parse(JSON.stringify(rule)),
        id: makeId(),
        section: 'custom' as RuleSection,
      })),
    );
    setMessage(`Copied ${rules.length} preset rule(s) into My rules.`);
  };

  const addDraft = () => {
    const typed = splitList(draft.bases);
    const unknown = typed.filter((base) => !KNOWN_BASES.has(base));
    if (unknown.length > 0) {
      setMessage(`Unknown base type(s): ${unknown.join(', ')}`);
      return;
    }
    const bases = [...new Set([...typed, ...unionChipBases(draft.chips)])].sort();
    const rule: Rule = {
      action: draft.action,
      id: makeId(),
      section: 'custom',
      comment: draft.comment || 'Custom rule',
      ...(draft.chips.length ? { chips: draft.chips } : {}),
      ...(draft.classes.length ? { classNames: draft.classes } : {}),
      ...(bases.length ? { baseTypes: bases } : {}),
      ...(draft.rarity !== 'Any' ? { rarity: draft.rarity } : {}),
      ...(draft.ilvlMin !== ''
        ? { itemLevel: { min: Number(draft.ilvlMin) } }
        : {}),
      ...(draft.ilvlMax !== ''
        ? {
            itemLevel: {
              ...(draft.ilvlMin !== ''
                ? { min: Number(draft.ilvlMin) }
                : {}),
              max: Number(draft.ilvlMax),
            },
          }
        : {}),
      ...(draft.socketsMin !== ''
        ? { sockets: { min: Number(draft.socketsMin) } }
        : {}),
      ...(draft.linksMin !== ''
        ? { linkedSockets: { min: Number(draft.linksMin) } }
        : {}),
      ...(draft.qualityMin !== ''
        ? { quality: { min: Number(draft.qualityMin) } }
        : {}),
      ...(draft.stackMin !== ''
        ? { stackSize: { min: Number(draft.stackMin) } }
        : {}),
      ...(draft.mapTierMin !== ''
        ? { mapTier: { min: Number(draft.mapTierMin) } }
        : {}),
      ...(draft.continue ? { continue: true } : {}),
      ...(draft.action === 'Show' ? { style: SLOT_STYLES.accessory } : {}),
    };
    addRules([rule]);
    setDraft(EMPTY_DRAFT);
    setMessage('Added rule to My rules.');
  };

  const updateRule = (index: number, patch: Partial<Rule>) => {
    onChange(
      customRules.map((rule, ruleIndex) =>
        ruleIndex === index ? tidyRule({ ...rule, ...patch }) : rule,
      ),
    );
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= customRules.length) return;
    const rules = [...customRules];
    [rules[index], rules[target]] = [rules[target]!, rules[index]!];
    onChange(rules);
  };

  const remove = (index: number) => {
    onChange(customRules.filter((_, ruleIndex) => ruleIndex !== index));
  };

  const duplicate = (index: number) => {
    const copy = JSON.parse(
      JSON.stringify(customRules[index]),
    ) as Rule;
    copy.id = makeId();
    onChange([
      ...customRules.slice(0, index + 1),
      copy,
      ...customRules.slice(index + 1),
    ]);
  };

  const drop = (index: number) => {
    if (dragged === null || dragged === index) return;
    const rules = [...customRules];
    const [moved] = rules.splice(dragged, 1);
    rules.splice(index, 0, moved!);
    onChange(rules);
    setDragged(null);
  };

  const warnings: string[] = [];
  const catchAll = customRules.findIndex(
    (rule) => !hasConditions(rule) && !customRuleProblem(rule),
  );
  if (catchAll >= 0 && catchAll < customRules.length - 1) {
    warnings.push(
      `Rule #${catchAll + 1} matches every item, so later My rules can never run.`,
    );
  }
  const seen = new Map<string, number>();
  customRules.forEach((rule, index) => {
    const serialized = conditionSignature(rule);
    const first = seen.get(serialized);
    if (first !== undefined) {
      warnings.push(`My rules #${first + 1} and #${index + 1} are identical.`);
    } else {
      seen.set(serialized, index);
    }
    const problem = customRuleProblem(rule);
    if (problem) {
      warnings.push(`My rules #${index + 1} is not written: ${problem}`);
      return;
    }
    const unknown = (rule.baseTypes ?? []).filter(
      (base) => !KNOWN_BASES.has(base),
    );
    if (unknown.length > 0) {
      warnings.push(`Unknown base type(s): ${unknown.join(', ')}`);
    }
  });

  const testItem = () => {
    const [item] = parseItemText(testText);
    if (!item) {
      setTestResult('No item block found.');
      return;
    }
    const result = evaluateRules(emittedRuleOrder(baseRules, customRules), item);
    setTestResult(
      `${result.shown ? 'Shown' : 'Hidden'} by ${
        result.index >= 0 ? `rule #${result.index + 1}` : 'default'
      }: ${result.reason}`,
    );
  };

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="min-w-0 rounded-xl border border-ink-700 bg-ink-800/40 p-4 sm:p-5"
    >
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="flex items-center gap-2 text-sm font-medium text-white">
          <CollapseChevron open={open} />
          Advanced rules
        </span>
        <span className="text-xs text-zinc-500">
          {lockedCount} locked preset {lockedCount === 1 ? 'rule' : 'rules'},{' '}
          {customRules.length} My {customRules.length === 1 ? 'rule' : 'rules'}
        </span>
      </summary>
      <p className="mt-2 text-xs text-zinc-500">
        The preset is locked. My rules are evaluated first, so a copied preset
        rule overrides it until you remove the copy.
      </p>

      {message && (
        <p className="mt-3 rounded-lg border border-ink-600 bg-ink-900/60 px-3 py-2 text-xs text-zinc-300">
          {message}
        </p>
      )}
      {warnings.map((warning, index) => (
        <p
          key={`${index}-${warning}`}
          className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
        >
          {warning}
        </p>
      ))}

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0">
          <div className="flex items-baseline justify-between">
            <h3 className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
              My rules ({customRules.length})
            </h3>
          </div>

          <div
            ref={editorRef}
            className="mt-2 rounded-lg border border-ink-700 bg-ink-900/40 p-3"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-[10px] uppercase tracking-wide text-zinc-500">
                Action
                <select
                  value={draft.action}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      action: event.target.value as 'Show' | 'Hide',
                    })
                  }
                  className="mt-1 block w-full rounded border border-ink-600 bg-ink-800 px-2 py-1 text-xs normal-case text-zinc-200"
                >
                  <option value="Show">Show</option>
                  <option value="Hide">Hide</option>
                </select>
              </label>
              <label className="text-[10px] uppercase tracking-wide text-zinc-500">
                Rarity
                <select
                  value={draft.rarity}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      rarity: event.target.value as Draft['rarity'],
                    })
                  }
                  className="mt-1 block w-full rounded border border-ink-600 bg-ink-800 px-2 py-1 text-xs normal-case text-zinc-200"
                >
                  {RARITIES.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-2 block text-[10px] uppercase tracking-wide text-zinc-500">
              Item classes
              <select
                value=""
                onChange={(event) => {
                  const value = event.target.value;
                  if (value && !draft.classes.includes(value)) {
                    setDraft({
                      ...draft,
                      classes: [...draft.classes, value],
                    });
                  }
                }}
                className="mt-1 block w-full rounded border border-ink-600 bg-ink-800 px-2 py-1 text-xs normal-case text-zinc-200"
              >
                <option value="">Add item class...</option>
                {CLASS_OPTIONS.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </label>
            {draft.classes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {draft.classes.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        classes: draft.classes.filter((name) => name !== entry),
                      })
                    }
                    className="rounded-full border border-ink-600 px-2 py-0.5 text-[10px] text-zinc-300"
                  >
                    {entry} ×
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                Quick chips
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {CHIPS.map((chip) => {
                  const active = draft.chips.includes(chip.id);
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      title={chip.hint}
                      aria-pressed={active}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          chips: active
                            ? draft.chips.filter((id) => id !== chip.id)
                            : [...draft.chips, chip.id],
                        })
                      }
                      className={cx(
                        'rounded-full border px-2 py-0.5 text-[10px]',
                        active
                          ? 'border-gold-400/60 bg-gold-400/10 text-gold-200'
                          : 'border-ink-600 text-zinc-300 hover:border-ink-500',
                      )}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
              {draft.chips.length > 0 && (
                <p className="mt-1 text-[10px] text-zinc-600">
                  {unionChipBases(draft.chips).length} base types selected.
                </p>
              )}
            </div>
            <label className="mt-2 block text-[10px] uppercase tracking-wide text-zinc-500">
              Base types (comma separated)
              <input
                value={draft.bases}
                onChange={(event) =>
                  setDraft({ ...draft, bases: event.target.value })
                }
                placeholder="Convoking Wand, Bone Spirit Shield"
                className="mt-1 block w-full rounded border border-ink-600 bg-ink-800 px-2 py-1 text-xs normal-case text-zinc-200"
              />
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <label className="text-[10px] text-zinc-500">
                ilvl min
                <input
                  type="number"
                  value={draft.ilvlMin}
                  onChange={(event) =>
                    setDraft({ ...draft, ilvlMin: event.target.value })
                  }
                  className="mt-1 block w-full rounded border border-ink-600 bg-ink-800 px-1 py-1 text-xs text-zinc-200"
                />
              </label>
              <label className="text-[10px] text-zinc-500">
                ilvl max
                <input
                  type="number"
                  value={draft.ilvlMax}
                  onChange={(event) =>
                    setDraft({ ...draft, ilvlMax: event.target.value })
                  }
                  className="mt-1 block w-full rounded border border-ink-600 bg-ink-800 px-1 py-1 text-xs text-zinc-200"
                />
              </label>
              <label className="text-[10px] text-zinc-500">
                Map tier min
                <input
                  type="number"
                  value={draft.mapTierMin}
                  onChange={(event) =>
                    setDraft({ ...draft, mapTierMin: event.target.value })
                  }
                  className="mt-1 block w-full rounded border border-ink-600 bg-ink-800 px-1 py-1 text-xs text-zinc-200"
                />
              </label>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              <label className="text-[10px] text-zinc-500">
                Sockets
                <input
                  type="number"
                  value={draft.socketsMin}
                  onChange={(event) =>
                    setDraft({ ...draft, socketsMin: event.target.value })
                  }
                  className="mt-1 block w-full rounded border border-ink-600 bg-ink-800 px-1 py-1 text-xs text-zinc-200"
                />
              </label>
              <label className="text-[10px] text-zinc-500">
                Links
                <input
                  type="number"
                  value={draft.linksMin}
                  onChange={(event) =>
                    setDraft({ ...draft, linksMin: event.target.value })
                  }
                  className="mt-1 block w-full rounded border border-ink-600 bg-ink-800 px-1 py-1 text-xs text-zinc-200"
                />
              </label>
              <label className="text-[10px] text-zinc-500">
                Quality
                <input
                  type="number"
                  value={draft.qualityMin}
                  onChange={(event) =>
                    setDraft({ ...draft, qualityMin: event.target.value })
                  }
                  className="mt-1 block w-full rounded border border-ink-600 bg-ink-800 px-1 py-1 text-xs text-zinc-200"
                />
              </label>
              <label className="text-[10px] text-zinc-500">
                Stack
                <input
                  type="number"
                  value={draft.stackMin}
                  onChange={(event) =>
                    setDraft({ ...draft, stackMin: event.target.value })
                  }
                  className="mt-1 block w-full rounded border border-ink-600 bg-ink-800 px-1 py-1 text-xs text-zinc-200"
                />
              </label>
            </div>
            <label className="mt-2 block text-[10px] uppercase tracking-wide text-zinc-500">
              Comment
              <input
                value={draft.comment}
                onChange={(event) =>
                  setDraft({ ...draft, comment: event.target.value })
                }
                className="mt-1 block w-full rounded border border-ink-600 bg-ink-800 px-2 py-1 text-xs normal-case text-zinc-200"
              />
            </label>
            <label className="mt-2 flex items-center gap-2 text-[10px] text-zinc-500">
              <input
                type="checkbox"
                checked={draft.continue}
                onChange={(event) =>
                  setDraft({ ...draft, continue: event.target.checked })
                }
                className="size-3 accent-gold-400"
              />
              Continue to later rules
            </label>
            <button
              type="button"
              onClick={addDraft}
              className="mt-3 rounded bg-gold-400 px-3 py-1.5 text-xs font-semibold text-ink-950 hover:bg-gold-300"
            >
              Add to My rules
            </button>
          </div>

          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-600">
              Templates
            </p>
            {coveredTemplates.size > 0 && (
              <p className="mt-1 text-[10px] text-zinc-600">
                “In preset” means the current preset already does this; adding
                it only overrides the preset’s styling.
              </p>
            )}
            <div className="mt-1 flex flex-wrap gap-1.5">
              {TEMPLATES.map((template) => {
                const inPreset = coveredTemplates.has(template.id);
                return (
                  <button
                    key={template.id}
                    type="button"
                    title={
                      inPreset
                        ? 'The current preset already covers this. Adding the template overrides its styling.'
                        : template.description
                    }
                    onClick={() => {
                      addRules(
                        template.rules.map((rule) => ({
                          ...JSON.parse(JSON.stringify(rule)),
                          id: makeId(),
                          section: 'custom',
                        })),
                      );
                      setMessage(
                        inPreset
                          ? `Added ${template.name}. It is already in the preset; this copy overrides its style.`
                          : `Added template: ${template.name}.`,
                      );
                    }}
                    className={cx(
                      'rounded-full border px-2.5 py-1 text-[10px]',
                      inPreset
                        ? 'border-emerald-500/40 text-emerald-200/90 hover:border-emerald-400/60'
                        : 'border-ink-600 text-zinc-300 hover:border-ink-500',
                    )}
                  >
                    + {template.name}
                    {inPreset && (
                      <span className="ml-1.5 text-[9px] uppercase tracking-wide text-emerald-400">
                        in preset
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <ol className="mt-3 space-y-2">
            {customRules.map((rule, index) => (
              <li
                key={rule.id ?? index}
                id={`custom-rule-${rule.id ?? index}`}
                draggable
                onDragStart={() => setDragged(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => drop(index)}
                className={cx(
                  'rounded-lg border bg-ink-900/50 p-2.5 transition-colors',
                  highlightKey === `custom:${rule.id ?? index}`
                    ? 'border-gold-400 ring-2 ring-gold-400/40'
                    : 'border-ink-700',
                  rule.disabled && 'opacity-50',
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-7 text-[10px] text-zinc-600">
                    #{index + 1}
                  </span>
                  <select
                    value={rule.action}
                    onChange={(event) =>
                      updateRule(index, {
                        action: event.target.value as 'Show' | 'Hide',
                      })
                    }
                    className="rounded border border-ink-600 bg-ink-800 px-1.5 py-0.5 text-[11px] text-zinc-200"
                  >
                    <option value="Show">Show</option>
                    <option value="Hide">Hide</option>
                  </select>
                  <label className="flex items-center gap-1 text-[10px] text-zinc-500">
                    <input
                      type="checkbox"
                      className="size-3 accent-gold-400"
                      checked={!rule.disabled}
                      onChange={(event) =>
                        updateRule(index, {
                          disabled: !event.target.checked,
                        })
                      }
                    />
                    on
                  </label>
                  <input
                    value={rule.comment ?? ''}
                    onChange={(event) =>
                      updateRule(index, { comment: event.target.value })
                    }
                    placeholder="comment"
                    className="min-w-0 flex-1 rounded border border-ink-600 bg-ink-800 px-2 py-0.5 text-[11px] text-zinc-200"
                  />
                  <button
                    type="button"
                    className="px-1 text-xs text-zinc-500 hover:text-white"
                    onClick={() => move(index, -1)}
                  >
                    up
                  </button>
                  <button
                    type="button"
                    className="px-1 text-xs text-zinc-500 hover:text-white"
                    onClick={() => move(index, 1)}
                  >
                    down
                  </button>
                  <button
                    type="button"
                    className="px-1 text-xs text-zinc-500 hover:text-white"
                    onClick={() => duplicate(index)}
                  >
                    copy
                  </button>
                  <button
                    type="button"
                    className="px-1 text-xs text-red-300"
                    onClick={() => remove(index)}
                  >
                    del
                  </button>
                </div>
                <p className="mt-1 pl-7 text-[11px] text-zinc-600">
                  {ruleSummary(rule)}
                </p>
                {overrides[index]!.length > 0 && (
                  <p className="mt-1 pl-7 text-[11px] text-amber-300/80">
                    Overrides preset{' '}
                    <button
                      type="button"
                      onClick={() => jumpToPresetRule(overrides[index]![0]!)}
                      className="underline underline-offset-2 hover:text-amber-100"
                    >
                      {overrides[index]![0]!.comment ??
                        ruleSummary(overrides[index]![0]!)}
                    </button>
                    {overrides[index]!.length > 1
                      ? ` and ${overrides[index]!.length - 1} more`
                      : ''}
                  </p>
                )}
                <div className="pl-7">
                  <ConditionsEditor
                    rule={rule}
                    onChange={(patch) => updateRule(index, patch)}
                  />
                  <StyleEditor
                    rule={rule}
                    onChange={(patch) => updateRule(index, patch)}
                  />
                </div>
              </li>
            ))}
          </ol>
          {customRules.length === 0 && (
            <p className="mt-2 text-xs text-zinc-600">
              No custom rules yet. Add one above or copy a preset rule.
            </p>
          )}

          <div className="mt-4 rounded-lg border border-ink-700 bg-ink-900/30 p-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-600">
              Test an item
            </p>
            <textarea
              value={testText}
              onChange={(event) => setTestText(event.target.value)}
              placeholder="Paste an item block"
              className="mt-1 h-20 w-full rounded border border-ink-600 bg-ink-950 p-2 font-mono text-[10px] text-zinc-300"
            />
            <button
              type="button"
              onClick={testItem}
              className="mt-1 rounded border border-ink-600 px-2 py-1 text-xs text-zinc-300"
            >
              Test item
            </button>
            {testResult && (
              <p className="mt-2 text-xs text-zinc-400">{testResult}</p>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
              Locked preset ({lockedCount}{' '}
              {lockedCount === 1 ? 'rule' : 'rules'})
            </h3>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search preset rules"
            disabled={scratch}
            className="mt-2 w-full rounded border border-ink-600 bg-ink-800 px-2 py-1 text-xs text-zinc-200 disabled:opacity-40"
          />
          {scratch ? (
            <p className="mt-2 rounded-lg border border-ink-700 bg-ink-900/40 px-3 py-2 text-xs text-zinc-500">
              From Scratch has no preset. Everything starts{' '}
              {baseRules.some(
                (rule) =>
                  rule.comment?.startsWith('From scratch') &&
                  rule.action === 'Show',
              )
                ? 'visible'
                : 'hidden'}
              ; add My rules to change that.
            </p>
          ) : (
          <div className="mt-2 space-y-2">
            {locked.map(([section, rules]) => {
              const visibleRules = rules.filter((rule) => {
                if (!search.trim()) return true;
                const haystack = `${rule.comment ?? ''} ${ruleSummary(rule)}`;
                return haystack.toLowerCase().includes(search.toLowerCase());
              });
              if (visibleRules.length === 0) return null;
              return (
                <details
                  key={section}
                  ref={(element) => {
                    sectionRefs.current[section] = element;
                  }}
                  className="rounded border border-ink-700/70"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-2 px-2 py-1.5 text-[11px] uppercase tracking-wide text-zinc-500">
                    <span>
                      {SECTION_LABELS[section]} ({visibleRules.length})
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        copyGroup(visibleRules);
                      }}
                      className="rounded border border-ink-600 px-1.5 py-0.5 text-[9px] normal-case tracking-normal text-zinc-400"
                    >
                      Copy group
                    </button>
                  </summary>
                  <ul className="space-y-1 border-t border-ink-700/60 p-2">
                    {visibleRules.map((rule) => (
                      <li
                        key={rule.id}
                        id={`preset-rule-${rule.id}`}
                        className={cx(
                          'flex items-start gap-2 rounded px-1 text-[11px] text-zinc-500 transition-colors',
                          highlightKey === `preset:${rule.id}` &&
                            'bg-gold-400/10 ring-1 ring-gold-400/40',
                        )}
                      >
                        <span
                          className={cx(
                            'shrink-0 font-mono',
                            rule.action === 'Show'
                              ? 'text-emerald-400'
                              : 'text-zinc-600',
                          )}
                        >
                          {rule.action === 'Show' ? 'S' : 'H'}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-zinc-400">
                            {rule.comment ?? 'rule'}
                          </span>{' '}
                          - {ruleSummary(rule)}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyRule(rule)}
                          className="shrink-0 text-[10px] text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
                        >
                          copy
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
          )}
        </div>
      </div>
    </details>
  );
}
