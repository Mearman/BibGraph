/**
 * Review screen: one review's working surface. The header summarises the query, seeds and decisions so far; the tabs hold the two screening paths (the association ranking from the seeds, and the Boolean query's own order) and the algorithm comparison with the app's suggested composition. Presentational: the ready session from the session hook arrives as a prop.
 */

import { Alert, Stack, Tabs, Text, Title } from "@mantine/core";

import type { ReadyReviewSession } from "@/hooks/use-review-session";

import { AlgorithmComparisonTable } from "./AlgorithmComparisonTable";
import { ScreeningList } from "./ScreeningList";

export interface ReviewScreenProps {
	readonly session: ReadyReviewSession;
}

const AlgorithmsTab = ({ session }: ReviewScreenProps) => {
	if (session.comparisonError !== null) {
		return <Alert color="red">{session.comparisonError}</Alert>;
	}
	if (session.comparison === null) {
		return <Text c="dimmed">Measuring every algorithm on this review's works...</Text>;
	}
	return (
		<AlgorithmComparisonTable
			comparison={session.comparison}
			inUse={session.inUse}
			readOnlyStages={session.seedSelectionEditable ? [] : ["seed-selection"]}
			onChoose={(stage, algorithmId) => {
				void session.chooseAlgorithm(stage, algorithmId);
			}}
		/>
	);
};

export const ReviewScreen = ({ session }: ReviewScreenProps) => {
	const { review, view } = session;
	const onDecide = (workId: string, decision: "include" | "exclude") => {
		void session.decide(workId, decision);
	};
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
			<Tabs defaultValue="semantic">
				<Tabs.List>
					<Tabs.Tab value="semantic">Semantic screening</Tabs.Tab>
					<Tabs.Tab value="standard">Standard screening</Tabs.Tab>
					<Tabs.Tab value="algorithms">Algorithms</Tabs.Tab>
				</Tabs.List>
				<Tabs.Panel value="semantic" pt="md">
					<ScreeningList
						rows={session.semanticRows}
						onDecide={onDecide}
						emptyMessage="No related works found from these seeds. Add seeds or widen the query."
					/>
				</Tabs.Panel>
				<Tabs.Panel value="standard" pt="md">
					<ScreeningList rows={session.standardRows} onDecide={onDecide} emptyMessage="Nothing left to screen." />
				</Tabs.Panel>
				<Tabs.Panel value="algorithms" pt="md">
					<AlgorithmsTab session={session} />
				</Tabs.Panel>
			</Tabs>
		</Stack>
	);
};
