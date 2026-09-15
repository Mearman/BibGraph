/**
 * Context menu for graph nodes
 *
 * Provides actions for interacting with nodes:
 * - Expand (fetch relationships)
 * - View details (navigate to entity page)
 * - Set as path source/target
 */

import type { EntityType,GraphNode } from '@bibgraph/types';
import { Loader,Menu, Portal, Text } from '@mantine/core';
import {
  IconArrowsMaximize,
  IconExternalLink,
  IconRoute,
  IconTarget,
  IconX,
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import React, { useCallback, useEffect, useRef } from 'react';

import { ICON_SIZE } from '@/config/style-constants';

import { ENTITY_TYPE_COLORS } from '../../styles/hash-colors';

/**
 * State for the context menu position and target node
 */
export interface ContextMenuState {
  /**
  Whether the menu is visible
   */
  opened: boolean;
  /**
  X position (client coordinates)
   */
  x: number;
  /**
  Y position (client coordinates)
   */
  y: number;
  /**
  The node that was right-clicked
   */
  node: GraphNode | null;
}

/**
 * Initial state for context menu (closed)
 */
export const INITIAL_CONTEXT_MENU_STATE: ContextMenuState = {
  opened: false,
  x: 0,
  y: 0,
  node: null,
};

export interface NodeContextMenuProps {
  /**
  Context menu state
   */
  state: ContextMenuState;
  /**
  Callback to close the menu
   */
  onClose: () => void;
  /**
  Callback to expand the node
   */
  onExpand?: (node: GraphNode) => void;
  /**
  Callback to set node as path source
   */
  onSetPathSource?: (nodeId: string) => void;
  /**
  Callback to set node as path target
   */
  onSetPathTarget?: (nodeId: string) => void;
  /**
  Check if node is currently expanding
   */
  isExpanding?: (nodeId: string) => boolean;
  /**
  Check if node is already expanded
   */
  isExpanded?: (nodeId: string) => boolean;
  /**
  Current path source (to show indicator)
   */
  pathSource?: string | null;
  /**
  Current path target (to show indicator)
   */
  pathTarget?: string | null;
}

/**
 * Get route path for an entity type
 */
const getEntityRoute = (entityType: EntityType): string => {
  const routes: Record<EntityType, string> = {
    works: '/works',
    authors: '/authors',
    sources: '/sources',
    institutions: '/institutions',
    topics: '/topics',
    publishers: '/publishers',
    funders: '/funders',
    concepts: '/concepts',
    keywords: '/keywords',
    domains: '/domains',
    fields: '/fields',
    subfields: '/subfields',
  };
  return routes[entityType] || '/works';
};

/**
 * Context menu for graph nodes
 *
 * Renders a Mantine Menu positioned at the click location.
 * Uses Portal to ensure proper stacking above the graph canvas.
 */
export const NodeContextMenu = ({
  state,
  onClose,
  onExpand,
  onSetPathSource,
  onSetPathTarget,
  isExpanding,
  isExpanded,
  pathSource,
  pathTarget,
}: NodeContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { opened, x, y, node } = state;

  // Close menu on click outside
  useEffect(() => {
    if (!opened) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && event.target instanceof Node && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    // Use capture phase to catch clicks before they bubble
    document.addEventListener('click', handleClickOutside, {capture: true});
    document.addEventListener('contextmenu', handleClickOutside, {capture: true});

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('contextmenu', handleClickOutside, true);
    };
  }, [opened, onClose]);

  // Close on escape key
  useEffect(() => {
    if (!opened) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); };
  }, [opened, onClose]);

  const handleExpand = useCallback(() => {
    if (node && onExpand) {
      onExpand(node);
    }
    onClose();
  }, [node, onExpand, onClose]);

  const handleSetPathSource = useCallback(() => {
    if (node && onSetPathSource) {
      onSetPathSource(node.id);
    }
    onClose();
  }, [node, onSetPathSource, onClose]);

  const handleSetPathTarget = useCallback(() => {
    if (node && onSetPathTarget) {
      onSetPathTarget(node.id);
    }
    onClose();
  }, [node, onSetPathTarget, onClose]);

  if (!opened || !node) {
    return null;
  }

  const nodeColor = ENTITY_TYPE_COLORS[node.entityType] || 'var(--mantine-color-gray-6)';
  const isNodeIsExpanding = isExpanding?.(node.id) ?? false;
  const isNodeIsExpanded = isExpanded?.(node.id) ?? false;
  const isCurrentPathSource = pathSource === node.id;
  const isCurrentPathTarget = pathTarget === node.id;

  // Build the entity details route
  const detailsRoute = `${getEntityRoute(node.entityType)}/${node.id}`;

  return (
    <Portal>
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          left: x,
          top: y,
          zIndex: 1000,
        }}
      >
        <Menu
          opened={opened}
          onClose={onClose}
          position="bottom-start"
          withinPortal={false}
          shadow="md"
          width={220}
        >
          <Menu.Dropdown>
            {/* Node header */}
            <Menu.Label>
              <Text
                size="xs"
                fw={600}
                style={{ color: nodeColor }}
                lineClamp={1}
              >
                {node.label || node.id}
              </Text>
              <Text size="xs" c="dimmed" tt="capitalize">
                {node.entityType}
              </Text>
            </Menu.Label>

            <Menu.Divider />

            {/* Expand node */}
            <Menu.Item
              leftSection={
                isNodeIsExpanding ? (
                  <Loader size={ICON_SIZE.SM} />
                ) : (
                  <IconArrowsMaximize size={ICON_SIZE.SM} />
                )
              }
              onClick={handleExpand}
              disabled={isNodeIsExpanding || isNodeIsExpanded}
            >
              {isNodeIsExpanding
                ? 'Expanding...'
                : (isNodeIsExpanded
                  ? 'Already expanded'
                  : 'Expand relationships')}
            </Menu.Item>

            {/* View details */}
            <Menu.Item
              component={Link}
              to={detailsRoute}
              leftSection={<IconExternalLink size={ICON_SIZE.SM} />}
              onClick={onClose}
            >
              View details
            </Menu.Item>

            <Menu.Divider />

            {/* Path selection */}
            <Menu.Label>Path Selection</Menu.Label>

            <Menu.Item
              leftSection={<IconRoute size={ICON_SIZE.SM} />}
              onClick={handleSetPathSource}
              disabled={isCurrentPathSource}
              rightSection={
                isCurrentPathSource ? (
                  <Text size="xs" c="dimmed">
                    current
                  </Text>
                ) : null
              }
            >
              Set as source
            </Menu.Item>

            <Menu.Item
              leftSection={<IconTarget size={ICON_SIZE.SM} />}
              onClick={handleSetPathTarget}
              disabled={isCurrentPathTarget}
              rightSection={
                isCurrentPathTarget ? (
                  <Text size="xs" c="dimmed">
                    current
                  </Text>
                ) : null
              }
            >
              Set as target
            </Menu.Item>

            <Menu.Divider />

            {/* Close */}
            <Menu.Item leftSection={<IconX size={ICON_SIZE.SM} />} onClick={onClose}>
              Close
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
    </Portal>
  );
};
