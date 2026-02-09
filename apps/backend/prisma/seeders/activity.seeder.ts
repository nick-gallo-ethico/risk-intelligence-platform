/**
 * Activity Seeder (AuditLog Timeline Entries)
 *
 * Creates ~15,000 AuditLog entries to populate activity timelines for cases
 * and investigations. Makes demo data "lived-in" with realistic activity history.
 *
 * Features:
 * - Activities distributed realistically across case lifecycles
 * - Mix of USER, SYSTEM, and AI actor types
 * - Natural language actionDescription for timeline readability
 * - Proper changes JSON for status/assignment changes
 * - Timestamps between entity createdAt and closedAt
 *
 * Activity Distribution:
 * - Case Created: ~4,500 (one per case)
 * - Case Assigned: ~4,000
 * - Status Changed: ~8,000
 * - Priority Changed: ~500
 * - Note Added: ~2,500
 * - CCO Escalated: ~200
 * - SLA Warning: ~300
 * - Investigation Started: ~4,500 (one per investigation)
 * - Investigation Closed: ~4,000
 */

import {
  PrismaClient,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
  CaseStatus,
  InvestigationStatus,
  InvestigationOutcome,
} from '@prisma/client';
import { faker } from '@faker-js/faker';
import { addDays, addHours, addMinutes } from 'date-fns';
import { SEED_CONFIG } from './config';
import {
  weightedRandom,
  chance,
  randomInt,
  pickRandom,
  DEMO_CURRENT_DATE,
} from './utils';

// Seed offset for activity (masterSeed + 5000)
const SEED_OFFSET = 5000;

// Batch size for database inserts
const BATCH_SIZE = 100;

// ============================================
// Type Definitions
// ============================================

interface CaseInfo {
  id: string;
  referenceNumber: string;
  status: CaseStatus;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  primaryCategoryId: string | null;
  assignedToId: string | null;
}

interface InvestigationInfo {
  id: string;
  caseId: string;
  status: InvestigationStatus;
  outcome: InvestigationOutcome | null;
  createdAt: Date;
  closedAt: Date | null;
  primaryInvestigatorId: string | null;
}

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface AuditLogRecord {
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
  changes: Record<string, unknown> | null;
  context: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: Date;
}

// ============================================
// Natural Language Templates
// ============================================

const STATUS_CHANGE_TEMPLATES = {
  [CaseStatus.NEW]: [
    'Case created and awaiting triage',
    'New case received via intake',
    'Case entered into system',
  ],
  [CaseStatus.OPEN]: [
    '{actor} opened case for investigation',
    '{actor} moved case to active status',
    'Case assigned and investigation initiated by {actor}',
  ],
  [CaseStatus.CLOSED]: [
    '{actor} closed case with findings documented',
    'Investigation complete, case closed by {actor}',
    '{actor} marked case as resolved',
    'Case closure approved by {actor}',
  ],
};

const INVESTIGATION_STATUS_TEMPLATES = {
  [InvestigationStatus.NEW]: [
    'Investigation created for case review',
    'New investigation opened',
  ],
  [InvestigationStatus.ASSIGNED]: [
    '{actor} assigned investigation to {assignee}',
    'Investigation assigned to {assignee} by {actor}',
  ],
  [InvestigationStatus.INVESTIGATING]: [
    '{actor} began active investigation',
    'Investigation moved to active status by {actor}',
    '{actor} started evidence collection phase',
  ],
  [InvestigationStatus.PENDING_REVIEW]: [
    '{actor} submitted investigation for review',
    'Investigation findings pending management review',
    '{actor} completed investigation, awaiting approval',
  ],
  [InvestigationStatus.ON_HOLD]: [
    '{actor} placed investigation on hold',
    'Investigation paused pending additional information',
    '{actor} temporarily suspended investigation',
  ],
  [InvestigationStatus.CLOSED]: [
    '{actor} closed investigation with outcome: {outcome}',
    'Investigation concluded by {actor} - {outcome}',
    '{actor} finalized investigation findings',
  ],
};

