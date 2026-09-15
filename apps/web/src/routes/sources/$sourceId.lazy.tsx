import { cachedOpenAlex } from "@bibgraph/client";
import { useQuery } from "@tanstack/react-query";
import { createLazyFileRoute,useParams, useSearch  } from "@tanstack/react-router";
import { useState } from "react";

import { type DetailViewMode, EntityDetailLayout, ErrorState, LoadingState, PublicationTimeline, RelatedEntitiesSection } from "@/components/entity-detail";
import { ENTITY_TYPE_CONFIGS } from "@/components/entity-detail/EntityTypeConfig";
import { IncomingRelationships } from "@/components/relationship/IncomingRelationships";
import { OutgoingRelationships } from "@/components/relationship/OutgoingRelationships";
import { RelationshipCounts } from "@/components/relationship/RelationshipCounts";
import { useEntityRelationshipQueries } from '@/hooks/use-entity-relationship-queries';
import { usePrettyUrl } from "@/hooks/use-pretty-url";
import { decodeEntityId } from "@/utils/url-decoding";

const SourceRoute = () => {
  const { sourceId: rawSourceId } = useParams({ strict: false });
  const { select: selectParameter } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<DetailViewMode>("rich");

  // Decode the source ID in case it's URL-encoded (for external IDs with special characters)
  const sourceId = decodeEntityId(rawSourceId);
  usePrettyUrl("sources", rawSourceId, sourceId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectParamString = typeof selectParameter === 'string' ? selectParameter : '';
  const selectFields = selectParamString !== ''
    ? selectParamString.split(',').map(field => field.trim())
    : undefined;

  // Fetch source data
  const { data: source, isLoading, error } = useQuery({
    queryKey: ["source", sourceId, selectParameter, selectFields],
    queryFn: async () => {
      if (sourceId === undefined || sourceId === '') {
        throw new Error("Source ID is required");
      }
      const response = await cachedOpenAlex.client.sources.getSource(
        sourceId,
        selectFields ? { select: selectFields } : {}
      );
      return response;
    },
    enabled: sourceId !== undefined && sourceId !== '' && sourceId !== "random",
  });

  // Get relationship counts for summary display - MUST be called before early returns (Rules of Hooks)
  const { incomingCount, outgoingCount, incoming: incomingSections, outgoing: outgoingSections } = useEntityRelationshipQueries(
    sourceId ?? '',
    'sources'
  );

  const config = ENTITY_TYPE_CONFIGS.sources;

  if (isLoading) {
    return <LoadingState entityType="Source" entityId={sourceId ?? ''} config={config} />;
  }

  if (error) {
    return <ErrorState entityType="Source" entityId={sourceId ?? ''} error={error} />;
  }

  if (!source || sourceId === undefined || sourceId === '') {
    return null;
  }


  return (
    <EntityDetailLayout
      config={config}
      entityType="sources"
      entityId={sourceId}
      displayName={source.display_name || "Source"}
      selectParam={selectParamString}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      data={source}>
      <RelationshipCounts incomingCount={incomingCount} outgoingCount={outgoingCount} />
      <PublicationTimeline
        yearData={source.counts_by_year.map((year) => ({
          year: year.year,
          count: year.works_count,
          citations: year.cited_by_count,
        }))}
        entityType="sources"
      />
      <RelatedEntitiesSection
        incomingSections={incomingSections}
        outgoingSections={outgoingSections}
        entityId={sourceId}
        entityType="sources"
      />
      <IncomingRelationships entityId={sourceId} entityType="sources" />
      <OutgoingRelationships entityId={sourceId} entityType="sources" />
    </EntityDetailLayout>
  );
};

export const Route = createLazyFileRoute("/sources/$sourceId")({
  component: SourceRoute,
});

export default SourceRoute;
