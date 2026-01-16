/**
 * Statistical significance testing for evaluation
 */

// Paired tests
export {
  pairedTTest,
  wilcoxonSignedRank,
} from './paired-tests';

// Bootstrap methods
export {
  bootstrapCI,
  bootstrapDifferenceTest,
} from './bootstrap';

// Multiple comparison correction
export {
  bonferroniCorrection,
  benjaminiHochberg,
  holmBonferroni,
  storeyQValues,
} from './multiple-comparison';

// Effect size measures
export {
  cohensD,
  cliffsDelta,
  glassDelta,
  rankBiserialCorrelation,
} from './effect-size';
