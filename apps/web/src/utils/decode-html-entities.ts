/**
 * HTML Entity Decoding Utility
 *
 * Handles decoding of HTML entities in text, including multi-level encoding
 * (e.g., &amp;amp; -> &amp; -> &)
 */

/**
 * Common HTML entity mappings
 */
const HTML_ENTITIES: Record<string, string> = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&#39;": "'",
	"&apos;": "'",
	"&nbsp;": " ",
};

/**
 * Pattern to match HTML entities we want to decode
 */
const ENTITY_PATTERN = /&(?:amp|lt|gt|quot|apos|nbsp|#39);/g;

/**
 * Maximum iterations to prevent infinite loops
 */
const MAX_DECODE_ITERATIONS = 5;

/**
 * Decode HTML entities in text, handling multiple levels of encoding
 *
 * Some data sources double or triple-encode HTML entities
 * (e.g., "&amp;amp;" should become "&" not "&amp;")
 *
 * @param text - The text containing HTML entities
 * @returns Text with all HTML entities decoded
 *
 * @example
 * decodeHtmlEntities("&amp;") // "&"
 * decodeHtmlEntities("&amp;amp;") // "&" (double-encoded)
 * decodeHtmlEntities("&amp;amp;amp;") // "&" (triple-encoded)
 * decodeHtmlEntities("Foo &amp;amp; Bar") // "Foo & Bar"
 */
export const decodeHtmlEntities = (text: string): string => {
	let result = text;
	let iterations = 0;

	// Keep decoding until no more changes (handles multi-level encoding)
	// Use iteration limit to prevent infinite loops on malformed input
	while (iterations < MAX_DECODE_ITERATIONS) {
		const decoded = result.replaceAll(
			ENTITY_PATTERN,
			(match) => HTML_ENTITIES[match] ?? match
		);

		// No more entities to decode
		if (decoded === result) {
			break;
		}

		result = decoded;
		iterations++;
	}

	return result;
};
