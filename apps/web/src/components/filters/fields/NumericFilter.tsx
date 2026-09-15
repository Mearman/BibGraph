import type { BaseFilterRenderProps, FilterFieldConfig, FilterOperator } from "@bibgraph/utils";
import { BaseFilter } from "@bibgraph/utils";
import { NumberInput } from "@mantine/core";

interface NumericFilterProperties {
  value: number;
  operator: FilterOperator;
  config: FilterFieldConfig;
  onValueChange: (value: number) => void;
  onOperatorChange: (operator: FilterOperator) => void;
  disabled?: boolean;
  compact?: boolean;
  fieldId: string;
}

export const NumericFilter = ({
  value,
  operator,
  config,
  onValueChange,
  onOperatorChange,
  disabled = false,
  compact = false,
  fieldId,
}: NumericFilterProperties) => <BaseFilter
      value={value}
      operator={operator}
      config={config}
      onValueChange={onValueChange}
      onOperatorChange={onOperatorChange}
      disabled={disabled}
      compact={compact}
      fieldId={fieldId}
    >
      {(properties: Readonly<BaseFilterRenderProps<number>>) => (
        <NumberInput
          id={properties.fieldId}
          value={properties.value || 0}
          onChange={(value_) => { properties.onChange(typeof value_ === "number" ? value_ : 0); }}
          placeholder={config.placeholder}
          disabled={properties.disabled}
          size={properties.compact ? "xs" : "sm"}
          flex={1}
        />
      )}
    </BaseFilter>;