/**
 * Component for displaying entities in a selected catalogue list
 * Supports sorting, filtering, and entity operations
 */

import type { EntityType } from "@bibgraph/types";
import { ENTITY_METADATA } from "@bibgraph/types";
import { type CatalogueEntity } from "@bibgraph/utils"
import { logger } from "@bibgraph/utils";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,  verticalListSortingStrategy} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  Loader,
  Menu,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconDots,
  IconEdit,
  IconExternalLink,
  IconGripVertical,
  IconNotes,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useRef,useState } from "react";

import { NOTIFICATION_DURATION } from "@/config/notification-constants";
import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';
import { useCatalogueContext } from "@/contexts/catalogue-context";
import {
  isAuthorMetadata,
  isConceptMetadata,
  isFunderMetadata,
  isInstitutionMetadata,
  isPublisherMetadata,
  isSourceMetadata,
  isTopicMetadata,
  isWorkMetadata,
} from "@/utils/catalogue-guards";

interface CatalogueEntitiesProps {
  /** Callback to navigate to entity pages */
  onNavigate?: (entityType: EntityType, entityId: string) => void;
}

interface SortableEntityRowProps {
  entity: CatalogueEntity;
  onNavigate?: (entityType: EntityType, entityId: string) => void;
  onRemove: (entityId: string) => void;
  onEditNotes: (entityId: string, notes: string) => void;
  isSelected: boolean;
  onToggleSelect: (entityId: string) => void;
}

/**
 * Formats entity metadata for display based on entity type
 * Note: Metadata is only available when entities are enriched with OpenAlex data.
 * For base CatalogueEntity objects from storage, this will show entity ID.
 * @param entity
 */
const formatEntityMetadata = (entity: CatalogueEntity): string => {
  // Type guard: Check if entity has metadata property (enriched entity)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrichedEntity = entity as CatalogueEntity & { metadata?: any };

  if (!enrichedEntity.metadata) {
    // Fallback for non-enriched entities - show entity type info
    return `Entity: ${entity.entityId}`;
  }

  const { metadata } = enrichedEntity;

  if (isWorkMetadata(metadata)) {
    const parts: string[] = [];
    if (metadata.citedByCount !== undefined) {
      parts.push(`${metadata.citedByCount} citations`);
    }
    if (metadata.publicationYear) {
      parts.push(`${metadata.publicationYear}`);
    }
    return parts.join(' • ') || 'No citation data';
  }

  if (isAuthorMetadata(metadata)) {
    const parts: string[] = [];
    if (metadata.worksCount !== undefined) {
      parts.push(`${metadata.worksCount} works`);
    }
    if (metadata.hIndex !== undefined) {
      parts.push(`h-index: ${metadata.hIndex}`);
    }
    return parts.join(' • ') || 'No works data';
  }

  if (isInstitutionMetadata(metadata)) {
    const parts: string[] = [];
    if (metadata.worksCount !== undefined) {
      parts.push(`${metadata.worksCount} works`);
    }
    if (metadata.countryCode) {
      parts.push(metadata.countryCode);
    }
    return parts.join(' • ') || 'No works data';
  }

  if (isSourceMetadata(metadata)) {
    const parts: string[] = [];
    if (metadata.worksCount !== undefined) {
      parts.push(`${metadata.worksCount} works`);
    }
    if (metadata.issn && metadata.issn.length > 0) {
      parts.push(`ISSN: ${metadata.issn[0]}`);
    }
    return parts.join(' • ') || 'No works data';
  }

  if (isTopicMetadata(metadata)) {
    const parts: string[] = [];
    if (metadata.worksCount !== undefined) {
      parts.push(`${metadata.worksCount} works`);
    }
    if (metadata.citedByCount !== undefined) {
      parts.push(`${metadata.citedByCount} citations`);
    }
    return parts.join(' • ') || 'No data';
  }

  if (isFunderMetadata(metadata)) {
    const parts: string[] = [];
    if (metadata.worksCount !== undefined) {
      parts.push(`${metadata.worksCount} works`);
    }
    if (metadata.citedByCount !== undefined) {
      parts.push(`${metadata.citedByCount} citations`);
    }
    return parts.join(' • ') || 'No data';
  }

  if (isPublisherMetadata(metadata)) {
    const parts: string[] = [];
    if (metadata.worksCount !== undefined) {
      parts.push(`${metadata.worksCount} works`);
    }
    if (metadata.citedByCount !== undefined) {
      parts.push(`${metadata.citedByCount} citations`);
    }
    return parts.join(' • ') || 'No data';
  }

  if (isConceptMetadata(metadata)) {
    const parts: string[] = [];
    if (metadata.worksCount !== undefined) {
      parts.push(`${metadata.worksCount} works`);
    }
    if (metadata.citedByCount !== undefined) {
      parts.push(`${metadata.citedByCount} citations`);
    }
    return parts.join(' • ') || 'No data';
  }

  return 'No metadata';
};

