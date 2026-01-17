/**
 * Custom hook for managing CatalogueManager modal and UI state
 * Extracts state management from the main component (Constitution Principle XVI)
 */

import type { CatalogueList,ListType  } from "@bibgraph/utils";
import { logger } from "@bibgraph/utils";
import { SPECIAL_LIST_IDS } from "@bibgraph/utils/storage/catalogue-db";
import { useHotkeys } from "@mantine/hooks";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ListTemplate } from "@/components/catalogue/ListTemplates";
import type { SmartListCriteria } from "@/components/catalogue/SmartLists";
import { useCatalogueContext } from "@/contexts/catalogue-context";
import { settingsActions } from "@/stores/settings-store";

export interface ListStats {
  totalEntities: number;
  entityCounts: Record<string, number>;
}

export interface UseCatalogueManagerStateReturn {
  // Modal visibility states
  showCreateModal: boolean;
  showTemplatesModal: boolean;
  showSmartListsModal: boolean;
  showShareModal: boolean;
  showImportModal: boolean;
  showExportModal: boolean;
  showMergeModal: boolean;
  showAnalyticsModal: boolean;
  showCitationModal: boolean;

  // Modal setters
  setShowCreateModal: (show: boolean) => void;
  setShowTemplatesModal: (show: boolean) => void;
  setShowSmartListsModal: (show: boolean) => void;
  setShowShareModal: (show: boolean) => void;
  setShowImportModal: (show: boolean) => void;
  setShowExportModal: (show: boolean) => void;
  setShowMergeModal: (show: boolean) => void;
  setShowAnalyticsModal: (show: boolean) => void;
  setShowCitationModal: (show: boolean) => void;

  // Template state
  selectedTemplate: ListTemplate | null;
  setSelectedTemplate: (template: ListTemplate | null) => void;

  // Search and filter state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedTags: Set<string>;
  showSystemCatalogues: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;

  // Share state
  shareUrl: string;

  // List stats
  listStats: ListStats | null;

  // Filtered lists
  filteredLists: CatalogueList[];

  // Handlers
  handleShowSystemCataloguesChange: (checked: boolean) => void;
  handleToggleTag: (tag: string) => void;
  handleClearTags: () => void;
  handleShare: () => Promise<void>;
  handleImport: (url: string) => Promise<void>;
  handleUseTemplate: (template: ListTemplate) => void;
  handleCreateSmartList: (criteria: SmartListCriteria) => Promise<void>;
  handleMergeLists: (
    sourceListIds: string[],
    mergeStrategy: 'union' | 'intersection' | 'combine',
    newListName: string,
    deduplicate: boolean
  ) => Promise<string>;
  handleCreateList: (params: {
    title: string;
    description?: string;
    type: ListType;
    tags?: string[];
    isPublic?: boolean;
  }) => Promise<void>;
  handleCloseCreateModal: () => void;

  // Tab state
  activeTab: string | null;
  setActiveTab: (tab: string | null) => void;
}

interface UseCatalogueManagerStateOptions {
  shareData?: string;
  initialListId?: string;
}

