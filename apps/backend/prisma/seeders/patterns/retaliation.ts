/**
 * Retaliation Pattern Generator
 *
 * Generates follow-up retaliation reports that reference original cases.
 * This enables "retaliation pattern detection" and "case linkage" demos.
 *
 * Pattern: ~50 follow-up retaliation reports
 * Timing: 30-90 days after original case closure
 * Link: Reporter or subject from original case
 */

import { faker } from '@faker-js/faker';
import { SEED_CONFIG } from '../config';
import { randomInt, pickRandom } from '../utils';
import { addDays } from 'date-fns';

// Seed offset for retaliation pattern
const SEED_OFFSET = 5200;

/**
 * Retaliation chain linking original case to follow-up
 */
export interface RetaliationChain {
  /** ID of the original case that triggered retaliation */
  originalCaseId: string;
  /** ID of the follow-up retaliation case */
  followUpCaseId: string;
  /** Days after original case closure */
  daysAfterOriginal: number;
  /** Type of retaliation reported */
  retaliationType: RetaliationType;
  /** Link type: was the retaliation reporter the original reporter or subject */
  linkType: 'reporter' | 'witness';
  /** Optional employee ID if linked through employee */
  linkedEmployeeId?: string;
  /** Generated narrative snippet for the retaliation report */
  narrativeSnippet: string;
}

/**
 * Types of retaliation commonly reported
 */
export type RetaliationType =
  | 'performance_review'
  | 'schedule_change'
  | 'role_reduction'
  | 'exclusion'
  | 'hostile_behavior'
  | 'termination_threat'
  | 'transfer'
  | 'workload_increase';

/**
 * Retaliation type details for narrative generation
 */
const RETALIATION_TYPES: Record<
  RetaliationType,
  { weight: number; narratives: string[] }
> = {
  performance_review: {
    weight: 0.25,
    narratives: [
      'Shortly after my report, I received my first negative performance review in {years} years.',
      'My performance rating dropped from "exceeds expectations" to "needs improvement" without explanation.',
      'My manager started documenting minor issues that were never mentioned before my complaint.',
      'I was placed on a Performance Improvement Plan within weeks of my report.',
    ],
  },
  schedule_change: {
    weight: 0.15,
    narratives: [
      'My schedule was changed to the least desirable shift immediately after I filed my report.',
      "I was moved from day shift to night shift despite having the most seniority.",
      'My approved vacation time was revoked citing "business needs" right after my complaint.',
      'I was suddenly required to work weekends when I had been exempt for {years} years.',
    ],
  },
  role_reduction: {
    weight: 0.15,
    narratives: [
      'My responsibilities were significantly reduced after I participated in the investigation.',
      'I was removed from key projects without explanation following my complaint.',
      'My team was reassigned to another manager, leaving me with no direct reports.',
      'Client-facing duties were taken away from me citing vague "concerns."',
    ],
  },
  exclusion: {
    weight: 0.15,
    narratives: [
      'Since filing my report, I have been excluded from meetings I previously attended.',
      'Team communications that included me before my complaint now exclude me.',
      "I'm no longer invited to team lunches or social events.",
      'Important information is being shared with everyone except me.',
    ],
  },
  hostile_behavior: {
    weight: 0.12,
    narratives: [
      'The subject of my original complaint has been openly hostile since learning of my report.',
      'My manager has been giving me the silent treatment since the investigation.',
      'Colleagues who used to be friendly are now cold and dismissive.',
      'I overheard comments about being a "troublemaker" after my complaint.',
    ],
  },
  termination_threat: {
    weight: 0.08,
    narratives: [
      'My manager implied my position may be "eliminated" shortly after I filed my report.',
      'I was told to "watch my back" following my participation in the investigation.',
      'References were made to "budget constraints" affecting my role after my complaint.',
      'I was warned that "whistleblowers" rarely last long at this company.',
    ],
  },
  transfer: {
    weight: 0.05,
    narratives: [
      'I was told I would be transferred to a less desirable location after my report.',
      "My request for transfer was denied, but now I'm being forced to relocate.",
      'I was moved to a different department away from my established career path.',
      'The transfer offer came with a significant pay reduction.',
    ],
  },
  workload_increase: {
    weight: 0.05,
    narratives: [
      'My workload has doubled since I filed my complaint while my colleagues remain unchanged.',
      "I'm being assigned impossible deadlines that set me up for failure.",
      'Additional responsibilities were piled on me without corresponding support.',
      'I was given a project with an unrealistic timeline immediately after my report.',
    ],
  },
};

/**
 * Generate retaliation patterns plan
 *
 * Creates a list of retaliation chains to be created after initial case seeding.
 * Each chain links an original closed case to a planned follow-up retaliation case.
 *
 * @param closedCaseIds - Array of closed case IDs to create follow-ups for
 * @param targetCount - Number of retaliation chains to generate (default: 50)
 * @returns Array of RetaliationChain definitions (followUpCaseId will be empty)
 *
 * @example
 * const chains = generateRetaliationPatterns(closedCaseIds, 50);
 * // Returns chains with originalCaseId set, followUpCaseId to be filled during case creation
 */
