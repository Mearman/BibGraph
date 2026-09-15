// @vitest-environment jsdom
/**
 * Component tests for VisualQueryBuilder component
 */

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type VisualQuery,VisualQueryBuilder } from "./VisualQueryBuilder";

type QueryChangeHandler = (query: VisualQuery) => void;

// Mock ResizeObserver before importing Mantine
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia before importing Mantine
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock DnD Kit
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ""),
    },
  },
}));

// Mock logger
vi.mock("@bibgraph/utils", () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Test wrapper with MantineProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe("VisualQueryBuilder", () => {
  const mockOnQueryChange = vi.fn<QueryChangeHandler>();
  const mockOnApply = vi.fn<QueryChangeHandler>();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders with initial query structure", () => {
    render(
      <VisualQueryBuilder
        entityType="works"
        onQueryChange={mockOnQueryChange}
        onApply={mockOnApply}
      />,
      { wrapper: TestWrapper },
    );

    expect(screen.getByText("Visual Query Builder")).toBeTruthy();
    expect(screen.getByText("Query Group 1")).toBeTruthy();
    expect(screen.getByText("Filter Palette")).toBeTruthy();
  });

  it("displays instructions for users", () => {
    render(
      <VisualQueryBuilder
        entityType="works"
        onQueryChange={mockOnQueryChange}
      />,
      { wrapper: TestWrapper },
    );

    expect(
      screen.getAllByText(/Drag filter chips from the palette/),
    ).toHaveLength(1);
  });

  it("renders available filter chips by category", () => {
    render(
      <VisualQueryBuilder
        entityType="works"
        onQueryChange={mockOnQueryChange}
      />,
      { wrapper: TestWrapper },
    );

    // Check for category headers (one instance per category)
    expect(screen.getAllByText("text")).toHaveLength(1);
    expect(screen.getAllByText("temporal")).toHaveLength(1);
    expect(screen.getAllByText("numeric")).toHaveLength(1);
    expect(screen.getAllByText("general")).toHaveLength(1);

    // Check for specific chips (one instance each in the palette)
    expect(screen.getAllByText("Title/Name")).toHaveLength(1);
    expect(screen.getAllByText("Publication Year")).toHaveLength(1);
    expect(screen.getAllByText("Citation Count")).toHaveLength(1);
    expect(screen.getAllByText("equals")).toHaveLength(1);
    expect(screen.getAllByText("contains")).toHaveLength(1);
  });

  it("renders entity-specific chips for works", () => {
    render(
      <VisualQueryBuilder
        entityType="works"
        onQueryChange={mockOnQueryChange}
      />,
      { wrapper: TestWrapper },
    );

    expect(screen.getAllByText("Work Type")).toHaveLength(1);
    expect(screen.getAllByText("Concepts")).toHaveLength(1);
  });

  it("renders entity-specific chips for authors", () => {
    render(
      <VisualQueryBuilder
        entityType="authors"
        onQueryChange={mockOnQueryChange}
      />,
      { wrapper: TestWrapper },
    );

    expect(screen.getAllByText("Works Count")).toHaveLength(1);
    expect(screen.getAllByText("H-Index")).toHaveLength(1);
  });

  it("shows apply button when onApply is provided", () => {
    render(
      <VisualQueryBuilder
        entityType="works"
        onQueryChange={mockOnQueryChange}
        onApply={mockOnApply}
      />,
      { wrapper: TestWrapper },
    );

    const applyButton = screen.getByRole("button", { name: "Apply Query" });
    expect(applyButton).toBeTruthy();
    expect((applyButton as HTMLButtonElement).disabled).toBe(true); // Should be disabled when no chips
  });

  it("hides apply button when onApply is not provided", () => {
    render(
      <VisualQueryBuilder
        entityType="works"
        onQueryChange={mockOnQueryChange}
        onApply={undefined}
      />,
      { wrapper: TestWrapper },
    );

    // When onApply is explicitly undefined, apply buttons should not exist
    const applyButtons = screen.queryAllByRole("button", {
      name: /apply query/i,
    });
    expect(applyButtons).toHaveLength(0);
  });

  it("adds new query group when add group button is clicked", () => {
    render(
      <VisualQueryBuilder
        entityType="works"
        onQueryChange={mockOnQueryChange}
      />,
      { wrapper: TestWrapper },
    );

    const addGroupButtons = screen.getAllByRole("button", {
      name: /add group/i,
    });
    fireEvent.click(addGroupButtons[0]);

    const lastCall = mockOnQueryChange.mock.calls[mockOnQueryChange.mock.calls.length - 1];
    const [updatedQuery] = lastCall;
    expect(updatedQuery.groups).toHaveLength(2);
    for (const group of updatedQuery.groups) {
      expect(group.id).toMatch(/^group-/);
    }
  });

  it("renders with initial query when provided", () => {
    const initialQuery: VisualQuery = {
      id: "test-query",
      entityType: "works",
      groups: [
        {
          id: "test-group",
          operator: "AND",
          chips: [
            {
              id: "test-chip",
              type: "field",
              field: "display_name",
              label: "Test Chip",
              category: "text",
              dataType: "string",
              enabled: true,
            },
          ],
          enabled: true,
        },
      ],
    };

    render(
      <VisualQueryBuilder
        entityType="works"
        initialQuery={initialQuery}
        onQueryChange={mockOnQueryChange}
      />,
      { wrapper: TestWrapper },
    );

    expect(screen.getByText("Test Chip")).toBeTruthy();
    expect(screen.getByText("1 filter")).toBeTruthy();
  });

  it("disables interactions when disabled prop is true", () => {
    render(
      <VisualQueryBuilder
        entityType="works"
        onQueryChange={mockOnQueryChange}
        onApply={mockOnApply}
        disabled={true}
      />,
      { wrapper: TestWrapper },
    );

    const addGroupButtons = screen.getAllByRole("button", {
      name: /add group/i,
    });
    const applyButtons = screen.getAllByRole("button", {
      name: /apply query/i,
    });

    // Check that buttons have disabled attribute
    for (const button of addGroupButtons) expect(button).toHaveProperty("disabled", true)
    ;
    for (const button of applyButtons) expect(button).toHaveProperty("disabled", true)
    ;
  });

  it("shows correct chip count in group description", () => {
    const initialQuery: VisualQuery = {
      id: "test-query",
      entityType: "works",
      groups: [
        {
          id: "test-group",
          operator: "AND",
          chips: [
            {
              id: "chip1",
              type: "field",
              field: "display_name",
              label: "Chip 1",
              category: "text",
              dataType: "string",
              enabled: true,
            },
            {
              id: "chip2",
              type: "field",
              field: "publication_year",
              label: "Chip 2",
              category: "temporal",
              dataType: "number",
              enabled: true,
            },
          ],
          enabled: true,
        },
      ],
    };

    render(
      <VisualQueryBuilder
        entityType="works"
        initialQuery={initialQuery}
        onQueryChange={mockOnQueryChange}
      />,
      { wrapper: TestWrapper },
    );

    expect(screen.getByText("2 filters")).toBeTruthy();
  });

  it("shows empty drop zone message when group has no chips", () => {
    render(
      <VisualQueryBuilder
        entityType="works"
        onQueryChange={mockOnQueryChange}
      />,
      { wrapper: TestWrapper },
    );

    const dropMessages = screen.getAllByText("Drop filter chips here");
    expect(dropMessages).toHaveLength(1); // One empty group by default
  });

  it("enables clear button when chips are present", () => {
    const initialQuery: VisualQuery = {
      id: "test-query",
      entityType: "works",
      groups: [
        {
          id: "test-group",
          operator: "AND",
          chips: [
            {
              id: "test-chip",
              type: "field",
              field: "display_name",
              label: "Test Chip",
              category: "text",
              dataType: "string",
              enabled: true,
            },
          ],
          enabled: true,
        },
      ],
    };

    render(
      <VisualQueryBuilder
        entityType="works"
        initialQuery={initialQuery}
        onQueryChange={mockOnQueryChange}
      />,
      { wrapper: TestWrapper },
    );

    const clearButtons = screen.getAllByRole("button", { name: /clear all/i });
    const enabledClearButtons = clearButtons.filter(
      (button) => !button.hasAttribute("disabled"),
    );
    expect(enabledClearButtons.length).toBeGreaterThan(0);
  });
});
