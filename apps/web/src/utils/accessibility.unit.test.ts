/**
 * Skip links must move focus without touching the URL: the app uses hash history, so an anchor-style skip link would be parsed as a route change and land the user on the home page.
 */

import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createSkipLinks, focusElementById, SKIP_LINK_TARGET_IDS } from './accessibility'

describe('createSkipLinks', () => {
  afterEach(() => {
    cleanup()
    document.body.replaceChildren()
  })

  it('renders one button per skip link target', () => {
    const container = createSkipLinks()
    const buttons = [...container.querySelectorAll('button.skip-link')]
    expect(buttons).toHaveLength(SKIP_LINK_TARGET_IDS.length)
    expect(buttons.map((button) => button.textContent)).toEqual([
      'Skip to main content',
      'Skip to navigation',
      'Skip to search',
    ])
  })

  it('moves focus to the target element and leaves the URL unchanged', () => {
    document.body.innerHTML = '<main id="main-content" tabindex="-1"><p>Content</p></main>'
    const urlBefore = window.location.href

    const container = createSkipLinks()
    document.body.append(container)
    const skipButton = container.querySelector<HTMLButtonElement>('button.skip-link')
    expect(skipButton).not.toBeNull()
    skipButton?.click()

    expect(document.activeElement?.id).toBe('main-content')
    expect(window.location.href).toBe(urlBefore)
    expect(window.location.hash).toBe('')
  })

  it('reports a missing target instead of throwing', () => {
    expect(focusElementById('does-not-exist')).toBe(false)
  })
})
