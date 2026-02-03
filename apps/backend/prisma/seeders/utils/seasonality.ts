/**
 * Seasonality Utilities for Demo Seed Data
 *
 * Handles realistic temporal distribution with spike periods for compliance data.
 * Creates patterns like post-holiday spikes, reorg periods, and policy change impacts.
 */

import { addDays, subDays, getMonth, getDate, setMonth, setDate } from 'date-fns';
import { SEED_CONFIG } from '../config';
import { generateHistoricalDate, DEMO_CURRENT_DATE } from './temporal';

/**
 * Seasonality period definition
 */
export interface SeasonalityPeriod {
  /** Month start (1-12) */
  startMonth: number;
  /** Day start (1-31) */
  startDay: number;
  /** Month end (1-12) */
  endMonth: number;
  /** Day end (1-31) */
  endDay: number;
  /** Probability multiplier (>1 = spike, <1 = lull) */
  multiplier: number;
  /** Human-readable reason for this pattern */
  reason: string;
}

/**
 * Seasonality configuration for compliance reporting patterns
 */
export const SEASONALITY_CONFIG = {
  /**
   * Spike periods - times of year with elevated reporting
   * Based on typical compliance patterns in corporate environments
   */
  spikePeriods: [
    // Post-holiday spike (January, early February)
    // Employees return from holiday break, catch up on issues
    {
      startMonth: 1,
      startDay: 2,
      endMonth: 2,
      endDay: 15,
      multiplier: 1.4,
      reason: 'post_holiday',
    },
    // Q1 reorg period (March)
    // Annual restructuring, new reporting lines cause friction
    {
      startMonth: 3,
      startDay: 1,
      endMonth: 3,
      endDay: 31,
      multiplier: 1.3,
      reason: 'q1_reorg',
    },
    // Mid-year review period (June-July)
    // Performance review season triggers complaints
    {
      startMonth: 6,
      startDay: 15,
      endMonth: 7,
      endDay: 31,
      multiplier: 1.25,
      reason: 'midyear_review',
    },
    // Policy change rollout (September)
    // New fiscal year policies, compliance training
    {
      startMonth: 9,
      startDay: 1,
      endMonth: 9,
      endDay: 30,
      multiplier: 1.35,
      reason: 'policy_changes',
    },
    // Year-end stress (November-December)
    // Deadline pressure, holiday stress
    {
      startMonth: 11,
      startDay: 15,
      endMonth: 12,
      endDay: 20,
      multiplier: 1.2,
      reason: 'yearend_stress',
    },
  ] as SeasonalityPeriod[],

  /**
   * Low periods - times of year with reduced reporting
   */
  lowPeriods: [
    // Summer lull (July-August)
    // Vacation season, reduced workforce
    {
      startMonth: 7,
      startDay: 1,
      endMonth: 8,
      endDay: 15,
      multiplier: 0.7,
      reason: 'summer_lull',
    },
    // Holiday break (late December - early January)
    // Office closures, minimal staffing
    {
      startMonth: 12,
      startDay: 21,
      endMonth: 12,
      endDay: 31,
      multiplier: 0.5,
      reason: 'holiday_break',
    },
  ] as SeasonalityPeriod[],

  /** Base multiplier when no specific period applies */
  baseMultiplier: 1.0,
};

/**
 * Check if a date falls within a seasonality period
 *
 * @param date - Date to check
 * @param period - Seasonality period to check against
 * @returns true if date is within the period
 */
function isDateInPeriod(date: Date, period: SeasonalityPeriod): boolean {
  const month = getMonth(date) + 1; // date-fns uses 0-indexed months
  const day = getDate(date);

  // Handle year-boundary periods (e.g., Dec 21 - Jan 1)
  if (period.endMonth < period.startMonth) {
    // Period wraps around year end
    if (month === period.startMonth && day >= period.startDay) {
      return true;
    }
    if (month === period.endMonth && day <= period.endDay) {
      return true;
    }
    if (month > period.startMonth || month < period.endMonth) {
      return true;
    }
    return false;
  }

  // Normal period within same year
  if (month === period.startMonth && month === period.endMonth) {
    return day >= period.startDay && day <= period.endDay;
  }
  if (month === period.startMonth) {
    return day >= period.startDay;
  }
  if (month === period.endMonth) {
    return day <= period.endDay;
  }
  return month > period.startMonth && month < period.endMonth;
}

/**
 * Get the seasonality multiplier for a given date
 *
 * Checks spike periods first, then low periods, returns base if no match.
 *
 * @param date - Date to get multiplier for
 * @param config - Seasonality configuration (defaults to SEASONALITY_CONFIG)
 * @returns Object with multiplier and reason (null if no specific period)
 *
 * @example
 * const { multiplier, reason } = getSeasonalityMultiplier(new Date('2024-01-15'));
 * // multiplier: 1.4, reason: 'post_holiday'
 */
