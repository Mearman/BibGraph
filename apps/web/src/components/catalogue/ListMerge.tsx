/**
 * List Merge component
 * Allows merging multiple lists with different strategies
 */

import type { CatalogueList } from "@bibgraph/utils";
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  Radio,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconCheck,
} from "@tabler/icons-react";
import React, { useState } from "react";

import { ICON_SIZE } from '@/config/style-constants';

export type MergeStrategy = 'union' | 'intersection' | 'combine';

interface ListMergeProps {
  lists: CatalogueList[];
  onMerge: (
    sourceListIds: string[],
    mergeStrategy: MergeStrategy,
    newListName: string,
    deduplicate: boolean
  ) => Promise<string>;
  onClose: () => void;
}

const MERGE_STRATEGIES: {
  value: MergeStrategy;
  label: string;
  description: string;
}[] = [
  {
    value: 'union',
    label: 'Union (All Unique)',
    description: 'Include all entities from all lists, removing duplicates',
  },
  {
    value: 'intersection',
    label: 'Intersection (Common)',
    description: 'Include only entities that appear in ALL selected lists',
  },
  {
    value: 'combine',
    label: 'Combine All',
    description: 'Include all entities from all lists, keeping duplicates',
  },
];

export const ListMerge = ({ lists, onMerge, onClose }: ListMergeProps) => {
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('union');
  const [deduplicate, setDeduplicate] = useState(true);
  const [newListName, setNewListName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFormValid = selectedListIds.length >= 2 && newListName.trim().length > 0;

  // Type guard to filter lists with IDs
  const listHasId = (list: CatalogueList): list is CatalogueList & { id: string } => {
    return list.id !== undefined;
  };

  const handleToggleList = (listId: string) => {
    setSelectedListIds((prev) =>
      prev.includes(listId)
        ? prev.filter((id) => id !== listId)
        : [...prev, listId]
    );
    setError(null);
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onMerge(selectedListIds, mergeStrategy, newListName.trim(), deduplicate);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to merge lists';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedLists = [...lists].filter(listHasId).sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3}>Merge Lists</Title>
          <Text size="sm" c="dimmed">
            Combine multiple lists into one
          </Text>
        </div>
      </Group>

      {/* Error Alert */}
      {error && (
        <Box c="red.9" bg="red.0" p="md" style={{ borderRadius: '4px' }}>
          <Text size="sm">{error}</Text>
        </Box>
      )}

      {/* List Selection */}
      <Box>
        <Text fw={500} mb="xs">
          Select Lists to Merge (minimum 2)
        </Text>
        <ScrollArea.Autosize mah={200}>
          <Stack gap="xs">
            {sortedLists.map((list) => (
              <Card
                key={list.id}
                padding="xs"
                radius="sm"
                withBorder
                onClick={() => handleToggleList(list.id)}
                style={{
                  cursor: 'pointer',
                  borderColor: selectedListIds.includes(list.id)
                    ? 'var(--mantine-color-blue-5)'
                    : undefined,
                }}
              >
                <Group justify="space-between">
                  <Group gap="xs">
                    <Checkbox
                      checked={selectedListIds.includes(list.id)}
                      onChange={() => {}}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleList(list.id);
                      }}
                    />
                    <Box>
                      <Text size="sm" fw={500}>
                        {list.title}
                      </Text>
                      {list.description && (
                        <Text size="xs" c="dimmed">
                          {list.description}
                        </Text>
                      )}
                    </Box>
                  </Group>
                  <Badge size="xs" variant="light">
                    {list.type}
                  </Badge>
                </Group>
              </Card>
            ))}
          </Stack>
        </ScrollArea.Autosize>
      </Box>

      {/* Merge Strategy */}
      <Box>
        <Text fw={500} mb="xs">Merge Strategy</Text>
        <Radio.Group
          value={mergeStrategy}
          onChange={(value) => setMergeStrategy(value as MergeStrategy)}
        >
          <Stack gap="sm">
            {MERGE_STRATEGIES.map((strategy) => (
              <Radio
                key={strategy.value}
                value={strategy.value}
                label={strategy.label}
                description={strategy.description}
              />
            ))}
          </Stack>
        </Radio.Group>
      </Box>

      {/* Deduplicate Option */}
      <Checkbox
        label="Remove duplicate entities"
        description="When enabled, entities appearing multiple times will be deduplicated"
        checked={deduplicate}
        onChange={(e) => setDeduplicate(e.currentTarget.checked)}
        disabled={mergeStrategy === 'intersection'} // Intersection already deduplicates
      />

      {/* New List Name */}
      <TextInput
        label="New List Name"
        placeholder="Merged List"
        value={newListName}
        onChange={(e) => setNewListName(e.target.value)}
        required
      />

      {/* Selection Summary */}
      {selectedListIds.length > 0 && (
        <Box c="blue" bg="blue.0" p="xs" style={{ borderRadius: '4px' }}>
          <Text size="sm">
            {selectedListIds.length} list{selectedListIds.length !== 1 ? 's' : ''} selected
          </Text>
        </Box>
      )}

      {/* Actions */}
      <Group justify="flex-end" gap="xs">
        <Button
          variant="subtle"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          loading={isSubmitting}
          leftSection={!isSubmitting && <IconCheck size={ICON_SIZE.MD} />}
        >
          Merge Lists
        </Button>
      </Group>
    </Stack>
  );
};
