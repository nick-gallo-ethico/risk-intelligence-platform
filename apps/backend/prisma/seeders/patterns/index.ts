/**
 * Pattern Generators Barrel Export
 *
 * Re-exports all pattern generators for convenient importing.
 *
 * @example
 * import {
 *   generateRepeatSubjects,
 *   generateManagerHotspots,
 *   generateRetaliationPatterns,
 *   FLAGSHIP_CASES,
 * } from './patterns';
 */

// Repeat subjects pattern
export {
  generateRepeatSubjects,
  generateRepeatSubjectPool,
  getRepeatSubjectForAssignment,
  markSubjectAssigned,
  isRepeatSubject,
  getRemainingCases,
  REPEAT_SUBJECT_POOL,
  type RepeatSubjectInfo,
} from './repeat-subjects';

// Manager hotspots pattern
export {
  generateManagerHotspots,
  getHotspotForAssignment,
  markHotspotAssigned,
  isHotspotManager,
  getHotspotStats,
  HOTSPOT_MANAGERS,
  type HotspotManager,
} from './manager-hotspots';

// Retaliation pattern
export {
  generateRetaliationPatterns,
  generateRetaliationNarrative,
  generateRetaliationCaseDetails,
  getRetaliationChainForCase,
  getUnfulfilledChains,
  markChainFulfilled,
  getRetaliationStats,
  type RetaliationChain,
  type RetaliationType,
} from './retaliation';

// Flagship cases
export {
  FLAGSHIP_CASES,
  getFlagshipCasesByStatus,
  getFlagshipCasesByCategory,
  getFlagshipCasesWithExternalParty,
  getEscalatedFlagshipCases,
  prepareFlagshipCasesForSeeding,
  getFlagshipStats,
  type FlagshipCase,
} from './flagship-cases';
