/**
 * Repeat Subjects Pattern Generator
 *
 * Generates a pool of employees who appear as subjects in multiple cases.
 * This enables "repeat offender" analytics and cross-case pattern detection demos.
 *
 * Pattern: ~10% of cases involve repeat subjects (2-5 appearances each)
 * Pool: ~50 employees identified as repeat subjects
 */

import { faker } from '@faker-js/faker';
import { SEED_CONFIG } from '../config';
import { randomInt, pickRandom } from '../utils';

// Seed offset for repeat subjects pattern
const SEED_OFFSET = 5000;

/**
 * Repeat subject appearance tracking
 */
export interface RepeatSubjectInfo {
  /** Employee ID */
  employeeId: string;
  /** Target number of cases to appear in */
  targetCaseCount: number;
  /** Categories this subject tends to appear in */
  preferredCategories: string[];
  /** Current count of cases assigned */
  assignedCases: number;
}

/**
 * Generate the repeat subjects pool
 *
 * Creates a set of employees who will appear as subjects in multiple cases.
 * Each repeat subject has 2-5 case appearances with category preferences.
 *
 * @param employeeIds - Array of all employee IDs to select from
 * @param targetCount - Number of repeat subjects to generate (default: 50)
 * @returns Map of employee ID to case count target
 *
 * @example
 * const repeatSubjects = generateRepeatSubjects(employeeIds, 50);
 * // Returns Map<string, number> where key is employeeId, value is case count
 */
export function generateRepeatSubjects(
  employeeIds: string[],
  targetCount: number = 50,
): Map<string, number> {
  faker.seed(SEED_CONFIG.masterSeed + SEED_OFFSET);

  const result = new Map<string, number>();

  if (employeeIds.length === 0) {
    return result;
  }

  // Select employees for repeat subject pool
  const selectedEmployees = faker.helpers.arrayElements(
    employeeIds,
    Math.min(targetCount, employeeIds.length),
  );

  for (const employeeId of selectedEmployees) {
    // Each repeat subject appears in 2-5 cases
    const caseCount = randomInt(2, 5);
    result.set(employeeId, caseCount);
  }

  return result;
}

/**
 * Pool of repeat subjects with extended tracking info
 */
export const REPEAT_SUBJECT_POOL: RepeatSubjectInfo[] = [];

/**
 * Generate extended repeat subject pool with category preferences
 *
 * @param employeeIds - Array of all employee IDs
 * @param categoryIds - Array of category IDs for preferences
 * @param targetCount - Number of repeat subjects (default: 50)
 * @returns Array of RepeatSubjectInfo with full tracking
 */
export function generateRepeatSubjectPool(
  employeeIds: string[],
  categoryIds: string[],
  targetCount: number = 50,
): RepeatSubjectInfo[] {
  faker.seed(SEED_CONFIG.masterSeed + SEED_OFFSET);

  const pool: RepeatSubjectInfo[] = [];

  if (employeeIds.length === 0 || categoryIds.length === 0) {
    return pool;
  }

  // Select employees for repeat subject pool
  const selectedEmployees = faker.helpers.arrayElements(
    employeeIds,
    Math.min(targetCount, employeeIds.length),
  );

  // Categories that commonly see repeat subjects
  const repeatProneCategoryWeights = [
    { categories: categoryIds.slice(0, 3), weight: 0.6 }, // First 3 categories weighted higher
    { categories: categoryIds, weight: 0.4 }, // Any category
  ];

  for (const employeeId of selectedEmployees) {
    // Each repeat subject appears in 2-5 cases
    const targetCaseCount = randomInt(2, 5);

    // Select 1-3 preferred categories for this subject
    const preferredCategoryCount = randomInt(1, 3);
    const categorySource =
      Math.random() < 0.6
        ? repeatProneCategoryWeights[0].categories
        : repeatProneCategoryWeights[1].categories;

    const preferredCategories = faker.helpers.arrayElements(
      categorySource,
      Math.min(preferredCategoryCount, categorySource.length),
    );

    pool.push({
      employeeId,
      targetCaseCount,
      preferredCategories,
      assignedCases: 0,
    });
  }

  return pool;
}

/**
 * Get a repeat subject that needs more case assignments
 *
 * @param pool - The repeat subject pool
 * @param categoryId - Optional category to prefer
 * @returns A repeat subject info, or null if none need more cases
 */
export function getRepeatSubjectForAssignment(
  pool: RepeatSubjectInfo[],
  categoryId?: string,
): RepeatSubjectInfo | null {
  // First try to find a subject with preference for this category
  if (categoryId) {
    const categoryMatch = pool.find(
      (s) =>
        s.assignedCases < s.targetCaseCount &&
        s.preferredCategories.includes(categoryId),
    );
    if (categoryMatch) {
      return categoryMatch;
    }
  }

  // Otherwise find any subject that needs more cases
  return pool.find((s) => s.assignedCases < s.targetCaseCount) || null;
}

/**
 * Mark a repeat subject as assigned to a case
 *
 * @param pool - The repeat subject pool
 * @param employeeId - Employee ID to mark
 */
export function markSubjectAssigned(
  pool: RepeatSubjectInfo[],
  employeeId: string,
): void {
  const subject = pool.find((s) => s.employeeId === employeeId);
  if (subject) {
    subject.assignedCases++;
  }
}

/**
 * Check if an employee is a repeat subject
 *
 * @param repeatSubjects - Map of repeat subjects
 * @param employeeId - Employee ID to check
 * @returns True if employee is a repeat subject
 */
export function isRepeatSubject(
  repeatSubjects: Map<string, number>,
  employeeId: string,
): boolean {
  return repeatSubjects.has(employeeId);
}

/**
 * Get remaining case count for a repeat subject
 *
 * @param pool - The repeat subject pool
 * @param employeeId - Employee ID to check
 * @returns Number of remaining cases, or 0 if not a repeat subject
 */
export function getRemainingCases(
  pool: RepeatSubjectInfo[],
  employeeId: string,
): number {
  const subject = pool.find((s) => s.employeeId === employeeId);
  return subject ? Math.max(0, subject.targetCaseCount - subject.assignedCases) : 0;
}
