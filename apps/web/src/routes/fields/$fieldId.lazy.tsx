import { cachedOpenAlex } from "@bibgraph/client";
import { type Field } from "@bibgraph/types";
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

const FieldRoute = () => {
  const { fieldId: rawFieldId } = useParams({ strict: false }) as { fieldId: string };
  const { select: selectParam } = useSearch({ strict: false }) as { select?: string };
  const [viewMode, setViewMode] = useState<DetailViewMode>("rich");

  // Decode the field ID in case it's URL-encoded
  const fieldId = decodeEntityId(rawFieldId);

  // Use pretty URL hook to replace encoded IDs with decoded versions in the URL
  usePrettyUrl("fields", rawFieldId, fieldId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim())
    : undefined;

  // Construct full OpenAlex field URL
  const fullFieldId = fieldId ? `https://openalex.org/fields/${fieldId}` : '';

  // Fetch field data - fields use the fields endpoint
  const { data: field, isLoading, error } = useQuery({
    queryKey: ["field", fieldId, selectParam, selectFields],
    queryFn: async () => {
      if (!fieldId) {
        throw new Error("Field ID is required");
      }
      const response = await cachedOpenAlex.getById(
        'fields',
        fieldId,
        selectFields ? { select: selectFields } : {}
      );
      return response as Field;
    },
    enabled: !!fieldId,
  });

  // Get relationship counts for summary display - MUST be called before early returns (Rules of Hooks)
  const { incomingCount, outgoingCount } = useEntityRelationshipQueries(
    fullFieldId,
    'fields'
  );

  // Handle loading state
  if (isLoading) {
    return <LoadingState entityType="Field" entityId={fieldId || ''} config={ENTITY_TYPE_CONFIGS.fields} />;
  }

  // Handle error state
  if (error || !field) {
    return (
      <ErrorState
        error={error}
        entityType="Field"
        entityId={fieldId || ''}
      />
    );
  }

  return (
    <EntityDetailLayout
      config={ENTITY_TYPE_CONFIGS.fields}
      entityType="fields"
      entityId={fullFieldId}
      displayName={field.display_name || "Field"}
      selectParam={typeof selectParam === 'string' ? selectParam : undefined}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      data={field}>
      <RelationshipCounts incomingCount={incomingCount} outgoingCount={outgoingCount} />
      <IncomingRelationships entityId={fullFieldId} entityType="fields" />
      <OutgoingRelationships entityId={fullFieldId} entityType="fields" />
    </EntityDetailLayout>
  );
};

export const Route = createLazyFileRoute("/fields/$fieldId")({
  component: FieldRoute,
});

export default FieldRoute;
