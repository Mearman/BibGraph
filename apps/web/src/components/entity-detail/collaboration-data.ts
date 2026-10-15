/**
 * OpenAlex id and co-author extraction helpers for the author page. The OpenAlex Author object carries no co-author list, so the collaboration network is derived from the authorships of the works already fetched for the author page.
 */

import type { Work } from "@bibgraph/types";

const OPENALEX_URL_PREFIX = "https://openalex.org/";

/**
 * Reduce an OpenAlex entity id to its short form ("A5017898742", "W2741809807") whether the source gave the full OpenAlex URL or the short id. Authorship author ids arrive as full URLs; route params arrive short.
 */
export const toShortOpenAlexId = (id: string): string =>
  id.startsWith(OPENALEX_URL_PREFIX) ? id.slice(OPENALEX_URL_PREFIX.length) : id;

export interface CoAuthorNode {
  id: string;
  displayName: string;
  collaborationCount: number;
}

/**
 * Count collaborations per co-author across the given works. A co-author earns one collaboration per work they share with the author; the author themself is excluded, and ties break by display name so the order is stable between renders.
 */
export const extractCoAuthors = (
  works: readonly Work[],
  authorId: string,
): CoAuthorNode[] => {
  const selfId = toShortOpenAlexId(authorId);
  const counts = new Map<string, { displayName: string; count: number }>();

  for (const work of works) {
    for (const authorship of work.authorships ?? []) {
      const rawId = authorship.author.id;
      if (rawId === null || rawId === undefined) continue;
      const id = toShortOpenAlexId(rawId);
      if (id === selfId) continue;

      const existing = counts.get(id);
      if (existing === undefined) {
        counts.set(id, { displayName: authorship.author.display_name, count: 1 });
      } else {
        existing.count += 1;
      }
    }
  }

  return [...counts]
    .map(([id, { displayName, count }]) => ({
      id,
      displayName,
      collaborationCount: count,
    }))
    .sort(
      (a, b) =>
        b.collaborationCount - a.collaborationCount ||
        a.displayName.localeCompare(b.displayName),
    );
};
