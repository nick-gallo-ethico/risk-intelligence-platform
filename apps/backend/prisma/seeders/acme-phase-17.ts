/**
 * Phase 17 Demo Data Seeder - Campaigns Hub
 *
 * Seeds Acme Co. with Phase 17 specific data:
 * - 8-10 campaigns across lifecycle stages (DRAFT, SCHEDULED, ACTIVE, PAUSED, COMPLETED)
 * - Campaign assignments with various statuses for ACTIVE/COMPLETED campaigns
 * - 8 form definitions across multiple form types (DISCLOSURE, ATTESTATION, SURVEY, INTAKE, CUSTOM)
 *
 * Usage:
 *   npx ts-node prisma/seeders/acme-phase-17.ts
 *
 * Or via seed orchestrator:
 *   npm run db:seed
 */

import {
  PrismaClient,
  Prisma,
  CampaignType,
  CampaignStatus,
  AudienceMode,
  AssignmentStatus,
  FormType,
} from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

// ===========================================
// Types
// ===========================================

interface AcmeContext {
  organizationId: string;
  complianceOfficerId: string;
  employeeIds: string[];
  employees: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    departmentName?: string;
  }>;
}

// ===========================================
// Helper Functions
// ===========================================

function generateUUID(): string {
  return faker.string.uuid();
}

function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ===========================================
// Campaign Seeder
// ===========================================

