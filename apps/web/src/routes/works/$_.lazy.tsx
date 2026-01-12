import { cachedOpenAlex } from "@bibgraph/client";
import { type Work, type WorkField } from "@bibgraph/types";
import { EntityDetectionService } from "@bibgraph/utils";
import { logger } from "@bibgraph/utils/logger";
import { useQuery } from "@tanstack/react-query";
import { createLazyFileRoute,useParams, useSearch  } from "@tanstack/react-router";
import { useEffect,useState } from "react";

import { type DetailViewMode, EntityDetailLayout, ErrorState, LoadingState } from "@/components/entity-detail";
import { ENTITY_TYPE_CONFIGS } from "@/components/entity-detail/EntityTypeConfig";
import { PdfViewer } from "@/components/pdf";
import { IncomingRelationships } from "@/components/relationship/IncomingRelationships";
import { OutgoingRelationships } from "@/components/relationship/OutgoingRelationships";
import { RelationshipCounts } from "@/components/relationship/RelationshipCounts";
import { useEntityRelationshipQueries } from '@/hooks/use-entity-relationship-queries';
import { usePdfUrl } from "@/hooks/use-pdf-url";
import { usePrettyUrl } from "@/hooks/use-pretty-url";
import { useUrlNormalization } from "@/hooks/use-url-normalization";
import { decodeEntityId } from "@/utils/url-decoding";

