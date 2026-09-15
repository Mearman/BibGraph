import type * as BibgraphClient from "@bibgraph/client";
import type { InstitutionEntity } from "@bibgraph/types";
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

const { getInstitutionMock } = vi.hoisted(() => ({
  getInstitutionMock: vi.fn(),
}));

// Mock cachedOpenAlex client
vi.mock("@bibgraph/client", async (importOriginal) => {
  const actual = await importOriginal<typeof BibgraphClient>();
  return {
    ...actual,
    cachedOpenAlex: {
      client: {
        institutions: {
          getInstitution: getInstitutionMock,
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
    useLocation: vi.fn().mockReturnValue({ pathname: '/entities/I123', search: '' }),
    Link: ({ children, ...properties }: any) => <a {...properties}>{children}</a>,
  };
});


import InstitutionRoute from "@/routes/institutions/$_.lazy";

// Synthetic mock data for institution
const mockInstitutionData = {
  id: "https://openalex.org/I123",
  display_name: "Sample Institution",
  country_code: "US",
  type: "university",
  works_count: 5000,
  cited_by_count: 10_000,
  ror: "https://ror.org/123",
  counts_by_year: [],
  updated_date: "2023-01-01",
  created_date: "2023-01-01",
  geo: {
    country_code: "US",
    country: "United States",
  },
  international: {
    display_name: {},
  },
} as InstitutionEntity;

describe("InstitutionRoute Integration Tests", () => {
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
    vi.mocked(useParams).mockReturnValue({ _splat: "I123" });

    // Mock useSearch
    vi.mocked(useSearch).mockReturnValue({});

    // Mock successful API response by default
    getInstitutionMock.mockResolvedValue(mockInstitutionData);
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
    getInstitutionMock.mockImplementation(async () => {
      await new Promise(() => {
        // Never resolves - keeps the component in its loading state for this test.
      });
      return mockInstitutionData;
    });

    render(
      <TestWrapper>
        <InstitutionRoute />
      </TestWrapper>,
    );

    expect(screen.getByText("Loading Institution...")).toBeInTheDocument();
    expect(screen.getByText("I123")).toBeInTheDocument();
  });

  it("renders error state when API fails", async () => {
    const mockError = new Error("API Error");
    getInstitutionMock.mockRejectedValue(mockError);

    render(
      <TestWrapper>
        <InstitutionRoute />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("Error Loading Institution")).toBeInTheDocument();
    });

    expect(screen.getByText("I123")).toBeInTheDocument();
    expect(screen.getByText(/Error:.*API Error/)).toBeInTheDocument();
  });

  it("renders institution data in rich view by default", async () => {
    render(
      <TestWrapper>
        <InstitutionRoute />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Institution" })).toBeInTheDocument();
    });

    // Name appears in h1 and EntityDataDisplay - just verify it exists
    expect(screen.getAllByText(/Sample Institution/).length).toBeGreaterThan(0);

    // Should have toggle button
    expect(screen.getByText("Raw")).toBeInTheDocument();

    // Should NOT show JSON by default
    expect(screen.queryByText(/"id":/)).not.toBeInTheDocument();
  });

  it("toggles to raw view and renders JSON", async () => {
    render(
      <TestWrapper>
        <InstitutionRoute />
      </TestWrapper>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Institution" })).toBeInTheDocument();
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
    expect(screen.getByText(/"country_code":/)).toBeInTheDocument();
  });

  it("toggles back to rich view from raw view", async () => {
    render(
      <TestWrapper>
        <InstitutionRoute />
      </TestWrapper>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Institution" })).toBeInTheDocument();
    });

    // Toggle to raw
    fireEvent.click(screen.getByText("Raw"));
    await waitFor(() => {
      expect(screen.getByText(/"display_name":/)).toBeInTheDocument();
    });

    // Toggle back to rich
    fireEvent.click(screen.getByText("Rich"));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Institution" })).toBeInTheDocument();
    });

    // Should NOT show JSON
    expect(screen.queryByText(/"id":/)).not.toBeInTheDocument();
  });

  it("does not refetch data on view toggle", async () => {
    render(
      <TestWrapper>
        <InstitutionRoute />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Institution" })).toBeInTheDocument();
    });

    // Should have been called once on mount
    expect(getInstitutionMock).toHaveBeenCalledTimes(1);

    // Toggle to raw
    fireEvent.click(screen.getByText("Raw"));
    await waitFor(() => {
      expect(screen.getByText(/"display_name":/)).toBeInTheDocument();
    });

    // Should still be called only once
    expect(getInstitutionMock).toHaveBeenCalledTimes(1);

    // Toggle back to rich
    fireEvent.click(screen.getByText("Rich"));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sample Institution" })).toBeInTheDocument();
    });

    // Should still be called only once
    expect(getInstitutionMock).toHaveBeenCalledTimes(1);
  });
});
