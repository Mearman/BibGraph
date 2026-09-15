import type { BaseFilterRenderProps, FilterFieldConfig, FilterOperator } from "@bibgraph/utils";
import { BaseFilter } from "@bibgraph/utils";
import { MultiSelect, Select, TextInput } from "@mantine/core";

interface EntityFilterProperties {
  value: string | string[];
  operator: FilterOperator;
  config: FilterFieldConfig;
  onValueChange: (value: string | readonly string[]) => void;
  onOperatorChange: (operator: FilterOperator) => void;
  disabled?: boolean;
  compact?: boolean;
  fieldId: string;
}

export const EntityFilter = ({
  value,
  operator,
  config,
  onValueChange,
  onOperatorChange,
  disabled = false,
  compact = false,
  fieldId,
}: EntityFilterProperties) => {
  const selectOptions = (config.options ?? []).map((option) => ({
    value: String(option.value),
    label: option.label,
  }));

  const isMulti = config.type === "entityMulti";
  const hasOptions = selectOptions.length > 0;

  return (
    <BaseFilter
      value={value}
      operator={operator}
      config={config}
      onValueChange={onValueChange}
      onOperatorChange={onOperatorChange}
      disabled={disabled}
      compact={compact}
      fieldId={fieldId}
    >
      {(properties: BaseFilterRenderProps<string | string[]>) => (
        <>
          {hasOptions ? (
            isMulti ? (
              <MultiSelect
                id={properties.fieldId}
                data={selectOptions}
                value={Array.isArray(properties.value) ? properties.value : []}
                onChange={(value_) => { properties.onChange(value_); }}
                placeholder={config.placeholder ?? "Select entities"}
                disabled={properties.disabled}
                size={properties.compact ? "xs" : "sm"}
                flex={1}
                searchable
              />
            ) : (
              <Select
                id={properties.fieldId}
                data={selectOptions}
                value={typeof properties.value === "string" ? properties.value : ""}
                onChange={(value_) => { properties.onChange(value_ ?? ""); }}
                placeholder={config.placeholder ?? "Select entity"}
                disabled={properties.disabled}
                size={properties.compact ? "xs" : "sm"}
                flex={1}
                searchable
              />
            )
          ) : (
            <TextInput
              id={properties.fieldId}
              value={typeof properties.value === "string" ? properties.value : ""}
              onChange={(event) => { properties.onChange(event.currentTarget.value); }}
              placeholder={config.placeholder ?? "Enter entity ID or name"}
              disabled={properties.disabled}
              size={properties.compact ? "xs" : "sm"}
              flex={1}
            />
          )}
        </>
      )}
    </BaseFilter>
  );
};
