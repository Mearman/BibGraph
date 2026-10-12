/**
 * Unit tests for WorksApi.getWorksProjection: a list request whose `select` projects only some fields validates against the caller's schema instead of the full Work schema, forwarding the projection and returning typed results. The base client is a fake, so no request leaves the process.
 */

import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { OpenAlexBaseClient } from "../client";
import { WorksApi } from "./works";

const projection = z.object({ id: z.string(), referenced_works: z.array(z.string()) });

describe("WorksApi.getWorksProjection", () => {
	it("forwards the projection query and validates against the supplied schema", async () => {
		const getResponse = vi.fn(async (_endpoint: string, _params: Record<string, unknown>, schema: z.ZodType) => {
			await Promise.resolve();
			return { results: [schema.parse({ id: "W1", referenced_works: ["W2"] })], meta: { count: 1 } };
		});
		const api = new WorksApi({ getResponse } as unknown as OpenAlexBaseClient);
		const response = await api.getWorksProjection({ search: "malaria", select: ["id", "referenced_works"], per_page: 200 }, projection);
		expect(response.results).toEqual([{ id: "W1", referenced_works: ["W2"] }]);
		const [endpoint, params, schema] = getResponse.mock.calls[0];
		expect(endpoint).toBe("works");
		expect(params).toMatchObject({ search: "malaria", per_page: 200 });
		expect(String(params.select)).toContain("referenced_works");
		expect(schema).toBe(projection);
	});
});
