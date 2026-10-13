// @vitest-environment jsdom

/**
 * Unit tests for the screening arrangement hook: rows are filtered over titles, sorted as chosen, shown one window at a time with "Showing X of N", and Load more reveals the next window.
 */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LOAD_MORE_STEP, type ScreeningRow, VISIBLE_ROWS } from "@/lib/reviews/screening-view";

import { useScreeningArrangement } from "./use-screening-arrangement";

const YEAR_BASE = 2000;
const LONG_LIST_EXTRA = 5;
const FILTER_MATCH_COUNT = 10;
const SHORT_LIST_COUNT = 3;

const rowsFrom = (count: number): ScreeningRow[] =>
	Array.from({ length: count }, (_, index) => ({
		workId: `W${String(index + 1)}`,
		title: `Work ${String(index + 1)}`,
		year: YEAR_BASE + index,
		titleKnown: true,
		evidence: null,
		searchRank: index + 1,
		otherPosition: null,
		otherScore: null,
	}));

describe("useScreeningArrangement", () => {
	it("shows the first window of a long list and reveals more on load", () => {
		const rows = rowsFrom(VISIBLE_ROWS + LOAD_MORE_STEP + LONG_LIST_EXTRA);
		const { result } = renderHook(() => useScreeningArrangement(rows));
		expect(result.current.showing).toBe(VISIBLE_ROWS);
		expect(result.current.total).toBe(rows.length);
		expect(result.current.hasMore).toBe(true);
		act(() => {
			result.current.loadMore();
		});
		expect(result.current.showing).toBe(VISIBLE_ROWS + LOAD_MORE_STEP);
		expect(result.current.hasMore).toBe(true);
		act(() => {
			result.current.loadMore();
		});
		expect(result.current.showing).toBe(rows.length);
		expect(result.current.hasMore).toBe(false);
	});

	it("filters over titles and reports the filtered total", () => {
		const { result } = renderHook(() => useScreeningArrangement(rowsFrom(FILTER_MATCH_COUNT)));
		act(() => {
			result.current.setFilter("Work 1");
		});
		expect(result.current.total).toBe(2);
		expect(result.current.visibleRows.map((row) => row.workId)).toEqual(["W1", "W10"]);
	});

	it("sorts by year, newest first, when asked", () => {
		const { result } = renderHook(() => useScreeningArrangement(rowsFrom(SHORT_LIST_COUNT)));
		act(() => {
			result.current.setSort("year");
		});
		expect(result.current.visibleRows.map((row) => row.workId)).toEqual(["W3", "W2", "W1"]);
	});
});
