/**
 * Static data index generator for OpenAlex entities
 * Generates index.json files for cached entity directories to enable efficient data discovery
 */

import {
  type DirectoryEntry,
  type DirectoryIndex,
  type FileEntry,
  generateContentHash,
  isValidOpenAlexEntity,
} from "@bibgraph/utils/static-data/cache-utilities";

// Local type definition (not exported from @bibgraph/client)
type StaticEntityType = 'author' | 'work' | 'source' | 'institution' | 'topic' | 'publisher' | 'funder';

// Dynamic imports for Node.js modules to avoid browser bundling issues
let fs: typeof import("node:fs/promises");
let path: typeof import("node:path");

/**
 * Initialize Node.js modules (required before using any file operations)
 */
const initializeNodeModules = async (): Promise<void> => {
  if (!fs || !path) {
    const [fsModule, pathModule] = await Promise.all([
      import("node:fs/promises"),
      import("node:path"),
    ]);
    fs = fsModule;
    path = pathModule;
  }
};

/**
 * Check if file exists (using dynamic import)
 * @param filePath
 */
const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    const { existsSync } = await import("node:fs");
    return existsSync(filePath);
  } catch {
    return false;
  }
};

export interface IndexGenerationOptions {
  autoDownload?: boolean;
  force?: boolean;
  validate?: boolean;
}

const VALID_ENTITY_TYPES = new Set<StaticEntityType>([
  "work",
  "author",
  "source",
  "institution",
  "topic",
  "publisher",
  "funder",
]);

const INDEX_FILENAME = "index.json";

/**
 * Generate index for all entity types in the static data directory
 * @param staticDataDir
 * @param options
 */
export const generateAllIndexes = async (staticDataDir: string, options: IndexGenerationOptions = {}): Promise<void> => {
  await initializeNodeModules();
  try {
    console.log(`Generating indexes for all entity types in ${staticDataDir}`);

    // Ensure static data directory exists
    await ensureDirectoryExists(staticDataDir);

    // Find all entity type directories
    const entries = await fs.readdir(staticDataDir, { withFileTypes: true });
    const entityDirs = entries
      .filter(
        (entry) =>
          entry.isDirectory() &&
          VALID_ENTITY_TYPES.has(entry.name as StaticEntityType),
      )
      .map((entry) => entry.name as StaticEntityType);

    if (entityDirs.length === 0) {
      console.log(
        "No entity directories found - directories will be created when data is cached",
      );
      return;
    }

    // Generate indexes for each entity type
    const results = await Promise.allSettled(
      entityDirs.map(async (entityType) => {
        const dir = path.join(staticDataDir, entityType);
        console.log(`Processing ${entityType} directory...`);

        await (options.autoDownload
          ? generateIndexWithAutoDownload({
              entityDir: dir,
              entityType,
              staticDataDir,
            })
          : generateIndexForEntityType(dir, entityType));
      }),
    );

    // Report results
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed > 0) {
      console.warn(
        `Warning: Generated ${successful} indexes, ${failed} failed`,
      );
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `Failed to generate index for ${entityDirs[index]}:`,
            result.reason,
          );
        }
      });
    } else {
      console.log(`Successfully generated ${successful} entity indexes`);
    }
  } catch (error) {
    console.error("Failed to generate static data indexes:", error);
    throw error;
  }
};

/**
 * Generate index for a specific entity type with auto-download support
 * @param root0
 * @param root0.entityDir
 * @param root0.entityType
 * @param root0.staticDataDir
 */
export const generateIndexWithAutoDownload = async ({
  entityDir,
  entityType,
}: {
  entityDir: string;
  entityType: StaticEntityType;
  staticDataDir?: string;
}): Promise<void> => {
  await initializeNodeModules();
  try {
    console.log(`Auto-download enabled for ${entityType}`);

    // First generate index for existing files
    await generateIndexForEntityType(entityDir, entityType);

    // TODO: Implement auto-download logic here
    // This would integrate with the OpenAlex client to download missing popular entities
    console.log(`Auto-download for ${entityType} not yet implemented`);
  } catch (error) {
    console.error(
      `Failed to generate index with auto-download for ${entityType}:`,
      error,
    );
    throw error;
  }
};

/**
 * Generate index for a specific entity type directory
 * @param entityDir
 * @param entityType
 * @param recursive
 */
