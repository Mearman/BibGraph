/**
 * Unit tests for graph spec constraints analyzer
 */
import { describe, it, expect } from 'vitest';
import {
  analyzeGraphSpecConstraints,
  isGraphSpecImpossible,
  getAdjustedValidationExpectations,
} from './constraints';
import type { GraphSpec } from './spec';

describe('analyzeGraphSpecConstraints', () => {
  describe('Completeness constraints', () => {
    it('should detect complete + unconstrained connectivity conflict', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'dense' },
        completeness: { kind: 'complete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = analyzeGraphSpecConstraints(spec);

      expect(result).toHaveLength(1);
      expect(result[0].property).toBe('connectivity/completeness');
      expect(result[0].severity).toBe('error');
      expect(result[0].reason).toContain('inherently connected');
    });

    it('should detect complete + acyclic conflict', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'unconstrained' },
        completeness: { kind: 'complete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = analyzeGraphSpecConstraints(spec);

      expect(result).toHaveLength(1);
      expect(result[0].property).toBe('completeness/cycles');
      expect(result[0].severity).toBe('error');
      expect(result[0].reason).toContain('contain cycles');
    });
  });

  describe('Multigraph constraints', () => {
    it('should detect multigraph + acyclic + connected + undirected conflict', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'multi' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const treeConflict = result.find(r => r.property === 'edgeMultiplicity/cycles/connectivity/directionality');
      expect(treeConflict).toBeDefined();
      expect(treeConflict?.severity).toBe('error');
    });

    it('should detect multigraph + acyclic for undirected graphs', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'sparse' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'multi' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const conflict = result.find(r => r.property === 'edgeMultiplicity/cycles/directionality');
      expect(conflict).toBeDefined();
      expect(conflict?.severity).toBe('error');
    });

    it('should warn about multigraph + acyclic for directed graphs', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'directed' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'multi' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const warning = result.find(r => r.property === 'edgeMultiplicity/cycles/directionality');
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('warning');
    });
  });

  describe('Self-loop constraints', () => {
    it('should detect self-loops + acyclic + directed conflict', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'directed' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'allowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const conflict = result.find(r => r.property === 'cycles/selfLoops');
      expect(conflict).toBeDefined();
      expect(conflict?.severity).toBe('error');
      expect(conflict?.reason).toContain('create cycles');
    });

    it('should not warn about self-loops + acyclic for undirected graphs', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'allowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const selfLoopConflict = result.find(r => r.property === 'cycles/selfLoops');
      expect(selfLoopConflict).toBeUndefined();
    });
  });

  describe('Tree density constraints', () => {
    it('should warn about tree density constraint', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const warning = result.find(r => r.property === 'cycles/density');
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('warning');
    });
  });

  describe('Planarity constraints', () => {
    it('should detect planar + complete graph conflict', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'dense' },
        completeness: { kind: 'complete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        embedding: { kind: 'planar' },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const conflict = result.find(r => r.property === 'embedding/completeness');
      expect(conflict).toBeDefined();
      expect(conflict?.severity).toBe('error');
      expect(conflict?.reason).toContain('K5');
    });

    it('should detect planar + K3,3 conflict', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'dense' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        embedding: { kind: 'planar' },
        completeBipartite: { kind: 'complete_bipartite', m: 3, n: 3 },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const conflict = result.find(r => r.property === 'embedding/completeBipartite');
      expect(conflict).toBeDefined();
      expect(conflict?.severity).toBe('error');
      expect(conflict?.reason).toContain('K3,3');
    });

    it('should allow planar + K2,3', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'dense' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        embedding: { kind: 'planar' },
        completeBipartite: { kind: 'complete_bipartite', m: 2, n: 3 },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const bipartiteConflict = result.find(r => r.property === 'embedding/completeBipartite');
      expect(bipartiteConflict).toBeUndefined();
    });
  });

  describe('Tournament constraints', () => {
    it('should detect tournament + undirected conflict', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'dense' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        tournament: { kind: 'tournament' },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const conflict = result.find(r => r.property === 'tournament/directionality');
      expect(conflict).toBeDefined();
      expect(conflict?.severity).toBe('error');
    });

    it('should warn about tournament + complete redundancy', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'directed' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'dense' },
        completeness: { kind: 'complete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        tournament: { kind: 'tournament' },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const warning = result.find(r => r.property === 'tournament/completeness');
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('warning');
    });
  });

  describe('Bipartite constraints', () => {
    it('should detect bipartite + cycles allowed warning', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        partiteness: { kind: 'bipartite' },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const warning = result.find(r => r.property === 'partiteness/cycles');
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('warning');
      expect(warning?.reason).toContain('even length');
    });

    it('should detect bipartite + 1-colorable conflict', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        partiteness: { kind: 'bipartite' },
        kColorable: { kind: 'k_colorable', k: 1 },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const conflict = result.find(r => r.property === 'partiteness/kColorable');
      expect(conflict).toBeDefined();
      expect(conflict?.severity).toBe('error');
    });
  });

  describe('Special graph structure constraints', () => {
    it('should detect star + cycles conflict', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'sparse' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        star: { kind: 'star' },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const conflict = result.find(r => r.property === 'star/cycles');
      expect(conflict).toBeDefined();
      expect(conflict?.severity).toBe('error');
    });

    it('should detect binary tree + cycles conflict', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'sparse' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        binaryTree: { kind: 'complete_binary' },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const conflict = result.find(r => r.property === 'binaryTree/cycles');
      expect(conflict).toBeDefined();
      expect(conflict?.severity).toBe('error');
    });
  });

  describe('Perfect graph constraints', () => {
    it('should detect chordal + imperfect conflict', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        chordal: { kind: 'chordal' },
        perfect: { kind: 'imperfect' },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const conflict = result.find(r => r.property === 'chordal/perfect');
      expect(conflict).toBeDefined();
      expect(conflict?.severity).toBe('error');
    });

    it('should detect interval + non-chordal conflict', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        interval: { kind: 'interval' },
        chordal: { kind: 'non_chordal' },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const conflict = result.find(r => r.property === 'interval/chordal');
      expect(conflict).toBeDefined();
      expect(conflict?.severity).toBe('error');
    });
  });

  describe('k-colorable constraints', () => {
    it('should detect k-colorable + chromatic number conflict', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        kColorable: { kind: 'k_colorable', k: 3 },
        chromaticNumber: { kind: 'chromatic_number', chi: 5 },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const conflict = result.find(r => r.property === 'kColorable/chromaticNumber');
      expect(conflict).toBeDefined();
      expect(conflict?.severity).toBe('error');
      expect(conflict?.reason).toContain('chi > k');
    });
  });

  describe('Treewidth constraints', () => {
    it('should detect planar + treewidth > 4 conflict', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        embedding: { kind: 'planar' },
        treewidth: { kind: 'treewidth', width: 5 },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const conflict = result.find(r => r.property === 'embedding/treewidth');
      expect(conflict).toBeDefined();
      expect(conflict?.severity).toBe('error');
    });

    it('should allow planar + treewidth ≤ 4', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        embedding: { kind: 'planar' },
        treewidth: { kind: 'treewidth', width: 3 },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const conflict = result.find(r => r.property === 'embedding/treewidth');
      expect(conflict).toBeUndefined();
    });
  });

  describe('Flow network constraints', () => {
    it('should detect flow network + undirected conflict', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        flowNetwork: { kind: 'flow_network', source: 'S', sink: 'T' },
      };

      const result = analyzeGraphSpecConstraints(spec);

      const conflict = result.find(r => r.property === 'flowNetwork/directionality');
      expect(conflict).toBeDefined();
      expect(conflict?.severity).toBe('error');
    });
  });

  describe('Valid combinations', () => {
    it('should return empty array for valid tree spec', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'unconstrained' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = analyzeGraphSpecConstraints(spec);

      expect(result).toHaveLength(0);
    });

    it('should return empty array for valid complete graph spec', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'dense' },
        completeness: { kind: 'complete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = analyzeGraphSpecConstraints(spec);

      expect(result).toHaveLength(0);
    });
  });
});

