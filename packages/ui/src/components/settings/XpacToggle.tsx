/**
 * XpacToggle Component
 *
 * Toggle component for enabling/disabling extended research outputs (xpac) in OpenAlex API requests.
 * When enabled, includes 190M additional works (datasets, software, specimens) in search results.
 *
 * Related:
 * - T020: Create XpacToggle component
 * - 013-walden-research
 */

import { Stack, Switch, Text } from "@mantine/core";

export interface XpacToggleProps {
	/**
	 * Current toggle value
	 */
	value: boolean;

	/**
	 * Callback when toggle value changes
	 */
	onChange: (value: boolean) => void;

	/**
	 * Optional custom label text. Defaults to "Include extended research outputs (xpac)".
	 */
	label?: string;

	/**
	 * Whether to show the description text. Defaults to `true`.
	 */
	showDescription?: boolean;

	/**
	 * Test ID for E2E testing
	 */
	"data-testid"?: string;
}

/**
 * XpacToggle Component
 *
 * A toggle switch for controlling whether to include extended research outputs (xpac)
 * in OpenAlex API requests. The xpac dataset includes 190M additional works such as
 * datasets, software, and specimens.
 *
 * Features:
 * - Clear labeling and description
 * - Customizable label text
 * - Optional description display
 * - Accessible Switch component from Mantine
 * @example
 * ```tsx
 * // Basic usage
 * <XpacToggle
 *   value={includeXpac}
 *   onChange={setIncludeXpac}
 * />
 *
 * // Custom label
 * <XpacToggle
 *   value={includeXpac}
 *   onChange={setIncludeXpac}
 *   label="Enable extended dataset"
 * />
 *
 * // Without description
 * <XpacToggle
 *   value={includeXpac}
 *   onChange={setIncludeXpac}
 *   showDescription={false}
 * />
 * ```
 */
export const XpacToggle = ({
	value,
	onChange,
	label = "Include extended research outputs (xpac)",
	showDescription = true,
	"data-testid": dataTestId = "xpac-toggle",
}: XpacToggleProps) => <Stack gap="xs">
			<Switch
				checked={value}
				onChange={(event) => { onChange(event.currentTarget.checked); }}
				label={label}
				data-testid={dataTestId}
			/>
			{showDescription && (
				<Text size="sm" c="dimmed" data-testid={`${dataTestId}-description`}>
					Include 190M additional works (datasets, software, specimens)
				</Text>
			)}
		</Stack>;
