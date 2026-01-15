/**
 * Experiment runner infrastructure
 */

export type {
  GraphSpec,
  MethodConfig,
  ExperimentConfig,
  FullExperimentConfig,
  MetricType,
  StatisticalTestType,
  PathRanker,
} from './experiment-config';

export {
  runExperiment,
  runCrossValidation,
} from './experiment-runner';

export {
  generateMarkdownReport,
  generateLatexTable,
  generateJSONSummary,
  generateHTMLReport,
} from './report-generator';
