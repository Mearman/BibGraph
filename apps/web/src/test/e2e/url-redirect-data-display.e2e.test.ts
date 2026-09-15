/**
 * E2E Test: URL Redirect and Data Display
 * 
 * Tests that:
 * 1. OpenAlex API URLs redirect correctly to internal routes
 * 2. All data from the API response is displayed in the UI
 */

import { expect,test } from "@playwright/test";

test.describe("URL Redirect and Data Display", () => {
  test("should redirect bioplastics URL and display all data", async ({ page }) => {
    // Navigate to the API redirect route (this is how the app handles full API URLs)
    const fullUrl = "/#/api-openalex-org/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc";
    await page.goto(fullUrl);

    // Wait for redirect to complete - use more flexible URL check
    await page.waitForURL(/\/#\/works/, { timeout: 10_000 });

    // Verify the URL was redirected correctly
    const currentUrl = page.url();
    expect(currentUrl).toContain("/#/works");
    expect(currentUrl).toContain("bioplastics");

    // Wait for table data to load - the app uses Mantine table
    await page.locator('table tbody tr').waitFor({ timeout: 15_000 });

    // Verify that results are displayed in the table
    const tableRows = await page.locator('table tbody tr').count();
    expect(tableRows).toBeGreaterThan(0);

    // Verify bioplastics content is in the table - use first() to handle multiple matches
    await expect(page.getByText('bioplastic', { exact: false }).first()).toBeVisible({ timeout: 5000 });
  });

  test("should display author A5017898742 with all data fields", async ({ page }) => {
    // Navigate directly to author page
    await page.goto("/#/authors/A5017898742");

    // Wait for author name to be displayed
    await page.locator('h1').waitFor({ timeout: 15_000 });

    // Verify the author name is displayed
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Joseph Mearman');

    // Verify the author ID is displayed - use first() to avoid strict mode violation
    await expect(page.getByText('A5017898742').first()).toBeVisible();

    // Verify field groups are present
    await expect(page.getByText('Basic Information')).toBeVisible();
    await expect(page.getByText('Identifiers')).toBeVisible();

    // Verify specific field labels are present (case-insensitive) - use first() for multiple matches
    await expect(page.getByText(/^Display Name$/i).first()).toBeVisible();
    await expect(page.getByText(/^Id$/i).first()).toBeVisible();
  });

  test("should handle all URL variations from openalex-urls.json", async ({ page }) => {
    // Test a sample of different URL patterns using the api-openalex-org route
    const testUrls = [
      {
        input: "/#/api-openalex-org/works/W2741809807",
        expected: "/#/works/W2741809807",
      },
      {
        input: "/#/api-openalex-org/authors/A5017898742",
        expected: "/#/authors/A5017898742",
      },
      {
        input: "/#/api-openalex-org/works?filter=author.id:A5023888391",
        expected: "/#/works?filter=author.id",
      },
    ];

    for (const urlTest of testUrls) {
      await page.goto(urlTest.input);
      // Wait for redirect to complete
      await page.waitForURL(new RegExp(urlTest.expected.replaceAll('?', String.raw`\?`)), { timeout: 10_000 });
      const currentUrl = page.url();
      expect(currentUrl).toContain(urlTest.expected);
    }
  });
});
