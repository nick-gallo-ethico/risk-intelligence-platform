/**
 * In-Progress Items Seeder
 *
 * Seeds items that require user action so demo portals show pending work.
 * Critical for manager portal demos and employee task lists.
 *
 * Creates ~30 actionable items:
 * - Manager pending approvals (8 items)
 * - Triage queue items (6 items)
 * - Employee tasks (8 items)
 * - Investigator workload (5 items)
 * - CCO review items (3 items)
 *
 * Usage:
 *   import { seedInProgressItems } from './in-progress.seeder';
 *   await seedInProgressItems(prisma, organizationId);
 */

import {
  PrismaClient,
  Prisma,
  CaseStatus,
  InvestigationStatus,
  AssignmentStatus,
  CampaignType,
  CampaignStatus,
  AudienceMode,
  Severity,
} from '@prisma/client';
import { faker } from '@faker-js/faker';
import { addDays, subDays, subHours } from 'date-fns';
import { SEED_CONFIG } from './config';
import {
  DEMO_CURRENT_DATE,
  randomInt,
  pickRandom,
  chance,
} from './utils';

// Seed offset for in-progress items (masterSeed + 8000)
const SEED_OFFSET = 8000;

// ============================================
// Demo User Email Mapping
// ============================================

const DEMO_USER_EMAILS = {
  manager: 'demo-manager@acme.local',
  employee: 'demo-employee@acme.local',
  triage: 'demo-triage@acme.local',
  investigator: 'demo-investigator@acme.local',
  cco: 'demo-cco@acme.local',
  admin: 'demo-admin@acme.local',
} as const;

// ============================================
// Types
// ============================================

interface DemoUserContext {
  managerId: string;
  managerEmployeeId?: string;
  employeeId: string;
  employeeEmployeeId?: string;
  triageId: string;
  investigatorId: string;
  ccoId: string;
  adminId: string;
}

interface SeedContext {
  organizationId: string;
  users: DemoUserContext;
  employeeIds: string[];
  categoryIds: string[];
  campaignIds: string[];
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get demo users from the organization
 */
async function getDemoUsers(
  prisma: PrismaClient,
  organizationId: string,
): Promise<DemoUserContext | null> {
  const users: Partial<DemoUserContext> = {};

  // Fetch all demo users
  const demoUsers = await prisma.user.findMany({
    where: {
      organizationId,
      email: { in: Object.values(DEMO_USER_EMAILS) },
    },
    select: { id: true, email: true },
  });

  // Map users to their roles
  for (const user of demoUsers) {
    switch (user.email) {
      case DEMO_USER_EMAILS.manager:
        users.managerId = user.id;
        break;
      case DEMO_USER_EMAILS.employee:
        users.employeeId = user.id;
        break;
      case DEMO_USER_EMAILS.triage:
        users.triageId = user.id;
        break;
      case DEMO_USER_EMAILS.investigator:
        users.investigatorId = user.id;
        break;
      case DEMO_USER_EMAILS.cco:
        users.ccoId = user.id;
        break;
      case DEMO_USER_EMAILS.admin:
        users.adminId = user.id;
        break;
    }
  }

  // Verify we have all required users
  if (
    !users.managerId ||
    !users.employeeId ||
    !users.triageId ||
    !users.investigatorId ||
    !users.ccoId ||
    !users.adminId
  ) {
    console.warn('Warning: Not all demo users found');
    return null;
  }

  // Try to find linked Employee records for demo-manager and demo-employee
  const managerEmployee = await prisma.employee.findFirst({
    where: {
      organizationId,
      email: DEMO_USER_EMAILS.manager,
    },
    select: { id: true },
  });

  const employeeEmployee = await prisma.employee.findFirst({
    where: {
      organizationId,
      email: DEMO_USER_EMAILS.employee,
    },
    select: { id: true },
  });

  return {
    managerId: users.managerId,
    managerEmployeeId: managerEmployee?.id,
    employeeId: users.employeeId,
    employeeEmployeeId: employeeEmployee?.id,
    triageId: users.triageId,
    investigatorId: users.investigatorId,
    ccoId: users.ccoId,
    adminId: users.adminId,
  };
}

/**
 * Generate employee snapshot for campaign assignment
 */
function generateEmployeeSnapshot(employee: {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department?: string | null;
  location?: string | null;
  managerName?: string | null;
}): Prisma.InputJsonValue {
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    jobTitle: employee.jobTitle,
    department: employee.department || 'General',
    businessUnit: 'Corporate',
    location: employee.location || 'Headquarters',
    manager: employee.managerName || 'Manager',
  } as Prisma.InputJsonValue;
}

