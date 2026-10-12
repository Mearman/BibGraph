/**
 * Algorithm comparison table: the full roster of every stage side by side, each marked novel or baseline, with the value measured on the review's own pool, the evidence behind it, and the app's suggestion flagged. The reviewer can override any stage's pick. Presentational only: the comparison and the override handler arrive as props.
 */

import { Badge, Button, Group, Stack, Table, Text, Title } from "@mantine/core";

import type { AlgorithmComparison, ComparisonRow } from "@/lib/algorithms/algorithm-comparison";
import type { AlgorithmStage } from "@/lib/algorithms/registry";

import { AlgorithmFamilyBadge } from "./AlgorithmFamilyBadge";

const STAGE_TITLES: Readonly<Record<AlgorithmStage, string>> = {
	exploration: "Exploration",
	"seed-selection": "Seed selection",
	ranking: "Ranking",
};

const STAGE_ORDER: readonly AlgorithmStage[] = ["exploration", "seed-selection", "ranking"];

export interface AlgorithmComparisonTableProps {
	readonly comparison: AlgorithmComparison;
	/**
	 * The algorithm the review currently runs for each stage, which can differ from the suggested one after a reviewer override.
	 */
	readonly inUse: Readonly<Record<AlgorithmStage, string | null>>;
	readonly onChoose: (stage: AlgorithmStage, algorithmId: string) => void;
	/**
	 * Stages shown for comparison only, with no way to switch the algorithm.
	 */
	readonly readOnlyStages: readonly AlgorithmStage[];
}

const StageTable = ({
	stage,
	rows,
	inUse,
	readOnly,
	onChoose,
}: {
	readonly stage: AlgorithmStage;
	readonly rows: readonly ComparisonRow[];
	readonly inUse: string | null;
	readonly readOnly: boolean;
	readonly onChoose: AlgorithmComparisonTableProps["onChoose"];
}) => (
	<section aria-label={STAGE_TITLES[stage]}>
		<Stack gap="xs">
			<Title order={4}>{STAGE_TITLES[stage]}</Title>
			<Table>
				<Table.Thead>
					<Table.Tr>
						<Table.Th>Algorithm</Table.Th>
						<Table.Th>Family</Table.Th>
						<Table.Th>Measured on this review</Table.Th>
						<Table.Th />
					</Table.Tr>
				</Table.Thead>
				<Table.Tbody>
					{rows.map((row) => (
						<Table.Tr key={row.algorithmId}>
							<Table.Td>
								<Text fw={500}>{row.label}</Text>
								<Text size="sm" c="dimmed">
									{row.description}
								</Text>
							</Table.Td>
							<Table.Td>
								<AlgorithmFamilyBadge family={row.family} />
							</Table.Td>
							<Table.Td>
								<Text size="sm">{row.evidence}</Text>
							</Table.Td>
							<Table.Td>
								<Group gap="xs" wrap="nowrap">
									{row.chosen && <Badge variant="outline">suggested</Badge>}
									{row.algorithmId === inUse ? (
										<Badge variant="filled">in use</Badge>
									) : readOnly ? null : (
										<Button
											size="xs"
											variant="subtle"
											aria-label={`Use ${row.label}`}
											onClick={() => {
												onChoose(stage, row.algorithmId);
											}}
										>
											Use this
										</Button>
									)}
								</Group>
							</Table.Td>
						</Table.Tr>
					))}
				</Table.Tbody>
			</Table>
		</Stack>
	</section>
);

export const AlgorithmComparisonTable = ({ comparison, inUse, onChoose, readOnlyStages }: AlgorithmComparisonTableProps) => (
	<Stack gap="lg">
		{STAGE_ORDER.map((stage) => (
			<StageTable
				key={stage}
				stage={stage}
				rows={comparison[stage]}
				inUse={inUse[stage]}
				readOnly={readOnlyStages.includes(stage)}
				onChoose={onChoose}
			/>
		))}
	</Stack>
);
