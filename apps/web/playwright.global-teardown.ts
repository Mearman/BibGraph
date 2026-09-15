/**
 * Playwright global teardown
 * Handles cleanup after all tests complete
 */

import fs from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { stopMSWServer } from "./test/setup/msw-setup";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HAR_CACHE_DIR = path.join(__dirname, "test-results/har-cache");
const BYTES_PER_KB = 1024;

const globalTeardown = () => {
  console.log("🧹 Starting Playwright global teardown...");

  // Log HAR cache statistics
  if (fs.existsSync(HAR_CACHE_DIR)) {
    const harFiles = fs.readdirSync(HAR_CACHE_DIR).filter((f) => f.endsWith(".har"));
    const totalSize = harFiles.reduce((accumulator, file) => {
      const stats = fs.statSync(path.join(HAR_CACHE_DIR, file));
      return accumulator + stats.size;
    }, 0);

    console.log(`📊 HAR cache statistics:`);
    console.log(`   Files: ${String(harFiles.length)}`);
    console.log(`   Total size: ${(totalSize / BYTES_PER_KB / BYTES_PER_KB).toFixed(2)} MB`);

    // Clean up warmup HAR file if it exists (keep only test-specific HARs in CI)
    if (process.env.CI !== undefined) {
      const warmupHar = path.join(HAR_CACHE_DIR, "warmup.har");
      if (fs.existsSync(warmupHar)) {
        fs.unlinkSync(warmupHar);
        console.log("✅ Cleaned up warmup HAR file");
      }
    }
  }

  // STOP MSW SERVER LAST - cleanup after all tests complete
  stopMSWServer();

  console.log("✨ Global teardown complete!");
};

 
export default globalTeardown;
