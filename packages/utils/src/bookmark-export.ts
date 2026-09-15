/**
 * Bookmark Export Utilities
 *
 * Functions for exporting bookmarks to various formats
 *
 * Related:
 * - T044: Add bookmark export functionality
 * - User Story 3: Organize and Search Bookmarks
 */

import type { Bookmark } from "@bibgraph/types";

export type ExportFormat = "json" | "csv" | "markdown" | "html";

export interface ExportOptions {
	/**
	 * Export format
	 */
	format: ExportFormat;

	/**
	 * Include notes in export
	 */
	includeNotes?: boolean;

	/**
	 * Include tags in export
	 */
	includeTags?: boolean;

	/**
	 * Include timestamps in export
	 */
	includeTimestamps?: boolean;

	/**
	 * Include custom field selections in export
	 */
	includeFieldSelections?: boolean;
}

/**
 * Helper: Escape CSV values
 */
const escapeCSV = (value: string): string => {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replaceAll('"', '""')}"`;
	}
	return value;
};

/**
 * Helper: Escape HTML special characters
 */
const escapeHTML = (value: string): string =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");

/**
 * Export bookmarks to JSON format
 */
export const exportToJSON = (bookmarks: readonly Bookmark[], options: Readonly<ExportOptions>): string => {
	const data = bookmarks.map((bookmark) => ({
		id: bookmark.id,
		entityType: bookmark.entityType,
		entityId: bookmark.entityId,
		title: bookmark.metadata.title,
		url: bookmark.metadata.url,
		...(options.includeNotes === true &&
			bookmark.notes !== undefined &&
			bookmark.notes !== "" && { notes: bookmark.notes }),
		...(options.includeTags === true && bookmark.metadata.tags && { tags: bookmark.metadata.tags }),
		...(options.includeTimestamps === true && {
			addedAt: bookmark.addedAt.toISOString(),
			timestamp: bookmark.metadata.timestamp.toISOString(),
		}),
		...(options.includeFieldSelections === true &&
			bookmark.metadata.selectFields && { selectFields: bookmark.metadata.selectFields }),
	}));

	return JSON.stringify(data, null, 2);
};

/**
 * Export bookmarks to CSV format
 */
export const exportToCSV = (bookmarks: readonly Bookmark[], options: Readonly<ExportOptions>): string => {
	// CSV headers
	const headers = [
		"Title",
		"URL",
		"Entity Type",
		"Entity ID",
		...(options.includeNotes === true ? ["Notes"] : []),
		...(options.includeTags === true ? ["Tags"] : []),
		...(options.includeTimestamps === true ? ["Added At"] : []),
		...(options.includeFieldSelections === true ? ["Custom Fields"] : []),
	];

	// CSV rows
	const rows = bookmarks.map((bookmark) => {
		const row = [
			escapeCSV(bookmark.metadata.title),
			escapeCSV(bookmark.metadata.url),
			bookmark.entityType,
			bookmark.entityId,
			...(options.includeNotes === true ? [escapeCSV(bookmark.notes ?? "")] : []),
			...(options.includeTags === true ? [escapeCSV((bookmark.metadata.tags ?? []).join("; "))] : []),
			...(options.includeTimestamps === true ? [bookmark.addedAt.toISOString()] : []),
			...(options.includeFieldSelections === true
				? [escapeCSV((bookmark.metadata.selectFields ?? []).join(", "))]
				: []),
		];
		return row.join(",");
	});

	return [headers.join(","), ...rows].join("\n");
};

/**
 * Export bookmarks to Markdown format
 */
