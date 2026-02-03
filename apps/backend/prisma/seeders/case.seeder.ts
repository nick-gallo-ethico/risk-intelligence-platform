/**
 * Case Seeder
 *
 * Creates 4,500 Cases from seeded RIUs with realistic patterns.
 * Cases are the work containers where investigations happen.
 *
 * Features:
 * - 90% RIU-to-Case ratio (4,500 Cases from ~5,000 RIUs)
 * - 10% open / 90% closed status distribution
 * - Priority pyramid: 2% critical, 8% high, 30% medium, 60% low
 * - Pattern injection: repeat subjects, manager hotspots, flagship cases
 * - AI enrichment pre-populated
 * - RIU-Case associations created
 * - Case consolidation (10% have multiple RIUs)
 */

import {
  PrismaClient,
  CaseStatus,
  CaseType,
  SourceChannel,
  ReporterType,
  Severity,
  RiuType,
  RiuSourceChannel,
} from '@prisma/client';
import { faker } from '@faker-js/faker';
import { nanoid } from 'nanoid';
import { addDays, addHours, subDays } from 'date-fns';
import { SEED_CONFIG } from './config';
import {
  weightedRandom,
  chance,
  randomInt,
  pickRandom,
  generateCaseTimeline,
  DEMO_CURRENT_DATE,
} from './utils';
import {
  HotspotManager,
  RepeatSubjectInfo,
  FlagshipCase,
  FLAGSHIP_CASES,
  markSubjectAssigned,
  getRepeatSubjectForAssignment,
  markHotspotAssigned,
  getHotspotForAssignment,
} from './patterns';
import { generateNarrative } from './data/narrative-templates';

// Seed offset for cases (masterSeed + 3000)
const SEED_OFFSET = 3000;

// Batch size for database inserts
const BATCH_SIZE = 100;

// ============================================
// Distribution Configuration
// ============================================

/**
 * Case status distribution
 * 10% open (NEW, OPEN), 90% closed
 */
const STATUS_DISTRIBUTION = [
  { value: CaseStatus.NEW, weight: 3 },
  { value: CaseStatus.OPEN, weight: 7 },
  { value: CaseStatus.CLOSED, weight: 90 },
];

/**
 * Priority distribution (pyramid)
 * 2% critical, 8% high, 30% medium, 60% low
 */
const PRIORITY_DISTRIBUTION = [
  { value: 'CRITICAL', weight: 2 },
  { value: 'HIGH', weight: 8 },
  { value: 'MEDIUM', weight: 30 },
  { value: 'LOW', weight: 60 },
];

/**
 * Case type distribution
 * 90% reports, 10% RFI (request for information)
 */
const CASE_TYPE_DISTRIBUTION = [
  { value: CaseType.REPORT, weight: 90 },
  { value: CaseType.RFI, weight: 10 },
];

/**
 * Case complexity distribution for timeline
 * Simple: 60%, Medium: 30%, Complex: 10%
 */
const COMPLEXITY_DISTRIBUTION = [
  { value: 'simple', weight: 60 },
  { value: 'medium', weight: 30 },
  { value: 'complex', weight: 10 },
];

/**
 * Map RIU source channel to Case source channel
 */
const RIU_TO_CASE_CHANNEL: Record<RiuSourceChannel, SourceChannel> = {
  [RiuSourceChannel.PHONE]: SourceChannel.HOTLINE,
  [RiuSourceChannel.WEB_FORM]: SourceChannel.WEB_FORM,
  [RiuSourceChannel.CHATBOT]: SourceChannel.CHATBOT,
  [RiuSourceChannel.EMAIL]: SourceChannel.DIRECT_ENTRY,
  [RiuSourceChannel.PROXY]: SourceChannel.PROXY,
  [RiuSourceChannel.DIRECT_ENTRY]: SourceChannel.DIRECT_ENTRY,
  [RiuSourceChannel.CAMPAIGN]: SourceChannel.WEB_FORM,
};

// ============================================
// Case Record Interface
// ============================================

interface CaseRecord {
  id: string;
  referenceNumber: string;
  organizationId: string;
  status: CaseStatus;
  statusRationale: string | null;
  sourceChannel: SourceChannel;
  caseType: CaseType;
  intakeTimestamp: Date;
  reporterType: ReporterType;
  reporterAnonymous: boolean;
  anonymousAccessCode: string | null;
  details: string;
  summary: string | null;
  severity: Severity;
  primaryCategoryId: string | null;
  tags: string[];
  aiSummary: string | null;
  aiSummaryGeneratedAt: Date | null;
  aiModelVersion: string | null;
  aiConfidenceScore: number | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  updatedById: string;
  // Custom tracking fields
  priority: string;
  complexity: string;
  linkedRiuIds: string[];
  isFlagship: boolean;
  flagshipData?: FlagshipCase;
}

