import { EntityDetectionService } from "@bibgraph/utils";
import { logError, logger } from "@bibgraph/utils/logger";
import { IconSearch } from "@tabler/icons-react";
import {
  createLazyFileRoute,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { ICON_SIZE } from "@/config/style-constants";

const buildQueryString = (parameters: Readonly<Record<string, string>>): string => {
  return Object.entries(parameters)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
};

const updateUrlWithSearchParameters = (preservedSearchParameters: Readonly<Record<string, string>>): void => {
  // After navigation completes, update the URL with unencoded query parameters
  if (Object.keys(preservedSearchParameters).length > 0) {
    const queryString = buildQueryString(preservedSearchParameters);
    const fullUrl = `${window.location.pathname}${window.location.hash.split("?", 1)[0]}?${queryString}`;
    window.history.replaceState(null, "", fullUrl);
  }
};

const isPrettyUrlUpdateState = (value: unknown): value is { __prettyUrlUpdate: true } => {
  if (typeof value !== "object" || value === null) return false;
  return "__prettyUrlUpdate" in value && value.__prettyUrlUpdate === true;
};

const ExternalIdRoute = () => {
  const { _splat: splat } = useParams({ from: "/$_" });
  const externalId = splat ?? "";
  const routeSearch = useSearch({ from: "/$_" });
  const navigate = useNavigate();
  // Serialize routeSearch to avoid infinite loop from object reference changes
  const routeSearchKey = JSON.stringify(routeSearch);
  // Keep a stable ref to the latest routeSearch so the effect below can read fresh data without needing routeSearch itself (whose object identity changes every render) in its own dependency array -- refs are exempt from exhaustive-deps.
  const routeSearchRef = useRef(routeSearch);
  routeSearchRef.current = routeSearch;

  useEffect(() => {
    const resolveExternalId = () => {
      try {
        // Check if this is a pretty URL update from usePrettyUrl hook If so, skip processing as the URL is already correctly routed
        if (isPrettyUrlUpdateState(window.history.state)) {
          logger.debug(
            "routing",
            "Skipping external ID resolution - this is a display-only pretty URL update",
            { externalId },
            "ExternalIdRoute",
          );
          return;
        }

        // Handle double-encoded slashes first (%252F -> %2F)
        const processedId = externalId.replaceAll(/%252F/gi, '%2F');
        // Decode the parameter
        let decodedId = decodeURIComponent(processedId);

        // Fix collapsed double slashes in protocol (https:/ -> https://)
        // This happens when URLs like https://api.openalex.org are used as route params
        // and the router normalizes consecutive slashes
        if (
          /^https?:\//i.test(decodedId) &&
          !/^https?:\/\//i.test(decodedId)
        ) {
          decodedId = decodedId.replace(/^(https?:\/?)/, "$1/");
          logger.debug(
            "routing",
            "Fixed collapsed protocol slashes in external ID",
            { original: externalId, fixed: decodedId },
            "ExternalIdRoute",
          );
        }

        // Check if this is a full OpenAlex API URL that should be redirected
        // e.g., https://api.openalex.org/autocomplete/works?filter=...
        const openAlexApiPattern = /^https?:\/\/api\.openalex\.org\/(.+)$/i;
        const apiMatch = openAlexApiPattern.exec(decodedId);
        if (apiMatch) {
          const cleanPath = apiMatch[1];

          // Check if this path contains external IDs (like ror:, orcid:, etc.)
          // If so, let it fall through to entity detection logic instead of doing simple redirect
          const hasExternalId = cleanPath.includes(':');

          if (hasExternalId) {
            // This URL contains external IDs (like ror:), let it fall through to entity detection
            logger.debug(
              "routing",
              "OpenAlex API URL contains external IDs, falling through to entity detection",
              { original: decodedId, cleanPath },
              "ExternalIdRoute",
            );
          } else {
            logger.debug(
              "routing",
              "Detected OpenAlex API URL in catch-all, redirecting",
              { original: decodedId, cleanPath },
              "ExternalIdRoute",
            );

            // Preserve query params from routeSearch
            const queryParameters =
              typeof routeSearchRef.current === "object"
                ? Object.entries(routeSearchRef.current)
                    .map(([key, value]) => `${key}=${String(value)}`)
                    .join("&")
                : "";

            // Properly concatenate query parameters
            const hasExistingParameters = cleanPath.includes("?");
            const newUrl = queryParameters
              ? (hasExistingParameters
                ? `/${cleanPath}&${queryParameters}`
                : `/${cleanPath}?${queryParameters}`)
              : `/${cleanPath}`;
            window.location.replace(`#${newUrl}`);
            return;
          }
        }

        // Skip known route prefixes that should be handled by other routes
        const knownRoutePrefixes = [
          "openalex-url",
          "api",
          "autocomplete",
          "authors",
          "works",
          "institutions",
          "sources",
          "funders",
          "publishers",
          "topics",
          "concepts",
          "about",
          "browse",
          "cache",
          "error-test",
          "evaluation",
          "explore",
          "search",
        ];
        // Handle case where decodedId contains path separators due to unencoded URLs
        // e.g., "works/https:/doi.org/..." should be treated as works route with ID "https://doi.org/..."
        const entityTypePrefixes = ["authors", "works", "institutions", "sources", "funders", "publishers", "topics", "concepts"];
        for (const entityType of entityTypePrefixes) {
          if (decodedId.startsWith(`${entityType}/`)) {
            // Extract the ID part after the entity type prefix
            let extractedId = decodedId.slice(Math.max(0, entityType.length + 1));

            // Fix collapsed protocol slashes (https:/ -> https://)
            if (/^https?:\//i.test(extractedId) && !/^https?:\/\//i.test(extractedId)) {
              extractedId = extractedId.replace(/^(https?:\/?)/, "$1/");
            }
            if (/^ror:\//i.test(extractedId) && !/^ror:\/\//i.test(extractedId)) {
              extractedId = extractedId.replace(/^(ror:\/?)/, "$1/");
            }

            logger.debug(
              "routing",
              `Splat route: Detected unencoded URL with entity type prefix. Redirecting to ${entityType} route`,
              { decodedId, entityType, extractedId },
              "ExternalIdRoute",
            );

            // Navigate to the correct entity route with properly encoded ID
            // This prevents TanStack Router from treating slashes in the ID as path separators
            void navigate({
              to: `/${entityType}/${encodeURIComponent(extractedId)}`,
              replace: true,
            });
            return;
          }
        }

        // Also check if the decodedId exactly matches a known route prefix (without trailing path)
        if (knownRoutePrefixes.includes(decodedId)) {
          // This is a known route prefix, let other routes handle it
          return;
        }

        logger.debug(
          "routing",
          `ExternalIdRoute: Processing external ID: ${decodedId}`,
          { decodedId, routeSearch: routeSearchRef.current },
          "ExternalIdRoute",
        );

        // Split ID and query parameters - the externalId might contain query params
        let idForDetection = decodedId;
        let preservedSearchParameters: Record<string, string> = {};

        // First, check if there are search params in the route itself (from TanStack Router)
        // This handles cases like /#/https://api.openalex.org/authors/A5023888391?select=id
        if (typeof routeSearchRef.current === "object") {
          preservedSearchParameters = { ...routeSearchRef.current };
        }

        // Check if the decodedId contains query parameters
        const queryIndex = decodedId.indexOf("?");
        if (queryIndex !== -1) {
          // Split the ID from query parameters
          idForDetection = decodedId.slice(0, Math.max(0, queryIndex));
          const queryString = decodedId.slice(Math.max(0, queryIndex + 1));

          // Parse query parameters and merge with route search params
          const parameters = new URLSearchParams(queryString);
          parameters.forEach((value, key) => {
            preservedSearchParameters[key] = value;
          });
        }

        // Basic validation: reject obviously invalid IDs early
        if (!idForDetection || idForDetection.trim().length === 0) {
          logger.warn(
            "routing",
            "Empty or invalid ID provided, redirecting to search",
            { decodedId },
            "ExternalIdRoute",
          );

          void navigate({
            to: "/search",
            search: { q: "", filter: undefined, search: undefined },
            replace: true,
          });
          return;
        }

        // Reject obviously invalid patterns
        const invalidPatterns = [
          /^[^!#$%&'(\-\w./:?~@[\])*+,;=]+$/, // Contains invalid URL characters
          /^\s+$/, // Only whitespace
          /^(data:|javascript:|vbscript:)/i, // Dangerous protocols
        ];

        if (invalidPatterns.some(pattern => pattern.test(idForDetection))) {
          logger.warn(
            "routing",
            "Invalid ID pattern detected, redirecting to search",
            { idForDetection },
            "ExternalIdRoute",
          );

          void navigate({
            to: "/search",
            search: { q: idForDetection, filter: undefined, search: undefined },
            replace: true,
          });
          return;
        }

        // Clean up OpenAlex API URLs to match detection patterns
        // Convert: https://api.openalex.org/authors/A5023888391 -> https://api.openalex.org/A5023888391
        // The API uses REST-style paths but the entity detection expects the ID directly after openalex.org
        const apiPathMatch = /^(https?:\/\/(?:api\.)?openalex\.org)\/(?:authors|concepts|funders|institutions|publishers|sources|topics|works)\/([ACFIKPQSTW]\d+)$/i.exec(idForDetection);
        if (apiPathMatch) {
          idForDetection = `${apiPathMatch[1]}/${apiPathMatch[2]}`;
          logger.debug(
            "routing",
            "Cleaned OpenAlex API URL path",
            { original: decodedId, cleaned: idForDetection },
            "ExternalIdRoute",
          );
        }

        // Clean up OpenAlex API URLs with external IDs (ROR, ORCID, etc.)
        // Convert: https://api.openalex.org/institutions/ror:02y3ad647 -> ror:02y3ad647
        const externalIdApiPathMatch = /^https?:\/\/(?:api\.)?openalex\.org\/(?:authors|concepts|funders|institutions|publishers|sources|topics|works)\/(.+)$/i.exec(idForDetection);
        if (externalIdApiPathMatch) {
          idForDetection = externalIdApiPathMatch[1];
          logger.debug(
            "routing",
            "Cleaned OpenAlex API URL with external ID",
            { original: decodedId, cleaned: idForDetection },
            "ExternalIdRoute",
          );
        }

        // Detect entity type and ID type
        const detection = EntityDetectionService.detectEntity(idForDetection);

        if (
          detection?.entityType &&
          detection.detectionMethod !== "OpenAlex ID" &&
          detection.detectionMethod !== "OpenAlex URL"
        ) {
          // This is a recognized external ID, redirect to specific route
          let specificRoute: string;

          switch (detection.detectionMethod) {
            case "DOI":
              specificRoute = `/works/doi/${encodeURIComponent(detection.normalizedId)}`;
              break;
            case "ORCID":
              specificRoute = `/authors/orcid/${detection.normalizedId}`;
              break;
            case "ROR": {
              // Extract raw ROR ID from normalized URL for the route
              // normalizedId is like "https://ror.org/02y3ad647" but route expects "02y3ad647"
              const rorIdMatch = /ror\.org\/([0-9a-z]{9})$/i.exec(detection.normalizedId);
              const rorIdForRoute = rorIdMatch ? rorIdMatch[1] : detection.normalizedId;
              specificRoute = `/institutions/ror/${rorIdForRoute}`;
              break;
            }
            case "ISSN":
              specificRoute = `/sources/issn/${detection.normalizedId}`;
              break;
            default:
              throw new Error(
                `Unsupported detection method: ${detection.detectionMethod}`,
              );
          }

          // Navigate to the route first
          void navigate({
            to: specificRoute,
            replace: true,
          }).then(() => { updateUrlWithSearchParameters(preservedSearchParameters); return undefined; });
        } else if (
          detection?.entityType &&
          (detection.detectionMethod === "OpenAlex ID" ||
            detection.detectionMethod === "OpenAlex URL")
        ) {
          // This is an OpenAlex ID, navigate to specific entity route
          const { entityType } = detection;
          const entityRoute = `/${entityType}/${detection.normalizedId}`;

          // Navigate to the route first
          void navigate({
            to: entityRoute,
            replace: true,
          }).then(() => { updateUrlWithSearchParameters(preservedSearchParameters); return undefined; });
        } else {
          // Instead of throwing, immediately redirect to search
          logger.warn(
            "routing",
            "Unable to detect entity type, redirecting to search",
            { decodedId, idForDetection, detection },
            "ExternalIdRoute",
          );

          // Immediate fallback to search without throwing
          void navigate({
            to: "/search",
            search: { q: decodedId, filter: undefined, search: undefined },
            replace: true,
          });
          return;
        }
      } catch (error) {
        logError(
          logger,
          "Failed to resolve external ID:",
          error,
          "ExternalIdRoute",
          "routing",
        );

        // Fallback to search
        void navigate({
          to: "/search",
          search: { q: externalId, filter: undefined, search: undefined },
          replace: true,
        });
      }
    };

    resolveExternalId();
  }, [externalId, routeSearchKey, navigate]);

  return (
    <div
      style={{
        padding: "40px 20px",
        textAlign: "center",
        fontSize: "16px",
      }}
    >
      <div style={{ marginBottom: "20px", fontSize: "18px" }}>
        <IconSearch
          size={ICON_SIZE.LG}
          style={{ display: "inline", marginRight: "8px" }}
        />
        Resolving identifier...
      </div>
      <div
        style={{
          fontFamily: "monospace",
          backgroundColor: "var(--mantine-color-gray-1)",
          padding: "10px",
          borderRadius: "4px",
        }}
      >
        {decodeURIComponent(externalId)}
      </div>
      <div style={{ marginTop: "20px", fontSize: "14px", color: "var(--mantine-color-dimmed)" }}>
        Detecting entity type and loading data
      </div>
    </div>
  );
};

export const Route = createLazyFileRoute("/$_")({
  component: ExternalIdRoute,
});

export default ExternalIdRoute;
