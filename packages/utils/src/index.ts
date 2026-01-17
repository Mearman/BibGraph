/**
 * Utils package main exports
 */

// Core utilities
export * from "./logger";
export * from "./data";
export * from "./date-helpers";
export * from "./date-utils";
export * from "./validation";

// URL and routing utilities
export * from "./url-parser";
export * from "./url-compression";
export * from "./url-reconstruction";
export * from "./normalize-route";
export * from "./query-parser";

// Entity utilities
export * from "./entity-detector";
export * from "./entity-type-inference";
export * from "./entity-detection-service";

// Data processing utilities
export * from "./bookmark-export";
export * from "./bookmark-filters";
export * from "./bookmark-migration";
export * from "./build-info";
export * from "./data-evaluation";
export * from "./duplicate-detection";
export * from "./field-summary";
export * from "./metadata-improvements";

// Web utilities
export * from "./navigation";
export * from "./webgl-detection";

// Graph utilities
export * from "./graph-3d-adapter";
export * from "./graph-sources/relationship-extractor";
export * from "./graph-sources/types";

// Spatial graph utilities
export * from "./spatial/graph-lod-manager";

// Service utilities
export * from "./services";

// Storage utilities
export * from "./storage/dexie-storage-provider";
export * from "./storage/catalogue-db";
export * from "./storage/catalogue-storage-provider";
export * from "./storage/in-memory-storage-provider";
export * from "./storage/indexeddb-storage";
export * from "./storage/storage-provider-types";

// UI utilities
export * from "./ui/filter-base";

// Cache utilities
export * from "./cache";

// Static data cache utilities
export * from "./static-data/cache";

// Hooks
export * from "./hooks/use-entity-route";

// Background tasks
export * from "./background-tasks/types";
export * from "./background-tasks/task-executor";
