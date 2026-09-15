/**
 * Sample URLs from each entity type to verify deployment
 */
import { expect,test } from '@playwright/test';

const BASE_URL = 'https://mearman.github.io/BibGraph';

// Sample URLs from each entity type
const testUrls = [
  { url: 'https://api.openalex.org/W2741809807', type: 'work', desc: 'Work W2741809807' },
  { url: 'https://api.openalex.org/authors/A5006060960', type: 'author', desc: 'Author A5006060960' },
  { url: 'https://api.openalex.org/concepts/C71924100', type: 'concept', desc: 'Concept C71924100' },
  { url: 'https://api.openalex.org/institutions/I4200000001', type: 'institution', desc: 'Institution' },
  { url: 'https://api.openalex.org/sources', type: 'sources-list', desc: 'Sources list' },
  { url: 'https://api.openalex.org/funders', type: 'funders-list', desc: 'Funders list' },
  { url: 'https://api.openalex.org/publishers', type: 'publishers-list', desc: 'Publishers list' },
  { url: 'https://api.openalex.org/topics', type: 'topics-list', desc: 'Topics list' },
];

const toAppUrl = (apiUrl: string): string => {
  const relativePath = apiUrl.replace('https://api.openalex.org', '');
  return `${BASE_URL}/#/openalex-url${relativePath}`;
};

const SUITE_TIMEOUT_MS = 30_000;
const MIN_CONTENT_LENGTH = 50;

test.describe('Sample URLs - All Entity Types', () => {
  test.setTimeout(SUITE_TIMEOUT_MS);

  for (const { url, desc } of testUrls) {
    test(`${desc} should load`, async ({ page }) => {
      const appUrl = toAppUrl(url);
      
      await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await page.locator('main').waitFor({ timeout: 10_000 });
      
      const mainText = await page.locator('main').textContent();
      
      // Should NOT show unsupported entity type
      const hasError = mainText?.toLowerCase().includes('unsupported entity type');
      expect(hasError).toBe(false);
      
      // Should have content
      expect(mainText!.length).toBeGreaterThan(MIN_CONTENT_LENGTH);
      
      console.log(`✅ ${desc}: Loads successfully`);
    });
  }
});