export function getSeasonalityMultiplier(
  date: Date,
  config: typeof SEASONALITY_CONFIG = SEASONALITY_CONFIG,
): { multiplier: number; reason: string | null } {
  // Check spike periods first (higher multipliers take precedence)
  for (const period of config.spikePeriods) {
    if (isDateInPeriod(date, period)) {
      return { multiplier: period.multiplier, reason: period.reason };
    }
  }

  // Check low periods
  for (const period of config.lowPeriods) {
    if (isDateInPeriod(date, period)) {
      return { multiplier: period.multiplier, reason: period.reason };
    }
  }

  // No specific period - return base multiplier
  return { multiplier: config.baseMultiplier, reason: null };
}

/**
 * Apply seasonality adjustment to a date to create realistic clustering
 *
 * Dates during spike periods are more likely to be kept,
 * dates during low periods may be shifted to nearby spike periods.
 *
 * @param baseDate - Original date to potentially adjust
 * @param config - Seasonality configuration
 * @returns Object with adjusted date and seasonality reason applied
 */
export function applySeasonality(
  baseDate: Date,
  config: typeof SEASONALITY_CONFIG = SEASONALITY_CONFIG,
): { date: Date; seasonalityApplied: string | null } {
  const { multiplier, reason } = getSeasonalityMultiplier(baseDate, config);

  // Spike periods: keep the date
  if (multiplier >= 1.0) {
    return { date: baseDate, seasonalityApplied: reason };
  }

  // Low periods: potentially shift date
  // Higher multiplier = more likely to keep original date
  const keepProbability = multiplier / config.baseMultiplier;

  if (Math.random() < keepProbability) {
    return { date: baseDate, seasonalityApplied: reason };
  }

  // Shift date to nearest spike period
  // Pick a random spike period and shift to its start
  const randomSpike =
    config.spikePeriods[Math.floor(Math.random() * config.spikePeriods.length)];

  const year = baseDate.getFullYear();
  const shiftedDate = setDate(
    setMonth(baseDate, randomSpike.startMonth - 1),
    randomSpike.startDay + Math.floor(Math.random() * 14), // Random day within first 2 weeks
  );

  return { date: shiftedDate, seasonalityApplied: randomSpike.reason };
}

/**
 * Options for seasonal historical date generation
 */
export interface SeasonalHistoricalDateOptions {
  /** Years of history to generate within (default: from SEED_CONFIG) */
  yearsBack?: number;
  /** Recency bias (0-1, higher = more recent dates) */
  recentBias?: number;
  /** Skip weekends when generating dates */
  businessDaysOnly?: boolean;
}

/**
 * Generate a historical date with seasonality patterns applied
 *
 * Combines the temporal utility's recency bias with seasonality spikes
 * to create realistic compliance reporting patterns.
 *
 * @param options - Configuration for date generation
 * @returns Object with generated date and seasonality reason applied
 *
 * @example
 * // Generate date with default settings
 * const { date, seasonalityApplied } = generateSeasonalHistoricalDate();
 *
 * @example
 * // Generate date with strong recency bias
 * const { date } = generateSeasonalHistoricalDate({ recentBias: 0.5 });
 */
export function generateSeasonalHistoricalDate(options: SeasonalHistoricalDateOptions = {}): {
  date: Date;
  seasonalityApplied: string | null;
} {
  const { recentBias = 0.3, businessDaysOnly = false } = options;

  // Generate base date using temporal utility
  const baseDate = generateHistoricalDate({ recentBias, businessDaysOnly });

  // Apply seasonality adjustments
  const result = applySeasonality(baseDate);

  // If business days only, adjust away from weekends
  if (businessDaysOnly) {
    const day = result.date.getDay();
    if (day === 0) {
      // Sunday -> Monday
      result.date = addDays(result.date, 1);
    } else if (day === 6) {
      // Saturday -> Friday
      result.date = subDays(result.date, 1);
    }
  }

  return result;
}

/**
 * Get all seasonality periods sorted by impact
 *
 * Useful for documentation and debugging.
 *
 * @returns Array of all periods sorted by multiplier (descending)
 */
export function getAllSeasonalityPeriods(): Array<SeasonalityPeriod & { type: 'spike' | 'low' }> {
  const allPeriods = [
    ...SEASONALITY_CONFIG.spikePeriods.map((p) => ({ ...p, type: 'spike' as const })),
    ...SEASONALITY_CONFIG.lowPeriods.map((p) => ({ ...p, type: 'low' as const })),
  ];

  return allPeriods.sort((a, b) => b.multiplier - a.multiplier);
}

/**
 * Format a seasonality period for logging
 *
 * @param period - Period to format
 * @returns Human-readable string describing the period
 */
export function formatSeasonalityPeriod(period: SeasonalityPeriod): string {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const startMonth = months[period.startMonth - 1];
  const endMonth = months[period.endMonth - 1];

  return `${startMonth} ${period.startDay} - ${endMonth} ${period.endDay}: ${period.reason} (${period.multiplier}x)`;
}
