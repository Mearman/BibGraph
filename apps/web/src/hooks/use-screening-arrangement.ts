/**
 * Screening arrangement: how one screening list is sorted, filtered and paged. Pure logic over the labelled rows the session hook already derived, so the list component stays presentational and the arrangement itself is unit-testable.
 */

import { useCallback, useMemo, useState } from "react";

import {
	filterRows,
	LOAD_MORE_STEP,
	type RowSort,
	type ScreeningRow,
	sortRows,
	VISIBLE_ROWS,
} from "@/lib/reviews/screening-view";

/**
 * How many rows a list shows first and how many each "Load more" reveals; the defaults are the shared screening constants, a prop on the screen lets a test page a handful of rows instead of rendering a full window.
 */
export interface ScreeningPaging {
	readonly initial: number;
	readonly step: number;
}

export const DEFAULT_SCREENING_PAGING: ScreeningPaging = { initial: VISIBLE_ROWS, step: LOAD_MORE_STEP };

export interface ScreeningArrangement {
	readonly sort: RowSort;
	readonly setSort: (sort: RowSort) => void;
	readonly filter: string;
	readonly setFilter: (filter: string) => void;
	readonly visibleRows: readonly ScreeningRow[];
	/**
	 * Rows left after the filter, the "of N" in "Showing X of N".
	 */
	readonly total: number;
	readonly showing: number;
	readonly hasMore: boolean;
	readonly loadMore: () => void;
}

export const useScreeningArrangement = (
	rows: readonly ScreeningRow[],
	paging: ScreeningPaging = DEFAULT_SCREENING_PAGING,
): ScreeningArrangement => {
	const [sort, setSort] = useState<RowSort>("score");
	const [filter, setFilter] = useState("");
	const [limit, setLimit] = useState(paging.initial);
	const arranged = useMemo(() => filterRows(sortRows(rows, sort), filter), [rows, sort, filter]);
	const visibleRows = useMemo(() => arranged.slice(0, limit), [arranged, limit]);
	const loadMore = useCallback(() => {
		setLimit((current) => current + paging.step);
	}, [paging.step]);
	return {
		sort,
		setSort,
		filter,
		setFilter,
		visibleRows,
		total: arranged.length,
		showing: visibleRows.length,
		hasMore: visibleRows.length < arranged.length,
		loadMore,
	};
};
