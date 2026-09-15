import { EntityDetectionService , logger } from "@bibgraph/utils";
import {
  createLazyFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useEffect } from "react";

// Temporarily remove logger import to avoid potential issues

const parseSearchParameters = (parameters: Readonly<URLSearchParams>): Record<string, unknown> => {
  const object: Record<string, unknown> = {};
  const numericKeys = new Set(["per_page", "page", "sample"]);
  parameters.forEach((value, key) => {
    if (numericKeys.has(key)) {
      const number_ = Number(value);
      object[key] = Number.isNaN(number_) ? value : number_;
    } else {
      object[key] = value;
    }
  });
  return object;
};

const buildPathWithSearch = (path: string, parameters: Readonly<URLSearchParams>): string => {
  if (parameters.toString()) {
    return `${path}?${parameters.toString()}`;
  }
  return path;
};

const OpenAlexUrlComponent = () => {
  logger.debug("routing", "OpenAlexUrlComponent: Component function called");
  const { _splat: splat } = useParams({ from: "/openalex-url/$" });
  logger.debug("routing", "OpenAlexUrlComponent: splat parameter:", splat);
  const navigate = useNavigate();

  logger.debug("routing", "OpenAlexUrlComponent rendered with splat:", splat);

  useEffect(() => {
    logger.debug("routing", `useEffect triggered, splat: ${String(splat)}`);
    if (splat === undefined || splat === '') {
      logger.debug("routing", "No splat, returning early");
      return;
    }
    const decodedSplat = decodeURIComponent(splat);
    logger.debug("routing", `Decoded splat: ${decodedSplat}`);
    try {
      // Validate and parse the splat as a full URL
      const url = new URL(
        decodedSplat.startsWith("http")
          ? decodedSplat
          : `https://api.openalex.org/${decodedSplat}`,
      );
      logger.debug("routing", `Parsed URL: ${url.toString()}`);

      if (url.origin !== "https://api.openalex.org") {
        logger.debug("routing", `Invalid origin: ${url.origin}`);
        logger.warn("routing", `Invalid OpenAlex URL origin: ${url.origin}`);
        return;
      }

      // Extract path and query parameters
      const path = url.pathname;
      const searchParameters = new URLSearchParams(url.search);
      logger.debug(
        "routing",
        `Path: ${path}, Search params: ${JSON.stringify(Object.fromEntries(searchParameters))}`,
      );

      logger.debug(
        "routing",
        `Parsed OpenAlex URL: path=${path}, params=${JSON.stringify(Object.fromEntries(searchParameters))}`,
      );

      // Check for single entity pattern: /entityType/id or just /id
      // Don't filter empty parts yet - we need to preserve protocol slashes like https://
      const pathParts = path.split("/");
      // Remove leading empty string from absolute path
      if (pathParts[0] === "") {
        pathParts.shift();
      }

      logger.debug(
        "routing",
        `Path parts (preserving protocol slashes): ${JSON.stringify(pathParts)}, Length: ${String(pathParts.length)}`,
      );

      if (pathParts.length >= 2) {
        // Entity type is the first part, ID is everything after
        // Join with "/" to reconstruct, preserving double slashes in protocols
        const entityType = pathParts[0];
        const id = pathParts.slice(1).join("/");

        logger.debug(
          "routing",
          `Extracted entity type: ${entityType}, id: ${id}`,
        );

        // Special handling for external IDs with colons (ror:, issn:, orcid:, etc.)
        // These need to be routed to dedicated external ID routes
        const rorPattern = /^ror:([0-9a-z]{9})$/i;
        const issnPattern = /^issn:(\d{4}-\d{3}[0-9X])$/i;
        const orcidPattern = /^orcid:(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])$/i;
        const doiPattern = /^https:\/{0,2}doi\.org\/(.+)$/i;

        const rorMatch = rorPattern.exec(id);
        if (rorMatch && entityType === "institutions") {
          logger.debug(
            "routing",
            "Detected ROR ID with colon, redirecting to ror route",
            { rorId: rorMatch[1] },
            "OpenAlexUrlComponent",
          );
          // Build the path manually to avoid TanStack Router param expansion issues
          const rorPath = `/institutions/ror/${rorMatch[1]}`;
          const searchObject = parseSearchParameters(searchParameters);
          const targetPath = Object.keys(searchObject).length > 0
            ? buildPathWithSearch(rorPath, searchParameters)
            : rorPath;
          void navigate({
            to: targetPath,
            replace: true
          });
          return;
        }

        const issnMatch = issnPattern.exec(id);
        if (issnMatch && entityType === "sources") {
          logger.debug(
            "routing",
            "Detected ISSN with colon, redirecting to issn route",
            { issn: issnMatch[1] },
            "OpenAlexUrlComponent",
          );
          // Build the path manually to avoid TanStack Router param expansion issues
          const issnPath = `/sources/issn/${issnMatch[1]}`;
          const searchObject = parseSearchParameters(searchParameters);
          const targetPath = Object.keys(searchObject).length > 0
            ? buildPathWithSearch(issnPath, searchParameters)
            : issnPath;
          void navigate({
            to: targetPath,
            replace: true
          });
          return;
        }

        const orcidMatch = orcidPattern.exec(id);
        if (orcidMatch && entityType === "authors") {
          logger.debug(
            "routing",
            "Detected ORCID with colon, redirecting to orcid route",
            { orcid: orcidMatch[1] },
            "OpenAlexUrlComponent",
          );
          // Build the path manually to avoid TanStack Router param expansion issues
          const orcidPath = `/authors/orcid/${orcidMatch[1]}`;
          const searchObject = parseSearchParameters(searchParameters);
          const targetPath = Object.keys(searchObject).length > 0
            ? buildPathWithSearch(orcidPath, searchParameters)
            : orcidPath;
          void navigate({
            to: targetPath,
            replace: true
          });
          return;
        }

        const doiMatch = doiPattern.exec(id);
        if (doiMatch && entityType === "works") {
          logger.debug(
            "routing",
            "Detected DOI URL in works path, redirecting to DOI route",
            { doi: doiMatch[1] },
            "OpenAlexUrlComponent",
          );
          // Reconstruct the proper DOI URL from the match
          const doiUrl = `https://doi.org/${doiMatch[1]}`;
          // Build the path manually to avoid TanStack Router param expansion issues
          const doiPath = `/works/doi/${encodeURIComponent(doiUrl)}`;
          const searchObject = parseSearchParameters(searchParameters);
          const targetPath = Object.keys(searchObject).length > 0
            ? buildPathWithSearch(doiPath, searchParameters)
            : doiPath;
          void navigate({
            to: targetPath,
            replace: true
          });
          return;
        }

        const detection = EntityDetectionService.detectEntity(id);
        if (detection?.entityType) {
          // URL-encode the ID to handle external IDs with special characters
          // Use double-encoding for forward slashes to prevent TanStack Router from collapsing them
          // First encode normally, then encode any %2F (forward slash) again
          const encodedId = encodeURIComponent(id).replaceAll('%2F', '%252F');
          const targetPath = buildPathWithSearch(`/${detection.entityType}/${encodedId}`, searchParameters);
          void navigate({
            to: targetPath,
            replace: true,
          });
          return;
        }
      } else if (pathParts.length === 1) {
        // Handle single OpenAlex entity ID: /W2741809807
        const id = pathParts[0];
        logger.debug("routing", `Length 1, treating as ID: ${id}`);

        const detection = EntityDetectionService.detectEntity(id);
        logger.debug(
          "routing",
          `Detection for length 1 ID: ${JSON.stringify(detection)}`,
        );
        if (detection?.entityType) {
          const targetPath = buildPathWithSearch(`/${detection.entityType}/${id}`, searchParameters);
          logger.debug(
            "routing",
            `Navigating to (length 1 ID): ${targetPath} with search: ${JSON.stringify(Object.fromEntries(searchParameters))}`,
          );
          logger.debug("routing", `About to navigate for length 1 ID`);
          void navigate({
            to: targetPath,
            replace: true,
          });
          logger.debug("routing", `Navigation called for length 1 ID`);
          return;
        }
        logger.debug("routing", "No detection for length 1 ID, continuing");
      }

      // Handle autocomplete
      logger.debug(
        "routing",
        `Checking autocomplete, path starts with /autocomplete/: ${String(path.startsWith("/autocomplete/"))}`,
      );
      if (path.startsWith("/autocomplete/")) {
        const subPath = path.slice("/autocomplete/".length);
        const targetPath = buildPathWithSearch(`/autocomplete/${subPath}`, searchParameters);
        logger.debug(
          "routing",
          `Autocomplete match, navigating to: ${targetPath} with search: ${JSON.stringify(Object.fromEntries(searchParameters))}`,
        );
        logger.debug("routing", `About to navigate for autocomplete`);
        void navigate({
          to: targetPath,
          replace: true,
        });
        logger.debug("routing", `Navigation called for autocomplete`);
        return;
      }

      // Handle entity list queries, e.g., /works?filter=...
      const entityMap: Record<string, string> = {
        works: "works",
        authors: "authors",
        institutions: "institutions",
        concepts: "concepts",
        sources: "sources",
        publishers: "publishers",
        funders: "funders",
        topics: "topics",
        keywords: "keywords",
      };

      const entityType = entityMap[pathParts[0]];
      if (entityType && pathParts.length === 1) {
        const targetPath = buildPathWithSearch(`/${entityType}`, searchParameters);
        void navigate({
          to: targetPath,
          replace: true,
        });
        return;
      }
      logger.debug("routing", "No entity list match, falling to search");

      // Fallback to search for unmapped paths
      const fallbackPath = `/search?q=${encodeURIComponent(decodedSplat)}`;
      logger.debug("routing", `Fallback navigating to: ${fallbackPath}`);
      logger.debug("routing", `About to navigate for fallback search`);
      void navigate({
        to: fallbackPath,
        replace: true,
      });
      logger.debug("routing", `Navigation called for fallback search`);
    } catch (error) {
      logger.debug("routing", `Error in parsing: ${String(error)}`);
      logger.error(
        "routing",
        `Failed to parse OpenAlex URL for splat ${decodedSplat}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }, [splat, navigate]);

  if (splat === undefined || splat === '') {
    return (
      <div>
        <h1>OpenAlex URL Handler</h1>
        <p>Invalid URL</p>
      </div>
    );
  }

  const decodedSplat = decodeURIComponent(splat);

  return (
    <div>
      <h1>OpenAlex URL Handler</h1>
      <p>Processing {decodedSplat}...</p>
    </div>
  );
};

export const Route = createLazyFileRoute("/openalex-url/$")({
  component: OpenAlexUrlComponent,
});

export default OpenAlexUrlComponent;
