/**
 * Capacity Indicator Color Assignment
 *
 * Assigns color indicators based on an associate's utilized hours:
 * - Red: hours > 7.5 (over-capacity)
 * - Orange: 6.5 < hours <= 7.5 (warning-level utilization)
 * - Green: hours <= 6.5 (adequate capacity)
 */

export type CapacityColor = 'red' | 'orange' | 'green';

/**
 * Returns the capacity color indicator based on utilized hours.
 *
 * @param utilizedHours - The associate's utilized hours per day
 * @returns The capacity color: 'red', 'orange', or 'green'
 */
export function getCapacityColor(utilizedHours: number): CapacityColor {
  if (utilizedHours > 7.5) {
    return 'red';
  }
  if (utilizedHours > 6.5) {
    return 'orange';
  }
  return 'green';
}

/**
 * Returns Tailwind CSS classes for the capacity color indicator.
 *
 * @param utilizedHours - The associate's utilized hours per day
 * @returns Tailwind CSS class string for background and text color
 */
export function getCapacityColorClass(utilizedHours: number): string {
  const color = getCapacityColor(utilizedHours);

  switch (color) {
    case 'red':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'orange':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'green':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  }
}
