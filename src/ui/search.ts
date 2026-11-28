import type { BuildIndexEntry } from '../core/builds/types.ts';
import { getAscendancy } from '../meta/ascendancies.ts';

export interface SearchPage {
  id: string;
  title: string;
  description: string;
  href: string;
  keywords: string[];
}

export const SEARCH_PAGES: SearchPage[] = [
  {
    id: 'builds',
    title: 'Build catalogue',
    description: 'Every published build',
    href: './',
    keywords: ['builds', 'catalogue', 'home', 'guides'],
  },
  {
    id: 'filter',
    title: 'Filter builder',
    description: 'Generate a loot filter',
    href: './filter.html',
    keywords: ['filter', 'loot', 'builder'],
  },
  {
    id: 'changelog',
    title: 'Changelog',
    description: 'Release notes and commits',
    href: './changelog.html',
    keywords: ['changelog', 'releases', 'notes', 'commits'],
  },
  {
    id: 'demo',
    title: 'Loot simulator',
    description: 'Test a filter on sample drops',
    href: './demo.html',
    keywords: ['demo', 'loot', 'simulator', 'test'],
  },
  {
    id: 'tests',
    title: 'Behaviour audit',
    description: 'Every build against the drop catalogue',
    href: './tests.html',
    keywords: ['audit', 'tests', 'behaviour', 'report'],
  },
];

export interface SearchResult {
  kind: 'build' | 'page';
  id: string;
  title: string;
  subtitle: string;
  href: string;
  score: number;
  chips?: string[];
}

function ascendancyName(build: BuildIndexEntry): string {
  try {
    return getAscendancy(build.ascendancyId).name;
  } catch {
    return build.ascendancyId.replaceAll('-', ' ');
  }
}

function scoreText(query: string, text: string | undefined): number {
  if (!text) return 0;
  const value = text.toLowerCase();
  if (value === query) return 1000;
  if (value.startsWith(query)) return 800;
  if (value.includes(query)) return 500;
  return 0;
}

function scoreBuild(query: string, build: BuildIndexEntry): number {
  const ascendancy = ascendancyName(build);
  const chips = (build.chips ?? []).map((chip) => chip.label);
  return Math.max(
    scoreText(query, build.name),
    scoreText(query, build.mainSkill) * 0.95,
    scoreText(query, ascendancy) * 0.9,
    scoreText(query, build.class) * 0.85,
    scoreText(query, build.family) * 0.7,
    scoreText(query, build.season?.name) * 0.65,
    ...chips.map((chip) => scoreText(query, chip) * 0.8),
    scoreText(query, build.summary) * 0.35,
  );
}

function scorePage(query: string, page: SearchPage): number {
  return Math.max(
    scoreText(query, page.title),
    ...page.keywords.map((keyword) => scoreText(query, keyword) * 0.9),
    scoreText(query, page.description) * 0.5,
  );
}

/**
 * Ranked, offline search over the compiled catalogue and the site's pages.
 * Exact titles win, then skills/ascendancies, then tags and summary text.
 */
export function searchSite(
  rawQuery: string,
  builds: BuildIndexEntry[],
  pages: SearchPage[] = SEARCH_PAGES,
): SearchResult[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return pages.map((page) => ({
      kind: 'page' as const,
      id: page.id,
      title: page.title,
      subtitle: page.description,
      href: page.href,
      score: 0,
    }));
  }

  const buildResults: SearchResult[] = builds
    .map((build) => ({
      kind: 'build' as const,
      id: build.id,
      title: build.name,
      subtitle: `${build.class} / ${ascendancyName(build)} · ${build.mainSkill}`,
      href: `./build.html#build=${build.id}`,
      score: scoreBuild(query, build),
      chips: (build.chips ?? []).map((chip) => chip.label),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 8);

  const pageResults: SearchResult[] = pages
    .map((page) => ({
      kind: 'page' as const,
      id: page.id,
      title: page.title,
      subtitle: page.description,
      href: page.href,
      score: scorePage(query, page),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 5);

  return [...buildResults, ...pageResults];
}
