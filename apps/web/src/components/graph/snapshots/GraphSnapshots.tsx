/**
 * Graph Snapshots Component
 *
 * UI for managing graph snapshots:
 * - Save current graph state
 * - Load from list
 * - Delete snapshots
 * - Share via URL
 */

import type { GraphEdge, GraphNode } from '@bibgraph/types';
import { RelationType } from '@bibgraph/types';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  List,
  Modal,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconCamera,
  IconClock,
  IconDownload,
  IconTrash,
} from '@tabler/icons-react';
import { useCallback, useMemo,useState  } from 'react';

import { ICON_SIZE } from '@/config/style-constants';
import type { GraphLayoutType } from '@/hooks/useGraphLayout';
import { useGraphSnapshots } from '@/hooks/useGraphSnapshots';

const AUTO_SAVE_LIMIT = 5;

// Relative-time thresholds used by formatDate below.
const MS_PER_MINUTE = 60000;
const MS_PER_HOUR = 3600000;
const MS_PER_DAY = 86400000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;

const GRAPH_LAYOUT_TYPES: readonly GraphLayoutType[] = ['force', 'hierarchical', 'circular', 'bipartite', 'timeline'];

const isGraphLayoutType = (value: string): value is GraphLayoutType =>
  GRAPH_LAYOUT_TYPES.some((type) => type === value);

const isGraphEdgeArray = (value: unknown): value is GraphEdge[] => {
  if (!Array.isArray(value)) return false;
  const relationTypes: readonly string[] = Object.values(RelationType);
  return value.every((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) return false;
    if (!('id' in entry) || typeof entry.id !== 'string') return false;
    if (!('source' in entry) || typeof entry.source !== 'string') return false;
    if (!('target' in entry) || typeof entry.target !== 'string') return false;
    if (!('type' in entry) || typeof entry.type !== 'string') return false;
    return relationTypes.includes(entry.type);
  });
};

interface GraphSnapshotsProperties {
  /**
  Current graph nodes
   */
  nodes: GraphNode[];
  /**
  Current graph edges (serialized)
   */
  edges: string;
  /**
  Current zoom level
   */
  zoom: number;
  /**
  Current pan X
   */
  panX: number;
  /**
  Current pan Y
   */
  panY: number;
  /**
  Current layout type
   */
  layoutType: GraphLayoutType;
  /**
  Node positions for static layouts
   */
  nodePositions?: Map<string, { x: number; y: number }>;
  /**
  Annotations (optional)
   */
  annotations?: unknown[];
  /**
  Callback when snapshot is loaded
   */
  onLoadSnapshot: (snapshot: {
    nodes: GraphNode[];
    edges: string;
    zoom: number;
    panX: number;
    panY: number;
    layoutType: GraphLayoutType;
    nodePositions?: Map<string, { x: number; y: number }>;
    annotations?: unknown[];
  }) => void;
}

/**
 * Graph snapshots management component
 */
