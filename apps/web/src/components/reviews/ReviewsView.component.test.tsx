// @vitest-environment jsdom

/**
 * Component tests for the reviews screen: stored reviews are listed with their query, creation date and screening progress and are openable, renamable and deletable (delete asks first), the loading state shows a skeleton instead of a false "No reviews yet", the empty state explains the two ways to start, a held start shows its picked works with remove and add, and the create form receives the start's stage and cancel.
 */

import "@testing-library/jest-dom";

import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { LiteratureReview } from "@/stores/review-store";

import type { ReviewCreateValues } from "./ReviewCreateForm";
import { ReviewsView } from "./ReviewsView";

const stored = (
  id: string,
  name: string,
  seeds: readonly string[],
  decisions: LiteratureReview["decisions"] = {},
): LiteratureReview => ({
  id,
  name,
  query: "malaria AND gut",
  seeds: [...seeds],
  decisions,
  suggestedComposition: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

const renderView = (
  overrides: Partial<Parameters<typeof ReviewsView>[0]> = {},
) => {
  const onOpen = vi.fn<(id: string) => void>();
  const onCreate = vi.fn<(values: ReviewCreateValues) => void>();
  const onRename = vi.fn<(id: string, name: string) => void>();
  const onDelete = vi.fn<(id: string) => void>();
  const onRemovePendingSeed = vi.fn<(seedId: string) => void>();
  const onAddPendingSeed = vi.fn<(token: string) => void>();
  const onContinuePending = vi.fn<(reviewId: string) => void>();
  render(
    <MantineProvider>
      <ReviewsView
        reviews={[stored("r1", "Malaria gut", ["W1", "W2"])]}
        loading={false}
        error={null}
        startError={null}
        starting={false}
        progressLabel={null}
        onCancelStart={null}
        pending={null}
        pendingBusy={false}
        pendingError={null}
        bookmarkedWorks={[]}
        onOpen={onOpen}
        onCreate={onCreate}
        onRemovePendingSeed={onRemovePendingSeed}
        onAddPendingSeed={onAddPendingSeed}
        onContinuePending={onContinuePending}
        onRename={onRename}
        onDelete={onDelete}
        {...overrides}
      />
    </MantineProvider>,
  );
  return {
    onOpen,
    onCreate,
    onRename,
    onDelete,
    onRemovePendingSeed,
    onAddPendingSeed,
    onContinuePending,
  };
};

describe("ReviewsView", () => {
  it("lists stored reviews with query, progress and creation date, and opens one", () => {
    const { onOpen } = renderView({
      reviews: [
        stored("r1", "Malaria gut", ["W1", "W2"], {
          W3: "include",
          W4: "exclude",
        }),
      ],
    });
    expect(screen.getByText("Malaria gut")).toBeInTheDocument();
    expect(screen.getByText("2 starting works")).toBeInTheDocument();
    expect(screen.getByText("Search: malaria AND gut")).toBeInTheDocument();
    expect(screen.getByText("1 included of 2 screened")).toBeInTheDocument();
    expect(screen.getByText(/Created /)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Malaria gut" }));
    expect(onOpen).toHaveBeenCalledWith("r1");
  });

  it("shows a skeleton while loading and no empty-state message", () => {
    renderView({ loading: true });
    expect(screen.getByTestId("reviews-loading")).toBeInTheDocument();
    expect(screen.queryByText(/No reviews yet/)).not.toBeInTheDocument();
  });

  it("explains the two ways to start when no reviews exist", () => {
    renderView({ reviews: [] });
    const emptyState = screen.getByText(/^No reviews yet\. Start one below/);
    expect(emptyState.textContent).toContain("we pick a few starting works from the results");
    expect(emptyState.textContent).toContain("we explore around them");
  });

  it("renames a review through a dialog", async () => {
    const { onRename } = renderView();
    fireEvent.click(screen.getByRole("button", { name: "Rename Malaria gut" }));
    const input = await screen.findByLabelText("New name");
    fireEvent.change(input, { target: { value: "Renamed review" } });
    fireEvent.click(await screen.findByRole("button", { name: "Save" }));
    expect(onRename).toHaveBeenCalledWith("r1", "Renamed review");
  });

  it("deletes a review only after confirmation, and keeping it deletes nothing", async () => {
    const { onDelete } = renderView();
    fireEvent.click(screen.getByRole("button", { name: "Delete Malaria gut" }));
    fireEvent.click(await screen.findByRole("button", { name: "Keep it" }));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete Malaria gut" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete review" }));
    expect(onDelete).toHaveBeenCalledWith("r1");
  });

  it("shows a held start's works and warnings, with remove, add and continue", () => {
    const handlers = renderView({
      pending: {
        reviewId: "r9",
        name: "Picked start",
        seeds: [
          { id: "W1", title: "Gut malaria review" },
          { id: "W2", title: "Second work" },
        ],
        notices: [
          "Your search returned the most works we can load at once, so only the first 1,000 (the most relevant) are included.",
        ],
      },
    });
    expect(
      screen.getByText(/most works we can load at once/),
    ).toBeInTheDocument();
    expect(screen.getByText("Gut malaria review")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Gut malaria review" }),
    );
    expect(handlers.onRemovePendingSeed).toHaveBeenCalledWith("W1");
    fireEvent.change(screen.getByPlaceholderText(/W2741809807/), {
      target: { value: "W9" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(handlers.onAddPendingSeed).toHaveBeenCalledWith("W9");
    fireEvent.click(screen.getByRole("button", { name: "Start screening" }));
    expect(handlers.onContinuePending).toHaveBeenCalledWith("r9");
  });

  it("starts a review from the create form", () => {
    const { onCreate } = renderView({ reviews: [] });
    fireEvent.change(screen.getByLabelText(/Review name/), {
      target: { value: "New" },
    });
    fireEvent.change(screen.getByLabelText(/Search terms/), {
      target: { value: "malaria" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Start review/ }));
    expect(onCreate).toHaveBeenCalledWith({
      name: "New",
      query: "malaria",
      seeds: [],
    });
  });

  it("shows list and start errors", () => {
    renderView({
      error: "could not read reviews",
      startError:
        "We could not reach OpenAlex. Check your internet connection and try again.",
    });
    expect(screen.getByText("could not read reviews")).toBeInTheDocument();
    expect(screen.getByText(/could not reach OpenAlex/)).toBeInTheDocument();
  });
});
