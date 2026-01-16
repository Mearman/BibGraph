/**
 * Shared Static Data Cache Utilities
 * @deprecated This file has been refactored into a modular structure.
 * Import from @bibgraph/utils/static-data/cache instead.
 *
 * Provides unified logic for content hashing, URL mapping, and index management
 * Used by service worker, build plugins, and development cache middleware
 */

// Re-export everything from the new modular cache structure
export * from "./cache/index.js"
