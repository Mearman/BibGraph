/**
 * Shared route search parameter schemas
 * These schemas ensure query parameters are preserved in hash-based routing
 */

import { z } from "zod";

/**
 * Standard OpenAlex API query parameters
 * Based on QueryParamsSchema from \@bibgraph/types
 *
 * Uses `.catch()` to handle invalid values gracefully instead of throwing errors
 */
export const openAlexSearchSchema = z.object({
  filter: z.string().optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  sort: z.string().optional().catch(undefined),
  page: z.coerce.number().optional().catch(undefined),
  per_page: z.coerce.number().optional().catch(undefined),
  cursor: z.string().optional().catch(undefined),
  sample: z.coerce.number().optional().catch(undefined),
  seed: z.coerce.number().optional().catch(undefined),
  group_by: z.string().optional().catch(undefined),
  mailto: z.string().optional().catch(undefined),
  // Allow any additional unknown parameters
}).catchall(z.unknown());

export type OpenAlexSearchParams = z.infer<typeof openAlexSearchSchema>;
