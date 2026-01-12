import { cachedOpenAlex } from "@bibgraph/client";
import { type InstitutionEntity, type InstitutionField } from "@bibgraph/types";
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
import { useUrlNormalization } from "@/hooks/use-url-normalization";
import { decodeEntityId } from "@/utils/url-decoding";

const InstitutionRoute = () => {
  const { _splat: rawInstitutionId } = useParams({ from: "/institutions/$_" });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<DetailViewMode>("rich");

  // Fix browser address bar display issues with collapsed protocol slashes
  useUrlNormalization();

  // Extract institution ID from URL hash as fallback since splat parameter isn't working
  // For hash routing with URLs containing slashes (like ROR, ORCID), we need to reconstruct the full ID
  const getInstitutionIdFromHash = () => {
    if (typeof window !== 'undefined') {
      // First strip query parameters from the hash, then extract the entity ID
      const hashWithoutQuery = window.location.hash.split('?')[0];
      const hashParts = hashWithoutQuery.split('/');
      return hashParts.length >= 3 ? hashParts.slice(2).join('/') : '';
    }
    return '';
  };

  const institutionId = rawInstitutionId || getInstitutionIdFromHash();
  const decodedInstitutionId = decodeEntityId(institutionId);

  // Update URL with pretty display name if needed
  // Use the extracted institutionId since rawInstitutionId from TanStack Router doesn't work with hash routing
  usePrettyUrl("institutions", institutionId, decodedInstitutionId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as InstitutionField[]
    : undefined;

  // Fetch institution data
  const { data: institution, isLoading, error } = useQuery({
    queryKey: ["institution", decodedInstitutionId, selectParam, selectFields],
    queryFn: async () => {
      if (!decodedInstitutionId) {
        throw new Error("Institution ID is required");
      }
      const response = await cachedOpenAlex.client.institutions.getInstitution(
        decodedInstitutionId,
        selectFields ? { select: selectFields } : {}
      );
      return response as InstitutionEntity;
    },
    enabled: !!decodedInstitutionId && decodedInstitutionId !== "random",
  });

  // Get relationship counts for summary display - MUST be called before early returns (Rules of Hooks)
  const { incomingCount, outgoingCount, incoming: incomingSections, outgoing: outgoingSections } = useEntityRelationshipQueries(
    decodedInstitutionId || '',
    'institutions'
  );

  const config = ENTITY_TYPE_CONFIGS.institutions;

  if (isLoading) {
    return <LoadingState entityType="Institution" entityId={decodedInstitutionId || ''} config={config} />;
  }

  if (error) {
    return <ErrorState entityType="Institution" entityId={decodedInstitutionId || ''} error={error} />;
  }

  if (!institution || !decodedInstitutionId) {
    return null;
  }


  return (
    <EntityDetailLayout
      config={config}
      entityType="institutions"
      entityId={decodedInstitutionId}
      displayName={institution.display_name || "Institution"}
      selectParam={(selectParam as string) || ''}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      data={institution as Record<string, unknown>}>
      <RelationshipCounts incomingCount={incomingCount} outgoingCount={outgoingCount} />
      <PublicationTimeline
        yearData={(institution.counts_by_year ?? []).map((year) => ({
          year: year.year,
          count: year.works_count ?? 0,
          citations: year.cited_by_count,
        }))}
        entityType="institutions"
      />
      <RelatedEntitiesSection
        incomingSections={incomingSections}
        outgoingSections={outgoingSections}
        entityId={decodedInstitutionId}
        entityType="institutions"
      />
      <IncomingRelationships entityId={decodedInstitutionId} entityType="institutions" />
      <OutgoingRelationships entityId={decodedInstitutionId} entityType="institutions" />
    </EntityDetailLayout>
  );
};

export const Route = createLazyFileRoute("/institutions/$_")({
  component: InstitutionRoute,
});

export default InstitutionRoute;
