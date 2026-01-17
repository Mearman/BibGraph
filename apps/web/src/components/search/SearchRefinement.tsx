/**
 * Search refinement component for filtering within results
 */
import { ActionIcon, Card, Text, TextInput } from "@mantine/core";
import { IconSearch, IconX } from "@tabler/icons-react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from "@/config/style-constants";

interface SearchRefinementProps {
  refinementQuery: string;
  onRefinementChange: (query: string) => void;
  sortedResultsCount: number;
  totalResultsCount: number;
}

export const SearchRefinement = ({
  refinementQuery,
  onRefinementChange,
  sortedResultsCount,
  totalResultsCount,
}: SearchRefinementProps) => (
  <Card padding="sm" radius="sm" style={{ border: BORDER_STYLE_GRAY_3 }}>
    <TextInput
      placeholder="Search within results..."
      value={refinementQuery}
      onChange={(e) => onRefinementChange(e.currentTarget.value)}
      leftSection={<IconSearch size={ICON_SIZE.SM} />}
      rightSection={
        refinementQuery && (
          <ActionIcon
            size="sm"
            variant="transparent"
            color="gray"
            onClick={() => onRefinementChange('')}
            aria-label="Clear refinement"
          >
            <IconX size={ICON_SIZE.XS} />
          </ActionIcon>
        )
      }
      size="sm"
    />
    {refinementQuery && (
      <Text size="xs" c="dimmed" mt="xs">
        Filtering {sortedResultsCount} of {totalResultsCount} results by "{refinementQuery}"
      </Text>
    )}
  </Card>
);
