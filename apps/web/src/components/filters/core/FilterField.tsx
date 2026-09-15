/**
 * FilterField - Base component for individual filter conditions
 * Provides the foundation for all filter field types with consistent UI and behavior
 */

import type { EntityFilters } from "@bibgraph/types";
import type { FilterOperator } from "@bibgraph/utils";
import { ActionIcon, Alert,Group, Text, Tooltip } from "@mantine/core";
import { IconAlertCircle,IconX } from "@tabler/icons-react";
import React, { useCallback, useMemo } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useThemeColors } from "@/hooks/use-theme-colors";

import { BooleanFilter } from "../fields/BooleanFilter";
import { DateFilter } from "../fields/DateFilter";
import { EntityFilter } from "../fields/EntityFilter";
import { EnumFilter } from "../fields/EnumFilter";
import { NumericFilter } from "../fields/NumericFilter";
import { TextFilter } from "../fields/TextFilter";
import type { FilterCondition,FilterFieldProps as FilterFieldProperties } from "../types/filter-ui";

interface FilterFieldWrapperProperties<T extends EntityFilters = EntityFilters>
  extends FilterFieldProperties<T> {
  showRemoveButton?: boolean;
  showLabel?: boolean;
  error?: string;
}

const DATE_RANGE_TUPLE_LENGTH = 2;
const DISABLED_FIELD_OPACITY = 0.7;
const COMPACT_LABEL_MARGIN_BOTTOM = 4;
const LABEL_MARGIN_BOTTOM = 8;

const isFilterOperator = (value: string): value is FilterOperator =>
  value === "=" ||
  value === "!=" ||
  value === ">" ||
  value === ">=" ||
  value === "<" ||
  value === "<=" ||
  value === "contains" ||
  value === "search" ||
  value === "between";

const toStringValue = (value: unknown): string => (typeof value === "string" ? value : "");

const toNumberValue = (value: unknown): number => (typeof value === "number" ? value : 0);

const toBooleanValue = (value: unknown): boolean => (typeof value === "boolean" ? value : false);

const toDateFilterValue = (value: unknown): string | [string, string] | null => {
  if (value === null || typeof value === "string") {
    return value;
  }
  if (
    Array.isArray(value) &&
    value.length === DATE_RANGE_TUPLE_LENGTH &&
    typeof value[0] === "string" &&
    typeof value[1] === "string"
  ) {
    return [value[0], value[1]];
  }
  return null;
};

const toStringOrStringArrayValue = (value: unknown): string | string[] => {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && value.every((item): item is string => typeof item === "string")) {
    return value;
  }
  return "";
};

