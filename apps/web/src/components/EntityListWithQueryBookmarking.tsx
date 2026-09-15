/**
 * Enhanced EntityList component with query bookmarking functionality
 * Wraps the existing EntityList to add query bookmarking controls
 */

import type { EntityType } from "@bibgraph/types";
import { Group, Stack, Text,Title } from "@mantine/core";

import { useQueryBookmarking } from "@/hooks/use-query-bookmarking";

import { EntityList, type EntityListProps as EntityListProperties } from "./EntityList";
import { QueryBookmarkButton } from "./QueryBookmarkButton";

// Preview length for the truncated bookmarked-query ID shown in the header.
const QUERY_ID_PREVIEW_LENGTH = 12;

interface EntityListWithQueryBookmarkingProperties extends Omit<EntityListProperties, "title"> {
  entityType: EntityType;
  entityId?: string;
  title?: string;
  showBookmarkButton?: boolean;
  bookmarkButtonPosition?: "header" | "inline";
  bookmarkButtonSize?: "xs" | "sm" | "md" | "lg";
  customHeader?: React.ReactNode;
}

export const EntityListWithQueryBookmarking = ({
  entityType,
  entityId,
  title,
  showBookmarkButton = true,
  bookmarkButtonPosition = "header",
  bookmarkButtonSize = "sm",
  customHeader,
  ...entityListProperties
}: EntityListWithQueryBookmarkingProperties) => {

  const {
    currentQueryParams,
    paginationInfo,
    isQueryBookmarked,
    generateDefaultTitle,
    queryId
  } = useQueryBookmarking({
    entityType,
    entityId
  });

  // Check if this query has semantic parameters worth bookmarking
  const hasSemanticQuery = Object.keys(currentQueryParams).length > 0 || entityId !== undefined;

  const renderHeader = async () => {
    if (customHeader !== undefined) {
      return customHeader;
    }

    return (
      <Group justify="space-between" mb="md">
        <div>
          <Title order={2}>
            {title !== undefined && title !== "" ? title : `${entityType.charAt(0).toUpperCase() + entityType.slice(1)}${
              entityId !== undefined ? ` Details` : " List"
            }`}
          </Title>

          {/* Show query info if available */}
          {hasSemanticQuery && (
            <Text size="sm" c="dimmed" mt="xs">
              {generateDefaultTitle()}
              <Text component="span" size="xs" c="blue" ml="sm">
                ID: {queryId.slice(0, QUERY_ID_PREVIEW_LENGTH)}...
              </Text>
            </Text>
          )}

          {/* Show pagination info */}
          {paginationInfo.hasPagination && (
            <Text size="xs" c="dimmed" mt="xs">
              Page {paginationInfo.page} ({paginationInfo.perPage} per page)
            </Text>
          )}
        </div>

        {/* Bookmark button in header */}
        {showBookmarkButton && bookmarkButtonPosition === "header" && (
          <QueryBookmarkButton
            entityType={entityType}
            entityId={entityId}
            size={bookmarkButtonSize}
          />
        )}
      </Group>
    );
  };

  return (
    <Stack>
      {renderHeader()}

      <EntityList
        entityType={entityType}
        {...entityListProperties}
        title={undefined} // Title handled by this wrapper
      />

      {/* Bookmark button inline (alternative position) */}
      {showBookmarkButton && bookmarkButtonPosition === "inline" && hasSemanticQuery && (
        <Group justify="center" mt="md">
          <QueryBookmarkButton
            entityType={entityType}
            entityId={entityId}
            size="md"
            showLabel
          />
        </Group>
      )}

      {/* Debug information (development only) */}
      {process.env.NODE_ENV === "development" && (
        <div style={{
          marginTop: "1rem",
          padding: "0.5rem",
          backgroundColor: "var(--mantine-color-gray-1)",
          borderRadius: "4px",
          fontSize: "12px",
          fontFamily: "monospace"
        }}>
          <div><strong>Query Debug Info:</strong></div>
          <div>Entity: {entityType}{entityId !== undefined && `/${entityId}`}</div>
          <div>Query ID: {queryId}</div>
          <div>Bookmarked: {isQueryBookmarked ? "Yes" : "No"}</div>
          <div>Semantic Params: {JSON.stringify(currentQueryParams, null, 2)}</div>
          <div>Pagination: {JSON.stringify(paginationInfo, null, 2)}</div>
        </div>
      )}
    </Stack>
  );
};