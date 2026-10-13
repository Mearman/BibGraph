/**
 * Unit tests for the work label fetcher: ids are looked up in batches under OpenAlex's OR-value limit, returned labels are keyed by short W id, and a work OpenAlex has no title for keeps a null title so the screen marks the id as standing in.
 */

import { describe, expect, it } from "vitest";

import { ID_LOOKUP_BATCH_SIZE } from "./openalex-pool-fetcher";
import { createWorkLabelFetcher, type LabelWorksApi } from "./work-labels";

const makeApi = (): { api: LabelWorksApi; filters: string[] } => {
	const filters: string[] = [];
	const api: LabelWorksApi = {
		getWorks: async (params) => {
			filters.push(params.filter);
			await Promise.resolve();
			const ids = params.filter.replace("openalex_id:", "").split("|");
			return {
				results: ids
					.filter((id) => id !== "W404")
					.map((id) => ({
						id: `https://openalex.org/${id}`,
						display_name: id === "W5" ? null : `Title ${id}`,
						publication_year: 2020,
					})),
			};
		},
	};
	return { api, filters };
};

describe("createWorkLabelFetcher", () => {
	it("labels works by short id with title and year", async () => {
		const { api } = makeApi();
		const labels = await createWorkLabelFetcher(api)(["W1"]);
		expect(labels.get("W1")).toEqual({ title: "Title W1", year: 2020 });
	});

	it("keeps a null title when a work has none, so the screen can mark the id as not a title", async () => {
		const { api } = makeApi();
		const labels = await createWorkLabelFetcher(api)(["W5"]);
		expect(labels.get("W5")?.title).toBeNull();
	});

	it("omits ids OpenAlex does not return rather than inventing labels", async () => {
		const { api } = makeApi();
		const labels = await createWorkLabelFetcher(api)(["W1", "W404"]);
		expect(labels.has("W404")).toBe(false);
	});

	it("batches lookups under the OR-value limit", async () => {
		const { api, filters } = makeApi();
		const ids = Array.from({ length: ID_LOOKUP_BATCH_SIZE + 1 }, (_, i) => `W${String(i)}`);
		await createWorkLabelFetcher(api)(ids);
		expect(filters).toHaveLength(2);
	});
});
