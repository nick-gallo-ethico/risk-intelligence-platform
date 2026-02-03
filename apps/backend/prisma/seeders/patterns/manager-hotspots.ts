/**
 * Manager Hotspots Pattern Generator
 *
 * Generates managers who have elevated case rates in their teams.
 * This enables "department risk analysis" and "hotspot identification" demos.
 *
 * Pattern: ~15 managers with 2x-3x normal team case rates
 * Categories: Concentrated in harassment, discrimination, policy violations
 */

import { faker } from '@faker-js/faker';
import { SEED_CONFIG } from '../config';
import { randomInt, pickRandom, randomFloat } from '../utils';

// Seed offset for manager hotspots pattern
const SEED_OFFSET = 5100;

/**
 * Manager hotspot tracking
 */
export interface HotspotManager {
  /** Manager employee ID */
  managerId: string;
  /** Case rate multiplier (2x-3x normal) */
  teamCaseRate: number;
  /** Categories this manager's team shows elevated rates in */
  categories: string[];
  /** Team size (for calculating expected vs actual) */
  teamSize: number;
  /** Current case count assigned */
  assignedCases: number;
  /** Target case count based on rate */
  targetCases: number;
  /** Optional notes for demo narrative */
  demoNotes?: string;
}

/**
 * Demo notes for hotspot manager scenarios
 */
const HOTSPOT_DEMO_NOTES = [
  'Pattern shows consistent issues since department restructuring in Q3.',
  'Multiple independent reports from different team members.',
  'Exit interviews have mentioned management style concerns.',
  'HR has noted elevated turnover in this team.',
  'Training completion rates are below department average.',
  'Anonymous feedback survey showed lower psychological safety scores.',
  'Performance review complaints have increased recently.',
  'New hires in this team have shorter average tenure.',
  'Cross-functional partners have raised concerns.',
  'Prior verbal counseling did not result in improvement.',
  'Employee engagement scores declining quarter over quarter.',
  'Pattern emerged after manager promotion from IC role.',
  'Remote work transition coincided with increased reports.',
  'High performers transferring out of this team.',
  'Attendance issues correlate with reported incidents.',
];

/**
 * Category preferences for hotspot managers
 * Harassment and discrimination are most common hotspot categories
 */
const HOTSPOT_CATEGORY_PATTERNS = [
  {
    name: 'harassment-focused',
    categoryPreferences: ['Harassment', 'Sexual Harassment', 'Hostile Work Environment'],
    weight: 0.35,
  },
  {
    name: 'discrimination-focused',
    categoryPreferences: ['Discrimination', 'Age Discrimination', 'Gender Discrimination'],
    weight: 0.25,
  },
  {
    name: 'management-style',
    categoryPreferences: ['Policy Violation', 'Harassment', 'Retaliation'],
    weight: 0.2,
  },
  {
    name: 'mixed-issues',
    categoryPreferences: ['Policy Violation', 'Safety', 'Harassment'],
    weight: 0.2,
  },
];

/**
 * Pool of hotspot managers (populated by generateManagerHotspots)
 */
export const HOTSPOT_MANAGERS: HotspotManager[] = [];

/**
 * Generate manager hotspots pool
 *
 * @param managerIds - Array of manager employee IDs
 * @param targetCount - Number of hotspot managers to generate (default: 15)
 * @param categoryNameToId - Map of category names to IDs
 * @param managerTeamSizes - Optional map of manager ID to team size
 * @returns Array of HotspotManager definitions
 *
 * @example
 * const hotspots = generateManagerHotspots(managerIds, 15);
 */
