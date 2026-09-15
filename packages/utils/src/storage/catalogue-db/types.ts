/**
 * Catalogue database types Lists, entities, shares, search history, and graph annotation/snapshot storage
 */

import type { EntityType } from "@bibgraph/types";

export type ListType = "list" | "bibliography";

export interface CatalogueList {
  id?: string;
  /**
  List title
   */
  title: string;
  /**
  Optional description
   */
  description?: string;
  /**
  List type: general list or works-only bibliography
   */
  type: ListType;
  /**
  User-defined tags for organization
   */
  tags?: string[];
  /**
  When the list was created
   */
  createdAt: Date;
  /**
  When the list was last modified
   */
  updatedAt: Date;
  /**
  Whether this list is publicly shareable
   */
  isPublic: boolean;
  /**
  Optional share token for public access
   */
  shareToken?: string;
}

export interface CatalogueEntity {
  id?: string;
  /**
  List this entity belongs to
   */
  listId: string;
  /**
  Entity type (works, authors, etc.)
   */
  entityType: EntityType;
  /**
  OpenAlex entity ID
   */
  entityId: string;
  /**
  When entity was added to list
   */
  addedAt: Date;
  /**
  Optional notes for this specific entity in the list
   */
  notes?: string;
  /**
  Order position within the list
   */
  position: number;
}

export interface CatalogueShareRecord {
  id?: string;
  /**
  List ID this share belongs to
   */
  listId: string;
  /**
  Unique share token
   */
  shareToken: string;
  /**
  When share was created
   */
  createdAt: Date;
  /**
  When share expires (optional)
   */
  expiresAt?: Date;
  /**
  How many times this share was accessed
   */
  accessCount: number;
  /**
  Last access timestamp
   */
  lastAccessedAt?: Date;
}

export interface SearchHistoryEntry {
  id?: string;
  /**
  Search query text
   */
  query: string;
  /**
  When the search was performed
   */
  timestamp: Date;
}

/**
 * Graph annotation storage interface Annotations are visual markup on graphs (text labels, shapes, drawings)
 */
export interface GraphAnnotationStorage {
  id?: string;
  /**
  Annotation type discriminator
   */
  type: 'text' | 'rectangle' | 'circle' | 'drawing';
  /**
  Creation timestamp
   */
  createdAt: Date;
  /**
  Last modified timestamp
   */
  updatedAt: Date;
  /**
  Whether annotation is visible
   */
  visible: boolean;
  /**
  Optional color
   */
  color?: string;

  // Text annotation fields
  content?: string;
  x?: number;
  y?: number;
  fontSize?: number;
  backgroundColor?: string;
  /**
  Linked node ID (optional)
   */
  nodeId?: string;

  // Rectangle annotation fields
  width?: number;
  height?: number;
  borderColor?: string;
  fillColor?: string;
  borderWidth?: number;

  // Circle annotation fields
  radius?: number;

  // Drawing annotation fields
  points?: { x: number; y: number }[];
  strokeColor?: string;
  strokeWidth?: number;
  closed?: boolean;

  /**
  Optional graph/snapshot ID for sharing annotations via URL
   */
  graphId?: string;
}

/**
 * Graph snapshot storage Captures complete graph state for later restoration or sharing
 */
export interface GraphSnapshotStorage {
  id?: string;
  /**
  Snapshot name for display
   */
  name: string;
  /**
  Creation timestamp
   */
  createdAt: Date;
  /**
  Last modified timestamp
   */
  updatedAt: Date;
  /**
  Whether this is an auto-saved snapshot
   */
  isAutoSave: boolean;
  /**
  Graph nodes (serialized)
   */
  nodes: string;
  /**
  Graph edges (serialized)
   */
  edges: string;
  /**
  Camera zoom level
   */
  zoom: number;
  /**
  Camera pan X position
   */
  panX: number;
  /**
  Camera pan Y position
   */
  panY: number;
  /**
  Layout type
   */
  layoutType: string;
  /**
  Node positions (for static layouts)
   */
  nodePositions?: string;
  /**
  Annotations associated with this snapshot
   */
  annotations?: string;
  /**
  Optional share token for URL sharing
   */
  shareToken?: string;
}
