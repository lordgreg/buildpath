const milestones = [
  {
    id: 'M0',
    title: 'Foundation',
    body: 'Scaffold, CI deploy, base-type data, archetype schema.',
    status: 'in progress',
  },
  {
    id: 'M1',
    title: 'Pick and download',
    body: 'Twelve archetypes, presets, section toggles, .filter export.',
    status: 'next',
  },
  {
    id: 'M2',
    title: 'Customize and price',
    body: 'Themes, saved presets, economy-aware tiers, daily refresh.',
    status: 'planned',
  },
  {
    id: 'M3',
    title: 'Sync',
    body: 'Write straight into your Path of Exile filters folder.',
    status: 'planned',
  },
] as const;

export default function App() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6 py-10 sm:py-16">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-400">
            Path of Exile 1
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            FilterPath
          </h1>
        </div>
        <span className="rounded-full border border-ink-600 px-3 py-1 text-xs text-zinc-400">
          v0.1 · M0
        </span>
      </header>

      <main className="mt-10 flex-1">
        <p className="max-w-2xl text-lg leading-relaxed text-zinc-300">
          Tell it what you are levelling. Get a loot filter that highlights the
          gear that build actually wants. No account, no simulator, no clicking
          through a hundred menus.
        </p>

        <section className="mt-10 grid gap-3 sm:grid-cols-2">
          {milestones.map((milestone) => (
            <article
              key={milestone.id}
              className="rounded-xl border border-ink-700 bg-ink-800/60 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-medium text-white">
                  <span className="mr-2 text-gold-400">{milestone.id}</span>
                  {milestone.title}
                </h2>
                <span className="text-[11px] uppercase tracking-wider text-zinc-500">
                  {milestone.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {milestone.body}
              </p>
            </article>
          ))}
        </section>
      </main>

      <footer className="mt-12 border-t border-ink-700 pt-5 text-xs leading-relaxed text-zinc-500">
        <p>
          This product isn't affiliated with or endorsed by Grinding Gear Games
          in any way.
        </p>
        <p className="mt-1">
          Prices, when shown, are sourced from poe.ninja. Base item data from
          RePoE.
        </p>
      </footer>
    </div>
  );
}