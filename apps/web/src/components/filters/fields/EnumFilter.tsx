import type {
  BaseFilterRenderProps,
  FilterFieldConfig,
  FilterOperator} from "@bibgraph/utils";
import { BaseFilter, createEnumOptions } from "@bibgraph/utils";
import { MultiSelect, Select } from "@mantine/core";


interface EnumFilterProperties {
  value: string | string[];
  operator: FilterOperator;
  config: FilterFieldConfig;
  onValueChange: (value: string | readonly string[]) => void;
  onOperatorChange: (operator: FilterOperator) => void;
  disabled?: boolean;
  compact?: boolean;
  fieldId: string;
}

export const EnumFilter = ({
  value,
  operator,
  config,
  onValueChange,
  onOperatorChange,
  disabled = false,
  compact = false,
  fieldId,
}: EnumFilterProperties) => {
  // Cast to utils type for compatibility with createEnumOptions
  const selectOptions = createEnumOptions(
    (config.options ?? []),
  ).map(option => ({
    ...option,
    value: String(option.value),
  }));
  const isMulti = config.type === "multiSelect";

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
          {isMulti ? (
            <MultiSelect
              id={properties.fieldId}
              data={selectOptions}
              value={Array.isArray(properties.value) ? properties.value : []}
              onChange={(value_) => { properties.onChange(value_); }}
              disabled={properties.disabled}
              size={properties.compact ? "xs" : "sm"}
              placeholder={config.placeholder}
              flex={1}
            />
          ) : (
            <Select
              id={properties.fieldId}
              data={selectOptions}
              value={Array.isArray(properties.value) ? properties.value[0] : properties.value || ""}
              onChange={(value_) => { properties.onChange(value_ ?? ""); }}
              disabled={properties.disabled}
              size={properties.compact ? "xs" : "sm"}
              placeholder={config.placeholder}
              flex={1}
              searchable
            />
          )}
        </>
      )}
    </BaseFilter>
  );
};