export function generateRetaliationPatterns(
  closedCaseIds: string[],
  targetCount: number = 50,
): RetaliationChain[] {
  faker.seed(SEED_CONFIG.masterSeed + SEED_OFFSET);

  const chains: RetaliationChain[] = [];

  if (closedCaseIds.length === 0) {
    return chains;
  }

  // Select cases for retaliation follow-ups
  // Only use cases from the pool, not all closed cases
  const eligibleCases = faker.helpers.arrayElements(
    closedCaseIds,
    Math.min(targetCount, closedCaseIds.length),
  );

  for (const originalCaseId of eligibleCases) {
    // Select retaliation type based on weights
    const retaliationType = selectRetaliationType();

    // Days after original case (30-90 days typical)
    const daysAfterOriginal = randomInt(30, 90);

    // Link type: mostly original reporters, some witnesses
    const linkType = Math.random() < 0.8 ? 'reporter' : 'witness';

    // Generate narrative snippet
    const narrativeSnippet = generateRetaliationNarrative(retaliationType);

    chains.push({
      originalCaseId,
      followUpCaseId: '', // Will be set during case creation
      daysAfterOriginal,
      retaliationType,
      linkType,
      narrativeSnippet,
    });
  }

  return chains;
}

/**
 * Select a retaliation type based on weighted distribution
 */
function selectRetaliationType(): RetaliationType {
  const roll = Math.random();
  let cumulative = 0;

  for (const [type, config] of Object.entries(RETALIATION_TYPES)) {
    cumulative += config.weight;
    if (roll < cumulative) {
      return type as RetaliationType;
    }
  }

  return 'performance_review'; // Default fallback
}

/**
 * Generate a retaliation narrative snippet
 *
 * @param retaliationType - Type of retaliation
 * @returns Narrative text for the retaliation report
 */
export function generateRetaliationNarrative(
  retaliationType: RetaliationType,
): string {
  const config = RETALIATION_TYPES[retaliationType];
  const template = pickRandom(config.narratives);

  // Replace placeholders
  return template.replace(/\{years\}/g, String(randomInt(2, 7)));
}

/**
 * Generate full retaliation case details
 *
 * @param chain - The retaliation chain being created
 * @param originalCaseDate - Date the original case was closed
 * @returns Extended details for the retaliation case
 */
export function generateRetaliationCaseDetails(
  chain: RetaliationChain,
  originalCaseDate: Date,
): {
  createdAt: Date;
  details: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  customFields: Record<string, unknown>;
} {
  // Calculate follow-up date
  const createdAt = addDays(originalCaseDate, chain.daysAfterOriginal);

  // Build full narrative
  const opener =
    'I am filing this report because I believe I am experiencing retaliation for my previous complaint.';
  const caseReference = `My original report (case reference number available on request) was filed approximately ${chain.daysAfterOriginal} days ago.`;
  const details = `${opener}\n\n${caseReference}\n\n${chain.narrativeSnippet}\n\nI request that this be treated as a retaliation complaint and investigated accordingly.`;

  // Retaliation cases are typically HIGH severity
  const severity = chain.retaliationType === 'termination_threat' ? 'HIGH' : 'MEDIUM';

  // Custom fields for case linkage
  const customFields = {
    isRetaliation: true,
    retaliationType: chain.retaliationType,
    originalCaseId: chain.originalCaseId,
    daysAfterOriginal: chain.daysAfterOriginal,
    linkType: chain.linkType,
  };

  return {
    createdAt,
    details,
    severity: severity as 'HIGH' | 'MEDIUM' | 'LOW',
    customFields,
  };
}

/**
 * Get a retaliation chain for a specific original case
 *
 * @param chains - Array of retaliation chains
 * @param originalCaseId - Original case ID to find
 * @returns The retaliation chain, or undefined
 */
export function getRetaliationChainForCase(
  chains: RetaliationChain[],
  originalCaseId: string,
): RetaliationChain | undefined {
  return chains.find((c) => c.originalCaseId === originalCaseId);
}

/**
 * Get all unfulfilled retaliation chains (followUpCaseId not yet set)
 *
 * @param chains - Array of retaliation chains
 * @returns Chains that still need follow-up cases created
 */
export function getUnfulfilledChains(chains: RetaliationChain[]): RetaliationChain[] {
  return chains.filter((c) => !c.followUpCaseId);
}

/**
 * Mark a chain as fulfilled with its follow-up case ID
 *
 * @param chains - Array of retaliation chains
 * @param originalCaseId - Original case ID
 * @param followUpCaseId - The created follow-up case ID
 */
export function markChainFulfilled(
  chains: RetaliationChain[],
  originalCaseId: string,
  followUpCaseId: string,
): void {
  const chain = chains.find((c) => c.originalCaseId === originalCaseId);
  if (chain) {
    chain.followUpCaseId = followUpCaseId;
  }
}

/**
 * Get retaliation pattern statistics
 */
export function getRetaliationStats(chains: RetaliationChain[]): {
  total: number;
  fulfilled: number;
  byType: Record<RetaliationType, number>;
  avgDaysAfter: number;
} {
  const byType: Record<RetaliationType, number> = {
    performance_review: 0,
    schedule_change: 0,
    role_reduction: 0,
    exclusion: 0,
    hostile_behavior: 0,
    termination_threat: 0,
    transfer: 0,
    workload_increase: 0,
  };

  let totalDays = 0;

  for (const chain of chains) {
    byType[chain.retaliationType]++;
    totalDays += chain.daysAfterOriginal;
  }

  return {
    total: chains.length,
    fulfilled: chains.filter((c) => c.followUpCaseId).length,
    byType,
    avgDaysAfter: chains.length > 0 ? Math.round(totalDays / chains.length) : 0,
  };
}
