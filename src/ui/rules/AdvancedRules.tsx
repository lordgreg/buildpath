import { useState } from 'react';
import type { Rule, RuleSection } from '../../core/filter/types.ts';
import { SLOT_STYLES } from '../../core/filter/types.ts';
import { colorToHex, hexToColor } from '../../core/filter/style-utils.ts';
import type { RuleClone } from '../../core/rules/clone.ts';
import {
  CHIPS,
  chipLabel,
  unionChipBases,
  type ChipId,
} from '../../core/rules/chips.ts';

const SECTION_LABELS: Record<RuleSection, string> = {
  gear: 'Build gear',
  gems: 'Gems',
  currency: 'Currency',
  maps: 'Maps & fragments',
  uniques: 'Uniques',
  junk: 'Junk hides',
  custom: 'Custom',
};

const RARITIES = ['Any', 'Normal', 'Magic', 'Rare', 'Unique'] as const;

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

function targetLabel(rule: Rule): string {
  if (rule.baseTypes?.length) {
    return `${rule.baseTypes.length} base types`;
  }
  if (rule.classNames?.length) return rule.classNames.join(', ');
  return 'any item';
}

function ruleSummary(rule: Rule): string {
  const parts = [targetLabel(rule)];
  if (rule.rarity) parts.push(rule.rarity);
  if (rule.itemLevel?.min !== undefined) parts.push(`ilvl ${rule.itemLevel.min}+`);
  if (rule.sockets?.min !== undefined) parts.push(`${rule.sockets.min}+ sockets`);
  if (rule.linkedSockets?.min !== undefined) {
    parts.push(`${rule.linkedSockets.min}+ links`);
  }
  return parts.join(', ');
}