async function seedCampaigns(ctx: AcmeContext): Promise<string[]> {
  const campaignIds: string[] = [];
  const now = new Date();

  console.log("\n1. Creating Campaigns Hub demo campaigns...");

  // Campaign definitions covering all lifecycle stages
  const campaignConfigs = [
    // COMPLETED campaigns (2)
    {
      name: "Q4 2025 Annual COI Disclosure",
      description:
        "Annual conflict of interest disclosure for all employees. Complete by end of year.",
      type: CampaignType.DISCLOSURE,
      status: CampaignStatus.COMPLETED,
      launchAt: new Date(2025, 10, 1), // Nov 1, 2025
      dueDate: new Date(2025, 11, 15), // Dec 15, 2025
      completionRate: 0.92,
    },
    {
      name: "2025 Code of Conduct Attestation",
      description:
        "Annual attestation confirming employees have read and understood the Code of Conduct.",
      type: CampaignType.ATTESTATION,
      status: CampaignStatus.COMPLETED,
      launchAt: new Date(2025, 9, 15), // Oct 15, 2025
      dueDate: new Date(2025, 10, 30), // Nov 30, 2025
      completionRate: 0.88,
    },

    // ACTIVE campaigns (2)
    {
      name: "Q1 2026 Gift & Entertainment Disclosure",
      description:
        "Quarterly gift and entertainment disclosure. Report all gifts received over $50.",
      type: CampaignType.DISCLOSURE,
      status: CampaignStatus.ACTIVE,
      launchAt: new Date(2026, 0, 15), // Jan 15, 2026
      dueDate: new Date(2026, 1, 28), // Feb 28, 2026
      completionRate: 0.45,
      hasOverdue: true,
    },
    {
      name: "Annual Ethics Training Attestation",
      description:
        "Certify completion of required annual ethics training modules.",
      type: CampaignType.ATTESTATION,
      status: CampaignStatus.ACTIVE,
      launchAt: new Date(2026, 0, 20), // Jan 20, 2026
      dueDate: new Date(2026, 2, 15), // Mar 15, 2026
      completionRate: 0.3,
    },

    // PAUSED campaign (1)
    {
      name: "Employee Satisfaction Survey 2026",
      description:
        "Annual employee satisfaction and engagement survey. Anonymous responses encouraged.",
      type: CampaignType.SURVEY,
      status: CampaignStatus.PAUSED,
      launchAt: new Date(2026, 0, 10), // Jan 10, 2026
      dueDate: new Date(2026, 1, 28), // Feb 28, 2026
      completionRate: 0.15,
      statusNote: "Paused pending HR review of survey questions",
    },

    // SCHEDULED campaign (1)
    {
      name: "Q2 2026 Outside Employment Review",
      description:
        "Quarterly review of outside employment and business interests declarations.",
      type: CampaignType.DISCLOSURE,
      status: CampaignStatus.SCHEDULED,
      launchAt: new Date(2026, 2, 1), // Mar 1, 2026
      dueDate: new Date(2026, 3, 15), // Apr 15, 2026
      completionRate: 0,
    },

    // DRAFT campaigns (2)
    {
      name: "New Hire Onboarding Campaign",
      description:
        "Onboarding attestation campaign for new hires. Includes policy acknowledgments and training certifications.",
      type: CampaignType.ATTESTATION,
      status: CampaignStatus.DRAFT,
      launchAt: null,
      dueDate: addDays(now, 60),
      completionRate: 0,
    },
    {
      name: "Whistleblower Policy Acknowledgment",
      description:
        "Campaign to confirm all employees have read and understood the updated whistleblower protection policy.",
      type: CampaignType.ATTESTATION,
      status: CampaignStatus.DRAFT,
      launchAt: null,
      dueDate: addDays(now, 45),
      completionRate: 0,
    },
  ];

  for (const config of campaignConfigs) {
    // Check if campaign already exists
    const existing = await prisma.campaign.findFirst({
      where: {
        organizationId: ctx.organizationId,
        name: config.name,
      },
    });

    if (existing) {
      console.log(`  - Campaign already exists: ${config.name}`);
      campaignIds.push(existing.id);
      continue;
    }

    // Calculate assignment counts based on completion rate
    const totalAssignments =
      config.status === CampaignStatus.DRAFT ||
      config.status === CampaignStatus.SCHEDULED
        ? 0
        : randomBetween(20, 30);
    const completedAssignments = Math.floor(
      totalAssignments * config.completionRate,
    );
    const overdueAssignments =
      config.hasOverdue && config.status === CampaignStatus.ACTIVE
        ? Math.floor(totalAssignments * 0.1) // 10% overdue
        : config.status === CampaignStatus.COMPLETED
          ? totalAssignments - completedAssignments
          : 0;

    const campaign = await prisma.campaign.create({
      data: {
        id: generateUUID(),
        organizationId: ctx.organizationId,
        name: config.name,
        description: config.description,
        type: config.type,
        status: config.status,
        statusNote: config.statusNote,
        audienceMode: AudienceMode.ALL,
        launchAt: config.launchAt,
        launchedAt:
          config.status === CampaignStatus.ACTIVE ||
          config.status === CampaignStatus.COMPLETED ||
          config.status === CampaignStatus.PAUSED
            ? config.launchAt
            : null,
        dueDate: config.dueDate,
        reminderDays: [7, 3, 1],
        totalAssignments,
        completedAssignments,
        overdueAssignments,
        completionPercentage:
          totalAssignments > 0
            ? Math.round((completedAssignments / totalAssignments) * 100)
            : 0,
        createdById: ctx.complianceOfficerId,
        updatedById: ctx.complianceOfficerId,
        createdAt: subDays(config.launchAt || now, 7),
      },
    });

    campaignIds.push(campaign.id);
    console.log(
      `  + Created campaign: ${config.name} (${config.status}, ${totalAssignments} assignments)`,
    );

    // Create assignments for ACTIVE, PAUSED, and COMPLETED campaigns
    const hasAssignments =
      config.status === CampaignStatus.ACTIVE ||
      config.status === CampaignStatus.PAUSED ||
      config.status === CampaignStatus.COMPLETED;

    if (totalAssignments > 0 && hasAssignments) {
      const selectedEmployees = faker.helpers
        .shuffle(ctx.employees)
        .slice(0, totalAssignments);

      for (let i = 0; i < selectedEmployees.length; i++) {
        const emp = selectedEmployees[i];
        const isCompleted = i < completedAssignments;
        const isOverdue =
          !isCompleted && i < completedAssignments + overdueAssignments;

        let status: AssignmentStatus;
        if (isCompleted) {
          status = AssignmentStatus.COMPLETED;
        } else if (isOverdue) {
          status = AssignmentStatus.OVERDUE;
        } else if (config.status === CampaignStatus.COMPLETED) {
          status = AssignmentStatus.OVERDUE;
        } else if (Math.random() > 0.7) {
          status = AssignmentStatus.IN_PROGRESS;
        } else if (Math.random() > 0.5) {
          status = AssignmentStatus.NOTIFIED;
        } else {
          status = AssignmentStatus.PENDING;
        }

        const assignedAt = config.launchAt || now;
        const completedAt = isCompleted
          ? faker.date.between({
              from: assignedAt,
              to: config.dueDate,
            })
          : null;

        await prisma.campaignAssignment.create({
          data: {
            id: generateUUID(),
            organizationId: ctx.organizationId,
            campaignId: campaign.id,
            employeeId: emp.id,
            status,
            assignedAt,
            dueDate: config.dueDate,
            completedAt,
            notifiedAt: status !== AssignmentStatus.PENDING ? assignedAt : null,
            reminderCount: isOverdue
              ? randomBetween(3, 5)
              : isCompleted
                ? 0
                : randomBetween(0, 2),
            employeeSnapshot: {
              name: `${emp.firstName} ${emp.lastName}`,
              email: emp.email,
              department: emp.departmentName || "General",
            } as unknown as Prisma.InputJsonValue,
          },
        });
      }
      console.log(
        `    - Created ${totalAssignments} assignments (${completedAssignments} completed, ${overdueAssignments} overdue)`,
      );
    }
  }

  return campaignIds;
}