const ASSIGNMENT_TEMPLATES = [
  '{actor} assigned case to {assignee} for investigation',
  '{actor} transferred case ownership to {assignee}',
  'Case reassigned from {previousAssignee} to {assignee} by {actor}',
  '{actor} delegated case handling to {assignee}',
];

const PRIORITY_CHANGE_TEMPLATES = [
  '{actor} escalated priority from {oldPriority} to {newPriority} due to {reason}',
  'Priority changed to {newPriority} by {actor}',
  '{actor} updated case priority: {oldPriority} to {newPriority}',
];

const PRIORITY_REASONS = [
  'regulatory concern',
  'executive involvement',
  'media exposure risk',
  'pattern detection',
  'SLA compliance',
  'witness availability',
  'retaliation risk',
  'legal guidance',
];

const NOTE_TEMPLATES = [
  '{actor} added investigation note',
  'Case note recorded by {actor}',
  '{actor} documented interview findings',
  '{actor} added update to case timeline',
  'Evidence review notes added by {actor}',
  '{actor} recorded witness statement summary',
];

const CCO_ESCALATION_TEMPLATES = [
  '{actor} escalated case to CCO for executive review',
  'Case flagged for CCO attention by {actor}',
  '{actor} requested CCO involvement due to severity',
  'Executive escalation initiated by {actor}',
];

const SLA_WARNING_TEMPLATES = [
  '[SYSTEM] SLA warning: Case approaching {days}-day deadline',
  '[SYSTEM] Automated alert: SLA compliance at risk',
  '[SYSTEM] Case deadline warning - {days} days remaining',
  '[SYSTEM] SLA threshold approaching for case resolution',
];

const AI_SUMMARY_TEMPLATES = [
  '[AI] Generated case summary from intake details',
  '[AI] Risk assessment completed with confidence score {score}%',
  '[AI] Category suggestion: {category} (confidence: {score}%)',
  '[AI] Similar case patterns identified',
];

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a random IP address for audit logs
 */
