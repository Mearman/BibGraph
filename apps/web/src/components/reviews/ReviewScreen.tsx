/**
 * Review screen: one review's working surface. The header summarises the query, the titled starting works and the decisions so far; the tabs hold the two screening lists (works related to the starting works, and the search's own order), the decided works and the algorithm comparison with the app's suggested composition. Every decision confirms with an Undo notification, and a failed write surfaces as a notification instead of being dropped.
 */

import { Alert, Button, Group, Stack, Switch, Tabs, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { type ReactElement,useState } from "react";

import type { ReadyReviewSession } from "@/hooks/use-review-session";
import { type ScreeningPaging, useScreeningArrangement } from "@/hooks/use-screening-arrangement";
import type { AlgorithmStage } from "@/lib/algorithms/registry";
import { startingWorksCount, startingWorksLabel } from "@/lib/reviews/review-summary";
import type { ScreeningDecision } from "@/stores/review-store";

import { AddWorkById } from "./AddWorkById";
import { AlgorithmComparisonTable, type StagePanel } from "./AlgorithmComparisonTable";
import { DecidedList } from "./DecidedList";
import type { ScreeningEmptyState } from "./ScreeningList";
import { ScreeningList } from "./ScreeningList";

const RELATED_TAB = "related";
const SEARCH_ORDER_TAB = "search-order";
const DECIDED_TAB = "decided";
const ALGORITHMS_TAB = "algorithms";

/**
 * The related-starting-works list's name, also used in cross-list notes.
 */
const RELATED_TAB_TITLE = "Related to my starting works";

/**
 * How long the undo notification stays, leaving time to read it and click Undo.
 */
const UNDO_NOTIFICATION_MS = 8000;

const STAGE_TITLES: Readonly<Record<AlgorithmStage, string>> = {
	exploration: "Exploration",
	"seed-selection": "Seed selection",
	ranking: "Ranking",
};

/**
 * The add-a-work input's accessible name, spelled for the starting-works section it sits in.
 */
const ADD_WORK_INPUT_LABEL = "Add a starting work by OpenAlex id or link";

/**
 * What an untitled starting work shows while its title is still being fetched: a loading state, not a claim that OpenAlex has no title for it.
 */
const SEED_TITLE_PENDING = "Loading...";

/**
 * What each stage's switch changes for the reviewer, said in the notification.
 */
const STAGE_EFFECT: Readonly<Record<AlgorithmStage, string>> = {
	exploration: "Works related to your starting works will be re-ranked.",
	"seed-selection": "A new set of starting works will be picked; works you added yourself stay.",
	ranking: "Works related to your starting works will be re-ranked.",
};

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : "unknown error");

const STAGES: readonly AlgorithmStage[] = ["exploration", "seed-selection", "ranking"];

/**
 * Each stage's panel from the session's per-stage state: measured rows stand, a measuring stage shows what is running, a failed one says why. Stages measure independently, so switching one stage's algorithm never blanks another's table.
 */
const stagePanels = (session: ReadyReviewSession): Readonly<Record<AlgorithmStage, StagePanel>> => {
	const panels: Record<AlgorithmStage, StagePanel> = {
		exploration: { kind: "ready", rows: [] },
		"seed-selection": { kind: "ready", rows: [] },
		ranking: { kind: "ready", rows: [] },
	};
	for (const stage of STAGES) {
		const error = session.comparisonError[stage];
		const rows = session.comparison[stage];
		panels[stage] =
			error !== null
				? { kind: "error", message: error }
				: rows === null
					? { kind: "measuring", progress: session.comparisonProgress[stage] }
					: { kind: "ready", rows };
	}
	return panels;
};

const AlgorithmsTab = ({
	session,
	onChoose,
}: {
	readonly session: ReadyReviewSession;
	/**
	 * Receives the tab's language mode, so the switch notification names the codename only when the reviewer asked for it.
	 */
	readonly onChoose: (stage: AlgorithmStage, algorithmId: string, technical: boolean) => void;
}): ReactElement => {
	const [showTechnical, setShowTechnical] = useState(false);
	const measuring = STAGES.some((stage) => session.comparison[stage] === null && session.comparisonError[stage] === null);
	return (
		<Stack gap="sm">
			<Switch
				label="Technical details"
				description="Show algorithm codenames"
				checked={showTechnical}
				onChange={(event) => {
					setShowTechnical(event.currentTarget.checked);
				}}
			/>
			{measuring && (
				<Alert color="blue" variant="light">
					The lists may be re-ranked when the measurement finishes.
				</Alert>
			)}
			<AlgorithmComparisonTable
				stages={stagePanels(session)}
				inUse={session.inUse}
				readOnlyStages={session.seedSelectionEditable ? [] : ["seed-selection"]}
				onChoose={(stage, algorithmId) => {
					onChoose(stage, algorithmId, showTechnical);
				}}
				showTechnical={showTechnical}
			/>
		</Stack>
	);
};

