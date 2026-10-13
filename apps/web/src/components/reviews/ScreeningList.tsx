/**
 * Screening list: one screening path's works awaiting a decision, each with its title, year, plain-language evidence for its position and include and exclude controls. Presentational: the arranged rows, the windowing and the label state arrive as props. A decision reports through onDecide, moves focus to the next row and is announced through a polite live region; j and k walk the rows (global navigation) and i and x decide the focused row.
 */

import {
	Badge,
	Box,
	Button,
	Group,
	Kbd,
	Paper,
	Select,
	Skeleton,
	Stack,
	Text,
	TextInput,
	Tooltip,
	UnstyledButton,
	VisuallyHidden,
} from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { type ReactElement,useRef, useState } from "react";

import { useScreeningDecisionHotkeys } from "@/hooks/use-hotkeys";
import {
	describeEvidence,
	ordinal,
	type RowSort,
	SCORE_DECIMALS,
	type ScreeningRow,
} from "@/lib/reviews/screening-view";
import type { ScreeningDecision } from "@/stores/review-store";

const SORT_OPTIONS = [
	{ value: "score", label: "Strongest connection" },
	{ value: "year", label: "Year (newest first)" },
	{ value: "title", label: "Title (A to Z)" },
] as const;

/**
 * The connection score in reviewer words, shown as the score's tooltip.
 */
const SCORE_TOOLTIP =
	"How closely the work is connected to your starting works: the average strength of the best path from each starting work. Stronger connections score higher.";

/**
 * The title column keeps at least this much width before the action buttons wrap beneath it, so titles clamp instead of pushing the row wide.
 */
const TITLE_FLEX_BASIS = "18rem";

/**
 * Fits the longest sort label without truncation.
 */
const SORT_CONTROL_WIDTH = 200;

/**
 * Icon size matching the inline text it sits beside.
 */
const ICON_SIZE = 14;

/**
 * Why a screening list can be empty: nothing was found, everything has been decided, or the title filter matched nothing.
 */
export type ScreeningEmptyState =
	| { readonly kind: "nothing-found"; readonly message: string }
	| { readonly kind: "all-decided"; readonly onOpenDecided: () => void }
	| { readonly kind: "filtered" };

export interface ScreeningListProps {
	readonly rows: readonly ScreeningRow[];
	readonly total: number;
	readonly showing: number;
	readonly hasMore: boolean;
	readonly onLoadMore: () => void;
	readonly sort: RowSort;
	readonly onSortChange: (sort: RowSort) => void;
	readonly filter: string;
	readonly onFilterChange: (filter: string) => void;
	readonly onDecide: (workId: string, decision: ScreeningDecision) => void;
	/**
	 * Name of the related-seeds list, used in the cross-list note on works that appear in both.
	 */
	readonly otherTabName: string;
	readonly emptyState: ScreeningEmptyState;
	/**
	 * True while titles are still loading; titles and evidence render as skeletons.
	 */
	readonly titlesPending: boolean;
}

const crossNote = (row: ScreeningRow, otherTabName: string): string | null => {
	if (row.otherPosition === null) return null;
	if (row.evidence !== null) return `Also result ${String(row.otherPosition)} from your search`;
	if (row.otherScore !== null) {
		return `Also ${ordinal(row.otherPosition)} in ${otherTabName} (Match ${row.otherScore.toFixed(SCORE_DECIMALS)})`;
	}
	return `Also in ${otherTabName}`;
};

