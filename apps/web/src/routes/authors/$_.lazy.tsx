import { cachedOpenAlex } from "@bibgraph/client";
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

// Minimum number of `/`-separated hash segments needed to contain an entity ID after the leading route prefix.
const HASH_PARTS_MIN_LENGTH = 3;

const AuthorRoute = () => {
  const { _splat: rawAuthorId } = useParams({ from: "/authors/$_" });
  const { select: selectParameter } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<DetailViewMode>("rich");

  // Fix browser address bar display issues with collapsed protocol slashes
  useUrlNormalization();

  // Extract author ID from URL hash as fallback since splat parameter isn't working
  // For hash routing with URLs containing slashes (like ORCID, ROR), we need to reconstruct the full ID
  const getAuthorIdFromHash = () => {
    if (typeof window !== 'undefined') {
      // First strip query parameters from the hash, then extract the entity ID
      const hashWithoutQuery = window.location.hash.split('?', 1)[0];
      const hashParts = hashWithoutQuery.split('/');
      return hashParts.length >= HASH_PARTS_MIN_LENGTH ? hashParts.slice(2).join('/') : '';
    }
    return '';
  };

  // rawAuthorId can be an empty string from the splat param, so fall through to the hash extraction for both undefined and empty string.
  const authorId = rawAuthorId !== undefined && rawAuthorId !== '' ? rawAuthorId : getAuthorIdFromHash();
  const decodedAuthorId = decodeEntityId(authorId);
  // Use the extracted authorId since rawAuthorId from TanStack Router doesn't work with hash routing
  usePrettyUrl("authors", authorId, decodedAuthorId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = typeof selectParameter === 'string' && selectParameter !== ''
    ? selectParameter.split(',').map(field => field.trim())
    : undefined;

  // Fetch author data
  const { data: author, isLoading, error } = useQuery({
    queryKey: ["author", decodedAuthorId, selectParameter, selectFields],
    queryFn: async () => {
      if (decodedAuthorId === undefined || decodedAuthorId === '') {
        throw new Error("Author ID is required");
      }
      const response = await cachedOpenAlex.client.authors.getAuthor(
        decodedAuthorId,
        selectFields ? { select: selectFields } : {}
      );
      return response;
    },
    enabled: decodedAuthorId !== undefined && decodedAuthorId !== '' && decodedAuthorId !== "random",
  });

  // Get relationship counts from API queries
  const { incomingCount, outgoingCount, incoming: incomingSections, outgoing: outgoingSections } = useEntityRelationshipQueries(
    decodedAuthorId ?? '',
    'authors'
  );

  const config = ENTITY_TYPE_CONFIGS.authors;

  if (isLoading) {
    return <LoadingState entityType="Author" entityId={decodedAuthorId ?? ''} config={config} />;
  }

  if (error) {
    return <ErrorState entityType="Author" entityId={decodedAuthorId ?? ''} error={error} />;
  }

  if (author === undefined || decodedAuthorId === undefined || decodedAuthorId === '') {
    return null;
  }


  return (
    <EntityDetailLayout
      config={config}
      entityType="authors"
      entityId={decodedAuthorId}
      displayName={author.display_name || "Author"}
      selectParam={typeof selectParameter === 'string' ? selectParameter : ''}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      data={author}>
      <RelationshipCounts incomingCount={incomingCount} outgoingCount={outgoingCount} />
      <CollaborationNetwork
        authorId={decodedAuthorId}
        author={author}
      />
      <PublicationTimeline
        yearData={author.counts_by_year.map((year) => ({
          year: year.year,
          count: year.works_count,
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
        entityData={author}
      />
      <OutgoingRelationships
        entityId={decodedAuthorId}
        entityType="authors"
        entityData={author}
      />
    </EntityDetailLayout>
  );
};

export const Route = createLazyFileRoute("/authors/$_")({
  component: AuthorRoute,
});

export default AuthorRoute;
