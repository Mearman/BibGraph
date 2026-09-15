import { EntityDetectionService } from "@bibgraph/utils";
import { logError, logger } from "@bibgraph/utils/logger";
import { IconSearch } from "@tabler/icons-react";
import {
  createLazyFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { ICON_SIZE } from "@/config/style-constants";

const ExternalIdRoute = () => {
  const { externalId } = useParams({ from: "/$externalId" });
  const navigate = useNavigate();

  useEffect(() => {
    const resolveExternalId = () => {
      try {
        // Handle double-encoded slashes first (%252F -> %2F)
        const processedId = externalId.replaceAll(/%252F/gi, '%2F');
        // Decode the parameter
        const decodedId = decodeURIComponent(processedId);

        logger.debug(
          "routing",
          `ExternalIdRoute: Starting resolution`,
          { externalId, processedId, decodedId },
          "ExternalIdRoute",
        );

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
        if (knownRoutePrefixes.includes(decodedId)) {
          // This is a known route prefix, let other routes handle it
          return;
        }

        // Handle case where externalId contains path separators due to unencoded URLs
        // e.g., "works/https:/doi.org/..." should be treated as works route with ID "https://doi.org/..."
        const entityTypePrefixes = ["authors", "works", "institutions", "sources", "funders", "publishers", "topics", "concepts"];
        for (const entityType of entityTypePrefixes) {
          if (decodedId.startsWith(`${entityType}/`)) {
            // Extract the ID part after the entity type prefix
            let extractedId = decodedId.slice(Math.max(0, entityType.length + 1));

            // Check if this is a properly formatted external canonical ID
            // If so, let the detection logic handle it instead of doing a simple redirect
            if (
              (extractedId.startsWith("https://doi.org/") ||
               extractedId.startsWith("https://doi.org/") ||
               extractedId.startsWith("https://orcid.org/") ||
               extractedId.startsWith("https://orcid.org/") ||
               extractedId.startsWith("https://ror.org/") ||
               extractedId.startsWith("https://ror.org/") ||
               extractedId.startsWith("issn:")) &&
              /^https?:\/\//i.test(extractedId) // Properly formatted with double slashes
            ) {
              // This is a properly formatted external canonical ID
              // Let the detection logic below handle it
              logger.debug(
                "routing",
                `ExternalIdRoute: Detected properly formatted external canonical ID, letting detection logic handle it`,
                { decodedId, entityType, extractedId },
                "ExternalIdRoute",
              );
              break; // Exit the for loop and let detection logic handle it
            }

            // Fix collapsed protocol slashes (https:/ -> https://)
            if (/^https?:\//i.test(extractedId) && !/^https?:\/\//i.test(extractedId)) {
              extractedId = extractedId.replace(/^(https?:\/?)/, "$1/");
            }
            if (/^ror:\//i.test(extractedId) && !/^ror:\/\//i.test(extractedId)) {
              extractedId = extractedId.replace(/^(ror:\/?)/, "$1/");
            }

            logger.debug(
              "routing",
              `ExternalIdRoute: Detected unencoded URL with entity type prefix. Redirecting to ${entityType} route`,
              { decodedId, entityType, extractedId },
              "ExternalIdRoute",
            );

            // Navigate to the correct entity route
            void navigate({
              to: `/${entityType}/${extractedId}`,
              replace: true,
            });
            return;
          }
        }

        logger.debug(
          "routing",
          `ExternalIdRoute: Processing external ID: ${decodedId}`,
          { decodedId },
          "ExternalIdRoute",
        );

        // Split ID and query parameters - the externalId might contain query params
        let idForDetection = decodedId;
        let preservedSearchParameters: Record<string, string> = {};

        // Check if the decodedId contains query parameters
        const queryIndex = decodedId.indexOf("?");
        if (queryIndex !== -1) {
          // Split the ID from query parameters
          idForDetection = decodedId.slice(0, Math.max(0, queryIndex));
          const queryString = decodedId.slice(Math.max(0, queryIndex + 1));

          // Parse query parameters
          preservedSearchParameters = {};
          const parameters = new URLSearchParams(queryString);
          parameters.forEach((value, key) => {
            preservedSearchParameters[key] = value;
          });
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
              specificRoute = `/works/${encodeURIComponent(detection.normalizedId)}`;
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

          // Use the previously extracted query parameters
          const searchObject =
            Object.keys(preservedSearchParameters).length > 0
              ? preservedSearchParameters
              : undefined;

          void navigate({
            to: specificRoute,
            search: searchObject,
            replace: true,
          });
        } else if (
          detection?.entityType &&
          (detection.detectionMethod === "OpenAlex ID" ||
            detection.detectionMethod === "OpenAlex URL")
        ) {
          // This is an OpenAlex ID, navigate to specific entity route
          const { entityType } = detection;
          const entityRoute = `/${entityType}/${detection.normalizedId}`;

          // Use the previously extracted query parameters
          const searchObject =
            Object.keys(preservedSearchParameters).length > 0
              ? preservedSearchParameters
              : undefined;

          void navigate({
            to: entityRoute,
            search: searchObject,
            replace: true,
          });
        } else {
          throw new Error(`Unable to detect entity type for: ${decodedId}`);
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
  }, [externalId, navigate]);

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

export const Route = createLazyFileRoute("/$externalId")({
  component: ExternalIdRoute,
});

export default ExternalIdRoute;
