import type { BaseFilterRenderProps, FilterFieldConfig, FilterOperator } from "@bibgraph/utils";
import { BaseFilter } from "@bibgraph/utils";
import { TextInput } from "@mantine/core";

interface TextFilterProperties {
  value: string;
  operator: FilterOperator;
  config: FilterFieldConfig;
  onValueChange: (value: string) => void;
  onOperatorChange: (operator: FilterOperator) => void;
  disabled?: boolean;
  compact?: boolean;
  fieldId: string;
}

export const TextFilter = ({
  value,
  operator,
  config,
  onValueChange,
  onOperatorChange,
  disabled = false,
  compact = false,
  fieldId,
}: TextFilterProperties) => <BaseFilter
      value={value}
      operator={operator}
      config={config}
      onValueChange={onValueChange}
      onOperatorChange={onOperatorChange}
      disabled={disabled}
      compact={compact}
      fieldId={fieldId}
    >
      {(properties: Readonly<BaseFilterRenderProps<string>>) => (
        <TextInput
          id={properties.fieldId}
          value={properties.value || ""}
          onChange={(event) => { properties.onChange(event.currentTarget.value); }}
          placeholder={config.placeholder}
          disabled={properties.disabled}
          size={properties.compact ? "xs" : "sm"}
          flex={1}
        />
      )}
    </BaseFilter>;