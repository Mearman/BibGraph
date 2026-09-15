/**
 * Bookmark error types and validation functions
 * Provides type-safe error handling for bookmark operations
 */

import { BookmarkMetadataSchema } from "../bookmark.js";

/**
 * Error codes for bookmark operations
 */
export enum BookmarkErrorCode {
	BOOKMARK_NOT_FOUND = "BOOKMARK_NOT_FOUND",
	BOOKMARK_VALIDATION_ERROR = "BOOKMARK_VALIDATION_ERROR",
	BOOKMARK_STORAGE_ERROR = "BOOKMARK_STORAGE_ERROR",
	DUPLICATE_BOOKMARK = "DUPLICATE_BOOKMARK",
	BOOKMARK_LIMIT_EXCEEDED = "BOOKMARK_LIMIT_EXCEEDED",
}

/**
 * Base class for bookmark-related errors
 */
export abstract class BookmarkError extends Error {
	public readonly code: BookmarkErrorCode;
	public readonly metadata?: Record<string, unknown>;

	constructor(
		message: string,
		code: BookmarkErrorCode,
		metadata?: Record<string, unknown>,
	) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.metadata = metadata;
	}
}

/**
 * Error thrown when a bookmark is not found
 */
export class BookmarkNotFoundError extends BookmarkError {
	constructor(bookmarkId: string, metadata?: Record<string, unknown>) {
		super(
			`Bookmark not found: ${bookmarkId}`,
			BookmarkErrorCode.BOOKMARK_NOT_FOUND,
			{ bookmarkId, ...metadata },
		);
	}
}

/**
 * Error thrown when bookmark data fails validation
 */
export class BookmarkValidationError extends BookmarkError {
	constructor(message: string, metadata?: Record<string, unknown>) {
		super(message, BookmarkErrorCode.BOOKMARK_VALIDATION_ERROR, metadata);
	}
}

/**
 * Error thrown when bookmark storage operations fail
 */
export class BookmarkStorageError extends BookmarkError {
	constructor(message: string, metadata?: Record<string, unknown>) {
		super(message, BookmarkErrorCode.BOOKMARK_STORAGE_ERROR, metadata);
	}
}

/**
 * Error thrown when attempting to bookmark the same URL/entity twice
 */
export class DuplicateBookmarkError extends BookmarkError {
	constructor(
		urlOrEntityId: string,
		metadata?: Record<string, unknown>,
	) {
		super(
			`Duplicate bookmark: ${urlOrEntityId} is already bookmarked`,
			BookmarkErrorCode.DUPLICATE_BOOKMARK,
			{ urlOrEntityId, ...metadata },
		);
	}
}

/**
 * Error thrown when bookmark storage limits are exceeded
 */
export class BookmarkLimitExceededError extends BookmarkError {
	constructor(
		currentCount: number,
		limit: number,
		metadata?: Record<string, unknown>,
	) {
		super(
			`Bookmark limit exceeded: ${String(currentCount)}/${String(limit)}`,
			BookmarkErrorCode.BOOKMARK_LIMIT_EXCEEDED,
			{ currentCount, limit, ...metadata },
		);
	}
}

/**
 * Validates bookmark metadata using Zod schema
 * @throws `BookmarkValidationError` If metadata is invalid
 */
export const validateBookmarkMetadata = (metadata: unknown): void => {
	const result = BookmarkMetadataSchema.safeParse(metadata);

	if (!result.success) {
		const errors = result.error.issues.map((error) => ({
			path: error.path.join("."),
			message: error.message,
		}));

		throw new BookmarkValidationError("Invalid bookmark metadata", {
			validationErrors: errors,
			metadata,
		});
	}
};

/**
 * Validates a bookmark URL
 * @throws `BookmarkValidationError` If URL is invalid
 */
export const validateBookmarkUrl = (url: string): void => {
	// Check if URL is empty or whitespace
	if (!url || url.trim().length === 0) {
		throw new BookmarkValidationError("URL cannot be empty", { url });
	}

	// Try to parse as URL
	try {
		const parsedUrl = new URL(url);

		// Check for valid protocol
		if (!/^https?:$/.test(parsedUrl.protocol)) {
			throw new BookmarkValidationError(
				`Invalid URL protocol: ${parsedUrl.protocol}. Only http: and https: are allowed`,
				{ url, protocol: parsedUrl.protocol },
			);
		}

		// Check for valid hostname
		if (!parsedUrl.hostname || parsedUrl.hostname.length === 0) {
			throw new BookmarkValidationError("URL must have a valid hostname", {
				url,
			});
		}
	} catch (error) {
		// If it's already a BookmarkValidationError, re-throw it
		if (error instanceof BookmarkValidationError) {
			throw error;
		}

		// Otherwise, wrap the URL parsing error
		throw new BookmarkValidationError(
			`Invalid URL format: ${error instanceof Error ? error.message : String(error)}`,
			{ url, originalError: String(error) },
		);
	}
};

/**
 * Type guard to check if an error is a BookmarkError
 */
export const isBookmarkError = (
	error: unknown
): error is BookmarkError => error instanceof BookmarkError;

/**
 * Type guard to check if an error is a specific bookmark error type
 */
export const isBookmarkErrorCode = (
	error: unknown,
	code: BookmarkErrorCode
): boolean => isBookmarkError(error) && error.code === code;