export default function AdvancedRules({
  baseRules,
  clone,
  presetVersion,
  onClone,
  onChange,
  onReset,
  onImportCode,
}: {
  baseRules: Rule[];
  clone: RuleClone | null;
  presetVersion: string;
  onClone: () => void;
  onChange: (clone: RuleClone) => void;
  onReset: () => void;
  onImportCode: (code: string) => Promise<string | null>;
}) {
  const [chips, setChips] = useState<ChipId[]>([]);
  const [action, setAction] = useState<'Show' | 'Hide'>('Hide');
  const [rarity, setRarity] = useState<(typeof RARITIES)[number]>('Any');
  const [itemLevel, setItemLevel] = useState('');
  const [comment, setComment] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const locked = groupRules(baseRules);

  const updateRule = (index: number, patch: Partial<Rule>) => {
    if (!clone) return;
    const rules = clone.rules.map((rule, ruleIndex) =>
      ruleIndex === index ? { ...rule, ...patch } : rule,
    );
    onChange({ ...clone, rules });
  };

  const updateStyle = (
    index: number,
    patch: Partial<NonNullable<Rule['style']>>,
  ) => {
    if (!clone) return;
    const rule = clone.rules[index]!;
    updateRule(index, {
      style: { ...(rule.style ?? {}), ...patch },
    });
  };

  const moveRule = (index: number, delta: number) => {
    if (!clone) return;
    const target = index + delta;
    if (target < 0 || target >= clone.rules.length) return;
    const rules = [...clone.rules];
    [rules[index], rules[target]] = [rules[target]!, rules[index]!];
    onChange({ ...clone, rules });
  };

  const duplicateRule = (index: number) => {
    if (!clone) return;
    const rules = [...clone.rules];
    const copy = JSON.parse(JSON.stringify(rules[index])) as Rule;
    copy.id = `${copy.id ?? 'rule'}-copy-${rules.length}`;
    rules.splice(index + 1, 0, copy);
    onChange({ ...clone, rules });
  };

  const removeRule = (index: number) => {
    if (!clone) return;
    onChange({ ...clone, rules: clone.rules.filter((_, i) => i !== index) });
  };

  const addRule = () => {
    if (!clone || chips.length === 0) return;
    const baseTypes = unionChipBases(chips);
    if (baseTypes.length === 0) {
      setMessage('Those chips resolve to no base types.');
      return;
    }
    const rule: Rule = {
      action,
      id: `custom-${clone.rules.length}`,
      section: 'custom',
      comment:
        comment.trim() ||
        chips.map((chip) => chipLabel(chip)).join(' + '),
      chips: [...chips],
      baseTypes,
      ...(rarity !== 'Any' ? { rarity } : {}),
      ...(itemLevel !== ''
        ? { itemLevel: { min: Number(itemLevel) } }
        : {}),
      ...(action === 'Show' ? { style: SLOT_STYLES.accessory } : {}),
    };
    onChange({ ...clone, rules: [...clone.rules, rule] });
    setChips([]);
    setComment('');
    setItemLevel('');
    setMessage(null);
  };

  const importCode = async () => {
    const error = await onImportCode(codeInput);
    setCodeInput('');
    setMessage(error ?? 'Imported build code.');
  };

  return (
    <section className="min-w-0 rounded-xl border border-ink-700 bg-ink-800/40 p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-white">Advanced rules</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Locked preset rules are read-only. Clone the set to edit, reorder or
            add chips such as DEX head or two-hand weapons.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {clone ? (
            <>
              <button
                type="button"
                onClick={onReset}
                className="rounded-lg border border-ink-600 px-3 py-1.5 text-xs text-zinc-300 hover:border-ink-500"
              >
                Reset to locked
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClone}
              className="rounded-lg bg-gold-400 px-3 py-1.5 text-xs font-semibold text-ink-950 hover:bg-gold-300"
            >
              Clone preset
            </button>
          )}
        </div>
      </header>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Import code"
          value={codeInput}
          onChange={(event) => setCodeInput(event.target.value)}
          className="min-w-0 flex-1 rounded border border-ink-600 bg-ink-800 px-2 py-1.5 text-xs text-zinc-200"
        />
        <button
          type="button"
          onClick={() => void importCode()}
          className="rounded border border-ink-600 px-3 py-1.5 text-xs text-zinc-300 hover:border-ink-500"
        >
          Import code
        </button>
      </div>

      {clone && clone.presetVersion !== presetVersion && (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          This clone was made from an older preset. Reset it to pick up the new
          locked rules; your edits are never merged silently.
        </p>
      )}

      {message && (
        <p className="mt-3 rounded-lg border border-ink-600 bg-ink-900/60 px-3 py-2 text-xs text-zinc-300">
          {message}
        </p>
      )}

      {clone && (
        <>
          <div className="mt-5 rounded-lg border border-ink-700 bg-ink-900/40 p-3">
            <h3 className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
              Add a rule
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CHIPS.map((chip) => {
                const selected = chips.includes(chip.id);
                return (
                  <button
                    key={chip.id}
                    type="button"
                    aria-pressed={selected}
                    title={chip.hint}
                    onClick={() =>
                      setChips((previous) =>
                        selected
                          ? previous.filter((id) => id !== chip.id)
                          : [...previous, chip.id],
                      )
                    }
                    className={cx(
                      'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                      selected
                        ? 'border-gold-400 bg-gold-400/10 text-white'
                        : 'border-ink-600 text-zinc-400 hover:border-ink-500',
                    )}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
            {chips.length > 0 && (
              <p className="mt-2 text-[11px] text-zinc-500">
                Resolves to {unionChipBases(chips).length} base types.
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="text-[11px] text-zinc-500">
                Action
                <select
                  value={action}
                  onChange={(event) =>
                    setAction(event.target.value as 'Show' | 'Hide')
                  }
                  className="mt-1 block rounded border border-ink-600 bg-ink-800 px-2 py-1 text-xs text-zinc-200"
                >
                  <option value="Hide">Hide</option>
                  <option value="Show">Show</option>
                </select>
              </label>
              <label className="text-[11px] text-zinc-500">
                Rarity
                <select
                  value={rarity}
                  onChange={(event) =>
                    setRarity(
                      event.target.value as (typeof RARITIES)[number],
                    )
                  }
                  className="mt-1 block rounded border border-ink-600 bg-ink-800 px-2 py-1 text-xs text-zinc-200"
                >
                  {RARITIES.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] text-zinc-500">
                Item level
                <input
                  type="number"
                  min={1}
                  placeholder="any"
                  value={itemLevel}
                  onChange={(event) => setItemLevel(event.target.value)}
                  className="mt-1 block w-20 rounded border border-ink-600 bg-ink-800 px-2 py-1 text-xs text-zinc-200"
                />
              </label>
              <label className="min-w-40 flex-1 text-[11px] text-zinc-500">
                Comment
                <input
                  type="text"
                  placeholder="optional"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  className="mt-1 block w-full rounded border border-ink-600 bg-ink-800 px-2 py-1 text-xs text-zinc-200"
                />
              </label>
              <button
                type="button"
                disabled={chips.length === 0}
                onClick={addRule}
                className="rounded bg-gold-400 px-3 py-1.5 text-xs font-semibold text-ink-950 hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add rule
              </button>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
                My rules
              </h3>
              <span className="text-[11px] text-zinc-500">
                {clone.rules.length} rules
              </span>
            </div>
            <ol className="mt-2 space-y-2">
              {clone.rules.map((rule, index) => (
                <li
                  key={rule.id ?? index}
                  className={cx(
                    'rounded-lg border border-ink-700 bg-ink-900/50 p-2.5',
                    rule.disabled && 'opacity-50',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-8 text-[10px] text-zinc-600">
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
                    <label className="flex items-center gap-1 text-[10px] text-zinc-500">
                      <input
                        type="checkbox"
                        className="size-3 accent-gold-400"
                        checked={!!rule.continue}
                        onChange={(event) =>
                          updateRule(index, {
                            continue: event.target.checked,
                          })
                        }
                      />
                      continue
                    </label>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-400">
                      {rule.comment ?? ruleSummary(rule)}
                    </span>
                    <button
                      type="button"
                      className="px-1 text-xs text-zinc-500 hover:text-white"
                      onClick={() => moveRule(index, -1)}
                      title="Move up"
                    >
                      up
                    </button>
                    <button
                      type="button"
                      className="px-1 text-xs text-zinc-500 hover:text-white"
                      onClick={() => moveRule(index, 1)}
                      title="Move down"
                    >
                      down
                    </button>
                    <button
                      type="button"
                      className="px-1 text-xs text-zinc-500 hover:text-white"
                      onClick={() => duplicateRule(index)}
                      title="Duplicate"
                    >
                      copy
                    </button>
                    <button
                      type="button"
                      className="px-1 text-xs text-red-300 hover:text-red-200"
                      onClick={() => removeRule(index)}
                      title="Delete"
                    >
                      del
                    </button>
                  </div>
                  <p className="mt-1 pl-8 text-[11px] text-zinc-600">
                    {ruleSummary(rule)}
                    {rule.chips?.length
                      ? ` - ${rule.chips.map((chip) => chipLabel(chip)).join(' + ')}`
                      : ''}
                  </p>
                  <details className="mt-1 pl-8">
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
                            updateStyle(index, {
                              textColor: hexToColor(event.target.value),
                            })
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
                            updateStyle(index, {
                              borderColor: hexToColor(event.target.value),
                            })
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
                            updateStyle(index, {
                              backgroundColor: hexToColor(event.target.value),
                            })
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
                          onChange={(event) =>
                            updateStyle(index, {
                              fontSize: Number(event.target.value),
                            })
                          }
                          className="mt-0.5 block w-full rounded border border-ink-600 bg-ink-800 px-1 py-1 text-xs text-zinc-200"
                        />
                      </label>
                      <label className="text-[10px] text-zinc-500">
                        Sound
                        <select
                          value={String(rule.style?.alertSound ?? 'None')}
                          onChange={(event) =>
                            updateStyle(index, {
                              alertSound:
                                event.target.value === 'None'
                                  ? 'None'
                                  : Number(event.target.value),
                            })
                          }
                          className="mt-0.5 block w-full rounded border border-ink-600 bg-ink-800 px-1 py-1 text-xs text-zinc-200"
                        >
                          <option value="None">None</option>
                          {Array.from({ length: 16 }, (_, sound) => (
                            <option key={sound + 1} value={sound + 1}>
                              {sound + 1}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => updateRule(index, { style: undefined })}
                          className="rounded border border-ink-600 px-2 py-1 text-[10px] text-zinc-400"
                        >
                          Clear style
                        </button>
                      </div>
                    </div>
                  </details>
                </li>
              ))}
            </ol>
          </div>

        </>
      )}

      <details
        className="mt-5 rounded-lg border border-ink-700 bg-ink-900/30 p-3"
        open
      >
        <summary className="cursor-pointer text-xs text-zinc-400">
          Locked preset ({baseRules.length} rules)
        </summary>
        <div className="mt-3 space-y-3">
          {locked.map(([section, rules]) => (
            <details key={section} className="rounded border border-ink-700/70">
              <summary className="cursor-pointer px-2 py-1.5 text-[11px] uppercase tracking-wide text-zinc-500">
                {SECTION_LABELS[section]} ({rules.length})
              </summary>
              <ul className="space-y-1 border-t border-ink-700/60 p-2">
                {rules.map((rule) => (
                  <li
                    key={rule.id}
                    className="flex gap-2 text-[11px] text-zinc-500"
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
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </details>
    </section>
  );
}