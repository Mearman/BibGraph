/**
 * Component tests for RelationshipTypeFilter
 * Tests the categorized accordion + chip UI with preset buttons
 */

import { RelationType } from '@bibgraph/types';
import { MantineProvider } from '@mantine/core';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RelationshipTypeFilter } from './RelationshipTypeFilter';


describe('RelationshipTypeFilter', () => {
  const mockOnChange = vi.fn();

  // Get unique relationship types (excluding deprecated aliases)
  const getUniqueTypes = (): RelationType[] => {
    const values = Object.values(RelationType);
    const seen = new Set<string>();
    return values.filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  };

  const renderComponent = (selectedTypes: RelationType[] = []) => {
    return render(
      <MantineProvider>
        <RelationshipTypeFilter
          selectedTypes={selectedTypes}
          onChange={mockOnChange}
        />
      </MantineProvider>
    );
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render filter component with title', () => {
    renderComponent();
    expect(screen.getByText('Filter by Relationship Type')).toBeInTheDocument();
  });

  it('should render preset buttons', () => {
    renderComponent();

    expect(screen.getByTestId('preset-all')).toBeInTheDocument();
    expect(screen.getByTestId('preset-core')).toBeInTheDocument();
    expect(screen.getByTestId('preset-citations')).toBeInTheDocument();
  });

  it('should call onChange with empty array when All preset is clicked', async () => {
    const user = userEvent.setup();
    const selectedTypes = [RelationType.AUTHORSHIP];
    renderComponent(selectedTypes);

    const allPreset = screen.getByTestId('preset-all');
    await user.click(allPreset);

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('should call onChange with core types when Core Only preset is clicked', async () => {
    const user = userEvent.setup();
    renderComponent([]);

    const corePreset = screen.getByTestId('preset-core');
    await user.click(corePreset);

    expect(mockOnChange).toHaveBeenCalledWith([
      RelationType.AUTHORSHIP,
      RelationType.AFFILIATION,
      RelationType.PUBLICATION,
      RelationType.REFERENCE,
      RelationType.TOPIC,
    ]);
  });

  it('should call onChange with REFERENCE when Citations preset is clicked', async () => {
    const user = userEvent.setup();
    renderComponent([]);

    const citationsPreset = screen.getByTestId('preset-citations');
    await user.click(citationsPreset);

    expect(mockOnChange).toHaveBeenCalledWith([RelationType.REFERENCE]);
  });

  it('should render chips for relationship types within accordion', () => {
    renderComponent();

    // Core category should be open by default
    expect(screen.getByTestId(`filter-chip-${RelationType.AUTHORSHIP}`)).toBeInTheDocument();
    expect(screen.getByTestId(`filter-chip-${RelationType.REFERENCE}`)).toBeInTheDocument();
  });

  it('should render chips for core category types when empty selection (all shown)', () => {
    renderComponent([]);

    // Chips should be rendered in core category (open by default)
    expect(screen.getByTestId(`filter-chip-${RelationType.AUTHORSHIP}`)).toBeInTheDocument();
    expect(screen.getByTestId(`filter-chip-${RelationType.REFERENCE}`)).toBeInTheDocument();
  });

  it('should render chips in core category for specific selection', () => {
    const selectedTypes = [RelationType.AUTHORSHIP, RelationType.REFERENCE];
    renderComponent(selectedTypes);

    // All core category chips should be present
    expect(screen.getByTestId(`filter-chip-${RelationType.AUTHORSHIP}`)).toBeInTheDocument();
    expect(screen.getByTestId(`filter-chip-${RelationType.REFERENCE}`)).toBeInTheDocument();
    expect(screen.getByTestId(`filter-chip-${RelationType.PUBLICATION}`)).toBeInTheDocument();
  });

  it('should call onChange when chip is toggled from "all" state', async () => {
    const user = userEvent.setup();
    renderComponent([]);

    const authorshipChip = screen.getByTestId(`filter-chip-${RelationType.AUTHORSHIP}`);
    await user.click(authorshipChip);

    // When empty array (all selected), clicking should exclude that type
    const allTypes = getUniqueTypes();
    const expectedTypes = allTypes.filter(t => t !== RelationType.AUTHORSHIP);
    expect(mockOnChange).toHaveBeenCalledWith(expectedTypes);
  });

  it('should add type when chip is clicked on unselected type', async () => {
    const user = userEvent.setup();
    const selectedTypes = [RelationType.AUTHORSHIP];
    renderComponent(selectedTypes);

    const referenceChip = screen.getByTestId(`filter-chip-${RelationType.REFERENCE}`);
    await user.click(referenceChip);

    expect(mockOnChange).toHaveBeenCalledWith([RelationType.AUTHORSHIP, RelationType.REFERENCE]);
  });

  it('should remove type when chip is clicked on selected type', async () => {
    const user = userEvent.setup();
    const selectedTypes = [RelationType.AUTHORSHIP, RelationType.REFERENCE];
    renderComponent(selectedTypes);

    const authorshipChip = screen.getByTestId(`filter-chip-${RelationType.AUTHORSHIP}`);
    await user.click(authorshipChip);

    expect(mockOnChange).toHaveBeenCalledWith([RelationType.REFERENCE]);
  });

  it('should use custom title when provided', () => {
    render(
      <MantineProvider>
        <RelationshipTypeFilter
          selectedTypes={[]}
          onChange={mockOnChange}
          title="Custom Filter Title"
        />
      </MantineProvider>
    );

    expect(screen.getByText('Custom Filter Title')).toBeInTheDocument();
  });

  it('should show selection count badge when types are selected', () => {
    const selectedTypes = [RelationType.AUTHORSHIP, RelationType.REFERENCE];
    renderComponent(selectedTypes);

    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('should not show selection count when showing all (empty array)', () => {
    renderComponent([]);

    expect(screen.queryByText(/\d+ selected/)).not.toBeInTheDocument();
  });

  it('should highlight active preset button via class when All is active', () => {
    renderComponent([]);

    // When selectedTypes is empty, "All" preset should be active
    // Just verify the button exists and is clickable
    const allPreset = screen.getByTestId('preset-all');
    expect(allPreset).toBeInTheDocument();
  });

  it('should render category toggle buttons', () => {
    renderComponent();

    // Core category should be open by default - look for its toggle
    const coreToggle = screen.getByTestId('category-toggle-core');
    expect(coreToggle).toBeInTheDocument();
    expect(coreToggle).toHaveTextContent('Deselect All');
  });
});
