import { cachedOpenAlex } from "@bibgraph/client";
import { type Funder, type FunderField } from "@bibgraph/types";
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

const FunderRoute = () => {
  const { funderId: rawFunderId } = useParams({ strict: false });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<DetailViewMode>("rich");

  const config = ENTITY_TYPE_CONFIGS.funders;

  // Decode the funder ID in case it's URL-encoded (for external IDs with special characters)
  const funderId = decodeEntityId(rawFunderId);
  usePrettyUrl("funders", rawFunderId, funderId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as FunderField[]
    : undefined;

  // Get relationship counts
  const { incomingCount, outgoingCount } = useEntityRelationshipQueries(
    funderId || "",
    'funders'
  );

  // Fetch funder data
  const { data: funder, isLoading, error } = useQuery({
    queryKey: ["funder", funderId, selectParam, selectFields],
    queryFn: async () => {
      if (!funderId) {
        throw new Error("Funder ID is required");
      }
      const response = await cachedOpenAlex.client.funders.getFunder(
        funderId,
        selectFields ? { select: selectFields } : {}
      );
      return response as Funder;
    },
    enabled: !!funderId && funderId !== "random",
  });

  // Loading state
  if (isLoading) {
    return <LoadingState entityType="Funder" entityId={funderId || ''} config={config} />;
  }

  // Error state
  if (error) {
    return <ErrorState entityType="Funder" entityId={funderId || ''} error={error} />;
  }

  // Null check
  if (!funder || !funderId) {
    return null;
  }

  return (
    <EntityDetailLayout
      config={config}
      entityType="funders"
      entityId={funderId}
      displayName={funder.display_name || "Funder"}
      selectParam={(selectParam as string) || ''}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      data={funder as Record<string, unknown>}
    >
      <RelationshipCounts incomingCount={incomingCount} outgoingCount={outgoingCount} />
      <IncomingRelationships entityId={funderId} entityType="funders" />
      <OutgoingRelationships entityId={funderId} entityType="funders" />
    </EntityDetailLayout>
  );
};

export const Route = createLazyFileRoute("/funders/$funderId")({
  component: FunderRoute,
});

export default FunderRoute;
