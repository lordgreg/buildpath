import data from '../generated/builds/pob-links.json';

export interface PobLink {
  id: string;
  url: string;
  codeHash: string;
}

const links = data as unknown as {
  schemaVersion: number;
  links: Record<string, PobLink>;
};

export function getPobLink(buildId: string): PobLink | undefined {
  return links.links[buildId];
}

export const POB_LINKS = links.links;