describe('isGraphSpecImpossible', () => {
  it('should return true for impossible specs', () => {
    const spec: GraphSpec = {
      directionality: { kind: 'undirected' },
      weighting: { kind: 'unweighted' },
      connectivity: { kind: 'unconstrained' },
      cycles: { kind: 'cycles_allowed' },
      density: { kind: 'dense' },
      completeness: { kind: 'complete' },
      edgeMultiplicity: { kind: 'simple' },
      selfLoops: { kind: 'disallowed' },
      schema: { kind: 'homogeneous' },
    };

    const result = isGraphSpecImpossible(spec);

    expect(result).toBe(true);
  });

  it('should return false for specs with only warnings', () => {
    const spec: GraphSpec = {
      directionality: { kind: 'undirected' },
      weighting: { kind: 'unweighted' },
      connectivity: { kind: 'connected' },
      cycles: { kind: 'acyclic' },
      density: { kind: 'moderate' },
      completeness: { kind: 'incomplete' },
      edgeMultiplicity: { kind: 'simple' },
      selfLoops: { kind: 'disallowed' },
      schema: { kind: 'homogeneous' },
    };

    const result = isGraphSpecImpossible(spec);

    expect(result).toBe(false);
  });

  it('should return false for valid specs', () => {
    const spec: GraphSpec = {
      directionality: { kind: 'undirected' },
      weighting: { kind: 'unweighted' },
      connectivity: { kind: 'connected' },
      cycles: { kind: 'acyclic' },
      density: { kind: 'unconstrained' },
      completeness: { kind: 'incomplete' },
      edgeMultiplicity: { kind: 'simple' },
      selfLoops: { kind: 'disallowed' },
      schema: { kind: 'homogeneous' },
    };

    const result = isGraphSpecImpossible(spec);

    expect(result).toBe(false);
  });
});

