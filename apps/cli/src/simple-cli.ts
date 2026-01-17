
/**
 * Simple OpenAlex CLI - Temporary working version
 * Demonstrates CLI structure while complex dependencies are being resolved
 */

import { logger } from "@bibgraph/utils/logger"
import { Command } from "commander"

import { detectEntityType, SUPPORTED_ENTITIES } from "./entity-detection.js"

const program = new Command()

program.name("openalex-cli").description("CLI for OpenAlex data access").version("8.1.0")

program
	.command("detect")
	.description("Detect entity type from OpenAlex ID")
	.argument("<entity-id>", "OpenAlex entity ID to detect")
	.action((entityId: string) => {
		const entityType = detectEntityType(entityId)
		console.log(`Entity ID: ${entityId}`)
		console.log(`Detected type: ${entityType}`)
		logger.debug("cli", "Entity type detected", { entityId, entityType })
	})

program
	.command("entities")
	.description("List supported entity types")
	.action(() => {
		console.log("Supported entity types:")
		for (const type of SUPPORTED_ENTITIES) {
			console.log(`  - ${type}`)
		}
	})

program
	.command("test")
	.description("Test CLI functionality")
	.action(() => {
		console.log("[SUCCESS] CLI is working!")
		console.log("[PACKAGES] Using packages:")
		console.log("  - @bibgraph/shared-utils (logger)")
		console.log("  - Entity detection utilities")
		logger.debug("cli", "CLI test command executed successfully")
	})

// Error handling
program.configureOutput({
	writeErr: (str) => {
		logger.error("cli", str)
		process.stderr.write(str)
	},
})

// Parse command line arguments
// Always parse in CLI mode
program.parse()
