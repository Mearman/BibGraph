import type * as BibgraphClient from "@bibgraph/client";
import type { Work } from "@bibgraph/types";
import { InMemoryStorageProvider } from "@bibgraph/utils";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type * as TanstackReactRouter from "@tanstack/react-router";
import { useParams, useSearch } from "@tanstack/react-router";
import { cleanup,fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach,beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationProvider } from "@/contexts/NotificationContext";
import { StorageProviderWrapper } from "@/contexts/storage-provider-context";
import { UndoRedoProvider } from "@/contexts/UndoRedoContext";

const { getWorkMock } = vi.hoisted(() => ({
  getWorkMock: vi.fn(),
}));

// Mock cachedOpenAlex client
vi.mock("@bibgraph/client", async (importOriginal) => {
  const actual = await importOriginal<typeof BibgraphClient>();
  return {
    ...actual,
    cachedOpenAlex: {
      client: {
        works: {
          getWork: getWorkMock,
        },
      },
    },
  };
});

// Mock router hooks and Link component
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof TanstackReactRouter>();
  return {
    ...actual,
    useParams: vi.fn(),
    useSearch: vi.fn(),
    useLocation: vi.fn().mockReturnValue({ pathname: '/entities/W123', search: '' }),
    Link: ({ children, ...properties }: any) => <a {...properties}>{children}</a>,
  };
});

import { Route as WorkRouteExport } from "@/routes/works/$_.lazy";

// Extract the component from the lazy route
const WorkRoute = WorkRouteExport.options.component!;

// Synthetic mock data for work
const mockWorkData = {
  id: "https://openalex.org/W123",
  display_name: "Sample Work Title",
  title: "Sample Work Title",
  publication_year: 2023,
  cited_by_count: 100,
  type: "journal-article",
} as Work;

describe("WorkRoute Integration Tests", () => {
  let queryClient: QueryClient;
  let storage: InMemoryStorageProvider;

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });

    storage = new InMemoryStorageProvider();
    await storage.initializeSpecialLists();

    // Mock useParams
    vi.mocked(useParams).mockReturnValue({ _splat: "W123" });

    // Mock useSearch
    vi.mocked(useSearch).mockReturnValue({});

    // Mock successful API response by default
    getWorkMock.mockResolvedValue(mockWorkData);
  });

  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <StorageProviderWrapper provider={storage}>
        <NotificationProvider>
          <UndoRedoProvider>
            <MantineProvider>
              {children}
            </MantineProvider>
          </UndoRedoProvider>
        </NotificationProvider>
      </StorageProviderWrapper>
    </QueryClientProvider>
  );

  afterEach(() => {
    cleanup();
    queryClient.clear();
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    // Make the API call slow to test loading state
    getWorkMock.mockImplementation(async () => {
      await new Promise(() => {
        // Never resolves - keeps the component in its loading state for this test.
      });
      return mockWorkData;
    });

    render(
      <TestWrapper>
        <WorkRoute />
      </TestWrapper>,
    );

    expect(screen.getByText("Loading Work...")).toBeInTheDocument();
    expect(screen.getByText("W123")).toBeInTheDocument();
  });

  it("renders error state when API fails", async () => {
    const mockError = new Error("API Error");
    getWorkMock.mockRejectedValue(mockError);

    render(
      <TestWrapper>
        <WorkRoute />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("Error Loading Work")).toBeInTheDocument();
    });

    expect(screen.getByText("W123")).toBeInTheDocument();
    expect(screen.getByText(/Error:.*API Error/)).toBeInTheDocument();
  });

  it("renders work data in rich view by default", async () => {
    render(
      <TestWrapper>
        <WorkRoute />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Work Title" })).toBeInTheDocument();
    });

    // Title appears in h1 and EntityDataDisplay - just verify it exists
    expect(screen.getAllByText(/Sample Work Title/).length).toBeGreaterThan(0);

    // Should have toggle button with new text
    expect(screen.getByText("Raw")).toBeInTheDocument();

    // Should NOT show JSON by default
    expect(screen.queryByText(/"id":/)).not.toBeInTheDocument();
  });

  it("toggles to raw view and renders JSON", async () => {
    render(
      <TestWrapper>
        <WorkRoute />
      </TestWrapper>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Work Title" })).toBeInTheDocument();
    });

    // Click toggle button
    const toggleButton = screen.getByText("Raw");
    fireEvent.click(toggleButton);

    // Should show JSON
    await waitFor(() => {
      expect(screen.getByText(/"display_name":/)).toBeInTheDocument();
    });

    // Verify JSON content is visible
    expect(screen.getByText(/"id":/)).toBeInTheDocument();
    expect(screen.getByText(/"publication_year":/)).toBeInTheDocument();
  });

  it("toggles back to rich view from raw view", async () => {
    render(
      <TestWrapper>
        <WorkRoute />
      </TestWrapper>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Work Title" })).toBeInTheDocument();
    });

    // Toggle to raw
    fireEvent.click(screen.getByText("Raw"));
    await waitFor(() => {
      expect(screen.getByText(/"display_name":/)).toBeInTheDocument();
    });

    // Toggle back to rich
    fireEvent.click(screen.getByText("Rich"));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Work Title" })).toBeInTheDocument();
    });

    // Should NOT show JSON
    expect(screen.queryByText(/"id":/)).not.toBeInTheDocument();
  });

  it("does not refetch data on view toggle", async () => {
    render(
      <TestWrapper>
        <WorkRoute />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Work Title" })).toBeInTheDocument();
    });

    // Should have been called once on mount
    expect(getWorkMock).toHaveBeenCalledTimes(1);

    // Toggle to raw
    fireEvent.click(screen.getByText("Raw"));
    await waitFor(() => {
      expect(screen.getByText(/"display_name":/)).toBeInTheDocument();
    });

    // Should still be called only once
    expect(getWorkMock).toHaveBeenCalledTimes(1);

    // Toggle back to rich
    fireEvent.click(screen.getByText("Rich"));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Work Title" })).toBeInTheDocument();
    });

    // Should still be called only once
    expect(getWorkMock).toHaveBeenCalledTimes(1);
  });
});
