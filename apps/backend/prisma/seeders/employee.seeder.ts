/**
 * Employee Seeder
 *
 * Creates 20,000 employees with full reporting chains for the demo tenant.
 * Includes named executive personas for memorable demo walkthroughs.
 *
 * Generation Order (top-down hierarchy):
 * 1. C-Suite (7 people) - Named personas, CEO has no manager
 * 2. Division VPs (4 people) - Named personas, report to COO
 * 3. Compliance Team (~5-10) - Named personas, report to CCO
 * 4. Regional HRBPs (3+) - Named personas, report to CHRO
 * 5. BU Heads (~10) - Report to Division VPs
 * 6. Department Heads (~25) - Report to BU Heads
 * 7. Team Leads (~60) - Report to Department Heads
 * 8. Bulk Employees (~19,850) - Distributed by division weight
 */

import {
  PrismaClient,
  JobLevel,
  WorkMode,
  ComplianceRole,
  EmploymentStatus,
  EmploymentType,
} from '@prisma/client';
import { faker } from '@faker-js/faker';
import { subYears, subMonths, subDays } from 'date-fns';
import { SEED_CONFIG } from '../seeders/config';
import { DIVISION_STRUCTURE, OrgStructureResult } from './division.seeder';
import { chance, randomInt, pickRandom, weightedRandom } from './utils';

// Seed offset for reproducibility (masterSeed + 400 for employees)
const SEED_OFFSET = 400;

/**
 * Named executive persona definition
 */
interface NamedPersona {
  firstName: string;
  lastName: string;
  preferredName?: string;
  title: string;
  level: JobLevel;
  complianceRole?: ComplianceRole;
  division?: string; // Division code if applicable
  region?: string; // Region if applicable (for HRBPs)
}

/**
 * Named executive personas for memorable demo walkthroughs
 * These are created first and referenced throughout the organization
 */
export const NAMED_EXECUTIVES: Record<string, NamedPersona> = {
  // C-Suite (reports to CEO, CEO has no manager)
  CEO: {
    firstName: 'Robert',
    lastName: 'Chen',
    preferredName: 'Bob',
    title: 'Chief Executive Officer',
    level: JobLevel.C_SUITE,
  },
  CFO: {
    firstName: 'Sarah',
    lastName: 'Mitchell',
    title: 'Chief Financial Officer',
    level: JobLevel.C_SUITE,
  },
  COO: {
    firstName: 'Michael',
    lastName: 'Rodriguez',
    title: 'Chief Operating Officer',
    level: JobLevel.C_SUITE,
  },
  CTO: {
    firstName: 'Jennifer',
    lastName: 'Park',
    title: 'Chief Technology Officer',
    level: JobLevel.C_SUITE,
  },
  // Chief Compliance Officer (key demo persona)
  CCO: {
    firstName: 'Margaret',
    lastName: 'Thompson',
    preferredName: 'Maggie',
    title: 'Chief Compliance Officer',
    level: JobLevel.C_SUITE,
    complianceRole: ComplianceRole.CCO,
  },
  CLO: {
    firstName: 'David',
    lastName: 'Okonkwo',
    title: 'Chief Legal Officer',
    level: JobLevel.C_SUITE,
  },
  CHRO: {
    firstName: 'Elena',
    lastName: 'Vasquez',
    title: 'Chief Human Resources Officer',
    level: JobLevel.C_SUITE,
  },

  // Division VPs (memorable for demo walkthroughs)
  VP_HEALTHCARE: {
    firstName: 'William',
    lastName: 'Harrison',
    preferredName: 'Bill',
    title: 'Division VP, Healthcare',
    level: JobLevel.SVP,
    division: 'HLTH',
  },
  VP_TECH: {
    firstName: 'Priya',
    lastName: 'Sharma',
    title: 'Division VP, Technology',
    level: JobLevel.SVP,
    division: 'TECH',
  },
  VP_RETAIL: {
    firstName: 'James',
    lastName: "O'Brien",
    preferredName: 'Jim',
    title: 'Division VP, Retail',
    level: JobLevel.SVP,
    division: 'RETL',
  },
  VP_ENERGY: {
    firstName: 'Fatima',
    lastName: 'Al-Hassan',
    title: 'Division VP, Energy',
    level: JobLevel.SVP,
    division: 'ENRG',
  },

  // Compliance Team (for case management demos)
  LEAD_INVESTIGATOR: {
    firstName: 'Thomas',
    lastName: 'Washington',
    preferredName: 'Tom',
    title: 'Lead Compliance Investigator',
    level: JobLevel.DIRECTOR,
    complianceRole: ComplianceRole.INVESTIGATOR,
  },
  INVESTIGATOR_1: {
    firstName: 'Angela',
    lastName: 'Martinez',
    title: 'Senior Compliance Investigator',
    level: JobLevel.MANAGER,
    complianceRole: ComplianceRole.INVESTIGATOR,
  },
  INVESTIGATOR_2: {
    firstName: 'Kevin',
    lastName: 'Nguyen',
    title: 'Compliance Investigator',
    level: JobLevel.IC,
    complianceRole: ComplianceRole.INVESTIGATOR,
  },
  INVESTIGATOR_3: {
    firstName: 'Lisa',
    lastName: 'Johnson',
    title: 'Compliance Investigator',
    level: JobLevel.IC,
    complianceRole: ComplianceRole.INVESTIGATOR,
  },
  INVESTIGATOR_4: {
    firstName: 'Marcus',
    lastName: 'Williams',
    title: 'Compliance Investigator',
    level: JobLevel.IC,
    complianceRole: ComplianceRole.INVESTIGATOR,
  },

  // Regional HRBPs (for case routing demos)
  HRBP_US: {
    firstName: 'Rachel',
    lastName: 'Foster',
    title: 'HR Business Partner, Americas',
    level: JobLevel.DIRECTOR,
    complianceRole: ComplianceRole.HRBP,
    region: 'US',
  },
  HRBP_EMEA: {
    firstName: 'Hans',
    lastName: 'Mueller',
    title: 'HR Business Partner, EMEA',
    level: JobLevel.DIRECTOR,
    complianceRole: ComplianceRole.HRBP,
    region: 'EMEA',
  },
  HRBP_APAC: {
    firstName: 'Yuki',
    lastName: 'Tanaka',
    title: 'HR Business Partner, APAC',
    level: JobLevel.DIRECTOR,
    complianceRole: ComplianceRole.HRBP,
    region: 'APAC',
  },

  // Legal Counsel
  LEGAL_COUNSEL: {
    firstName: 'Patricia',
    lastName: 'Chen',
    title: 'Senior Legal Counsel',
    level: JobLevel.DIRECTOR,
    complianceRole: ComplianceRole.LEGAL_COUNSEL,
  },
};

