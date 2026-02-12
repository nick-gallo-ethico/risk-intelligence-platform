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
  AuditEntityType,
  AuditActionCategory,
  ActorType,
  PersonType,
  PersonSource,
  PersonCaseLabel,
} from "@prisma/client";
import { faker } from "@faker-js/faker";
import { nanoid } from "nanoid";
import { addDays, addHours, subDays } from "date-fns";
import { SEED_CONFIG } from "./config";
import {
  weightedRandom,
  chance,
  randomInt,
  pickRandom,
  generateCaseTimeline,
  DEMO_CURRENT_DATE,
} from "./utils";
import {
  HotspotManager,
  RepeatSubjectInfo,
  FlagshipCase,
  FLAGSHIP_CASES,
  markSubjectAssigned,
  getRepeatSubjectForAssignment,
  markHotspotAssigned,
  getHotspotForAssignment,
} from "./patterns";
import { generateNarrative } from "./data/narrative-templates";

// Seed offset for cases (masterSeed + 3000)
const SEED_OFFSET = 3000;

// Batch size for database inserts
const BATCH_SIZE = 100;

// Demo users who should "own" open cases for My Tasks display
// These match the demo users defined in user.seeder.ts
const DEMO_CASE_OWNERS = [
  "demo-cco@acme.local",
  "demo-investigator@acme.local",
  "demo-investigator2@acme.local",
  "demo-triage@acme.local",
];

// Number of open cases to assign to each demo user
const CASES_PER_DEMO_USER = 25;

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
  { value: "CRITICAL", weight: 2 },
  { value: "HIGH", weight: 8 },
  { value: "MEDIUM", weight: 30 },
  { value: "LOW", weight: 60 },
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
  { value: "simple", weight: 60 },
  { value: "medium", weight: 30 },
  { value: "complex", weight: 10 },
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
function generateCaseReferenceNumber(
  date: Date,
  index: number,
  prefix?: string,
): string {
  const year = date.getFullYear();
  const paddedIndex = String(index + 1).padStart(5, "0");
  return prefix || `CASE-${year}-${paddedIndex}`;
}

// ============================================
// AI Enrichment Generation
// ============================================

/**
 * Generate AI summary for a case (50-75 words)
 * Produces comprehensive summaries with severity assessment, category analysis,
 * investigation approach, and recommended actions.
 */
