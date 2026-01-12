import { cachedOpenAlex } from "@bibgraph/client";
import { type Concept, type ConceptField } from "@bibgraph/types";
import { Alert } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
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
import { ICON_SIZE } from "@/config/style-constants";
import { useEntityRelationshipQueries } from '@/hooks/use-entity-relationship-queries';
import { decodeEntityId } from "@/utils/url-decoding";

const ConceptRoute = () => {
  const { conceptId: rawConceptId } = useParams({ from: "/concepts/$conceptId" });
  const { select: selectParam } = useSearch({ from: "/concepts/$conceptId" });
  const [viewMode, setViewMode] = useState<DetailViewMode>("rich");

  // Decode the concept ID in case it's URL-encoded (for external IDs with special characters)
  const conceptId = decodeEntityId(rawConceptId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as ConceptField[]
    : undefined;

  // Fetch concept data
  const { data: concept, isLoading, error } = useQuery({
    queryKey: ["concept", conceptId, selectParam, selectFields],
    queryFn: async () => {
      if (!conceptId) {
        throw new Error("Concept ID is required");
      }
      const response = await cachedOpenAlex.client.concepts.getConcept(
        conceptId,
        selectFields ? { select: selectFields } : {}
      );
      return response as Concept;
    },
    enabled: !!conceptId && conceptId !== "random",
  });

  // Get relationship counts for summary display - MUST be called before early returns (Rules of Hooks)
  const { incomingCount, outgoingCount } = useEntityRelationshipQueries(
    conceptId || "",
    'concepts'
  );

  // Handle loading state
  if (isLoading) {
    return <LoadingState entityType="Concept" entityId={conceptId || ''} config={ENTITY_TYPE_CONFIGS.concepts} />;
  }

  // Handle error state
  if (error || !concept) {
    return (
      <ErrorState
        error={error}
        entityType="Concept"
        entityId={conceptId || ''}
      />
    );
  }

  // Render main content with EntityDetailLayout
  return (
    <EntityDetailLayout
      config={ENTITY_TYPE_CONFIGS.concepts}
      entityType="concepts"
      entityId={conceptId || ''}
      displayName={concept.display_name || "Concept"}
      selectParam={typeof selectParam === 'string' ? selectParam : undefined}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      data={concept}>
      <Alert
        icon={<IconAlertCircle size={ICON_SIZE.MD} />}
        title="Concepts Entity Deprecated"
        color="yellow"
        style={{ marginBottom: "1rem" }}
      >
        The OpenAlex Concepts entity has been deprecated by the OpenAlex API as of 2024.
        Please use the Topics entity instead for hierarchical subject classification.
        This concept data may be incomplete or outdated.
      </Alert>
      <RelationshipCounts incomingCount={incomingCount} outgoingCount={outgoingCount} />
      <IncomingRelationships entityId={conceptId || ""} entityType="concepts" />
      <OutgoingRelationships entityId={conceptId || ""} entityType="concepts" />
    </EntityDetailLayout>
  );
};

export const Route = createLazyFileRoute("/concepts/$conceptId")({
  component: ConceptRoute,
});

export default ConceptRoute;
