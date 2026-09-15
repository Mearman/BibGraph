// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DataTableColumnDef } from "../DataTable";
import { DataTable } from "../DataTable";

// Mock window.matchMedia for Mantine
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock ResizeObserver for virtualization
global.ResizeObserver = class ResizeObserver {
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
};

interface TestData {
	id: string;
	name: string;
	value: number;
}

const TEST_VALUE_STEP = 10;

const generateTestData = (count: number): TestData[] =>
	Array.from({ length: count }, (_, index) => ({
		id: `item-${String(index)}`,
		name: `Item ${String(index)}`,
		value: index * TEST_VALUE_STEP,
	}));

const columns: DataTableColumnDef<TestData>[] = [
	{ accessorKey: "name", header: "Name" },
	{ accessorKey: "value", header: "Value" },
];

const DEFAULT_TEST_ROW_COUNT = 10;

const renderTable = (properties: Partial<Parameters<typeof DataTable<TestData>>[0]> = {}) =>
	render(
		<MantineProvider>
			<DataTable data={generateTestData(DEFAULT_TEST_ROW_COUNT)} columns={columns} {...properties} />
		</MantineProvider>,
	);

describe("DataTable", () => {
	it("renders rows from the data", () => {
		renderTable();
		expect(screen.getByText("Item 0")).toBeInTheDocument();
		expect(screen.getByText("Item 9")).toBeInTheDocument();
	});

	it("filters rows through the global search box", async () => {
		renderTable();
		const search = screen.getByPlaceholderText("Search...");
		fireEvent.change(search, { target: { value: "Item 3" } });
		await waitFor(() => {
			expect(screen.getByText("Item 3")).toBeInTheDocument();
			expect(screen.queryByText("Item 4")).not.toBeInTheDocument();
		});
	});

	it("sorts rows when a header is clicked", async () => {
		renderTable({ enablePagination: false });
		fireEvent.click(screen.getByRole("columnheader", { name: /value/i }));
		// Numeric columns sort descending first in tanstack's default heuristic
		await waitFor(() => {
			const cells = screen.getAllByRole("cell");
			expect(cells[1].textContent).toBe("90");
		});
		fireEvent.click(screen.getByRole("columnheader", { name: /value/i }));
		await waitFor(() => {
			const cells = screen.getAllByRole("cell");
			expect(cells[1].textContent).toBe("0");
		});
	});

	it("paginates and steps pages", async () => {
		renderTable({ pageSize: 5 });
		expect(screen.getByText("Item 0")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "2" }));
		await waitFor(() => {
			expect(screen.getByText("Item 5")).toBeInTheDocument();
			expect(screen.queryByText("Item 0")).not.toBeInTheDocument();
		});
	});

	it("shows the empty state when no rows match", async () => {
		renderTable({ emptyState: <span>nothing here</span> });
		fireEvent.change(screen.getByPlaceholderText("Search..."), { target: { value: "zzz-no-match" } });
		await waitFor(() => {
			expect(screen.getByText("nothing here")).toBeInTheDocument();
		});
	});

	it("offers column visibility toggles", async () => {
		renderTable();
		fireEvent.click(screen.getByRole("button", { name: "Toggle column visibility" }));
		const nameToggle = await screen.findByRole("checkbox", { name: "Name" });
		fireEvent.click(nameToggle);
		await waitFor(() => {
			expect(screen.queryByRole("columnheader", { name: /name/i })).not.toBeInTheDocument();
			expect(screen.getByRole("columnheader", { name: /value/i })).toBeInTheDocument();
		});
	});

	it("virtualises large datasets instead of paginating", async () => {
		const LARGE_TEST_ROW_COUNT = 500;
		render(
			<MantineProvider>
				<DataTable data={generateTestData(LARGE_TEST_ROW_COUNT)} columns={columns} enableVirtualization estimateSize={40} />
			</MantineProvider>,
		);
		// Virtual mode replaces pagination and keeps the sortable header
		await waitFor(() => {
			expect(screen.queryByRole("button", { name: "2" })).not.toBeInTheDocument();
		});
		expect(screen.getByRole("columnheader", { name: /value/i })).toBeInTheDocument();
	});
});
