/**
 * Fetch command handler
 */

import type { Command } from "commander"

import {
	CACHE_ONLY_DESC,
	CACHE_ONLY_OPTION,
	FORMAT_OPTION,
	FORMAT_SUMMARY_DESC,
	NO_CACHE_DESC,
	NO_CACHE_OPTION,
	NO_SAVE_DESC,
	NO_SAVE_OPTION,
} from "../cli-options.js"
import { outputQueryResult } from "../cli-output.js"
import {
	buildCacheOptions,
	buildQueryOptions,
	validateEntityType,
	validateFetchCommandOptions,
} from "../cli-validation.js"
import { OpenAlexCLI } from "../openalex-cli-class.js"

/**
 * Register fetch command with program
 * @param program
 * @param cli
 */
export const registerFetchCommand = (program: Command, cli: OpenAlexCLI): void => {
	program
		.command("fetch")
		.description("Fetch entities from OpenAlex API with cache control")
		.argument("<entity-type>", "Type of entity to fetch")
		.option("--filter <filter>", "OpenAlex filter parameter")
		.option("--select <fields>", "Comma-separated list of fields to select")
		.option("--sort <sort>", "Sort parameter")
		.option("--per-page <number>", "Number of results per page")
		.option("--page <number>", "Page number")
		.option(NO_CACHE_OPTION, NO_CACHE_DESC)
		.option(NO_SAVE_OPTION, NO_SAVE_DESC)
		.option(CACHE_ONLY_OPTION, CACHE_ONLY_DESC)
		.option(FORMAT_OPTION, FORMAT_SUMMARY_DESC)
		.action(async (entityType: string, options: unknown) => {
			const staticEntityType = validateEntityType(entityType)
			const validatedOptions = validateFetchCommandOptions(options)
			const queryOptions = buildQueryOptions(validatedOptions)
			const cacheOptions = buildCacheOptions(validatedOptions)

			try {
				const result = await cli.queryWithCache(staticEntityType, queryOptions, cacheOptions)

				if (!result) {
					console.error("No results found")
					process.exit(1)
				}

				outputQueryResult({ result, staticEntityType, format: validatedOptions.format })
			} catch (error) {
				console.error("Query failed:", error)
				process.exit(1)
			}
		})
}
