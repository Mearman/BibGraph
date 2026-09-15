/**
 * Entity Type Badge component for consistent entity type display
 */

import { Badge } from "@mantine/core";

interface EntityTypeBadgeProperties {
  entityType: string;
  color: string;
  variant?: "light" | "filled";
  count?: number;
}

/**
 * Displays an entity type badge with optional count
 */
export const EntityTypeBadge = ({
  entityType,
  color,
  variant = "light",
  count,
}: EntityTypeBadgeProperties) => {
  return (
    <Badge size="xs" color={color} variant={variant}>
      {count ?? entityType}
    </Badge>
  );
};
