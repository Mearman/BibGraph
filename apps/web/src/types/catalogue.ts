/**
 * Shared type definitions for catalogue feature
 *
 * These types are used across components, hooks, and storage layers.
 * They define the contract between different parts of the catalogue system.
 *
 * Feature: 004-fix-failing-tests
 * Created: 2025-11-11
 */

import type { EntityType } from '@bibgraph/types';

// ==================
// Entity Types
// ==================
// EntityType is imported from @bibgraph/types (uses plural forms: works, authors, etc.)

// ==================
// Catalogue List
// ==================

export interface CatalogueList {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  entityCount: number;
  isPublic: boolean;
  isBibliography: boolean;
  shareToken?: string;
}

// ==================
// Catalogue Entity
// ==================

export interface CatalogueEntity {
  id: string; // Composite: `${listId}:${entityId}`
  listId: string;
  entityId: string;
  entityType: EntityType;
  position: number;
  note?: string;
  addedAt: string;
  metadata: EntityMetadata;
}

// ==================
// Entity Metadata
// ==================

export interface BaseEntityMetadata {
  displayName: string;
  externalIds?: Record<string, string>;
}

export interface WorkMetadata extends BaseEntityMetadata {
  type: 'work';
  publicationYear?: number;
  citedByCount: number;
  primaryLocation?: {
    source?: { displayName: string };
  };
  authorships?: {
    author: { displayName: string };
    institutions: { displayName: string }[];
  }[];
  openAccess?: {
    isOa: boolean;
    oaStatus: string;
  };
}

export interface AuthorMetadata extends BaseEntityMetadata {
  type: 'author';
  worksCount: number;
  citedByCount: number;
  hIndex?: number;
  lastKnownInstitution?: {
    displayName: string;
  };
}

export interface InstitutionMetadata extends BaseEntityMetadata {
  type: 'institution';
  worksCount: number;
  citedByCount: number;
  countryCode?: string;
  institutionType?: string;
}

export interface SourceMetadata extends BaseEntityMetadata {
  type: 'source';
  worksCount: number;
  citedByCount: number;
  issn?: string[];
  isOa?: boolean;
}

export interface TopicMetadata extends BaseEntityMetadata {
  type: 'topic';
  worksCount: number;
  citedByCount: number;
  field?: { displayName: string };
  domain?: { displayName: string };
}

export interface FunderMetadata extends BaseEntityMetadata {
  type: 'funder';
  worksCount: number;
  citedByCount: number;
  countryCode?: string;
}

export interface PublisherMetadata extends BaseEntityMetadata {
  type: 'publisher';
  worksCount: number;
  citedByCount: number;
  countryCode?: string;
}

export interface ConceptMetadata extends BaseEntityMetadata {
  type: 'concept';
  worksCount: number;
  citedByCount: number;
  level?: number;
}

export type EntityMetadata =
  | WorkMetadata
  | AuthorMetadata
  | InstitutionMetadata
  | SourceMetadata
  | TopicMetadata
  | FunderMetadata
  | PublisherMetadata
  | ConceptMetadata;

/**
 * Minimal metadata for export when full metadata is not available
 * Used when CatalogueEntity doesn't store full entity metadata
 */
export interface MinimalExportMetadata {
  type: EntityType;
  displayName: string;
  worksCount: number;
  citedByCount: number;
}

// ==================
// Import/Export
// ==================

export interface ExportFormat {
  version: '1.0';
  exportedAt: string;
  listMetadata: {
    title: string;
    description?: string;
    created: string;
    entityCount: number;
    isBibliography: boolean;
  };
  entities: {
    entityId: string;
    type: EntityType;
    position: number;
    note?: string;
    addedAt: string;
    metadata: EntityMetadata | MinimalExportMetadata;
  }[];
}