// ===========================================
// Form Definition Seeder
// ===========================================

async function seedFormDefinitions(ctx: AcmeContext): Promise<string[]> {
  const formIds: string[] = [];

  console.log("\n2. Creating Form definitions...");

  const formConfigs = [
    {
      name: "Conflict of Interest Disclosure Form",
      description:
        "Annual disclosure form for reporting potential conflicts of interest including outside employment, investments, and family relationships.",
      formType: FormType.DISCLOSURE,
      isPublished: true,
      version: 3,
      schema: {
        sections: [
          {
            title: "Personal Information",
            fields: [
              {
                name: "employeeName",
                type: "text",
                label: "Employee Name",
                required: true,
              },
              {
                name: "department",
                type: "text",
                label: "Department",
                required: true,
              },
              {
                name: "reportingTo",
                type: "text",
                label: "Reporting Manager",
                required: true,
              },
            ],
          },
          {
            title: "Conflict Declaration",
            fields: [
              {
                name: "hasConflict",
                type: "radio",
                label: "Do you have any conflicts of interest to disclose?",
                options: ["Yes", "No"],
                required: true,
              },
              {
                name: "conflictDetails",
                type: "textarea",
                label: "If yes, describe the conflict",
                required: false,
              },
              {
                name: "mitigationPlan",
                type: "textarea",
                label: "Proposed mitigation plan",
                required: false,
              },
            ],
          },
        ],
      },
    },
    {
      name: "Annual Gift & Entertainment Form",
      description:
        "Report gifts, meals, and entertainment received from business partners or vendors.",
      formType: FormType.DISCLOSURE,
      isPublished: true,
      version: 2,
      schema: {
        sections: [
          {
            title: "Gift Details",
            fields: [
              {
                name: "giftType",
                type: "select",
                label: "Type of Gift",
                options: ["Meal", "Gift", "Entertainment", "Travel"],
                required: true,
              },
              {
                name: "giftValue",
                type: "number",
                label: "Estimated Value ($)",
                required: true,
              },
              {
                name: "giftDate",
                type: "date",
                label: "Date Received",
                required: true,
              },
              {
                name: "giverName",
                type: "text",
                label: "Name of Giver",
                required: true,
              },
              {
                name: "giverCompany",
                type: "text",
                label: "Company/Organization",
                required: true,
              },
            ],
          },
        ],
      },
    },
    {
      name: "Code of Conduct Attestation",
      description:
        "Annual attestation form confirming employee acknowledgment of the Code of Conduct.",
      formType: FormType.ATTESTATION,
      isPublished: true,
      version: 1,
      schema: {
        sections: [
          {
            title: "Acknowledgment",
            fields: [
              {
                name: "hasRead",
                type: "checkbox",
                label: "I have read and understood the Code of Conduct",
                required: true,
              },
              {
                name: "willComply",
                type: "checkbox",
                label: "I agree to comply with all provisions",
                required: true,
              },
              {
                name: "questions",
                type: "textarea",
                label: "Questions or concerns (optional)",
                required: false,
              },
            ],
          },
        ],
      },
    },
    {
      name: "Ethics Training Completion",
      description: "Certification form for annual ethics training completion.",
      formType: FormType.ATTESTATION,
      isPublished: true,
      version: 1,
      schema: {
        sections: [
          {
            title: "Training Certification",
            fields: [
              {
                name: "completedTraining",
                type: "checkbox",
                label: "I have completed the required ethics training",
                required: true,
              },
              {
                name: "completionDate",
                type: "date",
                label: "Completion Date",
                required: true,
              },
              {
                name: "feedback",
                type: "textarea",
                label: "Training feedback (optional)",
                required: false,
              },
            ],
          },
        ],
      },
    },
    {
      name: "Employee Satisfaction Survey",
      description:
        "Annual survey to measure employee satisfaction and engagement.",
      formType: FormType.SURVEY,
      isPublished: false, // Draft
      version: 1,
      schema: {
        sections: [
          {
            title: "Job Satisfaction",
            fields: [
              {
                name: "overallSatisfaction",
                type: "rating",
                label: "Overall job satisfaction (1-5)",
                required: true,
              },
              {
                name: "workLifeBalance",
                type: "rating",
                label: "Work-life balance (1-5)",
                required: true,
              },
              {
                name: "growthOpportunities",
                type: "rating",
                label: "Growth opportunities (1-5)",
                required: true,
              },
            ],
          },
          {
            title: "Open Feedback",
            fields: [
              {
                name: "improvements",
                type: "textarea",
                label: "What could we improve?",
                required: false,
              },
              {
                name: "positives",
                type: "textarea",
                label: "What do you enjoy most?",
                required: false,
              },
            ],
          },
        ],
      },
    },
    {
      name: "New Hire Intake Form",
      description:
        "Initial intake form for new employee onboarding information.",
      formType: FormType.INTAKE,
      isPublished: true,
      version: 2,
      schema: {
        sections: [
          {
            title: "Personal Information",
            fields: [
              {
                name: "fullName",
                type: "text",
                label: "Full Legal Name",
                required: true,
              },
              {
                name: "preferredName",
                type: "text",
                label: "Preferred Name",
                required: false,
              },
              {
                name: "startDate",
                type: "date",
                label: "Start Date",
                required: true,
              },
            ],
          },
          {
            title: "Emergency Contact",
            fields: [
              {
                name: "emergencyName",
                type: "text",
                label: "Emergency Contact Name",
                required: true,
              },
              {
                name: "emergencyPhone",
                type: "text",
                label: "Emergency Contact Phone",
                required: true,
              },
              {
                name: "emergencyRelation",
                type: "text",
                label: "Relationship",
                required: true,
              },
            ],
          },
        ],
      },
    },
    {
      name: "Whistleblower Report Form",
      description:
        "Form for submitting concerns about potential ethical violations.",
      formType: FormType.CUSTOM,
      isPublished: false, // Draft
      version: 1,
      schema: {
        sections: [
          {
            title: "Report Details",
            fields: [
              {
                name: "reportType",
                type: "select",
                label: "Type of Concern",
                options: ["Fraud", "Harassment", "Safety", "Ethics", "Other"],
                required: true,
              },
              {
                name: "description",
                type: "textarea",
                label: "Detailed Description",
                required: true,
              },
              {
                name: "dateOccurred",
                type: "date",
                label: "Date of Incident",
                required: false,
              },
              {
                name: "personsInvolved",
                type: "textarea",
                label: "Persons Involved",
                required: false,
              },
              {
                name: "isAnonymous",
                type: "checkbox",
                label: "Submit anonymously",
                required: false,
              },
            ],
          },
        ],
      },
    },
    {
      name: "Outside Employment Declaration",
      description:
        "Declaration form for reporting outside employment and business interests.",
      formType: FormType.DISCLOSURE,
      isPublished: true,
      version: 1,
      schema: {
        sections: [
          {
            title: "Outside Employment Details",
            fields: [
              {
                name: "hasOutsideEmployment",
                type: "radio",
                label: "Do you have outside employment?",
                options: ["Yes", "No"],
                required: true,
              },
              {
                name: "employerName",
                type: "text",
                label: "Employer Name",
                required: false,
              },
              {
                name: "position",
                type: "text",
                label: "Position/Role",
                required: false,
              },
              {
                name: "hoursPerWeek",
                type: "number",
                label: "Estimated Hours Per Week",
                required: false,
              },
              {
                name: "competitorRelation",
                type: "radio",
                label: "Is this employer a competitor?",
                options: ["Yes", "No", "Unsure"],
                required: false,
              },
            ],
          },
        ],
      },
    },
  ];

  for (const config of formConfigs) {
    // Check if form already exists
    const existing = await prisma.formDefinition.findFirst({
      where: {
        organizationId: ctx.organizationId,
        name: config.name,
      },
    });

    if (existing) {
      console.log(`  - Form already exists: ${config.name}`);
      formIds.push(existing.id);
      continue;
    }

    const form = await prisma.formDefinition.create({
      data: {
        id: generateUUID(),
        organizationId: ctx.organizationId,
        name: config.name,
        description: config.description,
        formType: config.formType,
        version: config.version,
        isActive: true,
        isPublished: config.isPublished,
        publishedAt: config.isPublished ? subDays(new Date(), 30) : null,
        schema: config.schema as unknown as Prisma.InputJsonValue,
        createdById: ctx.complianceOfficerId,
      },
    });

    formIds.push(form.id);
    console.log(
      `  + Created form: ${config.name} (${config.formType}, v${config.version}, ${config.isPublished ? "PUBLISHED" : "DRAFT"})`,
    );
  }

  return formIds;
}

