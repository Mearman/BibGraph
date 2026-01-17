/**
 * Get and get-typed command handlers
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
	PRETTY_OPTION,
} from "../cli-options.js"
import { outputEntity } from "../cli-output.js"
import {
	buildCacheOptions,
	detectAndValidateEntityType,
	validateEntityType,
	validateGetCommandOptions,
} from "../cli-validation.js"
import { OpenAlexCLI } from "../openalex-cli-class.js"

/**
 * Register get-typed command with program
 * @param program
 * @param cli
 */
export const registerGetTypedCommand = (program: Command, cli: OpenAlexCLI): void => {
	program
		.command("get-typed")
		.description("Get a specific entity by ID with explicit entity type")
		.argument("<entity-type>", "Type of entity")
		.argument("<entity-id>", "ID of entity to fetch")
		.option(FORMAT_OPTION, FORMAT_SUMMARY_DESC)
		.option(PRETTY_OPTION, "Pretty print JSON")
		.option(NO_CACHE_OPTION, NO_CACHE_DESC)
		.option(NO_SAVE_OPTION, NO_SAVE_DESC)
		.option(CACHE_ONLY_OPTION, CACHE_ONLY_DESC)
		.action(async (entityType: string, entityId: string, options: unknown) => {
			const staticEntityType = validateEntityType(entityType)
			const validatedOptions = validateGetCommandOptions(options)
			const cacheOptions = buildCacheOptions(validatedOptions)

			const entity = await cli.getEntityWithCache(staticEntityType, entityId, cacheOptions)

			if (!entity) {
				console.error(`Entity ${entityId} not found`)
				process.exit(1)
			}

			outputEntity({
				entity,
				staticEntityType,
				format: validatedOptions.format,
				pretty: validatedOptions.pretty,
			})
		})
}

/**
 * Register get command with program (auto-detect entity type)
 * @param program
 * @param cli
 */
export const registerGetCommand = (program: Command, cli: OpenAlexCLI): void => {
	program
		.command("get")
		.description("Get entity by ID with auto-detection of entity type")
		.argument("<entity-id>", "ID of entity to fetch")
		.option(FORMAT_OPTION, FORMAT_SUMMARY_DESC)
		.option(PRETTY_OPTION, "Pretty print JSON")
		.option(NO_CACHE_OPTION, NO_CACHE_DESC)
		.option(NO_SAVE_OPTION, NO_SAVE_DESC)
		.option(CACHE_ONLY_OPTION, CACHE_ONLY_DESC)
		.action(async (entityId: string, options: unknown) => {
			const validatedOptions = validateGetCommandOptions(options)
			const staticEntityType = detectAndValidateEntityType(entityId)
			const cacheOptions = buildCacheOptions(validatedOptions)

			const entity = await cli.getEntityWithCache(staticEntityType, entityId, cacheOptions)

			if (!entity) {
				console.error(`Entity ${entityId} not found`)
				process.exit(1)
			}

			outputEntity({
				entity,
				staticEntityType,
				format: validatedOptions.format,
				pretty: validatedOptions.pretty,
			})
		})
}
