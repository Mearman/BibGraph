import { describe, expect,it } from 'vitest'

import {
	getDaysUntilVersionSelectorHidden,
	getVersionSelectorCutoffDate,
	isDataVersionSelectorVisible,
} from './date-utils'

describe('date-utils', () => {
	describe('isDataVersionSelectorVisible', () => {
		it('should return true for dates before December 1, 2025', () => {
			const before = new Date('2025-11-30T23:59:59Z')
			expect(isDataVersionSelectorVisible(before)).toBe(true)
		})

		it('should return false for December 1, 2025 and after', () => {
			const cutoff = new Date('2025-12-01T00:00:00Z')
			expect(isDataVersionSelectorVisible(cutoff)).toBe(false)

			const after = new Date('2025-12-02T00:00:00Z')
			expect(isDataVersionSelectorVisible(after)).toBe(false)
		})

		it('should return true for November 15, 2025', () => {
			const novemberDate = new Date('2025-11-15T12:00:00Z')
			expect(isDataVersionSelectorVisible(novemberDate)).toBe(true)
		})

		it('should return false for December 31, 2025', () => {
			const decemberDate = new Date('2025-12-31T23:59:59Z')
			expect(isDataVersionSelectorVisible(decemberDate)).toBe(false)
		})

		it('should handle dates with default parameter', () => {
			// This tests the function without providing a date
			// The function will use the current date, so we can only verify it returns a boolean
			const isResult = isDataVersionSelectorVisible()
			expect(typeof isResult).toBe('boolean')
		})
	})

	describe('getVersionSelectorCutoffDate', () => {
		it('should return December 1, 2025', () => {
			const cutoff = getVersionSelectorCutoffDate()
			expect(cutoff.toISOString()).toBe('2025-12-01T00:00:00.000Z')
		})

		it('should return a Date object', () => {
			const cutoff = getVersionSelectorCutoffDate()
			expect(cutoff instanceof Date).toBe(true)
		})

		it('should be consistent across calls', () => {
			const cutoff1 = getVersionSelectorCutoffDate()
			const cutoff2 = getVersionSelectorCutoffDate()
			expect(cutoff1.getTime()).toBe(cutoff2.getTime())
		})
	})

	describe('getDaysUntilVersionSelectorHidden', () => {
		it('should return positive days when before cutoff', () => {
			const EXPECTED_DAYS_BEFORE_CUTOFF = 16
			const testDate = new Date('2025-11-15T00:00:00Z') // 16 days before cutoff
			const days = getDaysUntilVersionSelectorHidden(testDate)
			expect(days).toBe(EXPECTED_DAYS_BEFORE_CUTOFF)
		})

		it('should return 0 when at or past cutoff', () => {
			const cutoff = new Date('2025-12-01T00:00:00Z')
			expect(getDaysUntilVersionSelectorHidden(cutoff)).toBe(0)

			const after = new Date('2025-12-02T00:00:00Z')
			expect(getDaysUntilVersionSelectorHidden(after)).toBe(0)
		})

		it('should return 1 day when 1 day before cutoff', () => {
			const oneDayBefore = new Date('2025-11-30T00:00:00Z')
			const days = getDaysUntilVersionSelectorHidden(oneDayBefore)
			expect(days).toBe(1)
		})

		it('should return correct days for multiple dates', () => {
			const EXPECTED_DAYS_FROM_NOV_1 = 30
			const EXPECTED_DAYS_FROM_NOV_25 = 6

			// November 1, 2025 - 30 days before cutoff
			const nov1 = new Date('2025-11-01T00:00:00Z')
			expect(getDaysUntilVersionSelectorHidden(nov1)).toBe(EXPECTED_DAYS_FROM_NOV_1)

			// November 25, 2025 - 6 days before cutoff
			const nov25 = new Date('2025-11-25T00:00:00Z')
			expect(getDaysUntilVersionSelectorHidden(nov25)).toBe(EXPECTED_DAYS_FROM_NOV_25)
		})

		it('should round up fractional days', () => {
			// November 30, 2025 at 12:00 PM - should be about 0.5 days before, rounds up to 1
			const halfDayBefore = new Date('2025-11-30T12:00:00Z')
			const days = getDaysUntilVersionSelectorHidden(halfDayBefore)
			expect(days).toBe(1)
		})
	})
})
