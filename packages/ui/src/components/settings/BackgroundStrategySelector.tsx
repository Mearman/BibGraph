/**
 * BackgroundStrategySelector Component
 *
 * Select component for choosing background processing strategy for auto-population tasks.
 * Strategies control how label resolution and relationship discovery are scheduled.
 *
 * Strategies:
 * - idle: Uses requestIdleCallback to run during browser idle time (default, recommended)
 * - scheduler: Uses Scheduler API for priority-based scheduling (Chrome/Edge 94+)
 * - worker: Uses Web Workers for parallel execution (limited to fetch operations)
 * - sync: Synchronous execution (blocks main thread, not recommended)
 */

import { Select, Stack, Text } from "@mantine/core";

type BackgroundStrategy = 'idle' | 'scheduler' | 'worker' | 'sync';

export interface BackgroundStrategySelectorProps {
	/**
	 * Currently selected strategy
	 */
	value: BackgroundStrategy;

	/**
	 * Callback when strategy changes
	 */
	onChange: (value: BackgroundStrategy) => void;

	/**
	 * Optional custom label text. Defaults to "Background Processing Strategy".
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

interface StrategyOption {
	value: BackgroundStrategy;
	label: string;
	description: string;
}

const STRATEGY_OPTIONS: StrategyOption[] = [
	{
		value: 'idle',
		label: 'Idle Callback (Recommended)',
		description: 'Uses browser idle time for non-blocking execution',
	},
	{
		value: 'scheduler',
		label: 'Scheduler API',
		description: 'Priority-based scheduling (Chrome/Edge 94+)',
	},
	{
		value: 'worker',
		label: 'Web Worker',
		description: 'Parallel execution in separate thread',
	},
	{
		value: 'sync',
		label: 'Synchronous',
		description: 'Immediate execution (may block UI)',
	},
];

/**
 * BackgroundStrategySelector Component
 *
 * A select dropdown for choosing the background processing strategy used for
 * auto-population tasks like label resolution and relationship discovery.
 * @example
 * ```tsx
 * // Basic usage
 * <BackgroundStrategySelector
 *   value={strategy}
 *   onChange={setStrategy}
 * />
 *
 * // Without description
 * <BackgroundStrategySelector
 *   value={strategy}
 *   onChange={setStrategy}
 *   showDescription={false}
 * />
 * ```
 */
const isBackgroundStrategy = (value: string): value is BackgroundStrategy => ['idle', 'scheduler', 'worker', 'sync'].includes(value);

export const BackgroundStrategySelector = ({
	value,
	onChange,
	label = "Background Processing Strategy",
	showDescription = true,
	"data-testid": dataTestId = "background-strategy-selector",
}: BackgroundStrategySelectorProps) => {
	const handleChange = (newValue: string | null) => {
		if (newValue !== null && isBackgroundStrategy(newValue)) {
			onChange(newValue);
		}
	};

	const selectedOption = STRATEGY_OPTIONS.find(opt => opt.value === value);

	return (
		<Stack gap="xs">
			<Select
				label={label}
				value={value}
				onChange={handleChange}
				data={STRATEGY_OPTIONS.map(opt => ({
					value: opt.value,
					label: opt.label,
				}))}
				data-testid={dataTestId}
			/>
			{showDescription && selectedOption && (
				<Text size="sm" c="dimmed" data-testid={`${dataTestId}-description`}>
					{selectedOption.description}
				</Text>
			)}
		</Stack>
	);
};
