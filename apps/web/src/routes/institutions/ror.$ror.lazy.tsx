import { EntityDetectionService } from "@bibgraph/utils";
import { logError, logger } from "@bibgraph/utils/logger";
import { IconBuilding } from "@tabler/icons-react";
import {
  createLazyFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { ICON_SIZE } from "@/config/style-constants";

const RORInstitutionRoute = () => {
  const { ror } = useParams({ from: "/institutions/ror/$ror" });
  const navigate = useNavigate();

  useEffect(() => {
    const resolveROR = () => {
      try {
        // Decode the ROR parameter
        const decodedROR = decodeURIComponent(ror);

        // Add ror: prefix if not present for EntityDetectionService
        const rorWithPrefix = decodedROR.startsWith('ror:') ? decodedROR : `ror:${decodedROR}`;

        // Detect and normalize the ROR ID
        const detection = EntityDetectionService.detectEntity(rorWithPrefix);

        if (
          detection?.entityType === "institutions" &&
          detection.detectionMethod.toLowerCase().includes("ror")
        ) {
          // Redirect to standard institutions route with normalized ROR
          void navigate({
            to: `/institutions/${detection.normalizedId}`,
            replace: true,
          });
        } else {
          throw new Error(`Invalid ROR ID format: ${decodedROR}`);
        }
      } catch (error) {
        logError(
          logger,
          "Failed to resolve ROR ID",
          error,
          "RORInstitutionRoute",
          "routing",
        );
        // Navigate to search with the ROR ID as query
        void navigate({
          to: "/search",
          search: { q: ror, filter: undefined, search: undefined },
          replace: true,
        });
      }
    };

    resolveROR();
  }, [ror, navigate]);

  return (
    <div
      style={{
        padding: "40px 20px",
        textAlign: "center",
        fontSize: "16px",
      }}
    >
      <div style={{ marginBottom: "20px", fontSize: "18px" }}>
        <IconBuilding
          size={ICON_SIZE.LG}
          style={{ display: "inline", marginRight: "8px" }}
        />
        Resolving ROR ID...
      </div>
      <div
        style={{
          fontFamily: "monospace",
          backgroundColor: "var(--mantine-color-gray-1)",
          padding: "10px",
          borderRadius: "4px",
        }}
      >
        {decodeURIComponent(ror)}
      </div>
    </div>
  );
};

export const Route = createLazyFileRoute("/institutions/ror/$ror")({
  component: RORInstitutionRoute,
});

export default RORInstitutionRoute;
