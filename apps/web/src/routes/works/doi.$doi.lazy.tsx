import { EntityDetectionService } from "@bibgraph/utils";
import { logError, logger } from "@bibgraph/utils/logger";
import { IconFile } from "@tabler/icons-react";
import {
  createLazyFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { ICON_SIZE } from "@/config/style-constants";

const DOIWorkRoute = () => {
  const { doi } = useParams({ from: "/works/doi/$doi" });
  const navigate = useNavigate();

  useEffect(() => {
    const resolveDOI = () => {
      try {
        // Decode the DOI parameter (may have been URL encoded)
        const decodedDOI = decodeURIComponent(doi);

        // Detect and normalize the DOI
        const detection = EntityDetectionService.detectEntity(decodedDOI);

        if (
          detection?.entityType === "works" &&
          detection.detectionMethod === "DOI"
        ) {
          // Redirect to standard works route with normalized DOI
          void navigate({
            to: `/works/${detection.normalizedId}`,
            replace: true,
          });
        } else {
          throw new Error(`Invalid DOI format: ${decodedDOI}`);
        }
      } catch (error) {
        logError(
          logger,
          "Failed to resolve DOI",
          error,
          "DOIWorkRoute",
          "routing",
        );
        // Navigate to search with the DOI as query
        void navigate({
          to: "/search",
          search: { q: doi, filter: undefined, search: undefined },
          replace: true,
        });
      }
    };

    resolveDOI();
  }, [doi, navigate]);

  return (
    <div
      style={{
        padding: "40px 20px",
        textAlign: "center",
        fontSize: "16px",
      }}
    >
      <div style={{ marginBottom: "20px", fontSize: "18px" }}>
        <IconFile size={ICON_SIZE.LG} style={{ display: "inline", marginRight: "8px" }} />
        Resolving DOI...
      </div>
      <div
        style={{
          fontFamily: "monospace",
          backgroundColor: "var(--mantine-color-gray-1)",
          padding: "10px",
          borderRadius: "4px",
        }}
      >
        {decodeURIComponent(doi)}
      </div>
    </div>
  );
};

export const Route = createLazyFileRoute("/works/doi/$doi")({
  component: DOIWorkRoute,
});

export default DOIWorkRoute;
