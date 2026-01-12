import { cachedOpenAlex } from "@bibgraph/client";
import { type Publisher, type PublisherField } from "@bibgraph/types";
import { useQuery } from "@tanstack/react-query";
import { createLazyFileRoute,useParams, useSearch  } from "@tanstack/react-router";
import { useState } from "react";

import { type DetailViewMode, EntityDetailLayout, ErrorState, LoadingState } from "@/components/entity-detail";
import { ENTITY_TYPE_CONFIGS } from "@/components/entity-detail/EntityTypeConfig";
import { IncomingRelationships } from "@/components/relationship/IncomingRelationships";
import { OutgoingRelationships } from "@/components/relationship/OutgoingRelationships";
import { RelationshipCounts } from "@/components/relationship/RelationshipCounts";
import { useEntityRelationshipQueries } from '@/hooks/use-entity-relationship-queries';
import { usePrettyUrl } from "@/hooks/use-pretty-url";
import { decodeEntityId } from "@/utils/url-decoding";

const PublisherRoute = () => {
  const { publisherId: rawPublisherId } = useParams({ strict: false });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<DetailViewMode>("rich");

  const config = ENTITY_TYPE_CONFIGS.publishers;

  // Decode the publisher ID in case it's URL-encoded (for external IDs with special characters)
  const publisherId = decodeEntityId(rawPublisherId);
  usePrettyUrl("publishers", rawPublisherId, publisherId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as PublisherField[]
    : undefined;

  // Get relationship counts
  const { incomingCount, outgoingCount } = useEntityRelationshipQueries(
    publisherId || "",
    'publishers'
  );

  // Fetch publisher data
  const { data: publisher, isLoading, error } = useQuery({
    queryKey: ["publisher", publisherId, selectParam, selectFields],
    queryFn: async () => {
      if (!publisherId) {
        throw new Error("Publisher ID is required");
      }
      const response = await cachedOpenAlex.client.publishers.get(
        publisherId,
        selectFields ? { select: selectFields } : {}
      );
      return response as Publisher;
    },
    enabled: !!publisherId && publisherId !== "random",
  });

  // Loading state
  if (isLoading) {
    return <LoadingState entityType="Publisher" entityId={publisherId || ''} config={config} />;
  }

  // Error state
  if (error) {
    return <ErrorState entityType="Publisher" entityId={publisherId || ''} error={error} />;
  }

  // Null check
  if (!publisher || !publisherId) {
    return null;
  }

  return (
    <EntityDetailLayout
      config={config}
      entityType="publishers"
      entityId={publisherId}
      displayName={publisher.display_name || "Publisher"}
      selectParam={(selectParam as string) || ''}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      data={publisher as Record<string, unknown>}
    >
      <RelationshipCounts incomingCount={incomingCount} outgoingCount={outgoingCount} />
      <IncomingRelationships entityId={publisherId} entityType="publishers" />
      <OutgoingRelationships entityId={publisherId} entityType="publishers" />
    </EntityDetailLayout>
  );
};

export const Route = createLazyFileRoute("/publishers/$publisherId")({
  component: PublisherRoute,
});

export default PublisherRoute;
