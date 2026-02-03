/**
 * Temporal Utilities for Demo Seed Data
 *
 * Provides date distribution functions for realistic historical data generation.
 * All functions use SEED_CONFIG.currentDate as the reference point.
 */

import {
  subDays,
  subMonths,
  addDays,
  addHours,
  isWeekend,
  setHours,
  setMinutes,
} from 'date-fns';
import { SEED_CONFIG } from '../config';

/**
 * Demo reference date - exported for tests and consistent date calculations
 * All "historical" data is relative to this date.
 */
export const DEMO_CURRENT_DATE = SEED_CONFIG.currentDate;

/**
 * Total days in the historical window (3 years)
 */
const HISTORY_DAYS = SEED_CONFIG.historyYears * 365;

/**
 * Options for historical date generation
 */
export interface HistoricalDateOptions {
  /**
   * Bias toward recent dates (0-1). Higher values = more recent dates.
   * Default: 0.3 (moderate recency bias)
   */
  recentBias?: number;

  /**
   * Skip weekends when generating dates
   * Default: false
   */
  businessDaysOnly?: boolean;
}

/**
 * Generate a historical date within the 3-year window with recency bias.
 *
 * Uses exponential distribution to create realistic data patterns where
 * more recent events are more common than older events.
 *
 * @param options Configuration for date generation
 * @returns A Date within the historical window
 *
 * @example
 * // Generate date with default recency bias
 * const date = generateHistoricalDate();
 *
 * @example
 * // Generate business day only
 * const businessDate = generateHistoricalDate({ businessDaysOnly: true });
 *
 * @example
 * // Generate with stronger recency bias
 * const recentDate = generateHistoricalDate({ recentBias: 0.5 });
 */
export function generateHistoricalDate(
  options: HistoricalDateOptions = {},
): Date {
  const { recentBias = 0.3, businessDaysOnly = false } = options;

  // Use exponential distribution for recency bias
  // Higher recentBias = steeper curve = more recent dates
  const uniform = Math.random();
  const lambda = 1 + recentBias * 5; // Scale factor for exponential
  const exponential = -Math.log(1 - uniform * (1 - Math.exp(-lambda))) / lambda;

  // Map to days in the past (0 = today, HISTORY_DAYS = 3 years ago)
  const daysAgo = Math.floor(exponential * HISTORY_DAYS);
  let date = subDays(DEMO_CURRENT_DATE, Math.min(daysAgo, HISTORY_DAYS));

  // Skip weekends if required
  if (businessDaysOnly) {
    while (isWeekend(date)) {
      date = subDays(date, 1);
    }
  }

  return date;
}

/**
 * Timeline structure for case progression
 */
export interface CaseTimeline {
  /**
   * When the RIU/case was created (intake date)
   */
  createdAt: Date;

  /**
   * When the case was assigned to an investigator
   */
  assignedAt: Date;

  /**
   * When investigation actively started
   */
  investigationStartedAt: Date;

  /**
   * When the case was closed (undefined if still open)
   */
  closedAt?: Date;
}

/**
 * Generate a realistic case timeline based on intake date and complexity.
 *
 * Timelines follow CONTEXT.md requirements:
 * - Simple cases: 2-4 days
 * - Complex cases: 1-3 months
 * - Target aggregate average: ~20-22 days
 *
 * @param intakeDate The date the RIU was created
 * @param isComplex Whether this is a complex case (longer duration)
 * @returns A complete case timeline with all milestone dates
 *
 * @example
 * // Generate simple case timeline
 * const timeline = generateCaseTimeline(intakeDate, false);
 *
 * @example
 * // Generate complex case timeline
 * const complexTimeline = generateCaseTimeline(intakeDate, true);
 */
