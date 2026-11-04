/**
 * Date Validation Utilities
 *
 * Validates start and end dates for resource requests.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates request start and end dates.
 *
 * Rules:
 * - Start date must not be in the past (compared to today's date, date-only)
 * - End date must be strictly after the start date
 *
 * @param startDate - The requested start date
 * @param endDate - The requested end date
 * @returns Validation result with error message if invalid
 */
export function validateRequestDates(
  startDate: Date,
  endDate: Date
): ValidationResult {
  // Compare dates at day level (strip time component)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  if (start < today) {
    return {
      valid: false,
      error: 'Start date cannot be in the past.',
    };
  }

  if (end <= start) {
    return {
      valid: false,
      error: 'End date must be after the start date.',
    };
  }

  return { valid: true };
}
