import { cachedOpenAlex } from "@bibgraph/client";
import { type Author, type AuthorField } from "@bibgraph/types";
import { useQuery } from "@tanstack/react-query";
import { createLazyFileRoute,useParams, useSearch  } from "@tanstack/react-router";
import { useState } from "react";

import { CollaborationNetwork, type DetailViewMode, EntityDetailLayout, ErrorState, LoadingState, PublicationTimeline, RelatedEntitiesSection } from "@/components/entity-detail";
import { ENTITY_TYPE_CONFIGS } from "@/components/entity-detail/EntityTypeConfig";
import { IncomingRelationships } from "@/components/relationship/IncomingRelationships";
import { OutgoingRelationships } from "@/components/relationship/OutgoingRelationships";
import { RelationshipCounts } from "@/components/relationship/RelationshipCounts";
import { useEntityRelationshipQueries } from '@/hooks/use-entity-relationship-queries';
import { usePrettyUrl } from "@/hooks/use-pretty-url";
import { useUrlNormalization } from "@/hooks/use-url-normalization";
import { decodeEntityId } from "@/utils/url-decoding";

const AUTHOR_ROUTE_PATH = "/authors/$_";

const AuthorRoute = () => {
  const { _splat: rawAuthorId } = useParams({ from: "/authors/$_" });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<DetailViewMode>("rich");

  // Fix browser address bar display issues with collapsed protocol slashes
  useUrlNormalization();

  // Extract author ID from URL hash as fallback since splat parameter isn't working
  // For hash routing with URLs containing slashes (like ORCID, ROR), we need to reconstruct the full ID
  const getAuthorIdFromHash = () => {
    if (typeof window !== 'undefined') {
      // First strip query parameters from the hash, then extract the entity ID
      const hashWithoutQuery = window.location.hash.split('?')[0];
      const hashParts = hashWithoutQuery.split('/');
      return hashParts.length >= 3 ? hashParts.slice(2).join('/') : '';
    }
    return '';
  };

  const authorId = rawAuthorId || getAuthorIdFromHash();
  const decodedAuthorId = decodeEntityId(authorId);
  // Use the extracted authorId since rawAuthorId from TanStack Router doesn't work with hash routing
  usePrettyUrl("authors", authorId, decodedAuthorId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as AuthorField[]
    : undefined;

  // Fetch author data
  const { data: author, isLoading, error } = useQuery({
    queryKey: ["author", decodedAuthorId, selectParam, selectFields],
    queryFn: async () => {
      if (!decodedAuthorId) {
        throw new Error("Author ID is required");
      }
      const response = await cachedOpenAlex.client.authors.getAuthor(
        decodedAuthorId,
        selectFields ? { select: selectFields } : {}
      );
      return response as Author;
    },
    enabled: !!decodedAuthorId && decodedAuthorId !== "random",
  });

  // Get relationship counts from API queries
  const { incomingCount, outgoingCount, incoming: incomingSections, outgoing: outgoingSections } = useEntityRelationshipQueries(
    decodedAuthorId || '',
    'authors'
  );

  const config = ENTITY_TYPE_CONFIGS.authors;

  if (isLoading) {
    return <LoadingState entityType="Author" entityId={decodedAuthorId || ''} config={config} />;
  }

  if (error) {
    return <ErrorState entityType="Author" entityId={decodedAuthorId || ''} error={error} />;
  }

  if (!author || !decodedAuthorId) {
    return null;
  }


  return (
    <EntityDetailLayout
      config={config}
      entityType="authors"
      entityId={decodedAuthorId}
      displayName={author.display_name || "Author"}
      selectParam={(selectParam as string) || ''}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      data={author as Record<string, unknown>}>
      <RelationshipCounts incomingCount={incomingCount} outgoingCount={outgoingCount} />
      <CollaborationNetwork
        authorId={decodedAuthorId}
        author={author}
      />
      <PublicationTimeline
        yearData={(author.counts_by_year ?? []).map((year) => ({
          year: year.year,
          count: year.works_count ?? 0,
          citations: year.cited_by_count,
        }))}
        entityType="authors"
      />
      <RelatedEntitiesSection
        incomingSections={incomingSections}
        outgoingSections={outgoingSections}
        entityId={decodedAuthorId}
        entityType="authors"
      />
      <IncomingRelationships
        entityId={decodedAuthorId}
        entityType="authors"
        entityData={author as Record<string, unknown>}
      />
      <OutgoingRelationships
        entityId={decodedAuthorId}
        entityType="authors"
        entityData={author as Record<string, unknown>}
      />
    </EntityDetailLayout>
  );
};

export const Route = createLazyFileRoute(AUTHOR_ROUTE_PATH)({
  component: AuthorRoute,
});

export default AuthorRoute;
