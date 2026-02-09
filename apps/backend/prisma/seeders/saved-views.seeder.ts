/**
 * Saved Views Seeder
 *
 * Seeds default saved views for all modules in the demo tenant.
 * Creates views that demonstrate the HubSpot-style saved views system.
 *
 * Views are created with:
 * - Realistic column configurations from module configs
 * - Filter presets for common use cases
 * - Both table and board view modes
 * - Shared visibility so all demo users can see them
 */

import { PrismaClient, ViewEntityType } from "@prisma/client";

interface DefaultView {
  name: string;
  description?: string;
  entityType: ViewEntityType;
  columns: string[];
  frozenColumnCount: number;
  filters: object[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  viewMode: "table" | "board";
  boardGroupBy?: string;
  isDefault: boolean;
}

/**
 * Default views for all modules.
 * Each module has at least 3 views: All items, filtered variant, and board view.
 */
const DEFAULT_VIEWS: DefaultView[] = [
  // ============================================================
  // CASES MODULE
  // ============================================================
  {
    name: "All Cases",
    description: "All cases sorted by creation date",
    entityType: ViewEntityType.CASES,
    columns: [
      "referenceNumber",
      "summary",
      "status",
      "severity",
      "primaryCategory",
      "createdBy",
      "createdAt",
    ],
    frozenColumnCount: 1,
    filters: [],
    sortBy: "createdAt",
    sortOrder: "desc",
    viewMode: "table",
    isDefault: true,
  },
  {
    name: "Open Cases",
    description: "All new and open cases",
    entityType: ViewEntityType.CASES,
    columns: [
      "referenceNumber",
      "summary",
      "severity",
      "primaryCategory",
      "createdBy",
      "dueDate",
    ],
    frozenColumnCount: 1,
    filters: [
      {
        id: "open-filter",
        conditions: [
          {
            id: "1",
            propertyId: "status",
            operator: "is_any_of",
            value: ["NEW", "OPEN"],
          },
        ],
      },
    ],
    sortBy: "severity",
    sortOrder: "desc",
    viewMode: "table",
    isDefault: false,
  },
  {
    name: "High Severity Cases",
    description: "High severity cases requiring attention",
    entityType: ViewEntityType.CASES,
    columns: [
      "referenceNumber",
      "summary",
      "status",
      "createdBy",
      "createdAt",
      "dueDate",
    ],
    frozenColumnCount: 1,
    filters: [
      {
        id: "high-severity",
        conditions: [
          {
            id: "1",
            propertyId: "severity",
            operator: "is",
            value: "HIGH",
          },
        ],
      },
    ],
    sortBy: "createdAt",
    sortOrder: "desc",
    viewMode: "table",
    isDefault: false,
  },
  {
    name: "Case Pipeline",
    description: "Kanban board view of cases by status",
    entityType: ViewEntityType.CASES,
    columns: ["referenceNumber", "summary", "severity", "createdBy"],
    frozenColumnCount: 0,
    filters: [],
    sortBy: "status",
    sortOrder: "asc",
    viewMode: "board",
    boardGroupBy: "status",
    isDefault: false,
  },

  // ============================================================
  // INVESTIGATIONS MODULE
  // ============================================================
  {
    name: "All Investigations",
    description: "All investigations sorted by start date",
    entityType: ViewEntityType.INVESTIGATIONS,
    columns: [
      "investigationNumber",
      "title",
      "stage",
      "type",
      "leadInvestigator",
      "startedAt",
    ],
    frozenColumnCount: 1,
    filters: [],
    sortBy: "startedAt",
    sortOrder: "desc",
    viewMode: "table",
    isDefault: true,
  },
  {
    name: "Active Investigations",
    description: "All non-closed investigations",
    entityType: ViewEntityType.INVESTIGATIONS,
    columns: [
      "investigationNumber",
      "title",
      "stage",
      "leadInvestigator",
      "targetEndDate",
      "checklistProgress",
    ],
    frozenColumnCount: 1,
    filters: [
      {
        id: "active",
        conditions: [
          {
            id: "1",
            propertyId: "stage",
            operator: "is_none_of",
            value: ["closed"],
          },
        ],
      },
    ],
    sortBy: "targetEndDate",
    sortOrder: "asc",
    viewMode: "table",
    isDefault: false,
  },
  {
    name: "Investigation Board",
    description: "Kanban board view of investigations by stage",
    entityType: ViewEntityType.INVESTIGATIONS,
    columns: ["investigationNumber", "title", "leadInvestigator"],
    frozenColumnCount: 0,
    filters: [],
    viewMode: "board",
    boardGroupBy: "stage",
    isDefault: false,
  },

  // ============================================================
  // POLICIES MODULE
  // ============================================================
  {
    name: "All Policies",
    description: "All policies sorted by title",
    entityType: ViewEntityType.POLICIES,
    columns: [
      "policyNumber",
      "title",
      "status",
      "category",
      "owner",
      "effectiveDate",
      "version",
    ],
    frozenColumnCount: 1,
    filters: [],
    sortBy: "title",
    sortOrder: "asc",
    viewMode: "table",
    isDefault: true,
  },
  {
    name: "Published Policies",
    description: "All currently published policies",
    entityType: ViewEntityType.POLICIES,
    columns: [
      "policyNumber",
      "title",
      "category",
      "owner",
      "publishedAt",
      "attestationRate",
    ],
    frozenColumnCount: 1,
    filters: [
      {
        id: "published",
        conditions: [
          { id: "1", propertyId: "status", operator: "is", value: "published" },
        ],
      },
    ],
    sortBy: "publishedAt",
    sortOrder: "desc",
    viewMode: "table",
    isDefault: false,
  },
  {
    name: "Review Needed",
    description: "Policies due for review in the next 30 days",
    entityType: ViewEntityType.POLICIES,
    columns: [
      "policyNumber",
      "title",
      "category",
      "owner",
      "nextReviewDate",
      "lastReviewDate",
    ],
    frozenColumnCount: 1,
    filters: [
      {
        id: "review-needed",
        conditions: [
          {
            id: "1",
            propertyId: "nextReviewDate",
            operator: "is_less_than_n_ago",
            value: 30,
            unit: "day",
          },
        ],
      },
    ],
    sortBy: "nextReviewDate",
    sortOrder: "asc",
    viewMode: "table",
    isDefault: false,
  },

  // ============================================================
  // DISCLOSURES MODULE
  // ============================================================
  {
    name: "All Disclosures",
    description: "All disclosures sorted by submission date",
    entityType: ViewEntityType.DISCLOSURES,
    columns: [
      "disclosureNumber",
      "type",
      "status",
      "riskLevel",
      "submitter",
      "submittedAt",
    ],
    frozenColumnCount: 1,
    filters: [],
    sortBy: "submittedAt",
    sortOrder: "desc",
    viewMode: "table",
    isDefault: true,
  },
  {
    name: "Pending Review",
    description: "Disclosures awaiting review",
    entityType: ViewEntityType.DISCLOSURES,
    columns: [
      "disclosureNumber",
      "type",
      "riskLevel",
      "submitter",
      "submittedAt",
    ],
    frozenColumnCount: 1,
    filters: [
      {
        id: "pending",
        conditions: [
          {
            id: "1",
            propertyId: "status",
            operator: "is",
            value: "pending_review",
          },
        ],
      },
    ],
    sortBy: "riskLevel",
    sortOrder: "desc",
    viewMode: "table",
    isDefault: false,
  },
  {
    name: "High Risk Disclosures",
    description: "High risk disclosures requiring attention",
    entityType: ViewEntityType.DISCLOSURES,
    columns: [
      "disclosureNumber",
      "type",
      "status",
      "submitter",
      "thirdParty",
      "giftValue",
    ],
    frozenColumnCount: 1,
    filters: [
      {
        id: "high-risk",
        conditions: [
          { id: "1", propertyId: "riskLevel", operator: "is", value: "high" },
        ],
      },
    ],
    sortBy: "submittedAt",
    sortOrder: "desc",
    viewMode: "table",
    isDefault: false,
  },

  // ============================================================
  // INTAKE FORMS MODULE
  // ============================================================
  {
    name: "All Submissions",
    description: "All intake form submissions sorted by date",
    entityType: ViewEntityType.INTAKE_FORMS,
    columns: [
      "submissionId",
      "formName",
      "formType",
      "status",
      "submitter",
      "submittedAt",
    ],
    frozenColumnCount: 1,
    filters: [],
    sortBy: "submittedAt",
    sortOrder: "desc",
    viewMode: "table",
    isDefault: true,
  },
  {
    name: "Pending Review",
    description: "Submissions awaiting review or processing",
    entityType: ViewEntityType.INTAKE_FORMS,
    columns: [
      "submissionId",
      "formName",
      "formType",
      "submitter",
      "submittedAt",
      "assignee",
    ],
    frozenColumnCount: 1,
    filters: [
      {
        id: "pending",
        conditions: [
          {
            id: "1",
            propertyId: "status",
            operator: "is_any_of",
            value: ["submitted", "in_review"],
          },
        ],
      },
    ],
    sortBy: "submittedAt",
    sortOrder: "asc",
    viewMode: "table",
    isDefault: false,
  },
  {
    name: "Anonymous Reports",
    description: "All anonymous submissions",
    entityType: ViewEntityType.INTAKE_FORMS,
    columns: [
      "submissionId",
      "formType",
      "status",
      "submittedAt",
      "aiCategory",
      "aiPriority",
    ],
    frozenColumnCount: 1,
    filters: [
      {
        id: "anonymous",
        conditions: [
          { id: "1", propertyId: "isAnonymous", operator: "is_true" },
        ],
      },
    ],
    sortBy: "submittedAt",
    sortOrder: "desc",
    viewMode: "table",
    isDefault: false,
  },
];

/**
 * Seed default saved views for a demo organization.
 *
 * Creates a set of default views for all modules to demonstrate
 * the saved views system functionality. Views are created as shared
 * so all demo users can access them.
 *
 * @param prisma - Prisma client instance
 * @param organizationId - The organization to seed views for
 */
export async function seedSavedViews(
  prisma: PrismaClient,
  organizationId: string,
): Promise<void> {
  console.log("Seeding default saved views...");

  // Get a system user for created_by (use first admin)
  const systemUser = await prisma.user.findFirst({
    where: { organizationId, role: "SYSTEM_ADMIN" },
  });

  if (!systemUser) {
    console.log("  No system admin found, skipping saved views seeding");
    return;
  }

  let displayOrder = 0;
  let createdCount = 0;
  let skippedCount = 0;

  for (const view of DEFAULT_VIEWS) {
    // Check if view already exists
    const existingView = await prisma.savedView.findFirst({
      where: {
        organizationId,
        entityType: view.entityType,
        name: view.name,
        createdById: systemUser.id,
      },
    });

    if (!existingView) {
      await prisma.savedView.create({
        data: {
          organizationId,
          entityType: view.entityType,
          name: view.name,
          description: view.description || null,
          createdById: systemUser.id,
          isShared: true, // Shared so all demo users can see
          columns: view.columns,
          frozenColumnCount: view.frozenColumnCount,
          filters: view.filters,
          sortBy: view.sortBy || null,
          sortOrder: view.sortOrder || null,
          viewMode: view.viewMode,
          boardGroupBy: view.boardGroupBy || null,
          displayOrder: displayOrder++,
          isDefault: view.isDefault,
          isPinned: view.isDefault, // Default views are also pinned
        },
      });
      console.log(`  Created view: ${view.name} (${view.entityType})`);
      createdCount++;
    } else {
      console.log(`  View already exists: ${view.name} (${view.entityType})`);
      skippedCount++;
    }
  }

  console.log(
    `Saved views seeding complete: ${createdCount} created, ${skippedCount} skipped (already exist)`,
  );
}

/**
 * Get count of default views by entity type.
 * Useful for verification.
 */
export function getDefaultViewStats(): Record<ViewEntityType, number> {
  const stats = {} as Record<ViewEntityType, number>;

  for (const view of DEFAULT_VIEWS) {
    stats[view.entityType] = (stats[view.entityType] || 0) + 1;
  }

  return stats;
}

// Export the views array for testing
export { DEFAULT_VIEWS };
