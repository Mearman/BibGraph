/**
 * The lazy-route fallback must be an accessible busy state and must not rely on a CSS animation class the app does not define (the old `animate-spin` never spun).
 */

import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'

import { LazyRoute, RoutePendingComponent } from './LazyRoute'

/**
 * A component whose lazy import never settles, so the Suspense fallback renders indefinitely.
 */
const Pending = React.lazy(
  async () => new Promise<never>(() => {
    // intentionally never resolves, so the fallback stays mounted
  }),
)

describe('LazyRoute', () => {
  it('renders a skeleton fallback marked busy while the route chunk loads', () => {
    render(
      <MantineProvider>
        <LazyRoute>
          <Pending />
        </LazyRoute>
      </MantineProvider>,
    )

    const fallback = screen.getByTestId('route-pending')
    expect(fallback).toHaveAttribute('aria-busy', 'true')
    expect(fallback.getAttribute('role')).toBe('status')
    expect(fallback.querySelector('.animate-spin')).toBeNull()
    expect(fallback.querySelector('.mantine-Loader-root')).not.toBeNull()
  })

  it('shares the same fallback through RoutePendingComponent for router pending states', () => {
    render(
      <MantineProvider>
        <RoutePendingComponent />
      </MantineProvider>,
    )
    expect(screen.getByTestId('route-pending')).toBeInTheDocument()
  })
})
