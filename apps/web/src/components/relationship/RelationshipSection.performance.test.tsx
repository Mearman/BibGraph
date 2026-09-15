// @vitest-environment jsdom
/**
 * Performance tests for RelationshipSection component Validates rendering performance meets requirements
 */

import { RelationType } from '@bibgraph/types';
import { MantineProvider } from '@mantine/core';
import { render } from '@testing-library/react';
import { beforeEach,describe, expect, it, vi } from 'vitest';

import type { RelationshipSection as RelationshipSectionType } from '@/types/relationship';

import { RelationshipSection } from './RelationshipSection';


// Test wrapper with MantineProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

const DEFAULT_PAGE_SIZE = 50;
const DOUBLE_PAGE_ITEM_COUNT = 100;
const STANDARD_RENDER_TIME_LIMIT_MS = 1000;
const EMPTY_RENDER_TIME_LIMIT_MS = 100;
const MULTI_SECTION_RENDER_TIME_LIMIT_MS = 4000;

describe('RelationshipSection Performance', () => {
  const createMockSection = (
    itemCount: number,
    type: RelationType = RelationType.AUTHORSHIP
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
      label: 'Authors',
      items,
      visibleItems: items.slice(0, Math.min(itemCount, DEFAULT_PAGE_SIZE)),
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

  it('should render 50 items in under 1 second', () => {
    const section = createMockSection(DEFAULT_PAGE_SIZE);
    const onPageChange = vi.fn(() => { /* no-op */ });
    const onPageSizeChange = vi.fn(() => { /* no-op */ });
    const startTime = performance.now();

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

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render in under 1000ms
    expect(renderTime).toBeLessThan(STANDARD_RENDER_TIME_LIMIT_MS);
  });

  it('should render 100 items (first page) in under 1 second', () => {
    const section = createMockSection(DOUBLE_PAGE_ITEM_COUNT);
    const onPageChange = vi.fn(() => { /* no-op */ });
    const onPageSizeChange = vi.fn(() => { /* no-op */ });
    const startTime = performance.now();

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

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Only first 50 visible, should still be fast
    expect(renderTime).toBeLessThan(STANDARD_RENDER_TIME_LIMIT_MS);
  });

  it('should handle empty sections efficiently', () => {
    const section = createMockSection(0);
    const onPageChange = vi.fn(() => { /* no-op */ });
    const onPageSizeChange = vi.fn(() => { /* no-op */ });
    const startTime = performance.now();

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

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Empty sections should render very quickly
    expect(renderTime).toBeLessThan(EMPTY_RENDER_TIME_LIMIT_MS);
  });

  it('should handle partial data warning without performance impact', () => {
    const section = createMockSection(DEFAULT_PAGE_SIZE);
    section.isPartialData = true;
    const onPageChange = vi.fn(() => { /* no-op */ });
    const onPageSizeChange = vi.fn(() => { /* no-op */ });

    const startTime = performance.now();

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

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Warning should not add significant overhead
    expect(renderTime).toBeLessThan(STANDARD_RENDER_TIME_LIMIT_MS);
  });

  it('should handle multiple relationship types efficiently', () => {
    const types = [
      RelationType.AUTHORSHIP,
      RelationType.REFERENCE,
      RelationType.AFFILIATION,
      RelationType.TOPIC,
    ];

    const startTime = performance.now();

    for (const type of types) {
      const section = createMockSection(DEFAULT_PAGE_SIZE, type);
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
    }

    const endTime = performance.now();
    const totalRenderTime = endTime - startTime;

    // 4 sections with 50 items each should render in under 4 seconds
    expect(totalRenderTime).toBeLessThan(MULTI_SECTION_RENDER_TIME_LIMIT_MS);
  });

  it('should render with icon efficiently', () => {
    const section = createMockSection(DEFAULT_PAGE_SIZE);
    section.icon = '👤';
    const onPageChange = vi.fn(() => { /* no-op */ });
    const onPageSizeChange = vi.fn(() => { /* no-op */ });

    const startTime = performance.now();

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

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Icon should not add significant overhead
    expect(renderTime).toBeLessThan(STANDARD_RENDER_TIME_LIMIT_MS);
  });
});
