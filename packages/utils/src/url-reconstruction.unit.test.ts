/**
 * URL Reconstruction Utility Tests
 *
 * Tests the entity-based URL reconstruction functionality
 * that converts entity type + ID pairs back to navigation URLs.
 */

import type { EntityType } from '@bibgraph/types'
import { describe, expect, it } from 'vitest'

import {
	parseExistingAppUrl,
	reconstructEntityUrl,
	reconstructGitHubPagesUrl,
	reconstructStandardUrl
} from './url-reconstruction.js'

describe('URL Reconstruction Utility', () => {
	describe('reconstructEntityUrl', () => {
		it('should reconstruct basic OpenAlex URLs', () => {
			expect(reconstructEntityUrl('works', 'W1234567890')).toBe('/works/W1234567890')
			expect(reconstructEntityUrl('authors', 'A1234567890')).toBe('/authors/A1234567890')
			expect(reconstructEntityUrl('sources', 'S1234567890')).toBe('/sources/S1234567890')
			expect(reconstructEntityUrl('institutions', 'I1234567890')).toBe('/institutions/I1234567890')
		})

		it('should reconstruct DOI URLs for works', () => {
			const doi = '10.1038/nature12345'
			expect(reconstructEntityUrl('works', doi)).toBe(`/doi/${doi}`)
		})

		it('should reconstruct ORCID URLs for authors', () => {
			const orcid = '0000-0002-1825-0097'
			expect(reconstructEntityUrl('authors', orcid)).toBe(`/authors/orcid/${orcid}`)
		})

		it('should reconstruct ROR URLs for institutions', () => {
			const ror = 'https://ror.org/1234567890'
			// ROR URLs get extracted and routed through institutions/ror/...
			expect(reconstructEntityUrl('institutions', ror)).toBe(`/institutions/ror/1234567890`)
		})

		it('should reconstruct ISSN URLs for sources', () => {
			const issn = '1234-5678'
			expect(reconstructEntityUrl('sources', issn)).toBe(`/sources/issn/${issn}`)
		})

		it('should handle base path configuration', () => {
			const options = { basePath: '/BibGraph' }
			expect(reconstructEntityUrl('works', 'W123', options)).toBe('/BibGraph/works/W123')
			expect(reconstructEntityUrl('authors', 'A456', options)).toBe('/BibGraph/authors/A456')
		})

		it('should handle empty base path', () => {
			const options = { basePath: '' }
			expect(reconstructEntityUrl('works', 'W123', options)).toBe('/works/W123')
		})

		it('should preserve external URLs when configured', () => {
			const doi = '10.1038/nature12345'
			const options = { preserveExternalUrls: true }
			expect(reconstructEntityUrl('works', doi, options)).toBe(doi)
		})

		it('should handle all entity types', () => {
			const entityId = 'TEST123'
			const entityTypes: EntityType[] = [
				'works', 'authors', 'sources', 'institutions', 'publishers',
				'concepts', 'funders', 'topics', 'keywords', 'domains', 'fields', 'subfields'
			]

			for (const entityType of entityTypes) {
				const expected = `/${entityType}/${entityId}`
				expect(reconstructEntityUrl(entityType, entityId)).toBe(expected)
			}
		})

		it('should handle special characters in IDs', () => {
			const specialId = 'W123-456_789/TEST'
			expect(reconstructEntityUrl('works', specialId)).toBe(`/works/${specialId}`)
		})

		it('should handle empty options', () => {
			expect(reconstructEntityUrl('works', 'W123', {})).toBe('/works/W123')
			expect(reconstructEntityUrl('works', 'W123')).toBe('/works/W123')
		})
	})

	describe('parseExistingAppUrl', () => {
		it('should parse basic entity URLs', () => {
			expect(parseExistingAppUrl('/works/W1234567890')).toEqual({
				entityType: 'works',
				entityId: 'W1234567890'
			})
			expect(parseExistingAppUrl('/authors/A1234567890')).toEqual({
				entityType: 'authors',
				entityId: 'A1234567890'
			})
		})

		it('should handle GitHub Pages base path', () => {
			expect(parseExistingAppUrl('/BibGraph/works/W1234567890')).toEqual({
				entityType: 'works',
				entityId: 'W1234567890'
			})
			expect(parseExistingAppUrl('/BibGraph/authors/A1234567890')).toEqual({
				entityType: 'authors',
				entityId: 'A1234567890'
			})
		})

		it('should handle full URLs with domain', () => {
			expect(parseExistingAppUrl('https://example.com/works/W1234567890')).toEqual({
				entityType: 'works',
				entityId: 'W1234567890'
			})
		})

		it('should return null for invalid URLs', () => {
			expect(parseExistingAppUrl('/invalid/path')).toBeNull()
			expect(parseExistingAppUrl('/')).toBeNull()
			expect(parseExistingAppUrl('')).toBeNull()
			expect(parseExistingAppUrl('/unknown/W123')).toBeNull()
		})

		it('should handle query parameters', () => {
			expect(parseExistingAppUrl('/works/W1234567890?filter=recent')).toEqual({
				entityType: 'works',
				entityId: 'W1234567890'
			})
		})

		it('should handle hash fragments', () => {
			expect(parseExistingAppUrl('/works/W1234567890#section')).toEqual({
				entityType: 'works',
				entityId: 'W1234567890'
			})
		})

		it('should handle all valid entity types', () => {
			const entityTypes: EntityType[] = [
				'works', 'authors', 'sources', 'institutions', 'publishers',
				'concepts', 'funders', 'topics', 'keywords', 'domains', 'fields', 'subfields'
			]

			for (const entityType of entityTypes) {
				const result = parseExistingAppUrl(`/${entityType}/TEST123`)
				expect(result).toEqual({
					entityType,
					entityId: 'TEST123'
				})
			}
		})
	})

	
	describe('Integration Tests', () => {
		it('should round-trip URLs correctly', () => {
			const originalUrls = [
				'/works/W1234567890',
				'/authors/A1234567890',
				'/sources/S1234567890',
				'/institutions/I1234567890',
				'/doi/10.1038/nature12345',
				'/authors/orcid/0000-0002-1825-0097'
			]

			for (const url of originalUrls) {
				const parsed = parseExistingAppUrl(url)
				if (parsed?.entityType !== undefined && parsed.entityId !== undefined && parsed.entityId !== "") {
					const reconstructed = reconstructEntityUrl(parsed.entityType, parsed.entityId)
					// DOI/ORCID have special routing, so we compare after removing prefixes
					if (url.startsWith('/doi/')) {
						expect(reconstructed).toMatch(/^\/doi\//)
					} else if (url.startsWith('/authors/orcid/')) {
						expect(reconstructed).toMatch(/^\/authors\/orcid\//)
					} else {
						expect(reconstructed).toBe(url)
					}
				}
			}
		})

		it('should handle complex real-world examples', () => {
			// DOI example
			const doiUrl = '/doi/10.1371/journal.pone.0123456'
			expect(reconstructEntityUrl('works', '10.1371/journal.pone.0123456')).toBe(doiUrl)

			// ORCID example
			const orcidUrl = '/authors/orcid/0000-0002-1825-0097'
			expect(reconstructEntityUrl('authors', '0000-0002-1825-0097')).toBe(orcidUrl)

			// Complex OpenAlex ID
			const complexId = 'W3211234567-PUBLICation-Title'
			expect(reconstructEntityUrl('works', complexId)).toBe(`/works/${complexId}`)
		})

		it('should work with GitHub Pages deployment', () => {
			const githubPath = '/BibGraph'
			const workId = 'W1234567890'
			const authorId = 'A1234567890'
			const options = { basePath: githubPath }

			expect(reconstructEntityUrl('works', workId, options)).toBe(`${githubPath}/works/${workId}`)
			expect(reconstructEntityUrl('authors', authorId, options)).toBe(`${githubPath}/authors/${authorId}`)
		})

		it('should handle base path normalization', () => {
			const tests = [
				{ basePath: '/', expected: '/works/W123' },
				{ basePath: '', expected: '/works/W123' },
				{ basePath: '/BibGraph', expected: '/BibGraph/works/W123' },
				{ basePath: '/BibGraph/', expected: '/BibGraph/works/W123' }
			]

			for (const { basePath, expected } of tests) {
				const result = reconstructEntityUrl('works', 'W123', { basePath })
				expect(result).toBe(expected)
			}
		})
	})

	describe('Edge Cases', () => {
		it('should handle undefined/null inputs gracefully', () => {
			expect(() => reconstructEntityUrl(null as unknown as EntityType, 'W123')).not.toThrow()
			expect(() => reconstructEntityUrl('works', null)).not.toThrow()
			expect(() => reconstructEntityUrl('works', '')).not.toThrow()
		})

		it('should handle empty strings', () => {
			expect(reconstructEntityUrl('works', '')).toBe('/works/')
			expect(reconstructEntityUrl('authors', '')).toBe('/authors/')
		})

		it('should handle very long IDs', () => {
			const LONG_ID_DIGIT_COUNT = 100
			const longId = 'W' + '1'.repeat(LONG_ID_DIGIT_COUNT)
			expect(reconstructEntityUrl('works', longId)).toBe(`/works/${longId}`)
		})

		it('should handle special characters in entity types', () => {
			// This tests that we're using the proper enum values
			const entityTypes: EntityType[] = [
				'works', 'authors', 'sources', 'institutions', 'publishers',
				'concepts', 'funders', 'topics', 'keywords', 'domains', 'fields', 'subfields'
			]

			for (const entityType of entityTypes) {
				expect(() => reconstructEntityUrl(entityType, 'TEST123')).not.toThrow()
			}
		})
	})

	
	describe('Preconfigured Reconstructors', () => {
		it('should reconstruct URLs using standard reconstructor', () => {
			expect(reconstructStandardUrl('works', 'W123')).toBe('/works/W123')
			expect(reconstructStandardUrl('authors', 'A456')).toBe('/authors/A456')
		})

		it('should reconstruct URLs using GitHub Pages reconstructor', () => {
			expect(reconstructGitHubPagesUrl('works', 'W123')).toBe('/BibGraph/works/W123')
			expect(reconstructGitHubPagesUrl('authors', 'A456')).toBe('/BibGraph/authors/A456')
		})
	})

	describe('Performance', () => {
		it('should handle large numbers of URL reconstructions efficiently', () => {
			const RECONSTRUCTION_ITERATIONS = 1000
			const MAX_RECONSTRUCTION_DURATION_MS = 100 // Should complete in under 100ms
			const start = performance.now()

			for (let index = 0; index < RECONSTRUCTION_ITERATIONS; index++) {
				reconstructEntityUrl('works', `W${String(index)}`)
				reconstructEntityUrl('authors', `A${String(index)}`)
				reconstructEntityUrl('sources', `S${String(index)}`)
			}

			const duration = performance.now() - start
			expect(duration).toBeLessThan(MAX_RECONSTRUCTION_DURATION_MS)
		})

		it('should handle URL parsing efficiently', () => {
			const URL_PARSE_COUNT = 100
			const MAX_PARSE_DURATION_MS = 50 // Should complete in under 50ms
			const urls = Array.from({ length: URL_PARSE_COUNT }, (_, index) => `/works/W${String(index)}`)

			const start = performance.now()
			for (const url of urls) parseExistingAppUrl(url)
			const duration = performance.now() - start

			expect(duration).toBeLessThan(MAX_PARSE_DURATION_MS)
		})
	})
})