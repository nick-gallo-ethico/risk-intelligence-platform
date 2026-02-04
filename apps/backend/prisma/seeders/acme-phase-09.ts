/**
 * Phase 9 Demo Data Seeder - Campaigns & Disclosures
 *
 * Seeds Acme Co. with Phase 9 specific data:
 * - 3 years of COI disclosure campaigns (2023-2025)
 * - Gift disclosures with threshold breaches
 * - Outside employment disclosures with conflict flags
 * - Repeat non-responders
 * - Open conflicts awaiting review
 * - Dismissed conflicts with exclusions
 * - Entity timeline data for "Acme Consulting LLC"
 * - User-created saved tables
 * - Multi-wave campaign demo
 *
 * Usage:
 *   npx ts-node prisma/seeders/acme-phase-09.ts
 *
 * Or via seed orchestrator:
 *   npm run db:seed
 */

import { PrismaClient, Prisma, ViewEntityType } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// ===========================================
// Types
// ===========================================

interface AcmeContext {
  organizationId: string;
  complianceOfficerId: string;
  employeeIds: string[];
  personIds: string[];
  categoryIds: string[];
  userIds: string[];
}

// ===========================================
// Helper Functions
// ===========================================

function generateUUID(): string {
  return faker.string.uuid();
}

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ===========================================
// Campaign Seeders
// ===========================================

/**
 * Creates annual COI disclosure campaigns for multiple years.
 * Per demo checkpoint: 3 years of campaigns with ~85% completion rates.
 */
async function createAnnualCoiCampaigns(
  ctx: AcmeContext,
  years: number[]
): Promise<string[]> {
  const campaignIds: string[] = [];

  for (const year of years) {
    const startDate = new Date(year, 0, 15); // January 15
    const dueDate = new Date(year, 1, 28); // February 28

    // Determine campaign status based on year
    const now = new Date();
    const isCompleted = year < now.getFullYear() || (year === now.getFullYear() && now > dueDate);
    const status = isCompleted ? 'COMPLETED' : year === now.getFullYear() ? 'ACTIVE' : 'DRAFT';

    const campaign = await prisma.campaign.create({
      data: {
        id: generateUUID(),
        organizationId: ctx.organizationId,
        name: `Annual COI Disclosure ${year}`,
        description: `Annual conflict of interest disclosure campaign for fiscal year ${year}. All employees must complete their COI disclosure by ${dueDate.toLocaleDateString()}.`,
        type: 'DISCLOSURE',
        status,
        launchAt: startDate,
        dueDate,
        reminderDays: [7, 3, 1],
        audienceMode: 'ALL',
        createdById: ctx.complianceOfficerId,
        updatedById: ctx.complianceOfficerId,
        createdAt: new Date(year - 1, 11, 1), // December of prior year
      },
    });

    campaignIds.push(campaign.id);

    // Create assignments for employees (sample for demo)
    const numAssignments = Math.min(ctx.employeeIds.length, 100);
    const selectedEmployees = faker.helpers.shuffle(ctx.employeeIds).slice(0, numAssignments);

    // Calculate completion stats (~85% completion for past campaigns)
    const completionRate = isCompleted ? 0.85 : year === now.getFullYear() ? 0.65 : 0;
    const completedCount = Math.floor(selectedEmployees.length * completionRate);

    for (let i = 0; i < selectedEmployees.length; i++) {
      const isComplete = i < completedCount;
      const assignmentStatus = isComplete ? 'COMPLETED' : isCompleted ? 'OVERDUE' : 'PENDING';

      await prisma.campaignAssignment.create({
        data: {
          id: generateUUID(),
          campaignId: campaign.id,
          employeeId: selectedEmployees[i],
          organizationId: ctx.organizationId,
          status: assignmentStatus,
          assignedAt: startDate,
          dueDate,
          completedAt: isComplete
            ? randomDate(startDate, dueDate)
            : null,
          reminderCount: isComplete ? 0 : Math.floor(Math.random() * 4),
          employeeSnapshot: {} as Prisma.InputJsonValue,
        },
      });
    }

    // Update campaign statistics
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        totalAssignments: numAssignments,
        completedAssignments: completedCount,
        overdueAssignments: isCompleted ? numAssignments - completedCount : 0,
      },
    });

    console.log(`  Created COI campaign ${year}: ${numAssignments} assignments, ${completedCount} completed`);
  }

  return campaignIds;
}

