import type { EntityType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconCalendar,
  IconFilter,
  IconGripVertical,
  IconInfoCircle,
  IconPlus,
  IconSearch,
  IconTags,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import React, { useCallback, useState } from "react";

import { BORDER_STYLE_GRAY_3 } from '@/config/style-constants';
import { useReducedMotion } from "@/hooks/use-reduced-motion";

import type { LogicalOperator } from "../filters/types/filter-ui";

// Query builder types
export interface QueryFilterChip {
  id: string;
  type: "field" | "operator" | "value";
  field?: string;
  operator?: QueryFilterOperator;
  value?: unknown;
  label: string;
  category: QueryChipCategory;
  entityType?: EntityType;
  dataType: QueryDataType;
  enabled: boolean;
}

export interface QueryGroup {
  id: string;
  operator: LogicalOperator;
  chips: QueryFilterChip[];
  label?: string;
  enabled: boolean;
}

export interface VisualQuery {
  id: string;
  groups: QueryGroup[];
  entityType: EntityType;
  name?: string;
  description?: string;
}

export type QueryFilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "between"
  | "exists";
export type QueryChipCategory =
  | "general"
  | "temporal"
  | "entity"
  | "text"
  | "numeric"
  | "boolean";
export type QueryDataType =
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "entity"
  | "array";

const DRAGGING_OPACITY = 0.5;

interface VisualQueryBuilderProperties {
  entityType: EntityType;
  initialQuery?: VisualQuery;
  onQueryChange?: (query: VisualQuery) => void;
  onApply?: (query: VisualQuery) => void;
  disabled?: boolean;
  compact?: boolean;
}

// Sortable chip component
interface SortableChipProperties {
  chip: QueryFilterChip;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

const SortableChip: React.FC<SortableChipProperties> = ({
  chip,
  onRemove,
  disabled = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: chip.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? DRAGGING_OPACITY : 1,
  };

  const getChipColor = (category: QueryChipCategory): string => {
    switch (category) {
      case "temporal":
        return "blue";
      case "entity":
        return "green";
      case "text":
        return "violet";
      case "numeric":
        return "orange";
      case "boolean":
        return "cyan";
      case "general":
        return "gray";
      default:
        return category satisfies never;
    }
  };

  const getIcon = (category: QueryChipCategory) => {
    switch (category) {
      case "temporal":
        return <IconCalendar size={14} />;
      case "entity":
        return <IconUser size={14} />;
      case "text":
        return <IconSearch size={14} />;
      case "numeric":
        return <IconTags size={14} />;
      case "boolean":
        return <IconFilter size={14} />;
      case "general":
        return <IconInfoCircle size={14} />;
      default:
        return category satisfies never;
    }
  };

  return (
    <Box ref={setNodeRef} style={style}>
      <Badge
        variant={chip.enabled ? "filled" : "outline"}
        color={getChipColor(chip.category)}
        size="lg"
        leftSection={getIcon(chip.category)}
        rightSection={
          <Group gap={4}>
            <ActionIcon
              size="xs"
              variant="subtle"
              color="gray"
              {...listeners}
              {...attributes}
              style={{ cursor: isDragging ? "grabbing" : "grab" }}
            >
              <IconGripVertical size={12} />
            </ActionIcon>
            <ActionIcon
              size="xs"
              variant="subtle"
              color="red"
              onClick={() => { onRemove(chip.id); }}
              disabled={disabled}
            >
              <IconX size={12} />
            </ActionIcon>
          </Group>
        }
        style={{
          paddingRight: "4px",
          cursor: "default",
        }}
      >
        {chip.label}
      </Badge>
    </Box>
  );
};

// Drop zone component
interface DropZoneProperties {
  id: string;
  children: React.ReactNode;
  title: string;
  description?: string;
  isEmpty?: boolean;
}

const DropZone: React.FC<DropZoneProperties> = ({
  id,
  children,
  title,
  description,
  isEmpty = false,
}) => {
  const isPrefersReducedMotion = useReducedMotion();
  return (
    <Paper
      p="md"
      style={{
        minHeight: isEmpty ? "80px" : "auto",
        border: isEmpty ? "2px dashed var(--mantine-color-gray-3)" : BORDER_STYLE_GRAY_3,
        backgroundColor: isEmpty ? "var(--mantine-color-gray-0)" : "var(--mantine-color-body)",
        transition: isPrefersReducedMotion ? "none" : "all 0.2s ease",
      }}
      data-drop-zone={id}
    >
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm" fw={500}>
            {title}
          </Text>
          {description !== undefined && description !== "" && (
            <Text size="xs" c="dimmed">
              {description}
            </Text>
          )}
        </Group>
        <Group gap="xs" wrap="wrap">
          {children}
        </Group>
        {isEmpty && (
          <Text size="xs" c="dimmed" ta="center" style={{ marginTop: "8px" }}>
            Drop filter chips here
          </Text>
        )}
      </Stack>
    </Paper>
  );
};

// Available filter chips for the entity type
const getAvailableChips = (entityType: EntityType): QueryFilterChip[] => {
  const baseChips: QueryFilterChip[] = [
    {
      id: "chip-display-name",
      type: "field",
      field: "display_name",
      label: "Title/Name",
      category: "text",
      dataType: "string",
      enabled: true,
    },
    {
      id: "chip-publication-year",
      type: "field",
      field: "publication_year",
      label: "Publication Year",
      category: "temporal",
      dataType: "number",
      enabled: true,
    },
    {
      id: "chip-cited-by-count",
      type: "field",
      field: "cited_by_count",
      label: "Citation Count",
      category: "numeric",
      dataType: "number",
      enabled: true,
    },
    {
      id: "chip-open-access",
      type: "field",
      field: "open_access",
      label: "Open Access",
      category: "boolean",
      dataType: "boolean",
      enabled: true,
    },
    // Operators
    {
      id: "op-equals",
      type: "operator",
      operator: "equals",
      label: "equals",
      category: "general",
      dataType: "string",
      enabled: true,
    },
    {
      id: "op-contains",
      type: "operator",
      operator: "contains",
      label: "contains",
      category: "general",
      dataType: "string",
      enabled: true,
    },
    {
      id: "op-greater-than",
      type: "operator",
      operator: "greater_than",
      label: "greater than",
      category: "general",
      dataType: "number",
      enabled: true,
    },
    {
      id: "op-less-than",
      type: "operator",
      operator: "less_than",
      label: "less than",
      category: "general",
      dataType: "number",
      enabled: true,
    },
  ];

  // Add entity-specific chips
  if (entityType === "works") {
    baseChips.push(
      {
        id: "chip-type",
        type: "field",
        field: "type",
        label: "Work Type",
        category: "entity",
        dataType: "string",
        enabled: true,
      },
      {
        id: "chip-concepts",
        type: "field",
        field: "concepts",
        label: "Concepts",
        category: "entity",
        dataType: "array",
        enabled: true,
      },
    );
  } else if (entityType === "authors") {
    baseChips.push(
      {
        id: "chip-works-count",
        type: "field",
        field: "works_count",
        label: "Works Count",
        category: "numeric",
        dataType: "number",
        enabled: true,
      },
      {
        id: "chip-h-index",
        type: "field",
        field: "h_index",
        label: "H-Index",
        category: "numeric",
        dataType: "number",
        enabled: true,
      },
    );
  }

  return baseChips;
};

export const VisualQueryBuilder = ({
  entityType,
  initialQuery,
  onQueryChange,
  onApply,
  disabled = false,
}: VisualQueryBuilderProperties) => {
  // Initialize with empty query or provided initial query
  const [query, setQuery] = useState<VisualQuery>(() => {
    if (initialQuery) {
      return initialQuery;
    }
    return {
      id: `query-${String(Date.now())}`,
      groups: [
        {
          id: `group-${String(Date.now())}`,
          operator: "AND",
          chips: [],
          enabled: true,
        },
      ],
      entityType,
    };
  });

  const [availableChips] = useState<QueryFilterChip[]>(() =>
    getAvailableChips(entityType),
  );
  const [_draggedChip, setDraggedChip] = useState<QueryFilterChip | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const chip = availableChips.find((c) => c.id === active.id);
      if (chip) {
        setDraggedChip(chip);
        logger.debug("QUERY_BUILDER_LOGGER_NAME", "Drag started", {
          chipId: chip.id,
          chipLabel: chip.label,
        });
      }
    },
    [availableChips],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setDraggedChip(null);

      if (!over) {
        logger.debug(
          "QUERY_BUILDER_LOGGER_NAME",
          "Drag cancelled - no drop target",
        );
        return;
      }

      const sourceChip = availableChips.find((c) => c.id === active.id);
      if (!sourceChip) {
        logger.warn("QUERY_BUILDER_LOGGER_NAME", "Source chip not found", {
          activeId: active.id,
        });
        return;
      }

      // Handle dropping onto a group
      const targetGroupId = over.id;
      const targetGroup = query.groups.find((g) => g.id === targetGroupId);

      if (targetGroup) {
        // Create a copy of the chip with a new ID for the query
        const newChip: QueryFilterChip = {
          ...sourceChip,
          id: `${sourceChip.id}-${String(Date.now())}`,
        };

        const updatedQuery: VisualQuery = {
          ...query,
          groups: query.groups.map((group) =>
            group.id === targetGroupId
              ? { ...group, chips: [...group.chips, newChip] }
              : group,
          ),
        };

        setQuery(updatedQuery);
        onQueryChange?.(updatedQuery);

        logger.debug("QUERY_BUILDER_LOGGER_NAME", "Chip added to group", {
          chipId: newChip.id,
          groupId: targetGroupId,
          chipLabel: newChip.label,
        });
      }
    },
    [availableChips, query, onQueryChange],
  );

  const handleRemoveChip = useCallback(
    (chipId: string) => {
      const updatedQuery: VisualQuery = {
        ...query,
        groups: query.groups.map((group) => ({
          ...group,
          chips: group.chips.filter((chip) => chip.id !== chipId),
        })),
      };

      setQuery(updatedQuery);
      onQueryChange?.(updatedQuery);

      logger.debug("QUERY_BUILDER_LOGGER_NAME", "Chip removed", { chipId });
    },
    [query, onQueryChange],
  );

  const handleAddGroup = useCallback(() => {
    const newGroup: QueryGroup = {
      id: `group-${String(Date.now())}`,
      operator: "AND",
      chips: [],
      enabled: true,
    };

    const updatedQuery: VisualQuery = {
      ...query,
      groups: [...query.groups, newGroup],
    };

    setQuery(updatedQuery);
    onQueryChange?.(updatedQuery);

    logger.debug("QUERY_BUILDER_LOGGER_NAME", "Group added", {
      groupId: newGroup.id,
    });
  }, [query, onQueryChange]);

  const handleApply = useCallback(() => {
    if (!onApply) {
    	return;
    }

    onApply(query);
    logger.debug("QUERY_BUILDER_LOGGER_NAME", "Query applied", {
      groupCount: query.groups.length,
      totalChips: query.groups.reduce((sum, g) => sum + g.chips.length, 0),
    });
  }, [query, onApply]);

  const handleClear = useCallback(() => {
    const clearedQuery: VisualQuery = {
      ...query,
      groups: [
        {
          id: `group-${String(Date.now())}`,
          operator: "AND",
          chips: [],
          enabled: true,
        },
      ],
    };

    setQuery(clearedQuery);
    onQueryChange?.(clearedQuery);

    logger.debug("QUERY_BUILDER_LOGGER_NAME", "Query cleared");
  }, [query, onQueryChange]);

  const hasAnyChips = query.groups.some((group) => group.chips.length > 0);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Paper p="md" style={{ border: BORDER_STYLE_GRAY_3 }}>
        <Stack gap="md">
          {/* Header */}
          <Group justify="space-between">
            <Title order={3} size="h4">
              Visual Query Builder
            </Title>
            <Group gap="sm">
              <Button
                variant="subtle"
                leftSection={<IconPlus size={16} />}
                onClick={handleAddGroup}
                disabled={disabled}
                size="sm"
              >
                Add Group
              </Button>
              {onApply && (
                <Button
                  leftSection={<IconSearch size={16} />}
                  onClick={handleApply}
                  disabled={disabled || !hasAnyChips}
                >
                  Apply Query
                </Button>
              )}
            </Group>
          </Group>

          {/* Instructions */}
          <Alert color="blue" variant="light">
            <Text size="sm">
              Drag filter chips from the palette below into query groups to
              build your search. Combine multiple groups with AND/OR logic to
              create complex queries.
            </Text>
          </Alert>

          {/* Query Groups */}
          <Stack gap="sm">
            {query.groups.map((group, index) => (
              <Box key={group.id}>
                {index > 0 && (
                  <Group justify="center" my="xs">
                    <Chip checked={false} onChange={() => { /* Display-only: operator toggling between groups is not yet implemented */ }}>
                      {group.operator}
                    </Chip>
                  </Group>
                )}
                <SortableContext
                  items={group.chips}
                  strategy={verticalListSortingStrategy}
                >
                  <DropZone
                    id={group.id}
                    title={`Query Group ${String(index + 1)}`}
                    description={`${String(group.chips.length)} filter${group.chips.length === 1 ? "" : "s"}`}
                    isEmpty={group.chips.length === 0}
                  >
                    {group.chips.map((chip) => (
                      <SortableChip
                        key={chip.id}
                        chip={chip}
                        onRemove={handleRemoveChip}
                        disabled={disabled}
                      />
                    ))}
                  </DropZone>
                </SortableContext>
              </Box>
            ))}
          </Stack>

          <Divider />

          {/* Available Chips Palette */}
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                Filter Palette
              </Text>
              <Button
                variant="subtle"
                size="xs"
                onClick={handleClear}
                disabled={disabled || !hasAnyChips}
                color="red"
              >
                Clear All
              </Button>
            </Group>

            <Text size="xs" c="dimmed">
              Drag these chips into query groups above to build your search
            </Text>

            {/* Group available chips by category */}
            {[...availableChips.reduce((accumulator, chip) => {
              const existing = accumulator.get(chip.category) ?? [];
              accumulator.set(chip.category, [...existing, chip]);
              return accumulator;
            }, new Map<QueryChipCategory, QueryFilterChip[]>())].map(([category, chips]) => (
              <Box key={category}>
                <Text size="xs" fw={500} c="dimmed" mb={4} tt="capitalize">
                  {category}
                </Text>
                <Group gap="xs" wrap="wrap">
                  {chips.map((chip) => (
                    <SortableChip
                      key={chip.id}
                      chip={chip}
                      onRemove={() => { /* Palette chips are templates, not removable */ }}
                      disabled={disabled}
                    />
                  ))}
                </Group>
              </Box>
            ))}
          </Stack>
        </Stack>
      </Paper>
    </DndContext>
  );
};
