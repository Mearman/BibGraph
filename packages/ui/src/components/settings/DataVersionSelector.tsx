/**
 * DataVersionSelector Component
 *
 * Select component for choosing OpenAlex data version (auto/v1/v2).
 * Allows users to temporarily access legacy v1 data during the November 2025 transition period.
 *
 * Related:
 * - T034: Create DataVersionSelector component
 * - 013-walden-research
 */

import { Select, Stack, Text } from "@mantine/core";
import React from "react";

export interface DataVersionSelectorProps {
	/**
	 * Current selected version
	 * - undefined: Auto (v2 default)
	 * - '1': Version 1 (legacy)
	 * - '2': Version 2 (current)
	 */
	value: "1" | "2" | undefined;

	/**
	 * Callback when version selection changes
	 */
	onChange: (value: "1" | "2" | undefined) => void;

	/**
	 * Optional custom label text. Defaults to "OpenAlex Data Version".
	 */
	label?: string;

	/**
	 * Whether to show the description text about version availability. Defaults to `true`.
	 */
	showDescription?: boolean;

	/**
	 * Test ID for E2E testing
	 */
	"data-testid"?: string;
}

/**
 * DataVersionSelector Component
 *
 * A select dropdown for choosing which OpenAlex API data version to use.
 * Includes options for automatic selection (v2 default), legacy v1, and current v2.
 *
 * Features:
 * - Three data version options (Auto/v1/v2)
 * - Clear labeling and optional description
 * - Customizable label text
 * - Accessible Select component from Mantine
 * - Proper handling of undefined/null values
 * @example
 * ```tsx
 * // Basic usage
 * <DataVersionSelector
 *   value={dataVersion}
 *   onChange={setDataVersion}
 * />
 *
 * // Custom label, without description
 * <DataVersionSelector
 *   value={dataVersion}
 *   onChange={setDataVersion}
 *   label="API Data Version"
 *   showDescription={false}
 * />
 * ```
 */
export const DataVersionSelector: React.FC<DataVersionSelectorProps> = ({
	value,
	onChange,
	label = "OpenAlex Data Version",
	showDescription = true,
	"data-testid": dataTestId = "data-version-selector",
}) => {
	const handleChange = (selectedValue: string | null) => {
		if (selectedValue === "1" || selectedValue === "2") {
			onChange(selectedValue);
		} else {
			// selectedValue is "undefined" or null - map to undefined value Note: undefined is a meaningful value here, not an optional parameter
			onChange(undefined);
		}
	};

	return (
		<Stack gap="xs">
			<Select
				label={label}
				value={value ?? "undefined"}
				onChange={handleChange}
				data={[
					{ value: "undefined", label: "Auto (v2 default)" },
					{ value: "1", label: "Version 1 (legacy)" },
					{ value: "2", label: "Version 2 (current)" },
				]}
				data-testid={dataTestId}
			/>
			{showDescription && (
				<Text
					size="xs"
					c="dimmed"
					data-testid={`${dataTestId}-description`}
				>
					Version 1 is temporarily available for comparison during the November
					2025 transition period. Version 2 is the current default with improved
					metadata quality.
				</Text>
			)}
		</Stack>
	);
};