export function generateCaseTimeline(
  intakeDate: Date,
  isComplex: boolean,
): CaseTimeline {
  const { simpleDaysRange, complexMonthsRange } = SEED_CONFIG.caseTiming;

  // Assignment typically happens within 1-2 business days
  const assignmentDelay = Math.floor(Math.random() * 2) + 1;
  const assignedAt = addDays(intakeDate, assignmentDelay);

  // Investigation starts 1-3 days after assignment
  const investigationDelay = Math.floor(Math.random() * 3) + 1;
  const investigationStartedAt = addDays(assignedAt, investigationDelay);

  // Calculate total case duration
  let totalDuration: number;

  if (isComplex) {
    // Complex cases: 1-3 months (30-90 days)
    const [minMonths, maxMonths] = complexMonthsRange;
    const months = minMonths + Math.random() * (maxMonths - minMonths);
    totalDuration = Math.floor(months * 30);
  } else {
    // Simple cases: 2-4 days from intake to close
    const [minDays, maxDays] = simpleDaysRange;
    totalDuration = Math.floor(minDays + Math.random() * (maxDays - minDays));
  }

  // Calculate closure date (from intake date)
  const closedAt = addDays(intakeDate, totalDuration);

  // Check if case is still open (within retention window from DEMO_CURRENT_DATE)
  // 10% of cases should be open - handled by caller based on SEED_CONFIG.volumes.openCaseRatio
  const isStillOpen = closedAt > DEMO_CURRENT_DATE;

  return {
    createdAt: intakeDate,
    assignedAt,
    investigationStartedAt,
    closedAt: isStillOpen ? undefined : closedAt,
  };
}

/**
 * Regional business hour configuration
 */
interface RegionHours {
  startHour: number;
  endHour: number;
}

const REGION_BUSINESS_HOURS: Record<'US' | 'EMEA' | 'APAC', RegionHours> = {
  US: { startHour: 8, endHour: 18 }, // 8 AM - 6 PM EST
  EMEA: { startHour: 9, endHour: 17 }, // 9 AM - 5 PM CET
  APAC: { startHour: 9, endHour: 18 }, // 9 AM - 6 PM (varies by country)
};

/**
 * Adjust a date to fall within business hours for a specific region.
 *
 * Creates more realistic demo data where reports/actions are filed
 * during appropriate working hours for the region.
 *
 * @param region The geographic region (US, EMEA, APAC)
 * @param date The base date to adjust
 * @returns Date adjusted to business hours for the region
 *
 * @example
 * // Make an EMEA date fall during European business hours
 * const emeaDate = generateTimezoneAwareDate('EMEA', baseDate);
 */
export function generateTimezoneAwareDate(
  region: 'US' | 'EMEA' | 'APAC',
  date: Date,
): Date {
  const { startHour, endHour } = REGION_BUSINESS_HOURS[region];

  // Generate random hour within business hours
  const hour = startHour + Math.floor(Math.random() * (endHour - startHour));

  // Generate random minute
  const minute = Math.floor(Math.random() * 60);

  let adjustedDate = setHours(date, hour);
  adjustedDate = setMinutes(adjustedDate, minute);

  return adjustedDate;
}

/**
 * Generate a date with realistic time-of-day distribution for reports.
 *
 * Reports have peaks during certain times:
 * - Morning (9-11 AM): 25%
 * - Midday (11 AM - 2 PM): 35%
 * - Afternoon (2-5 PM): 30%
 * - After hours (5 PM - 9 AM): 10%
 *
 * @param date The base date
 * @returns Date with realistic time of day
 */
export function generateRealisticTimeOfDay(date: Date): Date {
  const rand = Math.random();
  let hour: number;

  if (rand < 0.25) {
    // Morning: 9-11 AM
    hour = 9 + Math.floor(Math.random() * 2);
  } else if (rand < 0.6) {
    // Midday: 11 AM - 2 PM
    hour = 11 + Math.floor(Math.random() * 3);
  } else if (rand < 0.9) {
    // Afternoon: 2-5 PM
    hour = 14 + Math.floor(Math.random() * 3);
  } else {
    // After hours: split between early morning and evening
    if (Math.random() < 0.5) {
      hour = 6 + Math.floor(Math.random() * 3); // 6-8 AM
    } else {
      hour = 17 + Math.floor(Math.random() * 4); // 5-8 PM
    }
  }

  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);

  let adjustedDate = setHours(date, hour);
  adjustedDate = setMinutes(adjustedDate, minute);
  // Note: setSeconds not used to keep date-fns imports minimal

  return adjustedDate;
}

/**
 * Get the start of the historical window (3 years before current date)
 */
export function getHistoryStartDate(): Date {
  return subDays(DEMO_CURRENT_DATE, HISTORY_DAYS);
}

/**
 * Calculate duration in days between two dates
 */
export function getDurationDays(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
