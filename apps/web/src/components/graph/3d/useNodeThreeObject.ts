/**
 * useNodeThreeObject - Hook for 3D node rendering with Three.js
 *
 * Creates Three.js objects for graph nodes with:
 * - LOD (Level of Detail) based on camera distance
 * - Highlighted/dimmed states
 * - Expanding node animation (spinning ring)
 * - Sprite text labels
 */

import type { GraphNode } from '@bibgraph/types';
import { GraphLODManager } from '@bibgraph/utils';
import { useCallback, useRef } from 'react';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';

import {
  ANIMATION_3D,
  COLORS_3D,
  GEOMETRY_3D,
  LABEL_3D,
  MATERIAL_3D,
  NODE,
} from '../constants';
import type { NodeStyle } from '../types';
import { ENTITY_TYPE_COLORS, getDefaultNodeStyle } from './style-helpers';
import type { ForceGraphNode, LODRenderSettings, Vector3D } from './types';

export interface UseNodeThreeObjectOptions {
  /** Function to check if a node is highlighted */
  isNodeHighlighted: (nodeId: string) => boolean;
  /** Set of node IDs currently being expanded (loading) */
  expandingNodeIds: Set<string>;
  /** Community assignments: nodeId -> communityId */
  communityAssignments?: Map<string, number>;
  /** Community colors: communityId -> color */
  communityColors?: Map<number, string>;
  /** Custom node style override function */
  getNodeStyle?: (
    node: GraphNode,
    isHighlighted: boolean,
    communityId?: number
  ) => NodeStyle;
  /** LOD manager for adaptive quality */
  lodManager: GraphLODManager | null;
}

export interface UseNodeThreeObjectReturn {
  /** Callback function for react-force-graph-3d nodeThreeObject prop */
  nodeThreeObject: (node: ForceGraphNode) => THREE.Object3D;
  /** Ref to current camera position for LOD calculations */
  cameraPositionRef: React.RefObject<Vector3D>;
}

/**
 * Default LOD render settings when LOD manager is not available
 */
const DEFAULT_LOD_SETTINGS: LODRenderSettings = {
  segments: GEOMETRY_3D.HIGH_LOD_SEGMENTS,
  showLabel: true,
  materialType: 'phong',
  useRing: true,
};

/**
 * Create the main sphere mesh for a node
 * @param baseSize
 * @param color
 * @param opacity
 * @param isHighlighted
 * @param lodSettings
 */
const createNodeSphere = (
  baseSize: number,
  color: string,
  opacity: number,
  isHighlighted: boolean,
  lodSettings: LODRenderSettings
): THREE.Mesh => {
  const geometry = new THREE.SphereGeometry(
    baseSize,
    lodSettings.segments,
    lodSettings.segments
  );

  let material: THREE.Material;
  if (lodSettings.materialType === 'phong') {
    // High quality: MeshPhongMaterial for better lighting and depth perception
    material = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity,
      emissive: new THREE.Color(color).multiplyScalar(MATERIAL_3D.EMISSIVE_MULTIPLIER),
      emissiveIntensity: isHighlighted
        ? MATERIAL_3D.EMISSIVE_INTENSITY_HIGHLIGHTED
        : MATERIAL_3D.EMISSIVE_INTENSITY_NORMAL,
      shininess: MATERIAL_3D.SHININESS,
    });
  } else {
    // Low quality: MeshBasicMaterial (faster, no lighting calculations)
    material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
    });
  }

  return new THREE.Mesh(geometry, material);
};

/**
 * Create highlight ring for a node
 * @param baseSize
 * @param segments
 */
const createHighlightRing = (
  baseSize: number,
  segments: number
): THREE.Mesh => {
  const ringGeometry = new THREE.RingGeometry(
    baseSize * GEOMETRY_3D.RING_INNER_RADIUS_MULTIPLIER,
    baseSize * GEOMETRY_3D.RING_OUTER_RADIUS_MULTIPLIER,
    segments * 2
  );
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: COLORS_3D.RING_ACCENT,
    transparent: true,
    opacity: MATERIAL_3D.RING_OPACITY,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2; // Face camera
  return ring;
};

/**
 * Create spinning loading indicator for expanding nodes
 * @param baseSize
 */
const createSpinningRing = (baseSize: number): THREE.Group => {
  const group = new THREE.Group();

  // Main spinning ring
  const spinningRingGeometry = new THREE.TorusGeometry(
    baseSize * GEOMETRY_3D.TORUS_RADIUS_MULTIPLIER,
    baseSize * GEOMETRY_3D.TORUS_TUBE_MULTIPLIER,
    GEOMETRY_3D.TORUS_TUBE_SEGMENTS,
    GEOMETRY_3D.TORUS_RADIAL_SEGMENTS
  );
  const spinningRingMaterial = new THREE.MeshBasicMaterial({
    color: COLORS_3D.LOADING_INDICATOR,
    transparent: true,
    opacity: MATERIAL_3D.SPINNING_RING_OPACITY,
  });
  const spinningRing = new THREE.Mesh(spinningRingGeometry, spinningRingMaterial);
  spinningRing.rotation.x = Math.PI / 2;
  spinningRing.userData.isSpinningRing = true;
  group.add(spinningRing);

  // Secondary partial arc for visual interest
  const arcGeometry = new THREE.TorusGeometry(
    baseSize * GEOMETRY_3D.TORUS_RADIUS_MULTIPLIER,
    baseSize * GEOMETRY_3D.ARC_TUBE_MULTIPLIER,
    GEOMETRY_3D.TORUS_TUBE_SEGMENTS,
    GEOMETRY_3D.ARC_RADIAL_SEGMENTS,
    GEOMETRY_3D.ARC_ANGLE
  );
  const arcMaterial = new THREE.MeshBasicMaterial({
    color: COLORS_3D.RING_ACCENT,
    transparent: true,
    opacity: MATERIAL_3D.ARC_OPACITY,
  });
  const arc = new THREE.Mesh(arcGeometry, arcMaterial);
  arc.rotation.x = Math.PI / 2;
  arc.userData.isSpinningRing = true;
  arc.userData.spinSpeed = ANIMATION_3D.SECONDARY_SPIN_MULTIPLIER;
  group.add(arc);

  return group;
};

