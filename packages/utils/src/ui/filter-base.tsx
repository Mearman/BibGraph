import { logger } from "../logger.js"

// Filter operator types - aligned with apps/web filter system
export type FilterOperator =
	| "="
	| "!="
	| ">"
	| ">="
	| "<"
	| "<="
	| "contains"
	| "search"
	| "between";

// Options for select-type fields
export interface FilterFieldOption {
	value: string | number | boolean;
	label: string;
	description?: string;
	group?: string;
}

// Filter field configuration for UI rendering
export interface FilterFieldConfig {
	field: string;
	label: string;
	type:
		| "text"
		| "search"
		| "number"
		| "date"
		| "dateRange"
		| "boolean"
		| "select"
		| "multiSelect"
		| "entity"
		| "entityMulti";
	operators: FilterOperator[];
	required?: boolean;
	options?: FilterFieldOption[];
	placeholder?: string;
	description?: string;
	helpText?: string;
	validation?: {
		required?: boolean;
		min?: number;
		max?: number;
		pattern?: RegExp;
		custom?: (value: unknown) => string | null;
	};
}

export interface BaseFilterRenderProps<T = unknown> {
	value: T;
	onChange: (value: T) => void;
	disabled: boolean;
	compact: boolean;
	fieldId: string;
}

export interface BaseFilterProps<T = unknown> {
	value: T;
	operator: FilterOperator;
	config: FilterFieldConfig;
	onValueChange: (value: T) => void;
	onOperatorChange: (operator: FilterOperator) => void;
	disabled?: boolean;
	compact?: boolean;
	fieldId: string;
	children?: React.ReactNode | ((properties: BaseFilterRenderProps<T>) => React.ReactNode);
}

export const FILTER_WIDTHS = {
	small: 120,
	medium: 180,
	large: 240,
	xlarge: 320,
} as const;

export const BaseFilter = <T,>({
	value,
	onValueChange,
	disabled = false,
	compact = false,
	fieldId,
	children,
}: BaseFilterProps<T>) => {
	// This is a base component that provides common filter functionality
	// The actual implementation would render the filter UI
	const renderProperties: BaseFilterRenderProps<T> = {
		value,
		onChange: onValueChange,
		disabled,
		compact,
		fieldId,
	};

	const content = typeof children === 'function' ? children(renderProperties) : children;

	return (
		<div className={`base-filter ${compact ? "compact" : ""}`} data-field-id={fieldId}>
			{content}
		</div>
	);
};

export const createFilter = <T,>(config: FilterFieldConfig, initialValue: T, initialOperator: FilterOperator = "="): {
	value: T;
	operator: FilterOperator;
	config: FilterFieldConfig;
	setValue: (value: T) => void;
	setOperator: (operator: FilterOperator) => void;
} => ({
		value: initialValue,
		operator: initialOperator,
		config,
		setValue: (value: T) => {
			// This would be implemented with actual state management
			logger.debug("ui", "Setting filter value", { value });
		},
		setOperator: (operator: FilterOperator) => {
			// This would be implemented with actual state management
			logger.debug("ui", "Setting filter operator", { operator });
		},
	});

export const createEnumOptions = (options: readonly FilterFieldOption[]): FilterFieldOption[] => options.map(option => ({
		value: option.value,
		label: option.label,
		description: option.description,
		group: option.group,
	}));