/**
 * Component to display an entity's display name, fetching it if necessary
 * Falls back to entityId if the name cannot be resolved
 */

import type { EntityType } from "@bibgraph/types";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useEntityDisplayName } from "@/hooks/use-entity-display-name";

const SKELETON_HEIGHT_XS = 14;
const SKELETON_HEIGHT_DEFAULT = 16;

interface EntityDisplayNameProperties extends Omit<TextProps, "children"> {
  entityId: string;
  entityType: EntityType;
  /**
  Fallback text to show if display name can't be resolved
   */
  fallback?: string;
  /**
  Show loading skeleton while fetching
   */
  showSkeleton?: boolean;
  /**
  Custom line clamp
   */
  lineClamp?: number;
}

/**
 * Renders an entity's display name, automatically fetching it from OpenAlex if needed.
 * Handles loading and error states gracefully.
 */
export const EntityDisplayName = ({
  entityId,
  entityType,
  fallback,
  showSkeleton = false,
  lineClamp = 2,
  ...textProps
}: EntityDisplayNameProperties) => {
  // Skip fetching for special IDs
  const isSpecialId = entityId.startsWith("search-") || entityId.startsWith("list-");

  const { displayName, isLoading } = useEntityDisplayName({
    entityId,
    entityType,
    enabled: !isSpecialId,
  });

  // Handle special IDs
  if (isSpecialId) {
    let specialTitle = fallback ?? entityId;
    if (entityId.startsWith("search-")) {
      specialTitle = `Search: ${entityId.replace("search-", "").split("-", 1)[0]}`;
    } else if (entityId.startsWith("list-")) {
      specialTitle = `List: ${entityId.replace("list-", "")}`;
    }
    return (
      <Text lineClamp={lineClamp} {...textProps}>
        {specialTitle}
      </Text>
    );
  }

  // Show skeleton while loading if requested
  if (isLoading && showSkeleton) {
    return (
      <Skeleton
        height={textProps.size === "xs" ? SKELETON_HEIGHT_XS : SKELETON_HEIGHT_DEFAULT}
        width="80%"
      />
    );
  }

  // Use display name if available, otherwise fallback
  const displayText = displayName ?? fallback ?? `${entityType}: ${entityId}`;

  return (
    <Text lineClamp={lineClamp} {...textProps}>
      {displayText}
    </Text>
  );
};