export const ScreeningList = ({
	rows,
	total,
	showing,
	hasMore,
	onLoadMore,
	sort,
	onSortChange,
	filter,
	onFilterChange,
	onDecide,
	otherTabName,
	emptyState,
	titlesPending,
}: ScreeningListProps): ReactElement => {
	const [announcement, setAnnouncement] = useState("");
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [focusedIndex, setFocusedIndex] = useState(0);
	const elementsRef = useRef<(HTMLElement | null)[]>([]);

	useScreeningDecisionHotkeys({ onDecide, enabled: rows.length > 0 });

	if (rows.length === 0) {
		if (emptyState.kind === "filtered") {
			return <Text c="dimmed">No works match your filter.</Text>;
		}
		if (emptyState.kind === "all-decided") {
			return (
				<Stack gap="xs">
					<Text c="dimmed">You have decided on every work.</Text>
					<Button variant="subtle" size="xs" onClick={emptyState.onOpenDecided}>
						See decided works
					</Button>
				</Stack>
			);
		}
		return <Text c="dimmed">{emptyState.message}</Text>;
	}

	const decide = (row: ScreeningRow, index: number, decision: ScreeningDecision) => {
		onDecide(row.workId, decision);
		setAnnouncement(`${decision === "include" ? "Included" : "Excluded"} ${row.title}`);
		// Focus moves to the next row while it still exists, so keyboard screening never loses its place.
		const nextIndex = index + 1 < rows.length ? index + 1 : index - 1;
		if (nextIndex >= 0) {
			setFocusedIndex(nextIndex);
			elementsRef.current[nextIndex]?.focus();
		}
	};

	return (
		<Stack gap="sm">
			<VisuallyHidden>
				<div aria-live="polite">{announcement}</div>
			</VisuallyHidden>
			<Group justify="space-between" align="flex-end" wrap="wrap">
				<Group gap="xs" wrap="wrap" align="flex-end">
					<Select
						w={SORT_CONTROL_WIDTH}
						label="Sort by"
						value={sort}
						onChange={(value) => {
							if (value === "score" || value === "year" || value === "title") onSortChange(value);
						}}
						data={SORT_OPTIONS}
					/>
					<TextInput
						label="Filter by title"
						placeholder="Type part of a title"
						value={filter}
						onChange={(event) => {
							onFilterChange(event.currentTarget.value);
						}}
					/>
				</Group>
				<Text size="xs" c="dimmed">
					<Kbd>j</Kbd>/<Kbd>k</Kbd> move, <Kbd>i</Kbd> include, <Kbd>x</Kbd> exclude
				</Text>
			</Group>
			<Stack component="ul" gap="sm" m={0} p={0} style={{ listStyle: "none" }}>
				{rows.map((row, index) => {
					const note = crossNote(row, otherTabName);
					const expanded = expandedId === row.workId;
					return (
						<Paper
							key={row.workId}
							component="li"
							withBorder
							p="sm"
							role="listitem"
							tabIndex={index === focusedIndex ? 0 : -1}
							aria-posinset={index + 1}
							aria-setsize={total}
							data-screening-row
							data-work-id={row.workId}
							ref={(element: HTMLElement | null) => {
								elementsRef.current[index] = element;
							}}
						>
							<Box
								style={{
									alignItems: "flex-start",
									display: "flex",
									flexWrap: "wrap",
									gap: "var(--mantine-spacing-sm)",
								}}
							>
								<Box style={{ flex: `1 1 ${TITLE_FLEX_BASIS}`, minWidth: 0 }}>
									{titlesPending ? (
										<Stack gap={4}>
											<Skeleton height={20} width="70%" />
											<Skeleton height={14} width="45%" />
										</Stack>
									) : (
										<Stack gap={2}>
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
											{row.evidence !== null && (
												<Group gap="xs" wrap="nowrap">
													<Tooltip label={SCORE_TOOLTIP} withinPortal>
														<Text size="sm" c="dimmed">
															{`Match ${row.evidence.score.toFixed(SCORE_DECIMALS)}`}
														</Text>
													</Tooltip>
													<Badge variant="light" color="gray">
														{`${String(row.evidence.seedsReaching)} of ${String(row.evidence.seedCount)} seeds reach this`}
													</Badge>
												</Group>
											)}
											{row.evidence !== null ? (
												<Text size="sm">{describeEvidence(row.evidence)}</Text>
											) : (
												row.searchRank !== null && (
													<Text size="sm" c="dimmed">
														{`Result ${String(row.searchRank)} from your search`}
													</Text>
												)
											)}
											{note !== null && (
												<Text size="xs" c="dimmed">
													{note}
												</Text>
											)}
											{row.evidence !== null && (
												<>
													<UnstyledButton
														aria-expanded={expanded}
														onClick={() => {
															setExpandedId(expanded ? null : row.workId);
														}}
													>
														<Group gap={4} wrap="nowrap">
															{expanded ? (
																<IconChevronUp size={ICON_SIZE} aria-hidden />
															) : (
																<IconChevronDown size={ICON_SIZE} aria-hidden />
															)}
															<Text size="xs" c="dimmed">
																{expanded ? "Hide evidence" : "Show evidence"}
															</Text>
														</Group>
													</UnstyledButton>
													{expanded && (
														<Stack gap={4} pl="sm">
															<Text size="sm">{describeEvidence(row.evidence)}</Text>
															<Text size="sm" c="dimmed">
																{SCORE_TOOLTIP}
															</Text>
															<Text size="sm" c="dimmed">
																{`${String(row.evidence.seedsReaching)} of ${String(row.evidence.seedCount)} starting works reach this work.`}
															</Text>
														</Stack>
													)}
												</>
											)}
										</Stack>
									)}
								</Box>
								<Group gap="xs" wrap="wrap" style={{ flex: "0 0 auto" }}>
									<Button
										size="xs"
										aria-label={`Include ${row.title}`}
										onClick={() => {
											decide(row, index, "include");
										}}
									>
										Include
									</Button>
									<Button
										size="xs"
										variant="default"
										aria-label={`Exclude ${row.title}`}
										onClick={() => {
											decide(row, index, "exclude");
										}}
									>
										Exclude
									</Button>
								</Group>
							</Box>
						</Paper>
					);
				})}
			</Stack>
			<Group justify="space-between">
				<Text size="sm" c="dimmed">
					{`Showing ${String(showing)} of ${String(total)}`}
				</Text>
				{hasMore && (
					<Button variant="subtle" size="xs" onClick={onLoadMore}>
						Load more
					</Button>
				)}
			</Group>
		</Stack>
	);
};
