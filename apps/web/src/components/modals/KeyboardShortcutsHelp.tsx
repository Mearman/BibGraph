import {
  ActionIcon,
  Badge,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconFilter,
  IconInfoCircle,
  IconKeyboard,
  IconNavigation,
  IconSearch,
} from '@tabler/icons-react';
import { useState } from 'react';

interface HotkeyItem {
  keys: string;
  description: string;
  category: 'global' | 'navigation' | 'search' | 'content' | 'accessibility';
}

const hotkeysData: HotkeyItem[] = [
  // Global shortcuts
  { keys: 'Ctrl + K', description: 'Focus search', category: 'global' },
  { keys: 'Ctrl + /', description: 'Show keyboard shortcuts', category: 'global' },
  { keys: 'Escape', description: 'Close modals / Clear search', category: 'global' },

  // Navigation shortcuts
  { keys: 'G + H', description: 'Go to home', category: 'navigation' },
  { keys: 'G + S', description: 'Go to search', category: 'navigation' },
  { keys: 'G + B', description: 'Go to bookmarks', category: 'navigation' },

  // Search shortcuts
  { keys: 'Ctrl + F', description: 'Toggle filters', category: 'search' },
  { keys: 'Ctrl + Enter', description: 'Execute search', category: 'search' },

  // Content shortcuts
  { keys: 'J', description: 'Next result', category: 'content' },
  { keys: 'K', description: 'Previous result', category: 'content' },

  // Accessibility shortcuts
  { keys: 'Alt + A', description: 'Skip to main content', category: 'accessibility' },
  { keys: 'Alt + T', description: 'Jump to top', category: 'accessibility' },
  { keys: 'Alt + B', description: 'Jump to bottom', category: 'accessibility' },
];

const categoryInfo = {
  global: {
    title: 'Global Shortcuts',
    icon: IconKeyboard,
    color: 'blue',
    description: 'Available everywhere in the application',
  },
  navigation: {
    title: 'Navigation',
    icon: IconNavigation,
    color: 'green',
    description: 'Quick navigation between pages',
  },
  search: {
    title: 'Search',
    icon: IconSearch,
    color: 'orange',
    description: 'Search-specific shortcuts',
  },
  content: {
    title: 'Content Navigation',
    icon: IconFilter,
    color: 'purple',
    description: 'Navigate through results and content',
  },
  accessibility: {
    title: 'Accessibility',
    icon: IconInfoCircle,
    color: 'red',
    description: 'Accessibility and navigation aids',
  },
};

const isCategoryKey = (key: string): key is keyof typeof categoryInfo => key in categoryInfo;

interface KeyboardShortcutsHelpProperties {
  opened: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsHelp = ({
  opened,
  onClose,
}: KeyboardShortcutsHelpProperties) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = Object.keys(categoryInfo).filter(isCategoryKey);
  const filteredHotkeys = selectedCategory === 'all'
    ? hotkeysData
    : hotkeysData.filter(hotkey => hotkey.category === selectedCategory);

  const rows = filteredHotkeys.map((hotkey, index) => (
    <Table.Tr key={index}>
      <Table.Td w={120}>
        <Group gap="xs">
          {hotkey.keys.split(' + ').map((key, keyIndex) => (
            <Badge key={keyIndex} variant="light" size="sm">
              {key.trim()}
            </Badge>
          ))}
        </Group>
      </Table.Td>
      <Table.Td>{hotkey.description}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={
        <Group gap="sm">
          <IconKeyboard size={20} />
          <Text size="lg" fw={600}>
            Keyboard Shortcuts
          </Text>
        </Group>
      }
      styles={{
        title: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        },
      }}
    >
      <Stack gap="md">
        {/* Category Filter */}
        <Group gap="xs" wrap="wrap">
          <Badge
            variant={selectedCategory === 'all' ? 'filled' : 'light'}
            color="gray"
            style={{ cursor: 'pointer' }}
            onClick={() => { setSelectedCategory('all'); }}
          >
            All Shortcuts
          </Badge>
          {categories.map((category) => {
            const Icon = categoryInfo[category].icon;
            return (
              <Badge
                key={category}
                variant={selectedCategory === category ? 'filled' : 'light'}
                color={categoryInfo[category].color}
                style={{ cursor: 'pointer' }}
                onClick={() => { setSelectedCategory(category); }}
                leftSection={<Icon size={12} />}
              >
                {categoryInfo[category].title}
              </Badge>
            );
          })}
        </Group>

        {/* Category Description */}
        {selectedCategory !== 'all' && isCategoryKey(selectedCategory) && (
          <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
            {categoryInfo[selectedCategory].description}
          </Text>
        )}

        {/* Shortcuts Table */}
        <ScrollArea.Autosize mah={400}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Shortcut</Table.Th>
                <Table.Th>Description</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </ScrollArea.Autosize>

        {/* Tips */}
        <Stack gap="sm" mt="md">
          <Title order={6}>Tips</Title>
          <Text size="sm" c="dimmed">
            • Press <Badge size="xs" variant="light">Ctrl + /</Badge> anytime to show this help
          </Text>
          <Text size="sm" c="dimmed">
            • Use <Badge size="xs" variant="light">G</Badge> followed by a letter to quickly navigate (e.g.,{' '}
            <Badge size="xs" variant="light">G</Badge> then <Badge size="xs" variant="light">H</Badge> for Home)
          </Text>
          <Text size="sm" c="dimmed">
            • <Badge size="xs" variant="light">J/K</Badge> keys work like vim for navigating through search results
          </Text>
          <Text size="sm" c="dimmed">
            • All shortcuts work on both Windows (Ctrl) and Mac (⌘) keyboards
          </Text>
        </Stack>
      </Stack>
    </Modal>
  );
};

// Floating action button component
interface KeyboardShortcutsButtonProperties {
  onClick: () => void;
}

export const KeyboardShortcutsButton = ({ onClick }: KeyboardShortcutsButtonProperties) => {
  return (
    <Tooltip label="Keyboard shortcuts (Ctrl + /)" position="bottom">
      <ActionIcon
        variant="subtle"
        size="sm"
        onClick={onClick}
        aria-label="Show keyboard shortcuts help"
      >
        <IconKeyboard size={16} />
      </ActionIcon>
    </Tooltip>
  );
};