export const generateIndexForEntityType = async (entityDir: string, entityType: StaticEntityType, recursive = true): Promise<void> => {
  await initializeNodeModules();
  try {
    console.log(`Generating index for ${entityType}...`);

    // Ensure directory exists
    await ensureDirectoryExists(entityDir);

    // Read all JSON files in the directory (direct entities)
    const dirContents = await fs.readdir(entityDir);
    const jsonFiles = dirContents.filter(
      (file) =>
        path.extname(file) === ".json" &&
        path.basename(file, ".json") !== "index", // Don't include the index file itself
    );

    console.log(
      `Found ${jsonFiles.length} JSON files in ${entityType} directory`,
    );

    if (jsonFiles.length === 0) {
      console.log(
        `No data files found for ${entityType}, creating empty index`,
      );
    }

    // Read existing index to preserve unchanged entries
    const indexPath = path.join(entityDir, INDEX_FILENAME);
    let existingIndex: DirectoryIndex | null = null;

    try {
      if (await fileExists(indexPath)) {
        const existingContent = await fs.readFile(indexPath, "utf8");
        existingIndex = JSON.parse(existingContent);
      }
    } catch (error) {
      console.warn(`⚠️  Failed to read existing index: ${error}`);
    }

    // Process each file to extract metadata, preserving unchanged entries
    const files = await processJsonFiles({ entityDir, jsonFiles, entityType, existingIndex });

    // Process subdirectories if recursive
    let directories: Record<string, DirectoryEntry> = {};
    let maxLastUpdated = new Date().toISOString();

    if (recursive) {
      const { directories: subDirs, maxLastUpdated: subMaxUpdated } =
        await processSubdirectories({ entityDir, entityType, recursive, existingIndex });
      directories = subDirs;
      maxLastUpdated = subMaxUpdated;
    }

    const currentIsoString = new Date().toISOString();
    // ISO strings are lexicographically comparable - use string comparison
    const overallLastUpdated = maxLastUpdated > currentIsoString ? maxLastUpdated : currentIsoString;

    // Check if content has actually changed (excluding lastUpdated field)
    const contentChanged = hasIndexContentChanged({
      existingIndex,
      files,
      directories,
    });

    // Create index with conditional lastUpdated
    const index: DirectoryIndex = {
      lastUpdated: contentChanged
        ? overallLastUpdated
        : existingIndex?.lastUpdated || overallLastUpdated,
      ...(Object.keys(files).length > 0 && { files }),
      ...(Object.keys(directories).length > 0 && { directories }),
    };

    // Only write if content has changed
    if (contentChanged) {
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf-8");
      console.log(
        `Updated index for ${entityType}: ${Object.keys(files).length} files, ${Object.keys(directories).length} directories (content changed)`,
      );
    } else {
      console.log(
        `Index for ${entityType} unchanged: ${Object.keys(files).length} files, ${Object.keys(directories).length} directories (skipped write)`,
      );
    }
  } catch (error) {
    console.error(`Failed to generate index for ${entityType}:`, error);
    throw error;
  }
};

/**
 * Validate static data index and entities recursively
 * @param entityDir
 */
export const validateStaticDataIndex = async (entityDir: string): Promise<boolean> => {
  try {
    const indexPath = path.join(entityDir, INDEX_FILENAME);

    if (!(await fileExists(indexPath))) {
      console.warn(`Warning: No index found at ${indexPath}`);
      return false;
    }

    const indexContent = await fs.readFile(indexPath, "utf8");
    const index: DirectoryIndex = JSON.parse(indexContent);

    // Validate index structure
    if (!index.lastUpdated) {
      console.error(`Invalid index structure in ${indexPath}`);
      return false;
    }

    // Check if all referenced files exist
    const missingFiles = await validateIndexFiles({ index, entityDir });
    if (missingFiles > 0) {
      console.warn(`Warning: Index references ${missingFiles} missing files`);
      return false;
    }

    // Recursively validate directories if present
    const subdirIssues = await validateIndexDirectories({ index, entityDir });
    if (subdirIssues > 0) {
      console.warn(
        `Warning: ${subdirIssues} subdirectory validation issues found`,
      );
      return false;
    }

    const fileCount = index.files ? Object.keys(index.files).length : 0;
    const dirCount = index.directories
      ? Object.keys(index.directories).length
      : 0;
    console.log(
      `Index validation passed: ${fileCount} files, ${dirCount} directories`,
    );
    return true;
  } catch (error) {
    console.error("Failed to validate index:", error);
    return false;
  }
};

/**
 * Get static data index for an entity type
 * @param entityDir
 */
export const getStaticDataIndex = async (entityDir: string): Promise<DirectoryIndex | null> => {
  try {
    const indexPath = path.join(entityDir, INDEX_FILENAME);

    if (!(await fileExists(indexPath))) {
      return null;
    }

    const indexContent = await fs.readFile(indexPath, "utf8");
    return JSON.parse(indexContent);
  } catch (error) {
    console.error("Failed to read static data index:", error);
    return null;
  }
};

