/**
 * Core graph types and interfaces for BibGraph
 * Provider-agnostic definitions that work with any graph visualization library
 */

import type { EntityType } from "./entities"
import type { AuthorPosition } from "./graph-index-types"
import type { RelationType } from "./relationships"

export interface Position {
	x: number
	y: number
}

export interface ExternalIdentifier {
	type: "doi" | "orcid" | "issn_l" | "ror" | "wikidata"
	value: string
	url: string
}

export interface GraphNode {
	id: string // Always OpenAlex ID for internal consistency
	entityType: EntityType
	label: string
	entityId: string // OpenAlex ID
	x: number // XY coordinates for graph positioning
	y: number
	loading?: boolean // Optional loading state
	error?: string | Error // Optional error state

	// External identifiers (DOIs, ORCIDs, etc.)
	externalIds: ExternalIdentifier[]

	// Raw entity data - all display data extracted on-demand via helper functions
	entityData?: Record<string, unknown>

	// Node metadata for loading states, errors, etc.
	metadata?: Record<string, unknown>

	// Work-specific metadata flags (User Story 2)
	isXpac?: boolean // Indicates if this is an XPAC work (dataset/software/specimen/other)
	hasUnverifiedAuthor?: boolean // Indicates if work has authors without Author IDs
}

/**
 * Edge direction type
 * - outbound: Relationship stored on source entity (complete data)
 * - inbound: Relationship discovered via reverse lookup (potentially incomplete)
 */
export type EdgeDirection = 'outbound' | 'inbound'

export interface GraphEdge {
	id: string
	source: string // node id (entity that owns the relationship data)
	target: string // node id (entity being referenced)
	type: RelationType
	direction?: EdgeDirection // Direction reflects data ownership (optional during migration)
	label?: string
	weight?: number
	metadata?: Record<string, unknown> // Relationship-specific data from OpenAlex

	// Indexed edge properties (promoted from GraphEdgeRecord for weighted traversal)
	/**
	Topic relevance score (0-1) - for TOPIC edges
	 */
	score?: number
	/**
	Author position in authorship list - for AUTHORSHIP edges
	 */
	authorPosition?: AuthorPosition
	/**
	Whether this is the corresponding author - for AUTHORSHIP edges
	 */
	isCorresponding?: boolean
	/**
	Whether the publication is open access - for PUBLICATION edges
	 */
	isOpenAccess?: boolean
}

export interface GraphLayout {
	type: "force" | "hierarchical" | "circular" | "grid" | "force-deterministic" | "d3-force"
	options?: {
		iterations?: number
		strength?: number
		distance?: number
		center?: { x: number; y: number }
		preventOverlap?: boolean
		seed?: number // For deterministic layouts
		forceReLayout?: boolean // Force complete re-layout of all nodes
		// D3-force specific options
		linkDistance?: number
		linkStrength?: number
		chargeStrength?: number
		centerStrength?: number
		collisionRadius?: number
		collisionStrength?: number
		velocityDecay?: number
		alpha?: number
		alphaDecay?: number
	}
}

export interface GraphEvents {
	onNodeClick?: (node: GraphNode) => void
	onNodeHover?: (node: GraphNode | null) => void
	onNodeDoubleClick?: (node: GraphNode) => void
	onEdgeClick?: (edge: GraphEdge) => void
	onBackgroundClick?: () => void
	onSelectionChange?: (nodes: readonly GraphNode[], edges: readonly GraphEdge[]) => void
}

export interface GraphOptions {
	interactive?: boolean
	minimap?: boolean
	controls?: boolean
	physics?: boolean
	[key: string]: unknown
}

// URL Routing support
export type EntityIdentifier = string // Can be OpenAlex ID or external ID

// Provider types
export type ProviderType = "xyflow" | "d3" | "cytoscape"

// Search and filtering
export interface SearchOptions {
	query: string
	entityTypes: EntityType[]
	includeExternalIds?: boolean
	preferExternalIdResults?: boolean
	limit?: number
}

export interface SearchResult {
	id: string
	entityType: EntityType
	label: string
	description?: string
	externalIds: ExternalIdentifier[]
	url: string
}

// Graph data structures
export interface GraphData {
	nodes: GraphNode[]
	edges: GraphEdge[]
}

// Cache structures
export interface GraphCache {
	// Cache transformed graph data
	nodes: Map<string, GraphNode>
	edges: Map<string, GraphEdge>

	// Track what's been fetched
	expandedNodes: Set<string>
	fetchedRelationships: Map<string, Set<RelationType>>
}

// Statistics for graph analysis
export interface GraphStats {
	nodeCount: number
	edgeCount: number
	nodesByType: Record<EntityType, number>
	edgesByType: Record<RelationType, number>
	avgDegree: number
	maxDegree: number
	density: number
	connectedComponents: number
}

// Community detection results
export interface Community {
	id: string
	nodes: string[] // Node IDs
	size: number
	density: number
}

// Force simulation types
export interface ForceLink {
	source: string
	target: string
	distance?: number
}

export interface ForceSimulationNode extends Position {
	id: string
	[key: string]: unknown
}

export interface ForceSimulationTask {
	type: "force-simulation"
	nodes: ForceSimulationNode[]
	links: ForceLink[]
	options?: {
		iterations?: number
		linkDistance?: number
		linkStrength?: number
		chargeStrength?: number
		seed?: number
	}
}

// ============================================================================
// 3D Graph Visualization Types
// ============================================================================

/**
 * 3D position interface extending 2D Position
 */
