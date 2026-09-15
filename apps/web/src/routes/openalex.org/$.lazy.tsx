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


const OpenAlexRoute = () => {
  const { _splat } = useParams({ from: "/openalex/org/$" });
  const navigate = useNavigate();

  useEffect(() => {
    const resolveOpenAlexUrl = () => {
      try {
        if (_splat === undefined || _splat === "") {
          throw new Error("No URL path provided");
        }

        const fullUrl = `https://openalex.org/${_splat}`;
        const detection = EntityDetectionService.detectEntity(fullUrl);

        if (
          detection?.entityType &&
          detection.detectionMethod.includes("OpenAlex")
        ) {
          const entityRoute = `/${detection.entityType}/${detection.normalizedId}`;

          // Check if the original URL had query parameters and preserve them
          const urlObject = new URL(fullUrl);
          const searchObject: Record<string, string> = {};
          urlObject.searchParams.forEach((value, key) => {
            searchObject[key] = value;
          });

          void navigate({
            to: entityRoute,
            search: Object.keys(searchObject).length > 0 ? searchObject : undefined,
            replace: true,
          });
        } else {
          void navigate({
            to: `/${encodeURIComponent(fullUrl)}`,
            replace: true,
          });
        }
      } catch (error) {
        logError(
          logger,
          "Failed to resolve OpenAlex URL:",
          error,
          "OpenAlexRoute",
          "routing",
        );
        void navigate({
          to: "/search",
          search: { q: _splat ?? "", filter: undefined, search: undefined },
          replace: true,
        });
      }
    };

    resolveOpenAlexUrl();
  }, [_splat, navigate]);

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
        Resolving OpenAlex URL...
      </div>
      <div
        style={{
          fontFamily: "monospace",
          backgroundColor: "var(--mantine-color-gray-1)",
          padding: "10px",
          borderRadius: "4px",
        }}
      >
        openalex.org/{decodeURIComponent(_splat ?? "")}
      </div>
      <div style={{ marginTop: "20px", fontSize: "14px", color: "var(--mantine-color-dimmed)" }}>
        Detecting entity type and redirecting
      </div>
    </div>
  );
};
export const Route = createLazyFileRoute("/openalex/org/$")({
  component: OpenAlexRoute,
});

export default OpenAlexRoute;