/**
 * Ensure directory exists, create if it doesn't
 * @param dirPath
 */
const ensureDirectoryExists = async (dirPath: string): Promise<void> => {
  try {
    if (!(await fileExists(dirPath))) {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    }
  } catch (error) {
    console.error(`Failed to create directory ${dirPath}:`, error);
    throw error;
  }
};

/**
 * Process JSON files in a directory and extract metadata
 * Preserves existing FileEntry objects for unchanged files to prevent unnecessary timestamp updates
 * @param root0
 * @param root0.entityDir
 * @param root0.jsonFiles
 * @param root0.entityType
 * @param root0.existingIndex
 */
const processJsonFiles = async ({
  entityDir,
  jsonFiles,
  entityType,
  existingIndex,
}: {
  entityDir: string;
  jsonFiles: string[];
  entityType: StaticEntityType;
  existingIndex?: DirectoryIndex | null;
}): Promise<Record<string, FileEntry>> => {
  const files: Record<string, FileEntry> = {};
  const existingFiles = existingIndex?.files || {};

  for (const fileName of jsonFiles) {
    const filePath = path.join(entityDir, fileName);
    const fileStats = await fs.stat(filePath);
    const entityId = path.basename(fileName, ".json");

    try {
      const content = await fs.readFile(filePath, "utf8");
      const data = JSON.parse(content);

      // Basic validation - ensure it looks like an OpenAlex entity
      if (!isValidOpenAlexEntity(data)) {
        console.warn(
          `⚠️  File ${fileName} doesn't appear to be a valid OpenAlex entity`,
        );
      }

      const currentHash = await generateContentHash(data);
      const existingEntry = existingFiles[entityId];

      // Preserve existing entry if content hash unchanged (prevents timestamp cascade)
      if (existingEntry && existingEntry.contentHash === currentHash) {
        files[entityId] = existingEntry;
      } else {
        // New or changed file - create fresh entry with current timestamp
        const reconstructedUrl = `https://api.openalex.org/${entityType}/${entityId}`;
        files[entityId] = {
          $ref: `./${fileName}`,
          contentHash: currentHash,
          lastRetrieved: fileStats.mtime.toISOString(),
          url: reconstructedUrl,
        };
      }
    } catch (error) {
      console.warn(`⚠️  Failed to validate file ${fileName}:`, error);
      // Skip invalid files rather than adding them
    }
  }

  return files;
};

/**
 * Process subdirectories and generate their indexes
 * Preserves existing DirectoryEntry objects for unchanged subdirectories to prevent unnecessary timestamp updates
 * @param root0
 * @param root0.entityDir
 * @param root0.entityType
 * @param root0.recursive
 * @param root0.existingIndex
 */
const processSubdirectories = async ({
  entityDir,
  entityType,
  existingIndex,
}: {
  entityDir: string;
  entityType: StaticEntityType;
  recursive?: boolean;
  existingIndex?: DirectoryIndex | null;
}): Promise<{
  directories: Record<string, DirectoryEntry>;
  maxLastUpdated: string;
}> => {
  const directories: Record<string, DirectoryEntry> = {};
  const existingDirs = existingIndex?.directories || {};
  let maxLastUpdated = new Date().toISOString();

  try {
    // Get subdirectories (non-hidden directories)
    const entries = await fs.readdir(entityDir, { withFileTypes: true });
    const subdirs = entries
      .filter(
        (entry) =>
          entry.isDirectory() &&
          !entry.name.startsWith(".") &&
          entry.name !== "queries",
      )
      .map((entry) => entry.name)
      .sort(); // Sort for consistent order

    console.log(`Found ${subdirs.length} subdirectories in ${entityType}`);

    for (const subdir of subdirs) {
      const subPath = path.join(entityDir, subdir);
      try {
        // Recursively generate index for subdirectory (same entityType)
        await generateIndexForEntityType(subPath, entityType);

        // Read sub-index
        const subIndexPath = path.join(subPath, INDEX_FILENAME);
        if (await fileExists(subIndexPath)) {
          const subContent = await fs.readFile(subIndexPath, "utf8");
          const subIndex: DirectoryIndex = JSON.parse(subContent);
          const existingEntry = existingDirs[subdir];

          // Track the maximum lastUpdated timestamp
          if (subIndex.lastUpdated > maxLastUpdated) {
            maxLastUpdated = subIndex.lastUpdated;
          }

          // Preserve existing directory entry if subdirectory's lastUpdated unchanged
          if (existingEntry && existingEntry.lastModified === subIndex.lastUpdated) {
            directories[subdir] = existingEntry;
          } else {
            // Subdirectory changed - create fresh directory entry
            directories[subdir] = {
              $ref: `./${subdir}`,
              lastModified: subIndex.lastUpdated,
            };
          }
        } else {
          console.warn(`⚠️  No index found for subdirectory: ${subPath}`);
        }
      } catch (subError) {
        console.warn(`⚠️  Failed to process subdirectory ${subdir}:`, subError);
        // Continue with other subdirs
      }
    }
  } catch (aggError) {
    console.warn("⚠️  Failed to aggregate subdirectories:", aggError);
  }

  return { directories, maxLastUpdated };
};

