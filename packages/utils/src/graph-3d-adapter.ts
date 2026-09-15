/**
 * Graph3DAdapter - Utilities for converting between 2D and 3D graph representations
 *
 * Provides adapter functions for seamless conversion between GraphNode/GraphEdge
 * and their 3D counterparts (GraphNode3D/GraphEdge3D).
 */

import type {
	BoundingBox3D,
	EntityType,
	GraphEdge,
	GraphEdge3D,
	GraphNode,
	GraphNode3D,
	Position3D,
} from '@bibgraph/types'

/**
 * Configuration for 3D layout positioning
 */
export interface Layout3DConfig {
	/**
	Z-axis spread factor
	 */
	zSpread: number
	/**
	Base Z level for the graph
	 */
	baseZ: number
	/**
	Whether to use hierarchical positioning based on entity type
	 */
	useHierarchy: boolean
	/**
	Custom Z-level mapping for entity types
	 */
	entityZLevels?: Partial<Record<EntityType, number>>
}

/**
 * Default layout configuration
 */
const DEFAULT_LAYOUT_CONFIG: Layout3DConfig = {
	zSpread: 100,
	baseZ: 0,
	useHierarchy: true,
	entityZLevels: {
		domains: 150,
		fields: 100,
		subfields: 50,
		topics: 25,
		works: 0,
		authors: -25,
		institutions: -50,
		sources: -75,
		publishers: -100,
		funders: -125,
		concepts: 75,
		keywords: 60,
	},
}

const RANDOM_Z_SPREAD_CENTER = 0.5

/**
 * Convert a 2D GraphNode to a 3D GraphNode3D
 * @param node - 2D graph node
 * @param config - Optional layout configuration
 * @returns 3D graph node
 */
export const to3DNode = (node: GraphNode, config: Layout3DConfig = DEFAULT_LAYOUT_CONFIG): GraphNode3D => {
	// Calculate Z position based on entity type hierarchy or random spread
	const z = config.useHierarchy && config.entityZLevels
		? (config.entityZLevels[node.entityType] ?? config.baseZ)
		: config.baseZ + (Math.random() - RANDOM_Z_SPREAD_CENTER) * config.zSpread

	const { x, y, ...rest } = node

	return {
		...rest,
		position: { x, y, z },
	}
};

/**
 * Convert a 3D GraphNode3D to a 2D GraphNode
 * @param node3D - 3D graph node
 * @returns 2D graph node
 */
export const from3DNode = (node3D: GraphNode3D): GraphNode => ({
		id: node3D.id,
		entityId: node3D.entityId,
		entityType: node3D.entityType,
		label: node3D.label,
		x: node3D.position.x,
		y: node3D.position.y,
		externalIds: node3D.externalIds,
		entityData: node3D.entityData,
		metadata: node3D.metadata,
		loading: node3D.loading,
		error: node3D.error,
		isXpac: node3D.isXpac,
		hasUnverifiedAuthor: node3D.hasUnverifiedAuthor,
	});

/**
 * Calculate bounding box for a 3D edge
 */
const calculateEdgeBounds = (start: Readonly<Position3D>, end: Readonly<Position3D>, controlPoint?: Position3D): BoundingBox3D => {
	const points = [start, end]
	if (controlPoint) {
		points.push(controlPoint)
	}

	return {
		min: {
			x: Math.min(...points.map(p => p.x)),
			y: Math.min(...points.map(p => p.y)),
			z: Math.min(...points.map(p => p.z)),
		},
		max: {
			x: Math.max(...points.map(p => p.x)),
			y: Math.max(...points.map(p => p.y)),
			z: Math.max(...points.map(p => p.z)),
		},
	}
};

const EDGE_MIDPOINT_Z_OFFSET = 10

/**
 * Convert a 2D GraphEdge to a 3D GraphEdge3D
 * @param edge - 2D graph edge
 * @param nodes3D - Map of node IDs to 3D nodes (for control point calculation)
 * @returns 3D graph edge
 */
export const to3DEdge = (edge: GraphEdge, nodes3D?: Map<string, GraphNode3D>): GraphEdge3D => {
	const edge3D: GraphEdge3D = { ...edge }

	// Calculate control points for curved edges if nodes are provided
	if (nodes3D) {
		const sourceNode = nodes3D.get(edge.source)
		const targetNode = nodes3D.get(edge.target)

		if (sourceNode && targetNode) {
			// Create a midpoint control point with slight Z offset for visual separation
			const midpoint: Position3D = {
				x: (sourceNode.position.x + targetNode.position.x) / 2,
				y: (sourceNode.position.y + targetNode.position.y) / 2,
				z: (sourceNode.position.z + targetNode.position.z) / 2 + EDGE_MIDPOINT_Z_OFFSET,
			}
			edge3D.controlPoints = [midpoint]
			edge3D.curveType = 'quadratic'

			// Calculate bounding box for culling
			edge3D.bounds = calculateEdgeBounds(sourceNode.position, targetNode.position, midpoint)
		}
	}

	return edge3D
};

/**
 * Convert a 3D GraphEdge3D to a 2D GraphEdge
 * @param edge3D - 3D graph edge
 * @returns 2D graph edge
 */
