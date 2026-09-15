/**
 * Octree - 3D spatial indexing data structure
 *
 * Provides efficient spatial queries for 3D point data:
 * - Point insertion and removal
 * - Range queries (find all points in a bounding box)
 * - Nearest neighbor queries
 * - Ray intersection queries
 *
 * Used for optimizing 3D graph visualization operations like:
 * - Frustum culling (determining visible nodes)
 * - Node selection (finding nodes near a click point)
 * - Collision detection
 */

import type { BoundingBox3D,Position3D } from '@bibgraph/types';

/**
 * Item stored in the octree with associated data
 */
export interface OctreeItem<T> {
  position: Position3D;
  data: T;
}

/**
 * Octree configuration options
 */
export interface OctreeConfig {
  /**
  Maximum items per node before subdivision (default: 8)
   */
  maxItems?: number;
  /**
  Maximum depth of the tree (default: 8)
   */
  maxDepth?: number;
  /**
  Minimum node size (default: 1)
   */
  minSize?: number;
}

const DEFAULT_CONFIG: Required<OctreeConfig> = {
  maxItems: 8,
  maxDepth: 8,
  minSize: 1,
};

/**
Octant bit set when a position's x coordinate is at or past the node's centre.
 */
const OCTANT_X_BIT = 1;
/**
Octant bit set when a position's y coordinate is at or past the node's centre.
 */
const OCTANT_Y_BIT = 2;
/**
Octant bit set when a position's z coordinate is at or past the node's centre.
 */
const OCTANT_Z_BIT = 4;
/**
Maximum ray-to-point distance, in world units, for a queryRay hit to be reported.
 */
const RAY_PROXIMITY_THRESHOLD = 10;
/**
Fraction of an item set's own bounding-box extent added as padding around auto-computed octree bounds.
 */
const BOUNDS_PADDING_RATIO = 0.1;

/**
 * Octree node representing a cubic region of 3D space
 */
class OctreeNode<T> {
  bounds: BoundingBox3D;
  items: OctreeItem<T>[];
  children: OctreeNode<T>[] | null;
  depth: number;

  constructor(bounds: BoundingBox3D, depth: number) {
    this.bounds = bounds;
    this.items = [];
    this.children = null;
    this.depth = depth;
  }

  /**
   * Check if this node is a leaf (no children)
   */
  isLeaf(): boolean {
    return this.children === null;
  }

  /**
   * Get the center point of this node's bounds
   */
  getCenter(): Position3D {
    return {
      x: (this.bounds.min.x + this.bounds.max.x) / 2,
      y: (this.bounds.min.y + this.bounds.max.y) / 2,
      z: (this.bounds.min.z + this.bounds.max.z) / 2,
    };
  }

  /**
   * Get the size of this node
   */
  getSize(): number {
    return this.bounds.max.x - this.bounds.min.x;
  }
}

/**
 * Octree spatial index for 3D points
 */
export class Octree<T> {
  private root: OctreeNode<T>;
  private readonly config: Required<OctreeConfig>;
  private itemCount: number;

  /**
   * Create a new Octree
   * @param bounds - The bounding box containing all points
   * @param config - Configuration options
   */
  constructor(bounds: BoundingBox3D, config: Readonly<OctreeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.root = new OctreeNode<T>(bounds, 0);
    this.itemCount = 0;
  }

  /**
   * Get the number of items in the tree
   */
  get size(): number {
    return this.itemCount;
  }

  /**
   * Get the bounds of the octree
   */
  get bounds(): BoundingBox3D {
    return this.root.bounds;
  }

  /**
   * Insert an item into the octree
   * @param position - 3D position of the item
   * @param data - Associated data
   * @returns true if inserted successfully
   */
  insert(position: Readonly<Position3D>, data: T): boolean {
    if (!this.containsPoint(this.root.bounds, position)) {
      return false;
    }

    this.insertIntoNode(this.root, { position, data });
    this.itemCount++;
    return true;
  }

  /**
   * Remove an item from the octree
   * @param position - Position of the item to remove
   * @param data - Data to match (uses reference equality)
   * @returns true if removed successfully
   */
  remove(position: Readonly<Position3D>, data: T): boolean {
    const isRemoved = this.removeFromNode(this.root, position, data);
    if (isRemoved) {
      this.itemCount--;
    }
    return isRemoved;
  }

  /**
   * Clear all items from the octree
   */
  clear(): void {
    this.root = new OctreeNode<T>(this.root.bounds, 0);
    this.itemCount = 0;
  }

