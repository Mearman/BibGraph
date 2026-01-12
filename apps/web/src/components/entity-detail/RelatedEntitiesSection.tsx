/**
 * Related Entities Section Component
 *
 * Shows related works, authors, venues for an entity with bulk actions.
 *
 * @module components/entity-detail
 */

import { type EntityType } from '@bibgraph/types';
import { logger } from '@bibgraph/utils';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Menu,
  Paper,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconChevronDown, IconListCheck, IconPhoto, IconX } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';

import { ICON_SIZE } from '@/config/style-constants';
import { useCatalogue } from '@/hooks/useCatalogue';
import { useGraphList } from '@/hooks/useGraphList';
import { type RelationshipSection } from '@/types/relationship';

import { ENTITY_TYPE_CONFIGS, getMantineColor } from './EntityTypeConfig';

const MAX_ENTITIES_PER_TYPE = 20;

interface RelatedEntitiesSectionProps {
  /** Incoming relationship sections */
  incomingSections: RelationshipSection[];
  /** Outgoing relationship sections */
  outgoingSections: RelationshipSection[];
  /** Current entity ID */
  entityId: string;
  /** Current entity type */
  entityType: EntityType;
}

interface GroupedEntities {
  /** Relationship type (e.g., 'AUTHORSHIP', 'REFERENCE') */
  type: string;
  /** Section label */
  label: string;
  /** Entity type of the related entities */
  targetEntityType: EntityType;
  /** Direction of the relationship */
  direction: 'inbound' | 'outbound';
  /** Related entities */
  items: Array<{
    id: string;
    displayName: string;
    targetId: string;
  }>;
  /** Total count (including those not shown) */
  totalCount: number;
}

/**
 * Related Entities Section Component
 * @param root0
 * @param root0.incomingSections
 * @param root0.outgoingSections
 * @param root0.entityId
 * @param root0.entityType
 */
