/**
 * Graph Visualization Constants
 * Centralized configuration for graph rendering and simulation
 *
 * This file eliminates magic numbers across graph visualization components,
 * making defaults discoverable, documented, and easy to maintain.
 */

// =============================================================================
// SIMULATION PARAMETERS
// =============================================================================

/**
 * D3 force simulation configuration
 */
export const SIMULATION = {
  /**
  Default random seed for deterministic layouts (reproducibility)
   */
  DEFAULT_SEED: 42,
  /**
  Cooldown time before simulation stops (ms)
   */
  COOLDOWN_TIME_MS: 3000,
  /**
  Alpha decay rate - how quickly simulation cools down (higher = faster stop)
   */
  ALPHA_DECAY: 0.02,
  /**
  Velocity decay rate - friction factor (higher = more damping)
   */
  VELOCITY_DECAY: 0.3,
  /**
  Initial position spread range (nodes placed within ±INITIAL_SPREAD/2)
   */
  INITIAL_POSITION_SPREAD: 400,
} as const;

// =============================================================================
// NODE RENDERING
// =============================================================================

/**
 * Node visual styling defaults
 */
export const NODE = {
  /**
  Default node radius
   */
  DEFAULT_SIZE: 6,
  /**
  Highlighted node radius
   */
  HIGHLIGHTED_SIZE: 8,
  /**
  Border width for highlighted nodes
   */
  HIGHLIGHTED_BORDER_WIDTH: 2,
  /**
  Opacity for non-highlighted nodes in highlight mode
   */
  DIMMED_OPACITY: 0.2,
  /**
  Full opacity for highlighted nodes
   */
  FULL_OPACITY: 1,
} as const;

// =============================================================================
// LINK/EDGE RENDERING
// =============================================================================

/**
 * Edge/link visual styling defaults
 */
// Divisor used to derive the arrow head's 30-degree angle from a straight edge (Math.PI / 6 radians).
const ARROW_ANGLE_DEGREES_DIVISOR = 6;

export const LINK = {
  /**
  Default edge width
   */
  DEFAULT_WIDTH: 2,
  /**
  Edge width when highlighted in path mode
   */
  HIGHLIGHTED_WIDTH: 3,
  /**
  Default edge opacity
   */
  DEFAULT_OPACITY: 0.6,
  /**
  Edge opacity when highlighted
   */
  HIGHLIGHTED_OPACITY: 0.8,
  /**
  Opacity for non-highlighted edges in highlight mode
   */
  DIMMED_OPACITY: 0.1,
  /**
  Dash pattern for dashed edges (dash length, gap length)
   */
  DASH_PATTERN: 5,
  /**
  Arrow head length
   */
  ARROW_LENGTH: 8,
  /**
  Arrow head angle (radians) - forms 30° angle from edge line
   */
  ARROW_ANGLE: Math.PI / ARROW_ANGLE_DEGREES_DIVISOR,
} as const;

// =============================================================================
// LABEL RENDERING
// =============================================================================

/**
 * Node label rendering configuration
 */
export const LABEL = {
  /**
  Minimum zoom scale to show labels
   */
  ZOOM_THRESHOLD: 1.5,
  /**
  Base font size at zoom threshold
   */
  BASE_FONT_SIZE: 10,
  /**
  Minimum font size to prevent labels becoming too small
   */
  MIN_FONT_SIZE: 3,
  /**
  Vertical offset from node center to label top
   */
  VERTICAL_OFFSET: 2,
} as const;

// =============================================================================
// LOADING ANIMATION (EXPANDING NODES)
// =============================================================================

/**
 * Spinning ring animation for loading/expanding nodes
 */
// Fraction of a full turn (2*PI) each loading ring's arc sweeps: 270 degrees and 90 degrees respectively.
const PRIMARY_RING_ARC_TURN_FRACTION = 1.5;
const SECONDARY_RING_ARC_TURN_FRACTION = 0.5;