/**
 * Language distribution by region
 */
const REGION_LANGUAGES: Record<string, Array<{ lang: string; weight: number }>> = {
  US: [
    { lang: 'en', weight: 95 },
    { lang: 'es', weight: 5 },
  ],
  EMEA: [
    { lang: 'en', weight: 40 },
    { lang: 'de', weight: 15 },
    { lang: 'fr', weight: 15 },
    { lang: 'es', weight: 10 },
    { lang: 'it', weight: 8 },
    { lang: 'nl', weight: 5 },
    { lang: 'pl', weight: 4 },
    { lang: 'sv', weight: 3 },
  ],
  APAC: [
    { lang: 'en', weight: 30 },
    { lang: 'ja', weight: 25 },
    { lang: 'zh', weight: 20 },
    { lang: 'ko', weight: 10 },
    { lang: 'hi', weight: 10 },
    { lang: 'tl', weight: 5 },
  ],
};

/**
 * Work mode distribution by division
 */
const DIVISION_WORK_MODES: Record<string, Array<{ mode: WorkMode; weight: number }>> = {
  HLTH: [
    { mode: WorkMode.ONSITE, weight: 80 },
    { mode: WorkMode.HYBRID, weight: 15 },
    { mode: WorkMode.REMOTE, weight: 5 },
  ],
  TECH: [
    { mode: WorkMode.REMOTE, weight: 60 },
    { mode: WorkMode.HYBRID, weight: 30 },
    { mode: WorkMode.ONSITE, weight: 10 },
  ],
  RETL: [
    { mode: WorkMode.ONSITE, weight: 50 },
    { mode: WorkMode.HYBRID, weight: 40 },
    { mode: WorkMode.REMOTE, weight: 10 },
  ],
  ENRG: [
    { mode: WorkMode.ONSITE, weight: 40 },
    { mode: WorkMode.HYBRID, weight: 40 },
    { mode: WorkMode.REMOTE, weight: 20 },
  ],
};

/**
 * Job level distribution for bulk employees
 */
const BULK_JOB_LEVELS = [
  { value: JobLevel.IC, weight: 85 },
  { value: JobLevel.MANAGER, weight: 10 },
  { value: JobLevel.DIRECTOR, weight: 4 },
  { value: JobLevel.VP, weight: 1 },
];

/**
 * Employment status distribution
 */
const EMPLOYMENT_STATUS_DIST = [
  { value: EmploymentStatus.ACTIVE, weight: 95 },
  { value: EmploymentStatus.ON_LEAVE, weight: 3 },
  { value: EmploymentStatus.INACTIVE, weight: 2 },
];

/**
 * Generate a hire date with realistic tenure distribution
 * Weighted toward 2-5 years tenure, max 15 years
 */
