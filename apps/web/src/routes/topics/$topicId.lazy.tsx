import { cachedOpenAlex } from "@bibgraph/client";
import { useQuery } from "@tanstack/react-query";
import { createLazyFileRoute,useParams, useSearch  } from "@tanstack/react-router";
import { useState } from "react";

import { type DetailViewMode,EntityDetailLayout } from "@/components/entity-detail/EntityDetailLayout";
import { ENTITY_TYPE_CONFIGS } from "@/components/entity-detail/EntityTypeConfig";
import { ErrorState } from "@/components/entity-detail/ErrorState";
import { LoadingState } from "@/components/entity-detail/LoadingState";
import { IncomingRelationships } from "@/components/relationship/IncomingRelationships";
import { OutgoingRelationships } from "@/components/relationship/OutgoingRelationships";
import { RelationshipCounts } from "@/components/relationship/RelationshipCounts";
import { useEntityRelationshipQueries } from '@/hooks/use-entity-relationship-queries';
import { usePrettyUrl } from "@/hooks/use-pretty-url";
import { decodeEntityId } from "@/utils/url-decoding";

const TopicRoute = () => {
  const { topicId: rawTopicId } = useParams({ strict: false });
  const { select: selectParameter } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<DetailViewMode>("rich");

  // Decode the topic ID in case it's URL-encoded (for external IDs with special characters)
  const topicId = decodeEntityId(rawTopicId);

  // Use pretty URL hook to replace encoded IDs with decoded versions in the URL
  usePrettyUrl("topics", rawTopicId, topicId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = typeof selectParameter === 'string' && selectParameter !== ''
    ? selectParameter.split(',').map(field => field.trim())
    : undefined;

  // Fetch topic data
  const { data: topic, isLoading, error } = useQuery({
    queryKey: ["topic", topicId, selectParameter, selectFields],
    queryFn: async () => {
      if (topicId === undefined || topicId === '') {
        throw new Error("Topic ID is required");
      }
      const response = await cachedOpenAlex.client.topics.getTopic(
        topicId,
        selectFields ? { select: selectFields } : {}
      );
      return response;
    },
    enabled: topicId !== undefined && topicId !== '' && topicId !== "random",
  });

  // Get relationship counts for summary display - MUST be called before early returns (Rules of Hooks)
  const { incomingCount, outgoingCount } = useEntityRelationshipQueries(
    topicId ?? "",
    'topics'
  );

  // Handle loading state
  if (isLoading) {
    return <LoadingState entityType="Topic" entityId={topicId ?? ''} config={ENTITY_TYPE_CONFIGS.topics} />;
  }

  // Handle error state
  if (error || !topic) {
    return (
      <ErrorState
        error={error}
        entityType="Topic"
        entityId={topicId ?? ''}
      />
    );
  }


  return (
    <EntityDetailLayout
      config={ENTITY_TYPE_CONFIGS.topics}
      entityType="topics"
      entityId={topicId ?? ''}
      displayName={topic.display_name || "Topic"}
      selectParam={typeof selectParameter === 'string' ? selectParameter : undefined}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      data={topic}>
      <RelationshipCounts incomingCount={incomingCount} outgoingCount={outgoingCount} />
      <IncomingRelationships entityId={topicId ?? ""} entityType="topics" />
      <OutgoingRelationships entityId={topicId ?? ""} entityType="topics" />
    </EntityDetailLayout>
  );
};

export const Route = createLazyFileRoute("/topics/$topicId")({
  component: TopicRoute,
});

export default TopicRoute;
