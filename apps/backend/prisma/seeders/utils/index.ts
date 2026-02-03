/**
 * Seed Utilities Barrel Export
 *
 * Re-exports all utility functions for convenient importing.
 *
 * @example
 * import {
 *   generateHistoricalDate,
 *   weightedRandom,
 *   BatchProgress,
 * } from './utils';
 */

// Temporal utilities
export {
  DEMO_CURRENT_DATE,
  generateHistoricalDate,
  generateCaseTimeline,
  generateTimezoneAwareDate,
  generateRealisticTimeOfDay,
  getHistoryStartDate,
  getDurationDays,
  type HistoricalDateOptions,
  type CaseTimeline,
} from './temporal';

// Weighted random selection utilities
export {
  weightedRandom,
  weightedRandomMultiple,
  equalWeight,
  chance,
  randomInt,
  randomFloat,
  shuffle,
  pickRandom,
  pickRandomMultiple,
  type WeightedOption,
} from './weighted-random';

// Progress tracking utilities
export {
  createProgressBar,
  BatchProgress,
  MultiProgress,
  logProgress,
  logComplete,
  logSection,
  logInfo,
  logWarning,
  logError,
  type ProgressBarOptions,
} from './progress';
