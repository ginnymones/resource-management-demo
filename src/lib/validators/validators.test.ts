import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateRequestDates } from './date.validator';
import { validateTimeEntry } from './time-entry.validator';
import { validateComplexityFactor } from './complexity.validator';
import { validateRequestForm } from './request-form.validator';

describe('date.validator', () => {
  beforeEach(() => {
    // Fix "today" to 2024-06-15 for deterministic tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('validateRequestDates', () => {
    it('accepts valid future dates', () => {
      const start = new Date('2024-06-20');
      const end = new Date('2024-06-25');
      expect(validateRequestDates(start, end)).toEqual({ valid: true });
    });

    it('accepts start date equal to today', () => {
      const start = new Date('2024-06-15');
      const end = new Date('2024-06-20');
      expect(validateRequestDates(start, end)).toEqual({ valid: true });
    });

    it('rejects start date in the past', () => {
      const start = new Date('2024-06-10');
      const end = new Date('2024-06-20');
      const result = validateRequestDates(start, end);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('past');
    });

    it('rejects end date equal to start date', () => {
      const start = new Date('2024-06-20');
      const end = new Date('2024-06-20');
      const result = validateRequestDates(start, end);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('after');
    });

    it('rejects end date before start date', () => {
      const start = new Date('2024-06-25');
      const end = new Date('2024-06-20');
      const result = validateRequestDates(start, end);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('after');
    });
  });
});

describe('time-entry.validator', () => {
  describe('validateTimeEntry', () => {
    it('accepts 0.0 hours', () => {
      expect(validateTimeEntry(0.0)).toEqual({ valid: true });
    });

    it('accepts 7.5 hours', () => {
      expect(validateTimeEntry(7.5)).toEqual({ valid: true });
    });

    it('accepts valid multiples of 0.25', () => {
      expect(validateTimeEntry(0.25)).toEqual({ valid: true });
      expect(validateTimeEntry(1.5)).toEqual({ valid: true });
      expect(validateTimeEntry(3.75)).toEqual({ valid: true });
    });

    it('rejects negative hours', () => {
      const result = validateTimeEntry(-0.25);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('0.0');
    });

    it('rejects hours above 7.5', () => {
      const result = validateTimeEntry(7.75);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('7.5');
    });

    it('rejects non-multiples of 0.25', () => {
      const result = validateTimeEntry(1.3);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('0.25');
    });

    it('rejects NaN', () => {
      const result = validateTimeEntry(NaN);
      expect(result.valid).toBe(false);
    });
  });
});

describe('complexity.validator', () => {
  describe('validateComplexityFactor', () => {
    it('accepts 0.5', () => {
      expect(validateComplexityFactor(0.5)).toEqual({ valid: true });
    });

    it('accepts 3.0', () => {
      expect(validateComplexityFactor(3.0)).toEqual({ valid: true });
    });

    it('accepts valid multiples of 0.1', () => {
      expect(validateComplexityFactor(1.0)).toEqual({ valid: true });
      expect(validateComplexityFactor(1.5)).toEqual({ valid: true });
      expect(validateComplexityFactor(2.3)).toEqual({ valid: true });
    });

    it('rejects values below 0.5', () => {
      const result = validateComplexityFactor(0.4);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('0.5');
    });

    it('rejects values above 3.0', () => {
      const result = validateComplexityFactor(3.1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('3.0');
    });

    it('rejects NaN', () => {
      const result = validateComplexityFactor(NaN);
      expect(result.valid).toBe(false);
    });
  });
});

describe('request-form.validator', () => {
  describe('validateRequestForm', () => {
    it('accepts valid form data', () => {
      const result = validateRequestForm({
        projectName: 'My Project',
        businessJustification: 'We need this resource for the project.',
        hoursPerDay: 4.0,
      });
      expect(result).toEqual({ valid: true });
    });

    it('rejects empty project name', () => {
      const result = validateRequestForm({
        projectName: '',
        businessJustification: 'Valid justification',
        hoursPerDay: 4.0,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Project name');
    });

    it('rejects project name over 100 characters', () => {
      const result = validateRequestForm({
        projectName: 'a'.repeat(101),
        businessJustification: 'Valid justification',
        hoursPerDay: 4.0,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('100');
    });

    it('rejects empty business justification', () => {
      const result = validateRequestForm({
        projectName: 'Valid Project',
        businessJustification: '',
        hoursPerDay: 4.0,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('justification');
    });

    it('rejects business justification over 1000 characters', () => {
      const result = validateRequestForm({
        projectName: 'Valid Project',
        businessJustification: 'a'.repeat(1001),
        hoursPerDay: 4.0,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('1000');
    });

    it('rejects hours below 0.5', () => {
      const result = validateRequestForm({
        projectName: 'Valid Project',
        businessJustification: 'Valid justification',
        hoursPerDay: 0.25,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('0.5');
    });

    it('rejects hours above 7.5', () => {
      const result = validateRequestForm({
        projectName: 'Valid Project',
        businessJustification: 'Valid justification',
        hoursPerDay: 8.0,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('7.5');
    });

    it('accepts boundary hours of 0.5', () => {
      const result = validateRequestForm({
        projectName: 'Valid Project',
        businessJustification: 'Valid justification',
        hoursPerDay: 0.5,
      });
      expect(result).toEqual({ valid: true });
    });

    it('accepts boundary hours of 7.5', () => {
      const result = validateRequestForm({
        projectName: 'Valid Project',
        businessJustification: 'Valid justification',
        hoursPerDay: 7.5,
      });
      expect(result).toEqual({ valid: true });
    });
  });
});
