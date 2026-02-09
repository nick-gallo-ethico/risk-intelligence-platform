/**
 * HRIS Data Generator for Acme Corp Demo Environment
 * Generates 20,000 employees with 25+ realistic fields
 *
 * Run: npx ts-node prisma/seeders/hris-generator.ts
 * Output: prisma/seeders/data/acme-hris-export.csv
 */

import { faker } from '@faker-js/faker';
import * as fs from 'fs';
import * as path from 'path';

// Seed for reproducibility
faker.seed(42);

// ========================================
// Configuration
// ========================================
const TOTAL_EMPLOYEES = 20000;
const EXEC_COUNT = 12;
const VP_COUNT = 45;
const DIRECTOR_COUNT = 180;
const MANAGER_COUNT = 800;

// ========================================
// Reference Data
// ========================================
const DEPARTMENTS = [
  { code: 'ENG', name: 'Engineering', costCenter: 'CC-1000' },
  { code: 'PROD', name: 'Product', costCenter: 'CC-1100' },
  { code: 'SALES', name: 'Sales', costCenter: 'CC-2000' },
  { code: 'MKTG', name: 'Marketing', costCenter: 'CC-2100' },
  { code: 'FIN', name: 'Finance', costCenter: 'CC-3000' },
  { code: 'HR', name: 'Human Resources', costCenter: 'CC-3100' },
  { code: 'LEGAL', name: 'Legal', costCenter: 'CC-3200' },
  { code: 'OPS', name: 'Operations', costCenter: 'CC-4000' },
  { code: 'CS', name: 'Customer Success', costCenter: 'CC-4100' },
  { code: 'IT', name: 'Information Technology', costCenter: 'CC-5000' },
  { code: 'SEC', name: 'Security', costCenter: 'CC-5100' },
  { code: 'COMPL', name: 'Compliance & Ethics', costCenter: 'CC-3300' },
  { code: 'RD', name: 'Research & Development', costCenter: 'CC-1200' },
  { code: 'QA', name: 'Quality Assurance', costCenter: 'CC-1300' },
  { code: 'SUPPLY', name: 'Supply Chain', costCenter: 'CC-4200' },
];

const DIVISIONS = [
  { code: 'CORP', name: 'Corporate' },
  { code: 'NA', name: 'North America' },
  { code: 'EMEA', name: 'Europe, Middle East & Africa' },
  { code: 'APAC', name: 'Asia Pacific' },
  { code: 'LATAM', name: 'Latin America' },
];

