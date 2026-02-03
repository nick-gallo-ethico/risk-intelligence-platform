/**
 * Division Structure Seeder
 *
 * Creates the 4-level organizational hierarchy for the demo tenant:
 * Division -> Business Unit -> Department -> Team
 *
 * Divisions:
 * - Healthcare (50% of employees) - primarily onsite
 * - Technology (20% of employees) - primarily remote
 * - Retail (20% of employees) - hybrid
 * - Energy (10% of employees) - hybrid
 */

import { PrismaClient, WorkMode } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { SEED_CONFIG } from '../seeders/config';

// Seed offset for reproducibility (masterSeed + 300 for divisions)
const SEED_OFFSET = 300;

/**
 * Team definition within a department
 */
interface TeamDef {
  code: string;
  name: string;
}

/**
 * Department definition within a business unit
 */
interface DepartmentDef {
  code: string;
  name: string;
  teams: TeamDef[];
}

/**
 * Business Unit definition within a division
 */
interface BusinessUnitDef {
  code: string;
  name: string;
  departments: DepartmentDef[];
}

/**
 * Division definition
 */
interface DivisionDef {
  code: string;
  name: string;
  description: string;
  weight: number; // Percentage of employees
  workMode: WorkMode;
  businessUnits: BusinessUnitDef[];
}

/**
 * Complete organizational structure definition
 */
