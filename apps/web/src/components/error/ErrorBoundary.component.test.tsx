/**
 * A failed lazy-route chunk load must offer a real recovery: the module registry caches the rejected import for the session, so only a full reload re-requests it. Other render errors keep the remounting "Try Again" flow.
 */

import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ErrorBoundary } from './ErrorBoundary'

const ChunkError = () => {
  throw new Error('Failed to fetch dynamically imported module: /assets/graph-abc123.js')
}

const RenderError = () => {
  throw new Error('Cannot read properties of undefined (reading x)')
}

const SilenceLogs = () => {
  // React logs uncaught errors from intentional throwers; keep test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  return null
}

const renderWithBoundary = (children: React.ReactNode) =>
  render(
    <MantineProvider>
      <ErrorBoundary>
        <SilenceLogs />
        {children}
      </ErrorBoundary>
    </MantineProvider>,
  )

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('shows the connection message and a Reload action for chunk-load failures', () => {
    const reloadSpy = vi.fn()
    vi.stubGlobal('location', { reload: reloadSpy })

    renderWithBoundary(<ChunkError />)

    expect(screen.getByText("Couldn't load this page, check your connection")).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(reloadSpy).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('keeps the generic fallback with remounting Try Again for other errors', () => {
    renderWithBoundary(<RenderError />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.queryByText("Couldn't load this page, check your connection")).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
  })

  it('remounts children after Try Again instead of reusing the crashed subtree', () => {
    const mountCounter = { count: 0 }
    const MountCountingThrower = () => {
      mountCounter.count += 1
      throw new Error('Cannot read properties of undefined (reading x)')
    }

    render(
      <MantineProvider>
        <ErrorBoundary>
          <SilenceLogs />
          <MountCountingThrower />
        </ErrorBoundary>
      </MantineProvider>,
    )
    const mountsBeforeReset = mountCounter.count
    expect(mountsBeforeReset).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))

    // The child mounted again after reset: the subtree was rebuilt under a new key.
    expect(mountCounter.count).toBeGreaterThan(mountsBeforeReset)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})
