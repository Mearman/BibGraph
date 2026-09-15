import type { BaseFilterRenderProps, FilterFieldConfig, FilterOperator } from "@bibgraph/utils";
import { BaseFilter } from "@bibgraph/utils";
import { TextInput } from "@mantine/core";
import React from "react";

interface DateFilterProperties {
  value: string | [string, string] | null;
  operator: FilterOperator;
  config: FilterFieldConfig;
  onValueChange: (value: string | readonly [string, string] | null) => void;
  onOperatorChange: (operator: FilterOperator) => void;
  disabled?: boolean;
  compact?: boolean;
  fieldId: string;
}

export const DateFilter = ({
  value,
  operator,
  config,
  onValueChange,
  onOperatorChange,
  disabled = false,
  compact = false,
  fieldId,
}: DateFilterProperties) => {
  const isRange = config.type === "dateRange";

  const handleValueChange = React.useCallback((newValue: string) => {
    if (isRange) {
      // For range, expect format like "2023-01-01 to 2023-12-31"
      const parts = newValue.split(" to ");
      if (parts.length === 2) {
        onValueChange([parts[0].trim(), parts[1].trim()]);
      } else {
        onValueChange(null);
      }
    } else {
      onValueChange(newValue || null);
    }
  }, [isRange, onValueChange]);

  const displayValue = React.useMemo(() => {
    if (value === null || value === "") return "";
    if (isRange && Array.isArray(value)) {
      return `${value[0]} to ${value[1]}`;
    }
    if (!isRange && typeof value === "string") {
      return value;
    }
    return "";
  }, [value, isRange]);

  return (
    <BaseFilter
      value={value}
      operator={operator}
      config={config}
      onValueChange={(value_) => {
        // Convert the callback value back to the expected format
        if (typeof value_ === "string") {
          handleValueChange(value_);
        }
      }}
      onOperatorChange={onOperatorChange}
      disabled={disabled}
      compact={compact}
      fieldId={fieldId}
    >
      {(properties: BaseFilterRenderProps<string | [string, string] | null>) => (
        <TextInput
          id={properties.fieldId}
          value={displayValue}
          onChange={(event) => { handleValueChange(event.currentTarget.value); }}
          placeholder={config.placeholder ?? (isRange ? "2023-01-01 to 2023-12-31" : "YYYY-MM-DD")}
          disabled={properties.disabled}
          size={properties.compact ? "xs" : "sm"}
          flex={1}
        />
      )}
    </BaseFilter>
  );
};