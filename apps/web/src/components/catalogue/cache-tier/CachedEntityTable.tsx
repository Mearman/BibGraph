/**
 * Cached Entity Table component for displaying entity lists in cache tiers
 * @module components/catalogue/cache-tier/CachedEntityTable
 */

import type { CachedEntityEntry } from "@bibgraph/client/internal/static-data-provider";
import {
  ActionIcon,
  Box,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { ICON_SIZE } from "@/config/style-constants";

import { formatBytes, formatTimeAgo, getEntityTypeColor } from "./cache-tier-utils";
import { EntityTypeBadge } from "./EntityTypeBadge";
import { useEntityNavigation } from "./useCacheTierData";

const MAX_DISPLAY_ENTITIES = 20;

interface CachedEntityTableProps {
  entities: CachedEntityEntry[];
  showSize?: boolean;
  showAccessedAt?: boolean;
  sortByAccessedAt?: boolean;
}

/**
 * Displays a table of cached entities with type, ID, timestamps, and navigation
 * @param root0
 * @param root0.entities
 * @param root0.showSize
 * @param root0.showAccessedAt
 * @param root0.sortByAccessedAt
 */
export const CachedEntityTable = ({
  entities,
  showSize = true,
  showAccessedAt = true,
  sortByAccessedAt = true,
}: CachedEntityTableProps) => {
  const handleEntityClick = useEntityNavigation();

  const sortedEntities = [...entities]
    .sort((a, b) => sortByAccessedAt
      ? b.lastAccessedAt - a.lastAccessedAt
      : b.cachedAt - a.cachedAt
    )
    .slice(0, MAX_DISPLAY_ENTITIES);

  return (
    <Box style={{ overflowX: "auto" }}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Type</Table.Th>
            <Table.Th>ID</Table.Th>
            {showSize && <Table.Th>Size</Table.Th>}
            <Table.Th>Cached</Table.Th>
            {showAccessedAt && <Table.Th>Accessed</Table.Th>}
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sortedEntities.map((entity, idx) => (
            <Table.Tr key={`${entity.entityType}-${entity.entityId}-${idx}`}>
              <Table.Td>
                <EntityTypeBadge
                  entityType={entity.entityType}
                  color={getEntityTypeColor(entity.entityType)}
                  variant="light"
                />
              </Table.Td>
              <Table.Td>
                <Text size="xs" ff="monospace">{entity.entityId}</Text>
              </Table.Td>
              {showSize && (
                <Table.Td>
                  <Text size="xs" c="dimmed">{formatBytes(entity.dataSize)}</Text>
                </Table.Td>
              )}
              <Table.Td>
                <Text size="xs" c="dimmed">{formatTimeAgo(entity.cachedAt)}</Text>
              </Table.Td>
              {showAccessedAt && (
                <Table.Td>
                  <Text size="xs" c="dimmed">{formatTimeAgo(entity.lastAccessedAt)}</Text>
                </Table.Td>
              )}
              <Table.Td>
                <Tooltip label="View entity">
                  <ActionIcon
                    variant="subtle"
                    size="xs"
                    onClick={() => handleEntityClick(entity)}
                    aria-label={`View ${entity.entityType} ${entity.entityId}`}
                  >
                    <IconExternalLink size={ICON_SIZE.XS} />
                  </ActionIcon>
                </Tooltip>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  );
};