export interface Position3D {
	x: number
	y: number
	z: number
}

/**
 * Visualization mode for graph rendering
 */
export type ViewMode = '2D' | '3D'

/**
 * Control mode for 3D camera interactions
 */
export type ControlMode = 'explore' | 'analyze' | 'present'

/**
 * GraphNode extended with 3D positioning and rendering properties
 */
export interface GraphNode3D extends Omit<GraphNode, 'x' | 'y'> {
	position: Position3D
	/**
	Current velocity in 3D space for physics simulation
	 */
	velocity?: Position3D
	/**
	Accumulated forces for simulation
	 */
	force?: Position3D
	/**
	Mass for physics calculations
	 */
	mass?: number
	/**
	Collision/space allocation radius
	 */
	radius?: number
	/**
	Override color for 3D context
	 */
	color?: string
	/**
	Transparency based on depth
	 */
	opacity?: number
	/**
	Size scaling factor
	 */
	scale?: number
	/**
	Bounding box for spatial queries
	 */
	bounds?: BoundingBox3D
	/**
	Current level-of-detail
	 */
	lodLevel?: number
}

/**
 * GraphEdge extended with 3D curve support
 */
export interface GraphEdge3D extends GraphEdge {
	/**
	3D curve control points for curved edges
	 */
	controlPoints?: Position3D[]
	/**
	Curve interpolation type
	 */
	curveType?: 'linear' | 'quadratic' | 'cubic'
	/**
	Edge width based on camera distance
	 */
	width?: number
	/**
	Transparency based on depth
	 */
	opacity?: number
	/**
	Bounding box for edge culling
	 */
	bounds?: BoundingBox3D
	/**
	Current level-of-detail
	 */
	lodLevel?: number
}

/**
 * 3D bounding box for spatial indexing and frustum culling
 */
export interface BoundingBox3D {
	min: Position3D
	max: Position3D
}

/**
 * Camera state for 3D visualization persistence
 */
export interface CameraState3D {
	position: Position3D
	target: Position3D
	up: Position3D
	/**
	Field of view in degrees
	 */
	fov?: number
	/**
	Zoom level
	 */
	zoom?: number
	/**
	Near clipping plane
	 */
	near?: number
	/**
	Far clipping plane
	 */
	far?: number
}

/**
 * Camera animation settings
 */
export interface CameraAnimation {
	/**
	Animation duration in milliseconds
	 */
	duration: number
	/**
	Easing function
	 */
	easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
	/**
	Callback when animation completes
	 */
	onComplete?: () => void
}

/**
 * Camera control configuration
 */
export interface ControlSettings {
	enableRotate: boolean
	enablePan: boolean
	enableZoom: boolean
	rotateSpeed: number
	panSpeed: number
	zoomSpeed: number
	dampingFactor: number
}

/**
 * Level-of-detail configuration for performance optimization
 */
export interface LODConfig {
	/**
	Distance thresholds for each level
	 */
	distances: number[]
	/**
	Rendering settings per level
	 */
	detailLevels: DetailLevel[]
	/**
	Smooth transition between levels
	 */
	transitionSmoothness: number
}

/**
 * Detail level configuration
 */
export interface DetailLevel {
	level: number
	maxDistance: number
	nodeRadius: number
	edgeWidth: number
	labelsVisible: boolean
	instancedRendering: boolean
	maxVisibleNodes: number
	useSimplifiedGeometry: boolean
}

/**
 * Performance metrics for 3D rendering
 */
export interface PerformanceMetrics3D {
	/**
	Current frames per second
	 */
	frameRate: number
	/**
	Frame time in milliseconds
	 */
	frameTime: number
	/**
	Number of draw calls per frame
	 */
	drawCalls: number
	/**
	Currently visible nodes
	 */
	visibleNodes: number
	/**
	Currently visible edges
	 */
	visibleEdges: number
	/**
	Current LOD level
	 */
	currentLODLevel: number
}

/**
 * 3D graph data container
 */
export interface GraphData3D {
	nodes: GraphNode3D[]
	edges: GraphEdge3D[]
}

/**
 * User preferences for 3D visualization
 */
export interface Visualization3DPreferences {
	defaultViewMode: ViewMode
	autoDetectWebGL: boolean
	enableAnimations: boolean
	animationSpeed: number
	enableShadows: boolean
	antialiasLevel: 'low' | 'medium' | 'high'
	performanceMode: 'quality' | 'balanced' | 'performance'
}

// ============================================================================
// 3D Type Guards
// ============================================================================

/**
 * Type guard for Position3D
 */
export const isPosition3D = (obj: unknown): obj is Position3D => obj !== null &&
		typeof obj === 'object' &&
		'x' in obj && 'y' in obj && 'z' in obj &&
		typeof obj.x === 'number' &&
		typeof obj.y === 'number' &&
		typeof obj.z === 'number';

/**
 * Type guard for GraphNode3D
 */
export const isGraphNode3D = (obj: unknown): obj is GraphNode3D => obj !== null &&
		typeof obj === 'object' &&
		'id' in obj && 'entityType' in obj && 'position' in obj &&
		isPosition3D(obj.position);

/**
 * Type guard for CameraState3D
 */
export const isCameraState3D = (obj: unknown): obj is CameraState3D => obj !== null &&
		typeof obj === 'object' &&
		'position' in obj && 'target' in obj && 'up' in obj &&
		isPosition3D(obj.position) &&
		isPosition3D(obj.target) &&
		isPosition3D(obj.up);
