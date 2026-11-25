import { hasEmptyListCondition } from './rule-lists.ts';
import type { Color, Rule, Style } from './types.ts';

const INDENT = '    ';

function quote(value: string): string {
  return `"${value}"`;
}

/** Every emitted line must be printable ASCII. */
function blockProblem(lines: readonly string[]): string | null {
  if (lines.some((line) => !/^[\x20-\x7E]*$/.test(line))) {
    return 'it contains characters a filter cannot hold';
  }
  return null;
}

/**
 * A quoted name cannot carry its own quote. Exact matching makes stripping
 * unsafe, so such a block is left out rather than silently changed.
 */
function listProblem(rule: Rule): string | null {
  for (const key of ['classNames', 'baseTypes', 'hasExplicitMod'] as const) {
    const values = rule[key];
    if (values?.some((value) => value.includes('"'))) {
      return 'it contains a name with a quote';
    }
  }
  return null;
}

function quoteList(values: readonly string[]): string {
  return values.map(quote).join(' ');
}

function color(values: Color): string {
  return values.join(' ');
}

function range(condition: string, value: { min?: number; max?: number }): string[] {
  const lines: string[] = [];
  if (value.min !== undefined) lines.push(`${condition} >= ${value.min}`);
  if (value.max !== undefined) lines.push(`${condition} <= ${value.max}`);
  return lines;
}

function styleLines(style: Style): string[] {
  const lines: string[] = [];

  if (style.fontSize !== undefined) {
    lines.push(`SetFontSize ${style.fontSize}`);
  }
  if (style.textColor) {
    lines.push(`SetTextColor ${color(style.textColor)}`);
  }
  if (style.borderColor) {
    lines.push(`SetBorderColor ${color(style.borderColor)}`);
  }
  if (style.backgroundColor) {
    lines.push(`SetBackgroundColor ${color(style.backgroundColor)}`);
  }
  if (style.alertSound !== undefined) {
    lines.push(
      typeof style.alertSound === 'string'
        ? `PlayAlertSound ${style.alertSound}`
        : `PlayAlertSound ${style.alertSound} ${style.alertVolume ?? 100}`,
    );
  }
  if (style.playEffect) {
    lines.push(`PlayEffect ${style.playEffect}`);
  }
  if (style.minimapIcon) {
    const { size, color: iconColor, shape } = style.minimapIcon;
    lines.push(`MinimapIcon ${size} ${iconColor} ${shape}`);
  }

  return lines;
}

/** One emitted block's 1-based line range, for provenance in the audit page. */
export interface EmittedRuleSpan {
  rule: Rule;
  /** Index into the original rule array, disabled rules skipped. */
  index: number;
  startLine: number;
  endLine: number;
}

/**
 * Serialises a single rule to its block lines, in a fixed condition order so
 * output is byte-stable for a given config.
 */
function ruleLines(rule: Rule): string[] {
  const lines: string[] = [];

  if (rule.comment) {
    lines.push(`# ${rule.comment}`);
  }

  lines.push(rule.action);

  if (rule.classNames?.length) {
    lines.push(`${INDENT}Class == ${quoteList(rule.classNames)}`);
  }
  if (rule.baseTypes?.length) {
    lines.push(`${INDENT}BaseType == ${quoteList(rule.baseTypes)}`);
  }
  if (rule.rarity) {
    lines.push(`${INDENT}Rarity ${rule.rarity}`);
  }
  if (rule.itemLevel) {
    for (const line of range('ItemLevel', rule.itemLevel)) {
      lines.push(INDENT + line);
    }
  }
  if (rule.dropLevel) {
    for (const line of range('DropLevel', rule.dropLevel)) {
      lines.push(INDENT + line);
    }
  }
  if (rule.areaLevel) {
    for (const line of range('AreaLevel', rule.areaLevel)) {
      lines.push(INDENT + line);
    }
  }
  if (rule.stackSize) {
    for (const line of range('StackSize', rule.stackSize)) {
      lines.push(INDENT + line);
    }
  }
  if (rule.quality) {
    for (const line of range('Quality', rule.quality)) {
      lines.push(INDENT + line);
    }
  }
  if (rule.sockets) {
    for (const line of range('Sockets', rule.sockets)) {
      lines.push(INDENT + line);
    }
  }
  if (rule.linkedSockets) {
    for (const line of range('LinkedSockets', rule.linkedSockets)) {
      lines.push(INDENT + line);
    }
  }
  if (rule.socketGroup) {
    lines.push(`${INDENT}SocketGroup "${rule.socketGroup}"`);
  }
  if (rule.mapTier) {
    for (const line of range('MapTier', rule.mapTier)) {
      lines.push(INDENT + line);
    }
  }
  if (rule.corrupted !== undefined) {
    lines.push(`${INDENT}Corrupted ${rule.corrupted ? 'True' : 'False'}`);
  }
  if (rule.identified !== undefined) {
    lines.push(`${INDENT}Identified ${rule.identified ? 'True' : 'False'}`);
  }
  if (rule.hasExplicitMod?.length) {
    lines.push(`${INDENT}HasExplicitMod ${quoteList(rule.hasExplicitMod)}`);
  }
  if (rule.continue) {
    lines.push(`${INDENT}Continue`);
  }
  if (rule.style) {
    for (const line of styleLines(rule.style)) {
      lines.push(INDENT + line);
    }
  }

  return lines;
}

