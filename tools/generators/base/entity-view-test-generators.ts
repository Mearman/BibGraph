import { NormalizedEntityViewOptions } from './entity-view-types'

export const generateUnitTest = (options: NormalizedEntityViewOptions): string => `import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ${options.entityNameCapitalized}View } from './${options.fileName}-view'
import { mock${options.entityNameCapitalized} } from './${options.fileName}-mocks'

vi.mock('@bibgraph/client', () => ({
  useOpenAlexClient: () => ({
    ${options.entityPlural}: {
      get: vi.fn().mockResolvedValue(mock${options.entityNameCapitalized}),
    },
  }),
}))

describe('${options.entityNameCapitalized}View', () => {
  it('should render entity view correctly', async () => {
    render(<${options.entityNameCapitalized}View id="W1234567890" />)

    await waitFor(() => {
      expect(screen.getByText(mock${options.entityNameCapitalized}.display_name)).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    render(<${options.entityNameCapitalized}View id="W1234567890" />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should handle errors gracefully', async () => {
    vi.mocked(useOpenAlexClient()).${options.entityPlural}.get.mockRejectedValueOnce(new Error('Network error'))

    render(<${options.entityNameCapitalized}View id="invalid-id" />)

    await waitFor(() => {
      expect(screen.getByText(/Error Loading/)).toBeInTheDocument()
    })
  })
})
`;

export const generateIntegrationTest = (options: NormalizedEntityViewOptions): string => `import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from '@tanstack/react-router'
import { createRoute } from '@tanstack/react-router'
import { ${options.entityNameCapitalized}View } from './${options.fileName}-view'

describe('${options.entityNameCapitalized}View Integration', () => {
  it('should integrate with router correctly', () => {
    const route = createRoute({
      path: '/test',
      component: () => <${options.entityNameCapitalized}View id="test-id" />,
    })

    render(
      <MemoryRouter initialEntries={['/test']}>
        <route.Component />
      </MemoryRouter>
    )

    // TODO: Add integration-specific assertions
  })
})
`;

export const generateE2ETest = (options: NormalizedEntityViewOptions): string => `import { test, expect } from '@playwright/test'

test.describe('${options.entityPlural} E2E', () => {
  test('should navigate to ${options.entityName} view', async ({ page }) => {
    await page.goto('/')

    // Navigate to ${options.entityPlural} list
    await page.click('text=${options.entityPlural}')

    // Should see ${options.entityPlural} list
    await expect(page.locator('text=${options.entityPlural}')).toBeVisible()
  })

  test('should view ${options.entityName} details', async ({ page }) => {
    await page.goto('/entity-views/${options.routeDirectory}/W1234567890')

    // Should see ${options.entityName} details
    await expect(page.locator('text=Sample ${options.entityNameCapitalized}')).toBeVisible()
  })
})
`;
