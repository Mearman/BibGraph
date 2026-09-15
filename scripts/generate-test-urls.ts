#!/usr/bin/env tsx

/**
 * Script to extract OpenAlex URLs from documentation and generate test data
 * Run with: pnpm tsx scripts/generate-test-urls.ts
 */

import { writeFile } from "fs/promises"
import { join } from "path"
import { extractOpenAlexPaths } from "./extract-openalex-paths.js"

interface TestUrlData {
	extractedAt: string
	totalUrls: number
	urls: string[]
}

async function generateTestUrls() {
	try {
		console.log("🔍 Starting URL generation script...")
		console.log("🔍 Extracting OpenAlex URLs from documentation...")

		// Extract URLs from documentation
		const { urls } = await extractOpenAlexPaths({
			searchDir: "./docs/openalex-docs",
		})

		console.log(`📊 Found ${urls.length} total URLs`)

		// Clean up markdown escaped characters and fix API issues
		const cleanedUrls = urls
			.map(
				(url) =>
					url
						// Markdown-unescape in a single left-to-right pass: each backslash-escaped character (\_, \%, \. etc., and \\ for a literal backslash) becomes the character itself
						.replace(/\\(.)/g, "$1")
						.replace(/group-by=/g, "group_by=") // Fix parameter naming: group-by -> group_by
						.replace(/per-page=/g, "per_page=") // Fix parameter naming: per-page -> per_page
						.replace(/%3E/g, ">") // Fix URL encoding: %3E -> >
						.replace(/last_known_institution\./g, "last_known_institutions.") // Fix field naming: singular -> plural
						.replace(/last_know_institutions\./g, "last_known_institutions.") // Fix typo: know -> known
						.replace(/last_known_instittions\./g, "last_known_institutions.") // Fix typo: instittions -> institutions
						.replace(/last_known_institution:/g, "last_known_institutions:") // Fix field naming in filters: singular -> plural
						.replace(/last_known_instittions:/g, "last_known_institutions:") // Fix typo: instittions -> institutions
						.replace(/group_by=publisher/g, "group_by=host_organization") // Fix sources field: publisher -> host_organization
						.replace(/filter=publisher:/g, "filter=host_organization:") // Fix sources filter field: publisher -> host_organization
			)
			.filter((url) => !url.includes("api_key=myapikey")) // Remove placeholder API key examples
			.filter((url) => !url.includes("has_ngrams:true")) // Remove deprecated ngrams feature

		// Remove duplicates and sort (additional deduplication after cleaning)
		const uniqueUrls = [...new Set(cleanedUrls)].sort()

		console.log(
			`🧹 Cleaned ${urls.length - cleanedUrls.filter((url, i) => url === urls[i]).length} URLs with escaped characters`
		)
		console.log(`📋 Deduplicated ${cleanedUrls.length - uniqueUrls.length} duplicate URLs`)

		// Prepare test data
		const testData: TestUrlData = {
			extractedAt: new Date().toISOString(),
			totalUrls: uniqueUrls.length,
			urls: uniqueUrls,
		}

		console.log(`📈 Found ${uniqueUrls.length} unique URLs`)

		// Write test data to JSON file
		const outputPath = join("./apps/web/src/test/data/openalex-test-urls.json")
		await writeFile(outputPath, JSON.stringify(testData, null, 2), "utf-8")

		console.log(`✅ Test URLs written to: ${outputPath}`)
		console.log(`📝 Sample URLs:`)
		testData.urls.slice(0, 5).forEach((url, index) => {
			console.log(`  ${index + 1}. ${url}`)
		})

		return testData
	} catch (error) {
		console.error("❌ Failed to generate test URLs:", error)
		process.exit(1)
	}
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	generateTestUrls()
		.then((data) => {
			console.log(`🎉 Successfully generated test data with ${data.totalUrls} URLs`)
		})
		.catch((error) => {
			console.error("💥 Script failed:", error)
			process.exit(1)
		})
}

export { generateTestUrls, type TestUrlData }
