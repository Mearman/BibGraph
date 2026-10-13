/**
 * The offline banner must appear the moment the browser reports offline (including on first render while offline) and disappear when connectivity returns.
 */

import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { OfflineBanner } from './NetworkStatus'

const setNavigatorOnline = (online: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', {
    value: online,
    configurable: true,
  })
}

describe('OfflineBanner', () => {
  afterEach(() => {
    setNavigatorOnline(true)
  })

  it('renders nothing while online', () => {
    setNavigatorOnline(true)
    render(
      <MantineProvider>
        <OfflineBanner />
      </MantineProvider>,
    )
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument()
  })

  it('renders a status announcement when the browser reports offline on mount', () => {
    setNavigatorOnline(false)
    render(
      <MantineProvider>
        <OfflineBanner />
      </MantineProvider>,
    )
    expect(screen.getByRole('status')).toHaveTextContent(/offline/i)
  })

  it('appears and disappears with the online and offline events', async () => {
    setNavigatorOnline(true)
    render(
      <MantineProvider>
        <OfflineBanner />
      </MantineProvider>,
    )
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument()

    setNavigatorOnline(false)
    fireEvent(window, new Event('offline'))
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    setNavigatorOnline(true)
    fireEvent(window, new Event('online'))
    await waitFor(() => {
      expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument()
    })
  })
})
