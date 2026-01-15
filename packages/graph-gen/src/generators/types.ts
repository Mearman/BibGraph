/**
 * Shared types and utilities for graph generation
 */

import type { GraphSpec } from '../spec';

/**
 * Node in a generated test graph.
 */
export interface TestNode {
  id: string;
  type?: string; // For heterogeneous graphs
  data?: Record<string, unknown>;
  partition?: 'left' | 'right'; // For bipartite graphs
}

/**
 * Edge in a generated test graph.
 */
export interface TestEdge {
  source: string;
  target: string;
  weight?: number; // For weighted graphs
  type?: string; // For heterogeneous graphs
}

/**
 * Complete graph structure for testing.
 */
export interface TestGraph {
  nodes: TestNode[];
  edges: TestEdge[];
  spec: GraphSpec;
}

/**
 * Configuration for graph generation.
 */
export interface GraphGenerationConfig {
  /** Number of nodes to generate */
  nodeCount: number;

  /** Node type distribution (for heterogeneous graphs) */
  nodeTypes?: { type: string; proportion: number }[];

  /** Edge type distribution (for heterogeneous graphs) */
  edgeTypes?: { type: string; proportion: number }[];

  /** Weight range for weighted graphs */
  weightRange?: { min: number; max: number };

  /** Random seed for reproducibility */
  seed?: number;
}

/**
 * Simple seeded random number generator for reproducible tests.
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  integer(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(array: T[]): T {
    return array[this.integer(0, array.length - 1)];
  }

  sample<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => this.next() - 0.5);
    return shuffled.slice(0, count);
  }
}