/**
 * Create label sprite for a node
 * @param label
 * @param baseSize
 * @param isHighlighted
 */
const createLabelSprite = (
  label: string,
  baseSize: number,
  isHighlighted: boolean
): SpriteText => {
  const sprite = new SpriteText(label);
  sprite.color = isHighlighted ? LABEL_3D.HIGHLIGHTED_COLOR : LABEL_3D.NORMAL_COLOR;
  sprite.textHeight = LABEL_3D.TEXT_HEIGHT;
  sprite.position.y = baseSize + LABEL_3D.VERTICAL_OFFSET;
  sprite.backgroundColor = isHighlighted
    ? LABEL_3D.HIGHLIGHTED_BACKGROUND
    : LABEL_3D.NORMAL_BACKGROUND;
  sprite.padding = LABEL_3D.PADDING;
  sprite.borderRadius = LABEL_3D.BORDER_RADIUS;
  return sprite;
};

/**
 * Hook for creating 3D node objects with LOD support
 *
 * Returns a callback function suitable for react-force-graph-3d's nodeThreeObject prop.
 * Handles:
 * - LOD-based quality adjustment
 * - Highlighted/dimmed visual states
 * - Expanding node animations
 * - Label sprites
 * @param root0
 * @param root0.isNodeHighlighted
 * @param root0.expandingNodeIds
 * @param root0.communityAssignments
 * @param root0.communityColors
 * @param root0.getNodeStyle
 * @param root0.lodManager
 */
export const useNodeThreeObject = ({
  isNodeHighlighted,
  expandingNodeIds,
  communityAssignments,
  communityColors,
  getNodeStyle: customGetNodeStyle,
  lodManager,
}: UseNodeThreeObjectOptions): UseNodeThreeObjectReturn => {
  // Track camera position for LOD calculations
  const cameraPositionRef = useRef<Vector3D>({ x: 0, y: 0, z: 500 });

  const nodeThreeObject = useCallback(
    (node: ForceGraphNode): THREE.Object3D => {
      const isHighlighted = isNodeHighlighted(node.id);
      const isExpanding = expandingNodeIds.has(node.id);
      const communityId = communityAssignments?.get(node.id);

      // Get style from custom function or defaults
      const style = customGetNodeStyle
        ? customGetNodeStyle(node.originalNode, isHighlighted, communityId)
        : getDefaultNodeStyle(node, isHighlighted, communityId, communityColors);

      const color =
        style.color ?? ENTITY_TYPE_COLORS[node.entityType] ?? COLORS_3D.DEFAULT_FALLBACK;
      const baseSize = style.size ?? NODE.DEFAULT_SIZE;
      const opacity = isHighlighted
        ? (style.opacity ?? NODE.FULL_OPACITY)
        : MATERIAL_3D.DIMMED_NODE_OPACITY;

      // Calculate LOD based on distance to camera
      let lodSettings: LODRenderSettings = DEFAULT_LOD_SETTINGS;

      if (lodManager && node.x !== undefined && node.y !== undefined && node.z !== undefined) {
        const lodLevel = lodManager.getEffectiveLOD(
          { x: node.x, y: node.y, z: node.z ?? 0 },
          cameraPositionRef.current
        );
        lodSettings = lodManager.getNodeRenderSettings(lodLevel);
      }

      // Create group to hold sphere, ring, and label
      const group = new THREE.Group();

      // Add highlight ring for highlighted nodes (only at high LOD)
      if (isHighlighted && lodSettings.useRing && !isExpanding) {
        group.add(createHighlightRing(baseSize, lodSettings.segments));
      }

      // Add spinning ring for expanding nodes (loading indicator)
      if (isExpanding) {
        const spinningRing = createSpinningRing(baseSize);
        spinningRing.children.forEach((child) => group.add(child));
      }

      // Add main sphere
      group.add(
        createNodeSphere(baseSize, color, opacity, isHighlighted, lodSettings)
      );

      // Add label sprite if LOD allows
      if (lodSettings.showLabel) {
        group.add(createLabelSprite(node.label, baseSize, isHighlighted));
      }

      return group;
    },
    [
      isNodeHighlighted,
      expandingNodeIds,
      communityAssignments,
      communityColors,
      customGetNodeStyle,
      lodManager,
    ]
  );

  return { nodeThreeObject, cameraPositionRef };
};

/**
 * Animate spinning rings in a Three.js scene
 *
 * Call this in your render loop to animate loading indicators.
 * @param scene
 */
export const animateSpinningRings = (scene: THREE.Scene | undefined): void => {
  if (!scene) return;

  scene.traverse((object: THREE.Object3D) => {
    if (object.userData.isSpinningRing) {
      const spinSpeed = (object.userData.spinSpeed as number | undefined) ?? 1;
      object.rotation.z += ANIMATION_3D.SPIN_SPEED * spinSpeed;
    }
  });
};
