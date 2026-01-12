import { cachedOpenAlex } from "@bibgraph/client";
import { type Keyword, type KeywordField } from "@bibgraph/types";
import { useQuery } from "@tanstack/react-query";
import { createLazyFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";

import { type DetailViewMode,EntityDetailLayout } from "@/components/entity-detail/EntityDetailLayout";
import { ENTITY_TYPE_CONFIGS } from "@/components/entity-detail/EntityTypeConfig";
import { ErrorState } from "@/components/entity-detail/ErrorState";
import { LoadingState } from "@/components/entity-detail/LoadingState";
import { IncomingRelationships } from "@/components/relationship/IncomingRelationships";
import { OutgoingRelationships } from "@/components/relationship/OutgoingRelationships";
import { RelationshipCounts } from "@/components/relationship/RelationshipCounts";
import { useEntityRelationshipQueries } from '@/hooks/use-entity-relationship-queries';
import { decodeEntityId } from "@/utils/url-decoding";

const KeywordRoute = () => {
  const { keywordId: rawKeywordId } = useParams({ from: "/keywords/$keywordId" });
  const { select: selectParam } = useSearch({ from: "/keywords/$keywordId" });
  const [viewMode, setViewMode] = useState<DetailViewMode>("rich");

  // Decode the keyword ID in case it's URL-encoded (for external IDs with special characters)
  const keywordId = decodeEntityId(rawKeywordId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as KeywordField[]
    : undefined;

  // Fetch keyword data
  const { data: keyword, isLoading, error} = useQuery({
    queryKey: ["keyword", keywordId, selectParam, selectFields],
    queryFn: async () => {
      if (!keywordId) {
        throw new Error("Keyword ID is required");
      }
      const response = await cachedOpenAlex.client.keywords.getKeyword(
        keywordId,
        selectFields ? { select: selectFields } : {}
      );
      return response as Keyword;
    },
    enabled: !!keywordId && keywordId !== "random",
  });

  // Get relationship counts for summary display - MUST be called before early returns (Rules of Hooks)
  const { incomingCount, outgoingCount } = useEntityRelationshipQueries(
    keywordId || "",
    'keywords'
  );

  // Handle loading state
  if (isLoading) {
    return <LoadingState entityType="Keyword" entityId={keywordId || ''} config={ENTITY_TYPE_CONFIGS.keywords} />;
  }

  // Handle error state
  if (error || !keyword) {
    return (
      <ErrorState
        error={error}
        entityType="Keyword"
        entityId={keywordId || ''}
      />
    );
  }

  // Render main content with EntityDetailLayout
  return (
    <EntityDetailLayout
      config={ENTITY_TYPE_CONFIGS.keywords}
      entityType="keywords"
      entityId={keywordId || ''}
      displayName={keyword.display_name || "Keyword"}
      selectParam={typeof selectParam === 'string' ? selectParam : undefined}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      data={keyword}>
      <RelationshipCounts incomingCount={incomingCount} outgoingCount={outgoingCount} />
      <IncomingRelationships entityId={keywordId || ""} entityType="keywords" />
      <OutgoingRelationships entityId={keywordId || ""} entityType="keywords" />
    </EntityDetailLayout>
  );
};

export const Route = createLazyFileRoute("/keywords/$keywordId")({
  component: KeywordRoute,
});

export default KeywordRoute;
