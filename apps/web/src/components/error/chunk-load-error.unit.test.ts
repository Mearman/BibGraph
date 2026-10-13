import { describe, expect, it } from 'vitest'

import { CHUNK_LOAD_ERROR_TITLE, isChunkLoadError } from './chunk-load-error'

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: /assets/graph-abc123.js',
    'error loading dynamically imported module',
    'Importing a module script failed.',
    'Unable to preload CSS for /assets/route.css',
  ])('recognises "%s"', (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true)
  })

  it('rejects non-chunk errors and non-error values', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false)
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
  })

  it('exposes the user-facing title', () => {
    expect(CHUNK_LOAD_ERROR_TITLE).toBe("Couldn't load this page, check your connection")
  })
})
