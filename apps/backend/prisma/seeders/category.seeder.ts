/**
 * Category Seeder
 *
 * Creates hierarchical taxonomy for case classification in the demo tenant.
 * Categories provide the classification structure required for RIU and Case seeding.
 *
 * Hierarchy:
 * - Parent categories (level 0) define major compliance areas
 * - Child categories (level 1) provide specific violation types
 *
 * Each category includes:
 * - Severity defaults based on compliance risk level
 * - SLA days for resolution targets
 * - Investigation requirements
 */

import { PrismaClient, CategoryModule, Severity } from '@prisma/client';
import { faker } from '@faker-js/faker';

// Seed offset for reproducibility (masterSeed + 100 as per plan)
const SEED_OFFSET = 100;

// Master seed from research config
const SEED_CONFIG = {
  masterSeed: 20260202,
};

/**
 * Category definition type for seeding
 */
interface CategoryDefinition {
  name: string;
  code: string;
  description: string;
  severityDefault: Severity;
  slaDays: number;
  requiresInvestigation: boolean;
  children?: Omit<CategoryDefinition, 'children' | 'severityDefault' | 'slaDays' | 'requiresInvestigation'>[];
}

/**
 * Compliance category taxonomy
 * Based on industry-standard compliance categories for ethics hotlines and case management
 */
const CATEGORY_TAXONOMY: CategoryDefinition[] = [
  {
    name: 'Harassment',
    code: 'HAR',
    description: 'Workplace harassment including sexual harassment, discrimination, bullying, and hostile work environment',
    severityDefault: Severity.HIGH,
    slaDays: 14,
    requiresInvestigation: true,
    children: [
      {
        name: 'Sexual Harassment',
        code: 'HAR-SEX',
        description: 'Unwelcome sexual advances, requests for sexual favors, and other verbal or physical conduct of a sexual nature',
      },
      {
        name: 'Discriminatory Harassment',
        code: 'HAR-DIS',
        description: 'Harassment based on protected characteristics including race, religion, age, gender, disability, or national origin',
      },
      {
        name: 'Bullying/Hostile Work Environment',
        code: 'HAR-BUL',
        description: 'Repeated mistreatment, threatening behavior, or intimidation that creates an abusive work environment',
      },
      {
        name: 'Retaliation',
        code: 'HAR-RET',
        description: 'Adverse action taken against an employee for engaging in protected activity such as reporting misconduct',
      },
    ],
  },
  {
    name: 'Fraud & Financial',
    code: 'FIN',
    description: 'Financial misconduct including fraud, embezzlement, and misappropriation of company assets',
    severityDefault: Severity.HIGH,
    slaDays: 21,
    requiresInvestigation: true,
    children: [
      {
        name: 'Financial Fraud',
        code: 'FIN-FRD',
        description: 'Intentional deception for financial gain including falsifying records, embezzlement, or misrepresentation',
      },
      {
        name: 'Expense Fraud',
        code: 'FIN-EXP',
        description: 'Submission of false or inflated expense reports, duplicate reimbursement requests, or personal expense claims',
      },
      {
        name: 'Vendor/Supplier Fraud',
        code: 'FIN-VEN',
        description: 'Kickbacks, bid rigging, fictitious vendors, or collusion with external parties',
      },
      {
        name: 'Time & Attendance Fraud',
        code: 'FIN-TIM',
        description: 'Falsifying time records, buddy punching, or claiming pay for unworked hours',
      },
    ],
  },
  {
    name: 'Conflicts of Interest',
    code: 'COI',
    description: 'Situations where personal interests could influence or appear to influence business decisions',
    severityDefault: Severity.MEDIUM,
    slaDays: 30,
    requiresInvestigation: true,
    children: [
      {
        name: 'Personal Relationships',
        code: 'COI-REL',
        description: 'Undisclosed personal or family relationships affecting hiring, supervision, or business decisions',
      },
      {
        name: 'Outside Business Interests',
        code: 'COI-BUS',
        description: 'Employment, consulting, or ownership interests in competitors, vendors, or customers',
      },
      {
        name: 'Gifts & Entertainment',
        code: 'COI-GIF',
        description: 'Receipt or provision of gifts, meals, or entertainment that could influence business decisions',
      },
      {
        name: 'Board Memberships',
        code: 'COI-BRD',
        description: 'Service on external boards or advisory roles that may conflict with company interests',
      },
    ],
  },
  {
    name: 'Safety & Health',
    code: 'SAF',
    description: 'Workplace safety violations, environmental concerns, and health-related issues',
    severityDefault: Severity.HIGH,
    slaDays: 7,
    requiresInvestigation: true,
    children: [
      {
        name: 'Workplace Safety Violations',
        code: 'SAF-WRK',
        description: 'OSHA violations, unsafe working conditions, failure to follow safety protocols',
      },
      {
        name: 'Environmental Violations',
        code: 'SAF-ENV',
        description: 'Improper disposal of hazardous materials, emissions violations, or environmental damage',
      },
      {
        name: 'Product Safety Concerns',
        code: 'SAF-PRD',
        description: 'Defective products, undisclosed safety issues, or quality control failures',
      },
      {
        name: 'COVID-19/Infectious Disease',
        code: 'SAF-INF',
        description: 'Infectious disease protocol violations, exposure concerns, or inadequate protective measures',
      },
    ],
  },
  {
    name: 'Data & Privacy',
    code: 'DAT',
    description: 'Data security breaches, privacy violations, and unauthorized access to information',
    severityDefault: Severity.MEDIUM,
    slaDays: 21,
    requiresInvestigation: true,
    children: [
      {
        name: 'Data Breach',
        code: 'DAT-BRE',
        description: 'Unauthorized access, disclosure, or theft of sensitive data or personal information',
      },
      {
        name: 'Unauthorized Access',
        code: 'DAT-ACC',
        description: 'Accessing systems, files, or data without proper authorization or business need',
      },
      {
        name: 'HIPAA Violations',
        code: 'DAT-HIP',
        description: 'Violations of protected health information requirements under HIPAA regulations',
      },
      {
        name: 'Privacy Concerns',
        code: 'DAT-PRI',
        description: 'Improper collection, use, or disclosure of personal information',
      },
    ],
  },
  {
    name: 'Policy Violations',
    code: 'POL',
    description: 'Violations of company policies not covered by other categories',
    severityDefault: Severity.LOW,
    slaDays: 30,
    requiresInvestigation: true,
    children: [
      {
        name: 'HR Policy Violations',
        code: 'POL-HR',
        description: 'Violations of human resources policies including attendance, conduct, or documentation requirements',
      },
      {
        name: 'IT Policy Violations',
        code: 'POL-IT',
        description: 'Misuse of technology resources, unauthorized software, or violation of acceptable use policies',
      },
      {
        name: 'Travel & Expense Violations',
        code: 'POL-TRV',
        description: 'Non-compliance with travel policies, booking requirements, or expense documentation',
      },
      {
        name: 'General Misconduct',
        code: 'POL-MIS',
        description: 'Other policy violations or unprofessional conduct not fitting other categories',
      },
    ],
  },
  {
    name: 'Request for Information',
    code: 'RFI',
    description: 'General inquiries about policies, procedures, or compliance requirements',
    severityDefault: Severity.LOW,
    slaDays: 14,
    requiresInvestigation: false,
    children: [
      {
        name: 'General RFI',
        code: 'RFI-GEN',
        description: 'General questions or requests for guidance on compliance matters',
      },
    ],
  },
];

