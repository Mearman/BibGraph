/**
 * The review screening page. Failures are shown in plain language with a next step, a retry and a way back to the reviews list; the retry invalidates the query cache so the page's queries refetch.
 */

import { Alert, Button, Container, Group, Loader, Stack } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { createLazyFileRoute, Link, useParams } from "@tanstack/react-router";

import { ReviewScreen } from "@/components/reviews/ReviewScreen";
import { useReviewSession } from "@/hooks/use-review-session";
import { reviewSessionDeps } from "@/lib/reviews/review-deps";
import { describeError } from "@/lib/reviews/review-messages";

const ReviewPage = () => {
  const { reviewId } = useParams({ from: "/reviews/$reviewId" });
  const session = useReviewSession(reviewId, reviewSessionDeps);
  const queryClient = useQueryClient();
  return (
    <Container size="lg" py="xl">
      {session.phase === "loading" && <Loader aria-label="Loading review" />}
      {session.phase === "error" && (
        <Stack gap="md">
          <Alert color="red">{describeError(session.message).message}</Alert>
          <Group>
            <Button
              onClick={() => {
                void queryClient.invalidateQueries();
              }}
            >
              Try again
            </Button>
            <Link to="/reviews">Back to your reviews</Link>
          </Group>
        </Stack>
      )}
      {session.phase === "ready" && <ReviewScreen session={session} />}
    </Container>
  );
};

export const Route = createLazyFileRoute("/reviews/$reviewId")({
  component: ReviewPage,
});

export default ReviewPage;