export const FilterField = <T extends EntityFilters>({
  condition,
  config,
  onUpdate,
  onRemove,
  disabled = false,
  compact = false,
  showRemoveButton = true,
  showLabel = true,
  error,
}: FilterFieldWrapperProperties<T>) => {
  const { colors } = useThemeColors();
  const isPrefersReducedMotion = useReducedMotion();

  // Generate unique ID for form elements
  const fieldId = useMemo(() => `filter-${condition.id}`, [condition.id]);

  // Handle field value updates
  const handleValueChange = useCallback(
    (value: unknown) => {
      const updatedCondition: FilterCondition<T> = {
        ...condition,
        value,
      };
      onUpdate(updatedCondition);
    },
    [condition, onUpdate],
  );

  // Handle operator changes
  const handleOperatorChange = useCallback(
    (operator: string) => {
      if (!isFilterOperator(operator)) {
        return;
      }
      const updatedCondition: FilterCondition<T> = {
        ...condition,
        operator,
      };
      onUpdate(updatedCondition);
    },
    [condition, onUpdate],
  );

  // Handle enabled/disabled toggle
  const handleToggleEnabled = useCallback(() => {
    const updatedCondition: FilterCondition<T> = {
      ...condition,
      enabled: !condition.enabled,
    };
    onUpdate(updatedCondition);
  }, [condition, onUpdate]);

  // Render the appropriate field component based on type
  const renderFieldComponent = () => {
    switch (config.type) {
      case "text":
      case "search":
        return (
          <TextFilter
            value={toStringValue(condition.value)}
            operator={condition.operator}
            config={config}
            onValueChange={handleValueChange}
            onOperatorChange={handleOperatorChange}
            disabled={disabled || !condition.enabled}
            compact={compact}
            fieldId={fieldId}
          />
        );

      case "number":
        return (
          <NumericFilter
            value={toNumberValue(condition.value)}
            operator={condition.operator}
            config={config}
            onValueChange={handleValueChange}
            onOperatorChange={handleOperatorChange}
            disabled={disabled || !condition.enabled}
            compact={compact}
            fieldId={fieldId}
          />
        );

      case "date":
      case "dateRange":
        return (
          <DateFilter
            value={toDateFilterValue(condition.value)}
            operator={condition.operator}
            config={config}
            onValueChange={handleValueChange}
            onOperatorChange={handleOperatorChange}
            disabled={disabled || !condition.enabled}
            compact={compact}
            fieldId={fieldId}
          />
        );

      case "boolean":
        return (
          <BooleanFilter
            value={toBooleanValue(condition.value)}
            operator={condition.operator}
            config={config}
            onValueChange={handleValueChange}
            onOperatorChange={handleOperatorChange}
            disabled={disabled || !condition.enabled}
            compact={compact}
            fieldId={fieldId}
          />
        );

      case "select":
      case "multiSelect":
        return (
          <EnumFilter
            value={toStringOrStringArrayValue(condition.value)}
            operator={condition.operator}
            config={config}
            onValueChange={handleValueChange}
            onOperatorChange={handleOperatorChange}
            disabled={disabled || !condition.enabled}
            compact={compact}
            fieldId={fieldId}
          />
        );

      case "entity":
      case "entityMulti":
        return (
          <EntityFilter
            value={toStringOrStringArrayValue(condition.value)}
            operator={condition.operator}
            config={config}
            onValueChange={handleValueChange}
            onOperatorChange={handleOperatorChange}
            disabled={disabled || !condition.enabled}
            compact={compact}
            fieldId={fieldId}
          />
        );

      default:
        return (
          <Alert color="orange" icon={<IconAlertCircle size={14} />}>
            Unknown field type: {config.type}
          </Alert>
        );
    }
  };

  return (
    <div
      style={{
        padding: compact ? "8px" : "12px",
        border: `1px solid ${condition.enabled ? colors.border.primary : colors.border.secondary}`,
        borderRadius: "6px",
        backgroundColor: condition.enabled
          ? colors.background.primary
          : colors.background.secondary,
        opacity: condition.enabled ? 1 : DISABLED_FIELD_OPACITY,
        transition: isPrefersReducedMotion ? "none" : "all 0.2s ease",
      }}
    >
      {/* Field Label and Controls */}
      {showLabel && (
        <Group justify="space-between" mb={compact ? COMPACT_LABEL_MARGIN_BOTTOM : LABEL_MARGIN_BOTTOM}>
          <Group gap="xs">
            <Text
              size={compact ? "xs" : "sm"}
              fw={500}
              style={{
                color: condition.enabled
                  ? colors.text.primary
                  : colors.text.secondary,
              }}
            >
              {condition.label ?? config.label}
            </Text>

            {config.helpText !== undefined && config.helpText !== "" && (
              <Tooltip label={config.helpText} multiline w={220}>
                <IconAlertCircle
                  size={12}
                  style={{ color: colors.text.tertiary, cursor: "help" }}
                />
              </Tooltip>
            )}
          </Group>

          <Group gap="xs">
            {/* Enable/Disable Toggle */}
            <Tooltip
              label={condition.enabled ? "Disable filter" : "Enable filter"}
            >
              <ActionIcon
                size="sm"
                variant="subtle"
                color={condition.enabled ? "blue" : "gray"}
                onClick={handleToggleEnabled}
                disabled={disabled}
              >
                {condition.enabled ? "✓" : "○"}
              </ActionIcon>
            </Tooltip>

            {/* Remove Button */}
            {showRemoveButton && (
              <Tooltip label="Remove filter">
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="red"
                  onClick={onRemove}
                  disabled={disabled}
                >
                  <IconX size={12} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>
      )}

      {/* Field Component */}
      {renderFieldComponent()}

      {/* Error Display */}
      {error !== undefined && error !== "" && (
        <Text size="xs" c="red" mt={4}>
          {error}
        </Text>
      )}

      {/* Field Description */}
      {config.helpText !== undefined && config.helpText !== "" && !compact && (
        <Text size="xs" c="dimmed" mt={4}>
          {config.helpText}
        </Text>
      )}
    </div>
  );
};

// Export with display name for debugging
FilterField.displayName = "FilterField";
