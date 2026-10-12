// @vitest-environment jsdom

/**
 * Component tests for the reviews screen: stored reviews are listed and openable, the create form starts a review, an empty store invites the first review, and list and start errors are shown.
 */

import "@testing-library/jest-dom";

import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { LiteratureReview } from "@/stores/review-store";

import type { ReviewCreateValues } from "./ReviewCreateForm";
import { ReviewsView } from "./ReviewsView";

const stored = (id: string, name: string, seeds: readonly string[]): LiteratureReview => ({
	id,
	name,
	query: "q",
	seeds: [...seeds],
	decisions: {},
	suggestedComposition: null,
	createdAt: new Date(0),
	updatedAt: new Date(0),
});

const renderView = (overrides: Partial<Parameters<typeof ReviewsView>[0]> = {}) => {
	const onOpen = vi.fn<(id: string) => void>();
	const onCreate = vi.fn<(values: ReviewCreateValues) => void>();
	render(
		<MantineProvider>
			<ReviewsView
				reviews={[stored("r1", "Malaria gut", ["W1", "W2"])]}
				error={null}
				startError={null}
				starting={false}
				bookmarkedWorks={[]}
				onOpen={onOpen}
				onCreate={onCreate}
				{...overrides}
			/>
		</MantineProvider>,
	);
	return { onOpen, onCreate };
};

describe("ReviewsView", () => {
	it("lists stored reviews with their seed counts and opens one", () => {
		const { onOpen } = renderView();
		expect(screen.getByText("Malaria gut")).toBeInTheDocument();
		expect(screen.getByText("2 seeds")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Open Malaria gut" }));
		expect(onOpen).toHaveBeenCalledWith("r1");
	});

	it("invites the first review when none exist", () => {
		renderView({ reviews: [] });
		expect(screen.getByText("No reviews yet. Start one below.")).toBeInTheDocument();
	});

	it("starts a review from the create form", () => {
		const { onCreate } = renderView({ reviews: [] });
		fireEvent.change(screen.getByLabelText("Review name"), { target: { value: "New" } });
		fireEvent.change(screen.getByLabelText("Boolean query"), { target: { value: "malaria" } });
		fireEvent.click(screen.getByRole("button", { name: "Start review" }));
		expect(onCreate).toHaveBeenCalledWith({ name: "New", query: "malaria", seeds: [] });
	});

	it("shows list and start errors", () => {
		renderView({ error: "could not read reviews", startError: "OpenAlex unavailable" });
		expect(screen.getByText("could not read reviews")).toBeInTheDocument();
		expect(screen.getByText("OpenAlex unavailable")).toBeInTheDocument();
	});
});
