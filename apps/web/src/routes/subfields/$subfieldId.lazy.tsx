import { cachedOpenAlex } from "@bibgraph/client";
import { type Subfield } from "@bibgraph/types";
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

const SubfieldRoute = () => {
  const { subfieldId: rawSubfieldId } = useParams({ strict: false }) as { subfieldId: string };
  const { select: selectParam } = useSearch({ strict: false }) as { select?: string };
  const [viewMode, setViewMode] = useState<DetailViewMode>("rich");

  // Decode the subfield ID in case it's URL-encoded
  const subfieldId = decodeEntityId(rawSubfieldId);

  // Use pretty URL hook to replace encoded IDs with decoded versions in the URL
  usePrettyUrl("subfields", rawSubfieldId, subfieldId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim())
    : undefined;

  // Construct full OpenAlex subfield URL
  const fullSubfieldId = subfieldId ? `https://openalex.org/subfields/${subfieldId}` : '';

  // Fetch subfield data - subfields use the subfields endpoint
  const { data: subfield, isLoading, error } = useQuery({
    queryKey: ["subfield", subfieldId, selectParam, selectFields],
    queryFn: async () => {
      if (!subfieldId) {
        throw new Error("Subfield ID is required");
      }
      const response = await cachedOpenAlex.getById(
        'subfields',
        subfieldId,
        selectFields ? { select: selectFields } : {}
      );
      return response as Subfield;
    },
    enabled: !!subfieldId,
  });

  // Get relationship counts for summary display - MUST be called before early returns (Rules of Hooks)
  const { incomingCount, outgoingCount } = useEntityRelationshipQueries(
    fullSubfieldId,
    'subfields'
  );

  // Handle loading state
  if (isLoading) {
    return <LoadingState entityType="Subfield" entityId={subfieldId || ''} config={ENTITY_TYPE_CONFIGS.subfields} />;
  }

  // Handle error state
  if (error || !subfield) {
    return (
      <ErrorState
        error={error}
        entityType="Subfield"
        entityId={subfieldId || ''}
      />
    );
  }

  return (
    <EntityDetailLayout
      config={ENTITY_TYPE_CONFIGS.subfields}
      entityType="subfields"
      entityId={fullSubfieldId}
      displayName={subfield.display_name || "Subfield"}
      selectParam={typeof selectParam === 'string' ? selectParam : undefined}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      data={subfield}>
      <RelationshipCounts incomingCount={incomingCount} outgoingCount={outgoingCount} />
      <IncomingRelationships entityId={fullSubfieldId} entityType="subfields" />
      <OutgoingRelationships entityId={fullSubfieldId} entityType="subfields" />
    </EntityDetailLayout>
  );
};

export const Route = createLazyFileRoute("/subfields/$subfieldId")({
  component: SubfieldRoute,
});

export default SubfieldRoute;