export const DIVISION_STRUCTURE: Record<string, DivisionDef> = {
  HEALTHCARE: {
    code: 'HLTH',
    name: 'Healthcare Division',
    description: 'Healthcare services including hospitals, pharmaceuticals, and medical devices',
    weight: 50,
    workMode: WorkMode.ONSITE,
    businessUnits: [
      {
        code: 'HOSP',
        name: 'Hospital Services',
        departments: [
          {
            code: 'NURS',
            name: 'Nursing',
            teams: [
              { code: 'NURS-ICU', name: 'ICU Team' },
              { code: 'NURS-ER', name: 'ER Team' },
              { code: 'NURS-PED', name: 'Pediatrics Team' },
              { code: 'NURS-SUR', name: 'Surgery Team' },
              { code: 'NURS-GEN', name: 'General Care Team' },
            ],
          },
          {
            code: 'HADM',
            name: 'Hospital Administration',
            teams: [
              { code: 'HADM-FD', name: 'Front Desk Team' },
              { code: 'HADM-REC', name: 'Records Team' },
              { code: 'HADM-BIL', name: 'Billing Team' },
            ],
          },
          {
            code: 'CLIN',
            name: 'Clinical Services',
            teams: [
              { code: 'CLIN-DIA', name: 'Diagnostics Team' },
              { code: 'CLIN-LAB', name: 'Laboratory Team' },
              { code: 'CLIN-RAD', name: 'Radiology Team' },
            ],
          },
        ],
      },
      {
        code: 'PHRM',
        name: 'Pharmaceuticals',
        departments: [
          {
            code: 'RND',
            name: 'Research & Development',
            teams: [
              { code: 'RND-DIS', name: 'Drug Discovery Team' },
              { code: 'RND-TRI', name: 'Clinical Trials Team' },
              { code: 'RND-FOR', name: 'Formulation Team' },
            ],
          },
          {
            code: 'PMFG',
            name: 'Pharmaceutical Manufacturing',
            teams: [
              { code: 'PMFG-PRD', name: 'Production Team' },
              { code: 'PMFG-QA', name: 'Quality Assurance Team' },
              { code: 'PMFG-PKG', name: 'Packaging Team' },
            ],
          },
          {
            code: 'PREG',
            name: 'Regulatory Affairs',
            teams: [
              { code: 'PREG-FDA', name: 'FDA Compliance Team' },
              { code: 'PREG-DOC', name: 'Documentation Team' },
            ],
          },
        ],
      },
      {
        code: 'MEDEV',
        name: 'Medical Devices',
        departments: [
          {
            code: 'MDENG',
            name: 'Device Engineering',
            teams: [
              { code: 'MDENG-DES', name: 'Design Team' },
              { code: 'MDENG-PRO', name: 'Prototyping Team' },
              { code: 'MDENG-TST', name: 'Testing Team' },
            ],
          },
          {
            code: 'MDSLS',
            name: 'Device Sales',
            teams: [
              { code: 'MDSLS-DIR', name: 'Direct Sales Team' },
              { code: 'MDSLS-DST', name: 'Distribution Team' },
              { code: 'MDSLS-SUP', name: 'Support Team' },
            ],
          },
        ],
      },
    ],
  },
  TECH: {
    code: 'TECH',
    name: 'Technology Division',
    description: 'Software products and cloud services',
    weight: 20,
    workMode: WorkMode.REMOTE,
    businessUnits: [
      {
        code: 'SOFT',
        name: 'Software Products',
        departments: [
          {
            code: 'DEV',
            name: 'Development',
            teams: [
              { code: 'DEV-PLT', name: 'Platform Team' },
              { code: 'DEV-MOB', name: 'Mobile Team' },
              { code: 'DEV-WEB', name: 'Web Team' },
              { code: 'DEV-INF', name: 'Infrastructure Team' },
            ],
          },
          {
            code: 'PROD',
            name: 'Product',
            teams: [
              { code: 'PROD-PM', name: 'Product Management Team' },
              { code: 'PROD-UX', name: 'UX Team' },
              { code: 'PROD-ANA', name: 'Analytics Team' },
            ],
          },
          {
            code: 'QA',
            name: 'Quality Assurance',
            teams: [
              { code: 'QA-AUT', name: 'Automation Team' },
              { code: 'QA-MAN', name: 'Manual Testing Team' },
              { code: 'QA-SEC', name: 'Security Testing Team' },
            ],
          },
        ],
      },
      {
        code: 'CLOUD',
        name: 'Cloud Services',
        departments: [
          {
            code: 'OPS',
            name: 'Operations',
            teams: [
              { code: 'OPS-SRE', name: 'SRE Team' },
              { code: 'OPS-DEV', name: 'DevOps Team' },
              { code: 'OPS-SUP', name: 'Support Team' },
            ],
          },
          {
            code: 'ARCH',
            name: 'Architecture',
            teams: [
              { code: 'ARCH-SOL', name: 'Solutions Team' },
              { code: 'ARCH-ENT', name: 'Enterprise Team' },
            ],
          },
        ],
      },
    ],
  },
  RETAIL: {
    code: 'RETL',
    name: 'Retail Division',
    description: 'Store operations and e-commerce',
    weight: 20,
    workMode: WorkMode.HYBRID,
    businessUnits: [
      {
        code: 'STORE',
        name: 'Store Operations',
        departments: [
          {
            code: 'SMGMT',
            name: 'Store Management',
            teams: [
              { code: 'SMGMT-REG', name: 'Regional Managers Team' },
              { code: 'SMGMT-STR', name: 'Store Managers Team' },
            ],
          },
          {
            code: 'MERCH',
            name: 'Merchandising',
            teams: [
              { code: 'MERCH-VIS', name: 'Visual Team' },
              { code: 'MERCH-INV', name: 'Inventory Team' },
              { code: 'MERCH-PRC', name: 'Pricing Team' },
            ],
          },
          {
            code: 'CSERV',
            name: 'Customer Service',
            teams: [
              { code: 'CSERV-STR', name: 'In-Store Team' },
              { code: 'CSERV-CAL', name: 'Call Center Team' },
              { code: 'CSERV-RET', name: 'Returns Team' },
            ],
          },
        ],
      },
      {
        code: 'ECOM',
        name: 'E-Commerce',
        departments: [
          {
            code: 'DGTL',
            name: 'Digital',
            teams: [
              { code: 'DGTL-WEB', name: 'Web Team' },
              { code: 'DGTL-APP', name: 'Mobile App Team' },
              { code: 'DGTL-SEO', name: 'SEO Team' },
            ],
          },
          {
            code: 'FULF',
            name: 'Fulfillment',
            teams: [
              { code: 'FULF-WH', name: 'Warehouse Team' },
              { code: 'FULF-SHP', name: 'Shipping Team' },
              { code: 'FULF-RET', name: 'Returns Processing Team' },
            ],
          },
        ],
      },
    ],
  },
  ENERGY: {
    code: 'ENRG',
    name: 'Energy Division',
    description: 'Renewable and traditional energy operations',
    weight: 10,
    workMode: WorkMode.HYBRID,
    businessUnits: [
      {
        code: 'RENEW',
        name: 'Renewable Energy',
        departments: [
          {
            code: 'SOLAR',
            name: 'Solar',
            teams: [
              { code: 'SOLAR-INS', name: 'Installation Team' },
              { code: 'SOLAR-MNT', name: 'Maintenance Team' },
              { code: 'SOLAR-SLS', name: 'Sales Team' },
            ],
          },
          {
            code: 'WIND',
            name: 'Wind',
            teams: [
              { code: 'WIND-OPS', name: 'Operations Team' },
              { code: 'WIND-ENG', name: 'Engineering Team' },
            ],
          },
        ],
      },
      {
        code: 'TRAD',
        name: 'Traditional Energy',
        departments: [
          {
            code: 'EXPL',
            name: 'Exploration',
            teams: [
              { code: 'EXPL-GEO', name: 'Geology Team' },
              { code: 'EXPL-DRL', name: 'Drilling Team' },
            ],
          },
          {
            code: 'REFIN',
            name: 'Refining',
            teams: [
              { code: 'REFIN-OPS', name: 'Operations Team' },
              { code: 'REFIN-SAF', name: 'Safety Team' },
            ],
          },
        ],
      },
    ],
  },
};