export const exportToMarkdown = (bookmarks: readonly Bookmark[], options: Readonly<ExportOptions>): string => {
	const lines: string[] = [];

	// Title
	lines.push("# Bookmarks");
	lines.push("");
	lines.push(`Exported: ${new Date().toISOString()}`);
	lines.push(`Total bookmarks: ${String(bookmarks.length)}`);
	lines.push("");

	// Group by entity type
	const groupedByType = bookmarks.reduce((accumulator, bookmark) => {
		const existing = accumulator.get(bookmark.entityType);
		if (existing === undefined) {
			accumulator.set(bookmark.entityType, [bookmark]);
		} else {
			existing.push(bookmark);
		}
		return accumulator;
	}, new Map<string, Bookmark[]>());

	// Output each group
	for (const [entityType, typeBookmarks] of groupedByType) {
		lines.push(`## ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`);
		lines.push("");

		for (const bookmark of typeBookmarks) {
			// Title and link
			lines.push(`### [${bookmark.metadata.title}](${bookmark.metadata.url})`);
			lines.push("");

			// Entity ID
			lines.push(`**Entity ID**: \`${bookmark.entityId}\``);
			lines.push("");

			// Tags
			if (options.includeTags === true && bookmark.metadata.tags && bookmark.metadata.tags.length > 0) {
				lines.push(`**Tags**: ${bookmark.metadata.tags.map((tag) => `\`${tag}\``).join(", ")}`);
				lines.push("");
			}

			// Notes
			if (options.includeNotes === true && bookmark.notes !== undefined && bookmark.notes !== "") {
				lines.push(`**Notes**: ${bookmark.notes}`);
				lines.push("");
			}

			// Timestamp
			if (options.includeTimestamps === true) {
				lines.push(`**Added**: ${bookmark.addedAt.toLocaleString()}`);
				lines.push("");
			}

			// Custom fields
			if (
				options.includeFieldSelections === true &&
				bookmark.metadata.selectFields &&
				bookmark.metadata.selectFields.length > 0
			) {
				lines.push(
					`**Custom Fields**: ${bookmark.metadata.selectFields.map((f) => `\`${f}\``).join(", ")}`
				);
				lines.push("");
			}

			lines.push("---");
			lines.push("");
		}
	}

	return lines.join("\n");
};

/**
 * Export bookmarks to HTML format
 */
export const exportToHTML = (bookmarks: readonly Bookmark[], options: Readonly<ExportOptions>): string => {
	const lines: string[] = [];

	// HTML header
	lines.push("<!DOCTYPE html>");
	lines.push("<html>");
	lines.push("<head>");
	lines.push('  <meta charset="UTF-8">');
	lines.push("  <title>Bookmarks Export</title>");
	lines.push("  <style>");
	lines.push("    body { font-family: sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }");
	lines.push("    h1 { color: #333; }");
	lines.push("    h2 { color: #666; margin-top: 30px; }");
	lines.push("    .bookmark { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }");
	lines.push("    .bookmark-title { font-size: 1.2em; font-weight: bold; margin-bottom: 5px; }");
	lines.push("    .bookmark-title a { color: #0066cc; text-decoration: none; }");
	lines.push("    .bookmark-title a:hover { text-decoration: underline; }");
	lines.push("    .bookmark-meta { color: #666; font-size: 0.9em; }");
	lines.push("    .tag { background: #e0e0e0; padding: 2px 8px; border-radius: 3px; margin-right: 5px; }");
	lines.push("    .notes { margin-top: 10px; font-style: italic; color: #555; }");
	lines.push("  </style>");
	lines.push("</head>");
	lines.push("<body>");

	// Title
	lines.push("  <h1>Bookmarks</h1>");
	lines.push(`  <p>Exported: ${new Date().toLocaleString()}</p>`);
	lines.push(`  <p>Total bookmarks: ${String(bookmarks.length)}</p>`);

	// Group by entity type
	const groupedByType = bookmarks.reduce((accumulator, bookmark) => {
		const existing = accumulator.get(bookmark.entityType);
		if (existing === undefined) {
			accumulator.set(bookmark.entityType, [bookmark]);
		} else {
			existing.push(bookmark);
		}
		return accumulator;
	}, new Map<string, Bookmark[]>());

	// Output each group
	for (const [entityType, typeBookmarks] of groupedByType) {
		lines.push(`  <h2>${entityType.charAt(0).toUpperCase() + entityType.slice(1)}</h2>`);

		for (const bookmark of typeBookmarks) {
			lines.push('  <div class="bookmark">');

			// Title and link
			lines.push('    <div class="bookmark-title">');
			lines.push(
				`      <a href="${escapeHTML(bookmark.metadata.url)}">${escapeHTML(bookmark.metadata.title)}</a>`
			);
			lines.push("    </div>");

			// Meta information
			lines.push('    <div class="bookmark-meta">');
			lines.push(`      Entity ID: <code>${escapeHTML(bookmark.entityId)}</code>`);

			// Timestamp
			if (options.includeTimestamps === true) {
				lines.push(` | Added: ${bookmark.addedAt.toLocaleString()}`);
			}
			lines.push("    </div>");

			// Tags
			if (options.includeTags === true && bookmark.metadata.tags && bookmark.metadata.tags.length > 0) {
				lines.push('    <div style="margin-top: 8px;">');
				for (const tag of bookmark.metadata.tags) {
					lines.push(`      <span class="tag">${escapeHTML(tag)}</span>`);
				}
				lines.push("    </div>");
			}

			// Notes
			if (options.includeNotes === true && bookmark.notes !== undefined && bookmark.notes !== "") {
				lines.push(`    <div class="notes">${escapeHTML(bookmark.notes)}</div>`);
			}

			// Custom fields
			if (
				options.includeFieldSelections === true &&
				bookmark.metadata.selectFields &&
				bookmark.metadata.selectFields.length > 0
			) {
				lines.push('    <div class="bookmark-meta" style="margin-top: 8px;">');
				lines.push(
					`      Custom fields: <code>${escapeHTML(bookmark.metadata.selectFields.join(", "))}</code>`
				);
				lines.push("    </div>");
			}

			lines.push("  </div>");
		}
	}

	// HTML footer
	lines.push("</body>");
	lines.push("</html>");

	return lines.join("\n");
};

/**
 * Main export function that routes to the appropriate format
 */
export const exportBookmarks = (bookmarks: readonly Bookmark[], options: Readonly<ExportOptions>): string => {
	switch (options.format) {
		case "json":
			return exportToJSON(bookmarks, options);
		case "csv":
			return exportToCSV(bookmarks, options);
		case "markdown":
			return exportToMarkdown(bookmarks, options);
		case "html":
			return exportToHTML(bookmarks, options);
		default:
			throw new Error(`Unsupported export format: ${JSON.stringify(options.format)}`);
	}
};

/**
 * Download exported data as a file
 */
export const downloadExport = (content: string, format: ExportFormat, filename?: string): void => {
	const mimeTypes: Record<ExportFormat, string> = {
		json: "application/json",
		csv: "text/csv",
		markdown: "text/markdown",
		html: "text/html",
	};

	const extensions: Record<ExportFormat, string> = {
		json: "json",
		csv: "csv",
		markdown: "md",
		html: "html",
	};

	const defaultFilename = filename ?? `bookmarks-${String(Date.now())}.${extensions[format]}`;

	const blob = new Blob([content], { type: mimeTypes[format] });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = defaultFilename;
	document.body.append(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
};
