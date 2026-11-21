import type { Color, Rule, Style } from './types.ts';

const INDENT = '    ';

function quote(value: string): string {
  return `"${value.replaceAll('"', '')}"`;
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

/**
 * Serialises rules in a fixed condition order so output is byte-stable for a
 * given config. The game evaluates blocks top to bottom, first match wins.
 */
export function emitRules(rules: readonly Rule[]): string {
  const blocks: string[] = [];

  for (const rule of rules) {
    if (rule.disabled) continue;
    const lines: string[] = [];

    if (rule.comment) {
      lines.push(`# ${rule.comment}`);
    }

    lines.push(rule.action);

    if (rule.classNames?.length) {
      lines.push(`${INDENT}Class ${quoteList(rule.classNames)}`);
    }
    if (rule.baseTypes?.length) {
      lines.push(`${INDENT}BaseType ${quoteList(rule.baseTypes)}`);
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
    if (rule.continue) {
      lines.push(`${INDENT}Continue`);
    }
    if (rule.style) {
      for (const line of styleLines(rule.style)) {
        lines.push(INDENT + line);
      }
    }

    blocks.push(lines.join('\n'));
  }

  return `${blocks.join('\n\n')}\n`;
}

export function emitFilter(header: readonly string[], rules: readonly Rule[]): string {
  const headerText = header.map((line) => `# ${line}`).join('\n');
  return `${headerText}\n\n${emitRules(rules)}`;
}