/**
 * Component tests for SearchInterface component
 * @vitest-environment jsdom
 */

import { MantineProvider } from "@mantine/core";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SearchInterface } from "./SearchInterface";

// Mock ResizeObserver before importing Mantine
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia before importing Mantine
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

// Mock the data-helpers module
vi.mock("@bibgraph/utils", () => ({
  debouncedSearch: vi.fn((callback: () => void) => {
    callback();
  }),
  normalizeSearchQuery: vi.fn((query: string) => query.trim().toLowerCase()),
  isValidSearchQuery: vi.fn((query: string) => query.trim().length >= 2),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the style constants
vi.mock("@/config/style-constants", () => ({
  BORDER_STYLE_GRAY_3: "1px solid #e9ecef",
  ICON_SIZE: {
    MD: 16,
    SM: 14,
  },
}));

// Mock the useSearchHistory hook to avoid requiring StorageProviderWrapper
vi.mock("@/hooks/useSearchHistory", () => ({
  useSearchHistory: () => ({
    addSearchQuery: vi.fn(),
    searchHistory: [],
    clearSearchHistory: vi.fn(),
    removeSearchQuery: vi.fn(),
    isLoading: false,
  }),
}));

const renderWithMantine = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe("SearchInterface", () => {
  const mockOnSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup(); // Clean up DOM between tests
  });

  it("should render search interface with default props", () => {
    renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

    expect(screen.getByText(/Search Academic Literature/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/Search academic works/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /search/i })).toBeTruthy();
    // Filter toggle button has been removed from component
  });

  it("should render with custom placeholder", () => {
    const customPlaceholder = "Custom search placeholder";
    renderWithMantine(
      <SearchInterface
        onSearch={mockOnSearch}
        placeholder={customPlaceholder}
      />,
    );

    expect(
      screen.getByPlaceholderText(/Custom search placeholder/i),
    ).toBeTruthy();
  });

  it("should not show filter toggle button", () => {
    renderWithMantine(
      <SearchInterface onSearch={mockOnSearch} />,
    );

    // Filter toggle button has been removed from component
    expect(screen.queryByRole("button", { name: /show filters/i })).toBeNull();
  });

  it("should handle search input changes", () => {
    renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

    const searchInput = screen.getByPlaceholderText(
      /Search academic works, authors, institutions/i,
    );
    fireEvent.change(searchInput, { target: { value: "test query" } });

    expect((searchInput as HTMLInputElement).value).toBe("test query");
  });

  it("should call onSearch when search button is clicked", () => {
    renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

    const searchInput = screen.getByPlaceholderText(
      /Search academic works, authors, institutions/i,
    );
    const searchButton = screen.getByRole("button", { name: /search/i });

    fireEvent.change(searchInput, { target: { value: "test query" } });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      query: "test query",
    });
  });

  it("should show loading state", () => {
    renderWithMantine(
      <SearchInterface onSearch={mockOnSearch} isLoading={true} />,
    );

    const searchInput = screen.getByPlaceholderText(
      /Search academic works, authors, institutions/i,
    );
    const searchButton = screen.getByRole("button", { name: /search/i });

    expect((searchInput as HTMLInputElement).disabled).toBe(true);
    expect(searchButton.dataset.loading).toBe("true");
  });

  
  it("should show clear button when there is content", () => {
    renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

    const searchInput = screen.getByPlaceholderText(
      /Search academic works/i,
    );
    fireEvent.change(searchInput, { target: { value: "test query" } });

    expect(screen.getByRole("button", { name: /clear/i })).toBeTruthy();
  });

  it("should clear filters when clear button is clicked", () => {
    renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

    const searchInput = screen.getByPlaceholderText(
      /Search academic works/i,
    );
    fireEvent.change(searchInput, { target: { value: "test query" } });

    const clearButton = screen.getByRole("button", { name: /clear/i });
    fireEvent.click(clearButton);

    expect((searchInput as HTMLInputElement).value).toBe("");
    expect(mockOnSearch).toHaveBeenCalledWith({
      query: "",
    });
  });

  it("should handle debounced search for valid queries", async () => {
    // Import the mocked functions to access them
    const { debouncedSearch, isValidSearchQuery } = await import(
      "@bibgraph/utils"
    );

    renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

    const searchInput = screen.getByPlaceholderText(
      /Search academic works/i,
    );
    fireEvent.change(searchInput, { target: { value: "valid query" } });

    // Wait for debounced search to be called
    await waitFor(() => {
      expect(isValidSearchQuery).toHaveBeenCalledWith("valid query");
      expect(debouncedSearch).toHaveBeenCalled();
    });
  });

  it("should not trigger debounced search for invalid queries", async () => {
    // Import the mocked functions to access them
    const { debouncedSearch, isValidSearchQuery } = await import(
      "@bibgraph/utils"
    );

    // Mock isValidSearchQuery to return false for short queries
    vi.mocked(isValidSearchQuery).mockReturnValue(false);

    renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

    const searchInput = screen.getByPlaceholderText(
      /Search academic works/i,
    );
    fireEvent.change(searchInput, { target: { value: "a" } });

    expect(isValidSearchQuery).toHaveBeenCalledWith("a");
    expect(debouncedSearch).not.toHaveBeenCalled();
  });

  it("should normalize search query on search", async () => {
    // Import the mocked functions to access them
    const { normalizeSearchQuery, isValidSearchQuery } = await import(
      "@bibgraph/utils"
    );

    vi.mocked(isValidSearchQuery).mockReturnValue(true);
    vi.mocked(normalizeSearchQuery).mockReturnValue("normalized query");

    renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

    const searchInput = screen.getByPlaceholderText(
      /Search academic works/i,
    );
    const searchButton = screen.getByRole("button", { name: /search/i });

    fireEvent.change(searchInput, { target: { value: "  Test Query  " } });
    fireEvent.click(searchButton);

    expect(normalizeSearchQuery).toHaveBeenCalledWith("  Test Query  ");
    expect(mockOnSearch).toHaveBeenCalledWith({
      query: "normalized query",
    });
  });

  it("should handle empty query on search", async () => {
    renderWithMantine(<SearchInterface onSearch={mockOnSearch} />);

    // First add some content to enable the clear button
    const searchInput = screen.getByPlaceholderText(
      /Search academic works, authors, institutions/i,
    );
    fireEvent.change(searchInput, { target: { value: "test query" } });

    // Then clear it - this should trigger onSearch with empty query
    const clearButton = screen.getByRole("button", { name: /clear/i });
    fireEvent.click(clearButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      query: "",
    });
  });
});