// ========================================
// Locations - Matches location.seeder.ts exactly (52 locations)
// ========================================
const US_LOCATIONS = [
  { code: 'NYC-HQ', name: 'New York Headquarters', city: 'New York', state: 'NY', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/New_York', isHQ: true },
  { code: 'CHI-01', name: 'Chicago Office', city: 'Chicago', state: 'IL', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Chicago' },
  { code: 'LAX-01', name: 'Los Angeles Office', city: 'Los Angeles', state: 'CA', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Los_Angeles' },
  { code: 'SFO-01', name: 'San Francisco Office', city: 'San Francisco', state: 'CA', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Los_Angeles' },
  { code: 'BOS-01', name: 'Boston Office', city: 'Boston', state: 'MA', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/New_York' },
  { code: 'DFW-01', name: 'Dallas Office', city: 'Dallas', state: 'TX', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Chicago' },
  { code: 'IAH-01', name: 'Houston Office', city: 'Houston', state: 'TX', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Chicago' },
  { code: 'MIA-01', name: 'Miami Office', city: 'Miami', state: 'FL', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/New_York' },
  { code: 'ATL-01', name: 'Atlanta Office', city: 'Atlanta', state: 'GA', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/New_York' },
  { code: 'SEA-01', name: 'Seattle Office', city: 'Seattle', state: 'WA', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Los_Angeles' },
  { code: 'DEN-01', name: 'Denver Office', city: 'Denver', state: 'CO', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Denver' },
  { code: 'PHX-01', name: 'Phoenix Office', city: 'Phoenix', state: 'AZ', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Phoenix' },
  { code: 'PHL-01', name: 'Philadelphia Office', city: 'Philadelphia', state: 'PA', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/New_York' },
  { code: 'MSP-01', name: 'Minneapolis Office', city: 'Minneapolis', state: 'MN', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Chicago' },
  { code: 'DTW-01', name: 'Detroit Office', city: 'Detroit', state: 'MI', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Detroit' },
  { code: 'CLT-01', name: 'Charlotte Office', city: 'Charlotte', state: 'NC', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/New_York' },
  { code: 'BNA-01', name: 'Nashville Office', city: 'Nashville', state: 'TN', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Chicago' },
  { code: 'SAN-01', name: 'San Diego Office', city: 'San Diego', state: 'CA', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Los_Angeles' },
  { code: 'PDX-01', name: 'Portland Office', city: 'Portland', state: 'OR', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Los_Angeles' },
  { code: 'AUS-01', name: 'Austin Office', city: 'Austin', state: 'TX', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Chicago' },
  { code: 'RDU-01', name: 'Raleigh Office', city: 'Raleigh', state: 'NC', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/New_York' },
  { code: 'TPA-01', name: 'Tampa Office', city: 'Tampa', state: 'FL', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/New_York' },
  { code: 'IND-01', name: 'Indianapolis Office', city: 'Indianapolis', state: 'IN', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Indiana/Indianapolis' },
  { code: 'CMH-01', name: 'Columbus Office', city: 'Columbus', state: 'OH', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/New_York' },
  { code: 'STL-01', name: 'St. Louis Office', city: 'St. Louis', state: 'MO', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Chicago' },
];

const EMEA_LOCATIONS = [
  { code: 'LON-HQ', name: 'London Headquarters', city: 'London', state: '', country: 'GB', countryName: 'United Kingdom', region: 'EMEA', timezone: 'Europe/London', isHQ: true },
  { code: 'FRA-01', name: 'Frankfurt Office', city: 'Frankfurt', state: '', country: 'DE', countryName: 'Germany', region: 'EMEA', timezone: 'Europe/Berlin' },
  { code: 'PAR-01', name: 'Paris Office', city: 'Paris', state: '', country: 'FR', countryName: 'France', region: 'EMEA', timezone: 'Europe/Paris' },
  { code: 'AMS-01', name: 'Amsterdam Office', city: 'Amsterdam', state: '', country: 'NL', countryName: 'Netherlands', region: 'EMEA', timezone: 'Europe/Amsterdam' },
  { code: 'MAD-01', name: 'Madrid Office', city: 'Madrid', state: '', country: 'ES', countryName: 'Spain', region: 'EMEA', timezone: 'Europe/Madrid' },
  { code: 'MIL-01', name: 'Milan Office', city: 'Milan', state: '', country: 'IT', countryName: 'Italy', region: 'EMEA', timezone: 'Europe/Rome' },
  { code: 'DUB-01', name: 'Dublin Office', city: 'Dublin', state: '', country: 'IE', countryName: 'Ireland', region: 'EMEA', timezone: 'Europe/Dublin' },
  { code: 'MUC-01', name: 'Munich Office', city: 'Munich', state: '', country: 'DE', countryName: 'Germany', region: 'EMEA', timezone: 'Europe/Berlin' },
  { code: 'ZRH-01', name: 'Zurich Office', city: 'Zurich', state: '', country: 'CH', countryName: 'Switzerland', region: 'EMEA', timezone: 'Europe/Zurich' },
  { code: 'STO-01', name: 'Stockholm Office', city: 'Stockholm', state: '', country: 'SE', countryName: 'Sweden', region: 'EMEA', timezone: 'Europe/Stockholm' },
  { code: 'CPH-01', name: 'Copenhagen Office', city: 'Copenhagen', state: '', country: 'DK', countryName: 'Denmark', region: 'EMEA', timezone: 'Europe/Copenhagen' },
  { code: 'BRU-01', name: 'Brussels Office', city: 'Brussels', state: '', country: 'BE', countryName: 'Belgium', region: 'EMEA', timezone: 'Europe/Brussels' },
  { code: 'VIE-01', name: 'Vienna Office', city: 'Vienna', state: '', country: 'AT', countryName: 'Austria', region: 'EMEA', timezone: 'Europe/Vienna' },
  { code: 'PRG-01', name: 'Prague Office', city: 'Prague', state: '', country: 'CZ', countryName: 'Czech Republic', region: 'EMEA', timezone: 'Europe/Prague' },
  { code: 'WAW-01', name: 'Warsaw Office', city: 'Warsaw', state: '', country: 'PL', countryName: 'Poland', region: 'EMEA', timezone: 'Europe/Warsaw' },
];

const APAC_LOCATIONS = [
  { code: 'TYO-HQ', name: 'Tokyo Headquarters', city: 'Tokyo', state: '', country: 'JP', countryName: 'Japan', region: 'APAC', timezone: 'Asia/Tokyo', isHQ: true },
  { code: 'SIN-01', name: 'Singapore Office', city: 'Singapore', state: '', country: 'SG', countryName: 'Singapore', region: 'APAC', timezone: 'Asia/Singapore' },
  { code: 'SYD-01', name: 'Sydney Office', city: 'Sydney', state: 'NSW', country: 'AU', countryName: 'Australia', region: 'APAC', timezone: 'Australia/Sydney' },
  { code: 'MEL-01', name: 'Melbourne Office', city: 'Melbourne', state: 'VIC', country: 'AU', countryName: 'Australia', region: 'APAC', timezone: 'Australia/Melbourne' },
  { code: 'SHA-01', name: 'Shanghai Office', city: 'Shanghai', state: '', country: 'CN', countryName: 'China', region: 'APAC', timezone: 'Asia/Shanghai' },
  { code: 'BJS-01', name: 'Beijing Office', city: 'Beijing', state: '', country: 'CN', countryName: 'China', region: 'APAC', timezone: 'Asia/Shanghai' },
  { code: 'HKG-01', name: 'Hong Kong Office', city: 'Hong Kong', state: '', country: 'HK', countryName: 'Hong Kong', region: 'APAC', timezone: 'Asia/Hong_Kong' },
  { code: 'ICN-01', name: 'Seoul Office', city: 'Seoul', state: '', country: 'KR', countryName: 'South Korea', region: 'APAC', timezone: 'Asia/Seoul' },
  { code: 'BLR-01', name: 'Bangalore Office', city: 'Bangalore', state: '', country: 'IN', countryName: 'India', region: 'APAC', timezone: 'Asia/Kolkata' },
  { code: 'BOM-01', name: 'Mumbai Office', city: 'Mumbai', state: '', country: 'IN', countryName: 'India', region: 'APAC', timezone: 'Asia/Kolkata' },
  { code: 'MNL-01', name: 'Manila Office', city: 'Manila', state: '', country: 'PH', countryName: 'Philippines', region: 'APAC', timezone: 'Asia/Manila' },
  { code: 'AKL-01', name: 'Auckland Office', city: 'Auckland', state: '', country: 'NZ', countryName: 'New Zealand', region: 'APAC', timezone: 'Pacific/Auckland' },
];

// All locations combined (52 total - matches database)
const LOCATIONS = [...US_LOCATIONS, ...EMEA_LOCATIONS, ...APAC_LOCATIONS];

const JOB_LEVELS = [
  { level: 'IC1', title: 'Associate', minSalary: 55000, maxSalary: 75000 },
  { level: 'IC2', title: 'Specialist', minSalary: 70000, maxSalary: 95000 },
  { level: 'IC3', title: 'Senior', minSalary: 90000, maxSalary: 130000 },
  { level: 'IC4', title: 'Staff', minSalary: 125000, maxSalary: 175000 },
  { level: 'IC5', title: 'Principal', minSalary: 165000, maxSalary: 225000 },
  { level: 'M1', title: 'Manager', minSalary: 110000, maxSalary: 160000 },
  { level: 'M2', title: 'Senior Manager', minSalary: 145000, maxSalary: 195000 },
  { level: 'D1', title: 'Director', minSalary: 175000, maxSalary: 250000 },
  { level: 'D2', title: 'Senior Director', minSalary: 220000, maxSalary: 300000 },
  { level: 'VP', title: 'Vice President', minSalary: 280000, maxSalary: 400000 },
  { level: 'SVP', title: 'Senior Vice President', minSalary: 375000, maxSalary: 550000 },
  { level: 'C', title: 'C-Suite', minSalary: 500000, maxSalary: 1200000 },
];

const JOB_FAMILIES: Record<string, string[]> = {
  ENG: ['Software Engineer', 'Backend Engineer', 'Frontend Engineer', 'DevOps Engineer', 'Data Engineer', 'ML Engineer', 'Platform Engineer', 'Site Reliability Engineer'],
  PROD: ['Product Manager', 'Product Designer', 'UX Researcher', 'Technical Program Manager', 'Product Analyst'],
  SALES: ['Account Executive', 'Sales Development Rep', 'Solutions Engineer', 'Sales Operations Analyst', 'Enterprise Account Manager', 'Channel Partner Manager'],
  MKTG: ['Marketing Manager', 'Content Strategist', 'Demand Generation Manager', 'Brand Manager', 'Marketing Analyst', 'Events Manager', 'Social Media Manager'],
  FIN: ['Financial Analyst', 'Accountant', 'Controller', 'FP&A Analyst', 'Tax Specialist', 'Treasury Analyst', 'Audit Manager'],
  HR: ['HR Business Partner', 'Recruiter', 'Compensation Analyst', 'Learning & Development Specialist', 'Employee Relations Specialist', 'HRIS Analyst', 'Benefits Administrator'],
  LEGAL: ['Corporate Counsel', 'Paralegal', 'Contracts Manager', 'Employment Lawyer', 'IP Counsel', 'Privacy Counsel'],
  OPS: ['Operations Manager', 'Business Analyst', 'Process Improvement Specialist', 'Facilities Manager', 'Project Manager'],
  CS: ['Customer Success Manager', 'Support Engineer', 'Implementation Specialist', 'Technical Account Manager', 'Support Operations Analyst'],
  IT: ['IT Support Specialist', 'Systems Administrator', 'Network Engineer', 'IT Project Manager', 'Enterprise Architect', 'Database Administrator'],
  SEC: ['Security Engineer', 'Security Analyst', 'Compliance Analyst', 'Risk Analyst', 'Incident Response Analyst', 'Penetration Tester'],
  COMPL: ['Compliance Officer', 'Ethics Specialist', 'Internal Auditor', 'Risk Manager', 'Policy Analyst', 'Investigations Analyst'],
  RD: ['Research Scientist', 'Applied Researcher', 'Research Engineer', 'Lab Technician', 'Innovation Manager'],
  QA: ['QA Engineer', 'Test Automation Engineer', 'Quality Analyst', 'Performance Engineer', 'Release Manager'],
  SUPPLY: ['Supply Chain Analyst', 'Procurement Specialist', 'Logistics Coordinator', 'Vendor Manager', 'Inventory Analyst'],
};

const EMPLOYMENT_TYPES = ['Full-Time', 'Part-Time', 'Contractor', 'Intern', 'Temporary'];
const EMPLOYMENT_STATUSES = ['Active', 'On Leave', 'Terminated', 'Retired'];
const GENDERS = ['Male', 'Female', 'Non-Binary', 'Prefer Not to Say'];
const FLSA_STATUSES = ['Exempt', 'Non-Exempt'];
const PAY_FREQUENCIES = ['Biweekly', 'Semi-Monthly', 'Monthly'];
const WORK_SCHEDULES = ['Standard (M-F)', 'Flexible', 'Compressed (4x10)', 'Part-Time', 'Shift A', 'Shift B', 'Shift C'];
const EDUCATION_LEVELS = ['High School', 'Associate', 'Bachelor', 'Master', 'Doctorate', 'Professional'];

// ========================================
// Employee Generation
// ========================================
interface Employee {
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName: string;
  preferredName: string;
  fullName: string;
  workEmail: string;
  personalEmail: string;
  workPhone: string;
  mobilePhone: string;
  dateOfBirth: string;
  gender: string;
  nationalId: string;
  hireDate: string;
  originalHireDate: string;
  terminationDate: string;
  employmentStatus: string;
  employmentType: string;
  jobTitle: string;
  jobCode: string;
  jobLevel: string;
  jobFamily: string;
  department: string;
  departmentCode: string;
  division: string;
  divisionCode: string;
  costCenter: string;
  locationCode: string;
  locationName: string;
  locationCity: string;
  locationState: string;
  locationCountry: string;
  locationRegion: string;
  timezone: string;
  managerId: string;
  managerName: string;
  managerEmail: string;
  payGrade: string;
  annualSalary: number;
  payCurrency: string;
  payFrequency: string;
  flsaStatus: string;
  workSchedule: string;
  fte: number;
  isManager: boolean;
  directReports: number;
  educationLevel: string;
  veteranStatus: string;
  disabilityStatus: string;
  ethnicity: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  lastReviewDate: string;
  nextReviewDate: string;
  performanceRating: string;
  lastPromotionDate: string;
  tenureYears: number;
  badgeNumber: string;
  companyCode: string;
  legalEntity: string;
}

// Storage for hierarchy
const employees: Employee[] = [];
const managerMap = new Map<string, string[]>(); // managerId -> employeeIds[]

function generateEmployeeId(index: number): string {
  return `EMP${String(index).padStart(6, '0')}`;
}

function generateNationalId(): string {
  return `XXX-XX-${faker.string.numeric(4)}`;
}

function generateBadgeNumber(): string {
  return `B${faker.string.numeric(8)}`;
}

function pickWeighted<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let random = faker.number.float({ min: 0, max: total });
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

function getJobLevel(isExec: boolean, isVP: boolean, isDirector: boolean, isManager: boolean): typeof JOB_LEVELS[number] {
  if (isExec) return JOB_LEVELS.find(l => l.level === 'C')!;
  if (isVP) return pickWeighted(
    JOB_LEVELS.filter(l => ['VP', 'SVP'].includes(l.level)),
    [3, 1]
  );
  if (isDirector) return pickWeighted(
    JOB_LEVELS.filter(l => ['D1', 'D2'].includes(l.level)),
    [2, 1]
  );
  if (isManager) return pickWeighted(
    JOB_LEVELS.filter(l => ['M1', 'M2'].includes(l.level)),
    [3, 1]
  );
  // Individual contributor
  return pickWeighted(
    JOB_LEVELS.filter(l => l.level.startsWith('IC')),
    [15, 35, 30, 15, 5] // Most people are IC2-IC3
  );
}

function getLocationByDivision(division: typeof DIVISIONS[number]): typeof LOCATIONS[number] {
  // Map divisions to regions and pick from those locations
  const divisionToRegion: Record<string, string> = {
    CORP: 'US',     // Corporate HQ in US
    NA: 'US',       // North America = US locations
    EMEA: 'EMEA',   // EMEA locations
    APAC: 'APAC',   // APAC locations
    LATAM: 'US',    // LATAM employees assigned to nearest US office
  };

  const region = divisionToRegion[division.code] || 'US';

  // Filter locations by region
  const regionLocations = LOCATIONS.filter(l => l.region === region);

  // Pick a random location from the region
  return faker.helpers.arrayElement(regionLocations);
}

function generateEmployee(
  index: number,
  managerId: string | null,
  managerName: string | null,
  managerEmail: string | null,
  isExec: boolean,
  isVP: boolean,
  isDirector: boolean,
  isManager: boolean,
  forceDepartment?: typeof DEPARTMENTS[number],
  forceDivision?: typeof DIVISIONS[number],
): Employee {
  const employeeId = generateEmployeeId(index);
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const middleName = faker.datatype.boolean(0.3) ? faker.person.firstName() : '';
  const preferredName = faker.datatype.boolean(0.15) ? faker.person.firstName() : '';
  const gender = pickWeighted(GENDERS, [48, 48, 2, 2]);

  // Dates
  const hireDate = faker.date.between({
    from: new Date('2010-01-01'),
    to: new Date('2025-10-01')
  });
  const originalHireDate = faker.datatype.boolean(0.1)
    ? faker.date.between({ from: new Date('2005-01-01'), to: hireDate })
    : hireDate;

  const isTerminated = faker.datatype.boolean(0.05);
  const terminationDate = isTerminated
    ? faker.date.between({ from: hireDate, to: new Date('2025-12-01') })
    : null;

  const dateOfBirth = faker.date.between({
    from: new Date('1960-01-01'),
    to: new Date('2002-01-01')
  });

  // Org structure
  const department = forceDepartment || faker.helpers.arrayElement(DEPARTMENTS);
  const division = forceDivision || pickWeighted(DIVISIONS, [10, 50, 20, 15, 5]);
  const location = getLocationByDivision(division);

  // Job details
  const level = getJobLevel(isExec, isVP, isDirector, isManager);
  const jobFamily = faker.helpers.arrayElement(JOB_FAMILIES[department.code] || ['Specialist']);

  let jobTitle = '';
  if (isExec) {
    const execTitles: Record<string, string> = {
      ENG: 'Chief Technology Officer',
      FIN: 'Chief Financial Officer',
      HR: 'Chief People Officer',
      LEGAL: 'General Counsel',
      MKTG: 'Chief Marketing Officer',
      SALES: 'Chief Revenue Officer',
      OPS: 'Chief Operating Officer',
      COMPL: 'Chief Compliance Officer',
      SEC: 'Chief Information Security Officer',
      PROD: 'Chief Product Officer',
    };
    jobTitle = execTitles[department.code] || 'Chief Executive Officer';
  } else if (isVP) {
    jobTitle = `VP of ${department.name}`;
  } else if (isDirector) {
    jobTitle = `Director, ${jobFamily}`;
  } else if (isManager) {
    jobTitle = `${jobFamily} Manager`;
  } else {
    const prefix = level.title;
    jobTitle = prefix === 'Associate' ? `${jobFamily} ${prefix}` : `${prefix} ${jobFamily}`;
  }

  const jobCode = `${department.code}-${level.level}-${String(faker.number.int({ min: 100, max: 999 }))}`;

  // Compensation
  const salary = faker.number.int({
    min: level.minSalary,
    max: level.maxSalary
  });
  const currency = ['USA', 'CAN'].includes(location.country) ? 'USD'
    : location.country === 'GBR' ? 'GBP'
    : ['DEU', 'FRA', 'IRL'].includes(location.country) ? 'EUR'
    : location.country === 'AUS' ? 'AUD'
    : location.country === 'JPN' ? 'JPY'
    : location.country === 'SGP' ? 'SGD'
    : location.country === 'IND' ? 'INR'
    : location.country === 'BRA' ? 'BRL'
    : location.country === 'MEX' ? 'MXN'
    : 'USD';

  // Employment details
  const employmentType = isTerminated
    ? faker.helpers.arrayElement(EMPLOYMENT_TYPES)
    : pickWeighted(EMPLOYMENT_TYPES, [85, 5, 7, 2, 1]);
  const employmentStatus = isTerminated
    ? 'Terminated'
    : pickWeighted(['Active', 'On Leave'], [97, 3]);
  const fte = employmentType === 'Full-Time' ? 1.0
    : employmentType === 'Part-Time' ? 0.5
    : employmentType === 'Intern' ? 1.0
    : 1.0;

  // Reviews
  const lastReviewDate = faker.date.between({
    from: new Date('2024-01-01'),
    to: new Date('2025-06-30')
  });
  const nextReviewDate = new Date(lastReviewDate);
  nextReviewDate.setFullYear(nextReviewDate.getFullYear() + 1);

  const performanceRatings = ['Exceeds Expectations', 'Meets Expectations', 'Developing', 'Needs Improvement'];
  const performanceRating = pickWeighted(performanceRatings, [20, 60, 15, 5]);

  const lastPromotionDate = faker.datatype.boolean(0.3)
    ? faker.date.between({ from: hireDate, to: new Date() })
    : null;

  // Tenure
  const tenureYears = Math.round(
    (new Date().getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000) * 10
  ) / 10;

  // Address
  const streetAddress = faker.location.streetAddress();
  const city = faker.location.city();
  const state = faker.location.state({ abbreviated: true });
  const postalCode = faker.location.zipCode();
  const addressCountry = location.country;

  // Emergency contact
  const relations = ['Spouse', 'Parent', 'Sibling', 'Partner', 'Friend'];

  // Demographics (optional fields - some blank)
  const veteranStatuses = ['Not a Veteran', 'Veteran', 'Disabled Veteran', 'Prefer Not to Say', ''];
  const disabilityStatuses = ['No Disability', 'Has Disability', 'Prefer Not to Say', ''];
  const ethnicities = ['White', 'Black or African American', 'Hispanic or Latino', 'Asian', 'Two or More Races', 'Native American', 'Pacific Islander', 'Prefer Not to Say', ''];

  const employee: Employee = {
    employeeId,
    firstName,
    lastName,
    middleName,
    preferredName,
    fullName: `${firstName}${middleName ? ' ' + middleName : ''} ${lastName}`,
    workEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@acme.local`,
    personalEmail: faker.internet.email({ firstName, lastName }),
    workPhone: faker.phone.number({ style: 'national' }),
    mobilePhone: faker.phone.number({ style: 'national' }),
    dateOfBirth: dateOfBirth.toISOString().split('T')[0],
    gender,
    nationalId: generateNationalId(),
    hireDate: hireDate.toISOString().split('T')[0],
    originalHireDate: originalHireDate.toISOString().split('T')[0],
    terminationDate: terminationDate ? terminationDate.toISOString().split('T')[0] : '',
    employmentStatus,
    employmentType,
    jobTitle,
    jobCode,
    jobLevel: level.level,
    jobFamily,
    department: department.name,
    departmentCode: department.code,
    division: division.name,
    divisionCode: division.code,
    costCenter: department.costCenter,
    locationCode: location.code,
    locationName: location.name,
    locationCity: location.city,
    locationState: location.state,
    locationCountry: location.country,
    locationRegion: location.region,
    timezone: location.timezone,
    managerId: managerId || '',
    managerName: managerName || '',
    managerEmail: managerEmail || '',
    payGrade: level.level,
    annualSalary: salary,
    payCurrency: currency,
    payFrequency: faker.helpers.arrayElement(PAY_FREQUENCIES),
    flsaStatus: ['IC1', 'IC2'].includes(level.level) ? 'Non-Exempt' : 'Exempt',
    workSchedule: faker.helpers.arrayElement(WORK_SCHEDULES),
    fte,
    isManager: isExec || isVP || isDirector || isManager,
    directReports: 0, // Will be calculated later
    educationLevel: pickWeighted(EDUCATION_LEVELS, [5, 10, 45, 30, 5, 5]),
    veteranStatus: faker.helpers.arrayElement(veteranStatuses),
    disabilityStatus: faker.helpers.arrayElement(disabilityStatuses),
    ethnicity: faker.helpers.arrayElement(ethnicities),
    emergencyContactName: faker.person.fullName(),
    emergencyContactPhone: faker.phone.number({ style: 'national' }),
    emergencyContactRelation: faker.helpers.arrayElement(relations),
    streetAddress,
    city,
    state,
    postalCode,
    country: addressCountry,
    lastReviewDate: lastReviewDate.toISOString().split('T')[0],
    nextReviewDate: nextReviewDate.toISOString().split('T')[0],
    performanceRating,
    lastPromotionDate: lastPromotionDate ? lastPromotionDate.toISOString().split('T')[0] : '',
    tenureYears,
    badgeNumber: generateBadgeNumber(),
    companyCode: 'ACME',
    legalEntity: `Acme Corp ${division.name}`,
  };

  return employee;
}

function generateHierarchy(): void {
  console.log('Generating HRIS data for 20,000 employees...\n');

  let index = 1;

  // 1. Generate CEO
  console.log('Creating executive team...');
  const ceo = generateEmployee(index++, null, null, null, true, false, false, false,
    DEPARTMENTS.find(d => d.code === 'OPS')!, DIVISIONS.find(d => d.code === 'CORP')!);
  ceo.jobTitle = 'Chief Executive Officer';
  ceo.managerId = '';
  employees.push(ceo);

  // 2. Generate C-Suite (reports to CEO)
  const cSuite: Employee[] = [];
  const execDepts = ['ENG', 'FIN', 'HR', 'LEGAL', 'MKTG', 'SALES', 'OPS', 'COMPL', 'SEC', 'PROD', 'RD'];
  for (const deptCode of execDepts) {
    const dept = DEPARTMENTS.find(d => d.code === deptCode)!;
    const exec = generateEmployee(index++, ceo.employeeId, ceo.fullName, ceo.workEmail, true, false, false, false, dept, DIVISIONS.find(d => d.code === 'CORP')!);
    employees.push(exec);
    cSuite.push(exec);
  }
  console.log(`  Created ${cSuite.length + 1} executives`);

  // 3. Generate VPs (report to C-Suite)
  console.log('Creating VP layer...');
  const vps: Employee[] = [];
  const vpsPerExec = Math.ceil(VP_COUNT / cSuite.length);
  for (const exec of cSuite) {
    const deptCode = exec.departmentCode;
    const dept = DEPARTMENTS.find(d => d.code === deptCode)!;
    for (let i = 0; i < vpsPerExec && vps.length < VP_COUNT; i++) {
      const division = faker.helpers.arrayElement(DIVISIONS);
      const vp = generateEmployee(index++, exec.employeeId, exec.fullName, exec.workEmail, false, true, false, false, dept, division);
      employees.push(vp);
      vps.push(vp);
    }
  }
  console.log(`  Created ${vps.length} VPs`);

  // 4. Generate Directors (report to VPs)
  console.log('Creating Director layer...');
  const directors: Employee[] = [];
  const directorsPerVP = Math.ceil(DIRECTOR_COUNT / vps.length);
  for (const vp of vps) {
    const dept = DEPARTMENTS.find(d => d.code === vp.departmentCode)!;
    for (let i = 0; i < directorsPerVP && directors.length < DIRECTOR_COUNT; i++) {
      const director = generateEmployee(index++, vp.employeeId, vp.fullName, vp.workEmail, false, false, true, false, dept, DIVISIONS.find(d => d.code === vp.divisionCode)!);
      employees.push(director);
      directors.push(director);
    }
  }
  console.log(`  Created ${directors.length} Directors`);

  // 5. Generate Managers (report to Directors)
  console.log('Creating Manager layer...');
  const managers: Employee[] = [];
  const managersPerDirector = Math.ceil(MANAGER_COUNT / directors.length);
  for (const director of directors) {
    const dept = DEPARTMENTS.find(d => d.code === director.departmentCode)!;
    for (let i = 0; i < managersPerDirector && managers.length < MANAGER_COUNT; i++) {
      const manager = generateEmployee(index++, director.employeeId, director.fullName, director.workEmail, false, false, false, true, dept, DIVISIONS.find(d => d.code === director.divisionCode)!);
      employees.push(manager);
      managers.push(manager);
    }
  }
  console.log(`  Created ${managers.length} Managers`);

  // 6. Generate Individual Contributors (report to Managers)
  console.log('Creating Individual Contributors...');
  const remainingCount = TOTAL_EMPLOYEES - employees.length;
  const icsPerManager = Math.ceil(remainingCount / managers.length);

  let icCount = 0;
  for (const manager of managers) {
    const dept = DEPARTMENTS.find(d => d.code === manager.departmentCode)!;
    const teamSize = faker.number.int({ min: Math.max(1, icsPerManager - 5), max: icsPerManager + 5 });
    for (let i = 0; i < teamSize && employees.length < TOTAL_EMPLOYEES; i++) {
      const ic = generateEmployee(index++, manager.employeeId, manager.fullName, manager.workEmail, false, false, false, false, dept, DIVISIONS.find(d => d.code === manager.divisionCode)!);
      employees.push(ic);
      icCount++;
    }
  }
  console.log(`  Created ${icCount} Individual Contributors`);

  // 7. Calculate direct reports
  console.log('\nCalculating direct reports...');
  const reportsCount = new Map<string, number>();
  for (const emp of employees) {
    if (emp.managerId) {
      reportsCount.set(emp.managerId, (reportsCount.get(emp.managerId) || 0) + 1);
    }
  }
  for (const emp of employees) {
    emp.directReports = reportsCount.get(emp.employeeId) || 0;
  }

  console.log(`\nTotal employees generated: ${employees.length}`);
}

function writeCSV(): void {
  const outputDir = path.join(__dirname, 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'acme-hris-export.csv');

  // CSV headers
  const headers = [
    'Employee ID',
    'First Name',
    'Last Name',
    'Middle Name',
    'Preferred Name',
    'Full Name',
    'Work Email',
    'Personal Email',
    'Work Phone',
    'Mobile Phone',
    'Date of Birth',
    'Gender',
    'National ID',
    'Hire Date',
    'Original Hire Date',
    'Termination Date',
    'Employment Status',
    'Employment Type',
    'Job Title',
    'Job Code',
    'Job Level',
    'Job Family',
    'Department',
    'Department Code',
    'Division',
    'Division Code',
    'Cost Center',
    'Location Code',
    'Location Name',
    'Location City',
    'Location State',
    'Location Country',
    'Location Region',
    'Timezone',
    'Manager ID',
    'Manager Name',
    'Manager Email',
    'Pay Grade',
    'Annual Salary',
    'Pay Currency',
    'Pay Frequency',
    'FLSA Status',
    'Work Schedule',
    'FTE',
    'Is Manager',
    'Direct Reports',
    'Education Level',
    'Veteran Status',
    'Disability Status',
    'Ethnicity',
    'Emergency Contact Name',
    'Emergency Contact Phone',
    'Emergency Contact Relation',
    'Street Address',
    'City',
    'State',
    'Postal Code',
    'Country',
    'Last Review Date',
    'Next Review Date',
    'Performance Rating',
    'Last Promotion Date',
    'Tenure Years',
    'Badge Number',
    'Company Code',
    'Legal Entity',
  ];

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = employees.map(emp => [
    emp.employeeId,
    emp.firstName,
    emp.lastName,
    emp.middleName,
    emp.preferredName,
    emp.fullName,
    emp.workEmail,
    emp.personalEmail,
    emp.workPhone,
    emp.mobilePhone,
    emp.dateOfBirth,
    emp.gender,
    emp.nationalId,
    emp.hireDate,
    emp.originalHireDate,
    emp.terminationDate,
    emp.employmentStatus,
    emp.employmentType,
    emp.jobTitle,
    emp.jobCode,
    emp.jobLevel,
    emp.jobFamily,
    emp.department,
    emp.departmentCode,
    emp.division,
    emp.divisionCode,
    emp.costCenter,
    emp.locationCode,
    emp.locationName,
    emp.locationCity,
    emp.locationState,
    emp.locationCountry,
    emp.locationRegion,
    emp.timezone,
    emp.managerId,
    emp.managerName,
    emp.managerEmail,
    emp.payGrade,
    emp.annualSalary,
    emp.payCurrency,
    emp.payFrequency,
    emp.flsaStatus,
    emp.workSchedule,
    emp.fte,
    emp.isManager,
    emp.directReports,
    emp.educationLevel,
    emp.veteranStatus,
    emp.disabilityStatus,
    emp.ethnicity,
    emp.emergencyContactName,
    emp.emergencyContactPhone,
    emp.emergencyContactRelation,
    emp.streetAddress,
    emp.city,
    emp.state,
    emp.postalCode,
    emp.country,
    emp.lastReviewDate,
    emp.nextReviewDate,
    emp.performanceRating,
    emp.lastPromotionDate,
    emp.tenureYears,
    emp.badgeNumber,
    emp.companyCode,
    emp.legalEntity,
  ].map(escapeCSV).join(','));

  const csv = [headers.join(','), ...rows].join('\n');

  fs.writeFileSync(outputPath, csv, 'utf-8');
  console.log(`\nCSV file written to: ${outputPath}`);
  console.log(`File size: ${(Buffer.byteLength(csv, 'utf-8') / (1024 * 1024)).toFixed(2)} MB`);
}

function printStats(): void {
  console.log('\n========================================');
  console.log('HRIS EXPORT STATISTICS');
  console.log('========================================');

  // By department
  const byDept = new Map<string, number>();
  for (const emp of employees) {
    byDept.set(emp.department, (byDept.get(emp.department) || 0) + 1);
  }
  console.log('\nBy Department:');
  for (const [dept, count] of [...byDept.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${dept}: ${count}`);
  }

  // By division
  const byDiv = new Map<string, number>();
  for (const emp of employees) {
    byDiv.set(emp.division, (byDiv.get(emp.division) || 0) + 1);
  }
  console.log('\nBy Division:');
  for (const [div, count] of [...byDiv.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${div}: ${count}`);
  }

  // By location
  const byLoc = new Map<string, number>();
  for (const emp of employees) {
    byLoc.set(emp.locationCity, (byLoc.get(emp.locationCity) || 0) + 1);
  }
  console.log('\nBy Location (Top 10):');
  for (const [loc, count] of [...byLoc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${loc}: ${count}`);
  }

  // By level
  const byLevel = new Map<string, number>();
  for (const emp of employees) {
    byLevel.set(emp.jobLevel, (byLevel.get(emp.jobLevel) || 0) + 1);
  }
  console.log('\nBy Job Level:');
  for (const [level, count] of [...byLevel.entries()].sort()) {
    console.log(`  ${level}: ${count}`);
  }

  // Managers
  const managerCount = employees.filter(e => e.isManager).length;
  console.log(`\nManagers: ${managerCount} (${((managerCount / employees.length) * 100).toFixed(1)}%)`);

  // Avg direct reports for managers
  const managersWithReports = employees.filter(e => e.directReports > 0);
  const avgReports = managersWithReports.reduce((sum, e) => sum + e.directReports, 0) / managersWithReports.length;
  console.log(`Avg Direct Reports: ${avgReports.toFixed(1)}`);

  // Fields count
  console.log(`\nTotal Fields: 64`);
  console.log(`Total Rows: ${employees.length}`);
}

// Run
generateHierarchy();
writeCSV();
printStats();

console.log('\n========================================');
console.log('HRIS DATA GENERATION COMPLETE');
console.log('========================================');
