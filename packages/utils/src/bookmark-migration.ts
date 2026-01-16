/**
 * Bookmark Migration Utility
 *
 * Migrates existing URL-based bookmarks to entity-based storage.
 * Handles backward compatibility and data integrity.
 */

import { EntityDetectionService } from "./entity-detection-service.js"
import { logger } from "./logger.js"
import type { CatalogueService } from "./storage/catalogue-db/service.js"

/**
 * Migration result containing statistics and any errors encountered
 */
export interface MigrationResult {
	totalBookmarks: number
	migrated: number
	failed: number
	errors: string[]
}

/**
 * Migration configuration options
 */
export interface MigrationOptions {
	/**
	 * Whether to perform a dry run (no actual updates)
	 */
	dryRun?: boolean

	/**
	 * Whether to delete successfully migrated bookmarks
	 */
	deleteMigrated?: boolean
}

/**
 * Migrates existing URL-based bookmarks to entity-based storage
 *
 * This utility reads existing bookmarks that have URLs stored in the notes field,
 * detects the entity type and ID from the URLs, and updates them to use the
 * proper entity fields while preserving user notes.
 *
 * @param catalogueService - The catalogue service instance
 * @param options - Migration configuration options
 * @returns Migration result with statistics
 */
export const migrateBookmarkUrls = async (catalogueService: CatalogueService, options: MigrationOptions = {}): Promise<MigrationResult> => {
	const { dryRun = false, deleteMigrated = false } = options

	logger.info("bookmark-migration", "Starting bookmark migration", { dryRun, deleteMigrated })

	const result: MigrationResult = {
		totalBookmarks: 0,
		migrated: 0,
		failed: 0,
		errors: []
	}

	try {
		// Get all existing bookmarks
		const bookmarks = await catalogueService.getBookmarks()
		result.totalBookmarks = bookmarks.length

		logger.info("bookmark-migration", `Processing ${bookmarks.length} bookmarks`)

		for (const bookmark of bookmarks) {
			try {
				// Check if bookmark has URL in notes (legacy format)
				const urlMatch = bookmark.notes?.match(/URL: ([^\n]+)/)
				if (!urlMatch) {
					// Already migrated or doesn't need migration
					continue
					}

				const url = urlMatch[1].trim()

				// Skip if it's already a relative URL (possibly already migrated)
				if (url.startsWith("/BibGraph/")) {
					logger.debug("bookmark-migration", "Bookmark appears already migrated", {
						bookmarkId: bookmark.id
					})
					continue
				}

				// Try to detect entity from the URL
				const detection = EntityDetectionService.detectEntity(url)
				if (!detection) {
					result.failed++
					const error = `Failed to detect entity from URL: ${url}`
					result.errors.push(error)
					logger.warn("bookmark-migration", error, { bookmarkId: bookmark.id })
					continue
				}

				if (!dryRun) {
					// Extract user notes (remove URL part)
					let userNotes = bookmark.notes || ""
					const urlIndex = userNotes.indexOf("URL:")
					if (urlIndex !== -1) {
						// Remove "URL: ..." and any preceding/trailing whitespace/newlines
						userNotes = userNotes
							.slice(0, Math.max(0, urlIndex))
							.trim()
							.replace(/\n+$/, "")
					}

					// Update the bookmark with entity data using direct database access
					const db = catalogueService['db']
					if (bookmark.id != null) {
						await db.catalogueEntities.update(bookmark.id, {
							entityType: detection.entityType,
							entityId: detection.normalizedId,
							notes: userNotes || undefined
						})
					}

					if (deleteMigrated) {
						// Note: This would require implementing deleteEntity method
						logger.info("bookmark-migration", "Successfully migrated bookmark", {
							bookmarkId: bookmark.id,
							entityType: detection.entityType,
							entityId: detection.normalizedId
						})
					}
				}

				result.migrated++
				logger.debug("bookmark-migration", "Successfully detected entity for migration", {
					bookmarkId: bookmark.id,
					entityType: detection.entityType,
					entityId: detection.normalizedId,
					detectionMethod: detection.detectionMethod
				})

			} catch (error) {
				result.failed++
				const errorMsg = `Error migrating bookmark ${bookmark.id}: ${error instanceof Error ? error.message : String(error)}`
				result.errors.push(errorMsg)
				logger.error("bookmark-migration", errorMsg)
			}
		}

		logger.info("bookmark-migration", "Migration completed", {
			total: result.totalBookmarks,
			migrated: result.migrated,
			failed: result.failed,
			errors: result.errors.length,
			dryRun
		})

	} catch (error) {
		result.errors.push(`Migration failed: ${error instanceof Error ? error.message : String(error)}`)
		logger.error("bookmark-migration", "Critical error during migration", { error })
	}

	return result
};