// ============================================
// Reference Number Generation
// ============================================

/**
 * Generate case reference number
 */
function generateCaseReferenceNumber(date: Date, index: number, prefix?: string): string {
  const year = date.getFullYear();
  const paddedIndex = String(index + 1).padStart(5, '0');
  return prefix || `CASE-${year}-${paddedIndex}`;
}

// ============================================
// AI Enrichment Generation
// ============================================

/**
 * Generate AI summary for a case
 */
function generateAiSummary(
  details: string,
  categoryName: string,
  severity: Severity,
): string {
  const severityText = {
    [Severity.HIGH]: 'High-severity',
    [Severity.MEDIUM]: 'Moderate',
    [Severity.LOW]: 'Low-priority',
  };

  const summaryPrefixes = [
    `${severityText[severity]} ${categoryName.toLowerCase()} report.`,
    `Report involving potential ${categoryName.toLowerCase()} concerns.`,
    `${categoryName} allegation requiring investigation.`,
  ];

  const summaryMiddle = [
    'Multiple factors indicate thorough review warranted.',
    'Pattern analysis suggests this may require immediate attention.',
    'Initial assessment indicates standard investigation protocol applies.',
    'Preliminary review suggests straightforward investigation path.',
    'Risk indicators warrant comprehensive investigation approach.',
  ];

  const summaryEnd = [
    'Recommend standard investigation timeline.',
    'Prioritize based on organizational risk factors.',
    'Consider witness interviews and documentation review.',
    'Follow established investigation procedures.',
    'Monitor for potential related reports.',
  ];

  return `${pickRandom(summaryPrefixes)} ${pickRandom(summaryMiddle)} ${pickRandom(summaryEnd)}`;
}

/**
 * Generate AI risk score based on severity and category
 */
function generateAiRiskScore(severity: Severity, categoryName: string): number {
  // Base score by severity
  const baseScores = {
    [Severity.HIGH]: randomInt(70, 95),
    [Severity.MEDIUM]: randomInt(40, 70),
    [Severity.LOW]: randomInt(15, 45),
  };

  let score = baseScores[severity];

  // Adjust for high-risk categories
  const highRiskCategories = ['harassment', 'discrimination', 'retaliation', 'fraud'];
  if (highRiskCategories.some((c) => categoryName.toLowerCase().includes(c))) {
    score = Math.min(100, score + randomInt(5, 15));
  }

  return score;
}

// ============================================
// Pattern Application
// ============================================

/**
 * Check if this case should use a repeat subject
 */
function shouldUseRepeatSubject(
  index: number,
  repeatSubjectPool: RepeatSubjectInfo[],
): RepeatSubjectInfo | null {
  // ~10% of cases involve repeat subjects
  if (!chance(0.10)) {
    return null;
  }
  return getRepeatSubjectForAssignment(repeatSubjectPool);
}

/**
 * Check if this case should be in a hotspot manager's team
 */
function shouldUseHotspotManager(
  index: number,
  hotspotManagers: HotspotManager[],
  categoryId?: string,
): HotspotManager | null {
  // Check if we have hotspots that need more cases
  return getHotspotForAssignment(hotspotManagers, categoryId);
}

// ============================================
// Main Seeder Function
// ============================================

export interface SeedCasesResult {
  caseIds: string[];
  caseData: Array<{
    id: string;
    status: CaseStatus;
    createdAt: Date;
    categoryId: string | null;
    priority: string;
    isFlagship: boolean;
  }>;
}

/**
 * Seed Cases for a demo tenant
 *
 * @param prisma - Prisma client instance
 * @param organizationId - Organization ID
 * @param riuIds - Array of RIU IDs to create cases from
 * @param userIds - Array of user IDs for createdBy field
 * @param employeeIds - Array of employee IDs for subjects
 * @param categoryMap - Map of category name to category info
 * @param patterns - Pattern generators for realistic data
 * @returns Object with created case IDs and case data
 */