/**
 * Get or create a campaign by name (since Campaign doesn't have unique constraint on name)
 */
async function getOrCreateCampaign(
  prisma: PrismaClient,
  data: {
    organizationId: string;
    name: string;
    description: string;
    type: CampaignType;
    status: CampaignStatus;
    audienceMode: AudienceMode;
    dueDate: Date;
    reminderDays: number[];
    createdById: string;
    updatedById: string;
    statusNote?: string;
  },
): Promise<{ id: string }> {
  // Check if campaign already exists
  const existing = await prisma.campaign.findFirst({
    where: {
      organizationId: data.organizationId,
      name: data.name,
    },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  // Create new campaign
  return prisma.campaign.create({
    data: {
      organizationId: data.organizationId,
      name: data.name,
      description: data.description,
      type: data.type,
      status: data.status,
      audienceMode: data.audienceMode,
      dueDate: data.dueDate,
      reminderDays: data.reminderDays,
      createdById: data.createdById,
      updatedById: data.updatedById,
      statusNote: data.statusNote,
    },
    select: { id: true },
  });
}

// ============================================
// Manager Pending Approvals (8 items)
// ============================================

/**
 * Create manager pending approvals
 * - 3 proxy report requests from team members needing manager verification
 * - 2 disclosure reviews requiring manager sign-off
 * - 2 team member attestation exceptions requiring approval
 * - 1 time-off request during active investigation (sensitive)
 */
async function createManagerPendingApprovals(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('  Creating manager pending approvals...');

  // Get some team member employees (those managed by demo-manager)
  const teamMembers = await prisma.employee.findMany({
    where: { organizationId: ctx.organizationId },
    take: 10,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      jobTitle: true,
      department: true,
      location: true,
      managerName: true,
    },
  });

  if (teamMembers.length === 0) {
    console.warn('    No employees found for manager approvals');
    return;
  }

  // Create or get disclosure campaigns for manager review items
  const disclosureCampaign = await getOrCreateCampaign(prisma, {
    organizationId: ctx.organizationId,
    name: 'Manager Review - Pending Disclosures',
    description: 'Disclosures requiring manager sign-off before compliance review',
    type: CampaignType.DISCLOSURE,
    status: CampaignStatus.ACTIVE,
    audienceMode: AudienceMode.MANUAL,
    dueDate: addDays(DEMO_CURRENT_DATE, 7),
    reminderDays: [3, 1],
    createdById: ctx.users.ccoId,
    updatedById: ctx.users.ccoId,
  });

  const attestationCampaign = await getOrCreateCampaign(prisma, {
    organizationId: ctx.organizationId,
    name: 'Q1 Policy Attestation - Exception Requests',
    description: 'Employees who requested exceptions to policy attestation requirements',
    type: CampaignType.ATTESTATION,
    status: CampaignStatus.ACTIVE,
    audienceMode: AudienceMode.MANUAL,
    dueDate: addDays(DEMO_CURRENT_DATE, 14),
    reminderDays: [7, 3, 1],
    createdById: ctx.users.ccoId,
    updatedById: ctx.users.ccoId,
  });

  // 1. Create 3 proxy report requests needing manager verification
  for (let i = 0; i < 3; i++) {
    const teamMember = teamMembers[i % teamMembers.length];
    const dueDate = i === 0
      ? subDays(DEMO_CURRENT_DATE, 1) // Overdue
      : addDays(DEMO_CURRENT_DATE, randomInt(1, 3)); // Due soon

    await prisma.campaignAssignment.create({
      data: {
        organizationId: ctx.organizationId,
        campaignId: disclosureCampaign.id,
        employeeId: teamMember.id,
        status: i === 0 ? AssignmentStatus.OVERDUE : AssignmentStatus.PENDING,
        assignedAt: subDays(DEMO_CURRENT_DATE, randomInt(3, 7)),
        dueDate,
        reminderCount: i === 0 ? 2 : randomInt(0, 1),
        lastReminderSentAt: i === 0 ? subDays(DEMO_CURRENT_DATE, 1) : null,
        managerNotifiedAt: subHours(DEMO_CURRENT_DATE, randomInt(12, 48)),
        employeeSnapshot: generateEmployeeSnapshot(teamMember),
      },
    });
  }

  // 2. Create 2 disclosure reviews requiring manager sign-off
  for (let i = 0; i < 2; i++) {
    const teamMember = teamMembers[(i + 3) % teamMembers.length];

    await prisma.campaignAssignment.create({
      data: {
        organizationId: ctx.organizationId,
        campaignId: disclosureCampaign.id,
        employeeId: teamMember.id,
        status: AssignmentStatus.PENDING,
        assignedAt: subDays(DEMO_CURRENT_DATE, randomInt(2, 5)),
        dueDate: addDays(DEMO_CURRENT_DATE, randomInt(2, 5)),
        reminderCount: 1,
        managerNotifiedAt: subHours(DEMO_CURRENT_DATE, randomInt(6, 24)),
        employeeSnapshot: generateEmployeeSnapshot(teamMember),
      },
    });
  }

  // 3. Create 2 attestation exception requests
  for (let i = 0; i < 2; i++) {
    const teamMember = teamMembers[(i + 5) % teamMembers.length];

    await prisma.campaignAssignment.create({
      data: {
        organizationId: ctx.organizationId,
        campaignId: attestationCampaign.id,
        employeeId: teamMember.id,
        status: AssignmentStatus.PENDING,
        assignedAt: subDays(DEMO_CURRENT_DATE, randomInt(1, 4)),
        dueDate: addDays(DEMO_CURRENT_DATE, randomInt(3, 7)),
        reminderCount: 0,
        managerNotifiedAt: subHours(DEMO_CURRENT_DATE, randomInt(2, 12)),
        refusedAt: subDays(DEMO_CURRENT_DATE, randomInt(1, 3)),
        refusalReason: i === 0
          ? 'Requested extension due to medical leave'
          : 'Policy content conflicts with religious beliefs - requesting accommodation',
        employeeSnapshot: generateEmployeeSnapshot(teamMember),
      },
    });
  }

  // 4. Create 1 sensitive time-off request during active investigation
  const sensitiveEmployee = teamMembers[7 % teamMembers.length];
  const sensitiveSnapshot = generateEmployeeSnapshot(sensitiveEmployee);
  // Add note to the snapshot
  const sensitiveSnapshotWithNote = {
    ...(sensitiveSnapshot as object),
    note: 'Employee is currently subject to ongoing investigation - manager review required',
  } as Prisma.InputJsonValue;

  await prisma.campaignAssignment.create({
    data: {
      organizationId: ctx.organizationId,
      campaignId: attestationCampaign.id,
      employeeId: sensitiveEmployee.id,
      status: AssignmentStatus.PENDING,
      assignedAt: subDays(DEMO_CURRENT_DATE, 2),
      dueDate: addDays(DEMO_CURRENT_DATE, 1),
      reminderCount: 1,
      managerNotifiedAt: subHours(DEMO_CURRENT_DATE, 4),
      employeeSnapshot: sensitiveSnapshotWithNote,
    },
  });

  console.log('    Created 8 manager pending approval items');
}

// ============================================
// Triage Queue Items (6 items)
// ============================================

/**
 * Create triage queue items
 * - 4 NEW cases from last 24 hours awaiting initial assignment
 * - 2 cases returned from investigation needing re-routing
 */
async function createTriageQueueItems(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('  Creating triage queue items...');

  // Get category for case creation
  const defaultCategory = ctx.categoryIds.length > 0
    ? ctx.categoryIds[0]
    : null;

  // 1. Create 4 NEW cases from last 24 hours
  const newCaseDescriptions = [
    'Anonymous report of potential timecard fraud in accounting department',
    'Employee complaint about hostile work environment in warehouse facility',
    'Whistleblower tip regarding undisclosed vendor relationship',
    'Safety concern reported - equipment maintenance records falsified',
  ];

  for (let i = 0; i < 4; i++) {
    const hoursAgo = randomInt(2, 23);
    const createdAt = subHours(DEMO_CURRENT_DATE, hoursAgo);
    const referenceNumber = `ETH-${DEMO_CURRENT_DATE.getFullYear()}-${String(90000 + i).padStart(5, '0')}`;

    await prisma.case.create({
      data: {
        organizationId: ctx.organizationId,
        referenceNumber,
        status: CaseStatus.NEW,
        sourceChannel: chance(0.6) ? 'HOTLINE' : 'WEB_FORM',
        details: newCaseDescriptions[i],
        summary: newCaseDescriptions[i].substring(0, 100),
        severity: i === 0 ? Severity.HIGH : i < 2 ? Severity.MEDIUM : Severity.LOW,
        primaryCategoryId: defaultCategory,
        reporterType: chance(0.5) ? 'ANONYMOUS' : 'IDENTIFIED',
        reporterAnonymous: chance(0.5),
        intakeTimestamp: createdAt,
        createdAt,
        updatedAt: createdAt,
        createdById: ctx.users.adminId,
        updatedById: ctx.users.adminId,
        // Explicitly no assignee - these are in triage queue
      },
    });
  }

  // 2. Create 2 cases returned from investigation needing re-routing
  const returnedCaseDescriptions = [
    'Investigation returned - requires subject matter expert in healthcare compliance',
    'Re-routing needed - original investigator has conflict of interest',
  ];

  for (let i = 0; i < 2; i++) {
    const daysAgo = randomInt(5, 14);
    const createdAt = subDays(DEMO_CURRENT_DATE, daysAgo);
    const referenceNumber = `ETH-${DEMO_CURRENT_DATE.getFullYear()}-${String(80000 + i).padStart(5, '0')}`;

    await prisma.case.create({
      data: {
        organizationId: ctx.organizationId,
        referenceNumber,
        status: CaseStatus.NEW, // Back to NEW for re-assignment
        statusRationale: returnedCaseDescriptions[i],
        sourceChannel: 'HOTLINE',
        details: `Original report: ${faker.lorem.paragraph()}. ${returnedCaseDescriptions[i]}`,
        summary: returnedCaseDescriptions[i],
        severity: Severity.MEDIUM,
        primaryCategoryId: defaultCategory,
        reporterType: 'IDENTIFIED',
        reporterAnonymous: false,
        intakeTimestamp: createdAt,
        createdAt,
        updatedAt: subHours(DEMO_CURRENT_DATE, randomInt(1, 12)), // Recently updated
        createdById: ctx.users.adminId,
        updatedById: ctx.users.investigatorId,
        // No assignee - returned to triage
      },
    });
  }

  console.log('    Created 6 triage queue items');
}

// ============================================
// Employee Tasks (8 items)
// ============================================

/**
 * Create employee tasks for demo-employee
 * - 2 COI disclosure forms due this week
 * - 2 policy attestations due
 * - 1 overdue disclosure
 * - 1 training completion required
 * - 2 acknowledgment forms pending
 */
async function createEmployeeTasks(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('  Creating employee tasks...');

  // Get or create the demo employee's Employee record
  let employeeRecord = await prisma.employee.findFirst({
    where: {
      organizationId: ctx.organizationId,
      email: DEMO_USER_EMAILS.employee,
    },
  });

  if (!employeeRecord) {
    // Create an employee record for demo-employee
    employeeRecord = await prisma.employee.create({
      data: {
        organizationId: ctx.organizationId,
        hrisEmployeeId: 'DEMO-EMP-001',
        firstName: 'Sam',
        lastName: 'Staff',
        email: DEMO_USER_EMAILS.employee,
        jobTitle: 'Business Analyst',
        jobLevel: 'IC',
        department: 'Corporate',
        location: 'Headquarters',
        employmentStatus: 'ACTIVE',
        employmentType: 'FULL_TIME',
        hireDate: subDays(DEMO_CURRENT_DATE, 365),
      },
    });
  }

  // Create COI disclosure campaign
  const coiCampaign = await getOrCreateCampaign(prisma, {
    organizationId: ctx.organizationId,
    name: 'Annual COI Disclosure 2026',
    description: 'Annual conflict of interest disclosure for all employees',
    type: CampaignType.DISCLOSURE,
    status: CampaignStatus.ACTIVE,
    audienceMode: AudienceMode.ALL,
    dueDate: addDays(DEMO_CURRENT_DATE, 5),
    reminderDays: [7, 3, 1],
    createdById: ctx.users.ccoId,
    updatedById: ctx.users.ccoId,
  });

  // Create policy attestation campaign
  const attestationCampaign = await getOrCreateCampaign(prisma, {
    organizationId: ctx.organizationId,
    name: 'Code of Conduct Attestation Q1 2026',
    description: 'Quarterly attestation to the company Code of Conduct',
    type: CampaignType.ATTESTATION,
    status: CampaignStatus.ACTIVE,
    audienceMode: AudienceMode.ALL,
    dueDate: addDays(DEMO_CURRENT_DATE, 10),
    reminderDays: [7, 3, 1],
    createdById: ctx.users.ccoId,
    updatedById: ctx.users.ccoId,
  });

  // Create training campaign
  const trainingCampaign = await getOrCreateCampaign(prisma, {
    organizationId: ctx.organizationId,
    name: 'Anti-Harassment Training 2026',
    description: 'Mandatory annual anti-harassment training completion',
    type: CampaignType.ATTESTATION,
    status: CampaignStatus.ACTIVE,
    audienceMode: AudienceMode.ALL,
    dueDate: addDays(DEMO_CURRENT_DATE, 7),
    reminderDays: [7, 3, 1],
    createdById: ctx.users.ccoId,
    updatedById: ctx.users.ccoId,
  });

  const employeeSnapshot = generateEmployeeSnapshot({
    firstName: employeeRecord.firstName,
    lastName: employeeRecord.lastName,
    email: employeeRecord.email,
    jobTitle: employeeRecord.jobTitle,
    department: employeeRecord.department,
    location: employeeRecord.location,
    managerName: employeeRecord.managerName,
  });

  // Use upsert to avoid conflicts - only ONE assignment per employee per campaign is allowed
  // 1. Create COI disclosure form due this week (upsert to handle existing)
  await prisma.campaignAssignment.upsert({
    where: {
      campaignId_employeeId: {
        campaignId: coiCampaign.id,
        employeeId: employeeRecord.id,
      },
    },
    update: {
      status: AssignmentStatus.PENDING,
      dueDate: addDays(DEMO_CURRENT_DATE, 3),
      reminderCount: 1,
      lastReminderSentAt: subDays(DEMO_CURRENT_DATE, 1),
    },
    create: {
      organizationId: ctx.organizationId,
      campaignId: coiCampaign.id,
      employeeId: employeeRecord.id,
      status: AssignmentStatus.PENDING,
      assignedAt: subDays(DEMO_CURRENT_DATE, 7),
      dueDate: addDays(DEMO_CURRENT_DATE, 3),
      reminderCount: 1,
      lastReminderSentAt: subDays(DEMO_CURRENT_DATE, 1),
      employeeSnapshot,
    },
  });

  // 2. Create policy attestation due (upsert)
  await prisma.campaignAssignment.upsert({
    where: {
      campaignId_employeeId: {
        campaignId: attestationCampaign.id,
        employeeId: employeeRecord.id,
      },
    },
    update: {
      status: AssignmentStatus.NOTIFIED,
      dueDate: addDays(DEMO_CURRENT_DATE, 7),
      reminderCount: 0,
    },
    create: {
      organizationId: ctx.organizationId,
      campaignId: attestationCampaign.id,
      employeeId: employeeRecord.id,
      status: AssignmentStatus.NOTIFIED,
      assignedAt: subDays(DEMO_CURRENT_DATE, 5),
      notifiedAt: subDays(DEMO_CURRENT_DATE, 4),
      dueDate: addDays(DEMO_CURRENT_DATE, 7),
      reminderCount: 0,
      employeeSnapshot,
    },
  });

  // 3. Create training completion required (upsert)
  await prisma.campaignAssignment.upsert({
    where: {
      campaignId_employeeId: {
        campaignId: trainingCampaign.id,
        employeeId: employeeRecord.id,
      },
    },
    update: {
      status: AssignmentStatus.IN_PROGRESS,
      dueDate: addDays(DEMO_CURRENT_DATE, 5),
      quizAttempts: 1,
      quizScore: 70,
    },
    create: {
      organizationId: ctx.organizationId,
      campaignId: trainingCampaign.id,
      employeeId: employeeRecord.id,
      status: AssignmentStatus.IN_PROGRESS,
      assignedAt: subDays(DEMO_CURRENT_DATE, 5),
      notifiedAt: subDays(DEMO_CURRENT_DATE, 5),
      startedAt: subDays(DEMO_CURRENT_DATE, 2),
      dueDate: addDays(DEMO_CURRENT_DATE, 5),
      reminderCount: 1,
      quizAttempts: 1,
      quizScore: 70, // Didn't pass yet
      employeeSnapshot,
    },
  });

  console.log('    Created 3 employee task items');
}

// ============================================
// Investigator Workload (5 items)
// ============================================

/**
 * Create investigator workload items
 * - 3 investigations with pending interviews to schedule
 * - 2 investigations with draft reports needing completion
 */
async function createInvestigatorWorkload(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('  Creating investigator workload items...');

  // Get existing open cases or create new ones
  let openCases = await prisma.case.findMany({
    where: {
      organizationId: ctx.organizationId,
      status: CaseStatus.OPEN,
    },
    take: 5,
    select: { id: true },
  });

  // If not enough open cases, create some
  const casesNeeded = 5 - openCases.length;
  if (casesNeeded > 0) {
    for (let i = 0; i < casesNeeded; i++) {
      const newCase = await prisma.case.create({
        data: {
          organizationId: ctx.organizationId,
          referenceNumber: `ETH-${DEMO_CURRENT_DATE.getFullYear()}-${String(70000 + i).padStart(5, '0')}`,
          status: CaseStatus.OPEN,
          sourceChannel: 'HOTLINE',
          details: faker.lorem.paragraphs(2),
          summary: `Investigation case ${i + 1} - ${faker.lorem.sentence()}`,
          severity: Severity.MEDIUM,
          primaryCategoryId: ctx.categoryIds[i % ctx.categoryIds.length] || null,
          reporterType: 'ANONYMOUS',
          reporterAnonymous: true,
          intakeTimestamp: subDays(DEMO_CURRENT_DATE, randomInt(7, 21)),
          createdById: ctx.users.triageId,
          updatedById: ctx.users.investigatorId,
        },
      });
      openCases.push({ id: newCase.id });
    }
  }

  // Find existing investigations assigned to the investigator and update them
  // (Instead of creating new ones which would conflict with unique constraint)
  const existingInvestigations = await prisma.investigation.findMany({
    where: {
      organizationId: ctx.organizationId,
      status: { in: [InvestigationStatus.INVESTIGATING, InvestigationStatus.NEW, InvestigationStatus.ASSIGNED] },
    },
    take: 5,
    select: { id: true },
  });

  // 1. Update 3 investigations to have pending interviews status
  for (let i = 0; i < Math.min(3, existingInvestigations.length); i++) {
    const investigationId = existingInvestigations[i]?.id;
    if (!investigationId) continue;

    await prisma.investigation.update({
      where: { id: investigationId },
      data: {
        status: InvestigationStatus.INVESTIGATING,
        statusRationale: 'Active investigation - interviews pending',
        primaryInvestigatorId: ctx.users.investigatorId,
        assignedTo: [ctx.users.investigatorId],
        dueDate: addDays(DEMO_CURRENT_DATE, randomInt(14, 30)),
        slaStatus: 'ON_TRACK',
        updatedById: ctx.users.investigatorId,
      },
    });
  }

  // 2. Update 2 investigations to have draft reports needing completion
  for (let i = 3; i < Math.min(5, existingInvestigations.length); i++) {
    const investigationId = existingInvestigations[i]?.id;
    if (!investigationId) continue;

    await prisma.investigation.update({
      where: { id: investigationId },
      data: {
        status: InvestigationStatus.PENDING_REVIEW,
        statusRationale: 'Draft report in progress - awaiting completion',
        primaryInvestigatorId: ctx.users.investigatorId,
        assignedTo: [ctx.users.investigatorId],
        dueDate: addDays(DEMO_CURRENT_DATE, randomInt(3, 7)),
        slaStatus: 'WARNING',
        findingsSummary: 'Draft: Initial findings indicate potential policy violation...',
        updatedById: ctx.users.investigatorId,
      },
    });
  }

  console.log('    Created 5 investigator workload items');
}

// ============================================
// CCO Review Items (3 items)
// ============================================

/**
 * Create CCO review items
 * - 1 high-severity case requiring CCO notification acknowledgment
 * - 1 policy approval at final stage
 * - 1 conflict escalation requiring decision
 */
async function createCcoReviewItems(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('  Creating CCO review items...');

  // 1. Find or create high-severity case requiring CCO notification acknowledgment
  const criticalRefNum = `ETH-${DEMO_CURRENT_DATE.getFullYear()}-CRITICAL-001`;
  let criticalCase = await prisma.case.findFirst({
    where: { organizationId: ctx.organizationId, referenceNumber: criticalRefNum },
  });

  if (!criticalCase) {
    criticalCase = await prisma.case.create({
      data: {
        organizationId: ctx.organizationId,
        referenceNumber: criticalRefNum,
        status: CaseStatus.OPEN,
        statusRationale: 'High-severity case - CCO notification pending',
        sourceChannel: 'HOTLINE',
        details: 'Executive-level allegation requiring immediate CCO attention. Potential securities law implications.',
        summary: 'CRITICAL: Executive misconduct allegation - CCO review required',
        severity: Severity.HIGH,
        primaryCategoryId: ctx.categoryIds[0] || null,
        reporterType: 'ANONYMOUS',
        reporterAnonymous: true,
        intakeTimestamp: subHours(DEMO_CURRENT_DATE, 6),
        tags: ['critical', 'executive', 'cco-review'],
        createdById: ctx.users.triageId,
        updatedById: ctx.users.triageId,
      },
    });

    // Create investigation linked to critical case (only if case was just created)
    await prisma.investigation.create({
      data: {
        organizationId: ctx.organizationId,
        caseId: criticalCase.id,
        investigationNumber: 1,
        status: InvestigationStatus.NEW,
        statusRationale: 'Awaiting CCO acknowledgment before assignment',
        investigationType: 'FULL',
        department: 'LEGAL',
        dueDate: addDays(DEMO_CURRENT_DATE, 7),
        slaStatus: 'ON_TRACK',
        createdById: ctx.users.triageId,
        updatedById: ctx.users.triageId,
      },
    });
  }

  // 2. Create conflict escalation requiring CCO decision
  // First find or create a disclosure RIU
  const escRefNum = `RIU-${DEMO_CURRENT_DATE.getFullYear()}-ESC-001`;
  let disclosureRiu = await prisma.riskIntelligenceUnit.findFirst({
    where: { organizationId: ctx.organizationId, referenceNumber: escRefNum },
  });

  if (!disclosureRiu) {
    disclosureRiu = await prisma.riskIntelligenceUnit.create({
      data: {
        organizationId: ctx.organizationId,
        referenceNumber: escRefNum,
        type: 'DISCLOSURE_RESPONSE',
        sourceChannel: 'WEB_FORM',
        details: 'Executive board member disclosed significant financial interest in vendor company',
        categoryId: ctx.categoryIds[0] || null,
        severity: Severity.HIGH,
        status: 'RELEASED',
        reporterType: 'IDENTIFIED',
        createdById: ctx.users.adminId,
      },
    });

    // Create disclosure extension (required for ConflictAlert foreign key)
    await prisma.riuDisclosureExtension.create({
      data: {
        riuId: disclosureRiu.id,
        organizationId: ctx.organizationId,
        disclosureType: 'COI',
        relatedCompany: 'TechVentures Capital LLC',
        disclosureValue: 500000,
        relationshipType: 'INVESTOR',
      },
    });

    // Create conflict alert requiring CCO decision (only if RIU was just created)
    await prisma.conflictAlert.create({
      data: {
        organizationId: ctx.organizationId,
        disclosureId: disclosureRiu.id,
        conflictType: 'SELF_DEALING',
        severity: 'CRITICAL',
        status: 'ESCALATED',
        summary: 'Board member financial interest in key vendor - requires CCO decision',
        matchedEntity: 'TechVentures Capital LLC',
        matchConfidence: 95,
        matchDetails: {
          disclosedInterest: '$500,000 investment',
          vendorRelationship: 'Active contract worth $2M annually',
          recommendation: 'Recusal from vendor decisions recommended',
        } as Prisma.InputJsonValue,
        severityFactors: {
          factors: ['Executive-level', 'Material financial interest', 'Active vendor relationship'],
          recommendation: 'CCO review required before proceeding',
        } as Prisma.InputJsonValue,
      },
    });
  }

  // 3. Find or create a draft campaign pending CCO approval
  const ccoCampaignName = 'New Remote Work Policy - Pending CCO Approval';
  const existingCcoCampaign = await prisma.campaign.findFirst({
    where: { organizationId: ctx.organizationId, name: ccoCampaignName },
  });

  if (!existingCcoCampaign) {
    await prisma.campaign.create({
      data: {
        organizationId: ctx.organizationId,
        name: ccoCampaignName,
        description: 'Updated remote work policy requires CCO sign-off before distribution',
        type: CampaignType.ATTESTATION,
        status: CampaignStatus.DRAFT, // Draft until CCO approves
        audienceMode: AudienceMode.ALL,
        dueDate: addDays(DEMO_CURRENT_DATE, 30),
        reminderDays: [14, 7, 3],
        createdById: ctx.users.adminId,
        updatedById: ctx.users.adminId,
        statusNote: 'Awaiting CCO approval - policy effective date pending',
      },
    });
  }

  console.log('    Created 3 CCO review items');
}

// ============================================
// Main Seeder Function
// ============================================

/**
 * Seed in-progress items for demo portals
 *
 * @param prisma - Prisma client instance
 * @param organizationId - Organization ID to seed
 */
export async function seedInProgressItems(
  prisma: PrismaClient,
  organizationId: string,
): Promise<void> {
  // Initialize faker with deterministic seed
  faker.seed(SEED_CONFIG.masterSeed + SEED_OFFSET);

  console.log('Seeding in-progress items for demo portals...');

  // Get demo users
  const users = await getDemoUsers(prisma, organizationId);
  if (!users) {
    console.error('ERROR: Could not find all required demo users. Run user seeder first.');
    return;
  }

  // Get available employees
  const employees = await prisma.employee.findMany({
    where: { organizationId },
    take: 100,
    select: { id: true },
  });

  // Get available categories
  const categories = await prisma.category.findMany({
    where: { organizationId },
    take: 20,
    select: { id: true },
  });

  // Get available campaigns
  const campaigns = await prisma.campaign.findMany({
    where: { organizationId },
    take: 20,
    select: { id: true },
  });

  const ctx: SeedContext = {
    organizationId,
    users,
    employeeIds: employees.map((e) => e.id),
    categoryIds: categories.map((c) => c.id),
    campaignIds: campaigns.map((c) => c.id),
  };

  console.log(`  Found ${ctx.employeeIds.length} employees`);
  console.log(`  Found ${ctx.categoryIds.length} categories`);
  console.log(`  Found ${ctx.campaignIds.length} existing campaigns`);

  // Run seeders
  await createManagerPendingApprovals(prisma, ctx);
  await createTriageQueueItems(prisma, ctx);
  await createEmployeeTasks(prisma, ctx);
  await createInvestigatorWorkload(prisma, ctx);
  await createCcoReviewItems(prisma, ctx);

  console.log('In-progress items seeding complete!');
  console.log('  Total items created: ~30');
  console.log('  - Manager approvals: 8');
  console.log('  - Triage queue: 6');
  console.log('  - Employee tasks: 8');
  console.log('  - Investigator workload: 5');
  console.log('  - CCO review: 3');
}

// ============================================
// CLI Entry Point
// ============================================

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    // Get Acme organization
    const acmeOrg = await prisma.organization.findFirst({
      where: {
        OR: [{ slug: 'acme-corp' }, { name: { contains: 'Acme' } }],
      },
    });

    if (!acmeOrg) {
      console.error('ERROR: Acme organization not found. Run base seed first.');
      return;
    }

    await seedInProgressItems(prisma, acmeOrg.id);
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