export const LOADING_RING = {
  /**
  Ring radius multiplier relative to node size
   */
  RADIUS_MULTIPLIER: 1.5,
  /**
  Ring stroke width multiplier relative to node size
   */
  WIDTH_MULTIPLIER: 0.3,
  /**
  Secondary ring width multiplier relative to primary
   */
  SECONDARY_WIDTH_RATIO: 0.6,
  /**
  Primary ring rotation period (ms) - full rotation
   */
  PRIMARY_ROTATION_PERIOD_MS: 1500,
  /**
  Secondary ring rotation period (ms) - faster for visual interest
   */
  SECONDARY_ROTATION_PERIOD_MS: 750,
  /**
  Primary ring arc length (radians) - 270° arc
   */
  PRIMARY_ARC_LENGTH: Math.PI * PRIMARY_RING_ARC_TURN_FRACTION,
  /**
  Secondary ring arc length (radians) - 90° arc
   */
  SECONDARY_ARC_LENGTH: Math.PI * SECONDARY_RING_ARC_TURN_FRACTION,
  /**
  Ring opacity
   */
  OPACITY: 0.8,
  /**
  Primary ring color (deep sky blue)
   */
  PRIMARY_COLOR: '#00bfff',
  /**
  Secondary ring color (white, for contrast)
   */
  SECONDARY_COLOR: '#ffffff',
} as const;

// =============================================================================
// TIMING
// =============================================================================

/**
 * Timing constants for animations and delays
 */
export const TIMING = {
  /**
  Delay before checking if graph ref is ready (ms)
   */
  GRAPH_REF_CHECK_DELAY_MS: 100,
  /**
  Delay before auto-fitting graph to view (ms) - allows simulation to settle
   */
  AUTO_FIT_DELAY_MS: 500,
  /**
  Animation duration for zoom-to-fit (ms)
   */
  ZOOM_TO_FIT_DURATION_MS: 400,
  /**
  Padding for zoom-to-fit (px)
   */
  ZOOM_TO_FIT_PADDING: 50,
} as const;

// =============================================================================
// CONTAINER
// =============================================================================

/**
 * Container sizing defaults
 */
export const CONTAINER = {
  /**
  Default container width when not specified
   */
  DEFAULT_WIDTH: 800,
  /**
  Default container height
   */
  DEFAULT_HEIGHT: 500,
} as const;

// =============================================================================
// 3D-SPECIFIC CONSTANTS
// =============================================================================

/**
 * 3D camera configuration
 */
export const CAMERA_3D = {
  /**
  Initial camera Z position (distance from origin)
   */
  INITIAL_Z_POSITION: 500,
  /**
  Minimum camera Z position (closest zoom)
   */
  MIN_Z_POSITION: 100,
  /**
  Camera movement distance per keyboard arrow press
   */
  KEYBOARD_PAN_DISTANCE: 50,
  /**
  Zoom step size for +/- keys
   */
  ZOOM_STEP: 100,
  /**
  Camera state save debounce delay (ms)
   */
  PERSISTENCE_DEBOUNCE_MS: 300,
} as const;

/**
 * 3D geometry configuration for Three.js rendering
 */
export const GEOMETRY_3D = {
  /**
  Sphere segments for high-quality LOD
   */
  HIGH_LOD_SEGMENTS: 16,
  /**
  Ring inner radius multiplier relative to node size
   */
  RING_INNER_RADIUS_MULTIPLIER: 1.2,
  /**
  Ring outer radius multiplier relative to node size
   */
  RING_OUTER_RADIUS_MULTIPLIER: 1.4,
  /**
  Spinning torus radius multiplier for loading indicator
   */
  TORUS_RADIUS_MULTIPLIER: 1.5,
  /**
  Spinning torus tube width multiplier
   */
  TORUS_TUBE_MULTIPLIER: 0.15,
  /**
  Arc tube width multiplier
   */
  ARC_TUBE_MULTIPLIER: 0.1,
  /**
  Torus tube segments
   */
  TORUS_TUBE_SEGMENTS: 8,
  /**
  Torus radial segments
   */
  TORUS_RADIAL_SEGMENTS: 32,
  /**
  Arc radial segments
   */
  ARC_RADIAL_SEGMENTS: 16,
  /**
  Arc angle (radians) - semicircle
   */
  ARC_ANGLE: Math.PI,
} as const;

/**
 * 3D material properties
 */
