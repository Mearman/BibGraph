/**
 * Citation Context Preview Component
 *
 * Shows citation relationships for works:
 * - Papers that cite this work (incoming citations)
 * - Papers this work cites (outgoing citations)
 * - Expandable snippets with metadata
 * - Links to navigate to related works
 *
 * @module components/entity-detail
 */

import {
  Accordion,
  Badge,
  Card,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowDown, IconArrowUp } from '@tabler/icons-react';
import { useMemo } from 'react';

import { ICON_SIZE } from '@/config/style-constants';
import type { RelationshipSection } from '@/types/relationship';

import { ENTITY_TYPE_CONFIGS } from './EntityTypeConfig';

interface CitationContextPreviewProps {
  /** Incoming relationship sections (includes CITED_BY) */
  incomingSections: RelationshipSection[];
  /** Outgoing relationship sections (includes REFERENCE) */
  outgoingSections: RelationshipSection[];
  /** Current work ID */
  workId: string;
}

const MAX_CITATIONS_PER_SECTION = 5;

/**
 * CitationContextPreview Component
 * @param root0
 * @param root0.incomingSections
 * @param root0.outgoingSections
 * @param root0.workId
 */
export const CitationContextPreview: React.FC<CitationContextPreviewProps> = ({
  incomingSections,
  outgoingSections,
  workId: _workId,
}) => {
  // Find citation-related sections
  const citedBySection = useMemo(() => {
    return incomingSections.find((s) => {
      // Check if first item is a work (cited by works)
      const firstItem = s.items[0];
      return s.type === 'REFERENCE' && firstItem && firstItem.sourceType === 'works';
    });
  }, [incomingSections]);

  const referencesSection = useMemo(() => {
    return outgoingSections.find((s) => {
      // Check if first item is a work (references to works)
      const firstItem = s.items[0];
      return s.type === 'REFERENCE' && firstItem && firstItem.targetType === 'works';
    });
  }, [outgoingSections]);

  // No citation data available
  if (!citedBySection && !referencesSection) {
    return null;
  }

  return (
    <Paper p="xl" radius="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <IconArrowUp size={ICON_SIZE.XL} color="var(--mantine-color-blue-6)" />
            <Title order={3}>Citation Context</Title>
          </Group>
        </Group>

        {/* Incoming citations (papers that cite this work) */}
        {citedBySection && (
          <Card withBorder p="md" shadow="sm">
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <IconArrowUp size={ICON_SIZE.SM} color="var(--mantine-color-green-6)" />
                  <Text size="sm" fw={500}>Cited by</Text>
                  <Badge size="sm" variant="light" color="green">
                    {citedBySection.totalCount} citations
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  Papers that cite this work
                </Text>
              </Group>

              <Accordion multiple defaultValue={[]}>
                {citedBySection.items.slice(0, MAX_CITATIONS_PER_SECTION).map((item) => (
                  <Accordion.Item key={item.id} value={item.id}>
                    <Accordion.Control>
                      <Group justify="space-between">
                        <Text size="sm" lineClamp={1} style={{ flex: 1 }}>
                          {item.displayName}
                        </Text>
                        {item.sourceType && (
                          <Badge size="xs" variant="light" color="blue">
                            {ENTITY_TYPE_CONFIGS[item.sourceType]?.name || item.sourceType}
                          </Badge>
                        )}
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="xs" p="xs">
                        <Text size="xs" c="dimmed">
                          ID: {item.id}
                        </Text>
                        {item.subtitle && (
                          <Text size="xs" c="dimmed">
                            {item.subtitle}
                          </Text>
                        )}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>

              {citedBySection.totalCount > MAX_CITATIONS_PER_SECTION && (
                <Text size="xs" c="dimmed" ta="center">
                  Showing {MAX_CITATIONS_PER_SECTION} of {citedBySection.totalCount} citations
                </Text>
              )}
            </Stack>
          </Card>
        )}

        {/* Outgoing citations (papers this work cites) */}
        {referencesSection && (
          <Card withBorder p="md" shadow="sm">
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <IconArrowDown size={ICON_SIZE.SM} color="var(--mantine-color-orange-6)" />
                  <Text size="sm" fw={500}>References</Text>
                  <Badge size="sm" variant="light" color="orange">
                    {referencesSection.totalCount} works
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  Papers cited by this work
                </Text>
              </Group>

              <Accordion multiple defaultValue={[]}>
                {referencesSection.items.slice(0, MAX_CITATIONS_PER_SECTION).map((item) => (
                  <Accordion.Item key={item.id} value={item.id}>
                    <Accordion.Control>
                      <Group justify="space-between">
                        <Text size="sm" lineClamp={1} style={{ flex: 1 }}>
                          {item.displayName}
                        </Text>
                        {item.targetType && (
                          <Badge size="xs" variant="light" color="violet">
                            {ENTITY_TYPE_CONFIGS[item.targetType]?.name || item.targetType}
                          </Badge>
                        )}
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="xs" p="xs">
                        <Text size="xs" c="dimmed">
                          ID: {item.id}
                        </Text>
                        {item.subtitle && (
                          <Text size="xs" c="dimmed">
                            {item.subtitle}
                          </Text>
                        )}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>

              {referencesSection.totalCount > MAX_CITATIONS_PER_SECTION && (
                <Text size="xs" c="dimmed" ta="center">
                  Showing {MAX_CITATIONS_PER_SECTION} of {referencesSection.totalCount} references
                </Text>
              )}
            </Stack>
          </Card>
        )}
      </Stack>
    </Paper>
  );
};
