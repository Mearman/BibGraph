import { cachedOpenAlex } from "@bibgraph/client";
import { type FunderField } from "@bibgraph/types";
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

// Mirrors FUNDER_FIELDS from @bibgraph/types (packages/types/src/entities/entities.ts), which is not re-exported from the package's public entry point.
const FUNDER_FIELD_SET: ReadonlySet<string> = new Set([
  "id",
  "display_name",
  "cited_by_count",
  "counts_by_year",
  "updated_date",
  "created_date",
  "works_count",
  "works_api_url",
  "alternate_titles",
  "country_code",
  "description",
  "homepage_url",
  "image_url",
  "image_thumbnail_url",
  "grants_count",
  "ids",
  "roles",
  "summary_stats",
  "topics",
]);

const isFunderField = (value: string): value is FunderField => FUNDER_FIELD_SET.has(value);

const FunderRoute = () => {
  const { funderId: rawFunderId } = useParams({ strict: false });
  const { select: selectParameter } = useSearch({ from: "/funders/$funderId" });
  const [viewMode, setViewMode] = useState<DetailViewMode>("rich");

  const config = ENTITY_TYPE_CONFIGS.funders;

  // Decode the funder ID in case it's URL-encoded (for external IDs with special characters)
  const funderId = decodeEntityId(rawFunderId);
  usePrettyUrl("funders", rawFunderId, funderId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = selectParameter !== undefined && selectParameter !== ""
    ? selectParameter.split(',').map(field => field.trim()).filter(isFunderField)
    : undefined;

  // Get relationship counts
  const { incomingCount, outgoingCount } = useEntityRelationshipQueries(
    funderId ?? "",
    'funders'
  );

  // Fetch funder data
  const { data: funder, isLoading, error } = useQuery({
    queryKey: ["funder", funderId, selectParameter, selectFields],
    queryFn: async () => {
      if (funderId === undefined || funderId === "") {
        throw new Error("Funder ID is required");
      }
      const response = await cachedOpenAlex.client.funders.getFunder(
        funderId,
        selectFields ? { select: selectFields } : {}
      );
      return response;
    },
    enabled: funderId !== undefined && funderId !== "" && funderId !== "random",
  });

  // Loading state
  if (isLoading) {
    return <LoadingState entityType="Funder" entityId={funderId ?? ''} config={config} />;
  }

  // Error state
  if (error) {
    return <ErrorState entityType="Funder" entityId={funderId ?? ''} error={error} />;
  }

  // Null check
  if (funder === undefined || funderId === undefined || funderId === "") {
    return null;
  }

  return (
    <EntityDetailLayout
      config={config}
      entityType="funders"
      entityId={funderId}
      displayName={funder.display_name}
      selectParam={selectParameter ?? ''}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      data={funder}
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
