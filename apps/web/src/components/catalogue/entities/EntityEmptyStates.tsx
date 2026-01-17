/**
 * Entity Empty State Components
 * Various empty/loading states for the entity list view
 */

import { Card, Loader, Stack, Text } from "@mantine/core";

import { BORDER_STYLE_GRAY_3 } from "@/config/style-constants";

export const NoListSelectedState = () => {
  return (
    <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xl">
      <Stack align="center" gap="md">
        <Text size="lg" c="dimmed">
          Select a list to view its entities
        </Text>
      </Stack>
    </Card>
  );
};

interface LoadingStateProps {
  listTitle: string;
}

export const LoadingState = ({ listTitle }: LoadingStateProps) => {
  return (
    <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xl">
      <Stack align="center" gap="md">
        <Loader size="lg" />
        <Text size="sm" c="dimmed">
          Loading entities from "{listTitle}"...
        </Text>
      </Stack>
    </Card>
  );
};

export const EmptyListState = () => {
  return (
    <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xl">
      <Stack align="center" gap="md">
        <Text size="lg" fw={500} ta="center">
          No entities yet
          <br />
          <Text component="span" size="sm" c="dimmed">
            Add entities to get started
          </Text>
        </Text>
      </Stack>
    </Card>
  );
};
