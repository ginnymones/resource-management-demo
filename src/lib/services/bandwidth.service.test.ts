import { describe, it, expect } from 'vitest';
import {
  calculateBandwidth,
  hasEffectiveBandwidth,
  calculateEffectiveHours,
  MAX_PRODUCTIVE_HOURS,
} from './bandwidth.service';

describe('bandwidth.service', () => {
  describe('calculateBandwidth', () => {
    it('returns 7.5 when there are no time entries', () => {
      expect(calculateBandwidth([])).toBe(7.5);
    });

    it('subtracts hours × complexity from 7.5', () => {
      const entries = [
        { hours: 2, processComplexityFactor: 1.0 },
        { hours: 1, processComplexityFactor: 2.0 },
      ];
      // 7.5 - (2*1 + 1*2) = 7.5 - 4 = 3.5
      expect(calculateBandwidth(entries)).toBe(3.5);
    });

    it('returns 0 when utilization exceeds max hours', () => {
      const entries = [
        { hours: 5, processComplexityFactor: 2.0 },
      ];
      // 7.5 - (5*2) = 7.5 - 10 = -2.5 → clamped to 0
      expect(calculateBandwidth(entries)).toBe(0);
    });

    it('returns 0 when utilization exactly equals max hours', () => {
      const entries = [
        { hours: 7.5, processComplexityFactor: 1.0 },
      ];
      expect(calculateBandwidth(entries)).toBe(0);
    });

    it('handles fractional hours and complexity factors', () => {
      const entries = [
        { hours: 1.5, processComplexityFactor: 1.5 },
        { hours: 2.0, processComplexityFactor: 0.5 },
      ];
      // 7.5 - (1.5*1.5 + 2.0*0.5) = 7.5 - (2.25 + 1.0) = 7.5 - 3.25 = 4.25
      expect(calculateBandwidth(entries)).toBe(4.25);
    });
  });

  describe('hasEffectiveBandwidth', () => {
    it('returns true when bandwidth meets effective hours needed', () => {
      // 3.0 >= 2.0 * 1.5 = 3.0
      expect(hasEffectiveBandwidth(3.0, 2.0, 1.5)).toBe(true);
    });

    it('returns true when bandwidth exceeds effective hours needed', () => {
      // 5.0 >= 1.0 * 2.0 = 2.0
      expect(hasEffectiveBandwidth(5.0, 1.0, 2.0)).toBe(true);
    });

    it('returns false when bandwidth is insufficient', () => {
      // 2.0 < 2.0 * 1.5 = 3.0
      expect(hasEffectiveBandwidth(2.0, 2.0, 1.5)).toBe(false);
    });

    it('returns true when bandwidth exactly equals effective hours', () => {
      // 4.0 >= 2.0 * 2.0 = 4.0
      expect(hasEffectiveBandwidth(4.0, 2.0, 2.0)).toBe(true);
    });

    it('returns false when bandwidth is zero', () => {
      expect(hasEffectiveBandwidth(0, 1.0, 1.0)).toBe(false);
    });
  });

  describe('calculateEffectiveHours', () => {
    it('multiplies hours by complexity factor', () => {
      expect(calculateEffectiveHours(2.0, 1.5)).toBe(3.0);
    });

    it('returns 0 when hours are 0', () => {
      expect(calculateEffectiveHours(0, 2.0)).toBe(0);
    });

    it('returns hours unchanged when complexity is 1.0', () => {
      expect(calculateEffectiveHours(3.5, 1.0)).toBe(3.5);
    });
  });

  describe('MAX_PRODUCTIVE_HOURS', () => {
    it('is 7.5', () => {
      expect(MAX_PRODUCTIVE_HOURS).toBe(7.5);
    });
  });
});