/**
 * Validates bookmark data integrity after migration
 *
 * @param catalogueService - The catalogue service instance
 * @returns Validation result with issues found
 */
export const validateMigration = async (catalogueService: CatalogueService): Promise<{
	totalBookmarks: number
	withEntityData: number
	withLegacyUrls: number
	withInvalidData: number
	issues: string[]
}> => {
	const result = {
		totalBookmarks: 0,
		withEntityData: 0,
		withLegacyUrls: 0,
		withInvalidData: 0,
		issues: [] as string[]
	}

	try {
		const bookmarks = await catalogueService.getBookmarks()
		result.totalBookmarks = bookmarks.length

		for (const bookmark of bookmarks) {
			if (bookmark.entityType && bookmark.entityId) {
				result.withEntityData++

				// Validate entity type and ID format
				const detection = EntityDetectionService.detectEntity(bookmark.entityId)
				if (!detection || detection.entityType !== bookmark.entityType) {
					result.withInvalidData++
					result.issues.push(`Invalid entity data for bookmark ${bookmark.id}: type=${bookmark.entityType}, id=${bookmark.entityId}`)
				}
			}

			// Check for legacy URL patterns
			if (bookmark.notes?.includes("URL:")) {
				result.withLegacyUrls++
				result.issues.push(`Bookmark ${bookmark.id} still contains URL in notes`)
			}
		}

		logger.info("bookmark-migration", "Validation completed", result)

	} catch (error) {
		logger.error("bookmark-migration", "Validation failed", { error })
		result.issues.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`)
	}

	return result
};

/**
 * Gets migration statistics without performing migration
 *
 * @param catalogueService - The catalogue service instance
 * @returns Statistics about bookmarks that need migration
 */
export const getMigrationStats = async (catalogueService: CatalogueService): Promise<{
	totalBookmarks: number
	needMigration: number
	alreadyMigrated: number
}> => {
	const result = {
		totalBookmarks: 0,
		needMigration: 0,
		alreadyMigrated: 0
	}

	try {
		const bookmarks = await catalogueService.getBookmarks()
		result.totalBookmarks = bookmarks.length

		for (const bookmark of bookmarks) {
			if (bookmark.notes?.includes("URL:")) {
				result.needMigration++
			} else if (bookmark.entityType && bookmark.entityId) {
				result.alreadyMigrated++
			}
		}

	} catch (error) {
		logger.error("bookmark-migration", "Failed to get migration stats", { error })
	}

	return result
};

/**
 * Convenience function to perform complete migration workflow
 *
 * @param catalogueService - The catalogue service instance
 * @param options - Migration options
 * @returns Complete migration result
 */
export const performMigration = async (catalogueService: CatalogueService, options: MigrationOptions = {}): Promise<{
	migration: MigrationResult
	validation: Awaited<ReturnType<typeof validateMigration>>
	stats: Awaited<ReturnType<typeof getMigrationStats>>
}> => {
	// Get before stats
	const beforeStats = await getMigrationStats(catalogueService)
	logger.info("bookmark-migration", "Migration stats before", beforeStats)

	// Perform migration
	const migrationResult = await migrateBookmarkUrls(catalogueService, options)

	// Validate after migration (only if not dry run)
	const validationResult = await (options.dryRun
		? { totalBookmarks: 0, withEntityData: 0, withLegacyUrls: 0, withInvalidData: 0, issues: [] }
		: validateMigration(catalogueService))

	// Get after stats
	const afterStats = options.dryRun
		? beforeStats
		: await getMigrationStats(catalogueService)

	logger.info("bookmark-migration", "Migration stats after", afterStats)

	return {
		migration: migrationResult,
		validation: validationResult,
		stats: afterStats
	}
};