/**
 * Result type for seeded org structure
 */
export interface OrgStructureResult {
  divisions: Map<string, string>;      // divisionCode -> divisionId
  businessUnits: Map<string, string>;  // buCode -> buId
  departments: Map<string, string>;    // deptCode -> deptId
  teams: Map<string, string>;          // teamCode -> teamId
}

/**
 * Seed divisions and organizational hierarchy for a demo tenant
 *
 * @param prisma - Prisma client instance
 * @param organizationId - Organization ID to seed divisions for
 * @returns Maps of all created entities for employee assignment
 */
export async function seedDivisions(
  prisma: PrismaClient,
  organizationId: string,
): Promise<OrgStructureResult> {
  // Initialize faker with deterministic seed
  faker.seed(SEED_CONFIG.masterSeed + SEED_OFFSET);

  const divisions = new Map<string, string>();
  const businessUnits = new Map<string, string>();
  const departments = new Map<string, string>();
  const teams = new Map<string, string>();

  // Arrays to collect records for batch insert
  const divisionRecords: Array<{
    id: string;
    organizationId: string;
    code: string;
    name: string;
    description: string;
    employeeWeight: number;
    defaultWorkMode: WorkMode;
  }> = [];

  const buRecords: Array<{
    id: string;
    organizationId: string;
    divisionId: string;
    code: string;
    name: string;
    description: string;
  }> = [];

  const deptRecords: Array<{
    id: string;
    organizationId: string;
    businessUnitId: string;
    code: string;
    name: string;
    description: string;
  }> = [];

  const teamRecords: Array<{
    id: string;
    organizationId: string;
    departmentId: string;
    code: string;
    name: string;
    description: string;
  }> = [];

  // Build all records
  for (const [divKey, divDef] of Object.entries(DIVISION_STRUCTURE)) {
    const divisionId = faker.string.uuid();
    divisions.set(divDef.code, divisionId);

    divisionRecords.push({
      id: divisionId,
      organizationId,
      code: divDef.code,
      name: divDef.name,
      description: divDef.description,
      employeeWeight: divDef.weight,
      defaultWorkMode: divDef.workMode,
    });

    for (const buDef of divDef.businessUnits) {
      const buId = faker.string.uuid();
      businessUnits.set(buDef.code, buId);

      buRecords.push({
        id: buId,
        organizationId,
        divisionId,
        code: buDef.code,
        name: buDef.name,
        description: `${buDef.name} within ${divDef.name}`,
      });

      for (const deptDef of buDef.departments) {
        const deptId = faker.string.uuid();
        departments.set(deptDef.code, deptId);

        deptRecords.push({
          id: deptId,
          organizationId,
          businessUnitId: buId,
          code: deptDef.code,
          name: deptDef.name,
          description: `${deptDef.name} department`,
        });

        for (const teamDef of deptDef.teams) {
          const teamId = faker.string.uuid();
          teams.set(teamDef.code, teamId);

          teamRecords.push({
            id: teamId,
            organizationId,
            departmentId: deptId,
            code: teamDef.code,
            name: teamDef.name,
            description: `${teamDef.name} in ${deptDef.name}`,
          });
        }
      }
    }
  }

  // Insert all records in order (respecting foreign key constraints)
  await prisma.division.createMany({
    data: divisionRecords,
    skipDuplicates: true,
  });
  console.log(`  Created ${divisionRecords.length} divisions`);

  await prisma.businessUnit.createMany({
    data: buRecords,
    skipDuplicates: true,
  });
  console.log(`  Created ${buRecords.length} business units`);

  await prisma.department.createMany({
    data: deptRecords,
    skipDuplicates: true,
  });
  console.log(`  Created ${deptRecords.length} departments`);

  await prisma.team.createMany({
    data: teamRecords,
    skipDuplicates: true,
  });
  console.log(`  Created ${teamRecords.length} teams`);

  return {
    divisions,
    businessUnits,
    departments,
    teams,
  };
}
