/**
 * CLI option constants and descriptions
 */

// Common CLI option strings
export const FORMAT_OPTION = "-f, --format <format>"
export const PRETTY_OPTION = "-p, --pretty"
export const NO_CACHE_OPTION = "--no-cache"
export const NO_SAVE_OPTION = "--no-save"
export const CACHE_ONLY_OPTION = "--cache-only"
export const ENTITY_TYPE_OPTION = "--entity-type <type>"
export const LIMIT_OPTION = "-l, --limit <limit>"

// Common CLI option descriptions
export const FORMAT_TABLE_DESC = "Output format (json, table)"
export const FORMAT_SUMMARY_DESC = "Output format (json, summary)"
export const NO_CACHE_DESC = "Skip cache, fetch directly from API"
export const NO_SAVE_DESC = "Don't save API results to cache"
export const CACHE_ONLY_DESC = "Only use cache, don't fetch from API if not found"

// Common CLI option values and descriptions for duplicate strings
export const LIMIT_RESULTS_DESC = "Limit results"

// Command names
export const CACHE_GENERATE_STATIC_CMD = "cache:generate-static"