  /**
   * Query all items within a bounding box
   * @param queryBounds - The bounding box to search within
   * @returns Array of items within the bounds
   */
  queryRange(queryBounds: BoundingBox3D): OctreeItem<T>[] {
    return this.queryRangeNode(this.root, queryBounds);
  }

  /**
   * Query all items within a sphere
   * @param center - Center of the sphere
   * @param radius - Radius of the sphere
   * @returns Array of items within the sphere
   */
  querySphere(center: Readonly<Position3D>, radius: number): OctreeItem<T>[] {
    // First query the bounding box of the sphere for efficiency
    const sphereBounds: BoundingBox3D = {
      min: {
        x: center.x - radius,
        y: center.y - radius,
        z: center.z - radius,
      },
      max: {
        x: center.x + radius,
        y: center.y + radius,
        z: center.z + radius,
      },
    };

    const candidates = this.queryRange(sphereBounds);
    const radiusSquared = radius * radius;

    return candidates.filter(item => {
      const dx = item.position.x - center.x;
      const dy = item.position.y - center.y;
      const dz = item.position.z - center.z;
      return dx * dx + dy * dy + dz * dz <= radiusSquared;
    });
  }

  /**
   * Find the nearest neighbor to a point
   * @param point - The query point
   * @param maxDistance - Maximum search distance (optional)
   * @returns The nearest item or null if none found
   */
  findNearest(point: Readonly<Position3D>, maxDistance?: number): OctreeItem<T> | null {
    let nearest: OctreeItem<T> | null = null;
    let nearestDistributionSq = maxDistance === undefined ? Infinity : maxDistance * maxDistance;

    this.findNearestNode(this.root, point, (item, distributionSq) => {
      if (!(distributionSq < nearestDistributionSq)) {
      	return;
      }

      nearest = item;
      nearestDistributionSq = distributionSq;
    });

    return nearest;
  }

  /**
   * Find the k nearest neighbors to a point
   * @param point - The query point
   * @param k - Number of neighbors to find
   * @param maxDistance - Maximum search distance (optional)
   * @returns Array of nearest items sorted by distance
   */
  findKNearest(point: Readonly<Position3D>, k: number, maxDistance?: number): OctreeItem<T>[] {
    const candidates: { item: OctreeItem<T>; distSq: number }[] = [];
    const maxDistributionSq = maxDistance === undefined ? Infinity : maxDistance * maxDistance;

    this.findNearestNode(this.root, point, (item, distributionSq) => {
      if (distributionSq <= maxDistributionSq) {
        candidates.push({ item, distSq: distributionSq });
      }
    });

    // Sort by distance and return top k
    candidates.sort((a, b) => a.distSq - b.distSq);
    return candidates.slice(0, k).map(c => c.item);
  }

  /**
   * Query items that intersect a ray
   * @param origin - Ray origin
   * @param direction - Ray direction (should be normalized)
   * @param maxDistance - Maximum distance along ray
   * @returns Array of items that intersect the ray
   */
  queryRay(
    origin: Readonly<Position3D>,
    direction: Readonly<Position3D>,
    maxDistance = Infinity
  ): OctreeItem<T>[] {
    return this.queryRayNode(this.root, origin, direction, maxDistance);
  }

  /**
   * Get all items in the octree
   */
  getAllItems(): OctreeItem<T>[] {
    return this.collectAllItems(this.root);
  }

  /**
   * Rebuild the octree with new bounds
   * @param newBounds - New bounding box
   */
  rebuild(newBounds: BoundingBox3D): void {
    const items = this.getAllItems();
    this.root = new OctreeNode<T>(newBounds, 0);
    this.itemCount = 0;

    for (const item of items) {
      this.insert(item.position, item.data);
    }
  }

  // Private methods

  private insertIntoNode(node: OctreeNode<T>, item: OctreeItem<T>): void {
    // If node is a leaf
    if (node.isLeaf()) {
      // Add item if under capacity or at max depth
      if (node.items.length < this.config.maxItems || node.depth >= this.config.maxDepth) {
        node.items.push(item);
        return;
      }

      // Check if node is too small to subdivide
      if (node.getSize() <= this.config.minSize) {
        node.items.push(item);
        return;
      }

      // Subdivide and redistribute items
      this.subdivide(node);
    }

    // Insert into appropriate child
    const childIndex = this.getChildIndex(node, item.position);
    if (node.children) {
      this.insertIntoNode(node.children[childIndex], item);
    }
  }

