/**
 * @vitest-environment node
 *
 * Unit tests for static data index generator change detection logic
 * Tests that unchanged file/directory entries are preserved to prevent unnecessary timestamp cascades
 */

import { mkdir, rm,writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { DirectoryIndex } from "@bibgraph/utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Import the internal helper functions we're testing
// Note: These are not exported, so we'll test the public API behavior instead
import {
  generateIndexForEntityType,
  getStaticDataIndex,
} from "./static-data-index-generator";

describe("static-data-index-generator - Change Detection", () => {
  let testDir: string;
  let entityDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `bibgraph-test-${Date.now()}`);
    entityDir = join(testDir, "works");
    await mkdir(entityDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe("File Entry Preservation", () => {
    it("should preserve FileEntry for unchanged file (same content hash)", async () => {
      // Create test file with content
      const testFile = join(entityDir, "W123.json");
      const testContent = { id: "https://openalex.org/W123", title: "Test Work" };
      await writeFile(testFile, JSON.stringify(testContent), "utf8");

      // Generate initial index
      await generateIndexForEntityType(entityDir, "work", false);

      const index1 = await getStaticDataIndex(entityDir);
      expect(index1).toBeDefined();
      expect(index1?.files?.["W123"]).toBeDefined();

      const initialLastRetrieved = index1!.files!["W123"].lastRetrieved;

      // Wait a bit to ensure timestamp would be different
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Regenerate index without changing file
      await generateIndexForEntityType(entityDir, "work", false);

      const index2 = await getStaticDataIndex(entityDir);
      const updatedLastRetrieved = index2!.files!["W123"].lastRetrieved;

      // Key assertion: lastRetrieved should be identical (same object reference)
      expect(updatedLastRetrieved).toBe(initialLastRetrieved);

      // lastUpdated should NOT have changed (index structure unchanged)
      expect(index2!.lastUpdated).toBe(index1!.lastUpdated);
    });

    it("should update FileEntry for changed file (different content hash)", async () => {
      // Create test file with content
      const testFile = join(entityDir, "W123.json");
      const testContent = { id: "https://openalex.org/W123", title: "Original" };
      await writeFile(testFile, JSON.stringify(testContent), "utf8");

      // Generate initial index
      await generateIndexForEntityType(entityDir, "work", false);

      const index1 = await getStaticDataIndex(entityDir);
      const initialLastRetrieved = index1!.files!["W123"].lastRetrieved;

      // Wait to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Modify file content
      const modifiedContent = { id: "https://openalex.org/W123", title: "Modified" };
      await writeFile(testFile, JSON.stringify(modifiedContent), "utf8");

      // Regenerate index
      await generateIndexForEntityType(entityDir, "work", false);

      const index2 = await getStaticDataIndex(entityDir);
      const updatedLastRetrieved = index2!.files!["W123"].lastRetrieved;

      // Key assertion: lastRetrieved should be updated (different content hash)
      expect(updatedLastRetrieved).not.toBe(initialLastRetrieved);

      // lastUpdated should have changed (index structure changed)
      expect(index2!.lastUpdated).not.toBe(index1!.lastUpdated);
    });

    it("should add FileEntry for new file", async () => {
      // Create initial file
      const testFile1 = join(entityDir, "W123.json");
      await writeFile(testFile1, JSON.stringify({ id: "W123" }), "utf8");

      await generateIndexForEntityType(entityDir, "work", false);

      const index1 = await getStaticDataIndex(entityDir);
      expect(Object.keys(index1!.files!)).toHaveLength(1);

      // Add new file
      const testFile2 = join(entityDir, "W456.json");
      await writeFile(testFile2, JSON.stringify({ id: "W456" }), "utf8");

      await generateIndexForEntityType(entityDir, "work", false);

      const index2 = await getStaticDataIndex(entityDir);
      expect(Object.keys(index2!.files!)).toHaveLength(2);
      expect(index2!.files!["W456"]).toBeDefined();

      // lastUpdated should have changed (structure changed)
      expect(index2!.lastUpdated).not.toBe(index1!.lastUpdated);
    });

    it("should remove FileEntry for deleted file", async () => {
      // Create two files
      const testFile1 = join(entityDir, "W123.json");
      const testFile2 = join(entityDir, "W456.json");
      await writeFile(testFile1, JSON.stringify({ id: "W123" }), "utf8");
      await writeFile(testFile2, JSON.stringify({ id: "W456" }), "utf8");

      await generateIndexForEntityType(entityDir, "work", false);

      const index1 = await getStaticDataIndex(entityDir);
      expect(Object.keys(index1!.files!)).toHaveLength(2);

      // Delete one file
      await rm(testFile2);

      await generateIndexForEntityType(entityDir, "work", false);

      const index2 = await getStaticDataIndex(entityDir);
      expect(Object.keys(index2!.files!)).toHaveLength(1);
      expect(index2!.files!["W456"]).toBeUndefined();

      // lastUpdated should have changed (structure changed)
      expect(index2!.lastUpdated).not.toBe(index1!.lastUpdated);
    });
  });

  describe("Subdirectory Entry Preservation", () => {
    it("should preserve DirectoryEntry for unchanged subdirectory", async () => {
      // Create subdirectory with file
      const subDir = join(entityDir, "subdir");
      await mkdir(subDir, { recursive: true });

      const testFile = join(subDir, "filter=test.json");
      await writeFile(testFile, JSON.stringify({ id: "test" }), "utf8");

      // Generate initial index (recursive)
      await generateIndexForEntityType(entityDir, "work", true);

      const index1 = await getStaticDataIndex(entityDir);
      const initialLastModified = index1!.directories!["subdir"].lastModified;

      // Wait to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Regenerate index without changing subdirectory
      await generateIndexForEntityType(entityDir, "work", true);

      const index2 = await getStaticDataIndex(entityDir);
      const updatedLastModified = index2!.directories!["subdir"].lastModified;

      // Key assertion: lastModified should be identical (subdirectory unchanged)
      expect(updatedLastModified).toBe(initialLastModified);

      // Parent lastUpdated should NOT have changed
      expect(index2!.lastUpdated).toBe(index1!.lastUpdated);
    });

    it("should update DirectoryEntry when subdirectory content changes", async () => {
      // Create subdirectory with file
      const subDir = join(entityDir, "subdir");
      await mkdir(subDir, { recursive: true });

      const testFile = join(subDir, "filter=test.json");
      await writeFile(testFile, JSON.stringify({ id: "test" }), "utf8");

      await generateIndexForEntityType(entityDir, "work", true);

      const index1 = await getStaticDataIndex(entityDir);
      const initialLastModified = index1!.directories!["subdir"].lastModified;

      // Wait to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Modify subdirectory file
      await writeFile(testFile, JSON.stringify({ id: "modified" }), "utf8");

      await generateIndexForEntityType(entityDir, "work", true);

      const index2 = await getStaticDataIndex(entityDir);
      const updatedLastModified = index2!.directories!["subdir"].lastModified;

      // Key assertion: lastModified should be updated (subdirectory changed)
      expect(updatedLastModified).not.toBe(initialLastModified);

      // Parent lastUpdated should have changed
      expect(index2!.lastUpdated).not.toBe(index1!.lastUpdated);
    });
  });

  describe("Multiple Files with Selective Changes", () => {
    it("should only update changed file entries", async () => {
      // Create multiple files
      const files = {
        "W123.json": { id: "W123", title: "Work 1" },
        "W456.json": { id: "W456", title: "Work 2" },
        "W789.json": { id: "W789", title: "Work 3" },
      };

      for (const [fileName, content] of Object.entries(files)) {
        await writeFile(join(entityDir, fileName), JSON.stringify(content), "utf8");
      }

      await generateIndexForEntityType(entityDir, "work", false);

      const index1 = await getStaticDataIndex(entityDir) as DirectoryIndex;
      const initialTimestamps = {
        W123: index1.files!["W123"].lastRetrieved,
        W456: index1.files!["W456"].lastRetrieved,
        W789: index1.files!["W789"].lastRetrieved,
      };

      // Wait to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Modify only W456
      await writeFile(
        join(entityDir, "W456.json"),
        JSON.stringify({ id: "W456", title: "Modified Work 2" }),
        "utf8"
      );

      await generateIndexForEntityType(entityDir, "work", false);

      const index2 = await getStaticDataIndex(entityDir) as DirectoryIndex;
      const updatedTimestamps = {
        W123: index2.files!["W123"].lastRetrieved,
        W456: index2.files!["W456"].lastRetrieved,
        W789: index2.files!["W789"].lastRetrieved,
      };

      // W123 and W789 should have same timestamps (unchanged)
      expect(updatedTimestamps.W123).toBe(initialTimestamps.W123);
      expect(updatedTimestamps.W789).toBe(initialTimestamps.W789);

      // W456 should have different timestamp (changed)
      expect(updatedTimestamps.W456).not.toBe(initialTimestamps.W456);
    });
  });
});
