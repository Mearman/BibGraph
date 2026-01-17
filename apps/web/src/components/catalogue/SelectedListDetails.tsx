/**
 * SelectedListDetails component
 * Displays details and statistics for the currently selected catalogue list
 */

import type { CatalogueList } from "@bibgraph/utils";
import {
  Badge,
  Button,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Text,
  Title,
} from "@mantine/core";
import {
  IconChartBar,
  IconDownload,
  IconEdit,
  IconFileText,
  IconShare,
} from "@tabler/icons-react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';

import type { ListStats } from "./hooks/useCatalogueManagerState";

interface SelectedListDetailsProps {
  selectedList: CatalogueList;
  listStats: ListStats | null;
  lists: CatalogueList[];
  onEditClick: () => void;
  onExportClick: () => void;
  onAnalyticsClick: () => void;
  onCitationsClick: () => void;
  onShareClick: () => void;
}

export const SelectedListDetails = ({
  selectedList,
  listStats,
  lists,
  onEditClick: _onEditClick,
  onExportClick,
  onAnalyticsClick,
  onCitationsClick,
  onShareClick,
}: SelectedListDetailsProps) => {
  const handleEditButtonClick = () => {
    if (!selectedList.id) return;
    const card = lists.find(l => l.id === selectedList.id);
    if (card) {
      // Trigger edit via the list component
      const buttons = document.querySelectorAll<HTMLElement>('[data-testid^="edit-list-"]');
      const editButton = [...buttons].find(button =>
        button.dataset.testid === `edit-list-${selectedList.id}`
      );
      editButton?.click();
    }
  };

  return (
    <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="md" bg="gray.0" data-testid="selected-list-details">
      <Group justify="space-between" mb="md">
        <div>
          <Title order={3} data-testid="selected-list-title">{selectedList.title}</Title>
          {selectedList.description && (
            <Text c="dimmed" size="sm" mt="xs">
              {selectedList.description}
            </Text>
          )}
        </div>

        <Group gap="xs">
          {selectedList.tags?.map((tag, index) => (
            <Badge key={index} size="sm" variant="light">
              {tag}
            </Badge>
          ))}
          <Button
            variant="light"
            size="sm"
            onClick={handleEditButtonClick}
            leftSection={<IconEdit size={ICON_SIZE.MD} />}
            data-testid="edit-selected-list-button"
            aria-label="Edit list details"
          >
            Edit
          </Button>
          <Button
            variant="light"
            size="sm"
            onClick={onExportClick}
            leftSection={<IconDownload size={ICON_SIZE.MD} />}
            data-testid="export-list-button"
            aria-label="Export this list to a file"
          >
            Export
          </Button>
          <Button
            variant="light"
            size="sm"
            onClick={onAnalyticsClick}
            leftSection={<IconChartBar size={ICON_SIZE.MD} />}
            data-testid="analytics-list-button"
            aria-label="View list analytics"
          >
            Analytics
          </Button>
          <Button
            variant="light"
            size="sm"
            onClick={onCitationsClick}
            leftSection={<IconFileText size={ICON_SIZE.MD} />}
            data-testid="citation-list-button"
            aria-label="Preview citations in different styles"
          >
            Citations
          </Button>
          <Button
            variant="light"
            size="sm"
            onClick={onShareClick}
            leftSection={<IconShare size={ICON_SIZE.MD} />}
            data-testid="share-list-button"
            aria-label="Share this list with others"
          >
            Share
          </Button>
        </Group>
      </Group>

      <Group justify="space-between" mt="md">
        <Text size="xs" c="dimmed">
          Created: {selectedList.createdAt.toLocaleDateString()} •
          Modified: {selectedList.updatedAt.toLocaleDateString()}
          {selectedList.isPublic ? " • Public" : " • Private"}
        </Text>
      </Group>

      {/* Entity Statistics */}
      {listStats && listStats.totalEntities > 0 && (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="xs" mt="md">
          <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="xs" radius="sm">
            <Text size="xs" c="dimmed" fw={500}>Total</Text>
            <Text size="lg" fw={700} data-testid="stat-total">
              {listStats.totalEntities}
            </Text>
          </Paper>

          {Object.entries(listStats.entityCounts)
            .filter(([, count]) => count > 0)
            .map(([entityType, count]) => (
              <Paper key={entityType} style={{ border: BORDER_STYLE_GRAY_3 }} p="xs" radius="sm">
                <Text size="xs" c="dimmed" fw={500} tt="capitalize">
                  {entityType}
                </Text>
                <Text size="lg" fw={700} data-testid={`stat-${entityType}`}>
                  {count}
                </Text>
              </Paper>
            ))}
        </SimpleGrid>
      )}
    </Card>
  );
};