const WorkRoute = () => {
  const { _splat: rawWorkId } = useParams({ from: "/works/$_" });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<DetailViewMode>("rich");

  // Fix browser address bar display issues with collapsed protocol slashes
  useUrlNormalization();

  // Extract work ID from URL - prefer the router parameter, but fall back to hash extraction
  // For hash routing with URLs containing slashes (like DOIs), we need to reconstruct the full ID
  const getWorkIdFromHash = () => {
    if (typeof window !== 'undefined') {
      // First strip query parameters from the hash, then extract the entity ID
      const hashWithoutQuery = window.location.hash.split('?')[0];
      const hashParts = hashWithoutQuery.split('/');
      return hashParts.length >= 3 ? hashParts.slice(2).join('/') : '';
    }
    return '';
  };

  const workId = rawWorkId || getWorkIdFromHash();
  const decodedWorkId = decodeEntityId(workId);

  // Handle external canonical IDs (DOIs, ORCID, etc.)
  const [normalizedWorkId, setNormalizedWorkId] = useState<string | null>(null);
  const [isProcessingExternalId, setIsProcessingExternalId] = useState(false);
  const [externalIdError, setExternalIdError] = useState<string | null>(null);

  useEffect(() => {
    const processExternalId = async () => {
      if (!decodedWorkId) return;

      // Check if this is an external canonical ID that needs processing
      if (/^https?:\/\//i.test(decodedWorkId) ||
          /^doi:/i.test(decodedWorkId) ||
          /^orcid:/i.test(decodedWorkId) ||
          /^ror:/i.test(decodedWorkId) ||
          /^pmid:/i.test(decodedWorkId)) {

        setIsProcessingExternalId(true);
        setExternalIdError(null);

        try {
          logger.debug("routing", "Processing external work ID", {
            workId: decodedWorkId
          }, "WorkRoute");

          const detection = EntityDetectionService.detectEntity(decodedWorkId);

          if (detection?.entityType === "works" && detection?.normalizedId) {
            logger.debug("routing", "Successfully detected work entity", {
              original: decodedWorkId,
              normalized: detection.normalizedId,
              detectionMethod: detection.detectionMethod
            }, "WorkRoute");

            setNormalizedWorkId(detection.normalizedId);
          } else {
            const errorMsg = `Invalid work ID format: ${decodedWorkId}`;
            logger.error("routing", "Failed to detect work entity", {
              workId: decodedWorkId,
              detection
            }, "WorkRoute");
            setExternalIdError(errorMsg);
          }
        } catch (error) {
          const errorMsg = `Error processing work ID: ${decodedWorkId}`;
          logger.error("routing", "Error processing external work ID", {
            workId: decodedWorkId,
            error
          }, "WorkRoute");
          setExternalIdError(errorMsg);
        } finally {
          setIsProcessingExternalId(false);
        }
      } else {
        // This is already a normalized OpenAlex ID
        setNormalizedWorkId(decodedWorkId);
      }
    };

    processExternalId();
  }, [decodedWorkId]);

  // Update URL with pretty display version if needed
  // Use the extracted workId since rawWorkId from TanStack Router doesn't work with hash routing
  usePrettyUrl("works", workId, decodedWorkId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as WorkField[]
    : undefined;

  // Fetch work data using normalized ID
  const { data: work, isLoading, error } = useQuery({
    queryKey: ["work", normalizedWorkId, selectParam, selectFields],
    queryFn: async () => {
      if (!normalizedWorkId) {
        throw new Error("Work ID is required");
      }
      const response = await cachedOpenAlex.client.works.getWork(
        normalizedWorkId,
        selectFields ? { select: selectFields } : {}
      );
      return response as Work;
    },
    enabled: !!normalizedWorkId && normalizedWorkId !== "random" && !isProcessingExternalId,
  });

  // Get relationship counts for summary display - MUST be called before early returns (Rules of Hooks)
  const { incomingCount, outgoingCount } = useEntityRelationshipQueries(
    normalizedWorkId || '',
    'works'
  );

  // Get PDF URL from OpenAlex or Unpaywall - MUST be called before early returns (Rules of Hooks)
  const pdfResult = usePdfUrl(work as Work | null | undefined, {
    skip: !work,
  });

  const config = ENTITY_TYPE_CONFIGS.works;

  // Show processing state for external canonical IDs
  if (isProcessingExternalId) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          fontSize: "16px",
        }}
      >
        <div style={{ marginBottom: "20px", fontSize: "18px" }}>
          Processing Work ID
        </div>
        <div
          style={{
            fontFamily: "monospace",
            backgroundColor: "var(--mantine-color-gray-1)",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "20px",
            wordBreak: "break-all",
          }}
        >
          {decodedWorkId}
        </div>
        <div style={{ fontSize: "14px", color: "var(--mantine-color-dimmed)" }}>
          Detecting entity type and resolving to OpenAlex ID
        </div>
      </div>
    );
  }

  // Show error for external ID processing failures
  if (externalIdError) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          fontSize: "16px",
        }}
      >
        <div style={{ marginBottom: "20px", fontSize: "18px", color: "var(--mantine-color-red-6)" }}>
          Error Processing Work ID
        </div>
        <div
          style={{
            fontFamily: "monospace",
            backgroundColor: "rgba(var(--mantine-color-red-6-rgb), 0.1)",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "20px",
            border: "1px solid rgba(var(--mantine-color-red-6-rgb), 0.3)",
            wordBreak: "break-all",
          }}
        >
          {decodedWorkId}
        </div>
        <div style={{ fontSize: "14px", color: "var(--mantine-color-red-6)", marginBottom: "20px" }}>
          {externalIdError}
        </div>
        <div style={{ fontSize: "12px", color: "var(--mantine-color-dimmed)" }}>
          Please check the work ID format and try again.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState entityType="Work" entityId={decodedWorkId || ''} config={config} />;
  }

  if (error) {
    return <ErrorState entityType="Work" entityId={decodedWorkId || ''} error={error} />;
  }

  if (!work || !normalizedWorkId) {
    return null;
  }

  return (
    <EntityDetailLayout
      config={config}
      entityType="works"
      entityId={normalizedWorkId}
      displayName={work.display_name || work.title || "Work"}
      selectParam={(selectParam as string) || ''}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      data={work as Record<string, unknown>}
    >
      {/* PDF Viewer - show when PDF is available or loading */}
      {(pdfResult.pdfUrl || pdfResult.isLoading || pdfResult.error) && (
        <PdfViewer
          pdfUrl={pdfResult.pdfUrl}
          isLoading={pdfResult.isLoading}
          title={work.display_name || work.title || "PDF Document"}
          error={pdfResult.error}
          source={pdfResult.source ?? undefined}
          defaultCollapsed={false}
        />
      )}
      <RelationshipCounts incomingCount={incomingCount} outgoingCount={outgoingCount} />
      <IncomingRelationships entityId={normalizedWorkId} entityType="works" />
      <OutgoingRelationships entityId={normalizedWorkId} entityType="works" />
    </EntityDetailLayout>
  );
};

export const Route = createLazyFileRoute("/works/$_")({
  component: WorkRoute,
});

export default WorkRoute;
