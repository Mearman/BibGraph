/**
 * URL compression and decompression utilities using Pako Enables sharing catalogue lists via compressed URL parameters
 */

import type { EntityType } from "@bibgraph/types";
import { deflate, inflate } from "pako";

import type { GenericLogger } from "./logger";

// Constants
const LOG_CATEGORY = "url-compression";
const MAX_URL_LENGTH = 2000; // Conservative limit for URL length
const COMPRESSION_LEVEL = 9; // Maximum compression
const BASE64_PADDING_MODULUS = 4;
const URL_PARAM_OVERHEAD_LENGTH = 10; // For parameter name and separator
const ESTIMATED_COMPRESSION_RATIO = 0.3; // Compressed size is typically 20-40% of original for this type of data
const URL_SHARE_SIZE_BUFFER = 100; // Leave buffer for URL structure

// Interfaces for compressed data structures
export interface CompressedListData {
  /**
  List metadata
   */
  list: {
    title: string;
    description?: string;
    type: "list" | "bibliography";
    tags?: string[];
  };
  /**
  Entities in the list
   */
  entities: {
    entityType: EntityType;
    entityId: string;
    notes?: string;
  }[];
}

export interface ShareUrlData {
  /**
  Version of the compression format
   */
  v: number;
  /**
  Compressed data (base64)
   */
  d: string;
  /**
  Optional checksum for integrity
   */
  c?: string;
}

/**
 * Envelope wrapping compressed data with a format version, as produced by {@link compressListData}
 */
interface ShareEnvelope {
  v: number;
  d: unknown;
}

