/**
 * Graph Legend Component
 *
 * Displays legend for graph visualization:
 * - Entity type colors
 * - Edge type meanings
 * - Relationship direction indicators
 *
 * @module components/graph/GraphLegend
 */

import type { EntityType } from '@bibgraph/types';
import { ActionIcon, Box, CloseIcon, Flex, Paper, Stack, Text, Title, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconInfoCircle } from '@tabler/icons-react';
import { useMemo } from 'react';

import { ICON_SIZE } from '@/config/style-constants';
import { ENTITY_TYPE_COLORS as HASH_BASED_ENTITY_COLORS } from '@/styles/hash-colors';

interface GraphLegendProps {
  /** Entity types present in the graph */
  entityTypes: EntityType[];
  /** Whether to show edge types in legend */
  showEdgeTypes?: boolean;
  /** Position variant */
  position?: 'top-right' | 'bottom-left';
}

/**
 * Entity type display names
 */
const ENTITY_TYPE_NAMES: Record<EntityType, string> = {
  works: 'Works',
  authors: 'Authors',
  sources: 'Sources',
  publishers: 'Publishers',
  institutions: 'Institutions',
  funders: 'Funders',
  topics: 'Topics',
  concepts: 'Concepts',
  keywords: 'Keywords',
  domains: 'Domains',
  fields: 'Fields',
  subfields: 'Subfields',
} as const;

/**
 * Entity type descriptions
 */
const ENTITY_TYPE_DESCRIPTIONS: Record<EntityType, string> = {
  works: 'Publications, datasets, software, and other research outputs',
  authors: 'Researchers, authors, and contributors',
  sources: 'Venues where works are published (journals, conferences)',
  publishers: 'Organizations that publish sources',
  institutions: 'Affiliations of authors',
  funders: 'Funding agencies and grants',
  topics: 'Research topics and themes',
  concepts: 'Concepts and tags',
  keywords: 'Keywords and phrases',
  domains: 'High-level research domains',
  fields: 'Specialized research fields',
  subfields: 'Specialized subfields within domains',
} as const;

/**
 * Edge type descriptions
 */
const EDGE_TYPES = [
  {
    type: 'cites',
    description: 'Citation relationship',
    color: '#94a3b8',
    icon: '→',
  },
  {
    type: 'authored',
    description: 'Authorship relationship',
    color: '#60a5fa',
    icon: '—',
  },
  {
    type: 'affiliated_with',
    description: 'Affiliation relationship',
    color: '#34d399',
    icon: '⋔',
  },
] as const;

/**
 * Graph Legend Component
 * @param root0
 * @param root0.entityTypes
 * @param root0.showEdgeTypes
 * @param root0.position
 */
export const GraphLegend: React.FC<GraphLegendProps> = ({
  entityTypes,
  showEdgeTypes = true,
  position = 'top-right',
}) => {
  const [opened, { toggle }] = useDisclosure(false);

  // Get unique entity types and sort alphabetically
  const sortedEntityTypes = useMemo(() => {
    return [...new Set(entityTypes)].sort();
  }, [entityTypes]);

  // Position styles
  const positionStyles = {
    'top-right': {
      top: 16,
      right: 16,
    },
    'bottom-left': {
      bottom: 16,
      left: 16,
    },
  };

  return (
    <>
      {/* Legend toggle button */}
      <Tooltip label={opened ? 'Hide legend' : 'Show legend'}>
        <ActionIcon
          variant={opened ? 'filled' : 'light'}
          onClick={toggle}
          aria-label="Toggle graph legend"
          style={{
            position: 'absolute',
            ...positionStyles[position],
            zIndex: 101,
          }}
        >
          <IconInfoCircle size={ICON_SIZE.MD} />
        </ActionIcon>
      </Tooltip>

      {/* Legend panel */}
      {opened && (
        <Paper
          shadow="sm"
          p="md"
          withBorder
          style={{
            position: 'absolute',
            top: 60,
            right: 16,
            width: 280,
            maxHeight: 'calc(100vh - 200px)',
            overflow: 'auto',
            zIndex: 100,
          }}
        >
          <Stack gap="sm">
            {/* Header */}
            <Flex justify="space-between" align="center">
              <Title order={6}>Graph Legend</Title>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={toggle}
                aria-label="Close legend"
              >
                <CloseIcon size="16" />
              </ActionIcon>
            </Flex>

            {/* Entity types */}
            <Box>
              <Text size="sm" fw={500} c="dimmed">
                Entity Types ({sortedEntityTypes.length})
              </Text>
              <Stack gap="xs" mt="xs">
                {sortedEntityTypes.map((type) => (
                  <Box key={type}>
                    <Flex gap="xs" align="center">
                      <Box
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: HASH_BASED_ENTITY_COLORS[type],
                          flexShrink: 0,
                        }}
                      />
                      <Text size="sm" fw={500}>
                        {ENTITY_TYPE_NAMES[type]}
                      </Text>
                    </Flex>
                    {ENTITY_TYPE_DESCRIPTIONS[type] && (
                      <Text size="xs" c="dimmed" ml="xl">
                        {ENTITY_TYPE_DESCRIPTIONS[type]}
                      </Text>
                    )}
                  </Box>
                ))}
              </Stack>
            </Box>

            {/* Edge types */}
            {showEdgeTypes && (
              <>
                <Box>
                  <Text size="sm" fw={500} c="dimmed">
                    Edge Types
                  </Text>
                  <Stack gap="xs" mt="xs">
                    {EDGE_TYPES.map((edgeType) => (
                      <Box key={edgeType.type}>
                        <Flex gap="xs" align="center">
                          <Text
                            size="sm"
                            style={{
                              color: edgeType.color,
                              fontFamily: 'monospace',
                              fontWeight: 700,
                            }}
                          >
                            {edgeType.icon}
                          </Text>
                          <Text size="sm" fw={500}>
                            {edgeType.type}
                          </Text>
                        </Flex>
                        <Text size="xs" c="dimmed" ml="xl">
                          {edgeType.description}
                        </Text>
                      </Box>
                    ))}
                  </Stack>
                </Box>

                {/* Direction indicator */}
                <Box>
                  <Text size="sm" fw={500} c="dimmed">
                    Direction
                  </Text>
                  <Stack gap="xs" mt="xs">
                    <Flex gap="xs" align="center">
                      <Text
                        size="sm"
                        style={{
                          color: '#94a3b8',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                        }}
                      >
                        →
                      </Text>
                      <Text size="xs" c="dimmed">
                        Directional relationship
                      </Text>
                    </Flex>
                    <Flex gap="xs" align="center">
                      <Text
                        size="sm"
                        style={{
                          color: '#94a3b8',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                        }}
                      >
                        —
                      </Text>
                      <Text size="xs" c="dimmed">
                        Undirected relationship
                      </Text>
                    </Flex>
                  </Stack>
                </Box>
              </>
            )}
          </Stack>
        </Paper>
      )}
    </>
  );
};
