import type { Archetype, Attribute, ItemSlot } from './types.ts';

const CLASSES = new Set([
  'Scion',
  'Marauder',
  'Ranger',
  'Duelist',
  'Witch',
  'Templar',
  'Shadow',
]);

const ATTRIBUTES = new Set<Attribute>(['str', 'dex', 'int']);

const SLOTS = new Set<ItemSlot>([
  'weapon',
  'offhand',
  'helmet',
  'body',
  'gloves',
  'boots',
  'belt',
  'amulet',
  'ring',
  'quiver',
  'jewel',
  'flask',
]);

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface ValidationIssue {
  path: string;
  message: string;
}

export function validateArchetype(archetype: Archetype): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const issue = (path: string, message: string) =>
    issues.push({ path, message });

  if (!SLUG.test(archetype.id)) {
    issue('id', 'must be a lowercase slug such as "necro-minions"');
  }
  if (!archetype.name.trim()) issue('name', 'must not be empty');
  if (archetype.class !== undefined && !CLASSES.has(archetype.class)) {
    issue('class', `unknown class "${archetype.class}"`);
  }
  if (archetype.ascendancy !== undefined && !archetype.ascendancy.trim()) {
    issue('ascendancy', 'must not be empty when present');
  }
  if (!archetype.summary.trim()) issue('summary', 'must not be empty');
  if (typeof archetype.leveling !== 'boolean') {
    issue('leveling', 'must be a boolean');
  }
  if (!archetype.verifiedFor.trim()) {
    issue('verifiedFor', 'must name the league this mapping was checked against');
  }
  if (archetype.attributes.length === 0) {
    issue('attributes', 'needs at least one attribute');
  }
  for (const attribute of archetype.attributes) {
    if (!ATTRIBUTES.has(attribute)) {
      issue('attributes', `unknown attribute "${attribute}"`);
    }
  }

  const slots = Object.entries(archetype.slots);
  if (slots.length === 0) {
    issue('slots', 'needs at least one slot');
  }
  for (const [slot, spec] of slots) {
    if (!SLOTS.has(slot as ItemSlot)) {
      issue(`slots.${slot}`, 'unknown slot');
    }
    if (!spec) continue;
    if (spec.itemClasses.length === 0) {
      issue(`slots.${slot}.itemClasses`, 'needs at least one item class');
    }
  }

  return issues;
}

export function assertArchetype(archetype: Archetype): void {
  const issues = validateArchetype(archetype);
  if (issues.length > 0) {
    const detail = issues
      .map((entry) => `  ${entry.path}: ${entry.message}`)
      .join('\n');
    throw new Error(`Invalid archetype "${archetype.id}":\n${detail}`);
  }
}