/**
 * Author collaborator analysis utilities
 */

import type {
  Author,
  AuthorCollaboratorsFilters,
  AuthorWorksFilters,
  QueryParams,
  Work,
} from "@bibgraph/types";

/**
Collaboration statistics for an author pair
 */
export interface CollaboratorStats {
  count: number;
  years: number[];
  author_info?: Author;
}

/**
Result structure for collaborator analysis
 */
export interface CollaboratorResult {
  author: Author;
  collaboration_count: number;
  first_collaboration_year?: number;
  last_collaboration_year?: number;
}

/**
Fetcher function type for getting author works
 */
export type WorksFetcher = (
  authorId: string,
  filters: AuthorWorksFilters,
  parameters: QueryParams,
) => Promise<{ results: Work[] }>;

/**
Fetcher function type for getting author details
 */
export type AuthorFetcher = (
  authorId: string,
  parameters: QueryParams,
) => Promise<Author>;

/**
Maximum number of works to analyze for collaborations
 */
const MAX_WORKS_FOR_ANALYSIS = 200;

/**
Maximum number of collaborators to fetch details for
 */
const MAX_COLLABORATORS_TO_FETCH = 50;

/**
 * Build work filters based on collaborator filters
 */
export const buildWorksFiltersFromCollaboratorFilters = (filters: Readonly<AuthorCollaboratorsFilters>): AuthorWorksFilters => {
  const worksFilters: AuthorWorksFilters = {};

  if (filters.from_publication_year !== undefined) {
    worksFilters.publication_year =
      `>=${filters.from_publication_year.toString()}`;
  }

  return worksFilters;
};

/**
 * Analyze co-authorships from a collection of works
 * Returns a map of collaborator IDs to their collaboration statistics
 */
export const analyzeCoauthorships = (works: readonly Work[], authorId: string): Map<string, CollaboratorStats> => {
  const collaboratorStats = new Map<string, CollaboratorStats>();

  for (const work of works) {
    const coauthorIds = (work.authorships ?? [])
      .map((auth) => auth.author.id)
      .filter((id): id is string => id !== undefined && id !== authorId);

    for (const coauthorId of coauthorIds) {
      if (!collaboratorStats.has(coauthorId)) {
        collaboratorStats.set(coauthorId, {
          count: 0,
          years: [],
        });
      }

      const stats = collaboratorStats.get(coauthorId);
      if (!stats) continue;
      stats.count++;
      if (work.publication_year !== undefined) {
        stats.years.push(work.publication_year);
      }
    }
  }

  return collaboratorStats;
};

/**
 * Filter collaborators by minimum works threshold and sort by collaboration count
 */
export const filterAndSortCollaborators = (collaboratorStats: Map<string, CollaboratorStats>, minWorks: number): [string, CollaboratorStats][] => [...collaboratorStats]
    .filter(([, stats]) => stats.count >= minWorks)
    .sort(([, a], [, b]) => b.count - a.count);

/**
 * Build collaborator result from stats and author data
 */
export const buildCollaboratorResult = (author: Author, stats: CollaboratorStats): CollaboratorResult => {
  const result: CollaboratorResult = {
    author,
    collaboration_count: stats.count,
  };

  if (stats.years.length > 0) {
    result.first_collaboration_year = Math.min(...stats.years);
    result.last_collaboration_year = Math.max(...stats.years);
  }

  return result;
};

/**
 * Fetch collaborator details and build results
 */
export const fetchCollaboratorDetails = async (filteredCollaborators: readonly [string, CollaboratorStats][], getAuthor: AuthorFetcher): Promise<CollaboratorResult[]> => {
  const collaboratorResults = await Promise.allSettled(
    filteredCollaborators
      .slice(0, MAX_COLLABORATORS_TO_FETCH)
      .map(async ([collaboratorId, stats]) => {
        try {
          const collaboratorAuthor = await getAuthor(collaboratorId, {
            select: ["id", "display_name", "works_count", "cited_by_count"],
          });

          return buildCollaboratorResult(collaboratorAuthor, stats);
        } catch {
          // Skip authors that can't be fetched
          return null;
        }
      }),
  );

  return collaboratorResults
    .filter(
      (result): result is PromiseFulfilledResult<CollaboratorResult> =>
        result.status === "fulfilled" && result.value !== null,
    )
    .map((result) => result.value);
};

/**
 * Orchestrates the full collaborator analysis workflow
 */
export const analyzeAuthorCollaborators = async (authorId: string, filters: Readonly<AuthorCollaboratorsFilters>, params: Readonly<QueryParams>, getAuthorWorks: WorksFetcher, getAuthor: AuthorFetcher): Promise<CollaboratorResult[]> => {
  // Build works filters from collaborator filters
  const worksFilters = buildWorksFiltersFromCollaboratorFilters(filters);

  // Fetch works for analysis
  const works = await getAuthorWorks(authorId, worksFilters, {
    ...params,
    select: ["authorships", "publication_year"],
    per_page: MAX_WORKS_FOR_ANALYSIS,
  });

  // Analyze co-authorships
  const collaboratorStats = analyzeCoauthorships(works.results, authorId);

  // Filter and sort collaborators
  const minWorks = filters.min_works ?? 1;
  const filteredCollaborators = filterAndSortCollaborators(
    collaboratorStats,
    minWorks,
  );

  // Fetch details for top collaborators
  return fetchCollaboratorDetails(filteredCollaborators, getAuthor);
};