export const RelatedEntitiesSection: React.FC<RelatedEntitiesSectionProps> = ({
  incomingSections,
  outgoingSections,
  entityId: _entityId,
  entityType: _entityType,
}) => {
  const { addNodesBatch } = useGraphList();
  const { lists, addEntitiesToList } = useCatalogue();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string | null>(null);
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [isAddingToGraph, setIsAddingToGraph] = useState(false);

  // Group entities by relationship type and target entity type
  const groupedEntities = useMemo<GroupedEntities[]>(() => {
    const groups = new Map<string, GroupedEntities>();

    const processSection = (section: RelationshipSection, direction: 'inbound' | 'outbound') => {
      // Get target entity type from items
      const firstItem = section.items[0];
      if (!firstItem) return;

      const targetEntityType = direction === 'outbound' ? firstItem.targetType : firstItem.sourceType;

      const key = `${section.type}-${targetEntityType}`;
      const existing = groups.get(key);

      const entities = section.items
        .slice(0, MAX_ENTITIES_PER_TYPE)
        .map((item) => ({
          id: item.id,
          displayName: item.displayName,
          targetId: direction === 'outbound' ? item.targetId : item.sourceId,
        }));

      if (existing) {
        existing.items.push(...entities);
        existing.totalCount += section.totalCount;
      } else {
        groups.set(key, {
          type: section.type,
          label: section.label,
          targetEntityType,
          direction,
          items: entities,
          totalCount: section.totalCount,
        });
      }
    };

    incomingSections.forEach((section) => processSection(section, 'inbound'));
    outgoingSections.forEach((section) => processSection(section, 'outbound'));

    return [...groups.values()];
  }, [incomingSections, outgoingSections]);

  // Filter by type and search query
  const filteredGroups = useMemo(() => {
    let groups = groupedEntities;

    if (selectedTypeFilter) {
      groups = groups.filter((group) => group.type === selectedTypeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      groups = groups.map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.displayName.toLowerCase().includes(query)
        ),
      })).filter((group) => group.items.length > 0);
    }

    return groups;
  }, [groupedEntities, selectedTypeFilter, searchQuery]);

  // Unique relationship type filters
  const typeFilters = useMemo(() => {
    const types = new Set(groupedEntities.map((g) => g.type));
    return [...types].sort();
  }, [groupedEntities]);

  // Handle entity selection toggle
  const toggleEntitySelection = useCallback((entityId: string) => {
    setSelectedEntities((prev) => {
      const next = new Set(prev);
      if (next.has(entityId)) {
        next.delete(entityId);
      } else {
        next.add(entityId);
      }
      return next;
    });
  }, []);

  // Select all visible entities
  const selectAllVisible = useCallback(() => {
    const allIds = new Set<string>();
    filteredGroups.forEach((group) => {
      group.items.forEach((item) => {
        allIds.add(item.targetId);
      });
    });
    setSelectedEntities(allIds);
  }, [filteredGroups]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedEntities(new Set());
  }, []);

  // Helper: Find item by targetId and get its group
  const findItemAndGroup = useCallback(
    (targetId: string) => {
      for (const group of filteredGroups) {
        const item = group.items.find((i) => i.targetId === targetId);
        if (item) return { item, group };
      }
      return null;
    },
    [filteredGroups]
  );

  // Helper: Convert selected entities to graph entities
  const buildGraphEntities = useCallback(() => {
    return [...selectedEntities].flatMap((targetId) => {
      const result = findItemAndGroup(targetId);
      if (!result) return [];
      const { item, group } = result;
      return [
        {
          entityId: item.targetId,
          entityType: group.targetEntityType,
          label: item.displayName,
          provenance: 'user' as const,
        },
      ];
    });
  }, [selectedEntities, findItemAndGroup]);

  // Helper: Convert selected entities to list entities
  const buildListEntities = useCallback(() => {
    return [...selectedEntities].flatMap((targetId) => {
      const result = findItemAndGroup(targetId);
      if (!result) return [];
      const { item, group } = result;
      return [
        {
          entityType: group.targetEntityType,
          entityId: item.targetId,
        },
      ];
    });
  }, [selectedEntities, findItemAndGroup]);

  // Bulk add to graph
  const handleAddToGraph = useCallback(async () => {
    if (selectedEntities.size === 0) return;

    setIsAddingToGraph(true);
    try {
      const entities = buildGraphEntities();
      await addNodesBatch(entities);
      notifications.show({
        title: 'Added to Graph',
        message: `${selectedEntities.size} entities added to graph for analysis`,
        color: 'green',
      });
      clearSelection();
    } catch (error) {
      logger.error('ui', 'Failed to add entities to graph', { error, count: selectedEntities.size });
      notifications.show({
        title: 'Error',
        message: 'Failed to add entities to graph',
        color: 'red',
      });
    } finally {
      setIsAddingToGraph(false);
    }
  }, [selectedEntities, buildGraphEntities, addNodesBatch, clearSelection]);

  // Bulk add to list
  const handleAddToList = useCallback(
    async (listId: string) => {
      if (selectedEntities.size === 0) return;

      try {
        const entities = buildListEntities();
        await addEntitiesToList(listId, entities);
        notifications.show({
          title: 'Added to List',
          message: `${selectedEntities.size} entities added to list`,
          color: 'green',
        });
        clearSelection();
      } catch (error) {
        logger.error('ui', 'Failed to add entities to list', { error, count: selectedEntities.size });
        notifications.show({
          title: 'Error',
          message: 'Failed to add entities to list',
          color: 'red',
        });
      }
    },
    [selectedEntities, buildListEntities, addEntitiesToList, clearSelection]
  );

  // Get entity type config
  const getEntityTypeConfig = (targetEntityType: EntityType) => ENTITY_TYPE_CONFIGS[targetEntityType];

  return (
    <Paper p="xl" radius="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <IconPhoto size={ICON_SIZE.XL} color="var(--mantine-color-blue-6)" />
            <Text size="xl" fw={600}>Related Entities</Text>
            <Badge size="lg" variant="light">
              {groupedEntities.reduce((sum, group) => sum + group.totalCount, 0)}
            </Badge>
          </Group>

          {/* Bulk actions */}
          {selectedEntities.size > 0 && (
            <Group gap="xs">
              <Text size="sm" c="dimmed">{selectedEntities.size} selected</Text>
              <Button
                size="xs"
                variant="light"
                color="grape"
                leftSection={<IconPhoto size={ICON_SIZE.SM} />}
                onClick={handleAddToGraph}
                loading={isAddingToGraph}
              >
                Add to Graph
              </Button>
              <Menu position="bottom-end" shadow="md">
                <Menu.Target>
                  <Button
                    size="xs"
                    variant="light"
                    color="green"
                    leftSection={<IconListCheck size={ICON_SIZE.SM} />}
                    rightSection={<IconChevronDown size={ICON_SIZE.SM} />}
                  >
                    Add to List
                  </Button>
                </Menu.Target>

                <Menu.Dropdown>
                  {lists.length === 0 ? (
                    <Menu.Item disabled>No lists available</Menu.Item>
                  ) : (
                    lists.filter((list): list is typeof list & { id: string } => list.id !== undefined).map((list) => (
                      <Menu.Item
                        key={list.id}
                        onClick={() => handleAddToList(list.id)}
                      >
                        {list.title}
                      </Menu.Item>
                    ))
                  )}
                </Menu.Dropdown>
              </Menu>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                onClick={clearSelection}
              >
                <IconX size={ICON_SIZE.SM} />
              </ActionIcon>
            </Group>
          )}
        </Group>

        {/* Search and filters */}
        <Group gap="sm">
          <TextInput
            placeholder="Search related entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ flex: 1 }}
            size="sm"
          />

          {typeFilters.map((type) => (
            <Badge
              key={type}
              variant={selectedTypeFilter === type ? 'filled' : 'light'}
              color={selectedTypeFilter === type ? 'blue' : 'gray'}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedTypeFilter(selectedTypeFilter === type ? null : type)}
            >
              {type}
            </Badge>
          ))}

          {selectedTypeFilter && (
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              onClick={() => setSelectedTypeFilter(null)}
            >
              <IconX size={ICON_SIZE.SM} />
            </ActionIcon>
          )}

          <Button
            size="xs"
            variant="subtle"
            onClick={selectAllVisible}
            disabled={selectedEntities.size > 0}
          >
            Select All
          </Button>
        </Group>

        {/* Related entities by type */}
        {filteredGroups.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            No related entities found
          </Text>
        ) : (
          <Stack gap="md">
            {filteredGroups.map((group) => {
              const config = getEntityTypeConfig(group.targetEntityType);
              const color = getMantineColor(group.targetEntityType);
              return (
                <Card key={group.type} shadow="sm" padding="sm" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group justify="space-between" align="center">
                      <Group gap="xs">
                        <Badge
                          size="sm"
                          variant="light"
                          color="gray"
                          leftSection={
                            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                              {config.icon}
                            </svg>
                          }
                        >
                          {config.name}
                        </Badge>
                        <Text size="xs" c="dimmed">{group.label}</Text>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {group.items.length} / {group.totalCount}
                      </Text>
                    </Group>

                    <Stack gap="xs">
                      {group.items.map((item) => {
                        const isSelected = selectedEntities.has(item.targetId);
                        return (
                          <Group
                            key={item.id}
                            gap="xs"
                            p="xs"
                            style={{
                              borderRadius: '4px',
                              backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : undefined,
                              cursor: 'pointer',
                            }}
                            onClick={() => toggleEntitySelection(item.targetId)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleEntitySelection(item.targetId)}
                              size="xs"
                            />
                            <Text size="sm" style={{ flex: 1 }} lineClamp={1}>
                              {item.displayName}
                            </Text>
                            <Badge
                              size="xs"
                              variant="light"
                              color={color}
                            >
                              {config.name}
                            </Badge>
                          </Group>
                        );
                      })}
                    </Stack>

                    {group.totalCount > MAX_ENTITIES_PER_TYPE && (
                      <Text size="xs" c="dimmed" ta="center">
                        Showing {MAX_ENTITIES_PER_TYPE} of {group.totalCount} related {config.name.toLowerCase()}
                      </Text>
                    )}
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};
