/**
 * Static data index generator for OpenAlex entities Generates index.json files for cached entity directories to enable efficient data discovery
 */

import type * as FsPromisesModule from "node:fs/promises";
import type * as PathModule from "node:path";

import {
  type DirectoryEntry,
  type DirectoryIndex,
  type FileEntry,
  generateContentHash,
  isDirectoryIndex,
  isValidOpenAlexEntity,
} from "@bibgraph/utils/static-data/cache";

// Local type definition (not exported from @bibgraph/client)
type StaticEntityType = 'author' | 'work' | 'source' | 'institution' | 'topic' | 'publisher' | 'funder';

const VALID_ENTITY_TYPES: ReadonlySet<string> = new Set([
  "work",
  "author",
  "source",
  "institution",
  "topic",
  "publisher",
  "funder",
] satisfies StaticEntityType[]);

const isStaticEntityType = (value: string): value is StaticEntityType => VALID_ENTITY_TYPES.has(value);

interface NodeModules {
  fs: typeof FsPromisesModule;
  path: typeof PathModule;
}

// Dynamic imports for Node.js modules to avoid browser bundling issues. Cached after first resolution so every caller shares one import.
let nodeModules: NodeModules | undefined;

/**
 * Resolve (and memoize) the Node.js modules required for file operations
 */
const getNodeModules = async (): Promise<NodeModules> => {
  if (nodeModules === undefined) {
    const [fs, path] = await Promise.all([
      import("node:fs/promises"),
      import("node:path"),
    ]);
    nodeModules = { fs, path };
  }

  return nodeModules;
};

/**
 * Check if file exists (using dynamic import)
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

const INDEX_FILENAME = "index.json";

/**
 * Ensure directory exists, create if it doesn't
 */
