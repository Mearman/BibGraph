/**
 * CatalogueModals component
 * Container for all catalogue-related modals
 */

import type { CatalogueEntity, CatalogueList, ListType } from "@bibgraph/utils";
import { Modal } from "@mantine/core";

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

interface CatalogueModalsProps {
  // Modal visibility states
  showCreateModal: boolean;
  showTemplatesModal: boolean;
  showSmartListsModal: boolean;
  showMergeModal: boolean;
  showShareModal: boolean;
  showImportModal: boolean;
  showExportModal: boolean;
  showAnalyticsModal: boolean;
  showCitationModal: boolean;

  // Modal close handlers
  onCloseCreateModal: () => void;
  onCloseTemplatesModal: () => void;
  onCloseSmartListsModal: () => void;
  onCloseMergeModal: () => void;
  onCloseShareModal: () => void;
  onCloseImportModal: () => void;
  onCloseExportModal: () => void;
  onCloseAnalyticsModal: () => void;
  onCloseCitationModal: () => void;

  // Data and handlers
  selectedTemplate: ListTemplate | null;
  shareUrl: string;
  selectedList: CatalogueList | null;
  lists: CatalogueList[];
  entities: CatalogueEntity[];
  shareData?: string;

  // Action handlers
  onCreateList: (params: {
    title: string;
    description?: string;
    type: ListType;
    tags?: string[];
    isPublic?: boolean;
  }) => Promise<void>;
  onUseTemplate: (template: ListTemplate) => void;
  onCreateSmartList: (criteria: SmartListCriteria) => Promise<void>;
  onMergeLists: (
    sourceListIds: string[],
    mergeStrategy: 'union' | 'intersection' | 'combine',
    newListName: string,
    deduplicate: boolean
  ) => Promise<string>;
  onImport: (url: string) => Promise<void>;
}

export const CatalogueModals = ({
  showCreateModal,
  showTemplatesModal,
  showSmartListsModal,
  showMergeModal,
  showShareModal,
  showImportModal,
  showExportModal,
  showAnalyticsModal,
  showCitationModal,
  onCloseCreateModal,
  onCloseTemplatesModal,
  onCloseSmartListsModal,
  onCloseMergeModal,
  onCloseShareModal,
  onCloseImportModal,
  onCloseExportModal,
  onCloseAnalyticsModal,
  onCloseCitationModal,
  selectedTemplate,
  shareUrl,
  selectedList,
  lists,
  entities,
  shareData,
  onCreateList,
  onUseTemplate,
  onCreateSmartList,
  onMergeLists,
  onImport,
}: CatalogueModalsProps) => <>
      <Modal
        opened={showCreateModal}
        onClose={onCloseCreateModal}
        title={selectedTemplate ? `Create from Template: ${selectedTemplate.name}` : "Create New List"}
        size="md"
        trapFocus
        returnFocus
      >
        <CreateListModal
          onClose={onCloseCreateModal}
          onSubmit={onCreateList}
          initialTitle={selectedTemplate?.name}
          initialDescription={selectedTemplate?.description}
          initialType={selectedTemplate?.type}
          initialTags={selectedTemplate?.tags}
        />
      </Modal>

      <Modal
        opened={showTemplatesModal}
        onClose={onCloseTemplatesModal}
        title="Choose a Template"
        size="xl"
        trapFocus
        returnFocus
      >
        <ListTemplates
          onUseTemplate={onUseTemplate}
          onClose={onCloseTemplatesModal}
        />
      </Modal>

      <Modal
        opened={showSmartListsModal}
        onClose={onCloseSmartListsModal}
        title="Smart Lists"
        size="xl"
        trapFocus
        returnFocus
      >
        <SmartLists
          onCreateSmartList={onCreateSmartList}
          onClose={onCloseSmartListsModal}
        />
      </Modal>

      <Modal
        opened={showMergeModal}
        onClose={onCloseMergeModal}
        title="Merge Lists"
        size="lg"
        trapFocus
        returnFocus
      >
        <ListMerge
          lists={lists}
          onMerge={onMergeLists}
          onClose={onCloseMergeModal}
        />
      </Modal>

      <Modal
        opened={showShareModal}
        onClose={onCloseShareModal}
        title="Share List"
        size="lg"
        trapFocus
        returnFocus
      >
        <ShareModal
          shareUrl={shareUrl}
          listTitle={selectedList?.title || ""}
          onClose={onCloseShareModal}
        />
      </Modal>

      <Modal
        opened={showImportModal}
        onClose={onCloseImportModal}
        title="Import List"
        size="lg"
        trapFocus
        returnFocus
      >
        <ImportModal
          onClose={onCloseImportModal}
          onImport={onImport}
          initialShareData={shareData}
        />
      </Modal>

      <Modal
        opened={showExportModal}
        onClose={onCloseExportModal}
        title="Export List"
        size="lg"
        trapFocus
        returnFocus
      >
        {selectedList?.id && (
          <ExportModal
            listId={selectedList.id}
            listTitle={selectedList.title}
            onClose={onCloseExportModal}
          />
        )}
      </Modal>

      <Modal
        opened={showAnalyticsModal}
        onClose={onCloseAnalyticsModal}
        title="List Analytics"
        size="xl"
        trapFocus
        returnFocus
      >
        {selectedList && (
          <ListAnalytics
            list={selectedList}
            entities={entities}
            onClose={onCloseAnalyticsModal}
          />
        )}
      </Modal>

      <Modal
        opened={showCitationModal}
        onClose={onCloseCitationModal}
        title="Citation Style Preview"
        size="xl"
        trapFocus
        returnFocus
      >
        {selectedList && (
          <CitationStylePreview
            entities={entities}
            listTitle={selectedList.title}
            onClose={onCloseCitationModal}
          />
        )}
      </Modal>
    </>;
