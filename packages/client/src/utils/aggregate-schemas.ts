/**
 * Zod schemas for OpenAlex aggregate and partial responses.
 *
 * These endpoints (group_by aggregation, count probes, selective-field result lists) return shapes that are not the standard OpenAlex entity envelope, so each is validated against its own top-level schema via the generic `get` rather than `getResponse`.
 */

import { z } from "zod";

/**
 * One aggregated group from an OpenAlex group_by response
 */
export const groupItemSchema = z.object({
  key: z.string(),
  key_display_name: z.string(),
  count: z.number(),
  cited_by_count: z.number().optional(),
  works_count: z.number().optional(),
  h_index: z.number().optional(),
});

/**
 * Top-level shape of a group_by aggregate response
 */
export const groupByResponseSchema = z.object({
  group_by: z.array(groupItemSchema).optional(),
});

/**
 * Top-level shape of a count-only response, as returned by per_page=1 probes that only read meta.count
 */
export const metaCountResponseSchema = z.object({
  meta: z.object({ count: z.number() }),
});

/**
 * Top-level shape of a results-only response whose entries carry an optional citation count
 */
export const citedByResultsResponseSchema = z.object({
  results: z.array(z.object({ cited_by_count: z.number().optional() })),
});

/**
 * Top-level shape of a results-only response of id/display_name stubs carrying arbitrary additional fields
 */
export const stubResultsResponseSchema = z.object({
  results: z.array(
    z.looseObject({ id: z.string(), display_name: z.string() }),
  ),
});

/**
 * Top-level shape of a results-only response of arbitrary records
 */
export const recordResultsResponseSchema = z.object({
  results: z.array(z.record(z.string(), z.unknown())),
});
