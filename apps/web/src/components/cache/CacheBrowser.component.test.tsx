/**
 * Component tests for the /cache page (US-26): statistics render, per-type and whole-cache clears run behind a confirmation, previews show display names, and an honest empty state replaces the removed-feature notice.
 */

import type { CachedEntityPreview } from "@bibgraph/client/internal/static-data-provider";
import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UseCacheManagementResult } from "@/hooks/use-cache-management";
import { useCacheManagement } from "@/hooks/use-cache-management";

import { CacheBrowser } from "./CacheBrowser";

vi.mock("@/hooks/use-cache-management", () => ({
	useCacheManagement: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => vi.fn(),
}));

const mockedHook = vi.mocked(useCacheManagement);

const preview = (overrides: Readonly<Partial<CachedEntityPreview>>): CachedEntityPreview => ({
	entityType: "works",
	entityId: "W2741809807",
	cachedAt: Date.now(),
	lastAccessedAt: Date.now(),
	accessCount: 3,
	dataSize: 2048,
	displayName: "A study of cache management",
	...overrides,
});

const hookResult = (overrides: Partial<UseCacheManagementResult>): UseCacheManagementResult => ({
	typeStats: [
		{
			entityType: "works",
			count: 2,
			totalSizeBytes: 4096,
			lastCachedAt: Date.now(),
			lastAccessedAt: Date.now(),
		},
	],
	usage: {
		totalEntries: 2,
		totalSizeBytes: 4096,
		lastCachedAt: Date.now(),
	},
	memoryEntryCount: 1,
	previews: [preview({})],
	isLoading: false,
	isClearing: false,
	error: null,
	refresh: vi.fn().mockResolvedValue(undefined),
	clearByType: vi.fn().mockResolvedValue(undefined),
	clearAll: vi.fn().mockResolvedValue(undefined),
	...overrides,
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
	<MantineProvider>
		<ModalsProvider>{children}</ModalsProvider>
	</MantineProvider>
);

const renderPage = () =>
	render(
		<TestWrapper>
			<CacheBrowser />
		</TestWrapper>,
	);

describe("CacheBrowser", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	it("renders storage usage statistics with entry count, size and last modified", () => {
		mockedHook.mockReturnValue(hookResult({}));

		renderPage();

		expect(screen.getByTestId("storage-stats")).toBeVisible();
		expect(screen.getByTestId("cache-entry-count")).toHaveTextContent("2");
		expect(screen.getByTestId("storage-size")).toHaveTextContent("4 KB");
		expect(screen.getByTestId("cache-last-modified")).toHaveTextContent(/ago|Never/);
		expect(screen.getByTestId("memory-entry-count")).toHaveTextContent("1");
	});

	it("shows per-type rows with counts and previews with display names", () => {
		mockedHook.mockReturnValue(hookResult({}));

		renderPage();

		// One "Works" chip in the type table and one on the preview row.
		expect(screen.getAllByText("Works")).toHaveLength(2);
		expect(screen.getAllByTestId("entity-type-count")[0]).toHaveTextContent("2");
		expect(screen.getByText("A study of cache management")).toBeVisible();
		expect(screen.getByText("W2741809807")).toBeVisible();
	});

	it("clears the whole cache only after a confirmation", async () => {
		const clearAll = vi.fn().mockResolvedValue(undefined);
		mockedHook.mockReturnValue(hookResult({ clearAll }));

		renderPage();
		await userEvent.click(screen.getByTestId("clear-all-cache"));

		expect(clearAll).not.toHaveBeenCalled();
		expect(await screen.findByText("Clear Entire Cache")).toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: "Clear All" }));

		await waitFor(() => {
			expect(clearAll).toHaveBeenCalledTimes(1);
		});
	});

	it("clears one entity type only after a confirmation", async () => {
		const clearByType = vi.fn().mockResolvedValue(undefined);
		mockedHook.mockReturnValue(hookResult({ clearByType }));

		renderPage();
		await userEvent.click(screen.getAllByTestId("clear-cache-by-type")[0]);

		expect(clearByType).not.toHaveBeenCalled();
		expect(await screen.findByText("Clear Cached Works")).toBeInTheDocument();

		const dialog = await screen.findByRole("dialog");
		await userEvent.click(within(dialog).getByRole("button", { name: "Clear" }));

		await waitFor(() => {
			expect(clearByType).toHaveBeenCalledWith("works");
		});
	});

	it("renders an honest empty state when nothing is cached", () => {
		mockedHook.mockReturnValue(
			hookResult({
				typeStats: [],
				usage: { totalEntries: 0, totalSizeBytes: 0, lastCachedAt: null },
				memoryEntryCount: 0,
				previews: [],
			}),
		);

		renderPage();

		expect(screen.getByText("Nothing is cached yet")).toBeVisible();
		expect(
			screen.getByText(/cached here automatically and load instantly on repeat visits/i),
		).toBeVisible();
		expect(screen.queryByTestId("clear-cache-by-type")).not.toBeInTheDocument();
	});

	it("surfaces load failures as an error alert", () => {
		mockedHook.mockReturnValue(
			hookResult({ error: "Unable to load the cache contents." }),
		);

		renderPage();

		expect(screen.getByText("Unable to load the cache contents.")).toBeVisible();
	});
});
