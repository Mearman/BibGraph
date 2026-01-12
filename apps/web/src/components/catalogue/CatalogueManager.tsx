/**
 * Main catalogue manager component
 * Handles lists, bibliographies, and entity management
 */

import type { ListType } from "@bibgraph/utils";
import { logger } from "@bibgraph/utils";
import { SPECIAL_LIST_IDS } from "@bibgraph/utils/storage/catalogue-db";
import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Menu,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import {
  IconBook,
  IconBulb,
  IconChartBar,
  IconChevronDown,
  IconDatabase,
  IconDownload,
  IconEdit,
  IconFileText,
  IconGitMerge,
  IconList,
  IconPlus,
  IconSearch,
  IconShare,
  IconUpload,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import React, { useEffect,useState } from "react";

import { CacheTierLists } from "@/components/catalogue/CacheTierLists";
import { CatalogueEntities } from "@/components/catalogue/CatalogueEntities";
import { CatalogueListComponent } from "@/components/catalogue/CatalogueList";
import { CitationStylePreview } from "@/components/catalogue/CitationStylePreview";
import { CreateListModal } from "@/components/catalogue/CreateListModal";
import { ExportModal } from "@/components/catalogue/ExportModal";
import { ImportModal } from "@/components/catalogue/ImportModal";
import { ListAnalytics } from "@/components/catalogue/ListAnalytics";
import { ListMerge } from "@/components/catalogue/ListMerge";
import type { ListTemplate } from "@/components/catalogue/ListTemplates";
import { ListTemplates } from "@/components/catalogue/ListTemplates";
import { ShareModal } from "@/components/catalogue/ShareModal";
import type { SmartListCriteria } from "@/components/catalogue/SmartLists";
import { SmartLists } from "@/components/catalogue/SmartLists";
import { TagCloud } from "@/components/catalogue/TagCloud";
import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';
import { useCatalogueContext } from "@/contexts/catalogue-context";
import { settingsActions } from "@/stores/settings-store";


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
    createList,
    deleteList,
    selectList,
    generateShareUrl,
    importFromShareUrl,
    getListStats,
    mergeLists,
    entities,
  } = useCatalogueContext();

  const navigate = useNavigate();

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
  const [listStats, setListStats] = useState<{
    totalEntities: number;
    entityCounts: Record<string, number>;
  } | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

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
        .catch((error) => {
          logger.error("catalogue-ui", "Failed to load list stats", {
            listId: selectedList.id,
            error
          });
        });
    } else {
      setListStats(null);
    }
  }, [selectedList?.id, getListStats]);

  // Keyboard shortcuts
  useHotkeys([
    ["mod+N", () => setShowCreateModal(true)],
    ["mod+K", () => {
      searchInputRef.current?.focus();
    }],
    ["mod+Shift+S", () => selectedList && handleShare()],
    ["mod+Shift+I", () => setShowImportModal(true)],
  ]);

  // Handle toggle for showing system catalogues
  const handleShowSystemCataloguesChange = (checked: boolean) => {
    setShowSystemCatalogues(checked);
    void settingsActions.setShowSystemCatalogues(checked);
  };

  // Handle tag toggling
  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  };

  const handleClearTags = () => {
    setSelectedTags(new Set());
  };

  // Filter lists based on search and tags (conditionally exclude special system lists)
  const specialListIdValues: string[] = Object.values(SPECIAL_LIST_IDS);
  const filteredLists = (searchQuery || selectedTags.size > 0)
    ? lists.filter(list =>
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
      )
    : lists.filter(list => list.id && (showSystemCatalogues || !specialListIdValues.includes(list.id)));

  // Handle sharing
  const handleShare = async () => {
    if (!selectedList || !selectedList.id) return;

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
  };

  // Handle import
  const handleImport = async (url: string) => {
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
  };

  // Handle template selection
  const handleUseTemplate = (template: ListTemplate) => {
    setSelectedTemplate(template);
    setShowTemplatesModal(false);
    setShowCreateModal(true);
  };

  // Handle smart list creation
  const handleCreateSmartList = async (criteria: SmartListCriteria) => {
    // Create a new list from smart list criteria
    // In a full implementation, this would:
    // 1. Create the list with criteria metadata
    // 2. Run the query to populate it
    // 3. Store criteria for auto-refresh
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
  };

  // Handle merge lists
  const handleMergeLists = async (
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
  };

  // Handle create list from template or custom
  const handleCreateList = async (params: {
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
  };

  // Reset template when closing create modal
  const handleCloseCreateModal = () => {
    setSelectedTemplate(null);
    setShowCreateModal(false);
  };

  return (
    <Container size="xl" py="md" data-testid="catalogue-manager">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <IconList size={ICON_SIZE.EMPTY_STATE_SM} />
            <Title order={1}>Catalogue</Title>
            {selectedList && (
              <Badge size="lg" color="blue">
                {selectedList.type === "bibliography" ? "Bibliography" : "List"}
              </Badge>
            )}
          </Group>

          <Group gap="xs">
            <Button
              variant="light"
              leftSection={<IconUpload size={ICON_SIZE.MD} />}
              onClick={() => setShowImportModal(true)}
              aria-label="Open import modal to import a catalogue list"
            >
              Import
            </Button>

            <Button
              variant="light"
              leftSection={<IconShare size={ICON_SIZE.MD} />}
              onClick={handleShare}
              disabled={!selectedList}
              aria-label={selectedList ? "Open share modal to share this list" : "Select a list to enable sharing"}
            >
              Share
            </Button>

            <Menu
              shadow="md"
              width={200}
              position="bottom-end"
            >
              <Menu.Target>
                <Button
                  leftSection={<IconPlus size={ICON_SIZE.MD} />}
                  rightSection={<IconChevronDown size={16} />}
                  aria-label="Create new list or use templates"
                >
                  Create New List
                </Button>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconBook size={14} />}
                  onClick={() => setShowTemplatesModal(true)}
                >
                  Use Templates
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconBulb size={14} />}
                  onClick={() => setShowSmartListsModal(true)}
                >
                  Smart Lists
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconGitMerge size={14} />}
                  onClick={() => setShowMergeModal(true)}
                >
                  Merge Lists
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconPlus size={14} />}
                  onClick={() => setShowCreateModal(true)}
                >
                  Create Custom List
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>

        {/* Search and filters */}
        <Group justify="space-between">
          <Group flex={1}>
            <IconSearch size={ICON_SIZE.MD} />
            <Text fw={500}>Search:</Text>
            <TextInput
              ref={searchInputRef}
              placeholder="Search lists by title, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search catalogue lists"
              aria-describedby="search-help"
              flex={1}
            />
            <Text id="search-help" size="xs" c="dimmed" component="span">
              Press Ctrl+K to focus
            </Text>
          </Group>
          <Switch
            label="Show system catalogues"
            checked={showSystemCatalogues}
            onChange={(e) => handleShowSystemCataloguesChange(e.currentTarget.checked)}
            aria-label="Toggle visibility of system catalogues like bookmarks and history"
            data-testid="show-system-catalogues-toggle"
          />
        </Group>

        {/* Tag Cloud for filtering */}
        <TagCloud
          lists={lists}
          selectedTags={selectedTags}
          onToggleTag={handleToggleTag}
          onClearTags={handleClearTags}
        />

        {/* Main Content */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="lists" leftSection={<IconList size={ICON_SIZE.MD} />}>
              Lists ({filteredLists.length})
            </Tabs.Tab>
            <Tabs.Tab value="bibliographies" leftSection={<IconBook size={ICON_SIZE.MD} />}>
              Bibliographies ({filteredLists.filter(l => l.type === "bibliography").length})
            </Tabs.Tab>
            <Tabs.Tab value="cache-tiers" leftSection={<IconDatabase size={ICON_SIZE.MD} />}>
              Cache Tiers
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="lists" pt="md">
            <CatalogueListComponent
              lists={filteredLists.filter(l => l.type === "list")}
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
              lists={filteredLists.filter(l => l.type === "bibliography")}
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
          <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="md" bg="gray.0" data-testid="selected-list-details">
            <Group justify="space-between" mb="md">
              <div>
                <Title order={3} data-testid="selected-list-title">{selectedList.title}</Title>
                {selectedList.description && (
                  <Text c="dimmed" size="sm" mt="xs">
                    {selectedList.description}
                  </Text>
                )}
              </div>

              <Group gap="xs">
                {selectedList.tags?.map((tag, index) => (
                  <Badge key={index} size="sm" variant="light">
                    {tag}
                  </Badge>
                ))}
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => {
                    if (!selectedList.id) return;
                    const card = lists.find(l => l.id === selectedList.id);
                    if (card) {
                      // Trigger edit via the list component
                       
                      const buttons = document.querySelectorAll<HTMLElement>('[data-testid^="edit-list-"]');
                      const editButton = [...buttons].find(button =>
                        button.dataset.testid === `edit-list-${selectedList.id}`
                      );
                      editButton?.click();
                    }
                  }}
                  leftSection={<IconEdit size={ICON_SIZE.MD} />}
                  data-testid="edit-selected-list-button"
                  aria-label="Edit list details"
                >
                  Edit
                </Button>
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => setShowExportModal(true)}
                  leftSection={<IconDownload size={ICON_SIZE.MD} />}
                  data-testid="export-list-button"
                  aria-label="Export this list to a file"
                >
                  Export
                </Button>
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => setShowAnalyticsModal(true)}
                  leftSection={<IconChartBar size={ICON_SIZE.MD} />}
                  data-testid="analytics-list-button"
                  aria-label="View list analytics"
                >
                  Analytics
                </Button>
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => setShowCitationModal(true)}
                  leftSection={<IconFileText size={ICON_SIZE.MD} />}
                  data-testid="citation-list-button"
                  aria-label="Preview citations in different styles"
                >
                  Citations
                </Button>
                <Button
                  variant="light"
                  size="sm"
                  onClick={handleShare}
                  leftSection={<IconShare size={ICON_SIZE.MD} />}
                  data-testid="share-list-button"
                  aria-label="Share this list with others"
                >
                  Share
                </Button>
              </Group>
            </Group>

            <Group justify="space-between" mt="md">
              <Text size="xs" c="dimmed">
                Created: {selectedList.createdAt.toLocaleDateString()} •
                Modified: {selectedList.updatedAt.toLocaleDateString()}
                {selectedList.isPublic ? " • Public" : " • Private"}
              </Text>
            </Group>

            {/* Entity Statistics */}
            {listStats && listStats.totalEntities > 0 && (
              <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="xs" mt="md">
                <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="xs" radius="sm">
                  <Text size="xs" c="dimmed" fw={500}>Total</Text>
                  <Text size="lg" fw={700} data-testid="stat-total">
                    {listStats.totalEntities}
                  </Text>
                </Paper>

                {Object.entries(listStats.entityCounts)
                  .filter(([, count]) => count > 0)
                  .map(([entityType, count]) => (
                    <Paper key={entityType} style={{ border: BORDER_STYLE_GRAY_3 }} p="xs" radius="sm">
                      <Text size="xs" c="dimmed" fw={500} tt="capitalize">
                        {entityType}
                      </Text>
                      <Text size="lg" fw={700} data-testid={`stat-${entityType}`}>
                        {count}
                      </Text>
                    </Paper>
                  ))}
              </SimpleGrid>
            )}
          </Card>
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
        <Modal
          opened={showCreateModal}
          onClose={handleCloseCreateModal}
          title={selectedTemplate ? `Create from Template: ${selectedTemplate.name}` : "Create New List"}
          size="md"
          trapFocus
          returnFocus
        >
          <CreateListModal
            onClose={handleCloseCreateModal}
            onSubmit={handleCreateList}
            initialTitle={selectedTemplate?.name}
            initialDescription={selectedTemplate?.description}
            initialType={selectedTemplate?.type}
            initialTags={selectedTemplate?.tags}
          />
        </Modal>

        <Modal
          opened={showTemplatesModal}
          onClose={() => setShowTemplatesModal(false)}
          title="Choose a Template"
          size="xl"
          trapFocus
          returnFocus
        >
          <ListTemplates
            onUseTemplate={handleUseTemplate}
            onClose={() => setShowTemplatesModal(false)}
          />
        </Modal>

        <Modal
          opened={showSmartListsModal}
          onClose={() => setShowSmartListsModal(false)}
          title="Smart Lists"
          size="xl"
          trapFocus
          returnFocus
        >
          <SmartLists
            onCreateSmartList={handleCreateSmartList}
            onClose={() => setShowSmartListsModal(false)}
          />
        </Modal>

        <Modal
          opened={showMergeModal}
          onClose={() => setShowMergeModal(false)}
          title="Merge Lists"
          size="lg"
          trapFocus
          returnFocus
        >
          <ListMerge
            lists={lists}
            onMerge={handleMergeLists}
            onClose={() => setShowMergeModal(false)}
          />
        </Modal>

        <Modal
          opened={showShareModal}
          onClose={() => setShowShareModal(false)}
          title="Share List"
          size="lg"
          trapFocus
          returnFocus
        >
          <ShareModal
            shareUrl={shareUrl}
            listTitle={selectedList?.title || ""}
            onClose={() => setShowShareModal(false)}
          />
        </Modal>

        <Modal
          opened={showImportModal}
          onClose={() => setShowImportModal(false)}
          title="Import List"
          size="lg"
          trapFocus
          returnFocus
        >
          <ImportModal
            onClose={() => setShowImportModal(false)}
            onImport={handleImport}
            initialShareData={shareData}
          />
        </Modal>

        <Modal
          opened={showExportModal}
          onClose={() => setShowExportModal(false)}
          title="Export List"
          size="lg"
          trapFocus
          returnFocus
        >
          {selectedList && selectedList.id && (
            <ExportModal
              listId={selectedList.id}
              listTitle={selectedList.title}
              onClose={() => setShowExportModal(false)}
            />
          )}
        </Modal>

        <Modal
          opened={showAnalyticsModal}
          onClose={() => setShowAnalyticsModal(false)}
          title="List Analytics"
          size="xl"
          trapFocus
          returnFocus
        >
          {selectedList && (
            <ListAnalytics
              list={selectedList}
              entities={entities}
              onClose={() => setShowAnalyticsModal(false)}
            />
          )}
        </Modal>

        <Modal
          opened={showCitationModal}
          onClose={() => setShowCitationModal(false)}
          title="Citation Style Preview"
          size="xl"
          trapFocus
          returnFocus
        >
          {selectedList && (
            <CitationStylePreview
              entities={entities}
              listTitle={selectedList.title}
              onClose={() => setShowCitationModal(false)}
            />
          )}
        </Modal>
      </Stack>
    </Container>
  );
};