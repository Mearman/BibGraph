/**
 * Unit tests for Octree spatial indexing
 */

import type { BoundingBox3D } from '@bibgraph/types';
import { beforeEach,describe, expect, it } from 'vitest';

import { createOctreeFromItems,Octree } from './octree';

const INSERTED_ITEM_COUNT = 3;
const RANGE_QUERY_TOTAL_ITEMS = 4;
const SPHERE_QUERY_RADIUS = 15;
const FIND_NEAREST_MAX_DISTANCE = 5;
const LARGE_K_VALUE = 10;
const K_NEAREST_TOTAL_ITEMS = 4;
const K_NEAREST_MAX_DISTANCE = 25;

describe('Octree', () => {
  const defaultBounds: BoundingBox3D = {
    min: { x: -100, y: -100, z: -100 },
    max: { x: 100, y: 100, z: 100 },
  };

  describe('constructor', () => {
    it('should create an empty octree', () => {
      const octree = new Octree<string>(defaultBounds);
      expect(octree.size).toBe(0);
    });

    it('should store the bounds', () => {
      const octree = new Octree<string>(defaultBounds);
      expect(octree.bounds).toEqual(defaultBounds);
    });
  });

  describe('insert', () => {
    it('should insert a single item', () => {
      const octree = new Octree<string>(defaultBounds);
      const isResult = octree.insert({ x: 0, y: 0, z: 0 }, 'center');
      expect(isResult).toBe(true);
      expect(octree.size).toBe(1);
    });

    it('should insert multiple items', () => {
      const octree = new Octree<string>(defaultBounds);
      octree.insert({ x: -50, y: -50, z: -50 }, 'bottom-left-back');
      octree.insert({ x: 50, y: 50, z: 50 }, 'top-right-front');
      octree.insert({ x: 0, y: 0, z: 0 }, 'center');
      expect(octree.size).toBe(INSERTED_ITEM_COUNT);
    });

    it('should reject items outside bounds', () => {
      const octree = new Octree<string>(defaultBounds);
      const isResult = octree.insert({ x: 200, y: 0, z: 0 }, 'outside');
      expect(isResult).toBe(false);
      expect(octree.size).toBe(0);
    });

    it('should subdivide when exceeding maxItems', () => {
      const octree = new Octree<string>(defaultBounds, { maxItems: 2 });

      // Insert 3 items to force subdivision
      octree.insert({ x: -50, y: -50, z: -50 }, 'a');
      octree.insert({ x: 50, y: 50, z: 50 }, 'b');
      octree.insert({ x: 0, y: 0, z: 0 }, 'c');

      expect(octree.size).toBe(INSERTED_ITEM_COUNT);
      // All items should still be retrievable
      const allItems = octree.getAllItems();
      expect(allItems.length).toBe(INSERTED_ITEM_COUNT);
    });
  });

  describe('remove', () => {
    it('should remove an existing item', () => {
      const octree = new Octree<string>(defaultBounds);
      const position = { x: 0, y: 0, z: 0 };
      const data = 'test';

      octree.insert(position, data);
      expect(octree.size).toBe(1);

      const isRemoved = octree.remove(position, data);
      expect(isRemoved).toBe(true);
      expect(octree.size).toBe(0);
    });

    it('should return false for non-existent item', () => {
      const octree = new Octree<string>(defaultBounds);
      const isRemoved = octree.remove({ x: 0, y: 0, z: 0 }, 'nonexistent');
      expect(isRemoved).toBe(false);
    });
  });

  describe('queryRange', () => {
    let octree: Octree<string>;

    beforeEach(() => {
      octree = new Octree<string>(defaultBounds);
      octree.insert({ x: -50, y: -50, z: -50 }, 'bottom-left-back');
      octree.insert({ x: 50, y: 50, z: 50 }, 'top-right-front');
      octree.insert({ x: 0, y: 0, z: 0 }, 'center');
      octree.insert({ x: 25, y: 25, z: 25 }, 'near-center');
    });

    it('should find items within a bounding box', () => {
      const queryBounds: BoundingBox3D = {
        min: { x: -10, y: -10, z: -10 },
        max: { x: 30, y: 30, z: 30 },
      };

      const results = octree.queryRange(queryBounds);
      expect(results.length).toBe(2);

      const dataValues = results.map(r => r.data);
      expect(dataValues).toContain('center');
      expect(dataValues).toContain('near-center');
    });

    it('should return empty array for empty region', () => {
      const queryBounds: BoundingBox3D = {
        min: { x: 200, y: 200, z: 200 },
        max: { x: 300, y: 300, z: 300 },
      };

      const results = octree.queryRange(queryBounds);
      expect(results.length).toBe(0);
    });

    it('should return all items when query contains entire tree', () => {
      const results = octree.queryRange(defaultBounds);
      expect(results.length).toBe(RANGE_QUERY_TOTAL_ITEMS);
    });
  });

  describe('querySphere', () => {
    let octree: Octree<string>;

    beforeEach(() => {
      octree = new Octree<string>(defaultBounds);
      octree.insert({ x: 0, y: 0, z: 0 }, 'center');
      octree.insert({ x: 10, y: 0, z: 0 }, 'nearby');
      octree.insert({ x: 100, y: 0, z: 0 }, 'far');
    });

    it('should find items within a sphere', () => {
      const results = octree.querySphere({ x: 0, y: 0, z: 0 }, SPHERE_QUERY_RADIUS);
      expect(results.length).toBe(2);

      const dataValues = results.map(r => r.data);
      expect(dataValues).toContain('center');
      expect(dataValues).toContain('nearby');
      expect(dataValues).not.toContain('far');
    });

    it('should handle zero radius', () => {
      const results = octree.querySphere({ x: 0, y: 0, z: 0 }, 0);
      expect(results.length).toBe(1);
      expect(results[0].data).toBe('center');
    });
  });

  describe('findNearest', () => {
    let octree: Octree<string>;

    beforeEach(() => {
      octree = new Octree<string>(defaultBounds);
      octree.insert({ x: 10, y: 0, z: 0 }, 'a');
      octree.insert({ x: 20, y: 0, z: 0 }, 'b');
      octree.insert({ x: 30, y: 0, z: 0 }, 'c');
    });

    it('should find the nearest item', () => {
      const nearest = octree.findNearest({ x: 0, y: 0, z: 0 });
      expect(nearest?.data).toBe('a');
    });

    it('should find exact match', () => {
      const nearest = octree.findNearest({ x: 20, y: 0, z: 0 });
      expect(nearest?.data).toBe('b');
    });

    it('should respect maxDistance', () => {
      const nearest = octree.findNearest({ x: 0, y: 0, z: 0 }, FIND_NEAREST_MAX_DISTANCE);
      expect(nearest).toBeNull();
    });

    it('should return null for empty tree', () => {
      const emptyOctree = new Octree<string>(defaultBounds);
      const nearest = emptyOctree.findNearest({ x: 0, y: 0, z: 0 });
      expect(nearest).toBeNull();
    });
  });

  describe('findKNearest', () => {
    let octree: Octree<string>;

    beforeEach(() => {
      octree = new Octree<string>(defaultBounds);
      octree.insert({ x: 10, y: 0, z: 0 }, 'a');
      octree.insert({ x: 20, y: 0, z: 0 }, 'b');
      octree.insert({ x: 30, y: 0, z: 0 }, 'c');
      octree.insert({ x: 40, y: 0, z: 0 }, 'd');
    });

    it('should find k nearest items', () => {
      const nearest = octree.findKNearest({ x: 0, y: 0, z: 0 }, 2);
      expect(nearest.length).toBe(2);
      expect(nearest[0].data).toBe('a');
      expect(nearest[1].data).toBe('b');
    });

    it('should return all items if k > size', () => {
      const nearest = octree.findKNearest({ x: 0, y: 0, z: 0 }, LARGE_K_VALUE);
      expect(nearest.length).toBe(K_NEAREST_TOTAL_ITEMS);
    });

    it('should respect maxDistance', () => {
      const nearest = octree.findKNearest({ x: 0, y: 0, z: 0 }, LARGE_K_VALUE, K_NEAREST_MAX_DISTANCE);
      expect(nearest.length).toBe(2);
    });
  });

  describe('getAllItems', () => {
    it('should return all items in the tree', () => {
      const octree = new Octree<string>(defaultBounds);
      octree.insert({ x: -50, y: -50, z: -50 }, 'a');
      octree.insert({ x: 50, y: 50, z: 50 }, 'b');
      octree.insert({ x: 0, y: 0, z: 0 }, 'c');

      const allItems = octree.getAllItems();
      expect(allItems.length).toBe(INSERTED_ITEM_COUNT);

      const dataValues = allItems.map(item => item.data);
      expect(dataValues).toContain('a');
      expect(dataValues).toContain('b');
      expect(dataValues).toContain('c');
    });

    it('should return empty array for empty tree', () => {
      const octree = new Octree<string>(defaultBounds);
      expect(octree.getAllItems()).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all items', () => {
      const octree = new Octree<string>(defaultBounds);
      octree.insert({ x: 0, y: 0, z: 0 }, 'test');
      expect(octree.size).toBe(1);

      octree.clear();
      expect(octree.size).toBe(0);
      expect(octree.getAllItems()).toEqual([]);
    });
  });

  describe('rebuild', () => {
    it('should rebuild with new bounds', () => {
      const octree = new Octree<string>(defaultBounds);
      octree.insert({ x: 0, y: 0, z: 0 }, 'center');

      const newBounds: BoundingBox3D = {
        min: { x: -50, y: -50, z: -50 },
        max: { x: 50, y: 50, z: 50 },
      };

      octree.rebuild(newBounds);
      expect(octree.bounds).toEqual(newBounds);
      expect(octree.size).toBe(1);
    });
  });
});

describe('createOctreeFromItems', () => {
  it('should create octree from array of items', () => {
    const items = [
      { position: { x: 0, y: 0, z: 0 }, data: 'a' },
      { position: { x: 10, y: 10, z: 10 }, data: 'b' },
      { position: { x: -10, y: -10, z: -10 }, data: 'c' },
    ];

    const octree = createOctreeFromItems(items);
    expect(octree.size).toBe(INSERTED_ITEM_COUNT);

    const allItems = octree.getAllItems();
    const dataValues = allItems.map(item => item.data);
    expect(dataValues).toContain('a');
    expect(dataValues).toContain('b');
    expect(dataValues).toContain('c');
  });

  it('should handle empty array', () => {
    const octree = createOctreeFromItems<string>([]);
    expect(octree.size).toBe(0);
  });

  it('should calculate appropriate bounds', () => {
    const items = [
      { position: { x: 100, y: 100, z: 100 }, data: 'a' },
      { position: { x: -100, y: -100, z: -100 }, data: 'b' },
    ];

    const octree = createOctreeFromItems(items);

    // All items should be within bounds
    const allItems = octree.getAllItems();
    expect(allItems.length).toBe(2);
  });
});
