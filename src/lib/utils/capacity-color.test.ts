import { describe, it, expect } from 'vitest';
import { getCapacityColor, getCapacityColorClass } from './capacity-color';

describe('capacity-color', () => {
  describe('getCapacityColor', () => {
    it('returns red when hours > 7.5', () => {
      expect(getCapacityColor(8.0)).toBe('red');
      expect(getCapacityColor(7.51)).toBe('red');
      expect(getCapacityColor(10.0)).toBe('red');
    });

    it('returns orange when 6.5 < hours <= 7.5', () => {
      expect(getCapacityColor(7.5)).toBe('orange');
      expect(getCapacityColor(7.0)).toBe('orange');
      expect(getCapacityColor(6.51)).toBe('orange');
    });

    it('returns green when hours <= 6.5', () => {
      expect(getCapacityColor(6.5)).toBe('green');
      expect(getCapacityColor(5.0)).toBe('green');
      expect(getCapacityColor(0)).toBe('green');
    });

    it('handles exact boundary at 7.5', () => {
      expect(getCapacityColor(7.5)).toBe('orange');
    });

    it('handles exact boundary at 6.5', () => {
      expect(getCapacityColor(6.5)).toBe('green');
    });

    it('handles zero hours', () => {
      expect(getCapacityColor(0)).toBe('green');
    });

    it('handles negative hours', () => {
      expect(getCapacityColor(-1)).toBe('green');
    });
  });

  describe('getCapacityColorClass', () => {
    it('returns red classes for over-capacity', () => {
      const classes = getCapacityColorClass(8.0);
      expect(classes).toContain('red');
    });

    it('returns orange classes for warning-level', () => {
      const classes = getCapacityColorClass(7.0);
      expect(classes).toContain('orange');
    });

    it('returns green classes for adequate capacity', () => {
      const classes = getCapacityColorClass(5.0);
      expect(classes).toContain('green');
    });

    it('includes dark mode classes', () => {
      const classes = getCapacityColorClass(5.0);
      expect(classes).toContain('dark:');
    });
  });
});
