/**
 * Decided list: every work the reviewer has included or excluded, with its decision marked by icon and text (never colour alone) and a Change control that offers the other decision. Presentational only.
 */

import { Badge, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { type ReactElement,useState } from "react";

import type { DecidedRow } from "@/lib/reviews/screening-view";
import type { ScreeningDecision } from "@/stores/review-store";

/**
 * Matches the Badge's default content height, so the icon sits on the text line without growing the badge.
 */
const BADGE_ICON_SIZE = 14;

/**
 * The title column keeps at least this much width before the controls wrap beneath it.
 */
const TITLE_FLEX_BASIS = "18rem";

const DECISION_MARKS: Readonly<
	Record<ScreeningDecision, { readonly color: string; readonly variant: "filled" | "outline"; readonly label: string }>
> = {
	include: { color: "green", variant: "filled", label: "Included" },
	exclude: { color: "gray", variant: "outline", label: "Excluded" },
};

export interface DecidedListProps {
	readonly rows: readonly DecidedRow[];
	readonly onDecide: (workId: string, decision: ScreeningDecision) => void;
	readonly emptyMessage: string;
}

export const DecidedList = ({ rows, onDecide, emptyMessage }: DecidedListProps): ReactElement => {
	const [editingId, setEditingId] = useState<string | null>(null);
	if (rows.length === 0) {
		return <Text c="dimmed">{emptyMessage}</Text>;
	}
	return (
		<Stack component="ul" gap="sm" m={0} p={0} style={{ listStyle: "none" }}>
			{rows.map((row) => {
				const mark = DECISION_MARKS[row.decision];
				const editing = editingId === row.workId;
				return (
					<Paper key={row.workId} component="li" withBorder p="sm">
						<Group justify="space-between" align="flex-start" wrap="wrap">
							<Stack gap={2} style={{ flex: `1 1 ${TITLE_FLEX_BASIS}`, minWidth: 0 }}>
								<Text fw={500} lineClamp={2} title={row.title}>
									{row.title}
									{!row.titleKnown && (
										<Text component="span" size="xs" c="dimmed" fs="italic">
											{" (no title from OpenAlex)"}
										</Text>
									)}
								</Text>
								{row.year !== null && (
									<Text size="sm" c="dimmed">
										{String(row.year)}
									</Text>
								)}
							</Stack>
							<Group gap="xs" wrap="wrap">
								<Badge
									color={mark.color}
									variant={mark.variant}
									leftSection={
										row.decision === "include" ? (
											<IconCheck size={BADGE_ICON_SIZE} aria-hidden />
										) : (
											<IconX size={BADGE_ICON_SIZE} aria-hidden />
										)
									}
								>
									{mark.label}
								</Badge>
								{editing ? (
									<Group gap="xs" wrap="nowrap">
										<Button
											size="xs"
											disabled={row.decision === "include"}
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
											disabled={row.decision === "exclude"}
											aria-label={`Exclude ${row.title}`}
											onClick={() => {
												onDecide(row.workId, "exclude");
											}}
										>
											Exclude
										</Button>
									</Group>
								) : (
									<Button
										size="xs"
										variant="subtle"
										aria-label={`Change decision for ${row.title}`}
										onClick={() => {
											setEditingId(row.workId);
										}}
									>
										Change
									</Button>
								)}
							</Group>
						</Group>
					</Paper>
				);
			})}
		</Stack>
	);
};
