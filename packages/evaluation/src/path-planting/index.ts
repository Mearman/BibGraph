/**
 * Path planting infrastructure for evaluation
 *
 * Creates ground truth paths and noise paths for controlled MI experiments.
 */

export {
  plantGroundTruthPaths,
  type PlantedPathConfig,
  type PlantedPathResult,
} from './path-generator';

export {
  addNoisePaths,
} from './noise-generator';

export {
  plantHeterogeneousPaths,
  type HeterogeneousPathConfig,
  filterNodesByType as heterogeneousFilterNodesByType,
  pathFollowsTemplate,
} from './heterogeneous-planting';

export {
  plantCitationPaths,
  type CitationPathConfig,
  type CitationPathType,
} from './citation-planting';
