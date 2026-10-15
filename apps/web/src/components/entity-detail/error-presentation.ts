/**
 * Maps an entity fetch error to human-facing copy plus a technical detail string for the collapsed disclosure. Classification lives here so the ErrorState component stays presentational (constitution: presentation/functionality decoupling).
 */

import { OpenAlexApiError } from "@bibgraph/client";
import { ZodError } from "zod";

const HTTP_NOT_FOUND = 404;

const NO_DETAIL = "No error detail was available.";

/**
 * Renders any remaining thrown value as displayable text. Symbols and functions have no JSON form, and JSON.stringify throws on cyclic values and bigint, so fall back to the placeholder rather than crash the error page itself.
 */
const stringifyUnknown = (value: unknown): string => {
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "symbol" || typeof value === "function") {
		return NO_DETAIL;
	}
	try {
		return JSON.stringify(value);
	} catch {
		return NO_DETAIL;
	}
};

export interface EntityErrorPresentation {
	/**
	Plain-English sentence shown to every user.
	 */
	readonly headline: string;
	/**
	Developer-facing detail, shown only inside the collapsed disclosure.
	 */
	readonly technicalDetail: string;
}

/**
 * Classifies an entity fetch error into user-facing copy. Schema parse failures and 404s get specific sentences; everything else falls back to a generic one. The original error is never swallowed: its detail always reaches the disclosure so developers can diagnose the failure.
 */
export const describeEntityError = (error: unknown): EntityErrorPresentation => {
	if (error instanceof ZodError) {
		return {
			headline: "This record's data did not match the expected shape.",
			technicalDetail: JSON.stringify(error.issues, null, 2),
		};
	}
	if (error instanceof OpenAlexApiError && error.statusCode === HTTP_NOT_FOUND) {
		return {
			headline: "OpenAlex has no record with this id.",
			technicalDetail: error.message,
		};
	}
	if (error instanceof Error) {
		return {
			headline: "This record could not be loaded.",
			technicalDetail: `${error.name}: ${error.message}`,
		};
	}
	return {
		headline: "This record could not be loaded.",
		technicalDetail: error === undefined || error === null ? NO_DETAIL : stringifyUnknown(error),
	};
};
