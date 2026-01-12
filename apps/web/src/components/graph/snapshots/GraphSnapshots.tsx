/**
 * Graph Snapshots Component
 *
 * UI for managing graph snapshots:
 * - Save current graph state
 * - Load from list
 * - Delete snapshots
 * - Share via URL
 *
 * @module components/graph/snapshots/GraphSnapshots
 */

import type { GraphNode } from '@bibgraph/types';
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

interface GraphSnapshotsProps {
  /** Current graph nodes */
  nodes: GraphNode[];
  /** Current graph edges (serialized) */
  edges: string;
  /** Current zoom level */
  zoom: number;
  /** Current pan X */
  panX: number;
  /** Current pan Y */
  panY: number;
  /** Current layout type */
  layoutType: GraphLayoutType;
  /** Node positions for static layouts */
  nodePositions?: Map<string, { x: number; y: number }>;
  /** Annotations (optional) */
  annotations?: unknown[];
  /** Callback when snapshot is loaded */
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
 * @param root0
 * @param root0.nodes
 * @param root0.edges
 * @param root0.zoom
 * @param root0.panX
 * @param root0.panY
 * @param root0.layoutType
 * @param root0.nodePositions
 * @param root0.annotations
 * @param root0.onLoadSnapshot
 */
export const GraphSnapshots: React.FC<GraphSnapshotsProps> = ({
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
  const formatDate = useCallback((date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }, []);

  // Parse edges from JSON string
  const parsedEdges = useMemo(() => {
    try {
      return JSON.parse(edges);
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
        layoutType: snapshot.layoutType as GraphLayoutType,
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
  }, [loadSnapshot, onLoadSnapshot, close]);

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
              onChange={(event) => setSnapshotName(event.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Button onClick={handleSaveSnapshot} leftSection={<IconCamera size={ICON_SIZE.SM} />}>
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
                          onClick={() => handleLoadSnapshot(snapshot.id)}
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
                          onClick={() => handleDeleteSnapshot(snapshot.id)}
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
                            onClick={() => handleLoadSnapshot(snapshot.id)}
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
