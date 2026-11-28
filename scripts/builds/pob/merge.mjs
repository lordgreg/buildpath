/**
 * Merge the per-step PoB XMLs into one build.
 *
 * PoB stores one `<Spec>` per tree, one `<SkillSet>` per gem loadout and one
 * `<ItemSet>` per gear loadout. The verifier already writes one XML per
 * measured step; this module renumbers the item ids globally and combines the
 * three set types, then adds a `<Notes>` block. The active pointers are set to
 * the step the page opens on (the red-map step), and the notes explain the rest.
 */

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttribute(value) {
  return escapeXml(value).replaceAll('"', '&quot;');
}

function block(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`));
  if (!match) throw new Error(`PoB XML has no <${tag}> block`);
  return match[0];
}

function innerBlock(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!match) throw new Error(`PoB XML has no <${tag}> block`);
  return match[1];
}

function withAttribute(tag, name, value) {
  return tag.replace(/^<([A-Za-z][\w-]*)([^>]*)>/, (whole, element, attributes) => {
    if (new RegExp(`\\b${name}="`).test(attributes)) {
      return `<${element}${attributes.replace(
        new RegExp(`\\b${name}="[^"]*"`),
        `${name}="${escapeAttribute(value)}"`,
      )}>`;
    }
    return `<${element}${attributes} ${name}="${escapeAttribute(value)}">`;
  });
}

/**
 * @param {{ steps: { id: string, label: string, xml: string }[], activeStep: string, notes: string }} input
 * @returns {string} one PoB XML document
 */
export function mergePobXml({ steps, activeStep, notes }) {
  if (steps.length === 0) throw new Error('mergePobXml: no steps');
  const activeIndex = steps.findIndex((step) => step.id === activeStep);
  if (activeIndex < 0) throw new Error(`mergePobXml: active step "${activeStep}" is missing`);

  const specs = [];
  const skillSets = [];
  const items = [];
  const itemSets = [];
  let itemOffset = 0;

  for (const [index, step] of steps.entries()) {
    const spec = innerBlock(step.xml, 'Tree').match(/<Spec\b[\s\S]*?<\/Spec>/)?.[0];
    const skillBlock = innerBlock(step.xml, 'Skills');
    const stepSkills = [...skillBlock.matchAll(/<Skill\b[\s\S]*?<\/Skill>/g)].map(
      (match) => match[0],
    );
    const itemBlock = innerBlock(step.xml, 'Items');
    if (!spec || stepSkills.length === 0) {
      throw new Error(`mergePobXml: ${step.id} has no spec or skill`);
    }

    const stepItems = [...itemBlock.matchAll(/<Item id="(\d+)">[\s\S]*?<\/Item>/g)];
    const itemMap = new Map();
    for (const match of stepItems) {
      const oldId = Number(match[1]);
      const newId = itemOffset + oldId;
      itemMap.set(oldId, newId);
      items.push(match[0].replace(`<Item id="${oldId}">`, `<Item id="${newId}">`));
    }
    itemOffset += stepItems.length;

    const renumber = (text) =>
      text.replace(/itemId="(\d+)"/g, (whole, value) => {
        const mapped = itemMap.get(Number(value));
        return mapped === undefined ? whole : `itemId="${mapped}"`;
      });

    const titledSpec = withAttribute(renumber(spec), 'title', step.label);
    specs.push(titledSpec);

    skillSets.push(
      `<SkillSet id="${index + 1}" title="${escapeAttribute(step.label)}">\n${stepSkills.join('\n')}\n</SkillSet>`,
    );

    const itemSet = itemBlock.match(/<ItemSet\b[\s\S]*?<\/ItemSet>/)?.[0];
    if (!itemSet) throw new Error(`mergePobXml: ${step.id} has no item set`);
    const titledItemSet = withAttribute(
      renumber(itemSet),
      'id',
      String(index + 1),
    );
    itemSets.push(withAttribute(titledItemSet, 'title', step.label));
  }

  const active = steps[activeIndex];
  const build = block(active.xml, 'Build');
  const config = block(active.xml, 'Config');
  const treeView = block(active.xml, 'TreeView');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<PathOfBuilding>',
    build,
    `<Tree activeSpec="${activeIndex + 1}">`,
    ...specs,
    '</Tree>',
    `<Skills activeSkillSet="${activeIndex + 1}">`,
    ...skillSets,
    '</Skills>',
    treeView,
    `<Items activeItemSet="${activeIndex + 1}">`,
    ...items,
    ...itemSets,
    '</Items>',
    config,
    `<Notes>${escapeXml(notes)}</Notes>`,
    '</PathOfBuilding>',
    '',
  ].join('\n');
}
