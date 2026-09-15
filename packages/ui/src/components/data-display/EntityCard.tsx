import type { EntityType } from "@bibgraph/types";
import { ENTITY_METADATA } from "@bibgraph/types";
import { Anchor, Badge, Card, Group, Stack, Text } from "@mantine/core";

export interface EntityCardProps {
  id: string;
  displayName: string;
  entityType: EntityType;
  worksCount?: number;
  citedByCount?: number;
  description?: string;
  tags?: { label: string; color?: string }[];
  onClick?: () => void;
  onNavigate?: (path: string) => void;
}

export const EntityCard = ({
  ref,
  id,
  displayName,
  entityType,
  worksCount,
  citedByCount,
  description,
  tags,
  onClick,
  onNavigate,
}: EntityCardProps & { ref?: React.RefObject<HTMLDivElement | null> }) => {
    // Generate the navigation path (entityType is already plural, e.g., "works", "authors")
    const entityPath = `/${entityType}/${id}`;
    // Use hash-based URL for proper anchor tag
    const href = `#${entityPath}`;

    const handleCardClick = (e: React.MouseEvent) => {
      // Don't trigger card click if clicking on the anchor link
      if (e.target instanceof Element && e.target.closest('a')) {
        return;
      }

      if (onClick) {
        onClick();
      } else if (onNavigate) {
        onNavigate(entityPath);
      }
    };

    const handleLinkClick = (e: React.MouseEvent) => {
      // Allow default link behavior for middle-click and ctrl/cmd+click
      if (e.button === 1 || e.ctrlKey || e.metaKey) {
        return;
      }

      // For normal left-clicks, use onNavigate if provided (for SPA navigation)
      if (onNavigate) {
        e.preventDefault();
        onNavigate(entityPath);
      }
      // Otherwise, let the default anchor behavior work
    };

    const isClickable = onClick ?? onNavigate;

    return (
      <Card
        ref={ref}
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        style={{ cursor: isClickable ? "pointer" : "default" }}
        onClick={isClickable ? handleCardClick : undefined}
      >
        <Stack gap="xs">
          <Group justify="space-between" align="flex-start">
            {isClickable ? (
              <Anchor
                href={href}
                fw={500}
                size="lg"
                lineClamp={2}
                onClick={handleLinkClick}
                style={{ textDecoration: 'none' }}
              >
                {displayName}
              </Anchor>
            ) : (
              <Text fw={500} size="lg" lineClamp={2}>
                {displayName}
              </Text>
            )}
            <Badge color={ENTITY_METADATA[entityType].color} variant="light" size="sm">
              {ENTITY_METADATA[entityType].displayName}
            </Badge>
          </Group>

          {description !== undefined && description !== "" && (
            <Text size="sm" c="dimmed" lineClamp={3}>
              {description}
            </Text>
          )}

          {(worksCount != null || citedByCount != null) && (
            <Group gap="md" mt="xs">
              {worksCount != null && (
                <Text size="sm" c="dimmed">
                  Works: <Text span fw={500}>{worksCount.toLocaleString()}</Text>
                </Text>
              )}
              {citedByCount != null && (
                <Text size="sm" c="dimmed">
                  Citations: <Text span fw={500}>{citedByCount.toLocaleString()}</Text>
                </Text>
              )}
            </Group>
          )}

          {tags && tags.length > 0 && (
            <Group gap="xs" mt="xs">
              {tags.map((tag) => (
                <Badge
                  key={tag.label}
                  color={tag.color ?? "gray"}
                  variant="dot"
                  size="sm"
                >
                  {tag.label}
                </Badge>
              ))}
            </Group>
          )}
        </Stack>
      </Card>
    );
  };

EntityCard.displayName = "EntityCard";
