/**
 * List command handler
 */

import type { Command } from "commander"

import { FORMAT_OPTION, FORMAT_TABLE_DESC } from "../cli-options.js"
import { ListCommandOptionsSchema,StaticEntityTypeSchema } from "../cli-schemas.js"
import { SUPPORTED_ENTITIES } from "../entity-detection.js"
import { OpenAlexCLI } from "../openalex-cli-class.js"

/**
 * Register list command with program
 * @param program
 * @param cli
 */
export const registerListCommand = (program: Command, cli: OpenAlexCLI): void => {
	program
		.command("list")
		.description("List all entities of a specific type")
		.argument("<entity-type>", "Type of entity to list")
		.option("-c, --count", "Show only count")
		.option(FORMAT_OPTION, FORMAT_TABLE_DESC)
		.action(async (entityType: string, options: unknown) => {
			const entityTypeValidation = StaticEntityTypeSchema.safeParse(entityType)
			if (!entityTypeValidation.success) {
				console.error(`Unsupported entity type: ${entityType}`)
				console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`)
				process.exit(1)
			}

			const optionsValidation = ListCommandOptionsSchema.safeParse(options)
			if (!optionsValidation.success) {
				console.error(`Invalid options: ${optionsValidation.error.message}`)
				process.exit(1)
			}

			const staticEntityType = entityTypeValidation.data
			const validatedOptions = optionsValidation.data
			const entities = await cli.listEntities(staticEntityType)

			if (validatedOptions.count) {
				console.log(entities.length)
				return
			}

			if (validatedOptions.format === "json") {
				console.log(JSON.stringify(entities, null, 2))
			} else {
				console.log(`\n${entityType.toUpperCase()} (${entities.length.toString()} entities):`)
				for (const [index, id] of entities.entries()) {
					console.log(`${(index + 1).toString().padStart(3)}: ${id}`)
				}
			}
		})
}
