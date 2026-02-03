/**
 * Weighted Random Selection Utilities
 *
 * Provides functions for selecting items based on probability weights.
 * Essential for generating realistic distribution patterns in demo data.
 */

/**
 * Option with a value and its probability weight
 */
export interface WeightedOption<T> {
  value: T;
  weight: number;
}

/**
 * Select a random item based on weighted probabilities.
 *
 * Weights are automatically normalized, so they don't need to sum to 1.
 * Higher weight = higher probability of selection.
 *
 * @param options Array of options with values and weights
 * @returns The selected value
 * @throws Error if options array is empty
 *
 * @example
 * // Select case severity with pyramid distribution
 * const severity = weightedRandom([
 *   { value: 'critical', weight: 0.05 },
 *   { value: 'high', weight: 0.15 },
 *   { value: 'medium', weight: 0.35 },
 *   { value: 'low', weight: 0.45 },
 * ]);
 *
 * @example
 * // Weights don't need to sum to 1
 * const channel = weightedRandom([
 *   { value: 'phone', weight: 60 },  // 60%
 *   { value: 'web', weight: 30 },    // 30%
 *   { value: 'other', weight: 10 },  // 10%
 * ]);
 */
export function weightedRandom<T>(options: WeightedOption<T>[]): T {
  if (options.length === 0) {
    throw new Error('weightedRandom: options array cannot be empty');
  }

  if (options.length === 1) {
    return options[0].value;
  }

  // Calculate total weight for normalization
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);

  if (totalWeight <= 0) {
    throw new Error('weightedRandom: total weight must be greater than 0');
  }

  // Generate random value in [0, totalWeight)
  const random = Math.random() * totalWeight;

  // Find the option that contains this random value
  let cumulative = 0;
  for (const option of options) {
    cumulative += option.weight;
    if (random < cumulative) {
      return option.value;
    }
  }

  // Fallback to last option (handles floating point edge cases)
  return options[options.length - 1].value;
}

/**
 * Select multiple unique items based on weighted probabilities.
 *
 * Uses weighted selection without replacement - each selected item
 * is removed from the pool for subsequent selections.
 *
 * @param options Array of options with values and weights
 * @param count Number of items to select
 * @returns Array of selected values (unique)
 * @throws Error if count exceeds available options
 *
 * @example
 * // Select 3 unique categories for a report
 * const categories = weightedRandomMultiple(categoryOptions, 3);
 */
export function weightedRandomMultiple<T>(
  options: WeightedOption<T>[],
  count: number,
): T[] {
  if (count > options.length) {
    throw new Error(
      `weightedRandomMultiple: count (${count}) exceeds available options (${options.length})`,
    );
  }

  if (count <= 0) {
    return [];
  }

  const results: T[] = [];
  const remaining = [...options]; // Clone to avoid mutating original

  for (let i = 0; i < count; i++) {
    const selected = weightedRandom(remaining);
    results.push(selected);

    // Remove selected option from remaining pool
    const index = remaining.findIndex((opt) => opt.value === selected);
    if (index >= 0) {
      remaining.splice(index, 1);
    }
  }

  return results;
}

/**
 * Create weighted options from a simple value array with equal weights.
 *
 * Useful when you want uniform random selection.
 *
 * @param values Array of values
 * @returns Array of WeightedOptions with weight = 1
 *
 * @example
 * const regions = equalWeight(['US', 'EMEA', 'APAC']);
 * const region = weightedRandom(regions); // Equal 33% chance each
 */
export function equalWeight<T>(values: T[]): WeightedOption<T>[] {
  return values.map((value) => ({ value, weight: 1 }));
}

/**
 * Determine if an event occurs based on probability.
 *
 * Simple helper for boolean decisions with probability.
 *
 * @param probability Probability between 0 and 1
 * @returns true with the given probability
 *
 * @example
 * // 40% chance of anonymous report
 * const isAnonymous = chance(0.4);
 *
 * @example
 * // 10% of cases are open
 * const isOpen = chance(0.1);
 */
export function chance(probability: number): boolean {
  return Math.random() < probability;
}

/**
 * Select a random integer in range [min, max] inclusive.
 *
 * @param min Minimum value (inclusive)
 * @param max Maximum value (inclusive)
 * @returns Random integer in range
 *
 * @example
 * // 1-5 interviews per investigation
 * const interviewCount = randomInt(1, 5);
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Select a random float in range [min, max).
 *
 * @param min Minimum value (inclusive)
 * @param max Maximum value (exclusive)
 * @returns Random float in range
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Shuffle an array using Fisher-Yates algorithm.
 *
 * Returns a new shuffled array, does not mutate original.
 *
 * @param array Array to shuffle
 * @returns New shuffled array
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Pick a random item from an array with uniform probability.
 *
 * @param array Array to pick from
 * @returns Random item from array
 * @throws Error if array is empty
 */
export function pickRandom<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('pickRandom: array cannot be empty');
  }
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Pick multiple random items from an array with uniform probability.
 *
 * Items are unique (no replacement).
 *
 * @param array Array to pick from
 * @param count Number of items to pick
 * @returns Array of randomly selected items
 */
export function pickRandomMultiple<T>(array: T[], count: number): T[] {
  if (count > array.length) {
    throw new Error(
      `pickRandomMultiple: count (${count}) exceeds array length (${array.length})`,
    );
  }
  return shuffle(array).slice(0, count);
}
