// @vitest-environment jsdom

/**
 * Component tests for the decided list: every decided work is listed with its decision marked in text and icon, Change offers the other decision, and an empty list says so.
 */

import "@testing-library/jest-dom";

import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DecidedRow } from "@/lib/reviews/screening-view";

import { DecidedList } from "./DecidedList";

const rows: readonly DecidedRow[] = [
	{ workId: "W2", title: "Bridge paper", year: 2021, titleKnown: true, decision: "include" },
	{ workId: "W4", title: "Query paper", year: 2020, titleKnown: true, decision: "exclude" },
];

const renderList = (list: readonly DecidedRow[] = rows) => {
	const onDecide = vi.fn<(workId: string, decision: "include" | "exclude") => void>();
	render(
		<MantineProvider>
			<DecidedList rows={list} onDecide={onDecide} emptyMessage="Nothing decided yet." />
		</MantineProvider>,
	);
	return onDecide;
};

describe("DecidedList", () => {
	it("lists included and excluded works with their decision in text", () => {
		renderList();
		expect(screen.getByText("Bridge paper")).toBeInTheDocument();
		expect(screen.getByText("Query paper")).toBeInTheDocument();
		expect(screen.getByText("Included")).toBeInTheDocument();
		expect(screen.getByText("Excluded")).toBeInTheDocument();
	});

	it("marks each decision with an icon as well as colour", () => {
		const { container } = render(
			<MantineProvider>
				<DecidedList rows={rows} onDecide={vi.fn<() => void>()} emptyMessage="" />
			</MantineProvider>,
		);
		const icons = container.querySelectorAll("svg");
		expect(icons.length).toBeGreaterThanOrEqual(2);
	});

	it("changes a decision through the Change control", () => {
		const onDecide = renderList();
		fireEvent.click(screen.getByRole("button", { name: "Change decision for Bridge paper" }));
		fireEvent.click(screen.getByRole("button", { name: "Exclude Bridge paper" }));
		expect(onDecide).toHaveBeenCalledWith("W2", "exclude");
	});

	it("explains an empty list", () => {
		renderList([]);
		expect(screen.getByText("Nothing decided yet.")).toBeInTheDocument();
	});
});
