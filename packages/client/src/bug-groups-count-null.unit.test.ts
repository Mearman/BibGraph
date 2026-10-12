/**
 * Regression test: OpenAlex returns `meta.groups_count: null` on ordinary (non group-by) list responses, and the response envelope schema rejected it as "expected number, received null", failing every list request that reached it.
 */

import { OpenAlexResponseSchema } from "@bibgraph/types";
import { describe, expect, it } from "vitest";
import { z } from "zod";

const meta = { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 };

describe("OpenAlexResponseSchema meta", () => {
	it("accepts a null groups_count", () => {
		const schema = OpenAlexResponseSchema(z.object({ id: z.string() }));
		const parsed = schema.parse({ results: [], meta: { ...meta, groups_count: null } });
		expect(parsed.meta.groups_count).toBeNull();
	});

	it("still accepts an absent groups_count", () => {
		const schema = OpenAlexResponseSchema(z.object({ id: z.string() }));
		expect(schema.parse({ results: [], meta }).meta.groups_count).toBeUndefined();
	});
});
