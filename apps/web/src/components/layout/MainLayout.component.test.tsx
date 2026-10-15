/**
 * Structural guarantees for the app shell header: it must never nest interactive elements (button inside button, link inside button), because that is invalid HTML, breaks activation and, on the notification bell, logged hydration errors. The landmarks the skip links target must also exist and be labelled.
 */

import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SyncStatusProvider } from '@/contexts/SyncStatusContext'
import { useGlobalHotkeys } from '@/hooks/use-hotkeys'
import { useOnboarding } from '@/hooks/useOnboarding'
import { LayoutProvider } from '@/stores/layout-store'

import { MainLayout } from './MainLayout'

vi.mock('@/hooks/use-hotkeys', () => ({ useGlobalHotkeys: vi.fn() }))
vi.mock('@/hooks/useOnboarding', () => ({ useOnboarding: vi.fn(() => ({ tourOpen: false, openTour: vi.fn(), closeTour: vi.fn() } as const)) }))
vi.mock('@/components/modals/KeyboardShortcutsHelp', () => ({
  KeyboardShortcutsButton: ({ onClick }: Readonly<{ onClick: () => void }>) => (
    <button type="button" onClick={onClick}>Shortcuts</button>
  ),
  KeyboardShortcutsHelp: () => null,
}))
vi.mock('@/components/onboarding', () => ({ OnboardingTutorial: () => null, TourLaunchpad: () => null }))
vi.mock('@/components/notifications/NotificationCenter', () => ({
  NotificationCenter: () => <button type="button">Notifications</button>,
}))
vi.mock('@/components/sync/SyncStatusIndicator', () => ({
  SyncStatusIndicator: () => <button type="button">Sync</button>,
}))
vi.mock('@/components/undo-redo/UndoRedoControls', () => ({
  UndoRedoControls: () => (
    <span>
      <button type="button">Undo</button>
      <button type="button">Redo</button>
    </span>
  ),
}))
vi.mock('./HeaderSearchInput', () => ({
  HeaderSearchInput: () => <input aria-label="Search entities" />,
}))
vi.mock('./BookmarksSidebar', () => ({ BookmarksSidebar: () => <div>bookmarks</div> }))
vi.mock('./HistorySidebar', () => ({ HistorySidebar: () => <div>history</div> }))
vi.mock('./ColorSchemeSelector', () => ({
  ColorSchemeSelector: () => <button type="button">Theme</button>,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...properties }: Readonly<{ children: React.ReactNode; to: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
    <a href={to} {...properties}>{children}</a>
  ),
}))

const mockedUseGlobalHotkeys = vi.mocked(useGlobalHotkeys)
const mockedUseOnboarding = vi.mocked(useOnboarding)

const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, [role="button"]'

// The offline banner lives in the layout and reads the shared sync status, which itself watches the query cache.
const renderMainLayout = () =>
  render(
    <MantineProvider>
      <QueryClientProvider client={new QueryClient()}>
        <SyncStatusProvider>
          <LayoutProvider>
            <MainLayout>
              <p>Page content</p>
            </MainLayout>
          </LayoutProvider>
        </SyncStatusProvider>
      </QueryClientProvider>
    </MantineProvider>,
  )

describe('MainLayout', () => {
  it('renders header controls without nesting interactive elements', () => {
    const { container } = renderMainLayout()
    const header = container.querySelector('header')
    expect(header).not.toBeNull()

    const interactives = [...header?.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR) ?? []]
    expect(interactives.length).toBeGreaterThan(0)
    for (const element of interactives) {
      const nested = element.querySelectorAll(INTERACTIVE_SELECTOR)
      expect(
        nested.length,
        `${element.outerHTML} contains nested interactive elements`,
      ).toBe(0)
    }
  })

  it('keeps every header row group non-wrapping', () => {
    const { container } = renderMainLayout()
    const header = container.querySelector('header')
    expect(header).not.toBeNull()
    // Mantine Group exposes wrap through the --group-wrap inline variable; a
    // wrapping group in the fixed-height header is the overflow bug.
    const groups = [...header?.querySelectorAll<HTMLElement>('.m_4081bf90') ?? []]
    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) {
      expect(group.style.getPropertyValue('--group-wrap')).toBe('nowrap')
    }
  })

  it('labels the landmarks the skip links target', () => {
    const { container } = renderMainLayout()
    const navigation = container.querySelector('nav#navigation')
    expect(navigation).not.toBeNull()
    expect(navigation?.getAttribute('aria-label')).toBe('Primary navigation')

    const main = container.querySelector('main#main-content')
    expect(main).not.toBeNull()
    expect(main).toHaveAttribute('tabindex', '-1')

    expect(screen.getByRole('search')).toBeInTheDocument()
  })

  it('offers the collapsed sync, undo and redo controls in the overflow menu', async () => {
    renderMainLayout()

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    // The dropdown mounts asynchronously through Mantine's transition.
    const menu = await waitFor(() => screen.getByRole('menu'))

    expect(within(menu).getByText('Sync')).toBeInTheDocument()
    expect(within(menu).getByText('Undo')).toBeInTheDocument()
    expect(within(menu).getByText('Redo')).toBeInTheDocument()
  })

  it('exposes the left panel toggle in the overflow menu', async () => {
    renderMainLayout()

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    await waitFor(() => {
      expect(screen.getByText(/Left Panel/)).toBeInTheDocument()
    })
  })

  it('offers Settings in the header navigation, not only the overflow menu', () => {
    const { container } = renderMainLayout()
    const header = container.querySelector('header')
    const settingsLink = [...header?.querySelectorAll<HTMLAnchorElement>('a') ?? []].find(
      (link) => link.textContent === 'Settings',
    )
    expect(settingsLink).toBeDefined()
  })

  it('registers global hotkeys and onboarding once mounted', () => {
    renderMainLayout()
    expect(mockedUseGlobalHotkeys).toHaveBeenCalled()
    expect(mockedUseOnboarding).toHaveBeenCalled()
  })
})
