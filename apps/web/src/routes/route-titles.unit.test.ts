import { describe, expect, it } from 'vitest'

import { routeTitle } from './route-titles'

describe('routeTitle', () => {
  it('returns null for the home route so the base title is used alone', () => {
    expect(routeTitle('/')).toBeNull()
  })

  it('maps known route segments to their titles', () => {
    expect(routeTitle('/works/W123')).toBe('Works')
    expect(routeTitle('/graph-comparison')).toBe('Graph Comparison')
    expect(routeTitle('/reviews')).toBe('Reviews')
  })

  it('capitalises unknown segments as a fallback', () => {
    expect(routeTitle('/newthing/sub')).toBe('Newthing')
  })
})
