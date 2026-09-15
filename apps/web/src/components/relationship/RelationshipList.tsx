/**
 * RelationshipList component Displays a paginated list of relationship items with full pagination controls
 * @see specs/016-entity-relationship-viz/data-model.md
 */

import { Stack } from '@mantine/core';

import type { RelationshipSection } from '@/types/relationship';

import { RelationshipItem } from './RelationshipItem';
import { RelationshipPagination } from './RelationshipPagination';

export interface RelationshipListProps {
  /**
  The relationship section containing items to display
   */
  section: RelationshipSection;

  /**
  Callback when page changes (0-indexed page number)
   */
  onPageChange?: (page: number) => void;

  /**
  Callback when page size changes
   */
  onPageSizeChange?: (pageSize: number) => void;

  /**
  Whether pagination is currently loading
   */
  isLoading?: boolean;
}

/**
 * Displays a paginated list of relationship items
 * Shows items with pagination controls for navigation and page size selection
 */
export const RelationshipList = ({
  section,
  onPageChange,
  onPageSizeChange,
  isLoading,
}: Readonly<RelationshipListProps>) => {
  return (
    <Stack gap="md">
      <Stack gap="sm">
        {section.items.map((item) => (
          <RelationshipItem key={item.id} item={item} />
        ))}
      </Stack>

      <RelationshipPagination
        pagination={section.pagination}
        totalCount={section.totalCount}
        loadedCount={section.items.length}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        disabled={isLoading}
      />
    </Stack>
  );
};