export const from3DEdge = (edge3D: GraphEdge3D): GraphEdge => ({
		id: edge3D.id,
		source: edge3D.source,
		target: edge3D.target,
		type: edge3D.type,
		direction: edge3D.direction,
		label: edge3D.label,
		weight: edge3D.weight,
		metadata: edge3D.metadata,
	});

/**
 * Convert an entire 2D graph to 3D
 * @param nodes - Array of 2D graph nodes
 * @param edges - Array of 2D graph edges
 * @param config - Optional layout configuration
 * @returns Object containing 3D nodes and edges
 */
export const to3DGraph = (nodes: readonly GraphNode[], edges: readonly GraphEdge[], config: Layout3DConfig = DEFAULT_LAYOUT_CONFIG): { nodes3D: GraphNode3D[]; edges3D: GraphEdge3D[] } => {
	// Convert nodes first
	const nodes3D = nodes.map(node => to3DNode(node, config))

	// Create lookup map for edge conversion
	const nodeMap = new Map<string, GraphNode3D>()
	for (const node of nodes3D) nodeMap.set(node.id, node)

	// Convert edges with node references
	const edges3D = edges.map(edge => to3DEdge(edge, nodeMap))

	return { nodes3D, edges3D }
};

/**
 * Convert an entire 3D graph to 2D
 * @param nodes3D - Array of 3D graph nodes
 * @param edges3D - Array of 3D graph edges
 * @returns Object containing 2D nodes and edges
 */
export const from3DGraph = (nodes3D: readonly GraphNode3D[], edges3D: readonly GraphEdge3D[]): { nodes: GraphNode[]; edges: GraphEdge[] } => ({
		nodes: nodes3D.map(from3DNode),
		edges: edges3D.map(from3DEdge),
	});

/**
 * Calculate bounding box for a set of 3D nodes
 */
export const calculateGraphBounds = (nodes3D: readonly GraphNode3D[]): BoundingBox3D => {
	if (nodes3D.length === 0) {
		return {
			min: { x: 0, y: 0, z: 0 },
			max: { x: 0, y: 0, z: 0 },
		}
	}

	return {
		min: {
			x: Math.min(...nodes3D.map(n => n.position.x)),
			y: Math.min(...nodes3D.map(n => n.position.y)),
			z: Math.min(...nodes3D.map(n => n.position.z)),
		},
		max: {
			x: Math.max(...nodes3D.map(n => n.position.x)),
			y: Math.max(...nodes3D.map(n => n.position.y)),
			z: Math.max(...nodes3D.map(n => n.position.z)),
		},
	}
};

/**
 * Calculate the center point of a bounding box
 */
export const getBoundsCenter = (bounds: BoundingBox3D): Position3D => ({
		x: (bounds.min.x + bounds.max.x) / 2,
		y: (bounds.min.y + bounds.max.y) / 2,
		z: (bounds.min.z + bounds.max.z) / 2,
	});

/**
 * Calculate the size (dimensions) of a bounding box
 */
export const getBoundsSize = (bounds: BoundingBox3D): Position3D => ({
		x: bounds.max.x - bounds.min.x,
		y: bounds.max.y - bounds.min.y,
		z: bounds.max.z - bounds.min.z,
	});

/**
 * Check if a point is inside a bounding box
 */
export const isPointInBounds = (point: Readonly<Position3D>, bounds: BoundingBox3D): boolean => point.x >= bounds.min.x && point.x <= bounds.max.x &&
		point.y >= bounds.min.y && point.y <= bounds.max.y &&
		point.z >= bounds.min.z && point.z <= bounds.max.z;

/**
 * Check if two bounding boxes intersect
 */
export const doBoundsIntersect = (a: BoundingBox3D, b: BoundingBox3D): boolean => a.min.x <= b.max.x && a.max.x >= b.min.x &&
		a.min.y <= b.max.y && a.max.y >= b.min.y &&
		a.min.z <= b.max.z && a.max.z >= b.min.z;

/**
 * Expand a bounding box to include a point
 */
export const expandBounds = (bounds: BoundingBox3D, point: Readonly<Position3D>): BoundingBox3D => ({
		min: {
			x: Math.min(bounds.min.x, point.x),
			y: Math.min(bounds.min.y, point.y),
			z: Math.min(bounds.min.z, point.z),
		},
		max: {
			x: Math.max(bounds.max.x, point.x),
			y: Math.max(bounds.max.y, point.y),
			z: Math.max(bounds.max.z, point.z),
		},
	});

/**
 * Calculate distance between two 3D points
 */
export const distance3D = (a: Readonly<Position3D>, b: Readonly<Position3D>): number => {
	const dx = b.x - a.x
	const dy = b.y - a.y
	const dz = b.z - a.z
	return Math.hypot(dx, dy, dz)
};

/**
 * Linear interpolation between two 3D positions
 */
export const lerp3D = (a: Readonly<Position3D>, b: Readonly<Position3D>, t: number): Position3D => ({
		x: a.x + (b.x - a.x) * t,
		y: a.y + (b.y - a.y) * t,
		z: a.z + (b.z - a.z) * t,
	});

/**
 * Normalize a 3D vector
 */
export const normalize3D = (v: Readonly<Position3D>): Position3D => {
	const length_ = Math.hypot(v.x, v.y, v.z)
	if (length_ === 0) return { x: 0, y: 0, z: 0 }
	return {
		x: v.x / length_,
		y: v.y / length_,
		z: v.z / length_,
	}
};
