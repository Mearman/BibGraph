/**
 * Entity Type Breakdown component for displaying entity type distribution
 * @module components/catalogue/cache-tier/EntityTypeBreakdown
 */

import type { CachedEntityEntry } from "@bibgraph/client/internal/static-data-provider";
import {
  Accordion,
  Badge,
  Group,
  Paper,
  SimpleGrid,
  Text,
} from "@mantine/core";

import { BORDER_STYLE_GRAY_3 } from "@/config/style-constants";

import type { EntityTypeCount } from "./cache-tier-types";
import { getEntityTypeColor, groupByEntityType } from "./cache-tier-utils";
import { CachedEntityTable } from "./CachedEntityTable";
import { EntityTypeBadge } from "./EntityTypeBadge";

interface EntityTypeBreakdownProps {
  entities: CachedEntityEntry[];
  showSize?: boolean;
  showAccessedAt?: boolean;
}

/**
 * Displays an accordion with entity type breakdown and recent entities table
 * @param root0
 * @param root0.entities
 * @param root0.showSize
 * @param root0.showAccessedAt
 */
export const EntityTypeBreakdown = ({
  entities,
  showSize = true,
  showAccessedAt = true,
}: EntityTypeBreakdownProps) => {
  const entityTypeCounts = groupByEntityType(entities);

  return (
    <Accordion variant="contained">
      <Accordion.Item value="breakdown">
        <Accordion.Control>
          <Group gap="xs">
            <Text size="sm" fw={500}>Entity Type Breakdown</Text>
            <Badge size="xs" variant="light">{entityTypeCounts.length} types</Badge>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <EntityTypeGrid entityTypeCounts={entityTypeCounts} />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="entities">
        <Accordion.Control>
          <Group gap="xs">
            <Text size="sm" fw={500}>{showAccessedAt ? "Recent Entities" : "Cached Entities"}</Text>
            <Badge size="xs" variant="light">Last 20</Badge>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <CachedEntityTable
            entities={entities}
            showSize={showSize}
            showAccessedAt={showAccessedAt}
            sortByAccessedAt={showAccessedAt}
          />
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
};

interface EntityTypeGridProps {
  entityTypeCounts: EntityTypeCount[];
}

/**
 * Displays a grid of entity type counts
 * @param root0
 * @param root0.entityTypeCounts
 */
const EntityTypeGrid = ({ entityTypeCounts }: EntityTypeGridProps) => {
  return (
    <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="xs">
      {entityTypeCounts.map(({ entityType, count }) => (
        <Paper key={entityType} style={{ border: BORDER_STYLE_GRAY_3 }} p="xs" radius="sm">
          <Group gap="xs">
            <EntityTypeBadge
              entityType={entityType}
              color={getEntityTypeColor(entityType)}
              variant="filled"
              count={count}
            />
            <Text size="xs" tt="capitalize">{entityType}</Text>
          </Group>
        </Paper>
      ))}
    </SimpleGrid>
  );
};