/** A block the emitter left out because writing it would break the filter. */
export interface RejectedRule {
  rule: Rule;
  index: number;
  reason: string;
}

/**
 * Serialises rules and reports each block's absolute 1-based line range in the
 * returned text. The game evaluates blocks top to bottom, first match wins.
 */
export function emitRulesWithSpans(rules: readonly Rule[]): {
  text: string;
  spans: EmittedRuleSpan[];
  rejected: RejectedRule[];
} {
  const blocks: { rule: Rule; index: number; lines: string[] }[] = [];
  const rejected: RejectedRule[] = [];
  rules.forEach((rule, index) => {
    if (rule.disabled) return;
    // An empty list matches nothing; writing the block without that line
    // would match everything instead. Custom rules are skipped earlier, so
    // this reports a generator bug.
    if (hasEmptyListCondition(rule)) {
      rejected.push({ rule, index, reason: 'an empty list condition matches nothing' });
      return;
    }
    const unsafeName = listProblem(rule);
    if (unsafeName) {
      rejected.push({ rule, index, reason: unsafeName });
      return;
    }
    // Last line of defence: custom rules are cleaned in compileFilter, so this
    // only fires on a bug. One bad block must not make the game reject the
    // whole filter, and must not crash the builder either.
    let lines: string[];
    try {
      lines = ruleLines(rule);
    } catch {
      rejected.push({ rule, index, reason: 'it could not be written' });
      return;
    }
    const reason = blockProblem(lines);
    if (reason) {
      rejected.push({ rule, index, reason });
      return;
    }
    blocks.push({ rule, index, lines });
  });

  let text = '';
  let newlines = 0;
  const spans: EmittedRuleSpan[] = [];

  for (const block of blocks) {
    if (text.length > 0) {
      text += '\n\n';
      newlines += 2;
    }
    const startLine = newlines + 1;
    text += block.lines.join('\n');
    newlines += block.lines.length - 1;
    spans.push({
      rule: block.rule,
      index: block.index,
      startLine,
      endLine: startLine + block.lines.length - 1,
    });
  }

  text += '\n';
  return { text, spans, rejected };
}

export function emitRules(rules: readonly Rule[]): string {
  return emitRulesWithSpans(rules).text;
}

/**
 * Emits the header plus rules and offsets each block's line range so it points
 * at the matching line in the full filter text.
 */
export function emitFilterWithSpans(
  header: readonly string[],
  rules: readonly Rule[],
): { text: string; spans: EmittedRuleSpan[]; rejected: RejectedRule[] } {
  const { text: rulesText, spans, rejected } = emitRulesWithSpans(rules);
  const headerText = header.map((line) => `# ${line}`).join('\n');
  // Header lines, then one blank line before the first block.
  const offset = header.length > 0 ? header.length + 1 : 0;
  return {
    text: `${headerText}\n\n${rulesText}`,
    spans: spans.map((span) => ({
      ...span,
      startLine: span.startLine + offset,
      endLine: span.endLine + offset,
    })),
    rejected,
  };
}

export function emitFilter(header: readonly string[], rules: readonly Rule[]): string {
  return emitFilterWithSpans(header, rules).text;
}
