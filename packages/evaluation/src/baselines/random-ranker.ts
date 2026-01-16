/**
 * Random path ranking baseline
 */

import type { RankedPath } from '@bibgraph/algorithms';
import type { Path } from '@bibgraph/algorithms';
import type { Edge, Node } from '@bibgraph/types';

/**
 * Seeded random number generator for reproducibility.
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Generate next random number in [0, 1).
   */
  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Shuffle array using Fisher-Yates algorithm with seeded random.
   * @param array
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i]!, result[j]!] = [result[j]!, result[i]!];
    }
    return result;
  }
}

/**
 * Random path ranking baseline.
 * Shuffles paths randomly for comparison.
 *
 * @param paths - Paths to rank
 * @param seed - Random seed for reproducibility
 * @returns Randomly ordered paths with scores
 */
export const randomRanker = <N extends Node, E extends Edge>(paths: Path<N, E>[], seed?: number): RankedPath<N, E>[] => {
  const rng = new SeededRandom(seed ?? Date.now());

  // Shuffle paths randomly
  const shuffled = rng.shuffle(paths);

  // Assign descending scores (1.0 for first, lower for subsequent)
  return shuffled.map((path, index) => ({
    path,
    score: 1.0 - index / shuffled.length,
    geometricMeanMI: 0, // No MI computation for random baseline
    edgeMIValues: [],
  }));
};
