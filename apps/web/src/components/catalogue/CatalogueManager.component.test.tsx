/**
 * Component tests for the catalogue manager's tab bar: the Lists tab counts exactly the list-type rows its panel shows (never bibliographies or hidden system lists), and the system-lists toggle names what it reveals.
 */

import type { CatalogueList } from "@bibgraph/utils";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/contexts/catalogue-context", () => ({
  useCatalogueContext: () => ({
    lists: [],
    selectedList: undefined,
    isLoadingLists: false,
    deleteList: vi.fn(),
    selectList: vi.fn(),
    entities: [],
  }),
}));

// Heavy children are irrelevant to the tab bar; stub them so the context mock above stays minimal.
vi.mock("./CatalogueList", () => ({
  CatalogueListComponent: () => <div data-testid="catalogue-list-stub" />,
}));
vi.mock("./CatalogueEntities", () => ({
  CatalogueEntities: () => <div data-testid="catalogue-entities-stub" />,
}));
vi.mock("./CacheTierLists", () => ({
  CacheTierLists: () => <div data-testid="cache-tiers-stub" />,
}));
vi.mock("./CatalogueModals", () => ({
  CatalogueModals: () => null,
}));
vi.mock("./SelectedListDetails", () => ({
  SelectedListDetails: () => null,
}));
vi.mock("./TagCloud", () => ({
  TagCloud: () => null,
}));
vi.mock("./CatalogueHeader", () => ({
  CatalogueHeader: () => null,
}));

import { CatalogueManager } from "./CatalogueManager";
import { useCatalogueManagerState } from "./hooks/useCatalogueManagerState";

const baseList = (id: string, type: string, title: string): CatalogueList =>
  ({
    id,
    type,
    title,
    createdAt: new Date("2026-10-01T10:00:00Z"),
    updatedAt: new Date("2026-10-01T10:00:00Z"),
    isPublic: false,
  }) as CatalogueList;

// The manager's filtered lists reach the tab bar through the state hook; stub it so the test controls exactly which lists are shown.
vi.mock("./hooks/useCatalogueManagerState", () => ({
  useCatalogueManagerState: vi.fn(),
}));

const stubStateWith = (readonlyFilteredLists: readonly CatalogueList[]) => {
  const filteredLists = [...readonlyFilteredLists];
  const state = {
    searchQuery: "",
    setSearchQuery: vi.fn(),
    showSystemCatalogues: false,
    handleShowSystemCataloguesChange: vi.fn(),
    searchInputRef: { current: null },
    selectedTags: new Set<string>(),
    handleToggleTag: vi.fn(),
    handleClearTags: vi.fn(),
    handleShare: vi.fn(),
    handleImport: vi.fn(),
    handleUseTemplate: vi.fn(),
    handleCreateSmartList: vi.fn(),
    handleMergeLists: vi.fn(),
    handleCreateList: vi.fn(),
    handleCloseCreateModal: vi.fn(),
    activeTab: "lists",
    setActiveTab: vi.fn(),
    filteredLists,
    showCreateModal: false,
    showTemplatesModal: false,
    showSmartListsModal: false,
    showMergeModal: false,
    showShareModal: false,
    showImportModal: false,
    showExportModal: false,
    showAnalyticsModal: false,
    showCitationModal: false,
    setShowCreateModal: vi.fn(),
    setShowTemplatesModal: vi.fn(),
    setShowSmartListsModal: vi.fn(),
    setShowMergeModal: vi.fn(),
    setShowShareModal: vi.fn(),
    setShowImportModal: vi.fn(),
    setShowExportModal: vi.fn(),
    setShowAnalyticsModal: vi.fn(),
    setShowCitationModal: vi.fn(),
    selectedTemplate: null,
    setSelectedTemplate: vi.fn(),
    shareUrl: "",
    listStats: null,
  };
  vi.mocked(useCatalogueManagerState).mockReturnValue(state);
  return state;
};

const renderManager = () =>
  render(
    <MantineProvider>
      <CatalogueManager />
    </MantineProvider>,
  );

describe("CatalogueManager tabs", () => {
  it("counts only list-type entries in the Lists tab, excluding bibliographies", () => {
    stubStateWith([
      baseList("graph-list", "list", "Graph"),
      baseList("bib-1", "bibliography", "Thesis bibliography"),
    ]);

    renderManager();

    expect(screen.getByText("Lists (1)")).toBeVisible();
    expect(screen.getByText("Bibliographies (1)")).toBeVisible();
  });

  it("counts zero lists when the only entries are hidden system lists of other types", () => {
    stubStateWith([
      baseList("bookmarks-list", "bookmarks", "Bookmarks"),
      baseList("history-list", "history", "History"),
    ]);

    renderManager();

    expect(screen.getByText("Lists (0)")).toBeVisible();
  });

  it("names what the system-lists toggle reveals", () => {
    stubStateWith([]);

    renderManager();

    expect(screen.getByTestId("show-system-catalogues-toggle")).toHaveAccessibleName(
      /show system lists/i,
    );
  });
});