export async function seedCases(
  prisma: PrismaClient,
  organizationId: string,
  riuIds: string[],
  userIds: string[],
  employeeIds: string[],
  categoryMap: Map<string, { id: string; code: string; name?: string }>,
  patterns: {
    repeatSubjects: RepeatSubjectInfo[];
    managerHotspots: HotspotManager[];
    flagshipCases: FlagshipCase[];
  },
): Promise<SeedCasesResult> {
  // Initialize faker with deterministic seed
  faker.seed(SEED_CONFIG.masterSeed + SEED_OFFSET);

  const targetCount = SEED_CONFIG.volumes.cases; // 4500
  const caseIds: string[] = [];
  const caseData: SeedCasesResult['caseData'] = [];
  let batchNumber = 0;

  // Fetch RIUs to get their data
  const rius = await prisma.riskIntelligenceUnit.findMany({
    where: { organizationId },
    select: {
      id: true,
      sourceChannel: true,
      categoryId: true,
      severity: true,
      reporterType: true,
      anonymousAccessCode: true,
      details: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Build array for case creation
  const caseBatch: CaseRecord[] = [];
  const riuCaseAssociations: Array<{
    riuId: string;
    caseId: string;
    associationType: 'PRIMARY' | 'RELATED' | 'MERGED_FROM';
    createdById: string;
    createdAt: Date;
  }> = [];

  // Track which RIUs have been used
  const usedRiuIds = new Set<string>();

  // Calculate how many RIUs to skip (to get 90% ratio)
  // 4500 cases from 5000 RIUs = 90%
  // Some RIUs won't create cases, some cases will have multiple RIUs
  const riusPerCase = rius.length / targetCount;

  // Build category name to ID map
  const categoryNameToId = new Map<string, string>();
  const categoryIdToName = new Map<string, string>();
  categoryMap.forEach((info, name) => {
    categoryNameToId.set(name, info.id);
    if (info.name) {
      categoryIdToName.set(info.id, info.name);
    }
  });

  console.log(`  Generating ${targetCount} Cases from ${rius.length} RIUs...`);

  // First, create flagship cases
  console.log(`  Creating ${patterns.flagshipCases.length} flagship cases...`);
  for (let i = 0; i < patterns.flagshipCases.length && i < targetCount; i++) {
    const flagship = patterns.flagshipCases[i];
    const caseId = faker.string.uuid();
    caseIds.push(caseId);

    // Find category ID
    const categoryId = categoryNameToId.get(flagship.category) ||
      Array.from(categoryMap.values())[0]?.id;

    // Map flagship status to CaseStatus enum
    const status = flagship.status === 'NEW' ? CaseStatus.NEW :
      flagship.status === 'OPEN' ? CaseStatus.OPEN : CaseStatus.CLOSED;

    // Map flagship severity to Severity enum
    const severity = flagship.severity === 'HIGH' ? Severity.HIGH :
      flagship.severity === 'MEDIUM' ? Severity.MEDIUM : Severity.LOW;

    // Calculate created date based on duration
    const createdAt = flagship.status === 'CLOSED'
      ? subDays(DEMO_CURRENT_DATE, flagship.durationDays + randomInt(5, 30))
      : subDays(DEMO_CURRENT_DATE, randomInt(1, 14));

    // Get a user ID for created/updated by
    const userId = pickRandom(userIds);

    // Map reporter type
    const reporterType = flagship.name.includes('Anonymous')
      ? ReporterType.ANONYMOUS : ReporterType.IDENTIFIED;

    caseBatch.push({
      id: caseId,
      referenceNumber: flagship.referencePrefix + '-0001',
      organizationId,
      status,
      statusRationale: null,
      sourceChannel: SourceChannel.HOTLINE,
      caseType: CaseType.REPORT,
      intakeTimestamp: createdAt,
      reporterType,
      reporterAnonymous: reporterType === ReporterType.ANONYMOUS,
      anonymousAccessCode: reporterType === ReporterType.ANONYMOUS ? nanoid(12) : null,
      details: flagship.narrative,
      summary: flagship.name,
      severity,
      primaryCategoryId: categoryId,
      tags: ['flagship', flagship.category.toLowerCase()],
      aiSummary: flagship.aiSummary,
      aiSummaryGeneratedAt: addHours(createdAt, randomInt(1, 4)),
      aiModelVersion: 'claude-3-opus',
      aiConfidenceScore: flagship.aiRiskScore,
      createdAt,
      updatedAt: status === CaseStatus.CLOSED
        ? addDays(createdAt, flagship.durationDays)
        : createdAt,
      createdById: userId,
      updatedById: userId,
      priority: 'HIGH',
      complexity: flagship.investigationCount > 1 ? 'complex' : 'medium',
      linkedRiuIds: [],
      isFlagship: true,
      flagshipData: flagship,
    });

    caseData.push({
      id: caseId,
      status,
      createdAt,
      categoryId,
      priority: 'HIGH',
      isFlagship: true,
    });
  }

  // Generate remaining cases from RIUs
  const remainingCount = targetCount - patterns.flagshipCases.length;
  const riuQueue = [...rius];
  let riuIndex = 0;

  console.log(`  Creating ${remainingCount} regular cases...`);

  for (let i = 0; i < remainingCount; i++) {
    // Progress logging every 500 cases
    if (i > 0 && i % 500 === 0) {
      console.log(`    Progress: ${i}/${remainingCount} cases generated...`);
    }

    const caseId = faker.string.uuid();
    caseIds.push(caseId);

    // Get primary RIU for this case
    const primaryRiu = riuQueue[riuIndex % riuQueue.length];
    riuIndex++;
    usedRiuIds.add(primaryRiu.id);

    // Determine if this case should have multiple RIUs (10% consolidation)
    const linkedRiuIds = [primaryRiu.id];
    if (chance(0.10) && riuIndex < riuQueue.length - 2) {
      const additionalRiuCount = randomInt(1, 2);
      for (let j = 0; j < additionalRiuCount && riuIndex < riuQueue.length; j++) {
        const additionalRiu = riuQueue[riuIndex];
        if (!usedRiuIds.has(additionalRiu.id)) {
          linkedRiuIds.push(additionalRiu.id);
          usedRiuIds.add(additionalRiu.id);
          riuIndex++;
        }
      }
    }

    // Determine status
    const status = weightedRandom(STATUS_DISTRIBUTION);

    // Determine priority
    const priority = weightedRandom(PRIORITY_DISTRIBUTION);

    // Determine case type
    const caseType = weightedRandom(CASE_TYPE_DISTRIBUTION);

    // Determine complexity
    const complexity = weightedRandom(COMPLEXITY_DISTRIBUTION);

    // Map source channel from RIU
    const sourceChannel = RIU_TO_CASE_CHANNEL[primaryRiu.sourceChannel] || SourceChannel.DIRECT_ENTRY;

    // Use category from RIU or random
    const categoryId = primaryRiu.categoryId ||
      Array.from(categoryMap.values())[randomInt(0, categoryMap.size - 1)]?.id;
    const categoryName = categoryId ? (categoryIdToName.get(categoryId) || 'Policy Violation') : 'Policy Violation';

    // Inherit severity from RIU (can be adjusted)
    const severity = primaryRiu.severity;

    // Map reporter type from RIU
    const reporterType = primaryRiu.reporterType === 'ANONYMOUS'
      ? ReporterType.ANONYMOUS
      : primaryRiu.reporterType === 'CONFIDENTIAL'
        ? ReporterType.IDENTIFIED
        : ReporterType.IDENTIFIED;

    // Calculate case created at (1-4 hours after RIU released)
    const createdAt = addHours(primaryRiu.createdAt, randomInt(1, 4));

    // Generate timeline based on status
    let updatedAt = createdAt;
    if (status === CaseStatus.CLOSED) {
      // Calculate duration based on complexity
      let durationDays: number;
      switch (complexity) {
        case 'simple':
          durationDays = randomInt(2, 4);
          break;
        case 'medium':
          durationDays = randomInt(7, 21);
          break;
        case 'complex':
          durationDays = randomInt(30, 90);
          break;
        default:
          durationDays = randomInt(5, 15);
      }
      updatedAt = addDays(createdAt, durationDays);

      // Ensure closed date is not in the future
      if (updatedAt > DEMO_CURRENT_DATE) {
        updatedAt = subDays(DEMO_CURRENT_DATE, randomInt(1, 30));
      }
    }

    // Get user IDs
    const createdById = pickRandom(userIds);
    const updatedById = pickRandom(userIds);

    // Generate case details (use RIU details or generate new)
    const details = primaryRiu.details;

    // Generate AI enrichment
    const aiSummary = generateAiSummary(details, categoryName, severity);
    const aiRiskScore = generateAiRiskScore(severity, categoryName);

    // Check for pattern applications
    const repeatSubject = shouldUseRepeatSubject(i, patterns.repeatSubjects);
    if (repeatSubject) {
      markSubjectAssigned(patterns.repeatSubjects, repeatSubject.employeeId);
    }

    const hotspotManager = shouldUseHotspotManager(i, patterns.managerHotspots, categoryId);
    if (hotspotManager) {
      markHotspotAssigned(patterns.managerHotspots, hotspotManager.managerId);
    }

    // Build tags
    const tags: string[] = [];
    if (repeatSubject) tags.push('repeat-subject');
    if (hotspotManager) tags.push('hotspot-team');
    if (priority === 'CRITICAL') tags.push('critical');
    if (complexity === 'complex') tags.push('complex');

    // Generate reference number
    const referenceNumber = generateCaseReferenceNumber(
      createdAt,
      patterns.flagshipCases.length + i,
    );

    caseBatch.push({
      id: caseId,
      referenceNumber,
      organizationId,
      status,
      statusRationale: status === CaseStatus.CLOSED ? 'Investigation complete' : null,
      sourceChannel,
      caseType,
      intakeTimestamp: createdAt,
      reporterType,
      reporterAnonymous: reporterType === ReporterType.ANONYMOUS,
      anonymousAccessCode: reporterType === ReporterType.ANONYMOUS
        ? primaryRiu.anonymousAccessCode
        : null,
      details,
      summary: details.length > 200 ? details.substring(0, 197) + '...' : null,
      severity,
      primaryCategoryId: categoryId,
      tags,
      aiSummary,
      aiSummaryGeneratedAt: addHours(createdAt, randomInt(1, 8)),
      aiModelVersion: 'claude-3-opus',
      aiConfidenceScore: aiRiskScore,
      createdAt,
      updatedAt,
      createdById,
      updatedById,
      priority,
      complexity,
      linkedRiuIds,
      isFlagship: false,
    });

    caseData.push({
      id: caseId,
      status,
      createdAt,
      categoryId,
      priority,
      isFlagship: false,
    });

    // Create RIU-Case associations
    for (let j = 0; j < linkedRiuIds.length; j++) {
      riuCaseAssociations.push({
        riuId: linkedRiuIds[j],
        caseId,
        associationType: j === 0 ? 'PRIMARY' : 'RELATED',
        createdById,
        createdAt,
      });
    }

    // Flush batch if full
    if (caseBatch.length >= BATCH_SIZE) {
      await flushCaseBatch(prisma, caseBatch);
      batchNumber++;
      caseBatch.length = 0;
    }
  }

  // Final flush for cases
  if (caseBatch.length > 0) {
    await flushCaseBatch(prisma, caseBatch);
  }

  // Insert RIU-Case associations in batches
  console.log(`  Creating ${riuCaseAssociations.length} RIU-Case associations...`);
  for (let i = 0; i < riuCaseAssociations.length; i += BATCH_SIZE) {
    const batch = riuCaseAssociations.slice(i, i + BATCH_SIZE);
    await prisma.riuCaseAssociation.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }

  console.log(`  Created ${caseIds.length} Cases`);
  console.log(`    - Flagship cases: ${patterns.flagshipCases.length}`);
  console.log(`    - Regular cases: ${caseIds.length - patterns.flagshipCases.length}`);
  console.log(`    - RIU associations: ${riuCaseAssociations.length}`);

  return { caseIds, caseData };
}

/**
 * Flush case batch to database
 */
async function flushCaseBatch(
  prisma: PrismaClient,
  batch: CaseRecord[],
): Promise<void> {
  if (batch.length === 0) return;

  await prisma.case.createMany({
    data: batch.map((c) => ({
      id: c.id,
      referenceNumber: c.referenceNumber,
      organizationId: c.organizationId,
      status: c.status,
      statusRationale: c.statusRationale,
      sourceChannel: c.sourceChannel,
      caseType: c.caseType,
      intakeTimestamp: c.intakeTimestamp,
      reporterType: c.reporterType,
      reporterAnonymous: c.reporterAnonymous,
      anonymousAccessCode: c.anonymousAccessCode,
      details: c.details,
      summary: c.summary,
      severity: c.severity,
      primaryCategoryId: c.primaryCategoryId,
      tags: c.tags,
      aiSummary: c.aiSummary,
      aiSummaryGeneratedAt: c.aiSummaryGeneratedAt,
      aiModelVersion: c.aiModelVersion,
      aiConfidenceScore: c.aiConfidenceScore,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      createdById: c.createdById,
      updatedById: c.updatedById,
      // Demo reset support: mark as immutable base data
      isBaseData: true,
      demoUserSessionId: null,
    })),
    skipDuplicates: true,
  });
}

/**
 * Generate recent unread cases for demo
 * Creates ~50 cases from the last 7 days with NEW status
 */
export async function createRecentUnreadCases(
  prisma: PrismaClient,
  organizationId: string,
  caseIds: string[],
): Promise<number> {
  // Update ~50 recent cases to NEW status
  const recentCaseCount = Math.min(50, Math.floor(caseIds.length * 0.01));

  // Get most recent cases
  const recentCases = await prisma.case.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: recentCaseCount,
    select: { id: true },
  });

  if (recentCases.length > 0) {
    await prisma.case.updateMany({
      where: {
        id: { in: recentCases.map((c) => c.id) },
      },
      data: {
        status: CaseStatus.NEW,
      },
    });
  }

  return recentCases.length;
}
