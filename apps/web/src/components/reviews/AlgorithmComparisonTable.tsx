/**
 * Algorithm comparison table: every stage's full roster side by side, each marked novel or baseline by icon and text (never colour alone), the value measured on the review's own pool with a bar, the plain-words evidence behind it, and the app's suggestion and the stage's current pick marked. Sortable by measured value or name, filterable by family, with the current row highlighted and read-only stages explained. Each stage arrives in its own state (measuring with what is running, failed, or measured rows), so one stage re-measuring never blanks another's table. Presentational: the stage states, the current picks and the override handler arrive as props.
 */

import {
	Alert,
	Badge,
	Button,
	Group,
	Loader,
	Progress,
	SegmentedControl,
	Stack,
	Table,
	Text,
	Title,
	Tooltip,
	UnstyledButton,
	VisuallyHidden,
} from "@mantine/core";
import { IconCheck, IconStar } from "@tabler/icons-react";
import { type ReactElement,useState } from "react";

import type { ComparisonRow } from "@/lib/algorithms/algorithm-comparison";
import { smallPoolSuspected } from "@/lib/algorithms/algorithm-comparison";
import type { AlgorithmFamily, AlgorithmStage } from "@/lib/algorithms/registry";

import { AlgorithmFamilyBadge } from "./AlgorithmFamilyBadge";

const STAGE_TITLES: Readonly<Record<AlgorithmStage, string>> = {
	exploration: "Exploration",
	"seed-selection": "Seed selection",
	ranking: "Ranking",
};

const STAGE_ORDER: readonly AlgorithmStage[] = ["exploration", "seed-selection", "ranking"];

/**
 * The measured-value header's direction clause, in the same words as each stage's evidence sentences: what a higher number means for that stage.
 */
const VALUE_HEADER: Readonly<Record<AlgorithmStage, string>> = {
	exploration: "Measured on this review (higher finds more of the hidden works)",
	"seed-selection": "Measured on this review (higher reaches more works one step away)",
	ranking: "Measured on this review (higher finds the hidden works sooner)",
};

/**
 * What one stage's panel holds: its measured rows, a measurement still running (with what algorithm and count), or why measuring failed.
 */
export type StagePanel =
	| { readonly kind: "ready"; readonly rows: readonly ComparisonRow[] }
	| { readonly kind: "measuring"; readonly progress: string | null }
	| { readonly kind: "error"; readonly message: string };

const READ_ONLY_NOTE = "You supplied your own starting works, so this is for comparison only.";

/**
 * The inline note for a stage whose every measured novel method scored zero while the baselines found works, so a newcomer does not read the zeros as the methods being worthless.
 */
const SMALL_POOL_NOTE =
	"Every novel method here measured zero while the baselines found works. The pool may be too small to tell these methods apart on it.";

/**
 * The one-line legend for the badges the tables mark rows with, in the words a first-time reader needs; colour only reinforces what each badge already says.
 */
const BADGE_LEGEND =
	"Badges: novel = this app's own research methods; baseline = an established method; suggested = the app's best-measured pick; in use = what this review runs now.";

/**
 * Below this width the table scrolls sideways instead of squeezing five columns.
 */
const TABLE_MIN_WIDTH = "42rem";

/**
 * Matches the Badge's default content height, so the icon sits on the text line without growing the badge.
 */
const BADGE_ICON_SIZE = 14;

/**
 * Keeps the evidence line to one row; the tooltip carries the full sentence.
 */
const EVIDENCE_MAX_WIDTH = "24rem";

/**
 * A fraction becomes a percentage by scaling to a hundred parts.
 */
const PERCENT_SCALE = 100;

/**
 * Rewrites the engine's measurement wording into reviewer language: "held-out seeds" are works we hid from the algorithm to test whether it finds them again.
 */
const plainEvidence = (evidence: string): string =>
	evidence
		.replace(
			/^recovered (\d+) of (\d+) held-out seeds within a budget of (\d+) works/,
			"Found $1 of $2 works we hid from it, exploring up to $3 works",
		)
		.replace(
			/^recovered (\d+) of (\d+) held-out seeds in the top (\d+) candidates/,
			"Found $1 of $2 works we hid from it in the first $3 results",
		)
		.replace(/^picks cover (\d+) of (\d+) pool works within one hop/, "Its picks reach $1 of $2 works one step away")
		.replace(/^no seeds to measure against; roster default$/, "No starting works to measure against, so the roster default is used")
		.replace(/^needs two or more seeds to measure; roster default$/, "Needs at least two starting works to measure, so the roster default is used")
		.replace(
			/^needs three or more seeds to measure; roster default$/,
			"Needs at least three starting works to measure, so the roster default is used",
		);

