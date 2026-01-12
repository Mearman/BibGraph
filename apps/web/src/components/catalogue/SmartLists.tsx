/**
 * Smart Lists component
 * Provides auto-populated lists based on user-defined criteria
 */

import type { EntityType } from "@bibgraph/types";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconBulb,
  IconCheck,
  IconEdit,
  IconInfoCircle,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";

import { ICON_SIZE } from '@/config/style-constants';

/**
 * Smart list criteria types
 */
export type SmartListCriteriaType =
  | 'entity-type'
  | 'publication-year'
  | 'citation-count'
  | 'recent-bookmarks'
  | 'tag-filter';

/**
 * Smart list criteria definition
 */
export interface SmartListCriteria {
  id: string;
  name: string;
  description: string;
  type: SmartListCriteriaType;
  color: string;
  icon: React.ReactNode;
  // Configuration fields
  config?: {
    entityType?: EntityType;
    year?: number;
    minCitations?: number;
    tag?: string;
    days?: number;
  };
  // Query parameters for fetching
  queryParams?: Record<string, string | number | boolean>;
}

/**
 * Predefined smart list templates
 */
const PREDEFINED_SMART_LISTS: SmartListCriteria[] = [
  {
    id: 'my-papers-2024',
    name: 'My Papers from 2024',
    description: 'All works I authored or bookmarked in 2024',
    type: 'publication-year',
    color: 'blue',
    icon: <IconBulb size={ICON_SIZE.MD} />,
    config: { year: 2024 },
  },
  {
    id: 'highly-cited',
    name: 'Highly Cited Works',
    description: 'Works with more than 100 citations',
    type: 'citation-count',
    color: 'orange',
    icon: <IconBulb size={ICON_SIZE.MD} />,
    config: { minCitations: 100 },
  },
  {
    id: 'recent-bookmarks',
    name: 'Recent Bookmarks',
    description: 'Works I bookmarked in the last 30 days',
    type: 'recent-bookmarks',
    color: 'green',
    icon: <IconBulb size={ICON_SIZE.MD} />,
    config: { days: 30 },
  },
];

interface SmartListsProps {
  onCreateSmartList: (criteria: SmartListCriteria) => void;
  onClose: () => void;
}

export const SmartLists = ({ onCreateSmartList, onClose }: SmartListsProps) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<SmartListCriteriaType>('entity-type');
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const handleRefresh = async (criteria: SmartListCriteria) => {
    setRefreshing(criteria.id);
    // Simulate refresh - in real implementation, this would re-run the query
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(null);
  };

  const handleCreateSmartList = (criteria: SmartListCriteria) => {
    onCreateSmartList(criteria);
    onClose();
  };

  const handleCreateCustom = () => {
    if (!customName.trim()) return;

    const newCriteria: SmartListCriteria = {
      id: `custom-${Date.now()}`,
      name: customName,
      description: `Custom ${customType} smart list`,
      type: customType,
      color: 'grape',
      icon: <IconBulb size={ICON_SIZE.MD} />,
    };

    onCreateSmartList(newCriteria);
    setCustomName('');
    setShowCreateModal(false);
  };

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3}>Smart Lists</Title>
          <Text size="sm" c="dimmed">
            Auto-populated lists based on your criteria
          </Text>
        </div>
        <ActionIcon
          variant="subtle"
          onClick={onClose}
          aria-label="Close smart lists"
        >
          <IconX size={ICON_SIZE.MD} />
        </ActionIcon>
      </Group>

      {/* Predefined Smart Lists */}
      <Box>
        <Text fw={500} mb="md">Predefined Smart Lists</Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {PREDEFINED_SMART_LISTS.map((criteria) => (
            <Card
              key={criteria.id}
              shadow="sm"
              padding="md"
              radius="md"
              withBorder
              style={{ borderColor: criteria.color }}
            >
              <Stack gap="sm">
                {/* Header */}
                <Group justify="space-between" align="flex-start">
                  <Box c={criteria.color}>
                    {criteria.icon}
                  </Box>
                  <Badge color={criteria.color} variant="light">
                    {criteria.type}
                  </Badge>
                </Group>

                {/* Name and Description */}
                <div>
                  <Text fw={600} size="sm">{criteria.name}</Text>
                  <Text size="xs" c="dimmed">{criteria.description}</Text>
                </div>

                {/* Actions */}
                <Group gap="xs">
                  <Button
                    size="xs"
                    fullWidth
                    leftSection={<IconCheck size={14} />}
                    onClick={() => handleCreateSmartList(criteria)}
                  >
                    Create List
                  </Button>
                  <Tooltip label="Refresh criteria">
                    <ActionIcon
                      size="sm"
                      variant="light"
                      loading={refreshing === criteria.id}
                      onClick={() => void handleRefresh(criteria)}
                    >
                      <IconRefresh size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Box>

      {/* Custom Smart List */}
      <Card
        shadow="sm"
        padding="md"
        radius="md"
        withBorder
        style={{ borderStyle: 'dashed' }}
      >
        <Group justify="space-between">
          <div>
            <Text fw={500}>Create Custom Smart List</Text>
            <Text size="xs" c="dimmed">
              Define your own criteria for auto-populated lists
            </Text>
          </div>
          <Button
            variant="light"
            leftSection={<IconEdit size={14} />}
            onClick={() => setShowCreateModal(true)}
          >
            Create Custom
          </Button>
        </Group>
      </Card>

      {/* Create Custom Smart List Modal */}
      <Modal
        opened={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Custom Smart List"
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="List Name"
            placeholder="My custom smart list"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            required
          />

          <Select
            label="Criteria Type"
            placeholder="Select criteria type"
            data={[
              { value: 'entity-type', label: 'Entity Type' },
              { value: 'publication-year', label: 'Publication Year' },
              { value: 'citation-count', label: 'Citation Count' },
              { value: 'recent-bookmarks', label: 'Recent Bookmarks' },
              { value: 'tag-filter', label: 'Tag Filter' },
            ]}
            value={customType}
            onChange={(value) => setCustomType(value as SmartListCriteriaType)}
            required
          />

          <Group gap="xs" align="center">
            <IconInfoCircle size={12} color="var(--mantine-color-dimmed)" />
            <Text size="xs" c="dimmed">
              Smart lists automatically update when new entities match your criteria.
            </Text>
          </Group>

          <Group justify="flex-end" gap="xs">
            <Button
              variant="subtle"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCustom}
              disabled={!customName.trim()}
            >
              Create Smart List
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};
