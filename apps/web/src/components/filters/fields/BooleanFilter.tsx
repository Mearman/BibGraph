import type { BaseFilterRenderProps, FilterFieldConfig, FilterOperator } from "@bibgraph/utils";
import { BaseFilter } from "@bibgraph/utils";
import { Switch } from "@mantine/core";

interface BooleanFilterProperties {
  value: boolean;
  operator: FilterOperator;
  config: FilterFieldConfig;
  onValueChange: (value: boolean) => void;
  onOperatorChange: (operator: FilterOperator) => void;
  disabled?: boolean;
  compact?: boolean;
  fieldId: string;
}

export const BooleanFilter = ({
  value,
  operator,
  config,
  onValueChange,
  onOperatorChange,
  disabled = false,
  compact = false,
  fieldId,
}: BooleanFilterProperties) => <BaseFilter
      value={value}
      operator={operator}
      config={config}
      onValueChange={onValueChange}
      onOperatorChange={onOperatorChange}
      disabled={disabled}
      compact={compact}
      fieldId={fieldId}
    >
      {(properties: Readonly<BaseFilterRenderProps<boolean>>) => (
        <Switch
          id={properties.fieldId}
          checked={properties.value}
          onChange={(event) => { properties.onChange(event.currentTarget.checked); }}
          disabled={properties.disabled}
          size={properties.compact ? "xs" : "sm"}
          style={{ marginTop: "4px" }}
        />
      )}
    </BaseFilter>;