/**
 * Provenance labels for graph list entries
 * Maps technical provenance values to user-friendly descriptions
 */
const PROVENANCE_LABELS: Record<string, string> = {
  user: "Added manually",
  "collection-load": "Loaded from collection",
  expansion: "Discovered via expansion",
  "auto-population": "Auto-populated",
};

/**
 * Formats notes field for user-friendly display
 * Handles graph list serialized format: "provenance:TYPE|label:LABEL"
 * @param notes - Raw notes string from entity
 * @returns User-friendly display string
 */
const formatNotesForDisplay = (notes: string | undefined): string => {
  if (!notes) return "No notes";

  // Check for graph list serialized format: "provenance:TYPE|label:LABEL"
  const provenanceMatch = notes.match(/^provenance:([^|]+)(?:\|label:.+)?$/);
  if (provenanceMatch) {
    const [, provenanceType] = provenanceMatch;
    return PROVENANCE_LABELS[provenanceType] || provenanceType;
  }

  return notes;
};

const SortableEntityRow = ({
  entity,
  onNavigate,
  onRemove,
  onEditNotes,
  isSelected,
  onToggleSelect,
}: SortableEntityRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entity.id ?? "" });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(entity.notes || "");
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleSaveNotes = () => {
    if (!entity.id) return;
    onEditNotes(entity.id, notes);
    setEditingNotes(false);
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} data-testid="entity-item" className="entity-card">
      <Table.Tr>
        <Table.Td w={40}>
          <Checkbox
            checked={isSelected}
            onChange={() => {
              if (!entity.id) return;
              onToggleSelect(entity.id);
            }}
            aria-label={`Select ${entity.entityId}`}
          />
        </Table.Td>
        <Table.Td w={40}>
          <div
            {...listeners}
            style={{ cursor: "grab" }}
            aria-label={`Drag to reorder ${entity.entityId}`}
            role="button"
            tabIndex={0}
            data-testid={`drag-handle-${entity.entityId}`}
          >
            <IconGripVertical size={ICON_SIZE.MD} color="var(--mantine-color-gray-4)" />
          </div>
        </Table.Td>
        <Table.Td>
          <Stack gap="xs">
            <Group gap="sm">
              <Badge size="sm" variant="light" color={ENTITY_METADATA[entity.entityType].color}>
                {ENTITY_METADATA[entity.entityType].displayName}
              </Badge>
              <Text size="sm" fw={500}>
                {entity.entityId}
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              {formatEntityMetadata(entity)}
            </Text>
          </Stack>
        </Table.Td>
        <Table.Td>
          {editingNotes ? (
            <Group gap="xs">
              <Textarea
                size="xs"
                minRows={1}
                maxRows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes..."
                flex={1}
                aria-label="Edit notes for this entity"
              />
              <Button size="xs" onClick={handleSaveNotes}>
                Save
              </Button>
              <Button size="xs" variant="subtle" onClick={() => setEditingNotes(false)}>
                Cancel
              </Button>
            </Group>
          ) : (
            <Group gap="sm">
              <Text size="sm" c="dimmed" style={{ flex: 1 }}>
                {formatNotesForDisplay(entity.notes)}
              </Text>
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={() => setEditingNotes(true)}
                title="Edit notes"
                aria-label="Edit notes"
              >
                <IconEdit size={ICON_SIZE.SM} />
              </ActionIcon>
            </Group>
          )}
        </Table.Td>
        <Table.Td>
          <Text size="xs" c="dimmed">
            {entity.addedAt.toLocaleDateString()}
          </Text>
        </Table.Td>
        <Table.Td>
          <Group gap="xs">
            {onNavigate && (
              <Tooltip label="View entity">
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  onClick={() => onNavigate(entity.entityType, entity.entityId)}
                >
                  <IconExternalLink size={ICON_SIZE.SM} />
                </ActionIcon>
              </Tooltip>
            )}
            <Menu shadow="md" width={160}>
              <Menu.Target>
                <ActionIcon size="sm" variant="subtle">
                  <IconDots size={ICON_SIZE.SM} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconNotes size={ICON_SIZE.SM} />}
                  onClick={() => setEditingNotes(true)}
                >
                  Edit Notes
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTrash size={ICON_SIZE.SM} />}
                  color="red"
                  onClick={() => setShowRemoveConfirm(true)}
                  aria-label="Remove entity"
                >
                  Remove
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Table.Td>
      </Table.Tr>

      {/* Remove Confirmation Modal */}
      <Modal
        opened={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
        title="Confirm Removal"
        centered
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to remove this entity from the list? This action cannot be undone.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" onClick={() => setShowRemoveConfirm(false)}>
              Cancel
            </Button>
            <Button
              color="red"
              data-testid="confirm-remove-entity-button"
              disabled={removing}
              onClick={async () => {
                if (!entity.id) return;
                setRemoving(true);
                try {
                  await onRemove(entity.id);
                  setShowRemoveConfirm(false);
                } finally {
                  setRemoving(false);
                }
              }}
            >
              Remove
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
};

