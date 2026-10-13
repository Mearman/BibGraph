/**
 * Maps a router pathname to a human-readable page title for document.title. Titles are derived from the first path segment, which is the route name in this flat entity-centric scheme (/works/W123 maps to "Works"); unknown segments fall back to a capitalised form so new routes get a title without registration.
 */

const ROUTE_TITLES: Readonly<Record<string, string>> = {
  about: 'About',
  graph: 'Graph',
  'graph-comparison': 'Graph Comparison',
  reviews: 'Reviews',
  history: 'History',
  bookmarks: 'Bookmarks',
  catalogue: 'Catalogue',
  settings: 'Settings',
  search: 'Search',
  browse: 'Browse',
  cache: 'Cache',
  evaluation: 'Evaluation',
  explore: 'Explore',
  works: 'Works',
  authors: 'Authors',
  sources: 'Sources',
  institutions: 'Institutions',
  concepts: 'Concepts',
  topics: 'Topics',
  publishers: 'Publishers',
  funders: 'Funders',
  keywords: 'Keywords',
  subfields: 'Subfields',
  fields: 'Fields',
  domains: 'Domains',
};

const capitaliseSegment = (segment: string): string =>
  segment.length === 0 ? segment : segment.charAt(0).toUpperCase() + segment.slice(1);

/**
 * Returns the page title for a pathname, or null for the home route so the base title alone is used.
 */
export const routeTitle = (pathname: string): string | null => {
  const firstSegment = pathname.split('/').find((segment) => segment.length > 0);
  if (firstSegment === undefined) return null;
  return ROUTE_TITLES[firstSegment] ?? capitaliseSegment(firstSegment);
};