const TabLabel = ({ title, description }: { readonly title: string; readonly description: string }): ReactElement => (
	<Stack gap={0}>
		<Text fw={500}>{title}</Text>
		<Text size="xs" c="dimmed">
			{description}
		</Text>
	</Stack>
);

export interface ReviewScreenProps {
	readonly session: ReadyReviewSession;
	/**
	 * Page size of each screening list; omitted, the shared defaults apply.
	 */
	readonly paging?: ScreeningPaging;
}

export const ReviewScreen = ({ session, paging }: ReviewScreenProps): ReactElement => {
	const { review, view } = session;
	const [tab, setTab] = useState(RELATED_TAB);
	const related = useScreeningArrangement(session.semanticRows, paging);
	const searchOrder = useScreeningArrangement(session.standardRows, paging);

	const titleByWorkId = new Map(
		[...session.semanticRows, ...session.standardRows, ...session.decidedRows].map((row) => [row.workId, row.title]),
	);
	const titleOf = (workId: string): string => titleByWorkId.get(workId) ?? workId;

	const runUndo = async (workId: string): Promise<void> => {
		try {
			await session.undo(workId);
		} catch (error) {
			notifications.show({
				color: "red",
				message: `Could not undo that decision: ${errorMessage(error)}`,
			});
		}
	};

	const runDecision = async (workId: string, decision: ScreeningDecision): Promise<void> => {
		const title = titleOf(workId);
		try {
			await session.decide(workId, decision);
			notifications.show({
				message: (
					<Group gap="xs" wrap="nowrap">
						<Text>{`${decision === "include" ? "Included" : "Excluded"} "${title}".`}</Text>
						<Button
							size="xs"
							variant="light"
							onClick={() => {
								void runUndo(workId);
							}}
						>
							Undo
						</Button>
					</Group>
				),
				autoClose: UNDO_NOTIFICATION_MS,
			});
		} catch (error) {
			notifications.show({
				color: "red",
				message: `That decision was not saved: ${errorMessage(error)}`,
			});
		}
	};

	const runChoice = async (stage: AlgorithmStage, algorithmId: string, technical: boolean): Promise<void> => {
		const row = session.comparison[stage]?.find((candidate) => candidate.algorithmId === algorithmId);
		const plainMessage = `${STAGE_TITLES[stage]} algorithm switched. ${STAGE_EFFECT[stage]}`;
		const technicalMessage =
			row === undefined
				? plainMessage
				: `${STAGE_TITLES[stage]} now runs ${row.label}. ${STAGE_EFFECT[stage]}`;
		try {
			await session.chooseAlgorithm(stage, algorithmId);
			notifications.show({ message: technical ? technicalMessage : plainMessage });
		} catch (error) {
			notifications.show({
				color: "red",
				message: `Could not switch ${STAGE_TITLES[stage].toLowerCase()}: ${errorMessage(error)}`,
			});
		}
	};

	const [addingWork, setAddingWork] = useState(false);
	const runAddSeed = async (token: string): Promise<void> => {
		setAddingWork(true);
		try {
			await session.addSeed(token);
			notifications.show({ message: "Added to your starting works. The lists will be re-ranked." });
		} catch (error) {
			notifications.show({
				color: "red",
				message: `That work was not added: ${errorMessage(error)}`,
			});
		} finally {
			setAddingWork(false);
		}
	};

	const decideWithFeedback = (workId: string, decision: ScreeningDecision): void => {
		void runDecision(workId, decision);
	};

	const chooseWithFeedback = (stage: AlgorithmStage, algorithmId: string, technical: boolean): void => {
		void runChoice(stage, algorithmId, technical);
	};

	// Both lists empty with decisions present means the reviewer has been through everything, which deserves its own message; otherwise each list explains its own emptiness. A non-empty list with no visible rows means the title filter matched nothing.
	const allDecided =
		session.semanticRows.length === 0 &&
		session.standardRows.length === 0 &&
		view.includedCount + view.excludedCount > 0;
	const openDecided = (): ScreeningEmptyState => ({
		kind: "all-decided",
		onOpenDecided: () => {
			setTab(DECIDED_TAB);
		},
	});
	const semanticEmpty: ScreeningEmptyState =
		related.total > 0
			? { kind: "filtered" }
			: allDecided
				? openDecided()
				: { kind: "nothing-found", message: "No related works found from these starting works. Add one you know is relevant, or widen the query." };
	const standardEmpty: ScreeningEmptyState =
		searchOrder.total > 0
			? { kind: "filtered" }
			: allDecided
				? openDecided()
				: { kind: "nothing-found", message: "Nothing left from your search." };

	return (
		<Stack gap="md">
			<Stack gap={2}>
				<Title order={2}>{review.name}</Title>
				{review.query !== "" && (
					<Text size="sm" c="dimmed">
						{review.query}
					</Text>
				)}
				<Text size="sm">{`${startingWorksLabel(startingWorksCount(review))}, ${String(view.includedCount)} included, ${String(view.excludedCount)} excluded`}</Text>
			</Stack>
			<Stack gap={4}>
				<Text size="sm" fw={500}>
					Starting works
				</Text>
				{session.seedRefs.map((seed) => (
					<Text key={seed.id} size="sm" c="dimmed" fs={seed.known ? undefined : "italic"}>
						{seed.known
							? seed.title
							: session.labelsPending
								? SEED_TITLE_PENDING
								: `${seed.title} (no title from OpenAlex)`}
					</Text>
				))}
				{/* Stays on the page for the whole review, so a known-relevant work can be folded in at any point, not only before screening starts. */}
				<AddWorkById
					inputLabel={ADD_WORK_INPUT_LABEL}
					busy={addingWork}
					onAdd={(token) => {
						void runAddSeed(token);
					}}
				/>
			</Stack>
			{session.labelsError !== null && (
				<Alert color="red">
					<Group justify="space-between" wrap="wrap">
						<Text>{`Could not load work titles: ${session.labelsError}`}</Text>
						<Button size="xs" variant="white" onClick={session.retryLabels}>
							Try again
						</Button>
					</Group>
				</Alert>
			)}
			<Tabs value={tab} onChange={(value) => { if (value !== null) setTab(value); }}>
				<Tabs.List>
					<Tabs.Tab value={RELATED_TAB}>
						<TabLabel title={RELATED_TAB_TITLE} description="Works connected to your starting works, strongest first" />
					</Tabs.Tab>
					<Tabs.Tab value={SEARCH_ORDER_TAB}>
						<TabLabel title="In search order" description="The works your search found, in the order it returned them" />
					</Tabs.Tab>
					<Tabs.Tab value={DECIDED_TAB}>
						<TabLabel title="Decided" description="Works you have included or excluded" />
					</Tabs.Tab>
					<Tabs.Tab value={ALGORITHMS_TAB}>
						<TabLabel title="Algorithms" description="How the lists are built, measured on this review" />
					</Tabs.Tab>
				</Tabs.List>
				<Tabs.Panel value={RELATED_TAB} pt="md">
					<ScreeningList
						rows={related.visibleRows}
						total={related.total}
						showing={related.showing}
						hasMore={related.hasMore}
						onLoadMore={related.loadMore}
						sort={related.sort}
						onSortChange={related.setSort}
						filter={related.filter}
						onFilterChange={related.setFilter}
						onDecide={decideWithFeedback}
						otherTabName={RELATED_TAB_TITLE}
						emptyState={semanticEmpty}
						titlesPending={session.labelsPending}
					/>
				</Tabs.Panel>
				<Tabs.Panel value={SEARCH_ORDER_TAB} pt="md">
					<ScreeningList
						rows={searchOrder.visibleRows}
						total={searchOrder.total}
						showing={searchOrder.showing}
						hasMore={searchOrder.hasMore}
						onLoadMore={searchOrder.loadMore}
						sort={searchOrder.sort}
						onSortChange={searchOrder.setSort}
						filter={searchOrder.filter}
						onFilterChange={searchOrder.setFilter}
						onDecide={decideWithFeedback}
						otherTabName={RELATED_TAB_TITLE}
						emptyState={standardEmpty}
						titlesPending={session.labelsPending}
					/>
				</Tabs.Panel>
				<Tabs.Panel value={DECIDED_TAB} pt="md">
					<DecidedList rows={session.decidedRows} onDecide={decideWithFeedback} emptyMessage="Nothing decided yet." />
				</Tabs.Panel>
				<Tabs.Panel value={ALGORITHMS_TAB} pt="md">
					<AlgorithmsTab session={session} onChoose={chooseWithFeedback} />
				</Tabs.Panel>
			</Tabs>
		</Stack>
	);
};