export const GraphSnapshots: React.FC<GraphSnapshotsProperties> = ({
  nodes,
  edges,
  zoom,
  panX,
  panY,
  layoutType,
  nodePositions,
  annotations,
  onLoadSnapshot,
}) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [snapshotName, setSnapshotName] = useState('');

  const {
    manualSnapshots,
    autoSaveSnapshots,
    isLoading,
    saveSnapshot,
    deleteSnapshot,
    loadSnapshot,
  } = useGraphSnapshots();

  // Format date for display
  const formatDate = useCallback((date: Readonly<Date>) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / MS_PER_MINUTE);
    const diffHours = Math.floor(diffMs / MS_PER_HOUR);
    const diffDays = Math.floor(diffMs / MS_PER_DAY);

    if (diffMins < 1) return 'Just now';
    if (diffMins < MINUTES_PER_HOUR) return `${String(diffMins)}m ago`;
    if (diffHours < HOURS_PER_DAY) return `${String(diffHours)}h ago`;
    if (diffDays < DAYS_PER_WEEK) return `${String(diffDays)}d ago`;

    return date.toLocaleDateString();
  }, []);

  // Parse edges from JSON string
  const parsedEdges = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(edges);
      return isGraphEdgeArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [edges]);

  // Handle save snapshot
  const handleSaveSnapshot = useCallback(async () => {
    const name = snapshotName.trim() || `Snapshot ${new Date().toLocaleString()}`;

    try {
      await saveSnapshot({
        name,
        nodes,
        edges: parsedEdges,
        zoom,
        panX,
        panY,
        layoutType,
        nodePositions,
        annotations,
        isAutoSave: false,
      });

      notifications.show({
        title: 'Snapshot Saved',
        message: `Graph state saved as "${name}"`,
        color: 'green',
      });

      setSnapshotName('');
      close();
    } catch (error) {
      notifications.show({
        title: 'Save Failed',
        message: error instanceof Error ? error.message : 'Failed to save snapshot',
        color: 'red',
      });
    }
  }, [snapshotName, nodes, parsedEdges, zoom, panX, panY, layoutType, nodePositions, annotations, saveSnapshot, close]);

  // Handle load snapshot
  const handleLoadSnapshot = useCallback(async (id: string) => {
    try {
      const snapshot = await loadSnapshot(id);

      if (!snapshot) {
        notifications.show({
          title: 'Load Failed',
          message: 'Snapshot not found',
          color: 'red',
        });
        return;
      }

      onLoadSnapshot({
        nodes: snapshot.nodes,
        edges: JSON.stringify(snapshot.edges),
        zoom: snapshot.zoom,
        panX: snapshot.panX,
        panY: snapshot.panY,
        layoutType: isGraphLayoutType(snapshot.layoutType) ? snapshot.layoutType : layoutType,
        nodePositions: snapshot.nodePositions,
        annotations: snapshot.annotations,
      });

      notifications.show({
        title: 'Snapshot Loaded',
        message: `Loaded "${snapshot.name}"`,
        color: 'green',
      });

      close();
    } catch (error) {
      notifications.show({
        title: 'Load Failed',
        message: error instanceof Error ? error.message : 'Failed to load snapshot',
        color: 'red',
      });
    }
  }, [loadSnapshot, onLoadSnapshot, close, layoutType]);

  // Handle delete snapshot
  const handleDeleteSnapshot = useCallback(async (id: string) => {
    try {
      await deleteSnapshot(id);

      notifications.show({
        title: 'Snapshot Deleted',
        message: 'Snapshot has been deleted',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Delete Failed',
        message: error instanceof Error ? error.message : 'Failed to delete snapshot',
        color: 'red',
      });
    }
  }, [deleteSnapshot]);

  return (
    <>
      {/* Save button in toolbar */}
      <Tooltip label="Save graph snapshot">
        <ActionIcon variant="light" onClick={open} aria-label="Save graph snapshot">
          <IconCamera size={ICON_SIZE.MD} />
        </ActionIcon>
      </Tooltip>

      {/* Snapshots modal */}
      <Modal opened={opened} onClose={close} title="Graph Snapshots" size="md">
        <Stack gap="md">
          {/* Save new snapshot */}
          <Group gap="xs">
            <TextInput
              placeholder="Snapshot name (optional)"
              value={snapshotName}
              onChange={(event) => { setSnapshotName(event.currentTarget.value); }}
              style={{ flex: 1 }}
            />
            <Button onClick={() => { void handleSaveSnapshot(); }} leftSection={<IconCamera size={ICON_SIZE.SM} />}>
              Save
            </Button>
          </Group>

          <Divider label="Saved Snapshots" labelPosition="left" />

          {/* Manual snapshots list */}
          {isLoading ? (
            <Text c="dimmed" ta="center" size="sm">
              Loading snapshots...
            </Text>
          ) : manualSnapshots.length === 0 ? (
            <Text c="dimmed" ta="center" size="sm">
              No saved snapshots yet. Save your current graph state to create one.
            </Text>
          ) : (
            <List spacing="xs" size="sm">
              {manualSnapshots.map((snapshot) => (
                <List.Item key={snapshot.id}>
                  <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>
                        {snapshot.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {formatDate(snapshot.createdAt)} • {snapshot.nodes.length} nodes, {snapshot.edges.length} edges
                      </Text>
                    </Box>
                    <Group gap="xs">
                      <Tooltip label="Load snapshot">
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          onClick={() => { void handleLoadSnapshot(snapshot.id); }}
                          aria-label="Load snapshot"
                        >
                          <IconDownload size={ICON_SIZE.SM} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete snapshot">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => { void handleDeleteSnapshot(snapshot.id); }}
                          aria-label="Delete snapshot"
                        >
                          <IconTrash size={ICON_SIZE.SM} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Box>
                </List.Item>
              ))}
            </List>
          )}

          {/* Auto-saves section */}
          {autoSaveSnapshots.length > 0 && (
            <>
              <Divider
                label={
                  <Group gap="xs">
                    <IconClock size={ICON_SIZE.XS} />
                    Auto-saves
                    <Badge size="xs" variant="light">
                      {autoSaveSnapshots.length} / {AUTO_SAVE_LIMIT}
                    </Badge>
                  </Group>
                }
                labelPosition="left"
              />
              <List spacing="xs" size="sm">
                {autoSaveSnapshots.slice(0, AUTO_SAVE_LIMIT).map((snapshot) => (
                  <List.Item key={snapshot.id}>
                    <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box style={{ flex: 1 }}>
                        <Text size="sm" c="dimmed">
                          {snapshot.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {formatDate(snapshot.createdAt)} • {snapshot.nodes.length} nodes
                        </Text>
                      </Box>
                      <Group gap="xs">
                        <Tooltip label="Load auto-save">
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            onClick={() => { void handleLoadSnapshot(snapshot.id); }}
                            aria-label="Load auto-save"
                          >
                            <IconDownload size={ICON_SIZE.SM} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Box>
                  </List.Item>
                ))}
              </List>
            </>
          )}
        </Stack>
      </Modal>
    </>
  );
};