/**
 * Check if index content has changed
 * @param root0
 * @param root0.existingIndex
 * @param root0.files
 * @param root0.directories
 */
const hasIndexContentChanged = ({
  existingIndex,
  files,
  directories,
}: {
  existingIndex: DirectoryIndex | null;
  files: Record<string, FileEntry>;
  directories: Record<string, DirectoryEntry>;
}): boolean => {
  if (!existingIndex) {
    return true;
  }

  const filesChanged =
    JSON.stringify(existingIndex.files || {}) !== JSON.stringify(files);
  const dirsChanged =
    JSON.stringify(existingIndex.directories || {}) !==
    JSON.stringify(directories);

  return filesChanged || dirsChanged;
};

/**
 * Validate that all files referenced in the index exist
 * @param root0
 * @param root0.index
 * @param root0.entityDir
 */
const validateIndexFiles = async ({
  index,
  entityDir,
}: {
  index: DirectoryIndex;
  entityDir: string;
}): Promise<number> => {
  let missingFiles = 0;

  if (index.files) {
    for (const [, fileEntry] of Object.entries(index.files)) {
      const fileName = (fileEntry as FileEntry).$ref.replace("./", "");
      const filePath = path.join(entityDir, fileName);
      if (!(await fileExists(filePath))) {
        console.warn(`⚠️  Referenced file not found: ${fileName}`);
        missingFiles++;
      }
    }
  }

  return missingFiles;
};

/**
 * Validate a single subdirectory and its index
 * @param root0
 * @param root0.subdirName
 * @param root0.subdirMeta
 * @param root0.entityDir
 */
const validateSubdirectory = async ({
  subdirName,
  subdirMeta,
  entityDir,
}: {
  subdirName: string;
  subdirMeta: DirectoryEntry;
  entityDir: string;
}): Promise<boolean> => {
  const subPath = path.join(entityDir, subdirName);
  const subIndexPath = path.join(subPath, INDEX_FILENAME);

  // Check if sub-index exists
  if (!(await fileExists(subIndexPath))) {
    console.warn(`Warning: Subdirectory index not found: ${subIndexPath}`);
    return false;
  }

  // Read and validate sub-index
  try {
    const subContent = await fs.readFile(subIndexPath, "utf8");
    const subIndex: DirectoryIndex = JSON.parse(subContent);

    // Check metadata consistency
    if (subIndex.lastUpdated !== subdirMeta.lastModified) {
      console.warn(
        `Warning: Last updated mismatch in ${subdirName}: index=${subIndex.lastUpdated}, metadata=${subdirMeta.lastModified}`,
      );
      return false;
    }

    // Recursively validate sub-index
    return await validateStaticDataIndex(subPath);
  } catch (subError) {
    console.warn(
      `Warning: Failed to validate subdirectory ${subdirName}:`,
      subError,
    );
    return false;
  }
};

/**
 * Validate all subdirectories in the index
 * @param root0
 * @param root0.index
 * @param root0.entityDir
 */
const validateIndexDirectories = async ({
  index,
  entityDir,
}: {
  index: DirectoryIndex;
  entityDir: string;
}): Promise<number> => {
  let subdirIssues = 0;

  if (index.directories) {
    for (const [subdirName, subdirMeta] of Object.entries(index.directories)) {
      const isValid = await validateSubdirectory({
        subdirName,
        subdirMeta,
        entityDir,
      });
      if (!isValid) {
        subdirIssues++;
      }
    }
  }

  return subdirIssues;
};

/**
 * Get entity type from directory path
 * @param dirPath
 */
export const getEntityTypeFromPath = (dirPath: string): StaticEntityType | null => {
  // Use simple string operations to avoid sync Node.js imports
  const dirName =
    dirPath.split("/").pop() || dirPath.split("\\").pop() || dirPath;
  return VALID_ENTITY_TYPES.has(dirName as StaticEntityType)
    ? (dirName as StaticEntityType)
    : null;
};
