/**
 * Time Entry Validation Utilities
 *
 * Validates time entry hours for the Efficiency Tracker.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a time entry hours value.
 *
 * Rules:
 * - Must be between 0.0 and 7.5 inclusive
 * - Must be a multiple of 0.25
 *
 * @param hours - The hours value to validate
 * @returns Validation result with error message if invalid
 */
export function validateTimeEntry(hours: number): ValidationResult {
  if (typeof hours !== 'number' || isNaN(hours)) {
    return {
      valid: false,
      error: 'Hours must be a valid number.',
    };
  }

  if (hours < 0.0 || hours > 7.5) {
    return {
      valid: false,
      error: 'Hours must be between 0.0 and 7.5.',
    };
  }

  // Check if it's a multiple of 0.25
  // Use rounding to avoid floating point precision issues
  const remainder = Math.round((hours % 0.25) * 100) / 100;
  if (remainder !== 0 && remainder !== 0.25) {
    return {
      valid: false,
      error: 'Hours must be in increments of 0.25.',
    };
  }

  return { valid: true };
}
