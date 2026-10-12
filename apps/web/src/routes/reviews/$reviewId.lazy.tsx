import { Alert, Container, Loader } from "@mantine/core";
import { createLazyFileRoute, useParams } from "@tanstack/react-router";

import { ReviewScreen } from "@/components/reviews/ReviewScreen";
import { useReviewSession } from "@/hooks/use-review-session";
import { reviewSessionDeps } from "@/lib/reviews/review-deps";

const ReviewPage = () => {
	const { reviewId } = useParams({ from: "/reviews/$reviewId" });
	const session = useReviewSession(reviewId, reviewSessionDeps);
	return (
		<Container size="lg" py="xl">
			{session.phase === "loading" && <Loader aria-label="Loading review" />}
			{session.phase === "error" && <Alert color="red">{session.message}</Alert>}
			{session.phase === "ready" && <ReviewScreen session={session} />}
		</Container>
	);
};

export const Route = createLazyFileRoute("/reviews/$reviewId")({
	component: ReviewPage,
});

export default ReviewPage;