// ===========================================
// Disclosure Seeders
// ===========================================

const DISCLOSURE_TYPES = ['COI', 'GIFT', 'OUTSIDE_EMPLOYMENT', 'POLITICAL', 'CHARITABLE', 'TRAVEL'] as const;

const GIFT_ENTITIES = [
  'Global Suppliers Inc',
  'TechVentures Capital',
  'Premium Partners LLC',
  'Acme Consulting LLC',
  'Metro Industries',
  'Coastal Systems',
  'Summit Holdings',
  'Pacific Trading Co',
];

const RELATIONSHIP_TYPES = ['VENDOR', 'CUSTOMER', 'PARTNER', 'GOVERNMENT', 'INVESTOR', 'FAMILY', 'FRIEND', 'FORMER_COLLEAGUE'];
type RelationshipType = 'VENDOR' | 'CUSTOMER' | 'PARTNER' | 'GOVERNMENT' | 'INVESTOR' | 'FAMILY' | 'FRIEND' | 'FORMER_COLLEAGUE';

/**
 * Creates gift disclosures with some exceeding thresholds.
 * Per demo checkpoint: Mix of normal gifts and threshold breaches.
 */
async function createGiftDisclosures(
  ctx: AcmeContext,
  counts: { underThreshold: number; overThreshold: number }
): Promise<string[]> {
  const disclosureIds: string[] = [];
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  // Under threshold gifts ($50-$200)
  for (let i = 0; i < counts.underThreshold; i++) {
    const personId = randomFromArray(ctx.personIds);
    const value = faker.number.int({ min: 50, max: 200 });
    const entity = randomFromArray(GIFT_ENTITIES);

    const riu = await createDisclosureRiu(ctx, {
      personId,
      disclosureType: 'GIFT',
      relatedCompany: entity,
      disclosureValue: value,
      relationshipType: randomFromArray(RELATIONSHIP_TYPES) as RelationshipType,
      createdAt: randomDate(oneYearAgo, now),
    });

    disclosureIds.push(riu.id);
  }

  // Over threshold gifts ($300-$1000) - these create cases
  for (let i = 0; i < counts.overThreshold; i++) {
    const personId = randomFromArray(ctx.personIds);
    const value = faker.number.int({ min: 300, max: 1000 });
    const entity = randomFromArray(GIFT_ENTITIES);

    const riu = await createDisclosureRiu(ctx, {
      personId,
      disclosureType: 'GIFT',
      relatedCompany: entity,
      disclosureValue: value,
      relationshipType: randomFromArray(RELATIONSHIP_TYPES) as RelationshipType,
      createdAt: randomDate(oneYearAgo, now),
    });

    disclosureIds.push(riu.id);

    // Create a case for threshold breach
    const caseRef = `ETH-${now.getFullYear()}-${String(1000 + i).padStart(5, '0')}`;
    await prisma.case.create({
      data: {
        id: generateUUID(),
        organizationId: ctx.organizationId,
        referenceNumber: caseRef,
        sourceChannel: 'WEB_FORM',
        details: `Gift threshold exceeded: ${entity} - $${value}. Auto-created case for compliance review.`,
        summary: `Gift threshold breach - $${value} from ${entity}`,
        severity: value > 500 ? 'HIGH' : 'MEDIUM',
        status: faker.helpers.arrayElement(['NEW', 'OPEN', 'CLOSED']),
        createdById: ctx.complianceOfficerId,
        updatedById: ctx.complianceOfficerId,
      },
    });
  }

  console.log(`  Created ${counts.underThreshold + counts.overThreshold} gift disclosures (${counts.overThreshold} over threshold)`);
  return disclosureIds;
}

const OUTSIDE_EMPLOYMENT_COMPANIES = [
  'Freelance Consulting',
  'Weekend Ventures',
  'Family Hardware Store',
  'Local Restaurant',
  'Real Estate Investments',
  'Board Position - Non-Profit',
  'Teaching Position',
  'Advisory Role - Startup',
];

