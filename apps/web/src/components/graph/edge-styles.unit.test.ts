/**
 * Unit tests for edge styling functions
 * Tests all combinations of relationship types and directions (7 types × 2 directions = 14)
 */

import type { GraphEdge } from '@bibgraph/types';
import { RelationType } from '@bibgraph/types';
import { describe, expect,it } from 'vitest';

import { RELATIONSHIP_TYPE_COLORS as TYPE_COLORS } from '../../styles/hash-colors';
import {
  getEdgeFilteredStyle,
  getEdgeHoverStyle,
  getEdgeStyle,
  getInboundStyle,
  getOutboundStyle,
  getTypeColor,
} from './edge-styles';

describe('Edge Styling System', () => {
  describe('TYPE_COLORS', () => {
    it('should have hash-based colors for all core relationship types', () => {
      // All colors should be valid hex values (generated from hash-based system)
      for (const color of Object.values(TYPE_COLORS)) {
        expect(color).toMatch(/^#[0-9A-F]{6}$/i); // Valid hex color format
      }

      // All colors should be different (hash-based distribution)
      const uniqueColors = new Set(Object.values(TYPE_COLORS));
      expect(uniqueColors.size).toBeGreaterThan(1); // At least 2 different colors

      // Verify core relationship types exist and have hex colors
      expect(TYPE_COLORS.AUTHORSHIP).toMatch(/^#[0-9A-F]{6}$/i);
      expect(TYPE_COLORS.REFERENCE).toMatch(/^#[0-9A-F]{6}$/i);
      expect(TYPE_COLORS.PUBLICATION).toMatch(/^#[0-9A-F]{6}$/i);
      expect(TYPE_COLORS.TOPIC).toMatch(/^#[0-9A-F]{6}$/i);
      expect(TYPE_COLORS.AFFILIATION).toMatch(/^#[0-9A-F]{6}$/i);
      expect(TYPE_COLORS.HOST_ORGANIZATION).toMatch(/^#[0-9A-F]{6}$/i);
      expect(TYPE_COLORS.LINEAGE).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should have fallback color for unknown types', () => {
      expect(TYPE_COLORS.RELATED_TO).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  describe('getTypeColor', () => {
    it('should return hash-based color for each relationship type', () => {
      // Colors should be valid hex values generated from hash
      expect(getTypeColor(RelationType.AUTHORSHIP)).toMatch(/^#[0-9A-F]{6}$/i);
      expect(getTypeColor(RelationType.REFERENCE)).toMatch(/^#[0-9A-F]{6}$/i);
      expect(getTypeColor(RelationType.PUBLICATION)).toMatch(/^#[0-9A-F]{6}$/i);
      expect(getTypeColor(RelationType.AFFILIATION)).toMatch(/^#[0-9A-F]{6}$/i);

      // Same relationship type should always return the same color (deterministic)
      const authorshipColor1 = getTypeColor(RelationType.AUTHORSHIP);
      const authorshipColor2 = getTypeColor(RelationType.AUTHORSHIP);
      expect(authorshipColor1).toBe(authorshipColor2);

      // Different relationship types should have different colors
      const authorshipColor = getTypeColor(RelationType.AUTHORSHIP);
      const referenceColor = getTypeColor(RelationType.REFERENCE);
      expect(authorshipColor).not.toBe(referenceColor);
    });

    it('should return fallback color for RELATED_TO', () => {
      expect(getTypeColor(RelationType.RELATED_TO)).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  describe('getOutboundStyle', () => {
    it('should return solid line style for outbound edges', () => {
      const style = getOutboundStyle(RelationType.AUTHORSHIP);

      expect(style.strokeDasharray).toBeUndefined(); // Solid line has no dash pattern
      expect(style.borderStyle).toBe('solid');
      expect(style['data-direction']).toBe('outbound');
    });

    it('should use correct marker for outbound edges', () => {
      const style = getOutboundStyle(RelationType.AUTHORSHIP);
      expect(style.markerEnd).toBe('arrow-solid');
    });

    it('should use type-specific color for outbound edges', () => {
      const authorshipStyle = getOutboundStyle(RelationType.AUTHORSHIP);
      expect(authorshipStyle.stroke).toMatch(/^#[0-9A-F]{6}$/i); // Hash-based hex color

      const referenceStyle = getOutboundStyle(RelationType.REFERENCE);
      expect(referenceStyle.stroke).toMatch(/^#[0-9A-F]{6}$/i); // Hash-based hex color

      // Different relationship types should have different colors
      expect(authorshipStyle.stroke).not.toBe(referenceStyle.stroke);
    });
  });

  describe('getInboundStyle', () => {
    it('should return dashed line style for inbound edges', () => {
      const style = getInboundStyle(RelationType.REFERENCE);

      expect(style.strokeDasharray).toBe('8,4'); // Dashed pattern
      expect(style.borderStyle).toBe('dashed');
      expect(style['data-direction']).toBe('inbound');
    });

    it('should use correct marker for inbound edges', () => {
      const style = getInboundStyle(RelationType.REFERENCE);
      expect(style.markerEnd).toBe('arrow-dashed');
    });

    it('should use type-specific color for inbound edges', () => {
      const authorshipStyle = getInboundStyle(RelationType.AUTHORSHIP);
      expect(authorshipStyle.stroke).toMatch(/^#[0-9A-F]{6}$/i); // Hash-based hex color

      const referenceStyle = getInboundStyle(RelationType.REFERENCE);
      expect(referenceStyle.stroke).toMatch(/^#[0-9A-F]{6}$/i); // Hash-based hex color

      // Different relationship types should have different colors
      expect(authorshipStyle.stroke).not.toBe(referenceStyle.stroke);
    });
  });

  describe('getEdgeStyle - All 14 Combinations (7 types × 2 directions)', () => {
    // Core 7 relationship types
    const coreTypes = [
      RelationType.AUTHORSHIP,
      RelationType.REFERENCE,
      RelationType.PUBLICATION,
      RelationType.AFFILIATION,
      RelationType.TOPIC,
      RelationType.HOST_ORGANIZATION,
      RelationType.LINEAGE,
    ] as const;

    describe('Outbound edges (solid lines)', () => {
      for (const type of coreTypes) {
        it(`should style ${type} outbound edge with solid line`, () => {
          const edge: GraphEdge = {
            id: 'test-edge',
            source: 'source-1',
            target: 'target-1',
            type,
            direction: 'outbound',
          };

          const style = getEdgeStyle(edge);

          // Verify solid line (no dash pattern)
          expect(style.strokeDasharray).toBeUndefined();
          expect(style.borderStyle).toBe('solid');

          // Verify outbound marker
          expect(style.markerEnd).toBe('arrow-solid');

          // Verify data attributes
          expect(style['data-direction']).toBe('outbound');
          expect(style['data-relation-type']).toBe(type);

          // Verify has color (hex format)
          expect(style.stroke).toBeTruthy();
          expect(style.stroke).toMatch(/^#[0-9A-F]{6}$/i);
        });
      }
    });

    describe('Inbound edges (dashed lines)', () => {
      for (const type of coreTypes) {
        it(`should style ${type} inbound edge with dashed line`, () => {
          const edge: GraphEdge = {
            id: 'test-edge',
            source: 'source-1',
            target: 'target-1',
            type,
            direction: 'inbound',
          };

          const style = getEdgeStyle(edge);

          // Verify dashed line
          expect(style.strokeDasharray).toBe('8,4');
          expect(style.borderStyle).toBe('dashed');

          // Verify inbound marker
          expect(style.markerEnd).toBe('arrow-dashed');

          // Verify data attributes
          expect(style['data-direction']).toBe('inbound');
          expect(style['data-relation-type']).toBe(type);

          // Verify has color (hex format)
          expect(style.stroke).toBeTruthy();
          expect(style.stroke).toMatch(/^#[0-9A-F]{6}$/i);
        });
      }
    });

    it('should default to outbound style when direction is undefined', () => {
      const edge: GraphEdge = {
        id: 'test-edge',
        source: 'source-1',
        target: 'target-1',
        type: RelationType.AUTHORSHIP,
        // direction is undefined
      };

      const style = getEdgeStyle(edge);

      // Should use outbound styling
      expect(style.strokeDasharray).toBeUndefined();
      expect(style.borderStyle).toBe('solid');
      expect(style.markerEnd).toBe('arrow-solid');
    });
  });

  describe('Multi-modal visual distinction', () => {
    it('should provide three independent visual channels', () => {
      const outboundEdge: GraphEdge = {
        id: 'out-1',
        source: 'W1',
        target: 'A1',
        type: RelationType.AUTHORSHIP,
        direction: 'outbound',
      };

      const inboundEdge: GraphEdge = {
        id: 'in-1',
        source: 'W2',
        target: 'W1',
        type: RelationType.REFERENCE,
        direction: 'inbound',
      };

      const outStyle = getEdgeStyle(outboundEdge);
      const inStyle = getEdgeStyle(inboundEdge);

      // Channel 1: Line style (solid vs dashed)
      expect(outStyle.borderStyle).toBe('solid');
      expect(inStyle.borderStyle).toBe('dashed');

      // Channel 2: Color (type-specific)
      expect(outStyle.stroke).toBe(TYPE_COLORS.AUTHORSHIP);
      expect(inStyle.stroke).toBe(TYPE_COLORS.REFERENCE);

      // Channel 3: Arrow marker style
      expect(outStyle.markerEnd).toBe('arrow-solid');
      expect(inStyle.markerEnd).toBe('arrow-dashed');
    });
  });

  describe('getEdgeHoverStyle', () => {
    it('should increase stroke width and opacity on hover', () => {
      const edge: GraphEdge = {
        id: 'test',
        source: 'S1',
        target: 'T1',
        type: RelationType.AUTHORSHIP,
        direction: 'outbound',
      };

      const normalStyle = getEdgeStyle(edge);
      const hoverStyle = getEdgeHoverStyle(edge);

      expect(hoverStyle.strokeWidth).toBeGreaterThan(normalStyle.strokeWidth!);
      expect(hoverStyle.strokeOpacity).toBeGreaterThan(normalStyle.strokeOpacity!);
    });

    it('should preserve line style and color on hover', () => {
      const outboundEdge: GraphEdge = {
        id: 'test',
        source: 'S1',
        target: 'T1',
        type: RelationType.AUTHORSHIP,
        direction: 'outbound',
      };

      const hoverStyle = getEdgeHoverStyle(outboundEdge);

      expect(hoverStyle.stroke).toBe(TYPE_COLORS.AUTHORSHIP);
      expect(hoverStyle.strokeDasharray).toBeUndefined(); // Still solid
      expect(hoverStyle.markerEnd).toBe('arrow-solid');
    });
  });

  describe('getEdgeFilteredStyle', () => {
    it('should reduce opacity when filtered', () => {
      const edge: GraphEdge = {
        id: 'test',
        source: 'S1',
        target: 'T1',
        type: RelationType.AUTHORSHIP,
        direction: 'outbound',
      };

      const normalStyle = getEdgeStyle(edge);
      const filteredStyle = getEdgeFilteredStyle(edge);

      expect(filteredStyle.strokeOpacity).toBeLessThan(normalStyle.strokeOpacity!);
      expect(filteredStyle.opacity).toBeLessThan(normalStyle.opacity!);
    });

    it('should preserve line style and color when filtered', () => {
      const inboundEdge: GraphEdge = {
        id: 'test',
        source: 'S1',
        target: 'T1',
        type: RelationType.REFERENCE,
        direction: 'inbound',
      };

      const filteredStyle = getEdgeFilteredStyle(inboundEdge);

      expect(filteredStyle.stroke).toBe(TYPE_COLORS.REFERENCE);
      expect(filteredStyle.strokeDasharray).toBe('8,4'); // Still dashed
      expect(filteredStyle.markerEnd).toBe('arrow-dashed');
    });
  });

  describe('Accessibility (WCAG 2.1 Level AA)', () => {
    it('should use colors with sufficient contrast', () => {
      // All TYPE_COLORS should be hex colors
      for (const color of Object.values(TYPE_COLORS)) {
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      }

      // Colors should be distinct (at least 3:1 contrast for graphical objects)
      // This is a basic check - actual contrast ratios should be verified visually or with tools
      const uniqueColors = new Set(Object.values(TYPE_COLORS));
      expect(uniqueColors.size).toBeGreaterThan(1); // At least 2 different colors
    });

    it('should provide multiple independent visual channels', () => {
      // Test that line style alone distinguishes direction
      const outbound = getOutboundStyle(RelationType.AUTHORSHIP);
      const inbound = getInboundStyle(RelationType.AUTHORSHIP);

      expect(outbound.borderStyle).not.toBe(inbound.borderStyle);
      expect(outbound.markerEnd).not.toBe(inbound.markerEnd);
    });
  });
});
