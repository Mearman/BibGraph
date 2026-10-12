/**
 * Screening list: the works awaiting a decision, each with its title, year and the evidence for its position, and include and exclude controls. Used by both screening paths (the semantic ranking and the standard query order); only the evidence text differs. Presentational only.
 */

import { Button, Group, Paper, Stack, Text } from "@mantine/core";

import type { ScreeningDecision } from "@/stores/review-store";

export interface ScreeningRow {
	readonly workId: string;
	readonly title: string;
	readonly year: number | null;
	/**
	 * One line of evidence for the row's position, for example the association score and bridging work, or the query rank.
	 */
	readonly detail: string;
}

export interface ScreeningListProps {
	readonly rows: readonly ScreeningRow[];
	readonly onDecide: (workId: string, decision: ScreeningDecision) => void;
	readonly emptyMessage: string;
}

export const ScreeningList = ({ rows, onDecide, emptyMessage }: ScreeningListProps) => {
	if (rows.length === 0) {
		return <Text c="dimmed">{emptyMessage}</Text>;
	}
	return (
		<Stack gap="sm">
			{rows.map((row) => (
				<Paper key={row.workId} withBorder p="sm">
					<Group justify="space-between" align="flex-start" wrap="nowrap">
						<Stack gap={2}>
							<Text fw={500}>{row.title}</Text>
							{row.year !== null && (
								<Text size="sm" c="dimmed">
									{String(row.year)}
								</Text>
							)}
							<Text size="sm">{row.detail}</Text>
						</Stack>
						<Group gap="xs" wrap="nowrap">
							<Button
								size="xs"
								aria-label={`Include ${row.title}`}
								onClick={() => {
									onDecide(row.workId, "include");
								}}
							>
								Include
							</Button>
							<Button
								size="xs"
								variant="default"
								aria-label={`Exclude ${row.title}`}
								onClick={() => {
									onDecide(row.workId, "exclude");
								}}
							>
								Exclude
							</Button>
						</Group>
					</Group>
				</Paper>
			))}
		</Stack>
	);
};
