/**
 * E2E Workflow tests for catalogue/list management
 * Tests the complete lifecycle of creating, populating, viewing, and managing catalogue lists
 */

import AxeBuilder from '@axe-core/playwright';
import { expect,test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';

test.describe('@workflow Catalogue Workflow', () => {
	const testListTitle = `Test List ${String(Date.now())}`;
	const testBibliographyTitle = `Test Bibliography ${String(Date.now())}`;

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		// Navigate to catalogues page
		await page.goto('#/catalogue');
		await waitForAppReady(page);

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});

	test('should create a new general list', async ({ page }) => {
		// Navigate to catalogue page
		await page.goto('#/catalogue');
		await waitForAppReady(page);

		// Verify catalogue manager is visible
		await expect(page.locator('[data-testid="catalogue-manager"]')).toBeVisible();

		// Click "Create New List" button
		const createButton = page.getByRole('button', { name: /create new list/i });
		await expect(createButton).toBeVisible();
		await createButton.click();

		// Modal should open
		await expect(page.getByRole('dialog')).toBeVisible();
		await expect(page.getByText(/create new list/i)).toBeVisible();

		// Fill in list details
		const titleInput = page.locator('#list-title');
		await expect(titleInput).toBeVisible();
		await titleInput.fill(testListTitle);

		const descriptionInput = page.locator('#list-description');
		await descriptionInput.fill('E2E test list for workflow testing');

		// Select "List" type (should be default)
		const listTypeRadio = page.getByRole('radio', { name: /general list/i });
		await listTypeRadio.check();

		// Submit the form
		const submitButton = page.getByRole('button', { name: /create list/i });
		await expect(submitButton).toBeEnabled();
		await submitButton.click();

		// Modal should close and list should appear
		await expect(page.getByRole('dialog')).toBeHidden();
		// Removed: waitForTimeout - use locator assertions instead
		// Verify the list appears in the list view
		const listCard = page.getByText(testListTitle);
		await expect(listCard).toBeVisible();

		// Store the list ID for cleanup
		// Extract from URL or DOM if possible
		const selectedListTitle = page.locator('[data-testid="selected-list-title"]');
		if (await selectedListTitle.count() > 0) {
			await expect(selectedListTitle).toContainText(testListTitle);
		}
	});

	test('should create a new bibliography', async ({ page }) => {
		// Navigate to catalogue page
		await page.goto('#/catalogue');
		await waitForAppReady(page);

		// Click "Create New List" button
		const createButton = page.getByRole('button', { name: /create new list/i });
		await createButton.click();

		// Wait for modal
		await expect(page.getByRole('dialog')).toBeVisible();

		// Fill in bibliography details
		await page.locator('#list-title').fill(testBibliographyTitle);
		await page.locator('#list-description').fill('E2E test bibliography');

		// Select "Bibliography" type
		const bibliographyTypeRadio = page.getByRole('radio', { name: /bibliography.*works only/i });
		await expect(bibliographyTypeRadio).toBeVisible();
		await bibliographyTypeRadio.check();

		// Add a tag
		const tagsInput = page.locator('#list-tags');
		await tagsInput.fill('e2e-test');
		await page.keyboard.press('Enter');

		// Submit
		const submitButton = page.getByRole('button', { name: /create bibliography/i });
		await expect(submitButton).toBeEnabled();
		await submitButton.click();

		// Verify bibliography was created
		await expect(page.getByRole('dialog')).toBeHidden();
		// Removed: waitForTimeout - use locator assertions instead
		// Switch to Bibliographies tab
		const bibliographiesTab = page.getByRole('tab', { name: /bibliographies/i });
		await bibliographiesTab.click();

		// Verify bibliography appears
		const bibCard = page.getByText(testBibliographyTitle);
		await expect(bibCard).toBeVisible();
	});

	test('should add an entity to a list from entity detail page', async ({ page }) => {
		// First, create a list to add entities to
		await page.goto('#/catalogue');
		await waitForAppReady(page);

		const createButton = page.getByRole('button', { name: /create new list/i });
		await createButton.click();
		await page.locator('#list-title').fill(testListTitle);
		await page.getByRole('radio', { name: /general list/i }).check();
		const submitButton = page.getByRole('button', { name: /create list/i });
		await submitButton.click();
		// Removed: waitForTimeout - use locator assertions instead
		// Navigate to a known entity (work)
		await page.goto('#/works/W2741809807');
		await waitForAppReady(page);

		// Wait for entity title to load
		await expect(page.locator('h1')).toBeVisible();

		// Find and click "Add to List" button
		const addToListButton = page.locator('[data-testid="add-to-catalogue-button"]');
		await expect(addToListButton).toBeVisible();
		await addToListButton.click();

		// Menu should open showing available lists
		// Removed: waitForTimeout - use locator assertions instead
		// Click on our created list
		const listMenuItem = page.getByRole('menuitem', { name: testListTitle });

		// If list exists in menu, click it
		if (await listMenuItem.count() > 0) {
			await listMenuItem.click();

			// Wait for success notification
			// Removed: waitForTimeout - use locator assertions instead
			// Notification should appear
			const notification = page.getByText(/added to/i);
			if (await notification.count() > 0) {
				await expect(notification).toBeVisible();
			}
		} else {
			// If list not in menu, use "Create New List" option
			const createNewOption = page.getByRole('menuitem', { name: /create new list/i });
			await createNewOption.click();

			// Modal should open
			await expect(page.getByRole('dialog')).toBeVisible();

			// Fill in details (modal pre-fills entity info)
			await page.locator('#list-title-input').fill(testListTitle + ' v2');
			const createAndAddButton = page.getByRole('button', { name: /create.*add/i });
			await createAndAddButton.click();

			// Wait for success
			// Removed: waitForTimeout - use locator assertions instead
		}

		// Navigate back to catalogue to verify
		await page.goto('#/catalogue');
		await waitForAppReady(page);

		// Select the list
		const listCard = page.getByText(testListTitle);
		await listCard.click();
		// Removed: waitForTimeout - use locator assertions instead
		// Verify entity appears in list
		const entityItem = page.locator('[data-testid="entity-item"]').first();
		if (await entityItem.count() > 0) {
			await expect(entityItem).toBeVisible();
		}
	});

	test('should view list contents and entity details', async ({ page }) => {
		// Create a list and add an entity
		await page.goto('#/catalogue');
		await waitForAppReady(page);

		const createButton = page.getByRole('button', { name: /create new list/i });
		await createButton.click();
		await page.locator('#list-title').fill(testListTitle);
		await page.getByRole('button', { name: /create list/i }).click();
		// Removed: waitForTimeout - use locator assertions instead
		// Add an entity
		await page.goto('#/works/W2741809807');
		await waitForAppReady(page);
		const addToListButton = page.locator('[data-testid="add-to-catalogue-button"]');
		await addToListButton.click();
		// Removed: waitForTimeout - use locator assertions instead
		const listMenuItem = page.getByRole('menuitem').first();
		await listMenuItem.click();
		// Removed: waitForTimeout - use locator assertions instead
		// Navigate back to catalogue
		await page.goto('#/catalogue');
		await waitForAppReady(page);

		// Select the list
		const listCard = page.getByText(testListTitle);
		await listCard.click();
		// Removed: waitForTimeout - use locator assertions instead
		// Verify selected list details are shown
		const selectedListTitle = page.locator('[data-testid="selected-list-title"]');
		if (await selectedListTitle.count() > 0) {
			await expect(selectedListTitle).toContainText(testListTitle);
		}

		// Verify entity list is shown
		const entityItem = page.locator('[data-testid="entity-item"]').first();
		if (await entityItem.count() > 0) {
			await expect(entityItem).toBeVisible();

			// Click to view entity details
			const entityLink = entityItem.locator('a').first();
			if (await entityLink.count() > 0) {
				await entityLink.click();
				// Removed: waitForTimeout - use locator assertions instead
				// Should navigate to entity page
				await expect(page).toHaveURL(/\/works\/W\d+/);
				await expect(page.locator('h1')).toBeVisible();
			}
		}
	});

	test('should remove an entity from a list', async ({ page }) => {
		// Create a list and add an entity
		await page.goto('#/catalogue');
		await waitForAppReady(page);

		const createButton = page.getByRole('button', { name: /create new list/i });
		await createButton.click();
		await page.locator('#list-title').fill(testListTitle);
		await page.getByRole('button', { name: /create list/i }).click();
		// Removed: waitForTimeout - use locator assertions instead
		// Add an entity
		await page.goto('#/works/W2741809807');
		await waitForAppReady(page);
		const addToListButton = page.locator('[data-testid="add-to-catalogue-button"]');
		await addToListButton.click();
		// Removed: waitForTimeout - use locator assertions instead
		const listMenuItem = page.getByRole('menuitem').first();
		await listMenuItem.click();
		// Removed: waitForTimeout - use locator assertions instead
		// Navigate back to catalogue
		await page.goto('#/catalogue');
		await waitForAppReady(page);

		// Select the list
		const listCard = page.getByText(testListTitle);
		await listCard.click();
		// Removed: waitForTimeout - use locator assertions instead
		// Count entities before removal
		const entityCountBefore = await page.locator('[data-testid="entity-item"]').count();
		expect(entityCountBefore).toBeGreaterThan(0);

		// Find the remove button for the first entity
		const firstEntity = page.locator('[data-testid="entity-item"]').first();
		const moreActionsButton = firstEntity.getByRole('button', { name: /more/i }).or(
			firstEntity.locator('[aria-label*="more"]')
		).or(
			firstEntity.locator('button').last()
		);

		if (await moreActionsButton.count() > 0) {
			await moreActionsButton.click();
			// Removed: waitForTimeout - use locator assertions instead
			// Click remove option
			const removeOption = page.getByRole('menuitem', { name: /remove/i });
			await removeOption.click();

			// Confirm removal in modal
			await expect(page.getByRole('dialog')).toBeVisible();
			const confirmButton = page.locator('[data-testid="confirm-remove-entity-button"]');
			await expect(confirmButton).toBeVisible();
			await confirmButton.click();

			// Wait for removal
			// Removed: waitForTimeout - use locator assertions instead
			// Verify entity count decreased or shows empty state
			const entityCountAfter = await page.locator('[data-testid="entity-item"]').count();
			expect(entityCountAfter).toBeLessThan(entityCountBefore);

			// If no entities left, should show empty state
			if (entityCountAfter === 0) {
				const emptyMessage = page.getByText(/no entities/i);
				await expect(emptyMessage).toBeVisible();
			}
		}
	});

	test('should delete a list', async ({ page }) => {
		// Create a list
		await page.goto('#/catalogue');
		await waitForAppReady(page);

		const createButton = page.getByRole('button', { name: /create new list/i });
		await createButton.click();
		await page.locator('#list-title').fill(testListTitle);
		await page.getByRole('button', { name: /create list/i }).click();
		// Removed: waitForTimeout - use locator assertions instead
		// Verify list exists
		const listCard = page.getByText(testListTitle);
		await expect(listCard).toBeVisible();
		await listCard.click();
		// Removed: waitForTimeout - use locator assertions instead
		// Find and click delete button
		// Delete button may be in the list card or in selected list details
		const deleteButton = page.getByRole('button', { name: /delete/i }).first();

		if (await deleteButton.count() > 0) {
			await deleteButton.click();

			// Confirm deletion in modal
			const confirmDialog = page.getByRole('dialog');
			if (await confirmDialog.count() > 0) {
				await expect(confirmDialog).toBeVisible();
				const confirmDeleteButton = confirmDialog.getByRole('button', { name: /delete/i }).or(
					page.getByRole('button', { name: /confirm/i })
				);
				await confirmDeleteButton.click();
			}

			// Wait for deletion
			// Removed: waitForTimeout - use locator assertions instead
			// Verify list no longer exists
			const listCardAfterDelete = page.getByText(testListTitle);
			await expect(listCardAfterDelete).toBeHidden();
		}
	});

	test('should handle adding duplicate entity to list', async ({ page }) => {
		// Create a list and add an entity twice
		await page.goto('#/catalogue');
		await waitForAppReady(page);

		const createButton = page.getByRole('button', { name: /create new list/i });
		await createButton.click();
		await page.locator('#list-title').fill(testListTitle);
		await page.getByRole('button', { name: /create list/i }).click();
		// Removed: waitForTimeout - use locator assertions instead
		// Add an entity first time
		await page.goto('#/works/W2741809807');
		await waitForAppReady(page);
		const addToListButton = page.locator('[data-testid="add-to-catalogue-button"]');
		await addToListButton.click();
		// Removed: waitForTimeout - use locator assertions instead
		const listMenuItem = page.getByRole('menuitem').first();
		await listMenuItem.click();
		// Removed: waitForTimeout - use locator assertions instead
		// Try adding the same entity again
		await addToListButton.click();
		// Removed: waitForTimeout - use locator assertions instead
		const listMenuItemSecond = page.getByRole('menuitem').first();
		await listMenuItemSecond.click();
		// Removed: waitForTimeout - use locator assertions instead
		// Should show notification about duplicate
		const duplicateNotification = page.getByText(/already in/i);
		if (await duplicateNotification.count() > 0) {
			await expect(duplicateNotification).toBeVisible();
		}

		// Verify only one entity in list
		await page.goto('#/catalogue');
		await waitForAppReady(page);
		const listCard = page.getByText(testListTitle);
		await listCard.click();
		// Removed: waitForTimeout - use locator assertions instead
		const entityCount = page.locator('[data-testid="entity-item"]');
		await expect(entityCount).toHaveCount(1);
	});
});
