// @vitest-environment jsdom

/**
 * Component tests for the review create form: a review can start from a query alone (zero seeds, the app picks them), from pasted seed works, or from bookmarked works, and the form rejects input that gives the review nothing to start from or seeds that are not OpenAlex work ids.
 */

import "@testing-library/jest-dom";

import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReviewCreateForm, type ReviewCreateValues } from "./ReviewCreateForm";

const BOOKMARKS = [
	{ id: "W11", title: "Bookmarked one" },
	{ id: "W12", title: "Bookmarked two" },
];

const renderForm = (bookmarkedWorks = BOOKMARKS) => {
	const onSubmit = vi.fn<(values: ReviewCreateValues) => void>();
	render(
		<MantineProvider>
			<ReviewCreateForm onSubmit={onSubmit} submitting={false} bookmarkedWorks={bookmarkedWorks} />
		</MantineProvider>,
	);
	return onSubmit;
};

const fill = (label: string, value: string) => {
	fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

describe("ReviewCreateForm", () => {
	it("starts from a query alone with no seeds", () => {
		const onSubmit = renderForm();
		fill("Review name", "Malaria gut");
		fill("Boolean query", "malaria AND gut");
		fireEvent.click(screen.getByRole("button", { name: "Start review" }));
		expect(onSubmit).toHaveBeenCalledWith({ name: "Malaria gut", query: "malaria AND gut", seeds: [] });
		expect(screen.getByText(/pick the seeds for you/)).toBeInTheDocument();
	});

	it("starts from pasted seed works, normalising URLs and separators", () => {
		const onSubmit = renderForm();
		fill("Review name", "From seeds");
		fill("Seed works", "https://openalex.org/W1, w2\nW3");
		fireEvent.click(screen.getByRole("button", { name: "Start review" }));
		expect(onSubmit).toHaveBeenCalledWith({ name: "From seeds", query: "", seeds: ["W1", "W2", "W3"] });
	});

	it("adds bookmarked works as seeds", () => {
		const onSubmit = renderForm();
		fill("Review name", "From bookmarks");
		fireEvent.click(screen.getByRole("button", { name: "Add 2 bookmarked works as seeds" }));
		fireEvent.click(screen.getByRole("button", { name: "Start review" }));
		expect(onSubmit).toHaveBeenCalledWith({ name: "From bookmarks", query: "", seeds: ["W11", "W12"] });
	});

	it("rejects a review with neither a query nor seeds", () => {
		const onSubmit = renderForm();
		fill("Review name", "Empty");
		fireEvent.click(screen.getByRole("button", { name: "Start review" }));
		expect(onSubmit).not.toHaveBeenCalled();
		expect(screen.getByText("Enter a Boolean query, some seed works, or both.")).toBeInTheDocument();
	});

	it("rejects seeds that are not OpenAlex work ids", () => {
		const onSubmit = renderForm();
		fill("Review name", "Bad seeds");
		fill("Seed works", "W1 nonsense");
		fireEvent.click(screen.getByRole("button", { name: "Start review" }));
		expect(onSubmit).not.toHaveBeenCalled();
		expect(screen.getByText("Not OpenAlex work ids: NONSENSE")).toBeInTheDocument();
	});
});
