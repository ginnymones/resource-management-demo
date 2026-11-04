import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { cn } from './utils'

describe('cn utility - property tests', () => {
  it('should always return a string', () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.string(), fc.constant(undefined), fc.constant(null), fc.constant(false))),
        (inputs) => {
          const result = cn(...inputs)
          expect(typeof result).toBe('string')
        }
      )
    )
  })

  it('should be idempotent - applying cn twice gives same result', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('px-2', 'py-1', 'mt-4', 'flex', 'hidden', 'block'),
        fc.constantFrom('px-4', 'py-2', 'mt-2', 'grid', 'visible', 'inline'),
        (a, b) => {
          const once = cn(a, b)
          const twice = cn(once)
          expect(twice).toBe(once)
        }
      )
    )
  })
})
