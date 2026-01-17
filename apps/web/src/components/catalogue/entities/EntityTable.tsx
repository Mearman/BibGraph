/**
 * Entity Table Component
 * Virtualized table for displaying catalogue entities with drag-and-drop support
 */

import type { EntityType } from "@bibgraph/types";
import type { CatalogueEntity } from "@bibgraph/utils";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Box, Card, Checkbox, Table } from "@mantine/core";
import type { Virtualizer } from "@tanstack/react-virtual";
import type { RefObject } from "react";

import { BORDER_STYLE_GRAY_3 } from "@/config/style-constants";

import { SortableEntityRow } from "./SortableEntityRow";

interface EntityTableProps {
  sortedEntities: CatalogueEntity[];
  selectedEntities: Set<string>;
  onSelectAll: () => void;
  onToggleEntity: (entityId: string) => void;
  onNavigate?: (entityType: EntityType, entityId: string) => void;
  onRemove: (entityId: string) => Promise<void>;
  onEditNotes: (entityId: string, notes: string) => Promise<void>;
  onDragEnd: (event: DragEndEvent) => Promise<void>;
  parentRef: RefObject<HTMLDivElement | null>;
  useVirtualization: boolean;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
}

export const EntityTable = ({
  sortedEntities,
  selectedEntities,
  onSelectAll,
  onToggleEntity,
  onNavigate,
  onRemove,
  onEditNotes,
  onDragEnd,
  parentRef,
  useVirtualization,
  rowVirtualizer,
}: EntityTableProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const allSelected =
    selectedEntities.size === sortedEntities.length && sortedEntities.length > 0;
  const someSelected =
    selectedEntities.size > 0 && selectedEntities.size < sortedEntities.length;

  return (
    <Card style={{ border: BORDER_STYLE_GRAY_3 }} padding={0}>
      <Box
        ref={parentRef}
        style={{
          height: useVirtualization ? "600px" : "auto",
          overflow: useVirtualization ? "auto" : "visible",
        }}
      >
        <Table.ScrollContainer minWidth={500}>
          <Table striped highlightOnHover>
            <Table.Thead
              style={{
                position: useVirtualization ? "sticky" : "static",
                top: 0,
                zIndex: 1,
                background: "white",
              }}
            >
              <Table.Tr>
                <Table.Th w={40}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={onSelectAll}
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
                onDragEnd={onDragEnd}
              >
                <SortableContext
                  items={sortedEntities
                    .filter(
                      (entity): entity is typeof entity & { id: string } =>
                        !!entity.id
                    )
                    .map((entity) => entity.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {useVirtualization ? (
                    // Virtualized rendering for large lists
                    <Box
                      style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        position: "relative",
                      }}
                    >
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const entity = sortedEntities[virtualRow.index];
                        return (
                          <Box
                            key={entity.id}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            <SortableEntityRow
                              entity={entity}
                              onNavigate={onNavigate}
                              onRemove={onRemove}
                              onEditNotes={onEditNotes}
                              isSelected={selectedEntities.has(entity.id ?? "")}
                              onToggleSelect={onToggleEntity}
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
                        onRemove={onRemove}
                        onEditNotes={onEditNotes}
                        isSelected={selectedEntities.has(entity.id ?? "")}
                        onToggleSelect={onToggleEntity}
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
  );
};
