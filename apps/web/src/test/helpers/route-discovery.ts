/**
 * Route Discovery Helper
 *
 * Extracts all routes from TanStack Router's generated routeTree.gen.ts
 * to enable automatic smoke testing of all application routes.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { ENTITY_TYPES, type EntityType } from "@bibgraph/types";

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Routes categorized by their testing requirements
 */
export interface CategorizedRoutes {
	/**
	Static pages with no parameters (e.g., /about, /settings)
	 */
	static: string[];
	/**
	Entity index/browse pages (e.g., /works, /authors)
	 */
	entityIndex: string[];
	/**
	Entity detail pages requiring an ID (e.g., /works/$, /authors/$)
	 */
	entityDetail: string[];
	/**
	External ID resolution routes (e.g., /authors/orcid/$orcid)
	 */
	externalId: string[];
	/**
	Autocomplete pages (e.g., /autocomplete/works)
	 */
	autocomplete: string[];
	/**
	Routes to skip in smoke tests (proxies, catch-alls)
	 */
	skip: string[];
}

/**
 * Patterns for routes that should be skipped in smoke tests
 */
const SKIP_PATTERNS = [
	/^\/\$/, // Catch-all routes (/$, /$externalId)
	/^\/https\//, // HTTPS proxy routes
	/^\/openalex\.org\//, // OpenAlex.org proxy routes
	/^\/openalex-url\//, // OpenAlex URL proxy routes
	/^\/api-openalex-org\//, // API proxy routes
];

/**
 * Entity types that have index pages
 */
const ENTITY_INDEX_PATHS = new Set([
	"/works",
	"/authors",
	"/sources",
	"/institutions",
	"/topics",
	"/publishers",
	"/funders",
	"/concepts",
	"/keywords",
]);

/**
 * External ID route patterns and their entity types
 */
const isEntityType = (value: string): value is EntityType =>
	ENTITY_TYPES.some((entityType) => entityType === value);

const EXTERNAL_ID_ROUTES: Record<string, { entityType: EntityType; idType: string }> = {
	"/authors/orcid/$orcid": { entityType: "authors", idType: "orcid" },
	"/sources/issn/$issn": { entityType: "sources", idType: "issn" },
	"/institutions/ror/$ror": { entityType: "institutions", idType: "ror" },
	"/works/doi/$doi": { entityType: "works", idType: "doi" },
};

/**
 * Extract all route paths from routeTree.gen.ts
 *
 * Parses the FileRoutesByFullPath interface to get all defined routes.
 */
export const getAllRoutes = (): string[] => {
	const routeTreePath = path.resolve(__dirname, "../../routeTree.gen.ts");
	const content = fs.readFileSync(routeTreePath, "utf8");

	// Extract routes from FileRoutesByFullPath interface
	const interfaceMatch = /export interface FileRoutesByFullPath \{([\s\S]*?)\n\}/.exec(content);
	if (!interfaceMatch) {
		throw new Error("Could not find FileRoutesByFullPath interface in routeTree.gen.ts");
	}

	const interfaceContent = interfaceMatch[1];
	const routeMatches = interfaceContent.matchAll(/'([^']+)':/g);

	// Normalise trailing slashes off non-root paths: the route-tree generator
	// emits trailing slashes for index routes ('/authors/'), and everything
	// downstream here matches on slash-free paths
	const routes: string[] = Array.from(routeMatches, match => {
		const routePath = match[1];
		return routePath.length > 1 && routePath.endsWith("/")
			? routePath.slice(0, -1)
			: routePath;
	});

	return routes.sort();
};

/**
 * Categorize routes by their testing requirements
 */
export const categorizeRoutes = (routes: readonly string[]): CategorizedRoutes => {
	const result: CategorizedRoutes = {
		static: [],
		entityIndex: [],
		entityDetail: [],
		externalId: [],
		autocomplete: [],
		skip: [],
	};

	for (const route of routes) {
		// Check if route should be skipped
		if (SKIP_PATTERNS.some((pattern) => pattern.test(route))) {
			result.skip.push(route);
			continue;
		}

		// External ID routes
		if (Object.prototype.hasOwnProperty.call(EXTERNAL_ID_ROUTES, route)) {
			result.externalId.push(route);
			continue;
		}

		// Autocomplete routes
		if (route.startsWith("/autocomplete")) {
			result.autocomplete.push(route);
			continue;
		}

		// Entity index pages (exact match)
		if (ENTITY_INDEX_PATHS.has(route)) {
			result.entityIndex.push(route);
			continue;
		}

		// Entity detail pages (contain $ parameter)
		if (route.includes("$")) {
			result.entityDetail.push(route);
			continue;
		}

		// Everything else is static
		result.static.push(route);
	}

	return result;
};

/**
 * Extract entity type from a route path
 * @example extractEntityType('/works/$') -\> 'works'
 * @example extractEntityType('/authors/$') -\> 'authors'
 */
export const extractEntityType = (route: string): EntityType | null => {
	// Match /entityType/$ or /entityType/$paramName patterns
	const match = /^\/([a-z]+)\/\$/.exec(route);
	if (match) {
		const candidate = match[1];
		return isEntityType(candidate) ? candidate : null;
	}

	// Match nested patterns like /concepts/$conceptId
	const nestedMatch = /^\/([a-z]+)\/\$[A-Za-z]+$/.exec(route);
	if (nestedMatch) {
		const candidate = nestedMatch[1];
		return isEntityType(candidate) ? candidate : null;
	}

	return null;
};

/**
 * Get external ID info for a route
 */
export const getExternalIdInfo = (route: string): { entityType: EntityType; idType: string } | null =>
	Object.prototype.hasOwnProperty.call(EXTERNAL_ID_ROUTES, route) ? EXTERNAL_ID_ROUTES[route] : null;

/**
 * Resolve a dynamic route with an actual entity ID
 * @example resolveRoute('/works/$', 'W123') -\> '/works/W123'
 * @example resolveRoute('/topics/$topicId', 'T456') -\> '/topics/T456'
 */
export const resolveRoute = (route: string, id: string): string => {
	// Replace $_ or $ with the ID
	if (route.endsWith("/$")) {
		return route.slice(0, -1) + id;
	}

	// Replace $paramName patterns
	return route.replace(/\$[A-Z]+$/i, id);
};

/**
 * Resolve an external ID route with the appropriate identifier
 * @example resolveExternalIdRoute('/authors/orcid/$orcid', '0000-0002-1234-5678')
 *          -\> '/authors/orcid/0000-0002-1234-5678'
 */
export const resolveExternalIdRoute = (route: string, externalId: string): string => route.replace(/\$[a-z]+$/, externalId);
