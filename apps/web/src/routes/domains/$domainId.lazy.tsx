import { cachedOpenAlex } from "@bibgraph/client";
import { domainSchema } from "@bibgraph/types";
import { type Domain } from "@bibgraph/types";
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

const DomainRoute = () => {
  const { domainId: rawDomainId } = useParams({ strict: false });
  const { select: selectParameter } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<DetailViewMode>("rich");

  // Decode the domain ID in case it's URL-encoded
  const domainId = decodeEntityId(rawDomainId);

  // Use pretty URL hook to replace encoded IDs with decoded versions in the URL
  usePrettyUrl("domains", rawDomainId, domainId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = typeof selectParameter === 'string' && selectParameter !== ''
    ? selectParameter.split(',').map(field => field.trim())
    : undefined;

  // Construct full OpenAlex domain URL
  const fullDomainId = domainId !== undefined && domainId !== '' ? `https://openalex.org/domains/${domainId}` : '';

  // Fetch domain data - domains use the domains endpoint
  const { data: domain, isLoading, error } = useQuery({
    queryKey: ["domain", domainId, selectParameter, selectFields],
    queryFn: async () => {
      if (domainId === undefined || domainId === '') {
        throw new Error("Domain ID is required");
      }
      const response = await cachedOpenAlex.getById<Domain>({
        endpoint: 'domains',
        id: domainId,
        params: selectFields ? { select: selectFields } : {},
        schema: domainSchema,
      });
      return response;
    },
    enabled: domainId !== undefined && domainId !== '',
  });

  // Get relationship counts for summary display
  const { incomingCount, outgoingCount } = useEntityRelationshipQueries(
    fullDomainId,
    'domains'
  );

  // Handle loading state
  if (isLoading) {
    return <LoadingState entityType="Domain" entityId={domainId ?? ''} config={ENTITY_TYPE_CONFIGS.domains} />;
  }

  // Handle error state
  if (error || !domain) {
    return (
      <ErrorState
        error={error}
        entityType="Domain"
        entityId={domainId ?? ''}
      />
    );
  }

  return (
    <EntityDetailLayout
      config={ENTITY_TYPE_CONFIGS.domains}
      entityType="domains"
      entityId={fullDomainId}
      displayName={domain.display_name || "Domain"}
      selectParam={typeof selectParameter === 'string' ? selectParameter : undefined}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      data={domain}>
      <RelationshipCounts incomingCount={incomingCount} outgoingCount={outgoingCount} />
      <IncomingRelationships entityId={fullDomainId} entityType="domains" />
      <OutgoingRelationships entityId={fullDomainId} entityType="domains" />
    </EntityDetailLayout>
  );
};

export const Route = createLazyFileRoute("/domains/$domainId")({
  component: DomainRoute,
});

export default DomainRoute;
