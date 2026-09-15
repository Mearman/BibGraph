/**
 * Output formatting and printing functions for CLI
 */

import { QueryResultSchema } from "./cli-schemas.js"
import type { EntityOutputParams as EntityOutputParameters, EntitySummary, EntitySummaryPrintParams as EntitySummaryPrintParameters, QueryResultOutputParams as QueryResultOutputParameters } from "./cli-types.js"

/**
Maximum number of query results printed in the console summary before results are elided.
 */
const MAX_QUERY_RESULT_PREVIEW = 10
/**
Width, in characters, that query result row numbers are padded to.
 */
const QUERY_RESULT_ROW_NUMBER_WIDTH = 3

/**
 * Print author-specific summary fields
 */
export const printAuthorSummary = (entity: Readonly<EntitySummary>): void => {
	if ("works_count" in entity) {
		const worksCount = typeof entity.works_count === "number" ? entity.works_count : "Unknown"
		console.log(`Works Count: ${worksCount.toString()}`)
	}

	const citedBy = typeof entity.cited_by_count === "number" ? entity.cited_by_count : 0
	console.log(`Cited By Count: ${citedBy.toString()}`)
}

/**
 * Print work-specific summary fields
 */
export const printWorkSummary = (entity: Readonly<EntitySummary>): void => {
	if ("publication_year" in entity) {
		const pubYear =
			typeof entity.publication_year === "number" ? entity.publication_year : "Unknown"
		console.log(`Publication Year: ${pubYear.toString()}`)
	}

	const citedBy = typeof entity.cited_by_count === "number" ? entity.cited_by_count : 0
	console.log(`Cited By Count: ${citedBy.toString()}`)
}

/**
 * Print institution-specific summary fields
 */
export const printInstitutionSummary = (entity: Readonly<EntitySummary>): void => {
	if ("works_count" in entity) {
		const worksCount = typeof entity.works_count === "number" ? entity.works_count : "Unknown"
		console.log(`Works Count: ${worksCount.toString()}`)
	}

	const country =
		"country_code" in entity && typeof entity.country_code === "string"
			? entity.country_code
			: "Unknown"
	console.log(`Country: ${country}`)
}

/**
 * Print entity summary to console
 */
export const printEntitySummary = ({ entity, entityType }: EntitySummaryPrintParameters): void => {
	console.log(`\n${entityType.toUpperCase()}: ${entity.display_name ?? "Unknown"}`)
	console.log(`ID: ${entity.id ?? "Unknown"}`)

	// Entity-specific summary fields
	switch (entityType) {
		case "authors": {
			printAuthorSummary(entity)
			break
		}
		case "works": {
			printWorkSummary(entity)
			break
		}
		case "institutions": {
			printInstitutionSummary(entity)
			break
		}
	}
}

/**
 * Output query result to console
 */
export const outputQueryResult = ({
	result,
	staticEntityType,
	format,
}: QueryResultOutputParameters): void => {
	if (format === "json") {
		console.log(JSON.stringify(result, null, 2))
	} else {
		// Summary format for query results
		const queryResultValidation = QueryResultSchema.safeParse(result)
		if (queryResultValidation.success) {
			const apiResult = queryResultValidation.data
			console.log(`\nQuery Results for ${staticEntityType.toUpperCase()}:`)
			console.log(`Total results: ${(apiResult.meta?.count ?? apiResult.results.length).toString()}`)
			console.log(`Returned: ${apiResult.results.length.toString()}`)

			if (apiResult.results.length > 0) {
				apiResult.results.slice(0, MAX_QUERY_RESULT_PREVIEW).forEach((item, index: number) => {
					const displayName = item.display_name ?? item.id ?? `Item ${(index + 1).toString()}`
					console.log(`${(index + 1).toString().padStart(QUERY_RESULT_ROW_NUMBER_WIDTH)}: ${displayName}`)
				})

				if (apiResult.results.length > MAX_QUERY_RESULT_PREVIEW) {
					console.log(`... and ${(apiResult.results.length - MAX_QUERY_RESULT_PREVIEW).toString()} more`)
				}
			}
		} else {
			console.log("Unexpected result format")
		}
	}
}

/**
 * Output entity to console
 */
export const outputEntity = ({
	entity,
	staticEntityType,
	format,
	pretty,
}: EntityOutputParameters): void => {
	if (format === "json") {
		console.log(JSON.stringify(entity, null, pretty === true ? 2 : 0))
	} else {
		printEntitySummary({ entity, entityType: staticEntityType })
	}
}
