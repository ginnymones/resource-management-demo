/**
 * Complexity Factor Validation Utilities
 *
 * Validates process complexity factor values.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a process complexity factor value.
 *
 * Rules:
 * - Must be between 0.5 and 3.0 inclusive
 * - Must be a multiple of 0.1
 *
 * @param value - The complexity factor value to validate
 * @returns Validation result with error message if invalid
 */
export function validateComplexityFactor(value: number): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      valid: false,
      error: 'Complexity factor must be a valid number.',
    };
  }

  if (value < 0.5 || value > 3.0) {
    return {
      valid: false,
      error: 'Complexity factor must be between 0.5 and 3.0.',
    };
  }

  // Check if it's a multiple of 0.1
  // Multiply by 10 and check if it's close to an integer to avoid floating point issues
  const scaled = Math.round(value * 10);
  if (Math.abs(scaled - value * 10) > 0.001) {
    return {
      valid: false,
      error: 'Complexity factor must be in increments of 0.1.',
    };
  }

  return { valid: true };
}
