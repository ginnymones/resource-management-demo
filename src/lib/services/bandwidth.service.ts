/**
 * Bandwidth Calculation Service
 *
 * Calculates available bandwidth for associates based on their time entries
 * and process complexity factors.
 *
 * Bandwidth = max(0, 7.5 - Σ(hours × complexity_factor))
 */

/** Maximum productive hours per day */
export const MAX_PRODUCTIVE_HOURS = 7.5;

export interface TimeEntryInput {
  hours: number;
  processComplexityFactor: number;
}

/**
 * Calculates available bandwidth for an associate based on their time entries.
 *
 * @param timeEntries - Array of time entries with hours and process complexity factors
 * @returns Available bandwidth in hours (always between 0 and 7.5 inclusive)
 */
export function calculateBandwidth(
  timeEntries: TimeEntryInput[]
): number {
  const effectiveUtilization = timeEntries.reduce(
    (sum, entry) => sum + entry.hours * entry.processComplexityFactor,
    0
  );
  return Math.max(0, MAX_PRODUCTIVE_HOURS - effectiveUtilization);
}

/**
 * Determines whether an associate has sufficient effective bandwidth
 * for a requested assignment.
 *
 * @param availableBandwidth - The associate's current available bandwidth in hours
 * @param requestedHoursPerDay - The hours per day requested for the assignment
 * @param targetProcessComplexity - The complexity factor of the target process
 * @returns true if the associate has enough bandwidth for the assignment
 */
export function hasEffectiveBandwidth(
  availableBandwidth: number,
  requestedHoursPerDay: number,
  targetProcessComplexity: number
): boolean {
  const effectiveHoursNeeded = requestedHoursPerDay * targetProcessComplexity;
  return availableBandwidth >= effectiveHoursNeeded;
}

/**
 * Calculates the effective hours consumed by an assignment,
 * accounting for process complexity.
 *
 * @param hoursPerDay - The raw hours per day for the assignment
 * @param complexityFactor - The complexity factor of the process
 * @returns The effective hours consumed (hours × complexity)
 */
export function calculateEffectiveHours(
  hoursPerDay: number,
  complexityFactor: number
): number {
  return hoursPerDay * complexityFactor;
}
