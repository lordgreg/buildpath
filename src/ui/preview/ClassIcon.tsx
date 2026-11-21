import type { ReactNode } from 'react';

const ICONS: Record<string, ReactNode> = {
  helmet: (
    <>
      <path d="M5 13a7 7 0 0 1 14 0v5H5z" />
      <path d="M5 15h14M9 15v3" />
    </>
  ),
  body: (
    <>
      <path d="M8 4l4 2 4-2 3 3-2 3v10H7V10L5 7z" />
      <path d="M10 4v6M14 4v6" />
    </>
  ),
  gloves: (
    <>
      <path d="M7 20v-6l3-2V6a1.5 1.5 0 0 1 3 0v5h1V5a1.5 1.5 0 0 1 3 0v9l2 2v4z" />
    </>
  ),
  boots: (
    <>
      <path d="M7 4v9l-2 3v3h11v-3l-3-2V4z" />
      <path d="M4 19h15" />
    </>
  ),
  belt: (
    <>
      <path d="M3 9h18v6H3z" />
      <path d="M10 9v6M14 9v6" />
    </>
  ),
  amulet: (
    <>
      <path d="M8 4l4 6 4-6" />
      <circle cx="12" cy="14" r="4" />
    </>
  ),
  ring: (
    <>
      <circle cx="12" cy="14" r="6" />
      <path d="M9 8l3-5 3 5" />
    </>
  ),
  shield: <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" />,
  wand: (
    <>
      <path d="M5 19L16 8" />
      <path d="M16 4l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" />
    </>
  ),
  sceptre: (
    <>
      <path d="M7 20l8-12" />
      <circle cx="17" cy="6" r="3" />
    </>
  ),
  staff: (
    <>
      <path d="M12 3v18" />
      <circle cx="12" cy="5" r="3" />
    </>
  ),
  sword: (
    <>
      <path d="M6 18L18 6l2-2-1 4-9 9z" />
      <path d="M4 20l4-4M9 11l4 4" />
    </>
  ),
  axe: (
    <>
      <path d="M6 20L16 6" />
      <path d="M14 4c3 0 5 2 5 5l-6 2z" />
    </>
  ),
  mace: (
    <>
      <path d="M12 20V10" />
      <circle cx="12" cy="6" r="4" />
    </>
  ),
  bow: (
    <>
      <path d="M6 3c6 3 6 15 0 18" />
      <path d="M6 3v18" />
    </>
  ),
  quiver: (
    <>
      <path d="M8 4h8l-2 16H10z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  claw: (
    <>
      <path d="M6 20c0-8 4-12 10-14" />
      <path d="M12 6c2-1 4-1 6 0M9 11c2-2 4-2 6-2" />
    </>
  ),
  dagger: (
    <>
      <path d="M12 3l4 9-4 9-4-9z" />
      <path d="M8 12h8" />
    </>
  ),
  flask: (
    <>
      <path d="M10 3h4M11 3v5L7 17a2 2 0 0 0 2 3h6a2 2 0 0 0 2-3l-4-9V3" />
    </>
  ),
  jewel: (
    <>
      <path d="M12 3l7 6-7 12L5 9z" />
      <path d="M5 9h14M9 3L5 9M15 3l4 6" />
    </>
  ),
  currency: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9 10h6M9 14h6" />
    </>
  ),
  gem: (
    <>
      <path d="M12 3l7 5-3 13H8L5 8z" />
      <path d="M5 8h14M12 3l-2 5 2 13 2-13" />
    </>
  ),
  map: (
    <>
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  fragment: <path d="M12 3l7 4v6l-4 8-4-5-4 5-3-8V7z" />,
  card: (
    <>
      <path d="M5 4h14v16H5z" />
      <path d="M8 8h8M8 12h5" />
    </>
  ),
  default: (
    <>
      <path d="M4 4h16v16H4z" />
      <path d="M9 12h6" />
    </>
  ),
};

const ICON_BY_CLASS: Record<string, string> = {
  Helmet: 'helmet',
  Helmets: 'helmet',
  'Body Armour': 'body',
  'Body Armours': 'body',
  Gloves: 'gloves',
  Boots: 'boots',
  Belt: 'belt',
  Belts: 'belt',
  Amulet: 'amulet',
  Amulets: 'amulet',
  Ring: 'ring',
  Rings: 'ring',
  Shield: 'shield',
  Shields: 'shield',
  Wand: 'wand',
  Wands: 'wand',
  Sceptre: 'sceptre',
  Sceptres: 'sceptre',
  Staff: 'staff',
  Staves: 'staff',
  Warstaff: 'staff',
  Warstaves: 'staff',
  Bow: 'bow',
  Bows: 'bow',
  Quiver: 'quiver',
  Quivers: 'quiver',
  'One Hand Sword': 'sword',
  'One Hand Swords': 'sword',
  'Thrusting One Hand Sword': 'sword',
  'Thrusting One Hand Swords': 'sword',
  'Two Hand Sword': 'sword',
  'Two Hand Swords': 'sword',
  'One Hand Axe': 'axe',
  'One Hand Axes': 'axe',
  'Two Hand Axe': 'axe',
  'Two Hand Axes': 'axe',
  'One Hand Mace': 'mace',
  'One Hand Maces': 'mace',
  'Two Hand Mace': 'mace',
  'Two Hand Maces': 'mace',
  Claw: 'claw',
  Claws: 'claw',
  Dagger: 'dagger',
  Daggers: 'dagger',
  'Rune Dagger': 'dagger',
  'Rune Daggers': 'dagger',
  'Life Flask': 'flask',
  'Life Flasks': 'flask',
  'Mana Flask': 'flask',
  'Mana Flasks': 'flask',
  'Hybrid Flask': 'flask',
  'Hybrid Flasks': 'flask',
  'Utility Flask': 'flask',
  'Utility Flasks': 'flask',
  Jewel: 'jewel',
  Jewels: 'jewel',
  AbyssJewel: 'jewel',
  'Abyss Jewels': 'jewel',
  'Stackable Currency': 'currency',
  'Skill Gems': 'gem',
  'Support Gems': 'gem',
  Maps: 'map',
  'Map Fragments': 'fragment',
  'Divination Cards': 'card',
};

export default function ClassIcon({
  itemClass,
  className,
}: {
  itemClass: string;
  className?: string;
}) {
  const key = ICON_BY_CLASS[itemClass] ?? 'default';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONS[key]}
    </svg>
  );
}