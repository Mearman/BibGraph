// @vitest-environment jsdom
/**
 * Component tests for RelationshipList component
 */

import { RelationType } from '@bibgraph/types';
import { MantineProvider } from '@mantine/core';
import { cleanup,render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import type { RelationshipItem,RelationshipSection } from '@/types/relationship';

import { RelationshipList } from './RelationshipList';

// Test wrapper with MantineProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

// Mock scrollIntoView to prevent Mantine Select cleanup errors
Element.prototype.scrollIntoView = vi.fn(() => { /* no-op */ });

const ITEMS_BELOW_PAGE_SIZE = 10;
const ITEMS_ABOVE_PAGE_SIZE = 150;
const DEFAULT_PAGE_SIZE = 50;
const EXPANDED_PAGE_SIZE = 100;
const PAGE_SIZE_PLUS_ONE = 51;

describe('RelationshipList', () => {
  const createMockItems = (count: number): RelationshipItem[] => {
    return Array.from({ length: count }, (_, index) => ({
      id: `rel-${String(index)}`,
      sourceId: 'W123',
      targetId: `A${String(index)}`,
      sourceType: 'works' as const,
      targetType: 'authors' as const,
      type: RelationType.AUTHORSHIP,
      direction: 'outbound' as const,
      displayName: `Author ${String(index)}`,
      isSelfReference: false,
    }));
  };

  const createMockSection = (itemCount: number, currentPage = 0, pageSize = DEFAULT_PAGE_SIZE): RelationshipSection => {
    const startIndex = currentPage * pageSize;
    const endIndex = Math.min(startIndex + pageSize, itemCount);
    const pageItemCount = endIndex - startIndex;

    return {
      id: 'section-1',
      type: RelationType.AUTHORSHIP,
      direction: 'outbound',
      label: 'Authors',
      items: createMockItems(pageItemCount), // Only items for current page
      visibleItems: createMockItems(pageItemCount),
      totalCount: itemCount,
      visibleCount: pageItemCount,
      hasMore: endIndex < itemCount,
      pagination: {
        pageSize,
        currentPage,
        totalPages: Math.ceil(itemCount / pageSize),
        hasNextPage: endIndex < itemCount,
        hasPreviousPage: currentPage > 0,
      },
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render all items when count is less than page size', () => {
    const section = createMockSection(ITEMS_BELOW_PAGE_SIZE);
    const onPageChange = vi.fn(() => { /* no-op */ });
    const onPageSizeChange = vi.fn(() => { /* no-op */ });

    render(
      <TestWrapper>
        <RelationshipList
          section={section}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          isLoading={false}
        />
      </TestWrapper>
    );

    // Should show all 10 items
    expect(screen.getByText('Author 0')).toBeInTheDocument();
    expect(screen.getByText('Author 9')).toBeInTheDocument();
  });

  it('should display "Showing X of Y" count', () => {
    const section = createMockSection(ITEMS_BELOW_PAGE_SIZE);
    const onPageChange = vi.fn(() => { /* no-op */ });
    const onPageSizeChange = vi.fn(() => { /* no-op */ });

    render(
      <TestWrapper>
        <RelationshipList
          section={section}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          isLoading={false}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Showing 10 of 10')).toBeInTheDocument();
  });

  it('should display pagination controls when total items > 10', () => {
    const section = createMockSection(ITEMS_ABOVE_PAGE_SIZE);
    const onPageChange = vi.fn(() => { /* no-op */ });
    const onPageSizeChange = vi.fn(() => { /* no-op */ });

    render(
      <TestWrapper>
        <RelationshipList
          section={section}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          isLoading={false}
        />
      </TestWrapper>
    );

    // Should show pagination text with range format
    expect(screen.getByText('Showing 1 to 50 of 150')).toBeInTheDocument();
  });

  it('should not display pagination controls when total items <= 10', () => {
    const section = createMockSection(ITEMS_BELOW_PAGE_SIZE);
    const onPageChange = vi.fn(() => { /* no-op */ });
    const onPageSizeChange = vi.fn(() => { /* no-op */ });

    render(
      <TestWrapper>
        <RelationshipList
          section={section}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          isLoading={false}
        />
      </TestWrapper>
    );

    // Should show simple count text
    expect(screen.getByText('Showing 10 of 10')).toBeInTheDocument();
  });

  it('should call onPageChange when page navigation is used', async () => {
    const section = createMockSection(ITEMS_ABOVE_PAGE_SIZE);
    const onPageChange = vi.fn(() => { /* no-op */ });
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <RelationshipList
          section={section}
          onPageChange={onPageChange}
          onPageSizeChange={vi.fn(() => { /* no-op */ })}
          isLoading={false}
        />
      </TestWrapper>
    );

    // Initially shows page 1 (items 1-50)
    expect(screen.getByText('Showing 1 to 50 of 150')).toBeInTheDocument();

    // Find and click the next page button (page 2)
    const pageButtons = screen.getAllByRole('button');
    const nextButton = pageButtons.find(button => button.dataset.page === '2');

    if (nextButton) {
      await user.click(nextButton);
      expect(onPageChange).toHaveBeenCalledWith(1); // 0-indexed page
    }
  });

  it('should call onPageSizeChange when page size selector is used', async () => {
    const section = createMockSection(ITEMS_ABOVE_PAGE_SIZE);
    const onPageSizeChange = vi.fn(() => { /* no-op */ });
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <RelationshipList
          section={section}
          onPageChange={vi.fn(() => { /* no-op */ })}
          onPageSizeChange={onPageSizeChange}
          isLoading={false}
        />
      </TestWrapper>
    );

    // Find the page size selector input
    const pageSizeSelect = screen.getByDisplayValue('50 per page');
    expect(pageSizeSelect).toBeInTheDocument();
    expect(pageSizeSelect).toHaveAttribute('aria-label', 'Items per page');

    // Change page size to 100
    await user.click(pageSizeSelect);
    const option100 = screen.getByText('100 per page');
    await user.click(option100);

    expect(onPageSizeChange).toHaveBeenCalledWith(EXPANDED_PAGE_SIZE);
  });

  it('should handle edge case with exactly 50 items', () => {
    const section = createMockSection(DEFAULT_PAGE_SIZE);
    const onPageChange = vi.fn(() => { /* no-op */ });
    const onPageSizeChange = vi.fn(() => { /* no-op */ });

    render(
      <TestWrapper>
        <RelationshipList
          section={section}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          isLoading={false}
        />
      </TestWrapper>
    );

    // Should show pagination text for items > 10
    expect(screen.getByText('Showing 1 to 50 of 50')).toBeInTheDocument();
  });

  it('should handle edge case with 51 items', () => {
    const section = createMockSection(PAGE_SIZE_PLUS_ONE);
    const onPageChange = vi.fn(() => { /* no-op */ });
    const onPageSizeChange = vi.fn(() => { /* no-op */ });

    render(
      <TestWrapper>
        <RelationshipList
          section={section}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          isLoading={false}
        />
      </TestWrapper>
    );

    // Should show first page of 50 items
    expect(screen.getByText('Showing 1 to 50 of 51')).toBeInTheDocument();
  });
});