function generateAiSummary(
  details: string,
  categoryName: string,
  severity: Severity,
): string {
  const severityText = {
    [Severity.HIGH]: "High-severity",
    [Severity.MEDIUM]: "Moderate-severity",
    [Severity.LOW]: "Low-severity",
  };

  // Extended prefixes (15-20 words)
  const summaryPrefixes = [
    `${severityText[severity]} ${categoryName.toLowerCase()} report requiring comprehensive investigation based on initial intake assessment and organizational risk profile analysis.`,
    `Report involving potential ${categoryName.toLowerCase()} concerns with preliminary risk indicators suggesting elevated attention may be warranted for this matter.`,
    `${categoryName} allegation requiring formal investigation protocol activation based on severity classification and policy implications identified during triage.`,
    `${severityText[severity]} compliance matter involving ${categoryName.toLowerCase()} with multiple stakeholder considerations requiring structured investigation approach.`,
  ];

  // Category-specific analysis sentences (15-20 words)
  const categoryDetails: Record<string, string[]> = {
    harassment: [
      "Pattern analysis indicates potential hostile work environment factors requiring witness corroboration and documentation review.",
      "Behavioral indicators suggest escalating conduct pattern warranting immediate protective measures consideration.",
    ],
    discrimination: [
      "Statistical analysis may be warranted to identify potential disparate treatment patterns across affected population.",
      "Protected class considerations require careful documentation and comparative analysis of similarly situated individuals.",
    ],
    retaliation: [
      "Temporal proximity to protected activity requires analysis of adverse action pattern and management chain involvement.",
      "Whistleblower protection implications necessitate enhanced confidentiality protocols and chain of custody documentation.",
    ],
    financial_misconduct: [
      "Financial forensics recommended to quantify exposure and identify transaction patterns requiring remediation.",
      "Asset preservation and documentation retention protocols should be implemented pending investigation completion.",
    ],
    fraud: [
      "Forensic analysis indicated to identify scope of potential misconduct and quantify organizational exposure.",
      "Evidence preservation and witness sequencing critical to maintain investigation integrity.",
    ],
    safety: [
      "Regulatory compliance assessment required including OSHA notification timeline and remediation tracking.",
      "Root cause analysis should identify systemic factors contributing to reported safety concerns.",
    ],
    conflict_of_interest: [
      "Disclosure completeness assessment required along with recusal framework development.",
      "Relationship mapping and decision authority review recommended to identify conflict touchpoints.",
    ],
    data_privacy: [
      "Breach scope assessment and regulatory notification timeline evaluation required for compliance.",
      "Access log forensics and data flow analysis recommended to identify exposure extent.",
    ],
    policy_violation: [
      "Policy applicability review and violation severity assessment required for proportionate response.",
      "Precedent analysis recommended to ensure consistent enforcement approach.",
    ],
    workplace_violence: [
      "Threat assessment protocol activation required with security coordination and law enforcement notification consideration.",
      "Behavioral risk factors indicate need for immediate protective measures and ongoing monitoring.",
    ],
    default: [
      "Standard investigation protocols apply with documentation review and stakeholder interviews recommended.",
      "Risk assessment indicates structured approach required with appropriate escalation thresholds.",
    ],
  };

  // Get category-specific detail or default
  const categoryKey = categoryName.toLowerCase().replace(/[^a-z_]/g, "_");
  const details_array = categoryDetails[categoryKey] || categoryDetails.default;

  // Recommended actions (15-20 words)
  const recommendedActions = [
    "Recommend expedited timeline with witness interviews, documentation review, and management briefing upon completion.",
    "Prioritize based on organizational risk factors and stakeholder sensitivity with regular status reporting.",
    "Follow established investigation procedures with enhanced documentation for potential escalation pathway.",
    "Consider witness sequencing, documentary evidence preservation, and interim protective measures as warranted.",
    "Monitor for potential related reports and emerging patterns across organizational units.",
  ];

  return `${pickRandom(summaryPrefixes)} ${pickRandom(details_array)} ${pickRandom(recommendedActions)}`;
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
  const highRiskCategories = [
    "harassment",
    "discrimination",
    "retaliation",
    "fraud",
  ];
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
  if (!chance(0.1)) {
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
  flagshipCaseData: Array<{
    caseId: string;
    name: string;
    category: string;
    status: string;
    createdAt: Date;
    durationDays: number;
    createdById: string;
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
  const caseData: SeedCasesResult["caseData"] = [];
  const flagshipCaseData: SeedCasesResult["flagshipCaseData"] = [];
  let batchNumber = 0;

  // Get demo user IDs for case ownership (My Tasks display)
  const demoUsers = await prisma.user.findMany({
    where: {
      organizationId,
      email: { in: DEMO_CASE_OWNERS },
    },
    select: { id: true, email: true },
  });
  const demoUserIdMap = new Map(demoUsers.map((u) => [u.email, u.id]));
  console.log(`  Found ${demoUsers.length} demo users for case ownership`);

  // Track how many open cases assigned to each demo user
  const demoOwnerCounts = new Map<string, number>(
    DEMO_CASE_OWNERS.map((email) => [email, 0]),
  );

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
    orderBy: { createdAt: "asc" },
  });

  // Build array for case creation
  const caseBatch: CaseRecord[] = [];
  const riuCaseAssociations: Array<{
    riuId: string;
    caseId: string;
    organizationId: string;
    associationType: "PRIMARY" | "RELATED" | "MERGED_FROM";
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
    const categoryId =
      categoryNameToId.get(flagship.category) ||
      Array.from(categoryMap.values())[0]?.id;

    // Map flagship status to CaseStatus enum
    const status =
      flagship.status === "NEW"
        ? CaseStatus.NEW
        : flagship.status === "OPEN"
          ? CaseStatus.OPEN
          : CaseStatus.CLOSED;

    // Map flagship severity to Severity enum
    const severity =
      flagship.severity === "HIGH"
        ? Severity.HIGH
        : flagship.severity === "MEDIUM"
          ? Severity.MEDIUM
          : Severity.LOW;

    // Calculate created date based on duration
    const createdAt =
      flagship.status === "CLOSED"
        ? subDays(DEMO_CURRENT_DATE, flagship.durationDays + randomInt(5, 30))
        : subDays(DEMO_CURRENT_DATE, randomInt(1, 14));

    // Get a user ID for created/updated by
    const userId = pickRandom(userIds);

    // Map reporter type
    const reporterType = flagship.name.includes("Anonymous")
      ? ReporterType.ANONYMOUS
      : ReporterType.IDENTIFIED;

    caseBatch.push({
      id: caseId,
      referenceNumber: flagship.referencePrefix + "-0001",
      organizationId,
      status,
      statusRationale: null,
      sourceChannel: SourceChannel.HOTLINE,
      caseType: CaseType.REPORT,
      intakeTimestamp: createdAt,
      reporterType,
      reporterAnonymous: reporterType === ReporterType.ANONYMOUS,
      anonymousAccessCode:
        reporterType === ReporterType.ANONYMOUS ? nanoid(12) : null,
      details: flagship.details,
      summary: flagship.summary,
      severity,
      primaryCategoryId: categoryId,
      tags: ["flagship", flagship.category.toLowerCase()],
      aiSummary: flagship.aiSummary,
      aiSummaryGeneratedAt: addHours(createdAt, randomInt(1, 4)),
      aiModelVersion: "claude-3-opus",
      aiConfidenceScore: flagship.aiRiskScore,
      createdAt,
      updatedAt:
        status === CaseStatus.CLOSED
          ? addDays(createdAt, flagship.durationDays)
          : createdAt,
      createdById: userId,
      updatedById: userId,
      priority: "HIGH",
      complexity: flagship.investigationCount > 1 ? "complex" : "medium",
      linkedRiuIds: [],
      isFlagship: true,
      flagshipData: flagship,
    });

    caseData.push({
      id: caseId,
      status,
      createdAt,
      categoryId,
      priority: "HIGH",
      isFlagship: true,
    });

    // Track flagship case metadata for activity and connected people seeding
    flagshipCaseData.push({
      caseId,
      name: flagship.name,
      category: flagship.category,
      status: flagship.status,
      createdAt,
      durationDays: flagship.durationDays,
      createdById: userId,
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
    if (chance(0.1) && riuIndex < riuQueue.length - 2) {
      const additionalRiuCount = randomInt(1, 2);
      for (
        let j = 0;
        j < additionalRiuCount && riuIndex < riuQueue.length;
        j++
      ) {
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
    const sourceChannel =
      RIU_TO_CASE_CHANNEL[primaryRiu.sourceChannel] ||
      SourceChannel.DIRECT_ENTRY;

    // Use category from RIU or random
    const categoryId =
      primaryRiu.categoryId ||
      Array.from(categoryMap.values())[randomInt(0, categoryMap.size - 1)]?.id;
    const categoryName = categoryId
      ? categoryIdToName.get(categoryId) || "Policy Violation"
      : "Policy Violation";

    // Inherit severity from RIU (can be adjusted)
    const severity = primaryRiu.severity;

    // Map reporter type from RIU
    const reporterType =
      primaryRiu.reporterType === "ANONYMOUS"
        ? ReporterType.ANONYMOUS
        : primaryRiu.reporterType === "CONFIDENTIAL"
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
        case "simple":
          durationDays = randomInt(2, 4);
          break;
        case "medium":
          durationDays = randomInt(7, 21);
          break;
        case "complex":
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

    // Get user IDs - assign demo users to open cases for My Tasks display
    let createdById: string = pickRandom(userIds); // Default to random user
    const isOpenCase = status === CaseStatus.NEW || status === CaseStatus.OPEN;

    if (isOpenCase) {
      // Find a demo user who needs more cases
      for (const email of DEMO_CASE_OWNERS) {
        const currentCount = demoOwnerCounts.get(email) || 0;
        if (currentCount < CASES_PER_DEMO_USER && demoUserIdMap.has(email)) {
          createdById = demoUserIdMap.get(email)!;
          demoOwnerCounts.set(email, currentCount + 1);
          break;
        }
      }
      // If loop doesn't assign, createdById remains the random user default
    }
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

    const hotspotManager = shouldUseHotspotManager(
      i,
      patterns.managerHotspots,
      categoryId,
    );
    if (hotspotManager) {
      markHotspotAssigned(patterns.managerHotspots, hotspotManager.managerId);
    }

    // Build tags
    const tags: string[] = [];
    if (repeatSubject) tags.push("repeat-subject");
    if (hotspotManager) tags.push("hotspot-team");
    if (priority === "CRITICAL") tags.push("critical");
    if (complexity === "complex") tags.push("complex");

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
      statusRationale:
        status === CaseStatus.CLOSED ? "Investigation complete" : null,
      sourceChannel,
      caseType,
      intakeTimestamp: createdAt,
      reporterType,
      reporterAnonymous: reporterType === ReporterType.ANONYMOUS,
      anonymousAccessCode:
        reporterType === ReporterType.ANONYMOUS
          ? primaryRiu.anonymousAccessCode
          : null,
      details,
      summary: details.length > 200 ? details.substring(0, 197) + "..." : null,
      severity,
      primaryCategoryId: categoryId,
      tags,
      aiSummary,
      aiSummaryGeneratedAt: addHours(createdAt, randomInt(1, 8)),
      aiModelVersion: "claude-3-opus",
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
        organizationId,
        associationType: j === 0 ? "PRIMARY" : "RELATED",
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
  console.log(
    `  Creating ${riuCaseAssociations.length} RIU-Case associations...`,
  );
  for (let i = 0; i < riuCaseAssociations.length; i += BATCH_SIZE) {
    const batch = riuCaseAssociations.slice(i, i + BATCH_SIZE);
    await prisma.riuCaseAssociation.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }

  console.log(`  Created ${caseIds.length} Cases`);
  console.log(`    - Flagship cases: ${patterns.flagshipCases.length}`);
  console.log(
    `    - Regular cases: ${caseIds.length - patterns.flagshipCases.length}`,
  );
  console.log(`    - RIU associations: ${riuCaseAssociations.length}`);

  // Log demo user case ownership for My Tasks verification
  const ccoCount = demoOwnerCounts.get("demo-cco@acme.local") || 0;
  const inv1Count = demoOwnerCounts.get("demo-investigator@acme.local") || 0;
  const inv2Count = demoOwnerCounts.get("demo-investigator2@acme.local") || 0;
  const triageCount = demoOwnerCounts.get("demo-triage@acme.local") || 0;
  console.log(
    `  Demo user case ownership: CCO=${ccoCount}, INV1=${inv1Count}, INV2=${inv2Count}, Triage=${triageCount}`,
  );

  // Populate search_vector for full-text search
  // createMany bypasses PostgreSQL triggers, so we need to update manually
  console.log("  Populating search vectors for seeded cases...");
  await prisma.$executeRaw`
    UPDATE cases
    SET search_vector =
      setweight(to_tsvector('english', COALESCE(reference_number, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(summary, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(details, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(ai_summary, '')), 'C')
    WHERE organization_id = ${organizationId}
      AND search_vector IS NULL;
  `;
  console.log("  Search vectors populated for cases");

  return { caseIds, caseData, flagshipCaseData };
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
    orderBy: { createdAt: "desc" },
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

// ============================================
// Flagship Case Enhancement Functions
// ============================================

/**
 * Connected people definitions for flagship cases
 * Each flagship case gets 2-4 associated persons with specific labels
 */
interface FlagshipConnectedPerson {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  businessUnitName?: string;
  label: PersonCaseLabel;
  notes?: string;
}

/**
 * Get connected people definitions for a flagship case based on its category and name
 */
function getFlagshipConnectedPeople(
  flagshipName: string,
  flagshipCategory: string,
): FlagshipConnectedPerson[] {
  // Define connected people for each flagship case
  const connectedPeopleByCase: Record<string, FlagshipConnectedPerson[]> = {
    "The Chicago Warehouse Incident": [
      {
        firstName: "Marcus",
        lastName: "Reynolds",
        email: "marcus.reynolds@acme.local",
        jobTitle: "Warehouse Supervisor",
        businessUnitName: "Operations - Chicago",
        label: PersonCaseLabel.SUBJECT,
        notes: "Accused of hostile work environment and intimidation tactics",
      },
      {
        firstName: "Jennifer",
        lastName: "Martinez",
        email: "jennifer.martinez@acme.local",
        jobTitle: "Warehouse Associate",
        businessUnitName: "Operations - Chicago",
        label: PersonCaseLabel.REPORTER,
        notes: "Primary reporter - clipboard incident witness",
      },
      {
        firstName: "Daniel",
        lastName: "Kim",
        email: "daniel.kim@acme.local",
        jobTitle: "Warehouse Lead",
        businessUnitName: "Operations - Chicago",
        label: PersonCaseLabel.WITNESS,
        notes: "Corroborating witness - provided incident log",
      },
      {
        firstName: "Robert",
        lastName: "Chen",
        email: "robert.chen@acme.local",
        jobTitle: "Warehouse Lead",
        businessUnitName: "Operations - Chicago",
        label: PersonCaseLabel.WITNESS,
        notes: "Corroborating witness",
      },
    ],
    "Q3 Financial Irregularities": [
      {
        firstName: "Patricia",
        lastName: "Hendricks",
        email: "patricia.hendricks@acme.local",
        jobTitle: "Regional Sales Director",
        businessUnitName: "Sales - Southeast",
        label: PersonCaseLabel.SUBJECT,
        notes:
          "Subject of expense fraud investigation - $127K in unverified claims",
      },
      {
        firstName: "Michelle",
        lastName: "Tran",
        email: "michelle.tran@acme.local",
        jobTitle: "Senior Auditor",
        businessUnitName: "Internal Audit",
        label: PersonCaseLabel.REPORTER,
        notes: "Identified anomalies during Q3 compliance review",
      },
      {
        firstName: "James",
        lastName: "Crawford",
        email: "james.crawford@acme.local",
        jobTitle: "Finance Manager",
        businessUnitName: "Finance",
        label: PersonCaseLabel.WITNESS,
        notes: "Reviewed expense approval chain",
      },
    ],
    "Executive Expense Report": [
      {
        firstName: "Jonathan",
        lastName: "Park",
        email: "jonathan.park@acme.local",
        jobTitle: "SVP Marketing",
        businessUnitName: "Marketing",
        label: PersonCaseLabel.SUBJECT,
        notes: "Subject of anonymous expense fraud allegations",
      },
      {
        firstName: "Anonymous",
        lastName: "Reporter",
        email: "",
        jobTitle: "Executive Admin",
        businessUnitName: "Executive Office",
        label: PersonCaseLabel.REPORTER,
        notes: "Anonymous - expressed retaliation concerns",
      },
    ],
    "Manufacturing Safety Incident": [
      {
        firstName: "Janet",
        lastName: "Williams",
        email: "janet.williams@acme.local",
        jobTitle: "Supervisor",
        businessUnitName: "Manufacturing - Denver",
        label: PersonCaseLabel.SUBJECT,
        notes: "Allegedly approved bypass of safety interlocks",
      },
      {
        firstName: "Kevin",
        lastName: "Martinez",
        email: "kevin.martinez@acme.local",
        jobTitle: "Machine Operator",
        businessUnitName: "Manufacturing - Denver",
        label: PersonCaseLabel.REPORTER,
        notes: "Injured employee - hand trauma from press incident",
      },
      {
        firstName: "Thomas",
        lastName: "Okonkwo",
        email: "thomas.okonkwo@acme.local",
        jobTitle: "EHS Manager",
        businessUnitName: "Environmental Health & Safety",
        label: PersonCaseLabel.WITNESS,
        notes: "Led initial investigation",
      },
    ],
    "Healthcare Data Breach": [
      {
        firstName: "Sarah",
        lastName: "Chen",
        email: "sarah.chen@hospital.local",
        jobTitle: "Internal Medicine Physician",
        businessUnitName: "Medical Staff",
        label: PersonCaseLabel.SUBJECT,
        notes: "Accessed 47 patient records without clinical relationship",
      },
      {
        firstName: "Amanda",
        lastName: "Foster",
        email: "amanda.foster@hospital.local",
        jobTitle: "Privacy Officer",
        businessUnitName: "Compliance",
        label: PersonCaseLabel.WITNESS,
        notes: "Led HIPAA breach investigation",
      },
      {
        firstName: "IT Security",
        lastName: "Team",
        email: "security@hospital.local",
        jobTitle: "IT Security",
        businessUnitName: "Information Technology",
        label: PersonCaseLabel.REPORTER,
        notes: "Identified unauthorized access pattern in EHR audit",
      },
    ],
    "Systematic Discrimination Pattern": [
      {
        firstName: "Robert",
        lastName: "Thompson",
        email: "robert.thompson@acme.local",
        jobTitle: "Director of Engineering",
        businessUnitName: "Technology",
        label: PersonCaseLabel.SUBJECT,
        notes:
          "Accused of systematic gender discrimination in promotions and ratings",
      },
      {
        firstName: "Lisa",
        lastName: "Nakamura",
        email: "lisa.nakamura@acme.local",
        jobTitle: "Staff Engineer",
        businessUnitName: "Technology",
        label: PersonCaseLabel.REPORTER,
        notes: "Lead reporter - retained external employment counsel",
      },
      {
        firstName: "David",
        lastName: "Park",
        email: "david.park.eng@acme.local",
        jobTitle: "Senior Engineer",
        businessUnitName: "Technology",
        label: PersonCaseLabel.WITNESS,
        notes: "Male colleague corroborating discriminatory comments",
      },
      {
        firstName: "James",
        lastName: "Martinez",
        email: "james.martinez.eng@acme.local",
        jobTitle: "Senior Engineer",
        businessUnitName: "Technology",
        label: PersonCaseLabel.WITNESS,
        notes: "Male colleague corroborating pattern",
      },
    ],
    "Vendor Kickback Scheme": [
      {
        firstName: "David",
        lastName: "Wilson",
        email: "david.wilson@acme.local",
        jobTitle: "Procurement Manager",
        businessUnitName: "Procurement",
        label: PersonCaseLabel.SUBJECT,
        notes: "Subject of kickback investigation - $89K unexplained deposits",
      },
      {
        firstName: "Michael",
        lastName: "Reeves",
        email: "michael.reeves@techserve.com",
        jobTitle: "CEO",
        businessUnitName: "TechServe Solutions (External)",
        label: PersonCaseLabel.SUBJECT,
        notes: "External party - undisclosed college roommate relationship",
      },
      {
        firstName: "Anonymous",
        lastName: "Tipster",
        email: "",
        jobTitle: "",
        businessUnitName: "",
        label: PersonCaseLabel.REPORTER,
        notes: "Anonymous hotline tip about vendor favoritism",
      },
    ],
    "Workplace Violence Threat": [
      {
        firstName: "James",
        lastName: "Mitchell",
        email: "james.mitchell@acme.local",
        jobTitle: "Warehouse Employee",
        businessUnitName: "Operations",
        label: PersonCaseLabel.SUBJECT,
        notes: "Made threatening statements - terminated",
      },
      {
        firstName: "Sarah",
        lastName: "Park",
        email: "sarah.park@acme.local",
        jobTitle: "Supervisor",
        businessUnitName: "Operations",
        label: PersonCaseLabel.REPORTER,
        notes: "Reported threats during team meeting",
      },
      {
        firstName: "Michael",
        lastName: "Santos",
        email: "michael.santos@acme.local",
        jobTitle: "Forklift Operator",
        businessUnitName: "Operations",
        label: PersonCaseLabel.WITNESS,
        notes: "Heard weapons comments prior to incident",
      },
      {
        firstName: "Frank",
        lastName: "Thompson",
        email: "frank.thompson@acme.local",
        jobTitle: "Security Director",
        businessUnitName: "Corporate Security",
        label: PersonCaseLabel.STAKEHOLDER,
        notes: "Coordinated security response",
      },
    ],
    "COI Disclosure - Board Member": [
      {
        firstName: "Eleanor",
        lastName: "Vance",
        email: "eleanor.vance@acme.local",
        jobTitle: "Board Member",
        businessUnitName: "Board of Directors",
        label: PersonCaseLabel.REPORTER,
        notes: "Self-disclosure regarding spouse's appointment at HealthFirst",
      },
      {
        firstName: "William",
        lastName: "Vance",
        email: "william.vance@healthfirst.com",
        jobTitle: "Chief Medical Officer",
        businessUnitName: "HealthFirst Systems (External)",
        label: PersonCaseLabel.STAKEHOLDER,
        notes: "Spouse of board member - creates conflict touchpoints",
      },
      {
        firstName: "Jennifer",
        lastName: "Roberts",
        email: "jennifer.roberts@acme.local",
        jobTitle: "General Counsel",
        businessUnitName: "Legal",
        label: PersonCaseLabel.LEGAL_COUNSEL,
        notes: "Provided recusal framework opinion",
      },
    ],
    "Retaliation After Safety Report": [
      {
        firstName: "Michael",
        lastName: "Torres",
        email: "michael.torres@acme.local",
        jobTitle: "Manufacturing Employee",
        businessUnitName: "Manufacturing - Denver",
        label: PersonCaseLabel.REPORTER,
        notes: "Alleges retaliation for Bay 4 safety investigation testimony",
      },
      {
        firstName: "Janet",
        lastName: "Williams",
        email: "janet.williams2@acme.local",
        jobTitle: "Supervisor",
        businessUnitName: "Manufacturing - Denver",
        label: PersonCaseLabel.SUBJECT,
        notes: "Subject - allegedly made retaliatory statement",
      },
    ],
  };

  return (
    connectedPeopleByCase[flagshipName] || [
      {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@acme.local",
        jobTitle: "Employee",
        label: PersonCaseLabel.REPORTER,
        notes: "Reporter",
      },
      {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@acme.local",
        jobTitle: "Manager",
        label: PersonCaseLabel.SUBJECT,
        notes: "Subject of investigation",
      },
    ]
  );
}

/**
 * Activity templates for flagship cases
 */
interface FlagshipActivity {
  action: string;
  actionCategory: AuditActionCategory;
  actionDescription: string;
  actorType: ActorType;
  actorName: string;
  dayOffset: number; // days after case creation
}

/**
 * Generate activity entries for a flagship case
 */
function generateFlagshipActivities(
  flagshipName: string,
  flagshipStatus: string,
  durationDays: number,
): FlagshipActivity[] {
  const baseActivities: FlagshipActivity[] = [
    {
      action: "created",
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: "Case created from intake",
      actorType: ActorType.SYSTEM,
      actorName: "System",
      dayOffset: 0,
    },
    {
      action: "ai_enrichment",
      actionCategory: AuditActionCategory.AI,
      actionDescription: "AI generated case summary and risk assessment",
      actorType: ActorType.AI,
      actorName: "Claude AI",
      dayOffset: 0,
    },
    {
      action: "assigned",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: "Case assigned to compliance team for triage",
      actorType: ActorType.USER,
      actorName: "Sarah Chen",
      dayOffset: 1,
    },
    {
      action: "status_changed",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: "Status changed from NEW to OPEN",
      actorType: ActorType.USER,
      actorName: "Sarah Chen",
      dayOffset: 1,
    },
    {
      action: "note_added",
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: "Added initial assessment notes",
      actorType: ActorType.USER,
      actorName: "Michael Johnson",
      dayOffset: 2,
    },
    {
      action: "priority_changed",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: "Priority escalated based on severity assessment",
      actorType: ActorType.USER,
      actorName: "Sarah Chen",
      dayOffset: 3,
    },
  ];

  // Add more activities for longer/closed cases
  if (durationDays > 10) {
    baseActivities.push(
      {
        action: "note_added",
        actionCategory: AuditActionCategory.CREATE,
        actionDescription: "Interview scheduled with primary witness",
        actorType: ActorType.USER,
        actorName: "Michael Johnson",
        dayOffset: 5,
      },
      {
        action: "note_added",
        actionCategory: AuditActionCategory.CREATE,
        actionDescription: "Document review completed - findings documented",
        actorType: ActorType.USER,
        actorName: "Sarah Chen",
        dayOffset: 8,
      },
    );
  }

  if (flagshipStatus === "CLOSED" && durationDays > 20) {
    baseActivities.push(
      {
        action: "note_added",
        actionCategory: AuditActionCategory.CREATE,
        actionDescription: "Final investigation report drafted",
        actorType: ActorType.USER,
        actorName: "Michael Johnson",
        dayOffset: Math.floor(durationDays * 0.7),
      },
      {
        action: "cco_escalated",
        actionCategory: AuditActionCategory.UPDATE,
        actionDescription: "Case escalated to CCO for executive review",
        actorType: ActorType.USER,
        actorName: "Sarah Chen",
        dayOffset: Math.floor(durationDays * 0.8),
      },
      {
        action: "status_changed",
        actionCategory: AuditActionCategory.UPDATE,
        actionDescription:
          "Case closed - investigation complete with findings documented",
        actorType: ActorType.USER,
        actorName: "Sarah Chen",
        dayOffset: durationDays,
      },
    );
  }

  return baseActivities;
}

/**
 * Seed activities for flagship cases
 */
export async function seedFlagshipActivities(
  prisma: PrismaClient,
  organizationId: string,
  flagshipCaseData: Array<{
    caseId: string;
    name: string;
    status: string;
    createdAt: Date;
    durationDays: number;
    createdById: string;
  }>,
): Promise<number> {
  console.log("  Seeding activities for flagship cases...");

  const activityBatch: Array<{
    id: string;
    organizationId: string;
    entityType: AuditEntityType;
    entityId: string;
    action: string;
    actionCategory: AuditActionCategory;
    actionDescription: string;
    actorUserId: string | null;
    actorType: ActorType;
    actorName: string | null;
    changes: object | null;
    context: object | null;
    ipAddress: string | null;
    userAgent: string | null;
    requestId: string | null;
    createdAt: Date;
  }> = [];

  for (const flagshipCase of flagshipCaseData) {
    const activities = generateFlagshipActivities(
      flagshipCase.name,
      flagshipCase.status,
      flagshipCase.durationDays,
    );

    for (const activity of activities) {
      const activityDate = addDays(flagshipCase.createdAt, activity.dayOffset);
      activityBatch.push({
        id: faker.string.uuid(),
        organizationId,
        entityType: AuditEntityType.CASE,
        entityId: flagshipCase.caseId,
        action: activity.action,
        actionCategory: activity.actionCategory,
        actionDescription: activity.actionDescription,
        actorUserId:
          activity.actorType === ActorType.USER
            ? flagshipCase.createdById
            : null,
        actorType: activity.actorType,
        actorName: activity.actorName,
        changes: null,
        context: { flagshipCase: true, caseName: flagshipCase.name },
        ipAddress: activity.actorType === ActorType.USER ? "10.0.1.100" : null,
        userAgent:
          activity.actorType === ActorType.USER
            ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            : null,
        requestId: faker.string.uuid(),
        createdAt: activityDate,
      });
    }
  }

  // Insert activities
  if (activityBatch.length > 0) {
    await prisma.auditLog.createMany({
      data: activityBatch.map((a) => ({
        ...a,
        changes: a.changes ?? undefined,
        context: a.context ?? undefined,
      })),
      skipDuplicates: true,
    });
  }

  console.log(
    `    Created ${activityBatch.length} activities for ${flagshipCaseData.length} flagship cases`,
  );
  return activityBatch.length;
}

/**
 * Seed connected people for flagship cases
 */
export async function seedFlagshipConnectedPeople(
  prisma: PrismaClient,
  organizationId: string,
  flagshipCaseData: Array<{
    caseId: string;
    name: string;
    category: string;
    createdById: string;
  }>,
): Promise<number> {
  console.log("  Seeding connected people for flagship cases...");

  let totalAssociations = 0;

  for (const flagshipCase of flagshipCaseData) {
    const connectedPeople = getFlagshipConnectedPeople(
      flagshipCase.name,
      flagshipCase.category,
    );

    for (const person of connectedPeople) {
      // Create or find the Person record
      let personRecord = await prisma.person.findFirst({
        where: {
          organizationId,
          email: person.email || undefined,
          firstName: person.firstName,
          lastName: person.lastName,
        },
      });

      if (!personRecord) {
        personRecord = await prisma.person.create({
          data: {
            id: faker.string.uuid(),
            organizationId,
            type:
              person.email?.includes("@acme.local") ||
              person.email?.includes("@hospital.local")
                ? PersonType.EMPLOYEE
                : person.email
                  ? PersonType.EXTERNAL_CONTACT
                  : PersonType.ANONYMOUS_PLACEHOLDER,
            source: PersonSource.INTAKE_CREATED,
            firstName: person.firstName,
            lastName: person.lastName,
            email: person.email || null,
            jobTitle: person.jobTitle || null,
            businessUnitName: person.businessUnitName || null,
            notes: person.notes || null,
            createdById: flagshipCase.createdById,
            updatedById: flagshipCase.createdById,
          },
        });
      }

      // Create PersonCaseAssociation
      await prisma.personCaseAssociation
        .create({
          data: {
            id: faker.string.uuid(),
            organizationId,
            personId: personRecord.id,
            caseId: flagshipCase.caseId,
            label: person.label,
            notes: person.notes || null,
            createdById: flagshipCase.createdById,
          },
        })
        .catch(() => {
          // Skip duplicates silently
        });

      totalAssociations++;
    }
  }

  console.log(
    `    Created ${totalAssociations} person-case associations for flagship cases`,
  );
  return totalAssociations;
}
