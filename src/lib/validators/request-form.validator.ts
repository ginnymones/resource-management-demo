/**
 * Request Form Validation Utilities
 *
 * Validates the resource request intake form fields.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface RequestFormData {
  projectName: string;
  businessJustification: string;
  hoursPerDay: number;
}

/**
 * Validates the resource request form data.
 *
 * Rules:
 * - Project name: max 100 characters, must not be empty
 * - Business justification: max 1000 characters, must not be empty
 * - Hours per day: between 0.5 and 7.5 inclusive
 *
 * @param data - The form data to validate
 * @returns Validation result with error message if invalid
 */
export function validateRequestForm(data: RequestFormData): ValidationResult {
  // Validate project name
  if (!data.projectName || data.projectName.trim().length === 0) {
    return {
      valid: false,
      error: 'Project name is required.',
    };
  }

  if (data.projectName.length > 100) {
    return {
      valid: false,
      error: 'Project name must not exceed 100 characters.',
    };
  }

  // Validate business justification
  if (!data.businessJustification || data.businessJustification.trim().length === 0) {
    return {
      valid: false,
      error: 'Business justification is required.',
    };
  }

  if (data.businessJustification.length > 1000) {
    return {
      valid: false,
      error: 'Business justification must not exceed 1000 characters.',
    };
  }

  // Validate hours per day
  if (typeof data.hoursPerDay !== 'number' || isNaN(data.hoursPerDay)) {
    return {
      valid: false,
      error: 'Hours per day must be a valid number.',
    };
  }

  if (data.hoursPerDay < 0.5 || data.hoursPerDay > 7.5) {
    return {
      valid: false,
      error: 'Hours per day must be between 0.5 and 7.5.',
    };
  }

  return { valid: true };
}