function generateHireDate(referenceDate: Date): Date {
  // Tenure distribution: 1-15 years, weighted toward 2-5
  const yearsAgo = weightedRandom([
    { value: 1, weight: 10 },
    { value: 2, weight: 20 },
    { value: 3, weight: 25 },
    { value: 4, weight: 20 },
    { value: 5, weight: 15 },
    { value: 6, weight: 5 },
    { value: 7, weight: 3 },
    { value: 8, weight: 2 },
    { value: randomInt(9, 15), weight: 2 },
  ]);

  const monthsAgo = randomInt(0, 11);
  const daysAgo = randomInt(0, 28);

  return subDays(subMonths(subYears(referenceDate, yearsAgo), monthsAgo), daysAgo);
}

/**
 * Select a language based on region
 */
function selectLanguage(region: string): string {
  const languages = REGION_LANGUAGES[region] || REGION_LANGUAGES.US;
  return weightedRandom(languages.map((l) => ({ value: l.lang, weight: l.weight })));
}

/**
 * Select a work mode based on division
 */
function selectWorkMode(divisionCode: string): WorkMode {
  const modes = DIVISION_WORK_MODES[divisionCode] || DIVISION_WORK_MODES.TECH;
  return weightedRandom(modes.map((m) => ({ value: m.mode, weight: m.weight })));
}

/**
 * Employee record for batch insert
 */
interface EmployeeRecord {
  id: string;
  organizationId: string;
  hrisEmployeeId: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  email: string;
  phone: string | null;
  jobTitle: string;
  jobLevel: JobLevel;
  divisionId: string | null;
  businessUnitId: string | null;
  departmentId: string | null;
  teamId: string | null;
  locationId: string | null;
  department: string | null;
  departmentCode: string | null;
  location: string | null;
  locationCode: string | null;
  costCenter: string | null;
  managerId: string | null;
  managerName: string | null;
  workMode: WorkMode;
  primaryLanguage: string;
  complianceRole: ComplianceRole | null;
  employmentStatus: EmploymentStatus;
  employmentType: EmploymentType;
  hireDate: Date;
  isNamedPersona: boolean;
  personaRole: string | null;
  sourceSystem: string;
}

/**
 * Seed employees for a demo tenant
 *
 * @param prisma - Prisma client instance
 * @param organizationId - Organization ID to seed employees for
 * @param locations - Map of location code to location ID
 * @param orgStructure - Organization structure maps from division seeder
 * @returns Map of email to employee ID for later use
 */
