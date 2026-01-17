/**
 * File operations for reformatting and migrating OpenAlex data files
 */
import { readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { logger } from "@bibgraph/utils";

import { determineCanonicalQueryUrl, generateDescriptiveFilename } from "./url-encoding";

/**
 * Ensure consistent JSON formatting for all files
 * @param jsonContent
 */
export const formatJsonConsistently = (jsonContent: string): string => {
  try {
    const parsed: unknown = JSON.parse(jsonContent);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // If parsing fails, return original content
    logger.warn("general", "Could not parse JSON for formatting");
    return jsonContent;
  }
};

/**
 * Reformat existing JSON files for consistency
 * @param dataPath
 * @param entityType
 */
export const reformatExistingFiles = async (
  dataPath: string,
  entityType: string,
): Promise<void> => {
  const entityDir = join(dataPath, entityType);

  try {
    const files = await readdir(entityDir);
    let reformattedCount = 0;

    for (const file of files) {
      if (file.endsWith(".json") && file !== "index.json") {
        const filePath = join(entityDir, file);

        try {
          const originalContent = await readFile(filePath, "utf-8");
          const formattedContent = formatJsonConsistently(originalContent);

          // Only write if content changed
          if (originalContent !== formattedContent) {
            await writeFile(filePath, formattedContent);
            reformattedCount++;
          }
        } catch {
          logger.warn("general", "Could not reformat file", { file });
        }
      }
    }

    if (reformattedCount > 0) {
      logger.debug("general", "Reformatted files for consistent formatting", {
        reformattedCount,
      });
    }
  } catch {
    // Directory doesn't exist or other error - skip silently
  }
};

/**
 * Migrate query files from queries subdirectory to entity directory with simplified names
 * @param dataPath
 * @param entityType
 */
export const migrateQueryFilesToEntityDirectory = async (
  dataPath: string,
  entityType: string,
): Promise<void> => {
  logger.debug("general", "Migrating query files to entity directory", {
    entityType,
  });

  const entityDir = join(dataPath, entityType);
  const queriesDir = join(dataPath, entityType, "queries");
  let movedFiles = 0;

  try {
    const queryFiles = await readdir(queriesDir);

    for (const file of queryFiles) {
      if (file.endsWith(".json") && file !== "index.json") {
        const queryFilePath = join(queriesDir, file);

        try {
          const fileContent = await readFile(queryFilePath, "utf-8");

          // Determine if this is a query file and get its canonical URL
          const canonicalUrl = determineCanonicalQueryUrl(
            entityType,
            file.replace(".json", ""),
            fileContent,
          );

          if (canonicalUrl) {
            // Generate the simplified filename
            const newFilename = generateDescriptiveFilename(canonicalUrl);

            if (newFilename) {
              const newFilePath = join(entityDir, newFilename);

              // Check if the target file already exists
              try {
                await stat(newFilePath);
                logger.debug("general", "File already exists, skipping", {
                  newFilename,
                });
                continue;
              } catch {
                // File doesn't exist, proceed with move
              }

              try {
                // Write to new location with consistent formatting
                const formattedContent = formatJsonConsistently(fileContent);
                await writeFile(newFilePath, formattedContent);
                // Remove from old location
                await unlink(queryFilePath);

                logger.debug("general", "Moved query file", {
                  from: file,
                  to: newFilename,
                });
                movedFiles++;
              } catch {
                logger.warn("general", "Failed to move file", { file });
              }
            } else {
              logger.warn("general", "Could not generate filename for file", {
                file,
              });
            }
          } else {
            logger.warn(
              "general",
              "Could not determine canonical URL for file",
              { file },
            );
          }
        } catch {
          logger.warn("general", "Could not process query file", { file });
        }
      }
    }
  } catch {
    logger.debug("general", "No queries directory found or error accessing it");
  }

  if (movedFiles > 0) {
    logger.debug("general", "Moved query files to entity directory", {
      movedFiles,
    });
  } else {
    logger.debug("general", "No query files found to move");
  }
};
