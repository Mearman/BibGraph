/**
 * Unit tests for the IndexedDB cache tier's cache-management surface (US-26): entity previews with display names, per-type clearing, and enumeration. Runs against fake-indexeddb so no browser is needed.
 */

import "fake-indexeddb/auto";
// Import the provider before the tier: in production the provider module is always evaluated first, which resolves the tier <-> provider import cycle in the order the class bindings need.
import "../../static-data-provider";

import { beforeEach, describe, expect, it } from "vitest";

import { deleteEntityCacheDB } from "../../../cache/dexie/entity-cache-db";
import { IndexedDBCacheTier } from "./indexeddb";

const WORK_ENTITY = {
	id: "W2741809807",
	display_name: "A study of cache management",
};

const AUTHOR_ENTITY = {
	id: "A5017898742",
	display_name: "Joseph Mearman",
};

const PREVIEW_LIMIT = 10;
const PREVIEW_LIMIT_BELOW_TOTAL = 2;

describe("IndexedDBCacheTier cache management (US-26)", () => {
	let tier: IndexedDBCacheTier;

	beforeEach(async () => {
		await deleteEntityCacheDB();
		tier = new IndexedDBCacheTier();
	});

	describe("getEntityPreviews", () => {
		it("returns previews ordered by most recently accessed with display names", async () => {
			await tier.set("works", WORK_ENTITY.id, WORK_ENTITY);
			await tier.set("authors", AUTHOR_ENTITY.id, AUTHOR_ENTITY);

			// Touch the work after the author so it is the most recently accessed.
			await tier.get("works", WORK_ENTITY.id);

			const previews = await tier.getEntityPreviews(PREVIEW_LIMIT);

			expect(previews).toHaveLength(2);
			expect(previews[0]).toMatchObject({
				entityType: "works",
				entityId: WORK_ENTITY.id,
				displayName: WORK_ENTITY.display_name,
			});
			expect(previews[1]?.displayName).toBe(AUTHOR_ENTITY.display_name);
		});

		it("limits the number of previews returned", async () => {
			await tier.set("works", "W1", { id: "W1", display_name: "First" });
			await tier.set("works", "W2", { id: "W2", display_name: "Second" });
			await tier.set("works", "W3", { id: "W3", display_name: "Third" });

			const previews = await tier.getEntityPreviews(PREVIEW_LIMIT_BELOW_TOTAL);

			expect(previews).toHaveLength(2);
		});

		it("reports a null display name for data without one", async () => {
			await tier.set("works", "W9", { id: "W9" });

			const previews = await tier.getEntityPreviews(PREVIEW_LIMIT);

			expect(previews[0]?.displayName).toBeNull();
		});

		it("returns an empty array when nothing is cached", async () => {
			const previews = await tier.getEntityPreviews(PREVIEW_LIMIT);

			expect(previews).toEqual([]);
		});
	});

	describe("clearByType", () => {
		it("removes only the entries of the cleared type", async () => {
			await tier.set("works", WORK_ENTITY.id, WORK_ENTITY);
			await tier.set("authors", AUTHOR_ENTITY.id, AUTHOR_ENTITY);

			const clearedCount = await tier.clearByType("works");
			const remaining = await tier.enumerateEntities();

			expect(clearedCount).toBe(1);
			expect(remaining.map((entry) => entry.entityId)).toEqual([AUTHOR_ENTITY.id]);
		});
	});
});
