import data from '../generated/builds/pob-links.json';

export interface PobLink {
  id: string;
  url: string;
  codeHash: string;
}

const links = data as {
  schemaVersion: number;
  links: Record<string, Record<string, PobLink>>;
};

export function getPobLink(buildId: string, checkpoint: string): PobLink | undefined {
  return links.links[buildId]?.[checkpoint];
}

export function getPobLinks(buildId: string): Record<string, PobLink> {
  return links.links[buildId] ?? {};
}

export const POB_LINKS = links.links;
