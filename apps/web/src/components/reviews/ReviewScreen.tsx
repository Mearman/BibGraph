/**
 * Review screen: one review's working surface. The header summarises the query, the titled starting works and the decisions so far; the tabs hold the two screening lists (works related to the starting works, and the search's own order), the decided works and the algorithm comparison with the app's suggested composition. Every decision confirms with an Undo notification, and a failed write surfaces as a notification instead of being dropped.
 */

import { Alert, Button, Group, Loader, Stack, Switch, Tabs, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { type ReactElement,useState } from "react";

import type { ReadyReviewSession } from "@/hooks/use-review-session";
import { useScreeningArrangement } from "@/hooks/use-screening-arrangement";
import type { AlgorithmStage } from "@/lib/algorithms/registry";
import type { ScreeningDecision } from "@/stores/review-store";

import { AlgorithmComparisonTable } from "./AlgorithmComparisonTable";
import { DecidedList } from "./DecidedList";
import type { ScreeningEmptyState } from "./ScreeningList";
import { ScreeningList } from "./ScreeningList";

const RELATED_TAB = "related";
const SEARCH_ORDER_TAB = "search-order";
const DECIDED_TAB = "decided";
const ALGORITHMS_TAB = "algorithms";

/**
 * The related-seeds list's name, also used in cross-list notes.
 */
const RELATED_TAB_TITLE = "Related to my seeds";

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
 * What each stage's switch changes for the reviewer, said in the notification.
 */
const STAGE_EFFECT: Readonly<Record<AlgorithmStage, string>> = {
	exploration: "Works related to your seeds will be re-ranked.",
	"seed-selection": "A new set of starting works will be picked.",
	ranking: "Works related to your seeds will be re-ranked.",
};

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : "unknown error");

const AlgorithmsTab = ({
	session,
	onChoose,
}: {
	readonly session: ReadyReviewSession;
	readonly onChoose: (stage: AlgorithmStage, algorithmId: string) => void;
}): ReactElement => {
	const [showTechnical, setShowTechnical] = useState(false);
	if (session.comparisonError !== null) {
		return <Alert color="red">{session.comparisonError}</Alert>;
	}
	if (session.comparison === null) {
		return (
			<Stack gap="sm">
				<Group gap="xs">
					<Loader role="status" aria-label="Measuring algorithms" size="sm" />
					<Text c="dimmed">Measuring every algorithm on this review's works...</Text>
				</Group>
				<Alert color="blue" variant="light">
					The lists may be re-ranked when the measurement finishes.
				</Alert>
			</Stack>
		);
	}
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
			<AlgorithmComparisonTable
				comparison={session.comparison}
				inUse={session.inUse}
				readOnlyStages={session.seedSelectionEditable ? [] : ["seed-selection"]}
				onChoose={onChoose}
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
}

export const ReviewScreen = ({ session }: ReviewScreenProps): ReactElement => {
	const { review, view } = session;
	const [tab, setTab] = useState(RELATED_TAB);
	const related = useScreeningArrangement(session.semanticRows);
	const searchOrder = useScreeningArrangement(session.standardRows);

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

	const runChoice = async (stage: AlgorithmStage, algorithmId: string): Promise<void> => {
		const label = session.comparison?.[stage].find((row) => row.algorithmId === algorithmId)?.label ?? algorithmId;
		try {
			await session.chooseAlgorithm(stage, algorithmId);
			notifications.show({ message: `${STAGE_TITLES[stage]} now runs ${label}. ${STAGE_EFFECT[stage]}` });
		} catch (error) {
			notifications.show({
				color: "red",
				message: `Could not switch ${STAGE_TITLES[stage].toLowerCase()}: ${errorMessage(error)}`,
			});
		}
	};

	const decideWithFeedback = (workId: string, decision: ScreeningDecision): void => {
		void runDecision(workId, decision);
	};

	const chooseWithFeedback = (stage: AlgorithmStage, algorithmId: string): void => {
		void runChoice(stage, algorithmId);
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
				: { kind: "nothing-found", message: "No related works found from these seeds. Add seeds or widen the query." };
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
				<Text size="sm">{`${String(view.seeds.length)} seeds, ${String(view.includedCount)} included, ${String(view.excludedCount)} excluded`}</Text>
			</Stack>
			<Stack gap={4}>
				<Text size="sm" fw={500}>
					Starting works
				</Text>
				{session.seedRefs.map((seed) => (
					<Text key={seed.id} size="sm" c="dimmed" fs={seed.known ? undefined : "italic"}>
						{seed.known ? seed.title : `${seed.title} (no title from OpenAlex)`}
					</Text>
				))}
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
