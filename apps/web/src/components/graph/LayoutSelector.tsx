/**
 * Layout Selector Component
 *
 * Provides UI for selecting different graph layout algorithms:
 * - Force-directed (default)
 * - Hierarchical/tree layout
 * - Circular layout
 * - Bipartite layout (two-column)
 * - Timeline layout
 *
 * @module components/graph/LayoutSelector
 */

import type { GraphEdge, GraphNode } from '@bibgraph/types';
import { SegmentedControl, Stack } from '@mantine/core';
import { IconChartDots, IconGitBranch, IconHierarchy, IconRoute,IconTimeline } from '@tabler/icons-react';

import { ICON_SIZE } from '@/config/style-constants';
import type { GraphLayoutType } from '@/hooks/useGraphLayout';

/**
 * Layout options with metadata
 */
export interface LayoutOption {
  description: string;
  icon: React.ReactNode;
  label: string;
  value: GraphLayoutType;
}

/**
 * Layout options configuration
 */
export const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    description: 'Force-directed layout (physics simulation)',
    icon: <IconChartDots size={ICON_SIZE.SM} />,
    label: 'Force',
    value: 'force',
  },
  {
    description: 'Hierarchical tree layout',
    icon: <IconHierarchy size={ICON_SIZE.SM} />,
    label: 'Tree',
    value: 'hierarchical',
  },
  {
    description: 'Circular arrangement',
    icon: <IconRoute size={ICON_SIZE.SM} />,
    label: 'Circle',
    value: 'circular',
  },
  {
    description: 'Two-column bipartite layout',
    icon: <IconGitBranch size={ICON_SIZE.SM} />,
    label: 'Split',
    value: 'bipartite',
  },
  {
    description: 'Timeline-based layout',
    icon: <IconTimeline size={ICON_SIZE.SM} />,
    label: 'Timeline',
    value: 'timeline',
  },
];

/**
 * Empty arrays (defined outside component to prevent re-renders)
 */
const EMPTY_NODES: GraphNode[] = [];
const EMPTY_EDGES: GraphEdge[] = [];

/**
 * Layout selector component props
 */
export interface LayoutSelectorProps {
  /** Callback when layout changes */
  onChange: (layout: GraphLayoutType) => void;
  /** Edges for layout-specific options */
  edges?: GraphEdge[];
  /** Nodes for layout-specific options */
  nodes?: GraphNode[];
  /** Current layout type */
  value: GraphLayoutType;
}

/**
 * Layout selector UI component
 *
 * @param props
 * @param props.edges
 * @param props.nodes
 * @param props.onChange
 * @param props.value
 */
export const LayoutSelector: React.FC<LayoutSelectorProps> = (props) => {
  const { edges = EMPTY_EDGES, nodes = EMPTY_NODES, onChange, value } = props;
  // Only show layouts that make sense for the current graph
  const availableLayouts = LAYOUT_OPTIONS.filter((option) => {
    // Force is always available
    if (option.value === 'force') {
      return true;
    }

    // Hierarchical requires parent-child relationships
    if (option.value === 'hierarchical') {
      return edges.some((e) => e.type === 'AUTHORSHIP' || e.type === 'AFFILIATION' || e.type === 'REFERENCE');
    }

    // Bipartite requires a way to split nodes
    if (option.value === 'bipartite') {
      return nodes.some((n) => n.entityType === 'authors' || n.entityType === 'institutions');
    }

    // Timeline requires nodes with publication dates
    if (option.value === 'timeline') {
      return nodes.some((n) => 'publication_year' in n);
    }

    // Circular always works
    return true;
  });

  const data = availableLayouts.map((option) => ({
    label: option.label,
    value: option.value,
  }));

  if (data.length === 0) {
    return null;
  }

  return (
    <Stack gap="xs">
      <SegmentedControl
        data={data}
        size="xs"
        value={value}
        onChange={(newValue) => onChange(newValue as GraphLayoutType)}
      />
    </Stack>
  );
};