export const MATERIAL_3D = {
  /**
  Ring opacity for highlighted nodes
   */
  RING_OPACITY: 0.5,
  /**
  Spinning ring opacity
   */
  SPINNING_RING_OPACITY: 0.8,
  /**
  Arc opacity
   */
  ARC_OPACITY: 0.6,
  /**
  Emissive color multiplier for depth effect
   */
  EMISSIVE_MULTIPLIER: 0.2,
  /**
  Emissive intensity when highlighted
   */
  EMISSIVE_INTENSITY_HIGHLIGHTED: 0.3,
  /**
  Emissive intensity when not highlighted
   */
  EMISSIVE_INTENSITY_NORMAL: 0.1,
  /**
  Material shininess
   */
  SHININESS: 50,
  /**
  Opacity for non-highlighted nodes
   */
  DIMMED_NODE_OPACITY: 0.3,
} as const;

/**
 * 3D label configuration (sprite text)
 */
export const LABEL_3D = {
  /**
  Text height in 3D units
   */
  TEXT_HEIGHT: 4,
  /**
  Vertical offset from node center to label
   */
  VERTICAL_OFFSET: 5,
  /**
  Label padding
   */
  PADDING: 1,
  /**
  Label border radius
   */
  BORDER_RADIUS: 2,
  /**
  Background color when highlighted
   */
  HIGHLIGHTED_BACKGROUND: 'rgba(0,0,0,0.6)',
  /**
  Background color when not highlighted
   */
  NORMAL_BACKGROUND: 'rgba(0,0,0,0.3)',
  /**
  Text color when highlighted
   */
  HIGHLIGHTED_COLOR: '#ffffff',
  /**
  Text color when not highlighted
   */
  NORMAL_COLOR: '#888888',
} as const;

/**
 * 3D animation configuration
 */
export const ANIMATION_3D = {
  /**
  Rotation speed for spinning ring (radians per frame)
   */
  SPIN_SPEED: 0.03,
  /**
  Secondary spin multiplier for arc element
   */
  SECONDARY_SPIN_MULTIPLIER: 2,
} as const;

/**
 * 3D performance/LOD configuration
 */
export const PERFORMANCE_3D = {
  /**
  Target FPS for LOD manager
   */
  TARGET_FPS: 60,
  /**
  Minimum acceptable FPS
   */
  MIN_FPS: 30,
  /**
  FPS threshold for performance drop callback
   */
  FPS_THRESHOLD: 30,
  /**
  Jank score threshold for displaying jank indicator
   */
  JANK_DISPLAY_THRESHOLD: 10,
  /**
  Node count threshold for reduced warmup ticks
   */
  WARMUP_NODE_THRESHOLD: 100,
  /**
  Warmup ticks for small graphs
   */
  SMALL_GRAPH_WARMUP_TICKS: 50,
  /**
  Warmup ticks for large graphs
   */
  LARGE_GRAPH_WARMUP_TICKS: 100,
  /**
  Node count threshold for disabling cooldown ticks
   */
  COOLDOWN_NODE_THRESHOLD: 500,
  /**
  Cooldown ticks for normal graphs
   */
  NORMAL_COOLDOWN_TICKS: 100,
  /**
  Cooldown ticks for large graphs (disabled)
   */
  LARGE_GRAPH_COOLDOWN_TICKS: 0,
  /**
  Alpha min for large graphs
   */
  LARGE_GRAPH_ALPHA_MIN: 0.01,
  /**
  Alpha min for normal graphs
   */
  NORMAL_ALPHA_MIN: 0.001,
} as const;

/**
 * 3D colors (hex for Three.js)
 */
export const COLORS_3D = {
  /**
  Loading indicator color (deep sky blue)
   */
  LOADING_INDICATOR: 0x00_BF_FF,
  /**
  Ring and highlight accent color (white)
   */
  RING_ACCENT: 0xFF_FF_FF,
  /**
  Default fallback color
   */
  DEFAULT_FALLBACK: '#888888',
  /**
  Path highlight color (cornflower blue)
   */
  PATH_HIGHLIGHT: 'rgba(100, 149, 237, 0.8)',
  /**
  Default link color
   */
  DEFAULT_LINK: 'rgba(150, 150, 150, 0.6)',
  /**
  Dimmed link color
   */
  DIMMED_LINK: 'rgba(100, 100, 100, 0.2)',
} as const;

/**
 * 3D UI overlay configuration
 */
export const OVERLAY_3D = {
  /**
  Performance overlay position offset (px)
   */
  POSITION_OFFSET: 8,
  /**
  Performance overlay minimum width (px)
   */
  MIN_WIDTH: 140,
} as const;
