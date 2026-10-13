/**
 * Seed input parsing: turns the text a reviewer pastes into starting works. Tokens are separated by whitespace, commas or semicolons; each is normalised to the short OpenAlex work id (W followed by digits). A token that is not a work id is kept as typed, so the message can echo exactly what the reviewer wrote.
 */

import { normalizeOpenAlexId } from "@bibgraph/utils";

const SEED_SEPARATORS = /[\s,;]+/;
const WORK_ID_PATTERN = /^W\d+$/;

export interface ParsedSeeds {
	/**
	 * Normalised work ids, each once, in first-seen order.
	 */
	readonly valid: readonly string[];
	/**
	 * Tokens that are not work ids, as typed.
	 */
	readonly invalid: readonly string[];
}

export const parseSeedTokens = (raw: string): ParsedSeeds => {
	const valid: string[] = [];
	const invalid: string[] = [];
	for (const token of raw.split(SEED_SEPARATORS).filter((candidate) => candidate !== "")) {
		const id = normalizeOpenAlexId(token);
		if (!WORK_ID_PATTERN.test(id)) {
			if (!invalid.includes(token)) invalid.push(token);
		} else if (!valid.includes(id)) {
			valid.push(id);
		}
	}
	return { valid, invalid };
};

/**
 * The first valid seed, or null when the text holds none.
 */
export const firstSeed = (parsed: ParsedSeeds): string | null =>
	parsed.valid.length > 0 ? parsed.valid[0] : null;
