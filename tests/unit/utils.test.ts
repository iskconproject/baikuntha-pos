import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatDate, generateId, debounce } from '@/lib/utils'

describe('Utility Functions', () => {
  describe('cn (className merger)', () => {
    it('should merge class names correctly', () => {
      expect(cn('px-2 py-1', 'bg-red-500')).toBe('px-2 py-1 bg-red-500')
    })

    it('should handle conditional classes', () => {
      expect(cn('px-2', true && 'py-1', false && 'bg-red-500')).toBe('px-2 py-1')
    })
  })

  describe('formatCurrency', () => {
    it('should format currency in Indian Rupees', () => {
      expect(formatCurrency(100)).toBe('₹100')
      expect(formatCurrency(1000.50)).toBe('₹1,000.5')
    })

    it('should handle zero and negative values', () => {
      expect(formatCurrency(0)).toBe('₹0')
      expect(formatCurrency(-100)).toBe('-₹100')
    })
  })

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00')
      const formatted = formatDate(date)
      expect(formatted).toMatch(/15 Jan 2024/)
    })

    it('should handle string dates', () => {
      const formatted = formatDate('2024-01-15T10:30:00')
      expect(formatted).toMatch(/15 Jan 2024/)
    })
  })

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
      expect(typeof id1).toBe('string')
      expect(id1.length).toBeGreaterThan(0)
    })
  })

  describe('debounce', () => {
    it('should debounce function calls', async () => {
      let callCount = 0
      const debouncedFn = debounce(() => {
        callCount++
      }, 100)

      debouncedFn()
      debouncedFn()
      debouncedFn()

      expect(callCount).toBe(0)

      await new Promise(resolve => setTimeout(resolve, 150))
      expect(callCount).toBe(1)
    })
  })
})