type SortKey = "value" | "name";

interface SortState {
	readonly key: SortKey;
	readonly direction: "asc" | "desc";
}

const INITIAL_SORT: SortState = { key: "value", direction: "desc" };

const toggleSort = (current: SortState, key: SortKey): SortState =>
	current.key === key
		? { key, direction: current.direction === "desc" ? "asc" : "desc" }
		: { key, direction: key === "value" ? "desc" : "asc" };

const sortRows = (rows: readonly ComparisonRow[], sort: SortState): readonly ComparisonRow[] => {
	const sorted = [...rows];
	if (sort.key === "name") {
		sorted.sort((a, b) => (sort.direction === "asc" ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label)));
		return sorted;
	}
	sorted.sort((a, b) => {
		const left = a.value ?? -Infinity;
		const right = b.value ?? -Infinity;
		return sort.direction === "desc" ? right - left : left - right;
	});
	return sorted;
};

/**
 * Seed-selection values are fractions of the pool; the other stages count recovered works.
 */
const formatValue = (stage: AlgorithmStage, value: number): string =>
	stage === "seed-selection" ? `${String(Math.round(value * PERCENT_SCALE))}%` : String(value);

const maxValueOf = (rows: readonly ComparisonRow[]): number =>
	Math.max(...rows.flatMap((row) => (row.value === null ? [] : [row.value])));

const SortHeader = ({
	label,
	sortKey,
	sort,
	onSortChange,
}: {
	readonly label: string;
	readonly sortKey: SortKey;
	readonly sort: SortState;
	readonly onSortChange: (sort: SortState) => void;
}): ReactElement => (
	<Table.Th
		aria-sort={sort.key === sortKey ? (sort.direction === "desc" ? "descending" : "ascending") : "none"}
	>
		<UnstyledButton
			onClick={() => {
				onSortChange(toggleSort(sort, sortKey));
			}}
		>
			{label}
		</UnstyledButton>
	</Table.Th>
);

/**
 * The section shell every stage state renders inside: same title, same landmark, whether the table stands, the measurement runs or it failed.
 */
const StageSection = ({
	stage,
	readOnly,
	children,
}: {
	readonly stage: AlgorithmStage;
	readonly readOnly: boolean;
	readonly children: ReactElement;
}): ReactElement => {
	const titleId = `algorithm-stage-${stage}`;
	return (
		<section aria-labelledby={titleId}>
			<Stack gap="xs">
				<Title id={titleId} order={4}>
					{STAGE_TITLES[stage]}
				</Title>
				{readOnly && (
					<Text size="sm" c="dimmed">
						{READ_ONLY_NOTE}
					</Text>
				)}
				{children}
			</Stack>
		</section>
	);
};

