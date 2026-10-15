/**
 * Component tests for the catalogue entity row: a graph-list entry shows the display name carried in its notes, with the entity id demoted to secondary text.
 */

import type { CatalogueEntity } from "@bibgraph/utils";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { MantineProvider, Table } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SortableEntityRow } from "./SortableEntityRow";

const graphListEntity = {
  id: "row-1",
  listId: "graph-list",
  entityType: "authors",
  entityId: "A5017898742",
  notes: "provenance:user|label:Joseph Mearman",
  addedAt: new Date("2026-10-15T10:00:00Z"),
  position: 1,
} as CatalogueEntity;

const plainEntity = {
  id: "row-2",
  listId: "my-list",
  entityType: "works",
  entityId: "W2741809807",
  notes: "Read before the supervision meeting",
  addedAt: new Date("2026-10-15T10:00:00Z"),
  position: 2,
} as CatalogueEntity;

const renderRow = (entity: CatalogueEntity) =>
  render(
    <MantineProvider>
      <DndContext onDragEnd={vi.fn(() => undefined)}>
        <Table>
          <Table.Tbody>
            <SortableContext items={[entity.id ?? ""]}>
              <SortableEntityRow
                entity={entity}
                onRemove={vi.fn().mockResolvedValue(undefined)}
                onEditNotes={vi.fn().mockResolvedValue(undefined)}
                isSelected={false}
                onToggleSelect={vi.fn(() => undefined)}
              />
            </SortableContext>
          </Table.Tbody>
        </Table>
      </DndContext>
    </MantineProvider>,
  );

describe("SortableEntityRow", () => {
  it("shows the display name as the primary label of a graph-list entry", () => {
    renderRow(graphListEntity);

    expect(screen.getByText("Joseph Mearman")).toBeVisible();
    expect(screen.getByText("A5017898742")).toBeVisible();
  });

  it("keeps the entity id as the primary label when no name is stored", () => {
    renderRow(plainEntity);

    expect(screen.getByText("W2741809807")).toBeVisible();
  });
});
