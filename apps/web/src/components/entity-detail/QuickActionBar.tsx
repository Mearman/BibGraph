/**
 * Quick Actions Bar for Entity Detail Pages
 *
 * Sticky bar below header with one-click actions:
 * - Add to bookmarks
 * - Add to graph
 * - Add to list
 * - Show current state indicators
 */

import type { EntityType } from '@bibgraph/types';
import { ActionIcon, Box, Group, Menu, Text, Tooltip } from '@mantine/core';
import {
  IconBookmark,
  IconBookmarkFilled,
  IconList,
  IconListCheck,
  IconNetwork,
  IconPlus,
} from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';

import { useBookmarks } from '@/hooks/useBookmarks';
import { useCatalogue } from '@/hooks/useCatalogue';
import { useGraphList } from '@/hooks/useGraphList';

interface QuickActionBarProperties {
  /**
  Entity ID
   */
  entityId: string;
  /**
  Entity type
   */
  entityType: EntityType;
  /**
  Display name
   */
  displayName: string;
}

/**
 * QuickActionBar Component
 */
export const QuickActionBar: React.FC<QuickActionBarProperties> = ({
  entityId,
  entityType,
  displayName,
}) => {
  const navigate = useNavigate();
  const { bookmarks, addBookmark, removeBookmark } = useBookmarks();
  const { lists } = useCatalogue();
  const { addNode, nodes } = useGraphList();

  // Derived directly from the hook data on every render - no separate state or effect needed to keep these in sync with `bookmarks`/`nodes`.
  const localIsBookmarked = bookmarks.some((b) => b.id === entityId);
  const localIsInGraph = nodes.some((n) => n.id === entityId);

  // Handle bookmark toggle
  const handleBookmarkToggle = useCallback(async () => {
    if (localIsBookmarked) {
      await removeBookmark(entityId);
    } else {
      await addBookmark({
        entityType,
        entityId,
      });
    }
  }, [localIsBookmarked, removeBookmark, addBookmark, entityId, entityType]);

  // Handle add to graph
  const handleAddToGraph = useCallback(async () => {
    await addNode({
      entityId,
      entityType,
      label: displayName,
      provenance: 'user',
    });
  }, [addNode, entityId, entityType, displayName]);

  // Handle add to list
  const handleAddToList = useCallback(
    (_listId: string) => {
      // Navigate to catalogue with list selection
      void navigate({
        to: '/catalogue',
      });
    },
    [navigate]
  );

  return (
    <Box
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'var(--mantine-color-body)',
        borderBottom: '1px solid var(--mantine-color-gray-3)',
        padding: '12px 16px',
      }}
    >
      <Group justify="space-between">
        <Group gap="xs">
          {/* Bookmark button */}
          <Tooltip label={localIsBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}>
            <ActionIcon
              variant={localIsBookmarked ? 'filled' : 'subtle'}
              color="blue"
              size="lg"
              onClick={() => { void handleBookmarkToggle(); }}
            >
              {localIsBookmarked ? <IconBookmarkFilled size={20} /> : <IconBookmark size={20} />}
            </ActionIcon>
          </Tooltip>

          {/* Add to graph button */}
          <Tooltip label={localIsInGraph ? 'Already in graph' : 'Add to graph'}>
            <ActionIcon
              variant={localIsInGraph ? 'filled' : 'subtle'}
              color="green"
              size="lg"
              onClick={() => { void handleAddToGraph(); }}
              disabled={localIsInGraph}
            >
              {localIsInGraph ? <IconListCheck size={20} /> : <IconNetwork size={20} />}
            </ActionIcon>
          </Tooltip>

          {/* Add to list dropdown */}
          <Menu position="bottom-start">
            <Menu.Target>
              <ActionIcon variant="subtle" color="orange" size="lg">
                <IconList size={20} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>
                <Text size="sm" fw={500}>
                  Add to List
                </Text>
              </Menu.Label>
              {lists.length === 0 ? (
                <Menu.Item disabled>
                  <Text size="sm" c="dimmed">
                    No lists available. Create one in Catalogue.
                  </Text>
                </Menu.Item>
              ) : (
                lists.map((list) => (
                  <Menu.Item
                    key={list.id}
                    leftSection={<IconList size={14} />}
                    onClick={() => { handleAddToList(list.id ?? ''); }}
                  >
                    <Text size="sm">{list.title}</Text>
                  </Menu.Item>
                ))
              )}
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconPlus size={14} />}
                onClick={() => { void navigate({ to: '/catalogue' }); }}
              >
                <Text size="sm">Create New List</Text>
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        {/* Status indicator */}
        <Group gap="xs">
          {localIsBookmarked && (
            <Text size="xs" c="blue">
              <IconBookmarkFilled size={12} style={{ verticalAlign: 'middle' }} />
              {' '}
              Bookmarked
            </Text>
          )}
          {localIsInGraph && (
            <Text size="xs" c="green">
              <IconListCheck size={12} style={{ verticalAlign: 'middle' }} />
              {' '}
              In Graph
            </Text>
          )}
        </Group>
      </Group>
    </Box>
  );
};