/**
 * Generate a slug from category name for the materialized path
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Seed categories for a demo tenant
 *
 * @param prisma - Prisma client instance
 * @param organizationId - Organization ID to seed categories for
 * @returns Map of category name to category ID for later use in seeding
 */
export async function seedCategories(
  prisma: PrismaClient,
  organizationId: string,
): Promise<Map<string, string>> {
  // Initialize faker with deterministic seed
  faker.seed(SEED_CONFIG.masterSeed + SEED_OFFSET);

  const categoryMap = new Map<string, string>();
  let sortOrder = 0;

  // First pass: Create all parent categories
  const parentCategories: Array<{
    id: string;
    name: string;
    code: string;
    description: string;
    organizationId: string;
    parentCategoryId: string | null;
    level: number;
    path: string;
    module: CategoryModule;
    severityDefault: Severity;
    slaDays: number;
    requiresInvestigation: boolean;
    sortOrder: number;
    isActive: boolean;
    isSystem: boolean;
  }> = [];

  for (const categoryDef of CATEGORY_TAXONOMY) {
    const categoryId = faker.string.uuid();
    const slug = generateSlug(categoryDef.name);

    parentCategories.push({
      id: categoryId,
      name: categoryDef.name,
      code: categoryDef.code,
      description: categoryDef.description,
      organizationId,
      parentCategoryId: null,
      level: 0,
      path: `/${slug}`,
      module: CategoryModule.CASE,
      severityDefault: categoryDef.severityDefault,
      slaDays: categoryDef.slaDays,
      requiresInvestigation: categoryDef.requiresInvestigation,
      sortOrder: sortOrder++,
      isActive: true,
      isSystem: false,
    });

    categoryMap.set(categoryDef.name, categoryId);
  }

  // Insert parent categories
  await prisma.category.createMany({
    data: parentCategories,
    skipDuplicates: true,
  });

  console.log(`  Created ${parentCategories.length} parent categories`);

  // Second pass: Create all child categories
  const childCategories: Array<{
    id: string;
    name: string;
    code: string;
    description: string;
    organizationId: string;
    parentCategoryId: string;
    level: number;
    path: string;
    module: CategoryModule;
    severityDefault: Severity;
    slaDays: number;
    requiresInvestigation: boolean;
    sortOrder: number;
    isActive: boolean;
    isSystem: boolean;
  }> = [];

  for (const categoryDef of CATEGORY_TAXONOMY) {
    const parentId = categoryMap.get(categoryDef.name)!;
    const parentSlug = generateSlug(categoryDef.name);

    if (categoryDef.children) {
      for (const childDef of categoryDef.children) {
        const childId = faker.string.uuid();
        const childSlug = generateSlug(childDef.name);

        childCategories.push({
          id: childId,
          name: childDef.name,
          code: childDef.code,
          description: childDef.description,
          organizationId,
          parentCategoryId: parentId,
          level: 1,
          path: `/${parentSlug}/${childSlug}`,
          module: CategoryModule.CASE,
          // Children inherit parent's severity and SLA
          severityDefault: categoryDef.severityDefault,
          slaDays: categoryDef.slaDays,
          requiresInvestigation: categoryDef.requiresInvestigation,
          sortOrder: sortOrder++,
          isActive: true,
          isSystem: false,
        });

        categoryMap.set(childDef.name, childId);
      }
    }
  }

  // Insert child categories
  await prisma.category.createMany({
    data: childCategories,
    skipDuplicates: true,
  });

  console.log(`  Created ${childCategories.length} child categories`);

  return categoryMap;
}
