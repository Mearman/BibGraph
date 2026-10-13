/**
 * The reviews list page: joins the reviews hook to the view. Bookmark titles come from the work label fetcher, so the picker shows real titles. A start held for checking stays on this page in the pending panel; a start that needs no check goes straight to the review.
 */

import { normalizeOpenAlexId } from "@bibgraph/utils";
import { Container } from "@mantine/core";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";

import { ReviewsView } from "@/components/reviews/ReviewsView";
import { useReviews, useWorkLabels } from "@/hooks/use-reviews";
import { useBookmarks } from "@/hooks/useBookmarks";
import { fetchWorkLabels, reviewsDeps } from "@/lib/reviews/review-deps";
import { stageLabel } from "@/lib/reviews/review-messages";

const ReviewsPage = () => {
  const navigate = useNavigate();
  const reviews = useReviews(reviewsDeps);
  const { bookmarks } = useBookmarks();
  const bookmarkedIds = useMemo(
    () =>
      bookmarks
        .filter((bookmark) => bookmark.entityType === "works")
        .map((bookmark) => normalizeOpenAlexId(bookmark.entityId)),
    [bookmarks],
  );
  const labels = useWorkLabels(bookmarkedIds, fetchWorkLabels);
  const bookmarkedWorks = useMemo(
    () =>
      bookmarkedIds.map((id) => ({ id, title: labels.get(id)?.title ?? id })),
    [bookmarkedIds, labels],
  );
  return (
    <Container size="lg" py="xl">
      <ReviewsView
        reviews={reviews.reviews}
        loading={reviews.loading}
        error={reviews.error}
        startError={reviews.startError}
        starting={reviews.starting}
        progressLabel={
          reviews.stage === null ? null : stageLabel(reviews.stage)
        }
        onCancelStart={reviews.cancelStart}
        pending={reviews.pending}
        pendingBusy={reviews.pendingBusy}
        pendingError={reviews.pendingError}
        bookmarkedWorks={bookmarkedWorks}
        onOpen={(reviewId) => {
          void navigate({ to: "/reviews/$reviewId", params: { reviewId } });
        }}
        onCreate={(values) => {
          void reviews
            .start(values)
            .then(async (outcome) =>
              outcome.needsCheck
                ? undefined
                : navigate({
                    to: "/reviews/$reviewId",
                    params: { reviewId: outcome.review.id },
                  }),
            )
            .catch(() => undefined); // The failure is shown through startError.
        }}
        onRemovePendingSeed={(seedId) => {
          void reviews.removePendingSeed(seedId);
        }}
        onAddPendingSeed={(token) => {
          void reviews.addPendingSeed(token);
        }}
        onContinuePending={(reviewId) => {
          reviews.dismissPending();
          void navigate({ to: "/reviews/$reviewId", params: { reviewId } });
        }}
        onRename={(id, name) => {
          void reviews.rename(id, name);
        }}
        onDelete={(id) => {
          void reviews.remove(id);
        }}
      />
    </Container>
  );
};

export const Route = createLazyFileRoute("/reviews/")({
  component: ReviewsPage,
});

export default ReviewsPage;
