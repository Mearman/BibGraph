/**
 * Baseline expansion algorithms for comparison with degree-prioritised expansion.
 *
 * These baselines provide controlled comparisons:
 * - StandardBfsExpansion: No prioritisation (FIFO queue)
 * - FrontierBalancedExpansion: Cerf et al. balancing (smallest frontier first)
 * - RandomPriorityExpansion: Null hypothesis (random selection)
 */

export { StandardBfsExpansion, type StandardBfsResult, type BfsExpansionStats } from './standard-bfs';

export {
  FrontierBalancedExpansion,
  type FrontierBalancedResult,
  type FrontierBalancedStats,
} from './frontier-balanced';

export {
  RandomPriorityExpansion,
  type RandomPriorityResult,
  type RandomPriorityStats,
} from './random-priority';
