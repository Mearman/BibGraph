/**
 * Entity Type Badge component for consistent entity type display
 * @module components/catalogue/cache-tier/EntityTypeBadge
 */

import { Badge } from "@mantine/core";

interface EntityTypeBadgeProps {
  entityType: string;
  color: string;
  variant?: "light" | "filled";
  count?: number;
}

/**
 * Displays an entity type badge with optional count
 * @param root0
 * @param root0.entityType
 * @param root0.color
 * @param root0.variant
 * @param root0.count
 */
export const EntityTypeBadge = ({
  entityType,
  color,
  variant = "light",
  count,
}: EntityTypeBadgeProps) => {
  return (
    <Badge size="xs" color={color} variant={variant}>
      {count !== undefined ? count : entityType}
    </Badge>
  );
};
