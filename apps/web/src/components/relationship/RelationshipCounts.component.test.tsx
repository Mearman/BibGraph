/**
 * Component tests for RelationshipCounts
 */

import { MantineProvider } from '@mantine/core';
import { cleanup,render, screen } from '@testing-library/react';
import { afterEach,describe, expect, it } from 'vitest';

import { RelationshipCounts } from './RelationshipCounts';

describe('RelationshipCounts', () => {
  const renderComponent = (properties: Readonly<{
    incomingCount: number;
    outgoingCount: number;
    showGrandTotal?: boolean;
  }>) => {
    return render(
      <MantineProvider>
        <RelationshipCounts {...properties} />
      </MantineProvider>
    );
  };

  afterEach(() => {
    cleanup();
  });

  it('should render count summary with all badges', () => {
    renderComponent({ incomingCount: 5, outgoingCount: 10 });

    expect(screen.getByText('Total Relationships:')).toBeInTheDocument();
    expect(screen.getByTestId('incoming-count-badge')).toHaveTextContent('5 Incoming');
    expect(screen.getByTestId('outgoing-count-badge')).toHaveTextContent('10 Outgoing');
    expect(screen.getByTestId('grand-total-badge')).toHaveTextContent('15 Total');
  });

  it('should calculate grand total correctly', () => {
    renderComponent({ incomingCount: 3, outgoingCount: 7 });

    const grandTotalBadge = screen.getByTestId('grand-total-badge');
    expect(grandTotalBadge).toHaveTextContent('10 Total');
  });

  it('should hide grand total badge when showGrandTotal is false', () => {
    renderComponent({ incomingCount: 5, outgoingCount: 10, showGrandTotal: false });

    expect(screen.getByTestId('incoming-count-badge')).toBeInTheDocument();
    expect(screen.getByTestId('outgoing-count-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('grand-total-badge')).not.toBeInTheDocument();
  });

  it('should display zero counts', () => {
    renderComponent({ incomingCount: 0, outgoingCount: 5 });

    expect(screen.getByTestId('incoming-count-badge')).toHaveTextContent('0 Incoming');
    expect(screen.getByTestId('outgoing-count-badge')).toHaveTextContent('5 Outgoing');
  });

  it('should not render when no relationships exist', () => {
    renderComponent({ incomingCount: 0, outgoingCount: 0 });

    expect(screen.queryByTestId('relationship-counts')).not.toBeInTheDocument();
  });

  it('should render with only incoming relationships', () => {
    renderComponent({ incomingCount: 8, outgoingCount: 0 });

    expect(screen.getByTestId('incoming-count-badge')).toHaveTextContent('8 Incoming');
    expect(screen.getByTestId('outgoing-count-badge')).toHaveTextContent('0 Outgoing');
    expect(screen.getByTestId('grand-total-badge')).toHaveTextContent('8 Total');
  });

  it('should render with only outgoing relationships', () => {
    renderComponent({ incomingCount: 0, outgoingCount: 12 });

    expect(screen.getByTestId('incoming-count-badge')).toHaveTextContent('0 Incoming');
    expect(screen.getByTestId('outgoing-count-badge')).toHaveTextContent('12 Outgoing');
    expect(screen.getByTestId('grand-total-badge')).toHaveTextContent('12 Total');
  });
});