// ===========================================
// Main Seeder
// ===========================================

/**
 * Main seeder function for Phase 17 Acme Co. demo data.
 * Cumulative - adds to existing Acme data.
 */
export async function seedPhase17(): Promise<void> {
  console.log("\n========================================");
  console.log("ACME PHASE 17 SEED - Campaigns Hub");
  console.log("========================================\n");

  // Initialize faker for reproducibility
  faker.seed(20260217);

  // Get Acme organization
  const acmeOrg = await prisma.organization.findFirst({
    where: {
      OR: [{ slug: "acme-corp" }, { name: { contains: "Acme" } }],
    },
  });

  if (!acmeOrg) {
    console.error("ERROR: Acme organization not found. Run base seed first.");
    return;
  }

  console.log(`Found Acme organization: ${acmeOrg.name} (${acmeOrg.id})`);

  // Get compliance officer user
  const complianceOfficer = await prisma.user.findFirst({
    where: {
      organizationId: acmeOrg.id,
      OR: [
        { email: "demo-cco@acme.local" },
        { email: { contains: "compliance" } },
        { role: "COMPLIANCE_OFFICER" },
      ],
    },
  });

  if (!complianceOfficer) {
    console.error("ERROR: Compliance officer user not found.");
    return;
  }

  console.log(`Compliance Officer: ${complianceOfficer.email}`);

  // Get employees with details for assignments
  const employees = await prisma.employee.findMany({
    where: { organizationId: acmeOrg.id, employmentStatus: "ACTIVE" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      department: true, // String field, not a relation
    },
    take: 100, // Limit for demo
  });

  console.log(`Available employees: ${employees.length}`);

  const ctx: AcmeContext = {
    organizationId: acmeOrg.id,
    complianceOfficerId: complianceOfficer.id,
    employeeIds: employees.map((e) => e.id),
    employees: employees.map((e) => ({
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      departmentName: e.department || undefined,
    })),
  };

  // Seed campaigns and assignments
  const campaignIds = await seedCampaigns(ctx);

  // Seed form definitions
  const formIds = await seedFormDefinitions(ctx);

  console.log("\n========================================");
  console.log("ACME PHASE 17 SEED COMPLETE");
  console.log("========================================");
  console.log(`\nSummary:`);
  console.log(`  - Campaigns created/existing: ${campaignIds.length}`);
  console.log(`  - Form definitions created/existing: ${formIds.length}`);
  console.log("========================================\n");
}

// Run if executed directly
if (require.main === module) {
  seedPhase17()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
