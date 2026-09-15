/**
 * Component dependency mocking utilities
 * Provides mocks for complex external components and libraries
 */

import React from "react";
import { vi } from "vitest";

// Number of bytes per pixel in an RGBA ImageData buffer
const RGBA_BYTES_PER_PIXEL = 4;

/**
 * Mock XYFlow/React Flow components and hooks
 * These are heavy components that don't need to be tested in isolation
 */
export const mockXYFlow = () => {
  const mockNode = {
    id: "test-node",
    position: { x: 0, y: 0 },
    data: { label: "Test Node" },
    type: "default",
  };

  const mockEdge = {
    id: "test-edge",
    source: "test-source",
    target: "test-target",
    type: "default",
  };

  vi.doMock("@xyflow/react", () => ({
    ReactFlow: ({ children, ...properties }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(
        "div",
        { "data-testid": "@xyflow/react", ...properties },
        children,
      ),
    MiniMap: (properties: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "minimap", ...properties }),
    Controls: (properties: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "controls", ...properties }),
    Background: (properties: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "background", ...properties }),
    Panel: ({ children, ...properties }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(
        "div",
        { "data-testid": "panel", ...properties },
        children,
      ),
    Handle: (properties: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "handle", ...properties }),
    NodeResizer: (properties: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "node-resizer", ...properties }),

    // Hooks
    useNodesState: () => [[mockNode], vi.fn(), vi.fn()],
    useEdgesState: () => [[mockEdge], vi.fn(), vi.fn()],
    useReactFlow: () => ({
      getNodes: vi.fn(() => [mockNode]),
      getEdges: vi.fn(() => [mockEdge]),
      setNodes: vi.fn(),
      setEdges: vi.fn(),
      addNodes: vi.fn(),
      addEdges: vi.fn(),
      deleteElements: vi.fn(),
      fitView: vi.fn(),
      project: vi.fn(),
      getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
      setViewport: vi.fn(),
      screenToFlowPosition: vi.fn(),
      flowToScreenPosition: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      zoomTo: vi.fn(),
      getIntersectingNodes: vi.fn(() => []),
      isNodeIntersecting: vi.fn(() => false),
      updateNode: vi.fn(),
      updateNodeData: vi.fn(),
    }),
    useStore: vi.fn(),
    useStoreApi: vi.fn(),
    useKeyPress: vi.fn(),
    useOnSelectionChange: vi.fn(),
    useOnViewportChange: vi.fn(),
    useUpdateNodeInternals: vi.fn(),

    // Utilities
    addEdge: vi.fn(),
    applyEdgeChanges: vi.fn(),
    applyNodeChanges: vi.fn(),
    getConnectedEdges: vi.fn(() => []),
    getIncomers: vi.fn(() => []),
    getOutgoers: vi.fn(() => []),
    isEdge: vi.fn(),
    isNode: vi.fn(),

    // Provider
    ReactFlowProvider: async ({ children }: React.PropsWithChildren<Record<string, unknown>>) => children,

    // Types and constants
    Position: {
      Top: "top",
      Right: "right",
      Bottom: "bottom",
      Left: "left",
    },
    MarkerType: {
      Arrow: "arrow",
      ArrowClosed: "arrowclosed",
    },
    ConnectionMode: {
      Strict: "strict",
      Loose: "loose",
    },
  }));
};

/**
 * Mock D3 force simulation and related utilities
 */