export function generateManagerHotspots(
  managerIds: string[],
  targetCount: number = 15,
  categoryNameToId?: Map<string, string>,
  managerTeamSizes?: Map<string, number>,
): HotspotManager[] {
  faker.seed(SEED_CONFIG.masterSeed + SEED_OFFSET);

  const hotspots: HotspotManager[] = [];

  if (managerIds.length === 0) {
    return hotspots;
  }

  // Select managers for hotspot designation
  const selectedManagers = faker.helpers.arrayElements(
    managerIds,
    Math.min(targetCount, managerIds.length),
  );

  // Calculate baseline case rate per employee
  // With 20K employees and 4500 cases, baseline is ~0.225 cases per employee
  const baselineCaseRate = SEED_CONFIG.volumes.cases / SEED_CONFIG.volumes.employees;

  for (let i = 0; i < selectedManagers.length; i++) {
    const managerId = selectedManagers[i];

    // Case rate multiplier: 2x-3x normal
    const teamCaseRate = randomFloat(2.0, 3.0);

    // Select category pattern
    const patternRoll = Math.random();
    let cumulativeWeight = 0;
    let pattern = HOTSPOT_CATEGORY_PATTERNS[0];
    for (const p of HOTSPOT_CATEGORY_PATTERNS) {
      cumulativeWeight += p.weight;
      if (patternRoll < cumulativeWeight) {
        pattern = p;
        break;
      }
    }

    // Convert category names to IDs if map provided
    let categories: string[];
    if (categoryNameToId) {
      categories = pattern.categoryPreferences
        .map((name) => categoryNameToId.get(name))
        .filter((id): id is string => id !== undefined);
      // Fallback to first few category IDs if no matches
      if (categories.length === 0) {
        categories = Array.from(categoryNameToId.values()).slice(0, 3);
      }
    } else {
      categories = pattern.categoryPreferences;
    }

    // Team size (default 8-15 if not provided)
    const teamSize = managerTeamSizes?.get(managerId) ?? randomInt(8, 15);

    // Calculate target cases based on rate multiplier
    // Normal team of 10 would have ~2.25 cases, hotspot has 4.5-6.75 cases
    const expectedNormalCases = Math.max(1, Math.round(teamSize * baselineCaseRate));
    const targetCases = Math.round(expectedNormalCases * teamCaseRate);

    hotspots.push({
      managerId,
      teamCaseRate,
      categories,
      teamSize,
      assignedCases: 0,
      targetCases: Math.max(3, targetCases), // At least 3 cases to be noticeable
      demoNotes: pickRandom(HOTSPOT_DEMO_NOTES),
    });
  }

  return hotspots;
}

/**
 * Get a hotspot manager that needs more case assignments
 *
 * @param hotspots - The hotspot manager pool
 * @param categoryId - Optional category to match preference
 * @returns A hotspot manager, or null if none need more cases
 */
export function getHotspotForAssignment(
  hotspots: HotspotManager[],
  categoryId?: string,
): HotspotManager | null {
  // First try to find a manager with this category preference
  if (categoryId) {
    const categoryMatch = hotspots.find(
      (h) =>
        h.assignedCases < h.targetCases &&
        h.categories.includes(categoryId),
    );
    if (categoryMatch) {
      return categoryMatch;
    }
  }

  // Otherwise find any hotspot that needs more cases
  return hotspots.find((h) => h.assignedCases < h.targetCases) || null;
}

/**
 * Mark a hotspot manager as having a case assigned to their team
 *
 * @param hotspots - The hotspot manager pool
 * @param managerId - Manager ID to mark
 */
export function markHotspotAssigned(
  hotspots: HotspotManager[],
  managerId: string,
): void {
  const hotspot = hotspots.find((h) => h.managerId === managerId);
  if (hotspot) {
    hotspot.assignedCases++;
  }
}

/**
 * Check if a manager is a designated hotspot
 *
 * @param hotspots - The hotspot manager pool
 * @param managerId - Manager ID to check
 * @returns True if manager is a hotspot
 */
export function isHotspotManager(
  hotspots: HotspotManager[],
  managerId: string,
): boolean {
  return hotspots.some((h) => h.managerId === managerId);
}

/**
 * Get hotspot statistics for demo summary
 *
 * @param hotspots - The hotspot manager pool
 * @returns Summary statistics
 */
export function getHotspotStats(hotspots: HotspotManager[]): {
  totalHotspots: number;
  totalTargetCases: number;
  totalAssignedCases: number;
  avgTeamCaseRate: number;
} {
  if (hotspots.length === 0) {
    return {
      totalHotspots: 0,
      totalTargetCases: 0,
      totalAssignedCases: 0,
      avgTeamCaseRate: 0,
    };
  }

  const totalTargetCases = hotspots.reduce((sum, h) => sum + h.targetCases, 0);
  const totalAssignedCases = hotspots.reduce((sum, h) => sum + h.assignedCases, 0);
  const avgTeamCaseRate =
    hotspots.reduce((sum, h) => sum + h.teamCaseRate, 0) / hotspots.length;

  return {
    totalHotspots: hotspots.length,
    totalTargetCases,
    totalAssignedCases,
    avgTeamCaseRate: Math.round(avgTeamCaseRate * 100) / 100,
  };
}
