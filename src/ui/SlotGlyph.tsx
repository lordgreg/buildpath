const GLYPHS: Record<string, string> = {
  'Weapon 1': 'M18 46 42 22m-6-6 10 10M14 50l8-4-4-4-4 8Zm22-30 4-4 8 8-4 4',
  'Weapon 2': 'M32 10 48 16v14c0 10-7 18-16 24-9-6-16-14-16-24V16l16-6Zm0 10v24',
  Helmet: 'M18 46V30c0-8 6-14 14-14s14 6 14 14v16H18Zm5-16h18M24 46v10m16-10v10',
  'Body Armour': 'M22 16 16 22l-4 12 8 2v12h24V36l8-2-4-12-6-6-10 6-10-6Zm10 6v26',
  Gloves: 'M22 42V24l5-4 5 4v6m0-6 5-4 5 4v6m0-6 5-4 5 4v14c0 8-5 14-12 14h-4c-7 0-12-6-12-14',
  Boots: 'M20 18v24l-8 6v8h30c6 0 10-4 10-10v-8H34V18H20Zm0 8h10',
  Belt: 'M12 28h40v10H12V28Zm14 0v10m12-10v10',
  Amulet: 'M32 12v10m0 0a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-18 0 10 10m22-10-10 10',
  'Ring 1': 'M32 22a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0-8 0 8',
  'Ring 2': 'M32 22a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0-8 0 8',
  Flask: 'M26 12h12M28 12v10l-8 18v10c0 3 2 6 5 6h14c3 0 5-3 5-6V40l-8-18V12M24 38h16',
  Jewel: 'M32 14 44 26 32 50 20 26 32 14Zm-12 12h24M32 14v36',
};

/**
 * Faint line art behind an empty slot. It is code-drawn, not a game asset:
 * enough silhouette to make the inventory read at a glance, and quiet enough
 * that the item name and mods stay legible.
 */
export default function SlotGlyph({ slot, tall = false }: { slot: string; tall?: boolean }) {
  const path = GLYPHS[slot] ?? GLYPHS.Jewel;
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden
      className={`pointer-events-none absolute inset-0 m-auto text-gold-300/80 ${
        tall ? 'h-24 w-24' : 'h-16 w-16'
      } opacity-[0.08]`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}
