/**
 * Runtime registry mapping OpenAlex endpoint names to the Zod schema that validates a single entity of that type.
 *
 * Used by the generic entity-fetch paths (getEntity, sampling), where the entity type is determined at runtime by endpoint string and no compile-time generic can carry the schema. The keys mirror ENTITY_PREFIX_MAP in entity-type-detection.ts, which is the complete set of entity types those paths can produce.
 */

import type { OpenAlexEntity } from "@bibgraph/types";
import {
	authorSchema,
	funderSchema,
	institutionSchema,
	publisherSchema,
	sourceSchema,
	topicSchema,
	workSchema,
} from "@bibgraph/types";
import type { z } from "zod";

const ENDPOINT_SCHEMAS = new Map<string, z.ZodType<OpenAlexEntity>>([
	["works", workSchema],
	["authors", authorSchema],
	["sources", sourceSchema],
	["institutions", institutionSchema],
	["topics", topicSchema],
	["publishers", publisherSchema],
	["funders", funderSchema],
]);

/**
 * Get the Zod schema that validates a single entity of the given endpoint's type
 * @throws When no schema is registered for the endpoint
 */
export const getEndpointEntitySchema = (
	endpoint: string,
): z.ZodType<OpenAlexEntity> => {
	const schema = ENDPOINT_SCHEMAS.get(endpoint);
	if (schema === undefined) {
		throw new Error(`No entity schema registered for endpoint "${endpoint}"`);
	}
	return schema;
};
