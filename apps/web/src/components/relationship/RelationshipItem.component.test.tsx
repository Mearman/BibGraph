/**
 * Component tests for RelationshipItem component
 * @vitest-environment jsdom
 */

import { RelationType } from '@bibgraph/types';
import { MantineProvider } from '@mantine/core';
import { cleanup,render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import type { RelationshipItem as RelationshipItemType } from '@/types/relationship';

import { RelationshipItem } from './RelationshipItem';

// Mock useNavigate hook
const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

// Test wrapper with MantineProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe('RelationshipItem', () => {
  const mockItem: RelationshipItemType = {
    id: 'rel-1',
    sourceId: 'W123',
    targetId: 'A456',
    sourceType: 'works',
    targetType: 'authors',
    type: RelationType.AUTHORSHIP,
    direction: 'outbound',
    displayName: 'John Doe',
    isSelfReference: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render entity name', () => {
    render(
      <TestWrapper>
        <RelationshipItem item={mockItem} />
      </TestWrapper>
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should render as clickable link', () => {
    render(
      <TestWrapper>
        <RelationshipItem item={mockItem} />
      </TestWrapper>
    );

    const link = screen.getByText('John Doe');
    expect(link.tagName).toBe('A');
  });

  it('should display subtitle when provided', () => {
    const itemWithSubtitle: RelationshipItemType = {
      ...mockItem,
      subtitle: 'University of Example',
    };

    render(
      <TestWrapper>
        <RelationshipItem item={itemWithSubtitle} />
      </TestWrapper>
    );

    expect(screen.getByText('University of Example')).toBeInTheDocument();
  });

  it('should display self-reference indicator', () => {
    const selfRefItem: RelationshipItemType = {
      ...mockItem,
      isSelfReference: true,
    };

    render(
      <TestWrapper>
        <RelationshipItem item={selfRefItem} />
      </TestWrapper>
    );

    // Self-reference is now shown as a Badge component with "Self" text
    expect(screen.getByText('Self')).toBeInTheDocument();
  });

  it('should display metadata when provided', () => {
    const itemWithMetadata: RelationshipItemType = {
      ...mockItem,
      metadata: {
        type: 'authorship',
        position: 1,
        isCorresponding: true,
      },
    };

    render(
      <TestWrapper>
        <RelationshipItem item={itemWithMetadata} />
      </TestWrapper>
    );

    // Metadata is displayed as human-readable text via formatMetadata
    // Expected output: "1st author · corresponding"
    const metadataText = screen.getByText(/1st author/i);
    expect(metadataText).toBeInTheDocument();
    expect(metadataText).toHaveTextContent('corresponding');
  });

  it('should handle click navigation for outbound relationships', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <RelationshipItem item={mockItem} />
      </TestWrapper>
    );

    const link = screen.getByText('John Doe');
    await user.click(link);

    // Should navigate to target entity for outbound relationships
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/authors/A456' });
  });

  it('should handle click navigation for inbound relationships', async () => {
    const user = userEvent.setup();

    const inboundItem: RelationshipItemType = {
      ...mockItem,
      direction: 'inbound',
    };

    render(
      <TestWrapper>
        <RelationshipItem item={inboundItem} />
      </TestWrapper>
    );

    const link = screen.getByText('John Doe');
    await user.click(link);

    // Should navigate to source entity for inbound relationships
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/works/W123' });
  });
});
