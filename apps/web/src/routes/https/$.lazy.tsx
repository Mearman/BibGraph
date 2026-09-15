import { EntityDetectionService } from "@bibgraph/utils";
import { logError, logger } from "@bibgraph/utils/logger";
import { IconSearch } from "@tabler/icons-react";
import {
  createLazyFileRoute,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { ICON_SIZE } from "@/config/style-constants";

/**
 * Parse query parameters from a URL string
 * @param urlString - Full URL string with potential query parameters
 * @returns Object with path and search params
 */
const parseUrlPathAndSearch = (urlString: string): {
  path: string;
  search: Record<string, string | number>;
} => {
  try {
    const url = new URL(urlString);
    const search: Record<string, string | number> = {};
    const numericKeys = new Set(["per_page", "page", "sample", "seed"]);

    url.searchParams.forEach((value, key) => {
      if (numericKeys.has(key)) {
        const number_ = Number(value);
        search[key] = Number.isNaN(number_) ? value : number_;
      } else {
        search[key] = value;
      }
    });

    return { path: url.pathname, search };
  } catch {
    // If URL parsing fails, return empty
    return { path: "", search: {} };
  }
};

const HttpsRoute = () => {
  const { _splat: splat } = useParams({ from: "/https/$" });
  const externalId = splat ?? "";
  const routeSearch = useSearch({ from: "/https/$" });
  const navigate = useNavigate();

  useEffect(() => {
    const resolveExternalId = () => {
      try {
        // Decode the parameter
        let decodedId = decodeURIComponent(externalId);

        // Fix collapsed double slashes in protocol (https:/ -> https://)
        if (
          /^https?:\//i.test(decodedId) &&
          !/^https?:\/\//i.test(decodedId)
        ) {
          decodedId = decodedId.replace(/^(https?:\/?)/, "$1/");
          logger.debug(
            "routing",
            "Fixed collapsed protocol slashes in external ID",
            { original: externalId, fixed: decodedId },
            "HttpsRoute",
          );
        }

        // Check if this is a full URL that should be handled
        if (/^https?:\/\//i.test(decodedId)) {
          // Parse the URL to extract query parameters
          const { search: urlSearch } = parseUrlPathAndSearch(decodedId);

          // Try to detect entity type and normalize ID
          const detection = EntityDetectionService.detectEntity(decodedId);
          if (detection?.entityType && detection.normalizedId) {
            logger.debug(
              "routing",
              "Detected entity from https URL, navigating",
              {
                externalId: decodedId,
                entityType: detection.entityType,
                normalizedId: detection.normalizedId,
                search: urlSearch
              },
              "HttpsRoute",
            );

            // Merge URL search params with route search params
            const mergedSearch = { ...urlSearch, ...routeSearch };

            // Navigate to the proper entity route with encoded ID and search params
            void navigate({
              to: `/${detection.entityType}/${encodeURIComponent(detection.normalizedId)}`,
              search: mergedSearch,
              replace: true,
            });
            return;
          }
        }

        // If nothing worked, show error
        logger.error(
          "routing",
          "Could not resolve https URL",
          { externalId: decodedId },
          "HttpsRoute",
        );
      } catch (error) {
        logError(
          logger,
          "Error resolving https URL",
          error,
          "HttpsRoute",
          "routing",
        );
      }
    };

    if (externalId) {
      resolveExternalId();
    }
  }, [externalId, navigate, routeSearch]);

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
          style={{ marginRight: "8px", verticalAlign: "middle" }}
        />
        Processing HTTPS URL
      </div>
      <div style={{ marginBottom: "20px" }}>
        https://{decodeURIComponent(externalId)}
      </div>
      <div style={{ marginTop: "20px", fontSize: "14px", color: "var(--mantine-color-dimmed)" }}>
        Detecting entity type and redirecting
      </div>
    </div>
  );
};

export const Route = createLazyFileRoute("/https/$")({
  component: HttpsRoute,
});

export default HttpsRoute;
