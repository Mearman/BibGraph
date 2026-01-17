#!/usr/bin/env node

/**
 * OpenAlex CLI Client
 * A command-line interface for accessing OpenAlex data via static cache and API
 */

import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { Command } from "commander"

import { StaticCacheManager } from "./cache/static-cache-manager.js"
import {
	registerCacheCommands,
	registerFetchCommand,
	registerGetCommand,
	registerGetTypedCommand,
	registerIndexCommand,
	registerListCommand,
	registerSearchCommand,
	registerStaticCommands,
	registerStatsCommand,
} from "./commands/index.js"
import { OpenAlexCLI } from "./openalex-cli-class.js"

// CLI Configuration
const program = new Command()
const cli = OpenAlexCLI.getInstance()

// Calculate project paths for static cache
const currentFileUrl = import.meta.url
const currentFilePath = fileURLToPath(currentFileUrl)
const projectRoot = resolve(dirname(currentFilePath), "../../..")
const webAppCachePath = join(projectRoot, "apps", "web", "public", "data", "openalex")

const staticCacheManager = new StaticCacheManager({
	mode: "development",
	basePath: webAppCachePath,
})

// Configure program
program
	.name("openalex-cli")
	.description("CLI for accessing OpenAlex academic data")
	.version("1.0.0")

// Register all commands
registerListCommand(program, cli)
registerGetTypedCommand(program, cli)
registerGetCommand(program, cli)
registerSearchCommand(program, cli)
registerStatsCommand(program, cli)
registerIndexCommand(program, cli)
registerFetchCommand(program, cli)
registerCacheCommands(program, cli, staticCacheManager)
registerStaticCommands(program, cli)

// Parse and execute
program.parse()
