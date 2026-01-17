/**
 * Main catalogue manager component
 * Handles lists, bibliographies, and entity management
 */

import {
  Container,
  Stack,
  Tabs,
} from "@mantine/core";
import {
  IconBook,
  IconDatabase,
  IconList,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

import { CacheTierLists } from "@/components/catalogue/CacheTierLists";
import { CatalogueEntities } from "@/components/catalogue/CatalogueEntities";
import { CatalogueHeader } from "@/components/catalogue/CatalogueHeader";
import { CatalogueListComponent } from "@/components/catalogue/CatalogueList";
import { CatalogueModals } from "@/components/catalogue/CatalogueModals";
import { CatalogueSearchBar } from "@/components/catalogue/CatalogueSearchBar";
import { SelectedListDetails } from "@/components/catalogue/SelectedListDetails";
import { TagCloud } from "@/components/catalogue/TagCloud";
import { ICON_SIZE } from '@/config/style-constants';
import { useCatalogueContext } from "@/contexts/catalogue-context";

import { useCatalogueManagerState } from "./hooks/useCatalogueManagerState";

interface CatalogueManagerProps {
  onNavigate?: (url: string) => void;
  shareData?: string; // T064: Compressed share data from URL parameter
  initialListId?: string; // Initial list to select (from sidebar navigation)
}

export const CatalogueManager = ({ onNavigate, shareData, initialListId }: CatalogueManagerProps) => {
  const {
    lists,
    selectedList,
    isLoadingLists,
    deleteList,
    selectList,
    entities,
  } = useCatalogueContext();

  const navigate = useNavigate();

  const state = useCatalogueManagerState({ shareData, initialListId });

  return (
    <Container size="xl" py="md" data-testid="catalogue-manager">
      <Stack gap="lg">
        {/* Header */}
        <CatalogueHeader
          selectedList={selectedList}
          onImportClick={() => state.setShowImportModal(true)}
          onShareClick={state.handleShare}
          onTemplatesClick={() => state.setShowTemplatesModal(true)}
          onSmartListsClick={() => state.setShowSmartListsModal(true)}
          onMergeClick={() => state.setShowMergeModal(true)}
          onCreateClick={() => state.setShowCreateModal(true)}
        />

        {/* Search and filters */}
        <CatalogueSearchBar
          searchQuery={state.searchQuery}
          onSearchChange={state.setSearchQuery}
          showSystemCatalogues={state.showSystemCatalogues}
          onShowSystemCataloguesChange={state.handleShowSystemCataloguesChange}
          searchInputRef={state.searchInputRef}
        />

        {/* Tag Cloud for filtering */}
        <TagCloud
          lists={lists}
          selectedTags={state.selectedTags}
          onToggleTag={state.handleToggleTag}
          onClearTags={state.handleClearTags}
        />

        {/* Main Content */}
        <Tabs value={state.activeTab} onChange={state.setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="lists" leftSection={<IconList size={ICON_SIZE.MD} />}>
              Lists ({state.filteredLists.length})
            </Tabs.Tab>
            <Tabs.Tab value="bibliographies" leftSection={<IconBook size={ICON_SIZE.MD} />}>
              Bibliographies ({state.filteredLists.filter(l => l.type === "bibliography").length})
            </Tabs.Tab>
            <Tabs.Tab value="cache-tiers" leftSection={<IconDatabase size={ICON_SIZE.MD} />}>
              Cache Tiers
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="lists" pt="md">
            <CatalogueListComponent
              lists={state.filteredLists.filter(l => l.type === "list")}
              selectedListId={selectedList?.id || null}
              onSelectList={selectList}
              onDeleteList={deleteList}
              onNavigate={onNavigate}
              isLoading={isLoadingLists}
              listType="list"
            />
          </Tabs.Panel>

          <Tabs.Panel value="bibliographies" pt="md">
            <CatalogueListComponent
              lists={state.filteredLists.filter(l => l.type === "bibliography")}
              selectedListId={selectedList?.id || null}
              onSelectList={selectList}
              onDeleteList={deleteList}
              onNavigate={onNavigate}
              isLoading={isLoadingLists}
              listType="bibliography"
            />
          </Tabs.Panel>

          <Tabs.Panel value="cache-tiers" pt="md">
            <CacheTierLists />
          </Tabs.Panel>
        </Tabs>

        {/* Selected List Details */}
        {selectedList && (
          <SelectedListDetails
            selectedList={selectedList}
            listStats={state.listStats}
            lists={lists}
            onEditClick={() => {}}
            onExportClick={() => state.setShowExportModal(true)}
            onAnalyticsClick={() => state.setShowAnalyticsModal(true)}
            onCitationsClick={() => state.setShowCitationModal(true)}
            onShareClick={state.handleShare}
          />
        )}

        {/* Selected List Entities */}
        {selectedList && (
          <CatalogueEntities
            onNavigate={(entityType, entityId) => {
              const url = `/${entityType}/${entityId}`;
              if (onNavigate) {
                onNavigate(url);
              } else {
                navigate({ to: url });
              }
            }}
          />
        )}

        {/* Modals */}
        <CatalogueModals
          showCreateModal={state.showCreateModal}
          showTemplatesModal={state.showTemplatesModal}
          showSmartListsModal={state.showSmartListsModal}
          showMergeModal={state.showMergeModal}
          showShareModal={state.showShareModal}
          showImportModal={state.showImportModal}
          showExportModal={state.showExportModal}
          showAnalyticsModal={state.showAnalyticsModal}
          showCitationModal={state.showCitationModal}
          onCloseCreateModal={state.handleCloseCreateModal}
          onCloseTemplatesModal={() => state.setShowTemplatesModal(false)}
          onCloseSmartListsModal={() => state.setShowSmartListsModal(false)}
          onCloseMergeModal={() => state.setShowMergeModal(false)}
          onCloseShareModal={() => state.setShowShareModal(false)}
          onCloseImportModal={() => state.setShowImportModal(false)}
          onCloseExportModal={() => state.setShowExportModal(false)}
          onCloseAnalyticsModal={() => state.setShowAnalyticsModal(false)}
          onCloseCitationModal={() => state.setShowCitationModal(false)}
          selectedTemplate={state.selectedTemplate}
          shareUrl={state.shareUrl}
          selectedList={selectedList}
          lists={lists}
          entities={entities}
          shareData={shareData}
          onCreateList={state.handleCreateList}
          onUseTemplate={state.handleUseTemplate}
          onCreateSmartList={state.handleCreateSmartList}
          onMergeLists={state.handleMergeLists}
          onImport={state.handleImport}
        />
      </Stack>
    </Container>
  );
};