const ensureDirectoryExists = async (dirPath: string): Promise<void> => {
  const { fs } = await getNodeModules();
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
 * Process JSON files in a directory and extract metadata Preserves existing FileEntry objects for unchanged files to prevent unnecessary timestamp updates
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
  const { fs, path } = await getNodeModules();
  const files: Record<string, FileEntry> = {};
  const existingFiles: Partial<Record<string, FileEntry>> = existingIndex?.files ?? {};

  for (const fileName of jsonFiles) {
    const filePath = path.join(entityDir, fileName);
    const fileStats = await fs.stat(filePath);
    const entityId = path.basename(fileName, ".json");

    try {
      const content = await fs.readFile(filePath, "utf8");
      const data: unknown = JSON.parse(content);

      // Basic validation - ensure it looks like an OpenAlex entity
      if (!isValidOpenAlexEntity(data)) {
        console.warn(
          `⚠️  File ${fileName} doesn't appear to be a valid OpenAlex entity`,
        );
      }

      const currentHash = await generateContentHash(data);
      const existingEntry = existingFiles[entityId];

      // Preserve existing entry if content hash unchanged (prevents timestamp cascade)
      if (existingEntry?.contentHash === currentHash) {
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
 * Check if index content has changed
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

  const isFilesChanged =
    JSON.stringify(existingIndex.files ?? {}) !== JSON.stringify(files);
  const isDirectoriesChanged =
    JSON.stringify(existingIndex.directories ?? {}) !==
    JSON.stringify(directories);

  return isFilesChanged || isDirectoriesChanged;
};

/**
 * Callback used by {@link processSubdirectories} to (re)generate a subdirectory's own index. Taking this as a parameter, rather than calling `generateIndexForEntityType` by name, avoids a circular top-level reference between the two functions.
 */
type GenerateIndexForEntityType = (entityDir: string, entityType: StaticEntityType) => Promise<void>;

/**
 * Process subdirectories and generate their indexes Preserves existing DirectoryEntry objects for unchanged subdirectories to prevent unnecessary timestamp updates
 */
const processSubdirectories = async (
  {
    entityDir,
    entityType,
    existingIndex,
  }: {
    entityDir: string;
    entityType: StaticEntityType;
    existingIndex?: DirectoryIndex | null;
  },
  generateIndex: GenerateIndexForEntityType,
): Promise<{
  directories: Record<string, DirectoryEntry>;
  maxLastUpdated: string;
}> => {
  const { fs, path } = await getNodeModules();
  const directories: Record<string, DirectoryEntry> = {};
  const existingDirectories: Partial<Record<string, DirectoryEntry>> = existingIndex?.directories ?? {};
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

    console.log(`Found ${String(subdirs.length)} subdirectories in ${entityType}`);

    for (const subdir of subdirs) {
      const subPath = path.join(entityDir, subdir);
      try {
        // Recursively generate index for subdirectory (same entityType)
        await generateIndex(subPath, entityType);

        // Read sub-index
        const subIndexPath = path.join(subPath, INDEX_FILENAME);
        if (await fileExists(subIndexPath)) {
          const subContent = await fs.readFile(subIndexPath, "utf8");
          const subIndex: unknown = JSON.parse(subContent);
          if (!isDirectoryIndex(subIndex)) {
            console.warn(`⚠️  Invalid sub-index structure: ${subIndexPath}`);
            continue;
          }
          const existingEntry = existingDirectories[subdir];

          // Track the maximum lastUpdated timestamp
          if (subIndex.lastUpdated > maxLastUpdated) {
            maxLastUpdated = subIndex.lastUpdated;
          }

          // Preserve existing directory entry if subdirectory's lastUpdated unchanged
          if (existingEntry?.lastModified === subIndex.lastUpdated) {
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
 * Generate index for a specific entity type directory
 */
export const generateIndexForEntityType = async (entityDir: string, entityType: StaticEntityType, recursive = true): Promise<void> => {
  const { fs, path } = await getNodeModules();
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
      `Found ${String(jsonFiles.length)} JSON files in ${entityType} directory`,
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
        const parsedExistingIndex: unknown = JSON.parse(existingContent);
        existingIndex = isDirectoryIndex(parsedExistingIndex) ? parsedExistingIndex : null;
      }
    } catch (error) {
      console.warn(`⚠️  Failed to read existing index: ${String(error)}`);
    }

    // Process each file to extract metadata, preserving unchanged entries
    const files = await processJsonFiles({ entityDir, jsonFiles, entityType, existingIndex });

    // Process subdirectories if recursive
    let directories: Record<string, DirectoryEntry> = {};
    let maxLastUpdated = new Date().toISOString();

    if (recursive) {
      const { directories: subDirectories, maxLastUpdated: subMaxUpdated } =
        await processSubdirectories({ entityDir, entityType, existingIndex }, generateIndexForEntityType);
      directories = subDirectories;
      maxLastUpdated = subMaxUpdated;
    }

    const currentIsoString = new Date().toISOString();
    // ISO strings are lexicographically comparable - use string comparison
    const overallLastUpdated = maxLastUpdated > currentIsoString ? maxLastUpdated : currentIsoString;

    // Check if content has actually changed (excluding lastUpdated field)
    const isContentChanged = hasIndexContentChanged({
      existingIndex,
      files,
      directories,
    });

    // Create index with conditional lastUpdated
    const index: DirectoryIndex = {
      lastUpdated: isContentChanged
        ? overallLastUpdated
        : (existingIndex?.lastUpdated ?? overallLastUpdated),
      ...(Object.keys(files).length > 0 && { files }),
      ...(Object.keys(directories).length > 0 && { directories }),
    };

    // Only write if content has changed
    if (isContentChanged) {
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf-8");
      console.log(
        `Updated index for ${entityType}: ${String(Object.keys(files).length)} files, ${String(Object.keys(directories).length)} directories (content changed)`,
      );
    } else {
      console.log(
        `Index for ${entityType} unchanged: ${String(Object.keys(files).length)} files, ${String(Object.keys(directories).length)} directories (skipped write)`,
      );
    }
  } catch (error) {
    console.error(`Failed to generate index for ${entityType}:`, error);
    throw error;
  }
};

/**
 * Generate index for a specific entity type with auto-download support
 */
export const generateIndexWithAutoDownload = async ({
  entityDir,
  entityType,
}: {
  entityDir: string;
  entityType: StaticEntityType;
  staticDataDir?: string;
}): Promise<void> => {
  try {
    console.log(`Auto-download enabled for ${entityType}`);

    // First generate index for existing files
    await generateIndexForEntityType(entityDir, entityType);

    // TODO: Implement auto-download logic here This would integrate with the OpenAlex client to download missing popular entities
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
 * Generate index for all entity types in the static data directory
 */
export const generateAllIndexes = async (staticDataDir: string, options: Readonly<IndexGenerationOptions> = {}): Promise<void> => {
  const { fs, path } = await getNodeModules();
  try {
    console.log(`Generating indexes for all entity types in ${staticDataDir}`);

    // Ensure static data directory exists
    await ensureDirectoryExists(staticDataDir);

    // Find all entity type directories
    const entries = await fs.readdir(staticDataDir, { withFileTypes: true });
    const entityDirectories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter(isStaticEntityType);

    if (entityDirectories.length === 0) {
      console.log(
        "No entity directories found - directories will be created when data is cached",
      );
      return;
    }

    // Generate indexes for each entity type
    const results = await Promise.allSettled(
      entityDirectories.map(async (entityType) => {
        const dir = path.join(staticDataDir, entityType);
        console.log(`Processing ${entityType} directory...`);

        await (options.autoDownload === true
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
        `Warning: Generated ${String(successful)} indexes, ${String(failed)} failed`,
      );
      for (const [index, result] of results.entries()) {
        if (result.status === "rejected") {
          console.error(
            `Failed to generate index for ${entityDirectories[index]}:`,
            result.reason,
          );
        }
      }
    } else {
      console.log(`Successfully generated ${String(successful)} entity indexes`);
    }
  } catch (error) {
    console.error("Failed to generate static data indexes:", error);
    throw error;
  }
};

/**
 * Validate that all files referenced in the index exist
 */
const validateIndexFiles = async ({
  index,
  entityDir,
}: {
  index: DirectoryIndex;
  entityDir: string;
}): Promise<number> => {
  const { path } = await getNodeModules();
  let missingFiles = 0;

  if (index.files) {
    for (const fileEntry of Object.values(index.files)) {
      const fileName = fileEntry.$ref.replace("./", "");
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
 * Callback used by {@link validateSubdirectory} to recursively validate a subdirectory's own index. Taking this as a parameter, rather than calling `validateStaticDataIndex` by name, avoids a circular top-level reference between the two functions.
 */
type ValidateIndex = (entityDir: string) => Promise<boolean>;

/**
 * Validate a single subdirectory and its index
 */
const validateSubdirectory = async (
  {
    subdirName,
    subdirMeta,
    entityDir,
  }: {
    subdirName: string;
    subdirMeta: DirectoryEntry;
    entityDir: string;
  },
  validateIndex: ValidateIndex,
): Promise<boolean> => {
  const { fs, path } = await getNodeModules();
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
    const subIndex: unknown = JSON.parse(subContent);
    if (!isDirectoryIndex(subIndex)) {
      console.warn(`Warning: Invalid sub-index structure: ${subIndexPath}`);
      return false;
    }

    // Check metadata consistency
    if (subIndex.lastUpdated !== subdirMeta.lastModified) {
      console.warn(
        `Warning: Last updated mismatch in ${subdirName}: index=${subIndex.lastUpdated}, metadata=${subdirMeta.lastModified}`,
      );
      return false;
    }

    // Recursively validate sub-index
    return await validateIndex(subPath);
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
 */
const validateIndexDirectories = async (
  {
    index,
    entityDir,
  }: {
    index: DirectoryIndex;
    entityDir: string;
  },
  validateIndex: ValidateIndex,
): Promise<number> => {
  let subdirIssues = 0;

  if (index.directories) {
    for (const [subdirName, subdirMeta] of Object.entries(index.directories)) {
      const isValid = await validateSubdirectory({
        subdirName,
        subdirMeta,
        entityDir,
      }, validateIndex);
      if (!isValid) {
        subdirIssues++;
      }
    }
  }

  return subdirIssues;
};

/**
 * Validate static data index and entities recursively
 */
export const validateStaticDataIndex = async (entityDir: string): Promise<boolean> => {
  const { fs, path } = await getNodeModules();
  try {
    const indexPath = path.join(entityDir, INDEX_FILENAME);

    if (!(await fileExists(indexPath))) {
      console.warn(`Warning: No index found at ${indexPath}`);
      return false;
    }

    const indexContent = await fs.readFile(indexPath, "utf8");
    const index: unknown = JSON.parse(indexContent);

    // Validate index structure
    if (!isDirectoryIndex(index)) {
      console.error(`Invalid index structure in ${indexPath}`);
      return false;
    }

    // Check if all referenced files exist
    const missingFiles = await validateIndexFiles({ index, entityDir });
    if (missingFiles > 0) {
      console.warn(`Warning: Index references ${String(missingFiles)} missing files`);
      return false;
    }

    // Recursively validate directories if present
    const subdirIssues = await validateIndexDirectories({ index, entityDir }, validateStaticDataIndex);
    if (subdirIssues > 0) {
      console.warn(
        `Warning: ${String(subdirIssues)} subdirectory validation issues found`,
      );
      return false;
    }

    const fileCount = index.files ? Object.keys(index.files).length : 0;
    const dirCount = index.directories
      ? Object.keys(index.directories).length
      : 0;
    console.log(
      `Index validation passed: ${String(fileCount)} files, ${String(dirCount)} directories`,
    );
    return true;
  } catch (error) {
    console.error("Failed to validate index:", error);
    return false;
  }
};

/**
 * Get static data index for an entity type
 */
export const getStaticDataIndex = async (entityDir: string): Promise<DirectoryIndex | null> => {
  const { fs, path } = await getNodeModules();
  try {
    const indexPath = path.join(entityDir, INDEX_FILENAME);

    if (!(await fileExists(indexPath))) {
      return null;
    }

    const indexContent = await fs.readFile(indexPath, "utf8");
    const index: unknown = JSON.parse(indexContent);
    return isDirectoryIndex(index) ? index : null;
  } catch (error) {
    console.error("Failed to read static data index:", error);
    return null;
  }
};

/**
 * Get entity type from directory path
 */
export const getEntityTypeFromPath = (dirPath: string): StaticEntityType | null => {
  // Use simple string operations to avoid sync Node.js imports
  const dirName =
    dirPath.split("/").pop() ?? dirPath.split("\\").pop() ?? dirPath;
  return isStaticEntityType(dirName) ? dirName : null;
};
