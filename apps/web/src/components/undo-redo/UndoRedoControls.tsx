/**
 * Undo/Redo Controls Component
 *
 * Provides undo/redo buttons with keyboard shortcuts display.
 * Integrates with global UndoRedoContext.
 */

import {
  ActionIcon,
  Group,
  Menu,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconHistory,
  IconTrash,
} from '@tabler/icons-react';
import { memo } from 'react';

import { ICON_SIZE } from '@/config/style-constants';
import { useUndoRedoContext } from '@/contexts/UndoRedoContext';

export const UndoRedoControls = memo(() => {
  const { canUndo, canRedo, undo, redo, clearHistory, historySize } = useUndoRedoContext();

  return (
    <Group gap="xs" wrap="nowrap">
      <Tooltip label="Undo (Cmd+Z)" withinPortal>
        <ActionIcon
          onClick={() => void undo()}
          disabled={!canUndo}
          variant="subtle"
          size="lg"
          aria-label="Undo"
        >
          <IconArrowBackUp size={ICON_SIZE.MD} />
        </ActionIcon>
      </Tooltip>

      <Tooltip label="Redo (Cmd+Shift+Z or Cmd+Y)" withinPortal>
        <ActionIcon
          onClick={() => void redo()}
          disabled={!canRedo}
          variant="subtle"
          size="lg"
          aria-label="Redo"
        >
          <IconArrowForwardUp size={ICON_SIZE.MD} />
        </ActionIcon>
      </Tooltip>

      {historySize > 0 && (
        <Menu shadow="md" width={200} position="bottom-end">
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              size="lg"
              aria-label="History options"
            >
              <IconHistory size={ICON_SIZE.MD} />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconTrash size={ICON_SIZE.SM} />}
              onClick={clearHistory}
              color="red"
            >
              Clear history ({historySize} actions)
            </Menu.Item>

            <Menu.Label>
              <Stack gap={0}>
                <Text size="xs" c="dimmed">Keyboard shortcuts:</Text>
                <Text size="xs" c="dimmed">Cmd+Z: Undo</Text>
                <Text size="xs" c="dimmed">Cmd+Shift+Z: Redo</Text>
              </Stack>
            </Menu.Label>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
});

UndoRedoControls.displayName = 'UndoRedoControls';