  private subdivide(node: OctreeNode<T>): void {
    const center = node.getCenter();
    const min = node.bounds.min;
    const max = node.bounds.max;

    // Create 8 children (octants)
    node.children = [
      // Bottom layer (z < center)
      new OctreeNode<T>({ min: { x: min.x, y: min.y, z: min.z }, max: { x: center.x, y: center.y, z: center.z } }, node.depth + 1),
      new OctreeNode<T>({ min: { x: center.x, y: min.y, z: min.z }, max: { x: max.x, y: center.y, z: center.z } }, node.depth + 1),
      new OctreeNode<T>({ min: { x: min.x, y: center.y, z: min.z }, max: { x: center.x, y: max.y, z: center.z } }, node.depth + 1),
      new OctreeNode<T>({ min: { x: center.x, y: center.y, z: min.z }, max: { x: max.x, y: max.y, z: center.z } }, node.depth + 1),
      // Top layer (z >= center)
      new OctreeNode<T>({ min: { x: min.x, y: min.y, z: center.z }, max: { x: center.x, y: center.y, z: max.z } }, node.depth + 1),
      new OctreeNode<T>({ min: { x: center.x, y: min.y, z: center.z }, max: { x: max.x, y: center.y, z: max.z } }, node.depth + 1),
      new OctreeNode<T>({ min: { x: min.x, y: center.y, z: center.z }, max: { x: center.x, y: max.y, z: max.z } }, node.depth + 1),
      new OctreeNode<T>({ min: { x: center.x, y: center.y, z: center.z }, max: { x: max.x, y: max.y, z: max.z } }, node.depth + 1),
    ];

    // Redistribute existing items to children
    for (const item of node.items) {
      const childIndex = this.getChildIndex(node, item.position);
      this.insertIntoNode(node.children[childIndex], item);
    }

    // Clear items from this node (no longer a leaf)
    node.items = [];
  }

  private getChildIndex(node: OctreeNode<T>, position: Readonly<Position3D>): number {
    const center = node.getCenter();
    let index = 0;

    if (position.x >= center.x) index |= OCTANT_X_BIT;
    if (position.y >= center.y) index |= OCTANT_Y_BIT;
    if (position.z >= center.z) index |= OCTANT_Z_BIT;

    return index;
  }

  private removeFromNode(node: OctreeNode<T>, position: Readonly<Position3D>, data: T): boolean {
    if (node.isLeaf()) {
      const index = node.items.findIndex(
        item => item.data === data &&
          item.position.x === position.x &&
          item.position.y === position.y &&
          item.position.z === position.z
      );

      if (index !== -1) {
        node.items.splice(index, 1);
        return true;
      }
      return false;
    }

    if (node.children) {
      const childIndex = this.getChildIndex(node, position);
      return this.removeFromNode(node.children[childIndex], position, data);
    }

    return false;
  }

  private queryRangeNode(
    node: OctreeNode<T>,
    queryBounds: BoundingBox3D
  ): OctreeItem<T>[] {
    // Skip if node doesn't intersect query
    if (!this.boundsIntersect(node.bounds, queryBounds)) {
      return [];
    }

    const results: OctreeItem<T>[] = [];

    // Check items in this node
    for (const item of node.items) {
      if (this.containsPoint(queryBounds, item.position)) {
        results.push(item);
      }
    }

    // Recurse into children
    if (node.children) {
      for (const child of node.children) {
        results.push(...this.queryRangeNode(child, queryBounds));
      }
    }

    return results;
  }

  private findNearestNode(
    node: OctreeNode<T>,
    point: Readonly<Position3D>,
    callback: (item: OctreeItem<T>, distributionSq: number) => void
  ): void {
    // Check items in this node
    for (const item of node.items) {
      const distributionSq = this.distanceSquared(point, item.position);
      callback(item, distributionSq);
    }

    // Recurse into children, prioritizing closer ones
    if (node.children) {
      // Sort children by distance to query point
      const sortedChildren = node.children
        .map((child, index) => ({
          child,
          index,
          distSq: this.distanceToNodeSquared(point, child.bounds),
        }))
        .sort((a, b) => a.distSq - b.distSq);

      for (const { child } of sortedChildren) {
        this.findNearestNode(child, point, callback);
      }
    }
  }

  private queryRayNode(
    node: OctreeNode<T>,
    origin: Readonly<Position3D>,
    direction: Readonly<Position3D>,
    maxDistance: number
  ): OctreeItem<T>[] {
    // Skip if ray doesn't intersect node bounds
    if (!this.rayIntersectsBounds(origin, direction, maxDistance, node.bounds)) {
      return [];
    }

    const results: OctreeItem<T>[] = [];

    // Check items in this node
    for (const item of node.items) {
      // Simple proximity check for now (could be improved with exact ray-point distance)
      const distribution = this.pointToRayDistance(item.position, origin, direction);
      if (distribution < RAY_PROXIMITY_THRESHOLD) {
        results.push(item);
      }
    }

    // Recurse into children
    if (node.children) {
      for (const child of node.children) {
        results.push(...this.queryRayNode(child, origin, direction, maxDistance));
      }
    }

    return results;
  }