export async function seedEmployees(
  prisma: PrismaClient,
  organizationId: string,
  locations: Map<string, string>,
  orgStructure: OrgStructureResult,
): Promise<Map<string, string>> {
  // Initialize faker with deterministic seed
  faker.seed(SEED_CONFIG.masterSeed + SEED_OFFSET);

  const employeeMap = new Map<string, string>();
  const referenceDate = SEED_CONFIG.currentDate;

  // Track employees by role for hierarchy building
  const executiveIds: Record<string, string> = {};
  const divisionVpIds: Record<string, string> = {};
  const buHeadIds: Record<string, string> = {};
  const deptHeadIds: Record<string, string> = {};
  const teamLeadIds: Record<string, string> = {};

  // Convert location codes to arrays for random selection by region
  const locationsByRegion: Record<string, string[]> = {
    US: [],
    EMEA: [],
    APAC: [],
  };

  for (const [code, id] of locations) {
    if (code.includes('-HQ') || code.startsWith('NYC') || code.startsWith('CHI') || code.startsWith('LAX')) {
      locationsByRegion.US.push(id);
    } else if (code.startsWith('LON') || code.startsWith('FRA') || code.startsWith('PAR')) {
      locationsByRegion.EMEA.push(id);
    } else if (code.startsWith('TYO') || code.startsWith('SIN') || code.startsWith('SYD')) {
      locationsByRegion.APAC.push(id);
    }
    // Add all to appropriate region based on code prefix
    if (code.match(/^(NYC|CHI|LAX|SFO|BOS|DFW|IAH|MIA|ATL|SEA|DEN|PHX|PHL|MSP|DTW|CLT|BNA|SAN|PDX|AUS|RDU|TPA|IND|CMH|STL)/)) {
      if (!locationsByRegion.US.includes(id)) locationsByRegion.US.push(id);
    } else if (code.match(/^(LON|FRA|PAR|AMS|MAD|MIL|DUB|MUC|ZRH|STO|CPH|BRU|VIE|PRG|WAW)/)) {
      if (!locationsByRegion.EMEA.includes(id)) locationsByRegion.EMEA.push(id);
    } else if (code.match(/^(TYO|SIN|SYD|MEL|SHA|BJS|HKG|ICN|BLR|BOM|MNL|AKL)/)) {
      if (!locationsByRegion.APAC.includes(id)) locationsByRegion.APAC.push(id);
    }
  }

  // Get HQ location ID (NYC-HQ)
  const hqLocationId = locations.get('NYC-HQ') || Array.from(locations.values())[0];

  // Batch size for createMany
  const BATCH_SIZE = 500;
  let batchNumber = 0;
  let employeeBatch: EmployeeRecord[] = [];
  let employeeCounter = 0;

  /**
   * Flush current batch to database
   */
  async function flushBatch() {
    if (employeeBatch.length === 0) return;

    await prisma.employee.createMany({
      data: employeeBatch,
      skipDuplicates: true,
    });

    batchNumber++;
    employeeBatch = [];
  }

  /**
   * Add employee to batch, flush if full
   */
  async function addEmployee(record: EmployeeRecord) {
    employeeBatch.push(record);
    employeeMap.set(record.email, record.id);
    employeeCounter++;

    if (employeeBatch.length >= BATCH_SIZE) {
      await flushBatch();
    }
  }

  /**
   * Generate employee ID
   */
  function generateHrisId(): string {
    return `EMP${String(employeeCounter + 1).padStart(6, '0')}`;
  }

  // =====================================================
  // Phase 1: Create C-Suite (7 people)
  // =====================================================
  console.log('  Creating C-Suite executives...');

  // CEO first (no manager)
  const ceoId = faker.string.uuid();
  executiveIds['CEO'] = ceoId;

  await addEmployee({
    id: ceoId,
    organizationId,
    hrisEmployeeId: generateHrisId(),
    firstName: NAMED_EXECUTIVES.CEO.firstName,
    lastName: NAMED_EXECUTIVES.CEO.lastName,
    preferredName: NAMED_EXECUTIVES.CEO.preferredName || null,
    email: 'bob.chen@acme.example.com',
    phone: faker.phone.number(),
    jobTitle: NAMED_EXECUTIVES.CEO.title,
    jobLevel: NAMED_EXECUTIVES.CEO.level,
    divisionId: null,
    businessUnitId: null,
    departmentId: null,
    teamId: null,
    locationId: hqLocationId,
    department: 'Executive',
    departmentCode: 'EXEC',
    location: 'New York Headquarters',
    locationCode: 'NYC-HQ',
    costCenter: 'CC-EXEC',
    managerId: null,
    managerName: null,
    workMode: WorkMode.HYBRID,
    primaryLanguage: 'en',
    complianceRole: null,
    employmentStatus: EmploymentStatus.ACTIVE,
    employmentType: EmploymentType.FULL_TIME,
    hireDate: subYears(referenceDate, 12),
    isNamedPersona: true,
    personaRole: 'CEO',
    sourceSystem: 'SEED',
  });

  // Other C-Suite (report to CEO)
  const cSuiteOrder = ['CFO', 'COO', 'CTO', 'CCO', 'CLO', 'CHRO'];
  for (const role of cSuiteOrder) {
    const persona = NAMED_EXECUTIVES[role];
    const empId = faker.string.uuid();
    executiveIds[role] = empId;

    const emailPrefix = `${persona.firstName.toLowerCase()}.${persona.lastName.toLowerCase().replace("'", '')}`;

    await addEmployee({
      id: empId,
      organizationId,
      hrisEmployeeId: generateHrisId(),
      firstName: persona.firstName,
      lastName: persona.lastName,
      preferredName: persona.preferredName || null,
      email: `${emailPrefix}@acme.example.com`,
      phone: faker.phone.number(),
      jobTitle: persona.title,
      jobLevel: persona.level,
      divisionId: null,
      businessUnitId: null,
      departmentId: null,
      teamId: null,
      locationId: hqLocationId,
      department: 'Executive',
      departmentCode: 'EXEC',
      location: 'New York Headquarters',
      locationCode: 'NYC-HQ',
      costCenter: 'CC-EXEC',
      managerId: ceoId,
      managerName: `${NAMED_EXECUTIVES.CEO.firstName} ${NAMED_EXECUTIVES.CEO.lastName}`,
      workMode: WorkMode.HYBRID,
      primaryLanguage: 'en',
      complianceRole: persona.complianceRole || null,
      employmentStatus: EmploymentStatus.ACTIVE,
      employmentType: EmploymentType.FULL_TIME,
      hireDate: subYears(referenceDate, randomInt(5, 10)),
      isNamedPersona: true,
      personaRole: role,
      sourceSystem: 'SEED',
    });
  }

  // =====================================================
  // Phase 2: Create Division VPs (4 people)
  // =====================================================
  console.log('  Creating Division VPs...');

  const cooId = executiveIds['COO'];
  const cooName = `${NAMED_EXECUTIVES.COO.firstName} ${NAMED_EXECUTIVES.COO.lastName}`;

  const divisionVPs = ['VP_HEALTHCARE', 'VP_TECH', 'VP_RETAIL', 'VP_ENERGY'];
  for (const vpRole of divisionVPs) {
    const persona = NAMED_EXECUTIVES[vpRole];
    const empId = faker.string.uuid();
    divisionVpIds[persona.division!] = empId;

    const divisionId = orgStructure.divisions.get(persona.division!);
    const emailPrefix = `${persona.firstName.toLowerCase()}.${persona.lastName.toLowerCase().replace("'", '')}`;

    await addEmployee({
      id: empId,
      organizationId,
      hrisEmployeeId: generateHrisId(),
      firstName: persona.firstName,
      lastName: persona.lastName,
      preferredName: persona.preferredName || null,
      email: `${emailPrefix}@acme.example.com`,
      phone: faker.phone.number(),
      jobTitle: persona.title,
      jobLevel: persona.level,
      divisionId: divisionId || null,
      businessUnitId: null,
      departmentId: null,
      teamId: null,
      locationId: hqLocationId,
      department: persona.division || null,
      departmentCode: persona.division || null,
      location: 'New York Headquarters',
      locationCode: 'NYC-HQ',
      costCenter: `CC-${persona.division || 'DIV'}`,
      managerId: cooId,
      managerName: cooName,
      workMode: WorkMode.HYBRID,
      primaryLanguage: 'en',
      complianceRole: null,
      employmentStatus: EmploymentStatus.ACTIVE,
      employmentType: EmploymentType.FULL_TIME,
      hireDate: subYears(referenceDate, randomInt(4, 8)),
      isNamedPersona: true,
      personaRole: vpRole,
      sourceSystem: 'SEED',
    });
  }

  // =====================================================
  // Phase 3: Create Compliance Team (~5-10 people)
  // =====================================================
  console.log('  Creating Compliance Team...');

  const ccoId = executiveIds['CCO'];
  const ccoName = `${NAMED_EXECUTIVES.CCO.firstName} ${NAMED_EXECUTIVES.CCO.lastName}`;

  // Lead Investigator reports to CCO
  const leadInvRole = 'LEAD_INVESTIGATOR';
  const leadInvPersona = NAMED_EXECUTIVES[leadInvRole];
  const leadInvId = faker.string.uuid();

  await addEmployee({
    id: leadInvId,
    organizationId,
    hrisEmployeeId: generateHrisId(),
    firstName: leadInvPersona.firstName,
    lastName: leadInvPersona.lastName,
    preferredName: leadInvPersona.preferredName || null,
    email: `${leadInvPersona.firstName.toLowerCase()}.${leadInvPersona.lastName.toLowerCase()}@acme.example.com`,
    phone: faker.phone.number(),
    jobTitle: leadInvPersona.title,
    jobLevel: leadInvPersona.level,
    divisionId: null,
    businessUnitId: null,
    departmentId: null,
    teamId: null,
    locationId: hqLocationId,
    department: 'Compliance',
    departmentCode: 'COMP',
    location: 'New York Headquarters',
    locationCode: 'NYC-HQ',
    costCenter: 'CC-COMP',
    managerId: ccoId,
    managerName: ccoName,
    workMode: WorkMode.HYBRID,
    primaryLanguage: 'en',
    complianceRole: leadInvPersona.complianceRole || null,
    employmentStatus: EmploymentStatus.ACTIVE,
    employmentType: EmploymentType.FULL_TIME,
    hireDate: subYears(referenceDate, randomInt(3, 6)),
    isNamedPersona: true,
    personaRole: leadInvRole,
    sourceSystem: 'SEED',
  });

  // Other investigators report to Lead Investigator
  const leadInvName = `${leadInvPersona.firstName} ${leadInvPersona.lastName}`;
  const investigators = ['INVESTIGATOR_1', 'INVESTIGATOR_2', 'INVESTIGATOR_3', 'INVESTIGATOR_4'];

  for (const invRole of investigators) {
    const persona = NAMED_EXECUTIVES[invRole];
    const empId = faker.string.uuid();

    await addEmployee({
      id: empId,
      organizationId,
      hrisEmployeeId: generateHrisId(),
      firstName: persona.firstName,
      lastName: persona.lastName,
      preferredName: persona.preferredName || null,
      email: `${persona.firstName.toLowerCase()}.${persona.lastName.toLowerCase()}@acme.example.com`,
      phone: faker.phone.number(),
      jobTitle: persona.title,
      jobLevel: persona.level,
      divisionId: null,
      businessUnitId: null,
      departmentId: null,
      teamId: null,
      locationId: hqLocationId,
      department: 'Compliance',
      departmentCode: 'COMP',
      location: 'New York Headquarters',
      locationCode: 'NYC-HQ',
      costCenter: 'CC-COMP',
      managerId: leadInvId,
      managerName: leadInvName,
      workMode: WorkMode.HYBRID,
      primaryLanguage: 'en',
      complianceRole: persona.complianceRole || null,
      employmentStatus: EmploymentStatus.ACTIVE,
      employmentType: EmploymentType.FULL_TIME,
      hireDate: subYears(referenceDate, randomInt(1, 4)),
      isNamedPersona: true,
      personaRole: invRole,
      sourceSystem: 'SEED',
    });
  }

  // Legal Counsel reports to CLO
  const cloId = executiveIds['CLO'];
  const cloName = `${NAMED_EXECUTIVES.CLO.firstName} ${NAMED_EXECUTIVES.CLO.lastName}`;
  const legalPersona = NAMED_EXECUTIVES['LEGAL_COUNSEL'];

  await addEmployee({
    id: faker.string.uuid(),
    organizationId,
    hrisEmployeeId: generateHrisId(),
    firstName: legalPersona.firstName,
    lastName: legalPersona.lastName,
    preferredName: null,
    email: `${legalPersona.firstName.toLowerCase()}.${legalPersona.lastName.toLowerCase()}@acme.example.com`,
    phone: faker.phone.number(),
    jobTitle: legalPersona.title,
    jobLevel: legalPersona.level,
    divisionId: null,
    businessUnitId: null,
    departmentId: null,
    teamId: null,
    locationId: hqLocationId,
    department: 'Legal',
    departmentCode: 'LEGAL',
    location: 'New York Headquarters',
    locationCode: 'NYC-HQ',
    costCenter: 'CC-LEGAL',
    managerId: cloId,
    managerName: cloName,
    workMode: WorkMode.HYBRID,
    primaryLanguage: 'en',
    complianceRole: legalPersona.complianceRole || null,
    employmentStatus: EmploymentStatus.ACTIVE,
    employmentType: EmploymentType.FULL_TIME,
    hireDate: subYears(referenceDate, randomInt(2, 5)),
    isNamedPersona: true,
    personaRole: 'LEGAL_COUNSEL',
    sourceSystem: 'SEED',
  });

  // =====================================================
  // Phase 4: Create Regional HRBPs (3 people)
  // =====================================================
  console.log('  Creating Regional HRBPs...');

  const chroId = executiveIds['CHRO'];
  const chroName = `${NAMED_EXECUTIVES.CHRO.firstName} ${NAMED_EXECUTIVES.CHRO.lastName}`;

  const hrbpRoles = ['HRBP_US', 'HRBP_EMEA', 'HRBP_APAC'];
  const regionHqLocations: Record<string, string> = {
    US: 'NYC-HQ',
    EMEA: 'LON-HQ',
    APAC: 'TYO-HQ',
  };

  for (const hrbpRole of hrbpRoles) {
    const persona = NAMED_EXECUTIVES[hrbpRole];
    const empId = faker.string.uuid();
    const locationCode = regionHqLocations[persona.region!];
    const locationId = locations.get(locationCode) || hqLocationId;

    await addEmployee({
      id: empId,
      organizationId,
      hrisEmployeeId: generateHrisId(),
      firstName: persona.firstName,
      lastName: persona.lastName,
      preferredName: null,
      email: `${persona.firstName.toLowerCase()}.${persona.lastName.toLowerCase()}@acme.example.com`,
      phone: faker.phone.number(),
      jobTitle: persona.title,
      jobLevel: persona.level,
      divisionId: null,
      businessUnitId: null,
      departmentId: null,
      teamId: null,
      locationId,
      department: 'Human Resources',
      departmentCode: 'HR',
      location: locationCode.replace('-HQ', ' Headquarters'),
      locationCode,
      costCenter: 'CC-HR',
      managerId: chroId,
      managerName: chroName,
      workMode: WorkMode.HYBRID,
      primaryLanguage: selectLanguage(persona.region!),
      complianceRole: persona.complianceRole || null,
      employmentStatus: EmploymentStatus.ACTIVE,
      employmentType: EmploymentType.FULL_TIME,
      hireDate: subYears(referenceDate, randomInt(3, 6)),
      isNamedPersona: true,
      personaRole: hrbpRole,
      sourceSystem: 'SEED',
    });
  }

  // Flush named personas batch
  await flushBatch();
  console.log(`  Created ${employeeCounter} named personas`);

  // =====================================================
  // Phase 5: Create BU Heads (~10 people)
  // =====================================================
  console.log('  Creating BU Heads...');

  for (const [divKey, divDef] of Object.entries(DIVISION_STRUCTURE)) {
    const divVpId = divisionVpIds[divDef.code];
    const divVpName = NAMED_EXECUTIVES[`VP_${divKey}`]
      ? `${NAMED_EXECUTIVES[`VP_${divKey}`].firstName} ${NAMED_EXECUTIVES[`VP_${divKey}`].lastName}`
      : 'Division VP';

    for (const buDef of divDef.businessUnits) {
      const buId = orgStructure.businessUnits.get(buDef.code);
      const empId = faker.string.uuid();
      buHeadIds[buDef.code] = empId;

      await addEmployee({
        id: empId,
        organizationId,
        hrisEmployeeId: generateHrisId(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        preferredName: null,
        email: faker.internet.email({ provider: 'acme.example.com' }).toLowerCase(),
        phone: faker.phone.number(),
        jobTitle: `VP, ${buDef.name}`,
        jobLevel: JobLevel.VP,
        divisionId: orgStructure.divisions.get(divDef.code) || null,
        businessUnitId: buId || null,
        departmentId: null,
        teamId: null,
        locationId: hqLocationId,
        department: buDef.name,
        departmentCode: buDef.code,
        location: 'New York Headquarters',
        locationCode: 'NYC-HQ',
        costCenter: `CC-${buDef.code}`,
        managerId: divVpId || null,
        managerName: divVpName,
        workMode: selectWorkMode(divDef.code),
        primaryLanguage: 'en',
        complianceRole: null,
        employmentStatus: EmploymentStatus.ACTIVE,
        employmentType: EmploymentType.FULL_TIME,
        hireDate: generateHireDate(referenceDate),
        isNamedPersona: false,
        personaRole: null,
        sourceSystem: 'SEED',
      });
    }
  }

  // =====================================================
  // Phase 6: Create Department Heads (~25 people)
  // =====================================================
  console.log('  Creating Department Heads...');

  for (const [divKey, divDef] of Object.entries(DIVISION_STRUCTURE)) {
    for (const buDef of divDef.businessUnits) {
      const buHeadId = buHeadIds[buDef.code];

      for (const deptDef of buDef.departments) {
        const deptId = orgStructure.departments.get(deptDef.code);
        const empId = faker.string.uuid();
        deptHeadIds[deptDef.code] = empId;

        await addEmployee({
          id: empId,
          organizationId,
          hrisEmployeeId: generateHrisId(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          preferredName: null,
          email: faker.internet.email({ provider: 'acme.example.com' }).toLowerCase(),
          phone: faker.phone.number(),
          jobTitle: `Director, ${deptDef.name}`,
          jobLevel: JobLevel.DIRECTOR,
          divisionId: orgStructure.divisions.get(divDef.code) || null,
          businessUnitId: orgStructure.businessUnits.get(buDef.code) || null,
          departmentId: deptId || null,
          teamId: null,
          locationId: pickRandom(locationsByRegion.US),
          department: deptDef.name,
          departmentCode: deptDef.code,
          location: null,
          locationCode: null,
          costCenter: `CC-${deptDef.code}`,
          managerId: buHeadId || null,
          managerName: null,
          workMode: selectWorkMode(divDef.code),
          primaryLanguage: 'en',
          complianceRole: null,
          employmentStatus: EmploymentStatus.ACTIVE,
          employmentType: EmploymentType.FULL_TIME,
          hireDate: generateHireDate(referenceDate),
          isNamedPersona: false,
          personaRole: null,
          sourceSystem: 'SEED',
        });
      }
    }
  }

  // =====================================================
  // Phase 7: Create Team Leads (~60 people)
  // =====================================================
  console.log('  Creating Team Leads...');

  for (const [divKey, divDef] of Object.entries(DIVISION_STRUCTURE)) {
    for (const buDef of divDef.businessUnits) {
      for (const deptDef of buDef.departments) {
        const deptHeadId = deptHeadIds[deptDef.code];

        for (const teamDef of deptDef.teams) {
          const teamId = orgStructure.teams.get(teamDef.code);
          const empId = faker.string.uuid();
          teamLeadIds[teamDef.code] = empId;

          // Distribute team leads across regions
          const region = pickRandom(['US', 'EMEA', 'APAC']) as 'US' | 'EMEA' | 'APAC';
          const locationId = pickRandom(locationsByRegion[region]);

          await addEmployee({
            id: empId,
            organizationId,
            hrisEmployeeId: generateHrisId(),
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            preferredName: null,
            email: faker.internet.email({ provider: 'acme.example.com' }).toLowerCase(),
            phone: faker.phone.number(),
            jobTitle: `${teamDef.name} Lead`,
            jobLevel: JobLevel.MANAGER,
            divisionId: orgStructure.divisions.get(divDef.code) || null,
            businessUnitId: orgStructure.businessUnits.get(buDef.code) || null,
            departmentId: orgStructure.departments.get(deptDef.code) || null,
            teamId: teamId || null,
            locationId,
            department: deptDef.name,
            departmentCode: deptDef.code,
            location: null,
            locationCode: null,
            costCenter: `CC-${teamDef.code}`,
            managerId: deptHeadId || null,
            managerName: null,
            workMode: selectWorkMode(divDef.code),
            primaryLanguage: selectLanguage(region),
            complianceRole: null,
            employmentStatus: EmploymentStatus.ACTIVE,
            employmentType: EmploymentType.FULL_TIME,
            hireDate: generateHireDate(referenceDate),
            isNamedPersona: false,
            personaRole: null,
            sourceSystem: 'SEED',
          });
        }
      }
    }
  }

  await flushBatch();
  console.log(`  Created ${employeeCounter} management-level employees`);

  // =====================================================
  // Phase 8: Create Bulk Employees (~19,850 people)
  // =====================================================
  console.log('  Creating bulk employees (this may take a few minutes)...');

  const targetTotal = SEED_CONFIG.volumes.employees;
  const remainingEmployees = targetTotal - employeeCounter;

  // Calculate employees per division based on weights
  const divisionCounts: Record<string, number> = {};
  for (const [key, def] of Object.entries(DIVISION_STRUCTURE)) {
    divisionCounts[def.code] = Math.floor((def.weight / 100) * remainingEmployees);
  }

  // Build list of all teams with their hierarchy info
  interface TeamInfo {
    teamCode: string;
    teamId: string | undefined;
    teamName: string;
    deptCode: string;
    deptId: string | undefined;
    deptName: string;
    buCode: string;
    buId: string | undefined;
    divCode: string;
    divId: string | undefined;
    leadId: string;
  }

  const allTeams: TeamInfo[] = [];

  for (const [divKey, divDef] of Object.entries(DIVISION_STRUCTURE)) {
    for (const buDef of divDef.businessUnits) {
      for (const deptDef of buDef.departments) {
        for (const teamDef of deptDef.teams) {
          allTeams.push({
            teamCode: teamDef.code,
            teamId: orgStructure.teams.get(teamDef.code),
            teamName: teamDef.name,
            deptCode: deptDef.code,
            deptId: orgStructure.departments.get(deptDef.code),
            deptName: deptDef.name,
            buCode: buDef.code,
            buId: orgStructure.businessUnits.get(buDef.code),
            divCode: divDef.code,
            divId: orgStructure.divisions.get(divDef.code),
            leadId: teamLeadIds[teamDef.code],
          });
        }
      }
    }
  }

  // Group teams by division
  const teamsByDivision: Record<string, TeamInfo[]> = {};
  for (const team of allTeams) {
    if (!teamsByDivision[team.divCode]) {
      teamsByDivision[team.divCode] = [];
    }
    teamsByDivision[team.divCode].push(team);
  }

  // Generate bulk employees for each division
  let progressCounter = 0;
  const progressInterval = 2000;

  for (const [divCode, count] of Object.entries(divisionCounts)) {
    const teamsInDiv = teamsByDivision[divCode] || [];
    if (teamsInDiv.length === 0) continue;

    // Distribute employees across teams
    const employeesPerTeam = Math.floor(count / teamsInDiv.length);

    for (const team of teamsInDiv) {
      for (let i = 0; i < employeesPerTeam; i++) {
        // Determine region based on distribution (US heavy, then EMEA, then APAC)
        const region = weightedRandom([
          { value: 'US' as const, weight: 50 },
          { value: 'EMEA' as const, weight: 30 },
          { value: 'APAC' as const, weight: 20 },
        ]);

        const locationId = pickRandom(locationsByRegion[region]);
        const jobLevel = weightedRandom(BULK_JOB_LEVELS);
        const employmentStatus = weightedRandom(EMPLOYMENT_STATUS_DIST);

        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();

        // Generate job title based on level and team
        let jobTitle: string;
        switch (jobLevel) {
          case JobLevel.IC:
            jobTitle = faker.helpers.arrayElement([
              `${team.deptName} Specialist`,
              `${team.deptName} Analyst`,
              `${team.deptName} Associate`,
              `Senior ${team.deptName} Specialist`,
            ]);
            break;
          case JobLevel.MANAGER:
            jobTitle = `${team.deptName} Manager`;
            break;
          case JobLevel.DIRECTOR:
            jobTitle = `${team.deptName} Director`;
            break;
          default:
            jobTitle = `${team.deptName} Specialist`;
        }

        await addEmployee({
          id: faker.string.uuid(),
          organizationId,
          hrisEmployeeId: generateHrisId(),
          firstName,
          lastName,
          preferredName: null,
          email: faker.internet.email({ provider: 'acme.example.com', firstName, lastName }).toLowerCase(),
          phone: chance(0.7) ? faker.phone.number() : null,
          jobTitle,
          jobLevel,
          divisionId: team.divId || null,
          businessUnitId: team.buId || null,
          departmentId: team.deptId || null,
          teamId: team.teamId || null,
          locationId,
          department: team.deptName,
          departmentCode: team.deptCode,
          location: null,
          locationCode: null,
          costCenter: `CC-${team.teamCode}`,
          managerId: team.leadId || null,
          managerName: null,
          workMode: selectWorkMode(team.divCode),
          primaryLanguage: selectLanguage(region),
          complianceRole: null,
          employmentStatus,
          employmentType: EmploymentType.FULL_TIME,
          hireDate: generateHireDate(referenceDate),
          isNamedPersona: false,
          personaRole: null,
          sourceSystem: 'SEED',
        });

        progressCounter++;
        if (progressCounter % progressInterval === 0) {
          console.log(`    Progress: ${employeeCounter} employees created...`);
        }
      }
    }
  }

  // Final flush
  await flushBatch();

  console.log(`  Total employees created: ${employeeCounter}`);

  return employeeMap;
}
