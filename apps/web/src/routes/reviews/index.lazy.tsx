import { normalizeOpenAlexId } from "@bibgraph/utils";
import { Container } from "@mantine/core";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";

import { ReviewsView } from "@/components/reviews/ReviewsView";
import { useReviews } from "@/hooks/use-reviews";
import { useBookmarks } from "@/hooks/useBookmarks";
import { reviewsDeps } from "@/lib/reviews/review-deps";

const ReviewsPage = () => {
	const navigate = useNavigate();
	const reviews = useReviews(reviewsDeps);
	const { bookmarks } = useBookmarks();
	const bookmarkedWorks = useMemo(
		() =>
			bookmarks
				.filter((bookmark) => bookmark.entityType === "works")
				.map((bookmark) => {
					const id = normalizeOpenAlexId(bookmark.entityId);
					return { id, title: id };
				}),
		[bookmarks],
	);
	return (
		<Container size="lg" py="xl">
			<ReviewsView
				reviews={reviews.reviews}
				error={reviews.error}
				startError={reviews.startError}
				starting={reviews.starting}
				bookmarkedWorks={bookmarkedWorks}
				onOpen={(reviewId) => {
					void navigate({ to: "/reviews/$reviewId", params: { reviewId } });
				}}
				onCreate={(values) => {
					reviews
						.start(values)
						.then(async (created) => navigate({ to: "/reviews/$reviewId", params: { reviewId: created.id } }))
						.catch(() => undefined); // The failure is shown through startError.
				}}
			/>
		</Container>
	);
};

export const Route = createLazyFileRoute("/reviews/")({
	component: ReviewsPage,
});

export default ReviewsPage;
