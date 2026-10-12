// @vitest-environment jsdom

/**
 * Component tests for the screening list: each row shows the work's title, year and ranking evidence, the reviewer can include or exclude a work, and an empty list says why there is nothing to screen.
 */

import "@testing-library/jest-dom";

import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ScreeningRow } from "@/lib/reviews/screening-view";

import { ScreeningList } from "./ScreeningList";

const rows: readonly ScreeningRow[] = [
	{ workId: "W1", title: "Gut barrier in malaria", year: 2019, detail: "association 0.412, via W9" },
	{ workId: "W2", title: "Untitled survey", year: null, detail: "query rank 2" },
];

const renderList = (list: readonly ScreeningRow[] = rows) => {
	const onDecide = vi.fn<(workId: string, decision: "include" | "exclude") => void>();
	render(
		<MantineProvider>
			<ScreeningList rows={list} onDecide={onDecide} emptyMessage="Nothing left to screen." />
		</MantineProvider>,
	);
	return onDecide;
};

describe("ScreeningList", () => {
	it("shows title, year and evidence for each row", () => {
		renderList();
		expect(screen.getByText("Gut barrier in malaria")).toBeInTheDocument();
		expect(screen.getByText("2019")).toBeInTheDocument();
		expect(screen.getByText("association 0.412, via W9")).toBeInTheDocument();
		expect(screen.getByText("query rank 2")).toBeInTheDocument();
	});

	it("includes a work", () => {
		const onDecide = renderList();
		fireEvent.click(screen.getByRole("button", { name: "Include Gut barrier in malaria" }));
		expect(onDecide).toHaveBeenCalledWith("W1", "include");
	});

	it("excludes a work", () => {
		const onDecide = renderList();
		fireEvent.click(screen.getByRole("button", { name: "Exclude Untitled survey" }));
		expect(onDecide).toHaveBeenCalledWith("W2", "exclude");
	});

	it("explains an empty list", () => {
		renderList([]);
		expect(screen.getByText("Nothing left to screen.")).toBeInTheDocument();
	});
});
