/**
 * Search command handler
 */

import type { Command } from "commander"

import { FORMAT_OPTION, FORMAT_TABLE_DESC, LIMIT_OPTION, LIMIT_RESULTS_DESC } from "../cli-options.js"
import { SearchCommandOptionsSchema,StaticEntityTypeSchema } from "../cli-schemas.js"
import { SUPPORTED_ENTITIES } from "../entity-detection.js"
import { OpenAlexCLI } from "../openalex-cli-class.js"

/**
 * Register search command with program
 * @param program
 * @param cli
 */
export const registerSearchCommand = (program: Command, cli: OpenAlexCLI): void => {
	program
		.command("search")
		.description("Search entities by display name")
		.argument("<entity-type>", "Type of entity to search")
		.argument("<term>", "Search term")
		.option(LIMIT_OPTION, LIMIT_RESULTS_DESC)
		.option(FORMAT_OPTION, FORMAT_TABLE_DESC)
		.action(async (entityType: string, searchTerm: string, options: unknown) => {
			const entityTypeValidation = StaticEntityTypeSchema.safeParse(entityType)
			if (!entityTypeValidation.success) {
				console.error(`Unsupported entity type: ${entityType}`)
				console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`)
				process.exit(1)
			}

			const optionsValidation = SearchCommandOptionsSchema.safeParse(options)
			if (!optionsValidation.success) {
				console.error(`Invalid options: ${optionsValidation.error.message}`)
				process.exit(1)
			}

			const staticEntityType = entityTypeValidation.data
			const validatedOptions = optionsValidation.data
			const results = await cli.searchEntities(staticEntityType, searchTerm)
			const limit =
				typeof validatedOptions.limit === "string" ? Number.parseInt(validatedOptions.limit, 10) : 10
			const limitedResults = results.slice(0, limit)

			if (validatedOptions.format === "json") {
				console.log(JSON.stringify(limitedResults, null, 2))
			} else {
				console.log(
					`\nSearch results for "${searchTerm}" in ${entityType} (${limitedResults.length.toString()}/${results.length.toString()}):`
				)
				for (const [index, entity] of limitedResults.entries()) {
					console.log(`${(index + 1).toString().padStart(3)}: ${entity.display_name} (${entity.id})`)
				}
			}
		})
}
