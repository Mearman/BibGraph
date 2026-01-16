import type { GraphSpec } from '../spec';
import { SeededRandom, type TestNode } from './types';
import type { GraphGenerationConfig } from '../generator';

/**
 * Generate nodes with appropriate types and partitions.
 * @param spec - Graph specification
 * @param config - Generation configuration
 * @param rng - Seeded random number generator
 * @returns Array of generated nodes
 */
export const generateNodes = (
  spec: GraphSpec,
  config: GraphGenerationConfig,
  rng: SeededRandom
): TestNode[] => {
  const nodes: TestNode[] = [];

  // For bipartite graphs, determine partition sizes
  let leftPartitionSize = 0;
  let rightPartitionSize = 0;

  if (spec.partiteness?.kind === "bipartite") {
    // Split roughly 50-50, but handle odd numbers
    leftPartitionSize = Math.floor(config.nodeCount / 2);
    rightPartitionSize = config.nodeCount - leftPartitionSize;
  } else if (spec.completeBipartite?.kind === "complete_bipartite") {
    // Use specified m, n sizes
    const { m, n } = spec.completeBipartite;
    leftPartitionSize = Math.min(m, config.nodeCount);
    rightPartitionSize = Math.min(n, config.nodeCount - leftPartitionSize);
  }

  for (let i = 0; i < config.nodeCount; i++) {
    const node: TestNode = {
      id: `N${i}`,
    };

    // Assign bipartite partition if needed
    if (spec.partiteness?.kind === "bipartite" || spec.completeBipartite?.kind === "complete_bipartite") {
      if (i < leftPartitionSize) {
        node.partition = "left";
      } else if (i < leftPartitionSize + rightPartitionSize) {
        node.partition = "right";
      }
    }

    if (spec.schema.kind === "heterogeneous" && config.nodeTypes) {
      // Assign type based on proportions
      const rand = rng.next();
      let cumulative = 0;
      for (const { type, proportion } of config.nodeTypes) {
        cumulative += proportion;
        if (rand < cumulative) {
          node.type = type;
          break;
        }
      }
      if (!node.type) {
        node.type = config.nodeTypes[config.nodeTypes.length - 1].type;
      }
    }

    nodes.push(node);
  }

  return nodes;
};