const isShareEnvelope = (value: unknown): value is ShareEnvelope => {
  if (typeof value !== "object" || value === null) return false;
  if (!("v" in value) || !("d" in value)) return false;
  return typeof value.v === "number";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isUnknownArray = (value: unknown): value is unknown[] => Array.isArray(value);

const VALID_ENTITY_TYPES = new Set([
  'works', 'authors', 'sources', 'institutions', 'topics', 'publishers', 'funders'
]);

/**
 * Validate compressed list data structure
 */
export const validateListData = (data: unknown): data is CompressedListData => {
  if (!isRecord(data)) {
    return false;
  }

  const { list, entities } = data;

  // Validate list structure
  if (!isRecord(list)) {
    return false;
  }

  if (typeof list.title !== 'string' || list.title === '') {
    return false;
  }

  if (list.type !== undefined && (typeof list.type !== 'string' || !['list', 'bibliography'].includes(list.type))) {
    return false;
  }

  // Validate entities structure
  if (!isUnknownArray(entities)) {
    return false;
  }

  for (const entity of entities) {
    if (!isRecord(entity)) {
      return false;
    }

    if (typeof entity.entityType !== 'string' || !VALID_ENTITY_TYPES.has(entity.entityType)) {
      return false;
    }

    if (typeof entity.entityId !== 'string' || entity.entityId === '') {
      return false;
    }
  }

  return true;
};

/**
 * Compress catalogue list data for URL sharing
 */
export const compressListData = (data: Readonly<CompressedListData>): string => {
  try {
    // Convert data to JSON string
    const jsonString = JSON.stringify({
      v: 1, // Version
      d: data,
    });

    // Compress using Pako
    const compressed = deflate(jsonString, { level: COMPRESSION_LEVEL });

    // Convert to base64 for URL safety
    const base64 = btoa(String.fromCharCode(...compressed));

    // URL-safe base64 (replace + and / with - and _)
    const urlSafe = base64
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');

    return urlSafe;
  } catch (error) {
    throw new Error(`Failed to compress list data: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Decompress catalogue list data from URL parameter
 */
export const decompressListData = (compressedData: string): CompressedListData | null => {
  try {
    // Restore base64 padding
    let base64 = compressedData.replaceAll('-', '+').replaceAll('_', '/');
    while (base64.length % BASE64_PADDING_MODULUS) {
      base64 += '=';
    }

    // Decode base64
    const binaryString = atob(base64);
    const compressed = new Uint8Array(binaryString.length);
    for (let index = 0; index < binaryString.length; index++) {
      compressed[index] = binaryString.charCodeAt(index);
    }

    // Decompress using Pako
    const decompressed = inflate(compressed);
    const jsonString = new TextDecoder().decode(decompressed);

    // Parse JSON
    const parsed: unknown = JSON.parse(jsonString);

    if (!isShareEnvelope(parsed)) {
      throw new Error("Invalid compressed data structure");
    }

    // Validate version
    if (parsed.v !== 1) {
      throw new Error(`Unsupported compression version: ${String(parsed.v)}`);
    }

    if (!validateListData(parsed.d)) {
      throw new Error("Invalid compressed list data");
    }

    return parsed.d;
  } catch {
    // Return null instead of throwing for invalid data
    return null;
  }
};

/**
 * Create a shareable URL for a catalogue list
 */
export const createShareUrl = (baseUrl: string, listData: Readonly<CompressedListData>, logger?: GenericLogger): string => {
  try {
    const compressed = compressListData(listData);

    // Check if URL is too long
    const urlLength = baseUrl.length + compressed.length + URL_PARAM_OVERHEAD_LENGTH;
    if (urlLength > MAX_URL_LENGTH) {
      logger?.warn(LOG_CATEGORY, "Generated URL may be too long", {
        urlLength,
        maxLength: MAX_URL_LENGTH,
        entityCount: listData.entities.length,
      });
    }

    // Create URL with compressed data parameter
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}data=${compressed}`;
  } catch (error) {
    logger?.error(LOG_CATEGORY, "Failed to create share URL", { error });
    throw error;
  }
};

/**
 * Extract and decompress catalogue data from URL
 */
export const extractListDataFromUrl = (url: string, logger?: GenericLogger): CompressedListData | null => {
  try {
    // Extract data parameter from URL
    const urlObject = new URL(url);
    const compressedData = urlObject.searchParams.get('data');

    if (compressedData === null || compressedData === '') {
      return null;
    }

    return decompressListData(compressedData);
  } catch (error) {
    logger?.error(LOG_CATEGORY, "Failed to extract list data from URL", { url, error });
    return null;
  }
};

/**
 * Optimize list data for compression by reducing redundancy
 */
export const optimizeListData = (data: Readonly<CompressedListData>): CompressedListData => {
  const trimmedDescription = data.list.description?.trim();
  return {
    list: {
      title: data.list.title.trim(),
      description: trimmedDescription === undefined || trimmedDescription === '' ? undefined : trimmedDescription,
      type: data.list.type,
      tags: data.list.tags?.filter(tag => tag.trim().length > 0) ?? undefined,
    },
    entities: data.entities.map(entity => {
      const trimmedNotes = entity.notes?.trim();
      return {
        entityType: entity.entityType,
        entityId: entity.entityId.trim(),
        notes: trimmedNotes === undefined || trimmedNotes === '' ? undefined : trimmedNotes,
      };
    }),
  };
};

/**
 * Estimate compressed size of list data without actually compressing
 */
export const estimateCompressedSize = (data: Readonly<CompressedListData>): number => {
  const jsonString = JSON.stringify({
    v: 1,
    d: optimizeListData(data),
  });

  // Rough estimate: compressed size is typically 20-40% of original for this type of data
  return Math.ceil(jsonString.length * ESTIMATED_COMPRESSION_RATIO);
};

/**
 * Check if list data can be reasonably shared via URL
 */
export const canShareViaUrl = (data: Readonly<CompressedListData>): boolean => {
  const estimatedSize = estimateCompressedSize(data);
  return estimatedSize <= MAX_URL_LENGTH - URL_SHARE_SIZE_BUFFER;
};

/**
 * Split large lists into multiple shareable chunks
 */
export const splitListForSharing = (data: Readonly<CompressedListData>): CompressedListData[] => {
  const maxEntities = 50; // Conservative limit per URL
  const chunks: CompressedListData[] = [];

  if (data.entities.length <= maxEntities) {
    return [data];
  }

  // Split entities into chunks
  for (let index = 0; index < data.entities.length; index += maxEntities) {
    const chunkEntities = data.entities.slice(index, index + maxEntities);
    const chunkData: CompressedListData = {
      list: {
        ...data.list,
        title: index === 0 ? data.list.title : `${data.list.title} (Part ${String(Math.floor(index / maxEntities) + 1)})`,
        description: index === 0 ? data.list.description : `Part ${String(Math.floor(index / maxEntities) + 1)} of ${String(Math.ceil(data.entities.length / maxEntities))}`,
      },
      entities: chunkEntities,
    };

    if (canShareViaUrl(chunkData)) {
      chunks.push(chunkData);
    } else {
      // If even the chunk is too large, split further
      const subChunks = splitListForSharing(chunkData);
      chunks.push(...subChunks);
    }
  }

  return chunks;
};
