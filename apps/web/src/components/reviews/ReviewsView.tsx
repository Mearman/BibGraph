/**
 * Reviews screen: the stored literature reviews, each openable, renamable and deletable, and the form to start a new one (from search terms alone, from starting works, or both). A start whose result needs a look (works the app picked, or a warning such as a search cut short) is held in the pending panel, where the reviewer can remove or add starting works before screening. Presentational: reviews, handlers and wording arrive as props or from the small summary helpers.
 */

import {
  Alert,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";

import {
  createdLabel,
  progressLabel as progressText,
} from "@/lib/reviews/review-summary";
import type { LiteratureReview } from "@/stores/review-store";

import {
  type BookmarkedWork,
  ReviewCreateForm,
  type ReviewCreateValues,
} from "./ReviewCreateForm";

/**
 * A held start: the starting works (titled), the warnings to read, and the actions to change them.
 */
export interface PendingStartView {
  readonly reviewId: string;
  readonly name: string;
  readonly seeds: readonly { readonly id: string; readonly title: string }[];
  readonly notices: readonly string[];
}

export interface ReviewsViewProps {
  readonly reviews: readonly LiteratureReview[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly startError: string | null;
  readonly starting: boolean;
  /**
   * What the running start is doing, for example "Searching OpenAlex...".
   */
  readonly progressLabel: string | null;
  readonly onCancelStart: (() => void) | null;
  readonly pending: PendingStartView | null;
  readonly pendingBusy: boolean;
  readonly pendingError: string | null;
  readonly bookmarkedWorks: readonly BookmarkedWork[];
  readonly onOpen: (id: string) => void;
  readonly onCreate: (values: ReviewCreateValues) => void;
  readonly onRemovePendingSeed: (seedId: string) => void;
  readonly onAddPendingSeed: (token: string) => void;
  readonly onContinuePending: (reviewId: string) => void;
  readonly onRename: (id: string, name: string) => void;
  readonly onDelete: (id: string) => void;
}

const CARD_SKELETONS = 3;

const seedLabel = (count: number): string =>
  `${String(count)} starting ${count === 1 ? "work" : "works"}`;

const queryLabel = (query: string): string =>
  query === "" ? "No search terms" : `Search: ${query}`;

const ReviewCard = ({
  review,
  onOpen,
  onRename,
  onDelete,
}: {
  readonly review: LiteratureReview;
  readonly onOpen: (id: string) => void;
  readonly onRename: (id: string, name: string) => void;
  readonly onDelete: (id: string) => void;
}) => {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(review.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  return (
    <Paper withBorder p="sm">
      <Group justify="space-between" wrap="nowrap">
        <Stack gap={2} miw={0}>
          <Text fw={500} truncate="end">
            {review.name}
          </Text>
          <Text size="sm" c="dimmed">
            {seedLabel(review.seeds.length)}
          </Text>
          <Text size="sm" c="dimmed" lineClamp={1}>
            {queryLabel(review.query)}
          </Text>
          <Text size="sm" c="dimmed">
            {progressText(review)}
          </Text>
          <Text size="sm" c="dimmed">
            {createdLabel(review)}
          </Text>
        </Stack>
        <Group gap="xs" wrap="nowrap">
          <Button
            variant="light"
            aria-label={`Open ${review.name}`}
            onClick={() => {
              onOpen(review.id);
            }}
          >
            Open
          </Button>
          <Button
            variant="subtle"
            aria-label={`Rename ${review.name}`}
            onClick={() => {
              setName(review.name);
              setRenaming(true);
            }}
          >
            Rename
          </Button>
          <Button
            variant="subtle"
            color="red"
            aria-label={`Delete ${review.name}`}
            onClick={() => {
              setConfirmingDelete(true);
            }}
          >
            Delete
          </Button>
        </Group>
      </Group>
      <Modal
        opened={renaming}
        onClose={() => {
          setRenaming(false);
        }}
        title="Rename review"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = name.trim();
            if (trimmed === "") return;
            setRenaming(false);
            onRename(review.id, trimmed);
          }}
        >
          <Stack gap="md">
            <TextInput
              label="New name"
              value={name}
              onChange={(event) => {
                setName(event.currentTarget.value);
              }}
            />
            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => {
                  setRenaming(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      <Modal
        opened={confirmingDelete}
        onClose={() => {
          setConfirmingDelete(false);
        }}
        title={`Delete "${review.name}"?`}
      >
        <Stack gap="md">
          <Text>
            The review and all its screening decisions are deleted for good.
            This cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setConfirmingDelete(false);
              }}
            >
              Keep it
            </Button>
            <Button
              color="red"
              onClick={() => {
                setConfirmingDelete(false);
                onDelete(review.id);
              }}
            >
              Delete review
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
};

const PendingStartPanel = ({
  pending,
  busy,
  error,
  onRemoveSeed,
  onAddSeed,
  onContinue,
}: {
  readonly pending: PendingStartView;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onRemoveSeed: (seedId: string) => void;
  readonly onAddSeed: (token: string) => void;
  readonly onContinue: (reviewId: string) => void;
}) => {
  const [token, setToken] = useState("");
  return (
    <Paper withBorder p="md" data-testid="pending-start">
      <Stack gap="sm">
        <Title
          order={4}
        >{`Check the starting works for "${pending.name}"`}</Title>
        <Text size="sm" c="dimmed">
          We picked these from your search results. Remove any that do not
          belong, or add works you know are relevant, then start screening.
        </Text>
        {pending.notices.map((notice) => (
          <Alert key={notice} color="yellow">
            {notice}
          </Alert>
        ))}
        <Stack gap={4}>
          {pending.seeds.map((seed) => (
            <Group key={seed.id} justify="space-between" wrap="nowrap" gap="xs">
              <Text size="sm" lineClamp={1}>
                {seed.title}
              </Text>
              <Button
                variant="subtle"
                size="compact-xs"
                color="red"
                disabled={busy}
                aria-label={`Remove ${seed.title}`}
                onClick={() => {
                  onRemoveSeed(seed.id);
                }}
              >
                Remove
              </Button>
            </Group>
          ))}
        </Stack>
        {error !== null && <Alert color="red">{error}</Alert>}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (token.trim() === "") return;
            onAddSeed(token.trim());
            setToken("");
          }}
        >
          <Group gap="xs" wrap="nowrap">
            <TextInput
              placeholder="Add a work by OpenAlex id or link, e.g. W2741809807"
              disabled={busy}
              value={token}
              onChange={(event) => {
                setToken(event.currentTarget.value);
              }}
            />
            <Button variant="light" type="submit" disabled={busy}>
              Add
            </Button>
          </Group>
        </form>
        <Group justify="flex-end">
          <Button
            onClick={() => {
              onContinue(pending.reviewId);
            }}
          >
            Start screening
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
};

export const ReviewsView = ({
  reviews,
  loading,
  error,
  startError,
  starting,
  progressLabel,
  onCancelStart,
  pending,
  pendingBusy,
  pendingError,
  bookmarkedWorks,
  onOpen,
  onCreate,
  onRemovePendingSeed,
  onAddPendingSeed,
  onContinuePending,
  onRename,
  onDelete,
}: ReviewsViewProps) => (
  <Stack gap="lg">
    <Title order={2}>Literature reviews</Title>
    {error !== null && <Alert color="red">{error}</Alert>}
    {loading ? (
      <Stack gap="sm" data-testid="reviews-loading">
        {Array.from({ length: CARD_SKELETONS }, (_, index) => (
          <Skeleton key={index} height={92} radius="sm" />
        ))}
      </Stack>
    ) : reviews.length === 0 ? (
      <Text c="dimmed">
        No reviews yet. Start one below from search terms alone (we pick a few
        starting works from the results), or from works you already know are
        relevant (we explore around them).
      </Text>
    ) : (
      <Stack gap="sm">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onOpen={onOpen}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </Stack>
    )}
    {pending !== null && (
      <PendingStartPanel
        pending={pending}
        busy={pendingBusy}
        error={pendingError}
        onRemoveSeed={onRemovePendingSeed}
        onAddSeed={onAddPendingSeed}
        onContinue={onContinuePending}
      />
    )}
    <Divider />
    <Title order={3}>Start a review</Title>
    {startError !== null && <Alert color="red">{startError}</Alert>}
    <ReviewCreateForm
      onSubmit={onCreate}
      submitting={starting}
      bookmarkedWorks={bookmarkedWorks}
      progressLabel={progressLabel}
      onCancel={onCancelStart ?? undefined}
    />
  </Stack>
);