  private collectAllItems(node: OctreeNode<T>): OctreeItem<T>[] {
    const results: OctreeItem<T>[] = [...node.items];

    if (node.children) {
      for (const child of node.children) {
        results.push(...this.collectAllItems(child));
      }
    }

    return results;
  }

  private containsPoint(bounds: BoundingBox3D, point: Readonly<Position3D>): boolean {
    return (
      point.x >= bounds.min.x && point.x <= bounds.max.x &&
      point.y >= bounds.min.y && point.y <= bounds.max.y &&
      point.z >= bounds.min.z && point.z <= bounds.max.z
    );
  }

  private boundsIntersect(a: BoundingBox3D, b: BoundingBox3D): boolean {
    return (
      a.min.x <= b.max.x && a.max.x >= b.min.x &&
      a.min.y <= b.max.y && a.max.y >= b.min.y &&
      a.min.z <= b.max.z && a.max.z >= b.min.z
    );
  }

  private distanceSquared(a: Readonly<Position3D>, b: Readonly<Position3D>): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
  }

  private distanceToNodeSquared(point: Readonly<Position3D>, bounds: BoundingBox3D): number {
    // Find closest point on bounds to query point
    const closest: Position3D = {
      x: Math.max(bounds.min.x, Math.min(point.x, bounds.max.x)),
      y: Math.max(bounds.min.y, Math.min(point.y, bounds.max.y)),
      z: Math.max(bounds.min.z, Math.min(point.z, bounds.max.z)),
    };
    return this.distanceSquared(point, closest);
  }

  private rayIntersectsBounds(
    origin: Readonly<Position3D>,
    direction: Readonly<Position3D>,
    maxDistance: number,
    bounds: BoundingBox3D
  ): boolean {
    // Simplified AABB-ray intersection test
    let tMin = 0;
    let tMax = maxDistance;

    for (const axis of ['x', 'y', 'z'] as const) {
      const invD = 1 / direction[axis];
      let t0 = (bounds.min[axis] - origin[axis]) * invD;
      let t1 = (bounds.max[axis] - origin[axis]) * invD;

      if (invD < 0) {
        [t0, t1] = [t1, t0];
      }

      tMin = Math.max(tMin, t0);
      tMax = Math.min(tMax, t1);

      if (tMax < tMin) {
        return false;
      }
    }

    return true;
  }

  private pointToRayDistance(point: Readonly<Position3D>, origin: Readonly<Position3D>, direction: Readonly<Position3D>): number {
    // Vector from origin to point
    const v: Position3D = {
      x: point.x - origin.x,
      y: point.y - origin.y,
      z: point.z - origin.z,
    };

    // Project v onto direction
    const dot = v.x * direction.x + v.y * direction.y + v.z * direction.z;

    // Closest point on ray
    const closest: Position3D = {
      x: origin.x + direction.x * dot,
      y: origin.y + direction.y * dot,
      z: origin.z + direction.z * dot,
    };

    return Math.sqrt(this.distanceSquared(point, closest));
  }
}

/**
 * Create an octree from an array of positioned items
 */
export const createOctreeFromItems = <T>(items: readonly { position: Position3D; data: T }[], config?: OctreeConfig): Octree<T> => {
  if (items.length === 0) {
    return new Octree<T>(
      { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      config
    );
  }

  // Calculate bounds from items
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const item of items) {
    minX = Math.min(minX, item.position.x);
    minY = Math.min(minY, item.position.y);
    minZ = Math.min(minZ, item.position.z);
    maxX = Math.max(maxX, item.position.x);
    maxY = Math.max(maxY, item.position.y);
    maxZ = Math.max(maxZ, item.position.z);
  }

  // Add padding to bounds
  const padding = Math.max(maxX - minX, maxY - minY, maxZ - minZ) * BOUNDS_PADDING_RATIO;
  const bounds: BoundingBox3D = {
    min: { x: minX - padding, y: minY - padding, z: minZ - padding },
    max: { x: maxX + padding, y: maxY + padding, z: maxZ + padding },
  };

  const octree = new Octree<T>(bounds, config);
  for (const item of items) {
    octree.insert(item.position, item.data);
  }

  return octree;
};
