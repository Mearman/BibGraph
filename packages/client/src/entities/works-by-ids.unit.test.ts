/**
 * Unit tests for WorksApi.getWorksByIds: the works-level batched id lookup delegates to the client's getByIds with the works endpoint, so chunking, caching and rate limiting live in one place. The base client is a fake, so no request leaves the process.
 */

import { describe, expect, it, vi } from "vitest";

import type { OpenAlexBaseClient } from "../client";
import { WorksApi } from "./works";

describe("WorksApi.getWorksByIds", () => {
	it("delegates to the client's batched getByIds with the works endpoint", async () => {
		const getByIds = vi.fn(
			(_parameters: {
				endpoint: string;
				ids: readonly string[];
				params?: Record<string, unknown>;
			}) => new Map<string, unknown>(),
		);
		const api = new WorksApi({ getByIds } as unknown as OpenAlexBaseClient);

		await api.getWorksByIds(["W1", "W2"], { select: ["id"] });

		expect(getByIds).toHaveBeenCalledTimes(1);
		const parameters = getByIds.mock.calls[0][0];
		expect(parameters.endpoint).toBe("works");
		expect(parameters.ids).toEqual(["W1", "W2"]);
		expect(parameters.params).toEqual({ select: ["id"] });
	});
});
