const SITE_TITLE = 'BuildPath build guide';

/** Browser tab title for a build guide, so tabs and bookmarks name the build. */
export function buildGuideTitle(buildName?: string | null): string {
  return buildName ? `${buildName} · ${SITE_TITLE}` : SITE_TITLE;
}
