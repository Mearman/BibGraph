/**
 * Annotation Toolbar
 *
 * Toolbar for creating and managing graph annotations.
 * Provides tools for text labels, shapes, and freehand drawings.
 *
 * @module components/graph/annotations/AnnotationToolbar
 */

import {
  ActionIcon,
  Badge,
  Group,
  Popover,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconCircle,
  IconPencil,
  IconRectangle,
  IconSticker,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';

import { ICON_SIZE } from '@/config/style-constants';

export type DrawingTool = 'select' | 'text' | 'rectangle' | 'circle' | 'drawing' | 'erase';

interface DrawingToolOption {
  icon: React.ReactNode;
  label: string;
  tool: DrawingTool;
}

const DRAWING_TOOLS: DrawingToolOption[] = [
  {
    icon: <IconSticker size={ICON_SIZE.SM} />,
    label: 'Text Label',
    tool: 'text',
  },
  {
    icon: <IconRectangle size={ICON_SIZE.SM} />,
    label: 'Rectangle',
    tool: 'rectangle',
  },
  {
    icon: <IconCircle size={ICON_SIZE.SM} />,
    label: 'Circle',
    tool: 'circle',
  },
  {
    icon: <IconPencil size={ICON_SIZE.SM} />,
    label: 'Freehand',
    tool: 'drawing',
  },
];

interface AnnotationToolbarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  annotationCount: number;
  onClearAll?: () => void;
}

/**
 * Annotation toolbar component
 * @param root0
 * @param root0.activeTool
 * @param root0.onToolChange
 * @param root0.annotationCount
 * @param root0.onClearAll
 */
export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  activeTool,
  onToolChange,
  annotationCount,
  onClearAll,
}) => {
  return (
    <Group gap="xs" bg="white" p="xs" style={{ borderRadius: '8px', border: '1px solid #e9ecef' }}>
      {DRAWING_TOOLS.map((tool) => (
        <Tooltip key={tool.label} label={tool.label}>
          <ActionIcon
            variant={activeTool === tool.tool ? 'filled' : 'light'}
            color={activeTool === tool.tool ? 'blue' : 'gray'}
            onClick={() => onToolChange(tool.tool)}
            aria-label={tool.label}
          >
            {tool.icon}
          </ActionIcon>
        </Tooltip>
      ))}

      <div style={{ width: 1, height: 24, backgroundColor: '#dee2e6', margin: '0 4px' }} />

      {annotationCount > 0 && (
        <Badge size="sm" variant="light">
          {annotationCount}
        </Badge>
      )}

      {onClearAll && annotationCount > 0 && (
        <Tooltip label="Clear All Annotations">
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={onClearAll}
            aria-label="Clear all annotations"
          >
            <IconTrash size={ICON_SIZE.SM} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
};

/**
 * Text annotation popover for entering label text
 */
interface TextAnnotationPopoverProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  position: { x: number; y: number };
}

export const TextAnnotationPopover: React.FC<TextAnnotationPopoverProps> = ({
  opened,
  onClose,
  onSubmit,
  position,
}) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
      setText('');
      onClose();
    }
  };

  return (
    <Popover
      opened={opened}
      onClose={onClose}
      position="bottom"
      withArrow
      shadow="md"
    >
      <Popover.Target>
        <div style={{ position: 'absolute', left: position.x, top: position.y, visibility: 'hidden' }} />
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Add Text Label
          </Text>
          <TextInput
            placeholder="Enter text..."
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubmit();
              } else if (e.key === 'Escape') {
                onClose();
              }
              e.stopPropagation();
            }}
            size="xs"
          />
          <Group justify="flex-end" gap="xs">
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              onClick={onClose}
            >
              <IconX size={ICON_SIZE.XS} />
            </ActionIcon>
            <ActionIcon
              size="sm"
              variant="filled"
              color="blue"
              onClick={handleSubmit}
              disabled={!text.trim()}
            >
              ✓
            </ActionIcon>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};