export const useCatalogueManagerState = (options: UseCatalogueManagerStateOptions = {}): UseCatalogueManagerStateReturn => {
  const { shareData, initialListId } = options;

  const {
    lists,
    selectedList,
    createList,
    selectList,
    generateShareUrl,
    importFromShareUrl,
    getListStats,
    mergeLists,
  } = useCatalogueContext();

  // Modal visibility states
  const [activeTab, setActiveTab] = useState<string | null>("lists");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showSmartListsModal, setShowSmartListsModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ListTemplate | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showCitationModal, setShowCitationModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showSystemCatalogues, setShowSystemCatalogues] = useState(false);
  const [listStats, setListStats] = useState<ListStats | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Load showSystemCatalogues setting on mount
  useEffect(() => {
    void settingsActions.getShowSystemCatalogues().then(setShowSystemCatalogues);
  }, []);

  // T064: Auto-open import modal when share data is present in URL
  useEffect(() => {
    if (shareData) {
      logger.debug("catalogue-ui", "Share data detected in URL, opening import modal", {
        dataLength: shareData.length
      });
      setShowImportModal(true);
    }
  }, [shareData]);

  // Select list from URL parameter (sidebar navigation)
  useEffect(() => {
    if (initialListId && lists.length > 0 && !selectedList) {
      const targetList = lists.find(l => l.id === initialListId);
      if (targetList) {
        logger.debug("catalogue-ui", "Selecting list from URL param", { initialListId });
        selectList(initialListId);
      }
    }
  }, [initialListId, lists, selectedList, selectList]);

  // Load stats when selected list changes
  useEffect(() => {
    if (selectedList?.id) {
      getListStats(selectedList.id)
        .then(setListStats)
        .catch((error: unknown) => {
          logger.error("catalogue-ui", "Failed to load list stats", {
            listId: selectedList.id,
            error
          });
        });
    } else {
      setListStats(null);
    }
  }, [selectedList?.id, getListStats]);

  // Handle sharing
  const handleShare = useCallback(async () => {
    if (!selectedList?.id) return;

    try {
      const url = await generateShareUrl(selectedList.id);
      setShareUrl(url);
      setShowShareModal(true);
      logger.debug("catalogue-ui", "Share URL generated successfully", {
        listId: selectedList.id,
        listTitle: selectedList.title
      });
    } catch (error) {
      logger.error("catalogue-ui", "Failed to generate share URL", {
        listId: selectedList.id,
        error
      });
    }
  }, [selectedList, generateShareUrl]);

  // Keyboard shortcuts
  useHotkeys([
    ["mod+N", () => setShowCreateModal(true)],
    ["mod+K", () => {
      searchInputRef.current?.focus();
    }],
    ["mod+Shift+S", () => selectedList && void handleShare()],
    ["mod+Shift+I", () => setShowImportModal(true)],
  ]);

  // Handle toggle for showing system catalogues
  const handleShowSystemCataloguesChange = useCallback((checked: boolean) => {
    setShowSystemCatalogues(checked);
    void settingsActions.setShowSystemCatalogues(checked);
  }, []);

  // Handle tag toggling
  const handleToggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  }, []);

  const handleClearTags = useCallback(() => {
    setSelectedTags(new Set());
  }, []);

  // Filter lists based on search and tags (conditionally exclude special system lists)
  const filteredLists = useMemo(() => {
    const specialListIdValues: string[] = Object.values(SPECIAL_LIST_IDS);

    if (searchQuery || selectedTags.size > 0) {
      return lists.filter(list =>
        list.id && (showSystemCatalogues || !specialListIdValues.includes(list.id)) &&
        // Search query filter
        (!searchQuery ||
          list.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          list.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          list.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        ) &&
        // Tag filter (list must have ALL selected tags)
        (selectedTags.size === 0 ||
          (list.tags && list.tags.length > 0 && [...selectedTags].every(tag => list.tags?.includes(tag) ?? false))
        )
      );
    }

    return lists.filter(list => list.id && (showSystemCatalogues || !specialListIdValues.includes(list.id)));
  }, [lists, searchQuery, selectedTags, showSystemCatalogues]);

  // Handle import
  const handleImport = useCallback(async (url: string) => {
    try {
      const listId = await importFromShareUrl(url);
      if (listId) {
        selectList(listId);
        setShowImportModal(false);
        logger.info("catalogue-ui", "List imported successfully", {
          importedUrl: url,
          newListId: listId
        });
      } else {
        logger.warn("catalogue-ui", "Import returned null - likely invalid data", {
          url
        });
      }
    } catch (error) {
      logger.error("catalogue-ui", "Failed to import list", {
        url,
        error
      });
    }
  }, [importFromShareUrl, selectList]);

  // Handle template selection
  const handleUseTemplate = useCallback((template: ListTemplate) => {
    setSelectedTemplate(template);
    setShowTemplatesModal(false);
    setShowCreateModal(true);
  }, []);

  // Handle smart list creation
  const handleCreateSmartList = useCallback(async (criteria: SmartListCriteria) => {
    const listId = await createList({
      title: criteria.name,
      description: `${criteria.description} (Auto-populated)`,
      type: 'list',
      tags: ['smart-list', criteria.type],
    });

    setActiveTab('lists');
    selectList(listId);
    setShowSmartListsModal(false);

    logger.info("catalogue-ui", "Smart list created", {
      listId,
      criteriaId: criteria.id,
      criteriaType: criteria.type,
    });
  }, [createList, selectList]);

  // Handle merge lists
  const handleMergeLists = useCallback(async (
    sourceListIds: string[],
    mergeStrategy: 'union' | 'intersection' | 'combine',
    newListName: string,
    deduplicate: boolean
  ) => {
    const mergedListId = await mergeLists(
      sourceListIds,
      mergeStrategy,
      newListName,
      deduplicate
    );

    setActiveTab('lists');
    setShowMergeModal(false);

    logger.info("catalogue-ui", "Lists merged successfully", {
      sourceListIds,
      mergeStrategy,
      mergedListId,
      newListName,
      deduplicate,
    });

    return mergedListId;
  }, [mergeLists]);

  // Handle create list from template or custom
  const handleCreateList = useCallback(async (params: {
    title: string;
    description?: string;
    type: ListType;
    tags?: string[];
    isPublic?: boolean;
  }) => {
    // Merge template tags with user-provided tags (avoiding duplicates)
    const mergedTags = selectedTemplate
      ? [...new Set([...selectedTemplate.tags, ...(params.tags || [])])]
      : params.tags;

    const listId = await createList({
      ...params,
      tags: mergedTags,
    });
    // Switch to the appropriate tab based on list type
    setActiveTab(params.type === "bibliography" ? "bibliographies" : "lists");
    selectList(listId);
    setSelectedTemplate(null);
    setShowCreateModal(false);
  }, [createList, selectList, selectedTemplate]);

  // Reset template when closing create modal
  const handleCloseCreateModal = useCallback(() => {
    setSelectedTemplate(null);
    setShowCreateModal(false);
  }, []);

  return {
    // Modal visibility states
    showCreateModal,
    showTemplatesModal,
    showSmartListsModal,
    showShareModal,
    showImportModal,
    showExportModal,
    showMergeModal,
    showAnalyticsModal,
    showCitationModal,

    // Modal setters
    setShowCreateModal,
    setShowTemplatesModal,
    setShowSmartListsModal,
    setShowShareModal,
    setShowImportModal,
    setShowExportModal,
    setShowMergeModal,
    setShowAnalyticsModal,
    setShowCitationModal,

    // Template state
    selectedTemplate,
    setSelectedTemplate,

    // Search and filter state
    searchQuery,
    setSearchQuery,
    selectedTags,
    showSystemCatalogues,
    searchInputRef,

    // Share state
    shareUrl,

    // List stats
    listStats,

    // Filtered lists
    filteredLists,

    // Handlers
    handleShowSystemCataloguesChange,
    handleToggleTag,
    handleClearTags,
    handleShare,
    handleImport,
    handleUseTemplate,
    handleCreateSmartList,
    handleMergeLists,
    handleCreateList,
    handleCloseCreateModal,

    // Tab state
    activeTab,
    setActiveTab,
  };
};