function generateIpAddress(): string {
  // Corporate IP range simulation
  const prefixes = ['10.0', '172.16', '192.168'];
  const prefix = pickRandom(prefixes);
  return `${prefix}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
}

/**
 * Generate a user agent string
 */
function generateUserAgent(): string {
  const browsers = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  ];
  return pickRandom(browsers);
}

/**
 * Format template with actor/assignee names
 */
function formatTemplate(
  template: string,
  replacements: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

/**
 * Get user full name
 */
function getUserName(user: UserInfo): string {
  return `${user.firstName} ${user.lastName}`;
}

/**
 * Generate a date between two dates
 */
function randomDateBetween(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

/**
 * Generate a sequence of dates for activity progression
 */
function generateActivityDates(
  caseCreatedAt: Date,
  caseClosedAt: Date | null,
  count: number,
): Date[] {
  const endDate = caseClosedAt || DEMO_CURRENT_DATE;
  const dates: Date[] = [];

  for (let i = 0; i < count; i++) {
    // Distribute dates across the case lifetime with some clustering
    const baseDate = randomDateBetween(caseCreatedAt, endDate);
    // Add some randomness to hours/minutes
    const adjustedDate = addMinutes(baseDate, randomInt(-60, 60));
    dates.push(adjustedDate);
  }

  // Sort chronologically
  return dates.sort((a, b) => a.getTime() - b.getTime());
}

// ============================================
// Activity Generators
// ============================================

/**
 * Generate "Case Created" activity
 */
function generateCaseCreatedActivity(
  caseInfo: CaseInfo,
  organizationId: string,
  users: UserInfo[],
): AuditLogRecord {
  const creator = pickRandom(users);

  return {
    id: faker.string.uuid(),
    organizationId,
    entityType: AuditEntityType.CASE,
    entityId: caseInfo.id,
    action: 'created',
    actionCategory: AuditActionCategory.CREATE,
    actionDescription: `Case ${caseInfo.referenceNumber} created from intake`,
    actorUserId: creator.id,
    actorType: ActorType.USER,
    actorName: getUserName(creator),
    changes: null,
    context: { referenceNumber: caseInfo.referenceNumber },
    ipAddress: generateIpAddress(),
    userAgent: generateUserAgent(),
    requestId: faker.string.uuid(),
    createdAt: caseInfo.createdAt,
  };
}

/**
 * Generate "Case Assigned" activity
 */
function generateCaseAssignedActivity(
  caseInfo: CaseInfo,
  organizationId: string,
  users: UserInfo[],
  activityDate: Date,
  previousAssignee?: UserInfo,
): AuditLogRecord {
  const actor = pickRandom(users.filter(u =>
    u.role === 'TRIAGE_LEAD' || u.role === 'COMPLIANCE_OFFICER' || u.role === 'SYSTEM_ADMIN'
  ));
  const assignee = pickRandom(users.filter(u =>
    u.role === 'INVESTIGATOR' || u.role === 'COMPLIANCE_OFFICER'
  ));

  const template = pickRandom(ASSIGNMENT_TEMPLATES);
  const replacements: Record<string, string> = {
    actor: getUserName(actor),
    assignee: getUserName(assignee),
    previousAssignee: previousAssignee ? getUserName(previousAssignee) : 'Unassigned',
  };

  return {
    id: faker.string.uuid(),
    organizationId,
    entityType: AuditEntityType.CASE,
    entityId: caseInfo.id,
    action: 'assigned',
    actionCategory: AuditActionCategory.UPDATE,
    actionDescription: formatTemplate(template, replacements),
    actorUserId: actor.id,
    actorType: ActorType.USER,
    actorName: getUserName(actor),
    changes: {
      assignedToId: {
        old: previousAssignee?.id || null,
        new: assignee.id,
      },
    },
    context: { assigneeName: getUserName(assignee) },
    ipAddress: generateIpAddress(),
    userAgent: generateUserAgent(),
    requestId: faker.string.uuid(),
    createdAt: activityDate,
  };
}

/**
 * Generate "Status Changed" activity
 */
function generateStatusChangedActivity(
  caseInfo: CaseInfo,
  organizationId: string,
  users: UserInfo[],
  activityDate: Date,
  oldStatus: CaseStatus,
  newStatus: CaseStatus,
): AuditLogRecord {
  const actor = pickRandom(users);
  const templates = STATUS_CHANGE_TEMPLATES[newStatus] || STATUS_CHANGE_TEMPLATES[CaseStatus.OPEN];
  const template = pickRandom(templates);

  return {
    id: faker.string.uuid(),
    organizationId,
    entityType: AuditEntityType.CASE,
    entityId: caseInfo.id,
    action: 'status_changed',
    actionCategory: AuditActionCategory.UPDATE,
    actionDescription: formatTemplate(template, { actor: getUserName(actor) }),
    actorUserId: actor.id,
    actorType: ActorType.USER,
    actorName: getUserName(actor),
    changes: {
      status: {
        old: oldStatus,
        new: newStatus,
      },
    },
    context: null,
    ipAddress: generateIpAddress(),
    userAgent: generateUserAgent(),
    requestId: faker.string.uuid(),
    createdAt: activityDate,
  };
}

/**
 * Generate "Priority Changed" activity
 */
function generatePriorityChangedActivity(
  caseInfo: CaseInfo,
  organizationId: string,
  users: UserInfo[],
  activityDate: Date,
): AuditLogRecord {
  const actor = pickRandom(users.filter(u =>
    u.role !== 'EMPLOYEE' && u.role !== 'MANAGER'
  ));

  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const oldIndex = randomInt(0, 2);
  const newIndex = oldIndex + randomInt(1, 2);
  const oldPriority = priorities[oldIndex];
  const newPriority = priorities[Math.min(newIndex, 3)];

  const template = pickRandom(PRIORITY_CHANGE_TEMPLATES);
  const reason = pickRandom(PRIORITY_REASONS);

  return {
    id: faker.string.uuid(),
    organizationId,
    entityType: AuditEntityType.CASE,
    entityId: caseInfo.id,
    action: 'priority_changed',
    actionCategory: AuditActionCategory.UPDATE,
    actionDescription: formatTemplate(template, {
      actor: getUserName(actor),
      oldPriority,
      newPriority,
      reason,
    }),
    actorUserId: actor.id,
    actorType: ActorType.USER,
    actorName: getUserName(actor),
    changes: {
      priority: {
        old: oldPriority,
        new: newPriority,
      },
    },
    context: { reason },
    ipAddress: generateIpAddress(),
    userAgent: generateUserAgent(),
    requestId: faker.string.uuid(),
    createdAt: activityDate,
  };
}

/**
 * Generate "Note Added" activity
 */
function generateNoteAddedActivity(
  caseInfo: CaseInfo,
  organizationId: string,
  users: UserInfo[],
  activityDate: Date,
): AuditLogRecord {
  const actor = pickRandom(users.filter(u => u.role !== 'EMPLOYEE'));
  const template = pickRandom(NOTE_TEMPLATES);

  return {
    id: faker.string.uuid(),
    organizationId,
    entityType: AuditEntityType.CASE,
    entityId: caseInfo.id,
    action: 'note_added',
    actionCategory: AuditActionCategory.CREATE,
    actionDescription: formatTemplate(template, { actor: getUserName(actor) }),
    actorUserId: actor.id,
    actorType: ActorType.USER,
    actorName: getUserName(actor),
    changes: null,
    context: { noteType: 'investigation_note' },
    ipAddress: generateIpAddress(),
    userAgent: generateUserAgent(),
    requestId: faker.string.uuid(),
    createdAt: activityDate,
  };
}

/**
 * Generate "CCO Escalated" activity
 */
function generateCcoEscalatedActivity(
  caseInfo: CaseInfo,
  organizationId: string,
  users: UserInfo[],
  activityDate: Date,
): AuditLogRecord {
  const actor = pickRandom(users.filter(u =>
    u.role === 'INVESTIGATOR' || u.role === 'TRIAGE_LEAD' || u.role === 'COMPLIANCE_OFFICER'
  ));
  const cco = users.find(u => u.role === 'COMPLIANCE_OFFICER') || pickRandom(users);
  const template = pickRandom(CCO_ESCALATION_TEMPLATES);

  return {
    id: faker.string.uuid(),
    organizationId,
    entityType: AuditEntityType.CASE,
    entityId: caseInfo.id,
    action: 'cco_escalated',
    actionCategory: AuditActionCategory.UPDATE,
    actionDescription: formatTemplate(template, { actor: getUserName(actor) }),
    actorUserId: actor.id,
    actorType: ActorType.USER,
    actorName: getUserName(actor),
    changes: {
      escalatedToCco: {
        old: false,
        new: true,
      },
      ccoUserId: {
        old: null,
        new: cco.id,
      },
    },
    context: { ccoName: getUserName(cco), reason: 'Executive attention required' },
    ipAddress: generateIpAddress(),
    userAgent: generateUserAgent(),
    requestId: faker.string.uuid(),
    createdAt: activityDate,
  };
}

/**
 * Generate "SLA Warning" system activity
 */
function generateSlaWarningActivity(
  caseInfo: CaseInfo,
  organizationId: string,
  activityDate: Date,
): AuditLogRecord {
  const daysRemaining = randomInt(3, 7);
  const template = pickRandom(SLA_WARNING_TEMPLATES);

  return {
    id: faker.string.uuid(),
    organizationId,
    entityType: AuditEntityType.CASE,
    entityId: caseInfo.id,
    action: 'sla_warning',
    actionCategory: AuditActionCategory.SYSTEM,
    actionDescription: formatTemplate(template, { days: daysRemaining.toString() }),
    actorUserId: null,
    actorType: ActorType.SYSTEM,
    actorName: 'System',
    changes: null,
    context: { daysRemaining, slaType: 'case_resolution' },
    ipAddress: null,
    userAgent: null,
    requestId: faker.string.uuid(),
    createdAt: activityDate,
  };
}

/**
 * Generate "Investigation Started" activity
 */
function generateInvestigationStartedActivity(
  investigationInfo: InvestigationInfo,
  caseInfo: CaseInfo,
  organizationId: string,
  users: UserInfo[],
): AuditLogRecord {
  const actor = pickRandom(users.filter(u =>
    u.role === 'INVESTIGATOR' || u.role === 'TRIAGE_LEAD' || u.role === 'COMPLIANCE_OFFICER'
  ));

  return {
    id: faker.string.uuid(),
    organizationId,
    entityType: AuditEntityType.INVESTIGATION,
    entityId: investigationInfo.id,
    action: 'created',
    actionCategory: AuditActionCategory.CREATE,
    actionDescription: `Investigation opened for case ${caseInfo.referenceNumber} by ${getUserName(actor)}`,
    actorUserId: actor.id,
    actorType: ActorType.USER,
    actorName: getUserName(actor),
    changes: null,
    context: { caseId: caseInfo.id, referenceNumber: caseInfo.referenceNumber },
    ipAddress: generateIpAddress(),
    userAgent: generateUserAgent(),
    requestId: faker.string.uuid(),
    createdAt: investigationInfo.createdAt,
  };
}

/**
 * Generate "Investigation Closed" activity
 */
function generateInvestigationClosedActivity(
  investigationInfo: InvestigationInfo,
  caseInfo: CaseInfo,
  organizationId: string,
  users: UserInfo[],
): AuditLogRecord {
  const actor = users.find(u => u.id === investigationInfo.primaryInvestigatorId)
    || pickRandom(users.filter(u => u.role === 'INVESTIGATOR' || u.role === 'COMPLIANCE_OFFICER'));

  const outcomeText = investigationInfo.outcome
    ? investigationInfo.outcome.toLowerCase().replace('_', ' ')
    : 'completed';

  const templates = INVESTIGATION_STATUS_TEMPLATES[InvestigationStatus.CLOSED];
  const template = pickRandom(templates);

  return {
    id: faker.string.uuid(),
    organizationId,
    entityType: AuditEntityType.INVESTIGATION,
    entityId: investigationInfo.id,
    action: 'closed',
    actionCategory: AuditActionCategory.UPDATE,
    actionDescription: formatTemplate(template, {
      actor: getUserName(actor),
      outcome: outcomeText,
    }),
    actorUserId: actor.id,
    actorType: ActorType.USER,
    actorName: getUserName(actor),
    changes: {
      status: {
        old: InvestigationStatus.PENDING_REVIEW,
        new: InvestigationStatus.CLOSED,
      },
      outcome: {
        old: null,
        new: investigationInfo.outcome,
      },
    },
    context: { outcome: investigationInfo.outcome },
    ipAddress: generateIpAddress(),
    userAgent: generateUserAgent(),
    requestId: faker.string.uuid(),
    createdAt: investigationInfo.closedAt || DEMO_CURRENT_DATE,
  };
}

/**
 * Generate AI activity (summary generation, risk scoring)
 */
function generateAiActivity(
  caseInfo: CaseInfo,
  organizationId: string,
  activityDate: Date,
): AuditLogRecord {
  const template = pickRandom(AI_SUMMARY_TEMPLATES);
  const score = randomInt(60, 95);

  return {
    id: faker.string.uuid(),
    organizationId,
    entityType: AuditEntityType.CASE,
    entityId: caseInfo.id,
    action: 'ai_enrichment',
    actionCategory: AuditActionCategory.AI,
    actionDescription: formatTemplate(template, {
      score: score.toString(),
      category: 'Policy Violation',
    }),
    actorUserId: null,
    actorType: ActorType.AI,
    actorName: 'Claude AI',
    changes: null,
    context: { modelVersion: 'claude-3-opus', confidenceScore: score },
    ipAddress: null,
    userAgent: null,
    requestId: faker.string.uuid(),
    createdAt: activityDate,
  };
}

// ============================================
// Main Seeder Function
// ============================================

export interface SeedActivityResult {
  totalActivities: number;
  caseCreated: number;
  caseAssigned: number;
  statusChanged: number;
  priorityChanged: number;
  noteAdded: number;
  ccoEscalated: number;
  slaWarning: number;
  investigationStarted: number;
  investigationClosed: number;
  aiEnrichment: number;
}

/**
 * Seed activity timeline entries (AuditLog) for a demo tenant
 *
 * @param prisma - Prisma client instance
 * @param organizationId - Organization ID
 * @returns Statistics about generated activities
 */
export async function seedActivityTimelines(
  prisma: PrismaClient,
  organizationId: string,
): Promise<SeedActivityResult> {
  // Initialize faker with deterministic seed
  faker.seed(SEED_CONFIG.masterSeed + SEED_OFFSET);

  console.log('  Loading cases, investigations, and users...');

  // Fetch cases with necessary data
  const cases = await prisma.case.findMany({
    where: { organizationId },
    select: {
      id: true,
      referenceNumber: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      primaryCategoryId: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Fetch investigations
  const investigations = await prisma.investigation.findMany({
    where: { organizationId },
    select: {
      id: true,
      caseId: true,
      status: true,
      outcome: true,
      createdAt: true,
      closedAt: true,
      primaryInvestigatorId: true,
    },
  });

  // Fetch users
  const users = await prisma.user.findMany({
    where: { organizationId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  });

  if (cases.length === 0 || users.length === 0) {
    console.log('  No cases or users found. Skipping activity seeding.');
    return {
      totalActivities: 0,
      caseCreated: 0,
      caseAssigned: 0,
      statusChanged: 0,
      priorityChanged: 0,
      noteAdded: 0,
      ccoEscalated: 0,
      slaWarning: 0,
      investigationStarted: 0,
      investigationClosed: 0,
      aiEnrichment: 0,
    };
  }

  // Build case lookup map
  const caseMap = new Map<string, CaseInfo>();
  for (const c of cases) {
    const closedAt = c.status === CaseStatus.CLOSED ? c.updatedAt : null;
    caseMap.set(c.id, {
      id: c.id,
      referenceNumber: c.referenceNumber,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      closedAt,
      primaryCategoryId: c.primaryCategoryId,
      assignedToId: null,
    });
  }

  // Build investigation lookup map by caseId
  const investigationsByCaseId = new Map<string, InvestigationInfo[]>();
  for (const inv of investigations) {
    const existing = investigationsByCaseId.get(inv.caseId) || [];
    existing.push(inv);
    investigationsByCaseId.set(inv.caseId, existing);
  }

  // Prepare batches
  const activityBatch: AuditLogRecord[] = [];
  const stats: SeedActivityResult = {
    totalActivities: 0,
    caseCreated: 0,
    caseAssigned: 0,
    statusChanged: 0,
    priorityChanged: 0,
    noteAdded: 0,
    ccoEscalated: 0,
    slaWarning: 0,
    investigationStarted: 0,
    investigationClosed: 0,
    aiEnrichment: 0,
  };

  console.log(`  Generating activities for ${cases.length} cases and ${investigations.length} investigations...`);

  // Process each case
  for (let caseIndex = 0; caseIndex < cases.length; caseIndex++) {
    // Progress logging
    if (caseIndex > 0 && caseIndex % 500 === 0) {
      console.log(`    Progress: ${caseIndex}/${cases.length} cases processed...`);
    }

    const caseInfo = caseMap.get(cases[caseIndex].id)!;
    const caseInvestigations = investigationsByCaseId.get(caseInfo.id) || [];

    // 1. Case Created - one per case
    activityBatch.push(generateCaseCreatedActivity(caseInfo, organizationId, users));
    stats.caseCreated++;

    // 2. AI Enrichment - shortly after creation (~80% of cases)
    if (chance(0.8)) {
      const aiDate = addHours(caseInfo.createdAt, randomInt(1, 4));
      activityBatch.push(generateAiActivity(caseInfo, organizationId, aiDate));
      stats.aiEnrichment++;
    }

    // 3. Case Assigned - ~90% of cases
    if (chance(0.9) && caseInfo.status !== CaseStatus.NEW) {
      const assignDate = addHours(caseInfo.createdAt, randomInt(2, 24));
      activityBatch.push(generateCaseAssignedActivity(caseInfo, organizationId, users, assignDate));
      stats.caseAssigned++;
    }

    // 4. Status Changes - based on case status
    if (caseInfo.status === CaseStatus.OPEN || caseInfo.status === CaseStatus.CLOSED) {
      // NEW -> OPEN transition
      const openDate = addHours(caseInfo.createdAt, randomInt(4, 48));
      activityBatch.push(generateStatusChangedActivity(
        caseInfo, organizationId, users, openDate, CaseStatus.NEW, CaseStatus.OPEN
      ));
      stats.statusChanged++;

      // OPEN -> CLOSED transition for closed cases
      if (caseInfo.status === CaseStatus.CLOSED && caseInfo.closedAt) {
        activityBatch.push(generateStatusChangedActivity(
          caseInfo, organizationId, users, caseInfo.closedAt, CaseStatus.OPEN, CaseStatus.CLOSED
        ));
        stats.statusChanged++;
      }
    }

    // 5. Priority Changes - ~10% of cases
    if (chance(0.1)) {
      const priorityDate = randomDateBetween(
        addDays(caseInfo.createdAt, 1),
        caseInfo.closedAt || DEMO_CURRENT_DATE
      );
      activityBatch.push(generatePriorityChangedActivity(caseInfo, organizationId, users, priorityDate));
      stats.priorityChanged++;
    }

    // 6. Notes Added - ~50% of cases get 1-3 notes
    if (chance(0.5)) {
      const noteCount = randomInt(1, 3);
      const noteDates = generateActivityDates(
        addDays(caseInfo.createdAt, 1),
        caseInfo.closedAt,
        noteCount
      );
      for (const noteDate of noteDates) {
        activityBatch.push(generateNoteAddedActivity(caseInfo, organizationId, users, noteDate));
        stats.noteAdded++;
      }
    }

    // 7. CCO Escalation - ~4% of cases
    if (chance(0.04)) {
      const escalationDate = randomDateBetween(
        addDays(caseInfo.createdAt, 2),
        caseInfo.closedAt || DEMO_CURRENT_DATE
      );
      activityBatch.push(generateCcoEscalatedActivity(caseInfo, organizationId, users, escalationDate));
      stats.ccoEscalated++;
    }

    // 8. SLA Warnings - ~6% of cases
    if (chance(0.06)) {
      const warningDate = randomDateBetween(
        addDays(caseInfo.createdAt, 20),
        caseInfo.closedAt || DEMO_CURRENT_DATE
      );
      activityBatch.push(generateSlaWarningActivity(caseInfo, organizationId, warningDate));
      stats.slaWarning++;
    }

    // 9. Investigation activities
    for (const inv of caseInvestigations) {
      // Investigation Started
      activityBatch.push(generateInvestigationStartedActivity(inv, caseInfo, organizationId, users));
      stats.investigationStarted++;

      // Investigation Closed
      if (inv.status === InvestigationStatus.CLOSED && inv.closedAt) {
        activityBatch.push(generateInvestigationClosedActivity(inv, caseInfo, organizationId, users));
        stats.investigationClosed++;
      }
    }

    // Flush batch if needed
    if (activityBatch.length >= BATCH_SIZE) {
      await flushActivityBatch(prisma, activityBatch);
      stats.totalActivities += activityBatch.length;
      activityBatch.length = 0;
    }
  }

  // Final flush
  if (activityBatch.length > 0) {
    await flushActivityBatch(prisma, activityBatch);
    stats.totalActivities += activityBatch.length;
  }

  console.log(`  Created ${stats.totalActivities} activity timeline entries`);
  console.log(`    - Case Created: ${stats.caseCreated}`);
  console.log(`    - Case Assigned: ${stats.caseAssigned}`);
  console.log(`    - Status Changed: ${stats.statusChanged}`);
  console.log(`    - Priority Changed: ${stats.priorityChanged}`);
  console.log(`    - Notes Added: ${stats.noteAdded}`);
  console.log(`    - CCO Escalated: ${stats.ccoEscalated}`);
  console.log(`    - SLA Warnings: ${stats.slaWarning}`);
  console.log(`    - Investigation Started: ${stats.investigationStarted}`);
  console.log(`    - Investigation Closed: ${stats.investigationClosed}`);
  console.log(`    - AI Enrichment: ${stats.aiEnrichment}`);

  return stats;
}

/**
 * Flush activity batch to database
 */
async function flushActivityBatch(
  prisma: PrismaClient,
  batch: AuditLogRecord[],
): Promise<void> {
  if (batch.length === 0) return;

  await prisma.auditLog.createMany({
    data: batch.map((activity) => ({
      id: activity.id,
      organizationId: activity.organizationId,
      entityType: activity.entityType,
      entityId: activity.entityId,
      action: activity.action,
      actionCategory: activity.actionCategory,
      actionDescription: activity.actionDescription,
      actorUserId: activity.actorUserId,
      actorType: activity.actorType,
      actorName: activity.actorName,
      changes: activity.changes ? JSON.parse(JSON.stringify(activity.changes)) : undefined,
      context: activity.context ? JSON.parse(JSON.stringify(activity.context)) : undefined,
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent,
      requestId: activity.requestId,
      createdAt: activity.createdAt,
    })),
    skipDuplicates: true,
  });
}

/**
 * Get activity statistics for demo metrics
 */
export async function getActivityStats(
  prisma: PrismaClient,
  organizationId: string,
): Promise<{
  total: number;
  byEntityType: Record<string, number>;
  byActionCategory: Record<string, number>;
  byActorType: Record<string, number>;
}> {
  const total = await prisma.auditLog.count({ where: { organizationId } });

  // Get counts by entity type
  const entityTypeCounts = await prisma.auditLog.groupBy({
    by: ['entityType'],
    where: { organizationId },
    _count: true,
  });
  const byEntityType: Record<string, number> = {};
  for (const row of entityTypeCounts) {
    byEntityType[row.entityType] = row._count;
  }

  // Get counts by action category
  const actionCategoryCounts = await prisma.auditLog.groupBy({
    by: ['actionCategory'],
    where: { organizationId },
    _count: true,
  });
  const byActionCategory: Record<string, number> = {};
  for (const row of actionCategoryCounts) {
    byActionCategory[row.actionCategory] = row._count;
  }

  // Get counts by actor type
  const actorTypeCounts = await prisma.auditLog.groupBy({
    by: ['actorType'],
    where: { organizationId },
    _count: true,
  });
  const byActorType: Record<string, number> = {};
  for (const row of actorTypeCounts) {
    byActorType[row.actorType] = row._count;
  }

  return {
    total,
    byEntityType,
    byActionCategory,
    byActorType,
  };
}
