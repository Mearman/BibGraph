/**
 * Reviews screen: the stored literature reviews, each openable, and the form to start a new one (from a query alone, from seed works, or both). Presentational: reviews and handlers arrive as props.
 */

import { Alert, Button, Divider, Group, Paper, Stack, Text, Title } from "@mantine/core";

import type { LiteratureReview } from "@/stores/review-store";

import { type BookmarkedWork, ReviewCreateForm, type ReviewCreateValues } from "./ReviewCreateForm";

export interface ReviewsViewProps {
	readonly reviews: readonly LiteratureReview[];
	readonly error: string | null;
	readonly startError: string | null;
	readonly starting: boolean;
	readonly bookmarkedWorks: readonly BookmarkedWork[];
	readonly onOpen: (id: string) => void;
	readonly onCreate: (values: ReviewCreateValues) => void;
}

const seedLabel = (count: number): string => `${String(count)} ${count === 1 ? "seed" : "seeds"}`;

export const ReviewsView = ({
	reviews,
	error,
	startError,
	starting,
	bookmarkedWorks,
	onOpen,
	onCreate,
}: ReviewsViewProps) => (
	<Stack gap="lg">
		<Title order={2}>Literature reviews</Title>
		{error !== null && <Alert color="red">{error}</Alert>}
		{reviews.length === 0 ? (
			<Text c="dimmed">No reviews yet. Start one below.</Text>
		) : (
			<Stack gap="sm">
				{reviews.map((review) => (
					<Paper key={review.id} withBorder p="sm">
						<Group justify="space-between">
							<Stack gap={2}>
								<Text fw={500}>{review.name}</Text>
								<Text size="sm" c="dimmed">
									{seedLabel(review.seeds.length)}
								</Text>
							</Stack>
							<Button
								variant="light"
								aria-label={`Open ${review.name}`}
								onClick={() => {
									onOpen(review.id);
								}}
							>
								Open
							</Button>
						</Group>
					</Paper>
				))}
			</Stack>
		)}
		<Divider />
		<Title order={3}>Start a review</Title>
		{startError !== null && <Alert color="red">{startError}</Alert>}
		<ReviewCreateForm onSubmit={onCreate} submitting={starting} bookmarkedWorks={bookmarkedWorks} />
	</Stack>
);