export const CatalogueEntities = ({ onNavigate }: CatalogueEntitiesProps) => {
  // T081: Hooks must be called unconditionally, so move them before guard clause
  // Use context to share catalogue state with CatalogueManager
  const {
    selectedList,
    entities,
    isLoadingEntities,
    removeEntityFromList,
    reorderEntities,
    updateEntityNotes,
    bulkRemoveEntities,
    bulkMoveEntities,
    lists,
  } = useCatalogueContext();

  // Debug logging
  React.useEffect(() => {
    logger.debug("catalogue-entities", "CatalogueEntities render", {
      selectedListId: selectedList?.id,
      selectedListTitle: selectedList?.title,
      entitiesCount: entities.length,
      isLoadingEntities
    });
  }, [selectedList, entities, isLoadingEntities]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("position");
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [targetListId, setTargetListId] = useState<string | null>(null);

  // T075: Virtual scrolling ref for large lists
  const parentRef = useRef<HTMLDivElement>(null);
  const VIRTUALIZATION_THRESHOLD = 100;

  // T084: DnD sensors must be called before guard clauses to maintain consistent hook count
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter entities based on search and type
  const filteredEntities = entities.filter((entity) => {
    const matchesSearch = searchQuery === "" ||
      entity.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entity.notes && entity.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = filterType === "all" || entity.entityType === filterType;

    return matchesSearch && matchesType;
  });

  // Sort entities
  const sortedEntities = [...filteredEntities].sort((a, b) => {
    switch (sortBy) {
      case "position":
        return a.position - b.position;
      case "entityId":
        return a.entityId.localeCompare(b.entityId);
      case "addedAt":
        return b.addedAt.getTime() - a.addedAt.getTime();
      case "entityType":
        return a.entityType.localeCompare(b.entityType);
      default:
        return 0;
    }
  });

  // T075: Setup virtualizer for large lists (>100 entities)
  // T083: Must be called BEFORE guard clause to maintain consistent hook count
  const useVirtualization = sortedEntities.length > VIRTUALIZATION_THRESHOLD;
  const rowVirtualizer = useVirtualizer({
    count: sortedEntities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated row height in pixels
    enabled: useVirtualization,
    overscan: 10, // Render 10 items above and below viewport for smooth scrolling
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !selectedList) return;

    const oldIndex = sortedEntities.findIndex((item) => item.id === active.id);
    const newIndex = sortedEntities.findIndex((item) => item.id === over.id);

    if (oldIndex === newIndex) return;

    const items = arrayMove(sortedEntities, oldIndex, newIndex);

    // Update positions
    const reorderedIds = items
      .filter((entity): entity is typeof entity & { id: string } => !!entity.id)
      .map((entity, index) => {
        entity.position = index + 1;
        return entity.id;
      });

    try {
      if (!selectedList.id) return;
      await reorderEntities(selectedList.id, reorderedIds);
      logger.debug("catalogue-ui", "Entities reordered successfully", {
        listId: selectedList.id,
        entityCount: reorderedIds.length
      });

      // Announce reorder to screen readers
      notifications.show({
        title: "Reordered",
        message: `Entity moved from position ${oldIndex + 1} to position ${newIndex + 1}`,
        color: "blue",
        autoClose: NOTIFICATION_DURATION.SHORT_MS,
      });
    } catch (error) {
      logger.error("catalogue-ui", "Failed to reorder entities", {
        listId: selectedList.id,
        error
      });
      notifications.show({
        title: "Error",
        message: "Failed to reorder entities",
        color: "red",
      });
    }
  };

  const handleRemoveEntity = async (entityRecordId: string) => {
    if (!selectedList || !selectedList.id) return;

    try {
      await removeEntityFromList(selectedList.id, entityRecordId);
      logger.debug("catalogue-ui", "Entity removed from list", {
        listId: selectedList.id,
        entityRecordId
      });
      notifications.show({
        title: "Removed",
        message: "Entity removed from list",
        color: "green",
      });
    } catch (error) {
      logger.error("catalogue-ui", "Failed to remove entity from list", {
        listId: selectedList.id,
        entityRecordId,
        error
      });
      notifications.show({
        title: "Error",
        message: "Failed to remove entity",
        color: "red",
      });
    }
  };

  const handleEditNotes = async (entityRecordId: string, notes: string) => {
    try {
      await updateEntityNotes(entityRecordId, notes);
      logger.debug("catalogue-ui", "Entity notes updated", {
        entityRecordId,
        notesLength: notes.length
      });
      notifications.show({
        title: "Success",
        message: "Notes updated successfully",
        color: "green",
      });
    } catch (error) {
      logger.error("catalogue-ui", "Failed to update entity notes", {
        entityRecordId,
        error
      });
      notifications.show({
        title: "Error",
        message: "Failed to update notes",
        color: "red",
      });
    }
  };

  // Bulk operations handlers
  const handleSelectAll = () => {
    if (selectedEntities.size === sortedEntities.length) {
      setSelectedEntities(new Set());
    } else {
      setSelectedEntities(new Set(
        sortedEntities
          .filter((e): e is typeof e & { id: string } => !!e.id)
          .map(e => e.id)
      ));
    }
  };

  const handleToggleEntity = (entityId: string) => {
    const newSelection = new Set(selectedEntities);
    if (newSelection.has(entityId)) {
      newSelection.delete(entityId);
    } else {
      newSelection.add(entityId);
    }
    setSelectedEntities(newSelection);
  };

  const handleBulkRemove = async () => {
    if (!selectedList || !selectedList.id || selectedEntities.size === 0) return;

    try {
      await bulkRemoveEntities(selectedList.id, [...selectedEntities]);

      logger.debug("catalogue-ui", "Bulk remove completed", {
        listId: selectedList.id,
        removedCount: selectedEntities.size
      });

      notifications.show({
        title: "Removed",
        message: `${selectedEntities.size} entities removed from list`,
        color: "green",
      });

      setSelectedEntities(new Set());
      setShowBulkConfirm(false);
    } catch (error) {
      logger.error("catalogue-ui", "Failed to bulk remove entities", {
        listId: selectedList.id,
        error
      });
      notifications.show({
        title: "Error",
        message: "Failed to remove entities",
        color: "red",
      });
    }
  };

  const handleBulkMove = async () => {
    if (!selectedList || !selectedList.id || !targetListId || selectedEntities.size === 0) return;

    try {
      await bulkMoveEntities(selectedList.id, targetListId, [...selectedEntities]);

      logger.debug("catalogue-ui", "Bulk move completed", {
        sourceListId: selectedList.id,
        targetListId,
        movedCount: selectedEntities.size
      });

      notifications.show({
        title: "Moved",
        message: `${selectedEntities.size} entities moved to target list`,
        color: "green",
      });

      setSelectedEntities(new Set());
      setShowBulkMoveModal(false);
      setTargetListId(null);
    } catch (error) {
      logger.error("catalogue-ui", "Failed to bulk move entities", {
        sourceListId: selectedList.id,
        targetListId,
        error
      });
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to move entities",
        color: "red",
      });
    }
  };

  // Get unique entity types for filter dropdown
  const entityTypes = [...new Set(entities.map((e) => e.entityType))];

  if (!selectedList) {
    return (
      <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xl">
        <Stack align="center" gap="md">
          <Text size="lg" c="dimmed">
            Select a list to view its entities
          </Text>
        </Stack>
      </Card>
    );
  }

  if (isLoadingEntities) {
    return (
      <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xl">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text size="sm" c="dimmed">
            Loading entities from "{selectedList.title}"...
          </Text>
        </Stack>
      </Card>
    );
  }

  if (entities.length === 0) {
    return (
      <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xl">
        <Stack align="center" gap="md">
          <Text size="lg" fw={500} ta="center">
            No entities yet
            <br />
            <Text component="span" size="sm" c="dimmed">
              Add entities to get started
            </Text>
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Card style={{ border: BORDER_STYLE_GRAY_3 }} padding="md">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Text size="lg" fw={500}>
            {entities.length} {entities.length === 1 ? "entity" : "entities"} in "{selectedList.title}"
          </Text>
          <Badge size="sm" color="blue">
            {selectedList.type === "bibliography" ? "Bibliography" : "List"}
          </Badge>
        </Group>

        {/* Filters */}
        <Group gap="md">
          <TextInput
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftSection={<IconSearch size={ICON_SIZE.MD} />}
            flex={1}
            aria-label="Search entities by ID or notes"
          />

          <Select
            value={filterType}
            onChange={(value) => setFilterType(value || "all")}
            data={[
              { value: "all", label: "All Types" },
              ...entityTypes.map((type) => ({ value: type, label: type })),
            ]}
            w={120}
            aria-label="Filter entities by type"
          />

          <Select
            value={sortBy}
            onChange={(value) => setSortBy(value || "position")}
            data={[
              { value: "position", label: "Order" },
              { value: "entityId", label: "Entity ID" },
              { value: "entityType", label: "Type" },
              { value: "addedAt", label: "Date Added" },
            ]}
            w={120}
            aria-label="Sort entities by"
          />
        </Group>

        {/* Bulk Actions */}
        {selectedEntities.size > 0 && (
          <Group gap="md" p="sm" style={{ background: "var(--mantine-color-blue-0)", borderRadius: "8px" }}>
            <Text size="sm" fw={500}>
              {selectedEntities.size} {selectedEntities.size === 1 ? "entity" : "entities"} selected
            </Text>
            <Button
              size="xs"
              variant="light"
              color="blue"
              onClick={() => setShowBulkMoveModal(true)}
              disabled={lists.length <= 1}
              data-testid="bulk-move-button"
            >
              Move to...
            </Button>
            <Button
              size="xs"
              variant="light"
              color="red"
              onClick={() => setShowBulkConfirm(true)}
              data-testid="bulk-remove-button"
            >
              Remove Selected
            </Button>
            <Button
              size="xs"
              variant="subtle"
              onClick={() => setSelectedEntities(new Set())}
            >
              Clear Selection
            </Button>
          </Group>
        )}

        {/* Entities Table - T075: With virtual scrolling for large lists */}
        <Card style={{ border: BORDER_STYLE_GRAY_3 }} padding={0}>
          <Box
            ref={parentRef}
            style={{
              height: useVirtualization ? '600px' : 'auto',
              overflow: useVirtualization ? 'auto' : 'visible',
            }}
          >
            <Table.ScrollContainer minWidth={500}>
              <Table striped highlightOnHover>
                <Table.Thead style={{ position: useVirtualization ? 'sticky' : 'static', top: 0, zIndex: 1, background: 'white' }}>
                  <Table.Tr>
                    <Table.Th w={40}>
                      <Checkbox
                        checked={selectedEntities.size === sortedEntities.length && sortedEntities.length > 0}
                        indeterminate={selectedEntities.size > 0 && selectedEntities.size < sortedEntities.length}
                        onChange={handleSelectAll}
                        aria-label="Select all entities"
                      />
                    </Table.Th>
                    <Table.Th w={40}></Table.Th>
                    <Table.Th>Entity</Table.Th>
                    <Table.Th>Notes</Table.Th>
                    <Table.Th w={100}>Added</Table.Th>
                    <Table.Th w={100}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={sortedEntities
                        .filter((entity): entity is typeof entity & { id: string } => !!entity.id)
                        .map(entity => entity.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {useVirtualization ? (
                        // Virtualized rendering for large lists
                        <Box style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const entity = sortedEntities[virtualRow.index];
                            return (
                              <Box
                                key={entity.id}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  transform: `translateY(${virtualRow.start}px)`,
                                }}
                              >
                                <SortableEntityRow
                                  entity={entity}
                                  onNavigate={onNavigate}
                                  onRemove={handleRemoveEntity}
                                  onEditNotes={handleEditNotes}
                                  isSelected={selectedEntities.has(entity.id ?? "")}
                                  onToggleSelect={handleToggleEntity}
                                />
                              </Box>
                            );
                          })}
                        </Box>
                      ) : (
                        // Standard rendering for small lists
                        sortedEntities.map((entity) => (
                          <SortableEntityRow
                            key={entity.id}
                            entity={entity}
                            onNavigate={onNavigate}
                            onRemove={handleRemoveEntity}
                            onEditNotes={handleEditNotes}
                            isSelected={selectedEntities.has(entity.id ?? "")}
                            onToggleSelect={handleToggleEntity}
                          />
                        ))
                      )}
                    </SortableContext>
                  </DndContext>
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Box>
        </Card>

        {filteredEntities.length === 0 && entities.length > 0 && (
          <Alert color="yellow">
            No entities match your current filters
          </Alert>
        )}

        <Text size="xs" c="dimmed" ta="center">
          Drag entities to reorder them • Click on entity ID to view details
        </Text>
      </Stack>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        opened={showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        title="Confirm Bulk Removal"
        centered
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to remove {selectedEntities.size} {selectedEntities.size === 1 ? "entity" : "entities"} from this list?
            This action cannot be undone.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" onClick={() => setShowBulkConfirm(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleBulkRemove}>
              Remove
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Bulk Move Modal */}
      <Modal
        opened={showBulkMoveModal}
        onClose={() => {
          setShowBulkMoveModal(false);
          setTargetListId(null);
        }}
        title="Move Entities to List"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Select a list to move {selectedEntities.size} {selectedEntities.size === 1 ? "entity" : "entities"} to:
          </Text>
          <Select
            label="Target List"
            placeholder="Select a list..."
            value={targetListId}
            onChange={(value) => setTargetListId(value)}
            data={lists
              .filter((list): list is typeof list & { id: string } => list.id !== selectedList?.id && !!list.id)
              .map((list) => ({
                value: list.id,
                label: list.title,
              }))}
            searchable
            required
          />
          <Group justify="flex-end" gap="xs">
            <Button
              variant="subtle"
              onClick={() => {
                setShowBulkMoveModal(false);
                setTargetListId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              color="blue"
              onClick={handleBulkMove}
              disabled={!targetListId}
            >
              Move
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
};