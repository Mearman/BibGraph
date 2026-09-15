// @vitest-environment jsdom
/**
 * Component tests for RelationshipSection component
 */

import { RelationType } from '@bibgraph/types';
import { MantineProvider } from '@mantine/core';
import { cleanup,render, screen } from '@testing-library/react';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import type { RelationshipSection as RelationshipSectionType } from '@/types/relationship';

import { RelationshipSection } from './RelationshipSection';

// Test wrapper with MantineProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

const FEW_ITEM_COUNT = 5;
const DEFAULT_ITEM_COUNT = 10;
const MEDIUM_ITEM_COUNT = 25;
const DEFAULT_PAGE_SIZE = 50;

describe('RelationshipSection', () => {
  const createMockSection = (
    type: RelationType = RelationType.AUTHORSHIP,
    itemCount = DEFAULT_ITEM_COUNT,
    label = 'Authors',
    isPartialData = false
  ): RelationshipSectionType => {
    const items = Array.from({ length: itemCount }, (_, index) => ({
      id: `rel-${String(index)}`,
      sourceId: 'W123',
      targetId: `A${String(index)}`,
      sourceType: 'works' as const,
      targetType: 'authors' as const,
      type,
      direction: 'outbound' as const,
      displayName: `Author ${String(index)}`,
      isSelfReference: false,
    }));

    return {
      id: `section-${type}`,
      type,
      direction: 'outbound',
      label,
      items,
      visibleItems: items.slice(0, Math.min(itemCount, DEFAULT_PAGE_SIZE)),
      isPartialData,
      totalCount: itemCount,
      visibleCount: Math.min(itemCount, DEFAULT_PAGE_SIZE),
      hasMore: itemCount > DEFAULT_PAGE_SIZE,
      pagination: {
        pageSize: DEFAULT_PAGE_SIZE,
        currentPage: 0,
        totalPages: Math.ceil(itemCount / DEFAULT_PAGE_SIZE),
        hasNextPage: itemCount > DEFAULT_PAGE_SIZE,
        hasPreviousPage: false,
      },
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render section with label', () => {
    const section = createMockSection(RelationType.AUTHORSHIP, DEFAULT_ITEM_COUNT, 'Authors');
    const onPageChange = vi.fn(() => { /* no-op */ });
    const onPageSizeChange = vi.fn(() => { /* no-op */ });

    render(
      <TestWrapper>
        <RelationshipSection
          section={section}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          isLoading={false}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Authors')).toBeInTheDocument();
  });

  it('should render count badge', () => {
    const section = createMockSection(RelationType.AUTHORSHIP, MEDIUM_ITEM_COUNT);
    const onPageChange = vi.fn(() => { /* no-op */ });
    const onPageSizeChange = vi.fn(() => { /* no-op */ });

    render(
      <TestWrapper>
        <RelationshipSection
          section={section}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          isLoading={false}
        />
      </TestWrapper>
    );

    expect(screen.getByTestId('relationship-count')).toHaveTextContent('25');
  });

  it('should render correct data-testid based on type and direction', () => {
    const section = createMockSection(RelationType.AUTHORSHIP, DEFAULT_ITEM_COUNT);
    const onPageChange = vi.fn(() => { /* no-op */ });
    const onPageSizeChange = vi.fn(() => { /* no-op */ });

    const { container } = render(
      <TestWrapper>
        <RelationshipSection
          section={section}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          isLoading={false}
        />
      </TestWrapper>
    );

    const sectionElement = container.querySelector('[data-testid="relationship-section-AUTHORSHIP-outbound"]');
    expect(sectionElement).toBeInTheDocument();
  });

  it('should render inbound section with correct testid', () => {
    const section: RelationshipSectionType = {
      ...createMockSection(RelationType.REFERENCE, FEW_ITEM_COUNT, 'Citations'),
      direction: 'inbound',
    };
    const onPageChange = vi.fn(() => { /* no-op */ });
    const onPageSizeChange = vi.fn(() => { /* no-op */ });

    const { container } = render(
      <TestWrapper>
        <RelationshipSection
          section={section}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          isLoading={false}
        />
      </TestWrapper>
    );

    const sectionElement = container.querySelector('[data-testid="relationship-section-REFERENCE-inbound"]');
    expect(sectionElement).toBeInTheDocument();
  });

  it('should pass section to RelationshipList', () => {
    const section = createMockSection(RelationType.AUTHORSHIP, DEFAULT_ITEM_COUNT);
    const onPageChange = vi.fn(() => { /* no-op */ });
    const onPageSizeChange = vi.fn(() => { /* no-op */ });

    render(
      <TestWrapper>
        <RelationshipSection
          section={section}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          isLoading={false}
        />
      </TestWrapper>
    );

    // RelationshipList should render all visible items
    expect(screen.getByText('Author 0')).toBeInTheDocument();
    expect(screen.getByText('Author 9')).toBeInTheDocument();
  });

  it('should display icon when provided', () => {
    const section = createMockSection(RelationType.AUTHORSHIP, DEFAULT_ITEM_COUNT, 'Authors');
    section.icon = '👤';
    const onPageChange = vi.fn(() => { /* no-op */ });
    const onPageSizeChange = vi.fn(() => { /* no-op */ });

    render(
      <TestWrapper>
        <RelationshipSection
          section={section}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          isLoading={false}
        />
      </TestWrapper>
    );

    expect(screen.getByText('👤')).toBeInTheDocument();
  });

  it('should not display icon when not provided', () => {
    const section = createMockSection(RelationType.AUTHORSHIP, DEFAULT_ITEM_COUNT, 'Authors');
    section.icon = undefined;
    const onPageChange = vi.fn(() => { /* no-op */ });
    const onPageSizeChange = vi.fn(() => { /* no-op */ });

    const { container } = render(
      <TestWrapper>
        <RelationshipSection
          section={section}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          isLoading={false}
        />
      </TestWrapper>
    );

    // Should only show label text
    const textElements = container.querySelectorAll('p');
    const hasIcon = [...textElements].some(element => element.textContent.includes('👤'));
    expect(hasIcon).toBe(false);
  });

  // onLoadMore functionality removed - component now uses pagination via onPageChange

  describe('Partial Data Warning', () => {
    it('should not show warning when isPartialData is false', () => {
      const section = createMockSection(RelationType.AUTHORSHIP, DEFAULT_ITEM_COUNT, 'Authors', false);
      const onPageChange = vi.fn(() => { /* no-op */ });
      const onPageSizeChange = vi.fn(() => { /* no-op */ });

      render(
        <TestWrapper>
          <RelationshipSection
            section={section}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            isLoading={false}
          />
        </TestWrapper>
      );

      expect(screen.queryByTestId('partial-data-warning')).not.toBeInTheDocument();
    });

    it('should not show warning when isPartialData is undefined', () => {
      const section = createMockSection(RelationType.AUTHORSHIP, DEFAULT_ITEM_COUNT, 'Authors');
      const onPageChange = vi.fn(() => { /* no-op */ });
      const onPageSizeChange = vi.fn(() => { /* no-op */ });

      render(
        <TestWrapper>
          <RelationshipSection
            section={section}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            isLoading={false}
          />
        </TestWrapper>
      );

      expect(screen.queryByTestId('partial-data-warning')).not.toBeInTheDocument();
    });

    it('should show warning when isPartialData is true', () => {
      const section = createMockSection(RelationType.AUTHORSHIP, DEFAULT_ITEM_COUNT, 'Authors', true);
      const onPageChange = vi.fn(() => { /* no-op */ });
      const onPageSizeChange = vi.fn(() => { /* no-op */ });

      render(
        <TestWrapper>
          <RelationshipSection
            section={section}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            isLoading={false}
          />
        </TestWrapper>
      );

      const warning = screen.getByTestId('partial-data-warning');
      expect(warning).toBeInTheDocument();
      expect(warning).toHaveTextContent(/Incomplete Data/i);
      expect(warning).toHaveTextContent(/Relationship data may be incomplete/i);
    });

    it('should show warning with yellow color variant', () => {
      const section = createMockSection(RelationType.AUTHORSHIP, DEFAULT_ITEM_COUNT, 'Authors', true);
      const onPageChange = vi.fn(() => { /* no-op */ });
      const onPageSizeChange = vi.fn(() => { /* no-op */ });

      render(
        <TestWrapper>
          <RelationshipSection
            section={section}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            isLoading={false}
          />
        </TestWrapper>
      );

      const warning = screen.getByTestId('partial-data-warning');
      // Mantine Alert with color="yellow" applies specific classes
      expect(warning.className).toContain('mantine-Alert');
    });

    it('should show icon in warning message', () => {
      const section = createMockSection(RelationType.AUTHORSHIP, DEFAULT_ITEM_COUNT, 'Authors', true);
      const onPageChange = vi.fn(() => { /* no-op */ });
      const onPageSizeChange = vi.fn(() => { /* no-op */ });

      render(
        <TestWrapper>
          <RelationshipSection
            section={section}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            isLoading={false}
          />
        </TestWrapper>
      );

      const warning = screen.getByTestId('partial-data-warning');
      // IconAlertCircle should be rendered within the warning
      const icon = warning.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });
});