/**
 * Creates outside employment disclosures with some flagged conflicts.
 * Per demo checkpoint: 10 disclosures with 3 flagged.
 */
async function createOutsideEmploymentDisclosures(
  ctx: AcmeContext,
  count: number
): Promise<string[]> {
  const disclosureIds: string[] = [];
  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());

  for (let i = 0; i < count; i++) {
    const personId = randomFromArray(ctx.personIds);
    const company = randomFromArray(OUTSIDE_EMPLOYMENT_COMPANIES);
    const hasConflict = i < 3; // First 3 have conflicts

    const riu = await createDisclosureRiu(ctx, {
      personId,
      disclosureType: 'OUTSIDE_EMPLOYMENT',
      relatedCompany: company,
      disclosureValue: faker.number.int({ min: 0, max: 50000 }),
      relationshipType: 'VENDOR', // Use VENDOR as closest match to employer
      createdAt: randomDate(twoYearsAgo, now),
    });

    disclosureIds.push(riu.id);

    // Create conflict alert for flagged ones
    if (hasConflict) {
      await prisma.conflictAlert.create({
        data: {
          id: generateUUID(),
          organizationId: ctx.organizationId,
          disclosureId: riu.id,
          conflictType: faker.helpers.arrayElement(['APPROVAL_AUTHORITY', 'VENDOR_MATCH', 'SELF_DEALING']),
          severity: faker.helpers.arrayElement(['MEDIUM', 'HIGH']),
          status: 'OPEN',
          summary: `Potential conflict with outside employment at ${company}`,
          matchedEntity: company,
          matchConfidence: faker.number.int({ min: 70, max: 95 }),
          matchDetails: {
            employeeContext: {
              name: company,
              relationship: 'Outside Employment',
            },
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  console.log(`  Created ${count} outside employment disclosures (3 with conflict flags)`);
  return disclosureIds;
}

/**
 * Helper to create a disclosure RIU with extension.
 */
async function createDisclosureRiu(
  ctx: AcmeContext,
  data: {
    personId: string;
    disclosureType: typeof DISCLOSURE_TYPES[number];
    relatedCompany?: string;
    relatedPersonName?: string;
    disclosureValue?: number;
    relationshipType: RelationshipType;
    createdAt: Date;
  }
): Promise<{ id: string }> {
  const riuId = generateUUID();
  const refNum = `RIU-${data.createdAt.getFullYear()}-${String(faker.number.int({ min: 10000, max: 99999 }))}`;

  // Create RIU
  await prisma.riskIntelligenceUnit.create({
    data: {
      id: riuId,
      organizationId: ctx.organizationId,
      referenceNumber: refNum,
      type: 'DISCLOSURE_RESPONSE',
      sourceChannel: 'WEB_FORM',
      details: `${data.disclosureType} disclosure: ${data.relatedCompany || data.relatedPersonName}`,
      categoryId: randomFromArray(ctx.categoryIds),
      severity: data.disclosureValue && data.disclosureValue > 500 ? 'HIGH' : 'LOW',
      status: 'RELEASED',
      reporterType: 'IDENTIFIED',
      createdById: randomFromArray(ctx.userIds),
      createdAt: data.createdAt,
    },
  });

  // Create disclosure extension
  await prisma.riuDisclosureExtension.create({
    data: {
      riuId,
      organizationId: ctx.organizationId,
      disclosureType: data.disclosureType,
      relatedCompany: data.relatedCompany,
      relatedPersonName: data.relatedPersonName,
      disclosureValue: data.disclosureValue ? new Prisma.Decimal(data.disclosureValue) : null,
      relationshipType: data.relationshipType,
      createdAt: data.createdAt,
    },
  });

  return { id: riuId };
}

// ===========================================
// Non-Responder Tracking
// ===========================================

/**
 * Flags employees who have missed multiple campaign deadlines.
 * Per demo checkpoint: 2 repeat non-responders.
 */
async function flagRepeatNonResponders(ctx: AcmeContext): Promise<void> {
  // Get 2 employees to flag
  const nonResponderEmployees = ctx.employeeIds.slice(0, 2);

  for (const employeeId of nonResponderEmployees) {
    // Create multiple overdue assignments across different campaigns
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: ctx.organizationId },
      take: 3,
    });

    for (const campaign of campaigns) {
      await prisma.campaignAssignment.upsert({
        where: {
          campaignId_employeeId: {
            campaignId: campaign.id,
            employeeId,
          },
        },
        create: {
          id: generateUUID(),
          campaignId: campaign.id,
          employeeId,
          organizationId: ctx.organizationId,
          status: 'OVERDUE',
          assignedAt: campaign.launchAt ?? new Date(),
          dueDate: campaign.dueDate,
          reminderCount: 5,
          employeeSnapshot: {} as Prisma.InputJsonValue,
        },
        update: {
          status: 'OVERDUE',
          reminderCount: 5,
        },
      });
    }
  }

  console.log(`  Flagged ${nonResponderEmployees.length} repeat non-responders`);
}

// ===========================================
// Conflict Seeders
// ===========================================

/**
 * Creates pending conflicts awaiting review.
 * Per demo checkpoint: 5-10 open conflicts.
 */
async function createPendingConflicts(
  ctx: AcmeContext,
  count: number
): Promise<string[]> {
  const conflictIds: string[] = [];
  const conflictTypes = [
    'VENDOR_MATCH',
    'APPROVAL_AUTHORITY',
    'PRIOR_CASE_HISTORY',
    'HRIS_MATCH',
    'GIFT_AGGREGATE',
    'RELATIONSHIP_PATTERN',
    'SELF_DEALING',
  ] as const;

  // Get some existing disclosures to link to
  const disclosures = await prisma.riuDisclosureExtension.findMany({
    where: { organizationId: ctx.organizationId },
    take: count,
    select: { riuId: true, relatedCompany: true, relatedPersonName: true },
  });

  for (let i = 0; i < Math.min(count, disclosures.length); i++) {
    const disclosure = disclosures[i];
    const conflictType = randomFromArray([...conflictTypes]);
    const entity = disclosure.relatedCompany || disclosure.relatedPersonName || `Entity ${i}`;

    const conflict = await prisma.conflictAlert.create({
      data: {
        id: generateUUID(),
        organizationId: ctx.organizationId,
        disclosureId: disclosure.riuId,
        conflictType,
        severity: randomFromArray(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        status: 'OPEN',
        summary: `${conflictType.replace(/_/g, ' ').toLowerCase()} detected: ${entity}`,
        matchedEntity: entity,
        matchConfidence: faker.number.int({ min: 65, max: 98 }),
        matchDetails: {
          disclosureContext: {
            priorDisclosureIds: [disclosure.riuId],
          },
        } as unknown as Prisma.InputJsonValue,
        severityFactors: {
          factors: ['Match detected by system'],
          matchConfidence: faker.number.int({ min: 65, max: 98 }),
        } as unknown as Prisma.InputJsonValue,
      },
    });

    conflictIds.push(conflict.id);
  }

  console.log(`  Created ${conflictIds.length} pending conflicts`);
  return conflictIds;
}

/**
 * Creates dismissed conflicts with associated exclusions.
 * Per demo checkpoint: 3-5 exclusions.
 */
async function createDismissedConflictsWithExclusions(
  ctx: AcmeContext,
  count: number
): Promise<void> {
  const dismissalCategories = [
    'FALSE_MATCH_DIFFERENT_ENTITY',
    'FALSE_MATCH_NAME_COLLISION',
    'ALREADY_REVIEWED',
    'PRE_APPROVED_EXCEPTION',
    'BELOW_THRESHOLD',
  ] as const;

  const exclusionScopes = ['PERMANENT', 'TIME_LIMITED', 'ONE_TIME'] as const;

  // Get some existing disclosures
  const disclosures = await prisma.riuDisclosureExtension.findMany({
    where: { organizationId: ctx.organizationId },
    take: count,
    select: { riuId: true, relatedCompany: true },
  });

  for (let i = 0; i < Math.min(count, disclosures.length); i++) {
    const disclosure = disclosures[i];
    const entity = disclosure.relatedCompany || `Excluded Entity ${i}`;
    const category = randomFromArray([...dismissalCategories]);
    const scope = randomFromArray([...exclusionScopes]);
    const personId = randomFromArray(ctx.personIds);

    // Create dismissed conflict
    const conflict = await prisma.conflictAlert.create({
      data: {
        id: generateUUID(),
        organizationId: ctx.organizationId,
        disclosureId: disclosure.riuId,
        conflictType: 'VENDOR_MATCH',
        severity: 'LOW',
        status: 'DISMISSED',
        summary: `Dismissed: ${entity}`,
        matchedEntity: entity,
        matchConfidence: faker.number.int({ min: 60, max: 75 }),
        matchDetails: {} as Prisma.InputJsonValue,
        dismissedCategory: category,
        dismissedReason: `Dismissed as ${category.toLowerCase().replace(/_/g, ' ')}`,
        dismissedBy: ctx.complianceOfficerId,
        dismissedAt: faker.date.recent({ days: 30 }),
      },
    });

    // Create exclusion
    await prisma.conflictExclusion.create({
      data: {
        id: generateUUID(),
        organizationId: ctx.organizationId,
        personId,
        matchedEntity: entity,
        conflictType: 'VENDOR_MATCH',
        reason: `Pre-approved relationship per ${category.toLowerCase().replace(/_/g, ' ')}`,
        scope,
        expiresAt: scope === 'TIME_LIMITED' ? faker.date.future({ years: 1 }) : null,
        isActive: true,
        createdBy: ctx.complianceOfficerId,
        createdFromAlertId: conflict.id,
      },
    });
  }

  console.log(`  Created ${count} dismissed conflicts with exclusions`);
}

// ===========================================
// Entity Timeline Data
// ===========================================

/**
 * Creates rich timeline data for a specific entity.
 * Per demo checkpoint: "Acme Consulting LLC" with 10+ events.
 */
async function createEntityTimelineData(
  ctx: AcmeContext,
  entityName: string
): Promise<void> {
  const now = new Date();
  const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());

  // Create multiple disclosures involving this entity from different people
  const people = ctx.personIds.slice(0, 5);
  const disclosureIds: string[] = [];

  for (const personId of people) {
    const riu = await createDisclosureRiu(ctx, {
      personId,
      disclosureType: randomFromArray([...DISCLOSURE_TYPES]),
      relatedCompany: entityName,
      disclosureValue: faker.number.int({ min: 100, max: 2000 }),
      relationshipType: randomFromArray(RELATIONSHIP_TYPES) as RelationshipType,
      createdAt: randomDate(threeYearsAgo, now),
    });
    disclosureIds.push(riu.id);
  }

  // Create conflicts for some of these disclosures
  for (let i = 0; i < 3; i++) {
    const status = i === 0 ? 'OPEN' : i === 1 ? 'DISMISSED' : 'ESCALATED';

    await prisma.conflictAlert.create({
      data: {
        id: generateUUID(),
        organizationId: ctx.organizationId,
        disclosureId: disclosureIds[i],
        conflictType: 'VENDOR_MATCH',
        severity: randomFromArray(['MEDIUM', 'HIGH']),
        status,
        summary: `Vendor match detected: ${entityName}`,
        matchedEntity: entityName,
        matchConfidence: faker.number.int({ min: 85, max: 98 }),
        matchDetails: {
          vendorContext: {
            vendorName: entityName,
            vendorStatus: 'Approved',
            contractValue: faker.number.int({ min: 50000, max: 500000 }),
          },
        } as unknown as Prisma.InputJsonValue,
        dismissedCategory: status === 'DISMISSED' ? 'PRE_APPROVED_EXCEPTION' : undefined,
        dismissedReason: status === 'DISMISSED' ? 'Known approved vendor relationship' : undefined,
        dismissedBy: status === 'DISMISSED' ? ctx.complianceOfficerId : undefined,
        dismissedAt: status === 'DISMISSED' ? faker.date.recent({ days: 60 }) : undefined,
      },
    });
  }

  // Create a case involving this entity
  const caseRef = `ETH-${now.getFullYear()}-${String(faker.number.int({ min: 100, max: 999 }))}`;
  await prisma.case.create({
    data: {
      id: generateUUID(),
      organizationId: ctx.organizationId,
      referenceNumber: caseRef,
      sourceChannel: 'WEB_FORM',
      details: `Investigation involving ${entityName} - potential undisclosed vendor relationship`,
      summary: `Vendor relationship investigation - ${entityName}`,
      severity: 'HIGH',
      status: 'CLOSED',
      outcome: 'SUBSTANTIATED',
      createdById: ctx.complianceOfficerId,
      updatedById: ctx.complianceOfficerId,
      createdAt: faker.date.past({ years: 1 }),
    },
  });

  console.log(`  Created entity timeline data for "${entityName}" with ${disclosureIds.length} disclosures`);
}

// ===========================================
// Saved Tables
// ===========================================

/**
 * Creates user-saved table configurations.
 * Per demo checkpoint: 2 saved tables by compliance officer.
 */
async function createSavedTables(
  ctx: AcmeContext
): Promise<void> {
  const tables = [
    {
      name: 'High Value Gifts - Last 90 Days',
      entityType: 'RIUS',
      filters: {
        riuType: 'DISCLOSURE_RESPONSE',
        disclosureType: 'GIFT',
        minValue: 200,
        dateRange: 'last_90_days',
      },
      columns: ['referenceNumber', 'submittedBy', 'relatedCompany', 'disclosureValue', 'status', 'createdAt'],
    },
    {
      name: 'Open Conflicts by Severity',
      entityType: 'CONFLICTS',
      filters: {
        status: 'OPEN',
        sortBy: 'severity',
      },
      columns: ['matchedEntity', 'conflictType', 'severity', 'matchConfidence', 'createdAt'],
    },
  ];

  for (const table of tables) {
    // Only create saved views for supported entity types
    if (table.entityType === 'RIUS') {
      await prisma.savedView.create({
        data: {
          id: generateUUID(),
          organizationId: ctx.organizationId,
          createdById: ctx.complianceOfficerId,
          name: table.name,
          entityType: ViewEntityType.RIUS,
          filters: table.filters as unknown as Prisma.InputJsonValue,
          columns: table.columns as unknown as Prisma.InputJsonValue,
          sortBy: 'createdAt',
          sortOrder: 'desc',
          isDefault: false,
        },
      });
    }
    // Skip CONFLICTS as it's not in ViewEntityType enum
  }

  console.log(`  Created ${tables.length} saved tables for compliance officer`);
}

// ===========================================
// Multi-Wave Campaign
// ===========================================

/**
 * Creates a campaign with multiple waves for staggered delivery demo.
 * Per demo checkpoint: One multi-wave campaign.
 */
async function createMultiWaveCampaign(ctx: AcmeContext): Promise<void> {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 15);

  const campaign = await prisma.campaign.create({
    data: {
      id: generateUUID(),
      organizationId: ctx.organizationId,
      name: 'Q1 Ethics Training Attestation',
      description: 'Mandatory ethics training completion attestation with staggered rollout by department.',
      type: 'ATTESTATION',
      status: 'ACTIVE',
      launchAt: startDate,
      dueDate,
      reminderDays: [7, 3, 1],
      audienceMode: 'SEGMENT',
      rolloutStrategy: 'STAGGERED',
      createdById: ctx.complianceOfficerId,
      updatedById: ctx.complianceOfficerId,
    },
  });

  // Create 3 waves
  const waves = [
    { name: 'Wave 1 - Pilot', percentage: 10, launchOffset: 0 },
    { name: 'Wave 2 - Expansion', percentage: 40, launchOffset: 3 },
    { name: 'Wave 3 - Full Rollout', percentage: 50, launchOffset: 7 },
  ];

  for (let i = 0; i < waves.length; i++) {
    const wave = waves[i];
    const launchDate = new Date(startDate);
    launchDate.setDate(launchDate.getDate() + wave.launchOffset);

    await prisma.campaignWave.create({
      data: {
        id: generateUUID(),
        campaignId: campaign.id,
        organizationId: ctx.organizationId,
        waveNumber: i + 1,
        audiencePercentage: wave.percentage,
        status: i === 0 ? 'LAUNCHED' : 'PENDING',
        scheduledAt: launchDate,
        launchedAt: i === 0 ? launchDate : null,
      },
    });
  }

  console.log(`  Created multi-wave campaign with ${waves.length} waves`);
}

// ===========================================
// Main Seeder
// ===========================================

/**
 * Main seeder function for Phase 9 Acme Co. demo data.
 * Cumulative - adds to existing Acme data.
 */
export async function seedAcmePhase09(): Promise<void> {
  console.log('\n========================================');
  console.log('ACME PHASE 9 SEED - Campaigns & Disclosures');
  console.log('========================================\n');

  // Initialize faker for reproducibility
  faker.seed(20260204);

  // Get Acme organization
  const acmeOrg = await prisma.organization.findFirst({
    where: {
      OR: [
        { slug: 'acme-corp' },
        { name: { contains: 'Acme' } },
      ],
    },
  });

  if (!acmeOrg) {
    console.error('ERROR: Acme organization not found. Run base seed first.');
    return;
  }

  // Get compliance officer user
  const complianceOfficer = await prisma.user.findFirst({
    where: {
      organizationId: acmeOrg.id,
      OR: [
        { email: 'demo-cco@acme.local' },
        { email: { contains: 'compliance' } },
        { role: 'COMPLIANCE_OFFICER' },
      ],
    },
  });

  if (!complianceOfficer) {
    console.error('ERROR: Compliance officer user not found.');
    return;
  }

  // Get employees
  const employees = await prisma.employee.findMany({
    where: { organizationId: acmeOrg.id },
    select: { id: true },
    take: 1000,
  });

  // Get persons
  const persons = await prisma.person.findMany({
    where: { organizationId: acmeOrg.id },
    select: { id: true },
    take: 500,
  });

  // Get categories
  const categories = await prisma.category.findMany({
    where: { organizationId: acmeOrg.id },
    select: { id: true },
    take: 50,
  });

  // Get users
  const users = await prisma.user.findMany({
    where: { organizationId: acmeOrg.id },
    select: { id: true },
  });

  const ctx: AcmeContext = {
    organizationId: acmeOrg.id,
    complianceOfficerId: complianceOfficer.id,
    employeeIds: employees.map((e) => e.id),
    personIds: persons.length > 0 ? persons.map((p) => p.id) : employees.map((e) => e.id),
    categoryIds: categories.map((c) => c.id),
    userIds: users.map((u) => u.id),
  };

  console.log(`Organization: ${acmeOrg.name} (${acmeOrg.id})`);
  console.log(`Compliance Officer: ${complianceOfficer.email}`);
  console.log(`Available employees: ${ctx.employeeIds.length}`);
  console.log(`Available persons: ${ctx.personIds.length}`);
  console.log(`Available categories: ${ctx.categoryIds.length}`);
  console.log('');

  // Run seeders
  console.log('Creating demo data...\n');

  // 1. COI Campaigns (3 years)
  console.log('1. Annual COI Disclosure Campaigns:');
  await createAnnualCoiCampaigns(ctx, [2023, 2024, 2025]);

  // 2. Gift disclosures
  console.log('\n2. Gift Disclosures:');
  await createGiftDisclosures(ctx, {
    underThreshold: 50,
    overThreshold: 5,
  });

  // 3. Outside employment
  console.log('\n3. Outside Employment Disclosures:');
  await createOutsideEmploymentDisclosures(ctx, 10);

  // 4. Repeat non-responders
  console.log('\n4. Non-Responder Tracking:');
  await flagRepeatNonResponders(ctx);

  // 5. Pending conflicts
  console.log('\n5. Pending Conflicts:');
  await createPendingConflicts(ctx, 8);

  // 6. Dismissed conflicts with exclusions
  console.log('\n6. Dismissed Conflicts & Exclusions:');
  await createDismissedConflictsWithExclusions(ctx, 4);

  // 7. Entity timeline
  console.log('\n7. Entity Timeline Data:');
  await createEntityTimelineData(ctx, 'Acme Consulting LLC');

  // 8. Saved tables
  console.log('\n8. Saved Tables:');
  await createSavedTables(ctx);

  // 9. Multi-wave campaign
  console.log('\n9. Multi-Wave Campaign:');
  await createMultiWaveCampaign(ctx);

  console.log('\n========================================');
  console.log('ACME PHASE 9 SEED COMPLETE');
  console.log('========================================\n');
}

// ===========================================
// CLI Entry Point
// ===========================================

async function main(): Promise<void> {
  try {
    await seedAcmePhase09();
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