const StageTable = ({
	stage,
	rows,
	inUse,
	readOnly,
	onChoose,
	showTechnical,
}: {
	readonly stage: AlgorithmStage;
	readonly rows: readonly ComparisonRow[];
	readonly inUse: string | null;
	readonly readOnly: boolean;
	readonly onChoose: (stage: AlgorithmStage, algorithmId: string) => void;
	readonly showTechnical: boolean;
}): ReactElement => {
	const [sort, setSort] = useState<SortState>(INITIAL_SORT);
	const sorted = sortRows(rows, sort);
	const maxValue = maxValueOf(rows);
	const titleId = `algorithm-stage-${stage}`;
	return (
		<Table.ScrollContainer minWidth={TABLE_MIN_WIDTH}>
			<Table stickyHeader aria-labelledby={titleId}>
						<Table.Thead>
							<Table.Tr>
								<SortHeader label="Algorithm" sortKey="name" sort={sort} onSortChange={setSort} />
								<Table.Th>Family</Table.Th>
								<SortHeader label={VALUE_HEADER[stage]} sortKey="value" sort={sort} onSortChange={setSort} />
								<Table.Th>Evidence</Table.Th>
								<Table.Th>
									<VisuallyHidden>Status and action</VisuallyHidden>
								</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{sorted.map((row) => (
								<Table.Tr
									key={row.algorithmId}
									aria-current={row.algorithmId === inUse ? "true" : undefined}
									data-in-use={row.algorithmId === inUse ? "true" : undefined}
								>
									<Table.Th scope="row">
										{showTechnical ? (
											<Stack gap={2}>
												<Text fw={500} size="sm">
													{row.description}
												</Text>
												<Text size="xs" c="dimmed">
													{row.label}
												</Text>
											</Stack>
										) : (
											<Text fw={500} size="sm">
												{row.description}
											</Text>
										)}
									</Table.Th>
									<Table.Td>
										<AlgorithmFamilyBadge family={row.family} />
									</Table.Td>
									<Table.Td>
										{row.value === null ? (
											<Text size="sm" c="dimmed">
												not measured
											</Text>
										) : (
											<Stack gap={4}>
												<Text size="sm" component="span">
													{formatValue(stage, row.value)}
												</Text>
												{maxValue > 0 && (
													<Progress value={(row.value / maxValue) * PERCENT_SCALE} size="xs" aria-hidden />
												)}
											</Stack>
										)}
									</Table.Td>
									<Table.Td>
										<Tooltip label={plainEvidence(row.evidence)} withinPortal>
											<Text size="sm" lineClamp={1} style={{ maxWidth: EVIDENCE_MAX_WIDTH }}>
												{plainEvidence(row.evidence)}
											</Text>
										</Tooltip>
									</Table.Td>
									<Table.Td>
										<Group gap="xs" wrap="nowrap">
											{row.chosen && (
												<Badge variant="outline" leftSection={<IconStar size={BADGE_ICON_SIZE} aria-hidden />}>
													suggested
												</Badge>
											)}
											{row.algorithmId === inUse ? (
												<Badge variant="filled" leftSection={<IconCheck size={BADGE_ICON_SIZE} aria-hidden />}>
													in use
												</Badge>
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
				</Table.ScrollContainer>
	);
};

/**
 * A measurement still running for this stage: which algorithm is up and how far through, rather than one global spinner for the whole tab.
 */
const MeasuringPanel = ({ stage, progress }: { readonly stage: AlgorithmStage; readonly progress: string | null }): ReactElement => (
	<Group gap="xs">
		<Loader role="status" aria-label={`Measuring the ${stage} algorithms`} size="sm" />
		<Text c="dimmed" component="span">{`Measuring the ${stage} algorithms on this review's works...`}</Text>
		{progress !== null && (
			<Text c="dimmed" component="span">
				{progress}
			</Text>
		)}
	</Group>
);

export interface AlgorithmComparisonTableProps {
	/**
	 * Each stage's own state: measured rows, a running measurement, or a failure. The stages are independent, so a re-measuring stage never blanks a measured one.
	 */
	readonly stages: Readonly<Record<AlgorithmStage, StagePanel>>;
	/**
	 * The algorithm the review currently runs for each stage, which can differ from the suggested one after a reviewer override.
	 */
	readonly inUse: Readonly<Record<AlgorithmStage, string | null>>;
	readonly onChoose: (stage: AlgorithmStage, algorithmId: string) => void;
	/**
	 * Stages shown for comparison only, with no way to switch the algorithm.
	 */
	readonly readOnlyStages: readonly AlgorithmStage[];
	/**
	 * Whether research codenames are shown beside each plain description.
	 */
	readonly showTechnical: boolean;
}

export const AlgorithmComparisonTable = ({
	stages,
	inUse,
	onChoose,
	readOnlyStages,
	showTechnical,
}: AlgorithmComparisonTableProps): ReactElement => {
	const [familyFilter, setFamilyFilter] = useState<"all" | AlgorithmFamily>("all");
	return (
		<Stack gap="lg">
			<SegmentedControl
				value={familyFilter}
				onChange={setFamilyFilter}
				data={[
					{ value: "all", label: "All families" },
					{ value: "novel", label: "Novel" },
					{ value: "baseline", label: "Baseline" },
				]}
				aria-label="Filter algorithms by family"
			/>
			<Text size="xs" c="dimmed">
				{BADGE_LEGEND}
			</Text>
			{STAGE_ORDER.map((stage) => {
				const panel = stages[stage];
				const readOnly = readOnlyStages.includes(stage);
				return (
					<StageSection key={stage} stage={stage} readOnly={readOnly}>
						{panel.kind === "ready" ? (
							<>
								{/* Read from the full roster, not the family-filtered rows, so the note stands whichever family is in view. */}
								{smallPoolSuspected(panel.rows) && <Alert color="yellow">{SMALL_POOL_NOTE}</Alert>}
								<StageTable
									stage={stage}
									rows={
										familyFilter === "all"
											? panel.rows
											: panel.rows.filter((row) => row.family === familyFilter)
									}
									inUse={inUse[stage]}
									readOnly={readOnly}
									onChoose={onChoose}
									showTechnical={showTechnical}
								/>
							</>
						) : panel.kind === "measuring" ? (
							<MeasuringPanel stage={stage} progress={panel.progress} />
						) : (
							<Alert color="red">{panel.message}</Alert>
						)}
					</StageSection>
				);
			})}
		</Stack>
	);
};
