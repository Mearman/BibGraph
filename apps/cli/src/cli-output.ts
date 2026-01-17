/**
 * Output formatting and printing functions for CLI
 */

import { QueryResultSchema } from "./cli-schemas.js"
import type { EntityOutputParams, EntitySummary, EntitySummaryPrintParams, QueryResultOutputParams } from "./cli-types.js"

/**
 * Print author-specific summary fields
 * @param entity
 */
export const printAuthorSummary = (entity: EntitySummary): void => {
	if ("works_count" in entity) {
		const worksCount = typeof entity["works_count"] === "number" ? entity["works_count"] : "Unknown"
		console.log(`Works Count: ${worksCount.toString()}`)
	}

	const citedBy = typeof entity["cited_by_count"] === "number" ? entity["cited_by_count"] : 0
	console.log(`Cited By Count: ${citedBy.toString()}`)
}

/**
 * Print work-specific summary fields
 * @param entity
 */
export const printWorkSummary = (entity: EntitySummary): void => {
	if ("publication_year" in entity) {
		const pubYear =
			typeof entity["publication_year"] === "number" ? entity["publication_year"] : "Unknown"
		console.log(`Publication Year: ${pubYear.toString()}`)
	}

	const citedBy = typeof entity["cited_by_count"] === "number" ? entity["cited_by_count"] : 0
	console.log(`Cited By Count: ${citedBy.toString()}`)
}

/**
 * Print institution-specific summary fields
 * @param entity
 */
export const printInstitutionSummary = (entity: EntitySummary): void => {
	if ("works_count" in entity) {
		const worksCount = typeof entity["works_count"] === "number" ? entity["works_count"] : "Unknown"
		console.log(`Works Count: ${worksCount.toString()}`)
	}

	const country =
		"country_code" in entity && typeof entity["country_code"] === "string"
			? entity["country_code"]
			: "Unknown"
	console.log(`Country: ${country}`)
}

/**
 * Print entity summary to console
 * @param root0
 * @param root0.entity
 * @param root0.entityType
 */
export const printEntitySummary = ({ entity, entityType }: EntitySummaryPrintParams): void => {
	console.log(`\n${entityType.toUpperCase()}: ${entity.display_name}`)
	console.log(`ID: ${entity.id}`)

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
 * @param root0
 * @param root0.result
 * @param root0.staticEntityType
 * @param root0.format
 */
export const outputQueryResult = ({
	result,
	staticEntityType,
	format,
}: QueryResultOutputParams): void => {
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
				apiResult.results.slice(0, 10).forEach((item, index: number) => {
					const displayName = item.display_name ?? item.id ?? `Item ${(index + 1).toString()}`
					console.log(`${(index + 1).toString().padStart(3)}: ${displayName}`)
				})

				if (apiResult.results.length > 10) {
					console.log(`... and ${(apiResult.results.length - 10).toString()} more`)
				}
			}
		} else {
			console.log("Unexpected result format")
		}
	}
}

/**
 * Output entity to console
 * @param root0
 * @param root0.entity
 * @param root0.staticEntityType
 * @param root0.format
 * @param root0.pretty
 */
export const outputEntity = ({
	entity,
	staticEntityType,
	format,
	pretty,
}: EntityOutputParams): void => {
	if (format === "json") {
		console.log(JSON.stringify(entity, null, pretty ? 2 : 0))
	} else {
		printEntitySummary({ entity, entityType: staticEntityType })
	}
}