describe('getAdjustedValidationExpectations', () => {
  it('should return empty object for specs without warnings', () => {
    const spec: GraphSpec = {
      directionality: { kind: 'undirected' },
      weighting: { kind: 'unweighted' },
      connectivity: { kind: 'connected' },
      cycles: { kind: 'acyclic' },
      density: { kind: 'unconstrained' },
      completeness: { kind: 'incomplete' },
      edgeMultiplicity: { kind: 'simple' },
      selfLoops: { kind: 'disallowed' },
      schema: { kind: 'homogeneous' },
    };

    const result = getAdjustedValidationExpectations(spec);

    expect(Object.keys(result)).toHaveLength(0);
  });

  it('should return adjustments for multigraph + acyclic warning', () => {
    const spec: GraphSpec = {
      directionality: { kind: 'directed' },
      weighting: { kind: 'unweighted' },
      connectivity: { kind: 'connected' },
      cycles: { kind: 'acyclic' },
      density: { kind: 'moderate' },
      completeness: { kind: 'incomplete' },
      edgeMultiplicity: { kind: 'multi' },
      selfLoops: { kind: 'disallowed' },
      schema: { kind: 'homogeneous' },
    };

    const result = getAdjustedValidationExpectations(spec);

    expect(result.skipCycleValidation).toBe(true);
  });

  it('should return adjustments for tree density warning', () => {
    const spec: GraphSpec = {
      directionality: { kind: 'undirected' },
      weighting: { kind: 'unweighted' },
      connectivity: { kind: 'connected' },
      cycles: { kind: 'acyclic' },
      density: { kind: 'moderate' },
      completeness: { kind: 'incomplete' },
      edgeMultiplicity: { kind: 'simple' },
      selfLoops: { kind: 'disallowed' },
      schema: { kind: 'homogeneous' },
    };

    const result = getAdjustedValidationExpectations(spec);

    expect(result.relaxDensityValidation).toBe(true);
  });
});