export const mockD3Force = () => {
  const mockSimulation = {
    nodes: vi.fn().mockReturnThis(),
    force: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    restart: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    tick: vi.fn().mockReturnThis(),
    alpha: vi.fn().mockReturnThis(),
    alphaTarget: vi.fn().mockReturnThis(),
    alphaDecay: vi.fn().mockReturnThis(),
    velocityDecay: vi.fn().mockReturnThis(),
    find: vi.fn(),
  };

  vi.doMock("d3-force", () => ({
    forceSimulation: vi.fn(() => mockSimulation),
    forceLink: vi.fn(() => ({
      id: vi.fn().mockReturnThis(),
      distance: vi.fn().mockReturnThis(),
      strength: vi.fn().mockReturnThis(),
      iterations: vi.fn().mockReturnThis(),
    })),
    forceManyBody: vi.fn(() => ({
      strength: vi.fn().mockReturnThis(),
      theta: vi.fn().mockReturnThis(),
      distanceMin: vi.fn().mockReturnThis(),
      distanceMax: vi.fn().mockReturnThis(),
    })),
    forceCenter: vi.fn(() => ({
      x: vi.fn().mockReturnThis(),
      y: vi.fn().mockReturnThis(),
      strength: vi.fn().mockReturnThis(),
    })),
    forceCollide: vi.fn(() => ({
      radius: vi.fn().mockReturnThis(),
      strength: vi.fn().mockReturnThis(),
      iterations: vi.fn().mockReturnThis(),
    })),
    forceX: vi.fn(() => ({
      x: vi.fn().mockReturnThis(),
      strength: vi.fn().mockReturnThis(),
    })),
    forceY: vi.fn(() => ({
      y: vi.fn().mockReturnThis(),
      strength: vi.fn().mockReturnThis(),
    })),
  }));

  vi.doMock("d3-drag", () => ({
    drag: vi.fn(() => ({
      subject: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      touchable: vi.fn().mockReturnThis(),
      clickDistance: vi.fn().mockReturnThis(),
    })),
  }));

  vi.doMock("d3-selection", () => ({
    select: vi.fn(() => ({
      call: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      attr: vi.fn().mockReturnThis(),
      style: vi.fn().mockReturnThis(),
      classed: vi.fn().mockReturnThis(),
      data: vi.fn().mockReturnThis(),
      enter: vi.fn().mockReturnThis(),
      exit: vi.fn().mockReturnThis(),
      remove: vi.fn().mockReturnThis(),
      append: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
    })),
    selectAll: vi.fn(),
  }));
};

/**
 * Mock Web Workers for background processing
 */
export const mockWebWorker = (): any => {
  const mockWorker = {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onmessage: null,
    onerror: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };

  global.Worker = vi.fn().mockImplementation(() => mockWorker);

  return mockWorker;
};

/**
 * Mock Canvas API for components that use canvas rendering
 */
export const mockCanvas = (): unknown => {
  const mockContext = {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(RGBA_BYTES_PER_PIXEL) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
    transform: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    drawFocusIfNeeded: vi.fn(),
    clip: vi.fn(),
    isPointInPath: vi.fn(),
    isPointInStroke: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(),
    createRadialGradient: vi.fn(),
    createPattern: vi.fn(),
  };

  // Assigned via a PropertyDescriptor (whose `value` field is natively typed `any` in lib.es5.d.ts) rather than a type assertion, since the real overloaded `getContext` signature can't be satisfied structurally by a partial mock context.
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    value: vi.fn(() => mockContext),
    writable: true,
    configurable: true,
  });
  HTMLCanvasElement.prototype.toDataURL = vi.fn(
    () => "data:image/png;base64,test",
  );
  HTMLCanvasElement.prototype.toBlob = vi.fn((): void => {
    // No-op stub; tests that need the callback invoked set their own implementation
  });

  return mockContext;
};

/**
 * Mock IndexedDB for client-side storage testing
 */
export const mockIndexedDB = (): any => {
  const mockDB = {
    close: vi.fn(),
    createObjectStore: vi.fn(),
    deleteObjectStore: vi.fn(),
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => ({
        add: vi.fn(),
        put: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        count: vi.fn(),
        getAll: vi.fn(),
        getAllKeys: vi.fn(),
        openCursor: vi.fn(),
        openKeyCursor: vi.fn(),
      })),
      abort: vi.fn(),
      commit: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  const mockRequest = {
    result: mockDB,
    error: null,
    readyState: "done",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  // Assigned via a PropertyDescriptor (whose `value` field is natively typed `any` in lib.es5.d.ts) rather than a type assertion, since the real `IDBFactory` interface can't be satisfied structurally by a partial mock.
  Object.defineProperty(global, "indexedDB", {
    value: {
      open: vi.fn(() => mockRequest),
      deleteDatabase: vi.fn(() => mockRequest),
      databases: () => [],
      cmp: vi.fn(),
    },
    writable: true,
    configurable: true,
  });

  return { mockDB, mockRequest };
};

/**
 * Setup all component mocks at once
 */
export const setupComponentMocks = () => {
  mockXYFlow();
  mockD3Force();
  mockWebWorker();
  mockCanvas();
  mockIndexedDB();
};

/**
 * Reset all component mocks
 */
export const resetComponentMocks = () => {
  vi.clearAllMocks();
};
