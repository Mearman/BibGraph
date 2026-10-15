/**
 * Measurement cache keys: a stored algorithm measurement is keyed by exactly the inputs that determine its value, so a reload or an unrelated stage switch reuses it and only genuinely invalidated cells re-measure. The dependency set comes from the measurement engines: exploration is measured against the seeds, seed selection against the pool alone (at a selection size), and ranking against the seeds on a named exploration. Fingerprints are order-sensitive because the engines iterate works and seeds in the order given.
 */

import type { AlgorithmStage } from "@/lib/algorithms/registry";
import type { PoolWork } from "@/lib/algorithms/screening-engine";

/**
 * FNV-1a 32-bit offset basis, prime and mask: a small, deterministic hash with no dependency, so the same bytes always fingerprint the same.
 */
const FNV_OFFSET_BASIS = 0x811C9DC5;
const FNV_PRIME = 0x01000193;
const FNV_MASK = 0xFFFFFFFF;

/**
 * Text is hashed as UTF-16 code units: every id the engines compare is ASCII, and code units avoid a TextEncoder allocation per work.
 */
const hashUnit = (hash: number, unit: number): number => (((hash ^ unit) * FNV_PRIME) >>> 0) & FNV_MASK;

const hashText = (hash: number, text: string): number => {
	let next = hash;
	for (let index = 0; index < text.length; index++) {
		next = hashUnit(next, text.charCodeAt(index));
	}
	return next;
};

/**
 * Hexadecimal radix, and the eight hex digits a 32-bit hash prints as.
 */
const HEX_RADIX = 16;
const FNV_HEX_DIGITS = 8;

const toHex = (hash: number): string => hash.toString(HEX_RADIX).padStart(FNV_HEX_DIGITS, "0");

/**
 * Separator that cannot appear in an OpenAlex id (letters and digits), so joined key parts cannot be re-split two ways.
 */
const KEY_SEPARATOR = "|";

const joined = (parts: readonly string[]): string => parts.join(KEY_SEPARATOR);

/**
 * Fingerprints the pool by each work's id and references in pool order: the engines build their graphs by iterating the pool, so a reordered or edited pool is different input.
 */
export const poolFingerprint = (pool: readonly PoolWork[]): string => {
	let hash = FNV_OFFSET_BASIS;
	for (const work of pool) {
		hash = hashText(hash, work.id);
		hash = hashUnit(hash, KEY_SEPARATOR.charCodeAt(0));
		for (const reference of work.references) {
			hash = hashText(hash, reference);
			hash = hashUnit(hash, KEY_SEPARATOR.charCodeAt(0));
		}
	}
	return toHex(hash);
};

/**
 * Fingerprints the seeds in order: exploration seeds are visited in the order given, so a different order is different input.
 */
export const seedsFingerprint = (seeds: readonly string[]): string => {
	let hash = FNV_OFFSET_BASIS;
	for (const seed of seeds) {
		hash = hashText(hash, seed);
		hash = hashUnit(hash, KEY_SEPARATOR.charCodeAt(0));
	}
	return toHex(hash);
};

/**
 * A measured value and the evidence sentence behind it, as the comparison table shows them.
 */
export interface CellMeasurement {
	readonly value: number | null;
	readonly evidence: string;
}

/**
 * A stored measurement: what was measured (key, review, stage, algorithm) and what it came out as. The key is the primary key in the store, so re-measuring a cell overwrites it in place.
 */
export interface MeasurementRecord extends CellMeasurement {
	readonly key: string;
	readonly reviewId: string;
	readonly stage: AlgorithmStage;
	readonly algorithmId: string;
}

/**
 * Exploration is measured by held-out seed recovery: pool, seeds and the algorithm decide the value.
 */
export const explorationKey = (reviewId: string, algorithmId: string, pool: string, seeds: string): string =>
	joined([reviewId, "exploration", algorithmId, pool, seeds]);

/**
 * Seed selection is measured by one-hop pool coverage: the pool, the selection size and the algorithm decide the value; the review's seeds do not enter it.
 */
export const seedSelectionKey = (reviewId: string, algorithmId: string, pool: string, selectionSize: number): string =>
	joined([reviewId, "seed-selection", algorithmId, pool, String(selectionSize)]);

/**
 * Ranking is measured by held-out seed recovery on a named exploration: pool, seeds, that exploration and the ranker decide the value.
 */
export const rankingKey = (reviewId: string, algorithmId: string, pool: string, seeds: string, explorationId: string): string =>
	joined([reviewId, "ranking", algorithmId, pool, seeds, explorationId]);
