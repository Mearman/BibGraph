/**
 * E2E test helper to populate graph store with test relationship data. Used by relationship visualization E2E tests (spec 016).
 */

import type { GraphEdge,GraphNode } from '@bibgraph/types';
import { RelationType } from '@bibgraph/types';
import type { Page } from '@playwright/test';

/**
 * Shape of the graph store actions this test helper expects to find exposed on `window` in development/test mode.
 */
interface TestGraphStoreActions {
  addNode: (node: GraphNode) => void;
  addNodes: (nodes: readonly GraphNode[]) => void;
  addEdges: (edges: readonly GraphEdge[]) => void;
  clear: () => void;
}

declare global {
  interface Window {
    graphStoreActions?: TestGraphStoreActions;
  }
}

/**
 * Populate graph with citation relationships for work W2741809807 Creates 3 citing works (incoming REFERENCE edges)
 */
export const populateWorkCitations = async (page: Page): Promise<void> => {
  await page.evaluate((referenceType) => {
    // Access the global graph store actions (exposed in development/test mode)
    const graphStore = window.graphStoreActions;

    console.log('[E2E] graphStoreActions available:', graphStore !== undefined);
    console.log('[E2E] Available methods:', graphStore !== undefined ? Object.keys(graphStore) : 'none');

    if (graphStore === undefined) {
      throw new Error('Graph store actions not available - ensure test environment is configured');
    }

    // Create target work node
    const workNode: GraphNode = {
      id: 'W2741809807',
      entityId: 'W2741809807',
      label: 'Test Work with Citations',
      entityType: 'works',
      entityData: {
        id: 'W2741809807',
        display_name: 'Test Work with Citations',
        type: 'article',
      },
      x: 0,
      y: 0,
      externalIds: [],
    };

    // Create 3 citing works
    const citingWorks: GraphNode[] = [
      {
        id: 'W100',
        entityId: 'W100',
        label: 'Citing Work 1',
        entityType: 'works',
        entityData: {
          id: 'W100',
          display_name: 'Citing Work 1',
          type: 'article',
        },
        x: 100,
        y: 0,
        externalIds: [],
      },
      {
        id: 'W101',
        entityId: 'W101',
        label: 'Citing Work 2',
        entityType: 'works',
        entityData: {
          id: 'W101',
          display_name: 'Citing Work 2',
          type: 'article',
        },
        x: 100,
        y: 100,
        externalIds: [],
      },
      {
        id: 'W102',
        entityId: 'W102',
        label: 'Citing Work 3',
        entityType: 'works',
        entityData: {
          id: 'W102',
          display_name: 'Citing Work 3',
          type: 'article',
        },
        x: 100,
        y: 200,
        externalIds: [],
      },
    ];

    // Create citation edges (citing work → cited work)
    const citationEdges: GraphEdge[] = [
      {
        id: 'E1',
        source: 'W100',
        target: 'W2741809807',
        type: referenceType,
        direction: 'inbound',
      },
      {
        id: 'E2',
        source: 'W101',
        target: 'W2741809807',
        type: referenceType,
        direction: 'inbound',
      },
      {
        id: 'E3',
        source: 'W102',
        target: 'W2741809807',
        type: referenceType,
        direction: 'inbound',
      },
    ];

    // Add nodes and edges to graph store
    graphStore.addNode(workNode);
    graphStore.addNodes(citingWorks);
    graphStore.addEdges(citationEdges);
  }, RelationType.REFERENCE);
};

/**
 * Populate graph with authorship relationships for author A123
 * Creates 2 authored works (incoming AUTHORSHIP edges from works to author)
 */
export const populateAuthorWorks = async (page: Page, authorId = 'A123'): Promise<void> => {
  await page.evaluate(({ aid, authorshipType }) => {
    const graphStore = window.graphStoreActions;
    if (graphStore === undefined) throw new Error('Graph store actions not available');

    const authorNode: GraphNode = {
      id: aid,
      entityId: aid,
      label: 'Test Author',
      entityType: 'authors',
      entityData: { id: aid, display_name: 'Test Author' },
      x: 0,
      y: 0,
      externalIds: [],
    };

    const works: GraphNode[] = [
      {
        id: 'W200',
        entityId: 'W200',
        label: 'Authored Work 1',
        entityType: 'works',
        entityData: { id: 'W200', display_name: 'Authored Work 1' },
        x: 100,
        y: 0,
        externalIds: [],
      },
      {
        id: 'W201',
        entityId: 'W201',
        label: 'Authored Work 2',
        entityType: 'works',
        entityData: { id: 'W201', display_name: 'Authored Work 2' },
        x: 100,
        y: 100,
        externalIds: [],
      },
    ];

    const authorshipEdges: GraphEdge[] = [
      {
        id: 'E10',
        source: 'W200',
        target: aid,
        type: authorshipType,
        direction: 'inbound',
      },
      {
        id: 'E11',
        source: 'W201',
        target: aid,
        type: authorshipType,
        direction: 'inbound',
      },
    ];

    graphStore.addNode(authorNode);
    graphStore.addNodes(works);
    graphStore.addEdges(authorshipEdges);
  }, { aid: authorId, authorshipType: RelationType.AUTHORSHIP });
};

/**
 * Clear all graph data (useful for test isolation)
 */
export const clearGraph = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const graphStoreActions = window.graphStoreActions;
    if (graphStoreActions !== undefined) {
      graphStoreActions.clear();
    }
  });
};
