/**
 * RIU (Risk Intelligence Unit) Seeder
 *
 * Creates 5,000 historical intake records across all RIU types with realistic patterns.
 * RIUs are the immutable intake records - the foundation of the demo data.
 *
 * Features:
 * - AI-quality realistic narratives (not lorem ipsum)
 * - Hotline-heavy channel distribution (60% phone, 30% web, 10% other)
 * - Category-based anonymity rates (harassment more anonymous)
 * - Seasonality spikes (after reorgs, holidays, policy changes)
 * - Multi-reporter incidents (some RIUs link to same incident)
 * - Time-zone realistic timestamps (EMEA during European hours)
 * - Edge cases (long narratives, Unicode, boundary dates)
 */

import {
  PrismaClient,
  RiuType,
  RiuSourceChannel,
  RiuReporterType,
  RiuStatus,
  Severity,
} from '@prisma/client';
import { faker } from '@faker-js/faker';
import { nanoid } from 'nanoid';
import { addDays, setHours, setMinutes } from 'date-fns';
import { SEED_CONFIG } from './config';
import { weightedRandom, chance, randomInt, pickRandom } from './utils';
import { generateSeasonalHistoricalDate } from './utils/seasonality';
import {
  generateNarrative,
  generateUnicodeNarrative,
  generateMinimalNarrative,
  getCategoryAnonymityRate,
} from './data/narrative-templates';

// Seed offset for reproducibility (masterSeed + 4000 for RIUs)
const SEED_OFFSET = 4000;

// Batch size for database inserts
const BATCH_SIZE = 100;

// ============================================
// Channel Distribution Configuration
// ============================================

/**
 * Channel distribution to achieve 60% phone, 30% web, 10% other
 */
const CHANNEL_DISTRIBUTION = {
  PHONE: 60,
  WEB_FORM: 30,
  OTHER: 10,
};

/**
 * RIU type distribution achieving channel targets
 */
const RIU_TYPE_DISTRIBUTION = [
  { value: RiuType.HOTLINE_REPORT, weight: 55 }, // Primary driver of phone channel
  { value: RiuType.WEB_FORM_SUBMISSION, weight: 25 }, // Primary driver of web channel
  { value: RiuType.DISCLOSURE_RESPONSE, weight: 8 }, // Campaign channel
  { value: RiuType.ATTESTATION_RESPONSE, weight: 5 }, // Campaign channel
  { value: RiuType.INCIDENT_FORM, weight: 3 }, // Web channel
  { value: RiuType.PROXY_REPORT, weight: 2 }, // Other channel
  { value: RiuType.CHATBOT_TRANSCRIPT, weight: 1.5 }, // Other channel
  { value: RiuType.SURVEY_RESPONSE, weight: 0.5 }, // Campaign channel
];

/**
 * RIU type to source channel mapping
 */
const TYPE_TO_CHANNEL: Record<RiuType, RiuSourceChannel> = {
  [RiuType.HOTLINE_REPORT]: RiuSourceChannel.PHONE,
  [RiuType.WEB_FORM_SUBMISSION]: RiuSourceChannel.WEB_FORM,
  [RiuType.DISCLOSURE_RESPONSE]: RiuSourceChannel.CAMPAIGN,
  [RiuType.ATTESTATION_RESPONSE]: RiuSourceChannel.CAMPAIGN,
  [RiuType.INCIDENT_FORM]: RiuSourceChannel.WEB_FORM,
  [RiuType.PROXY_REPORT]: RiuSourceChannel.PROXY,
  [RiuType.CHATBOT_TRANSCRIPT]: RiuSourceChannel.CHATBOT,
  [RiuType.SURVEY_RESPONSE]: RiuSourceChannel.CAMPAIGN,
};

/**
 * Severity distribution by RIU type
 */
const TYPE_SEVERITY_DISTRIBUTION: Record<RiuType, Array<{ value: Severity; weight: number }>> = {
  [RiuType.HOTLINE_REPORT]: [
    { value: Severity.HIGH, weight: 30 },
    { value: Severity.MEDIUM, weight: 50 },
    { value: Severity.LOW, weight: 20 },
  ],
  [RiuType.WEB_FORM_SUBMISSION]: [
    { value: Severity.HIGH, weight: 23 },
    { value: Severity.MEDIUM, weight: 55 },
    { value: Severity.LOW, weight: 22 },
  ],
  [RiuType.DISCLOSURE_RESPONSE]: [
    { value: Severity.HIGH, weight: 10 },
    { value: Severity.MEDIUM, weight: 40 },
    { value: Severity.LOW, weight: 50 },
  ],
  [RiuType.ATTESTATION_RESPONSE]: [
    { value: Severity.HIGH, weight: 5 },
    { value: Severity.MEDIUM, weight: 25 },
    { value: Severity.LOW, weight: 70 },
  ],
  [RiuType.INCIDENT_FORM]: [
    { value: Severity.HIGH, weight: 35 },
    { value: Severity.MEDIUM, weight: 45 },
    { value: Severity.LOW, weight: 20 },
  ],
  [RiuType.PROXY_REPORT]: [
    { value: Severity.HIGH, weight: 25 },
    { value: Severity.MEDIUM, weight: 50 },
    { value: Severity.LOW, weight: 25 },
  ],
  [RiuType.CHATBOT_TRANSCRIPT]: [
    { value: Severity.HIGH, weight: 17 },
    { value: Severity.MEDIUM, weight: 50 },
    { value: Severity.LOW, weight: 33 },
  ],
  [RiuType.SURVEY_RESPONSE]: [
    { value: Severity.HIGH, weight: 5 },
    { value: Severity.MEDIUM, weight: 30 },
    { value: Severity.LOW, weight: 65 },
  ],
};

// ============================================
// Category-Based Anonymity Rates
// ============================================

/**
 * Category-based anonymity rates
 * Higher rates for sensitive categories, lower for self-disclosures
 */
const CATEGORY_ANONYMITY_RATES: Record<string, number> = {
  // High anonymity categories
  harassment: 0.55,
  retaliation: 0.7,
  discrimination: 0.5,
  workplace_violence: 0.6,

  // Moderate anonymity
  financial_misconduct: 0.35,
  policy_violation: 0.35,
  data_privacy: 0.4,

  // Low anonymity (often self-disclosures or want action)
  conflict_of_interest: 0.25,
  safety: 0.3,
  gifts_entertainment: 0.2,

  // Default
  default: 0.4,
};

/**
 * Determine reporter type based on category anonymity rate
 *
 * @param categoryCode - Category code or name
 * @returns Reporter type (anonymous, confidential, or identified)
 */
function determineReporterType(categoryCode: string): RiuReporterType {
  // Normalize category code to match CATEGORY_ANONYMITY_RATES keys
  const normalizedCode = categoryCode
    .toLowerCase()
    .replace(/[^a-z]/g, '_')
    .replace(/_+/g, '_')
    .replace(/(^_|_$)/g, '');

  // Try to find a matching key
  let anonymityRate = CATEGORY_ANONYMITY_RATES.default;
  for (const [key, rate] of Object.entries(CATEGORY_ANONYMITY_RATES)) {
    if (normalizedCode.includes(key) || key.includes(normalizedCode)) {
      anonymityRate = rate;
      break;
    }
  }

  const roll = Math.random();
  if (roll < anonymityRate) {
    return RiuReporterType.ANONYMOUS;
  } else if (roll < anonymityRate + 0.25) {
    return RiuReporterType.CONFIDENTIAL;
  } else {
    return RiuReporterType.IDENTIFIED;
  }
}

// ============================================
// Multi-Reporter Incident Linking
// ============================================

/**
 * Linked incident structure for multi-reporter scenarios
 */
export interface LinkedIncident {
  /** Shared identifier for related RIUs */
  incidentId: string;
  /** First RIU that reported this incident */
  primaryRiuId: string;
  /** Subsequent RIUs related to the same incident */
  relatedRiuIds: string[];
  /** When the underlying incident occurred */
  incidentDate: Date;
  /** Category ID for all related RIUs */
  categoryId: string;
  /** Department where incident occurred */
  departmentId?: string;
  /** Number of reporters expected */
  reporterCount: number;
  /** RIUs created so far */
  riusCreated: number;
}

/** Rate of RIUs that are linked (multi-reporter incidents) */
const LINKED_INCIDENT_RATE = 0.05; // ~5%

/** Size range for linked incidents */
const LINKED_INCIDENT_SIZE = { min: 2, max: 4 };

/**
 * Generate linked incidents plan
 *
 * @param totalRius - Total number of RIUs to generate
 * @param categoryIds - Available category IDs
 * @returns Array of linked incident definitions
 */
function generateLinkedIncidentsPlan(
  totalRius: number,
  categoryIds: string[],
): LinkedIncident[] {
  const targetLinkedRius = Math.floor(totalRius * LINKED_INCIDENT_RATE);
  const avgReportersPerIncident = (LINKED_INCIDENT_SIZE.min + LINKED_INCIDENT_SIZE.max) / 2;
  const numIncidents = Math.floor(targetLinkedRius / avgReportersPerIncident);

  const incidents: LinkedIncident[] = [];

  for (let i = 0; i < numIncidents; i++) {
    const reporterCount = randomInt(LINKED_INCIDENT_SIZE.min, LINKED_INCIDENT_SIZE.max);
    const { date } = generateSeasonalHistoricalDate({ recentBias: 0.3 });

    incidents.push({
      incidentId: faker.string.uuid(),
      primaryRiuId: '',
      relatedRiuIds: [],
      incidentDate: date,
      categoryId: pickRandom(categoryIds),
      reporterCount,
      riusCreated: 0,
    });
  }

  return incidents;
}

/**
 * Get a linked incident that needs more reporters
 *
 * @param incidents - Array of linked incidents
 * @returns Incident needing reporters, or null
 */
function getIncidentNeedingReporters(incidents: LinkedIncident[]): LinkedIncident | null {
  for (const incident of incidents) {
    if (incident.riusCreated < incident.reporterCount) {
      return incident;
    }
  }
  return null;
}

/**
 * Generate related narrative for multi-reporter incident
 *
 * @param isPrimary - Whether this is the first report
 * @param categoryCode - Category code
 * @returns Narrative with appropriate framing
 */
function generateLinkedNarrative(isPrimary: boolean, categoryCode: string): string {
  const { narrative: baseNarrative } = generateNarrative(categoryCode);

  if (isPrimary) {
    return baseNarrative;
  }

  // Related reports have different framing
  const relatedOpeners = [
    'I am writing to corroborate a report that may have already been filed.',
    'I witnessed the same incident that I believe was reported by someone else.',
    'I have additional information about a situation that may already be under review.',
    'I want to add my account to an existing complaint.',
    'I also experienced the same issue that others have reported.',
  ];

  return pickRandom(relatedOpeners) + '\n\n' + baseNarrative;
}

// ============================================
// Time-Zone Realistic Timestamps
// ============================================

/**
 * Regional business hours in UTC
 */
const TIMEZONE_CONFIG = {
  AMERICAS: { startHour: 13, endHour: 23 }, // 8am-6pm ET = 13:00-23:00 UTC
  EMEA: { startHour: 7, endHour: 17 }, // 8am-6pm CET = 07:00-17:00 UTC
  APAC: { startHour: 23, endHour: 9 }, // 8am-6pm JST = 23:00-09:00 UTC (wraps)
};

/**
 * Regional distribution of reports
 */
const REGIONAL_DISTRIBUTION = [
  { value: 'AMERICAS' as const, weight: 50 },
  { value: 'EMEA' as const, weight: 35 },
  { value: 'APAC' as const, weight: 15 },
];

/**
 * Adjust timestamp for regional business hours
 *
 * @param baseDate - Date to adjust
 * @param region - Geographic region
 * @returns Date adjusted to business hours
 */
function adjustTimestampForRegion(
  baseDate: Date,
  region: 'AMERICAS' | 'EMEA' | 'APAC',
): Date {
  const config = TIMEZONE_CONFIG[region];
  const result = new Date(baseDate);

  let businessHour: number;

  if (region === 'APAC') {
    // APAC wraps around midnight UTC
    // 23:00-09:00 UTC range
    if (Math.random() < 0.5) {
      // Evening hours (23:00-23:59)
      businessHour = 23;
    } else {
      // Morning hours (00:00-09:00)
      businessHour = randomInt(0, 9);
    }
  } else {
    businessHour = randomInt(config.startHour, config.endHour);
  }

  const adjustedDate = setHours(result, businessHour);
  return setMinutes(adjustedDate, randomInt(0, 59));
}

/**
 * Determine region from employee location
 *
 * @param locationId - Employee's location ID
 * @param locationRegionMap - Map of location ID to region
 * @returns Region string
 */
function determineRegionFromLocation(
  locationId: string | undefined,
  locationRegionMap: Map<string, string>,
): 'AMERICAS' | 'EMEA' | 'APAC' {
  if (locationId) {
    const region = locationRegionMap.get(locationId);
    if (region === 'US') return 'AMERICAS';
    if (region === 'EMEA') return 'EMEA';
    if (region === 'APAC') return 'APAC';
  }

  // Default to weighted random
  return weightedRandom(REGIONAL_DISTRIBUTION);
}

// ============================================
// Edge Cases
// ============================================

/**
 * Edge case types for testing
 */
type EdgeCaseType = 'long' | 'unicode' | 'boundary_date' | 'minimal' | null;

/**
 * Edge case configuration
 */
const EDGE_CASE_CONFIG = {
  // Very long narratives (test text fields, search indexing)
  longNarratives: {
    count: 50, // 1% of 5000
  },

  // Unicode characters (test encoding, search, display)
  unicodeNarratives: {
    count: 100, // 2% of 5000
  },

  // Boundary dates (test date handling)
  boundaryDates: {
    count: 20,
    dates: [
      new Date('2024-02-29'), // Leap year
      new Date('2023-01-01'), // Year boundary
      new Date('2024-12-31'), // Year end
      new Date('2024-03-10'), // DST spring forward (US)
      new Date('2024-11-03'), // DST fall back (US)
      new Date('2025-01-01'), // Recent year boundary
      new Date('2025-12-31'), // End of year
    ],
  },

  // Empty/minimal content (test null handling)
  minimalContent: {
    count: 10,
  },
};

/**
 * Determine if a specific index should be an edge case
 *
 * @param index - Current RIU index
 * @param totalRius - Total RIUs to generate
 * @returns Edge case type or null
 */
function determineEdgeCase(index: number, totalRius: number): EdgeCaseType {
  // Distribute edge cases deterministically across the generation
  const { longNarratives, unicodeNarratives, boundaryDates, minimalContent } = EDGE_CASE_CONFIG;

  // Long narratives: indices 100-149
  if (index >= 100 && index < 100 + longNarratives.count) {
    return 'long';
  }

  // Unicode: indices 200-299
  if (index >= 200 && index < 200 + unicodeNarratives.count) {
    return 'unicode';
  }

  // Boundary dates: indices 500-519
  if (index >= 500 && index < 500 + boundaryDates.count) {
    return 'boundary_date';
  }

  // Minimal: indices 1000-1009
  if (index >= 1000 && index < 1000 + minimalContent.count) {
    return 'minimal';
  }

  return null;
}

/**
 * Generate boundary date for edge case
 *
 * @param index - Index within boundary date range
 * @returns Boundary date
 */
function generateBoundaryDate(index: number): Date {
  const dates = EDGE_CASE_CONFIG.boundaryDates.dates;
  return dates[index % dates.length];
}

// ============================================
// Reference Number Generation
// ============================================

/**
 * Generate reference number for RIU
 *
 * @param prefix - Prefix (e.g., 'RIU')
 * @param date - RIU creation date
 * @param index - Sequential index
 * @returns Formatted reference number
 */
function generateReferenceNumber(prefix: string, date: Date, index: number): string {
  const year = date.getFullYear();
  const paddedIndex = String(index + 1).padStart(5, '0');
  return `${prefix}-${year}-${paddedIndex}`;
}

// ============================================
// Type-Specific Content Generation
// ============================================

/**
 * Generate chatbot transcript format
 *
 * @param categoryCode - Category code for narrative
 * @returns Chatbot-formatted transcript
 */
function generateChatbotTranscript(categoryCode: string): string {
  const { narrative } = generateNarrative(categoryCode);
  const timestamp = new Date().toISOString();

  return `[Chatbot Transcript - ${timestamp}]

User: I need to report something confidential.
Bot: I understand. I'm here to help you file a report securely. Can you tell me more about your concern?
User: ${narrative}
Bot: Thank you for sharing this. I've captured your report and it will be reviewed by our compliance team within 24-48 hours. Is there anything else you'd like to add?
User: No, that's everything for now.
Bot: Your report has been submitted. Your reference number will be provided via email if you've chosen to share contact information. You can check on the status of your report at any time using the anonymous access code provided.`;
}

/**
 * Generate disclosure response content
 *
 * @returns Disclosure-formatted response
 */
function generateDisclosureResponse(): string {
  const disclosureTypes = [
    'outside employment',
    'board membership',
    'financial interest',
    'family relationship',
    'vendor relationship',
  ];

  const disclosureType = pickRandom(disclosureTypes);
  const companyName = faker.company.name();

  return `## Annual Conflict of Interest Disclosure

### Disclosure Type: ${disclosureType}

**Description:**
I am disclosing that I have a ${disclosureType} with ${companyName}. This relationship began ${faker.date.past({ years: 2 }).toLocaleDateString()}.

**Nature of Interest:**
${faker.lorem.paragraph()}

**Potential Conflicts:**
${faker.lorem.paragraph()}

**Mitigation Measures:**
I have taken the following steps to mitigate any potential conflicts:
- ${faker.lorem.sentence()}
- ${faker.lorem.sentence()}

**Certification:**
I certify that this disclosure is complete and accurate to the best of my knowledge.`;
}

/**
 * Generate attestation response content
 *
 * @param isCompliant - Whether the attestation is compliant
 * @returns Attestation-formatted response
 */
function generateAttestationResponse(isCompliant: boolean): string {
  if (isCompliant) {
    return `## Policy Attestation - Completed

I acknowledge that I have read, understand, and agree to comply with the company's Code of Conduct and Ethics Policy.

**Employee Statement:**
I confirm that I have completed the required training and understand my responsibilities under the policy.

**Date Completed:** ${faker.date.recent({ days: 30 }).toLocaleDateString()}
**Training Score:** ${randomInt(85, 100)}%`;
  }

  const reasons = [
    'I have questions about section 4.2 regarding outside employment.',
    'I need clarification on the gift policy threshold.',
    'I believe there may be a conflict with my current situation.',
    'I disagree with certain provisions and would like to discuss.',
  ];

  return `## Policy Attestation - Requires Review

I am unable to complete this attestation without further discussion.

**Reason:**
${pickRandom(reasons)}

**Additional Comments:**
${faker.lorem.paragraph()}

Please contact me to discuss this matter.`;
}

/**
 * Generate content based on RIU type
 *
 * @param type - RIU type
 * @param categoryCode - Category code
 * @returns Generated content
 */
function generateTypeContent(type: RiuType, categoryCode: string): string {
  switch (type) {
    case RiuType.CHATBOT_TRANSCRIPT:
      return generateChatbotTranscript(categoryCode);

    case RiuType.DISCLOSURE_RESPONSE:
      return generateDisclosureResponse();

    case RiuType.ATTESTATION_RESPONSE:
      return generateAttestationResponse(chance(0.85)); // 85% compliant

    case RiuType.SURVEY_RESPONSE:
      return `## Survey Response

**Survey: Workplace Culture Assessment Q4**

Q1: How would you rate the overall work environment?
A: ${randomInt(1, 5)}/5

Q2: Do you feel comfortable reporting concerns?
A: ${pickRandom(['Yes', 'No', 'Sometimes'])}

Q3: Additional comments:
A: ${faker.lorem.paragraph()}`;

    case RiuType.PROXY_REPORT:
      return `[Submitted by manager on behalf of employee]

Employee requested confidential submission through their manager.

${generateNarrative(categoryCode).narrative}`;

    case RiuType.INCIDENT_FORM:
      return `## Incident Report Form

**Date of Incident:** ${faker.date.recent({ days: 7 }).toLocaleDateString()}
**Time of Incident:** ${faker.date.recent({ days: 1 }).toLocaleTimeString()}
**Location:** ${faker.location.buildingNumber()} ${faker.location.street()}

**Description of Incident:**
${generateNarrative(categoryCode).narrative}

**Immediate Actions Taken:**
${faker.lorem.sentence()}

**Witnesses:**
${chance(0.6) ? `${faker.person.fullName()}, ${faker.person.fullName()}` : 'None identified'}`;

    default:
      // HOTLINE_REPORT and WEB_FORM_SUBMISSION use standard narrative
      return generateNarrative(categoryCode).narrative;
  }
}

// ============================================
// RIU Record Interface
// ============================================

/**
 * RIU record for batch insert
 */
interface RiuRecord {
  id: string;
  organizationId: string;
  referenceNumber: string;
  type: RiuType;
  sourceChannel: RiuSourceChannel;
  details: string;
  summary: string | null;
  reporterType: RiuReporterType;
  anonymousAccessCode: string | null;
  reporterName: string | null;
  reporterEmail: string | null;
  reporterPhone: string | null;
  categoryId: string | null;
  severity: Severity;
  status: RiuStatus;
  locationName: string | null;
  locationAddress: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationZip: string | null;
  locationCountry: string | null;
  aiSummary: string | null;
  aiRiskScore: number | null;
  customFields: Record<string, unknown> | null;
  createdAt: Date;
  createdById: string;
}

// ============================================
// Main Seeder Function
// ============================================

/**
 * Category map structure expected by seeder
 */
interface CategoryInfo {
  id: string;
  code: string;
  name?: string;
}

/**
 * Employee map structure expected by seeder
 */
interface EmployeeInfo {
  id: string;
  locationId: string | null;
  region?: string;
}

/**
 * Seed RIUs for a demo tenant
 *
 * @param prisma - Prisma client instance
 * @param organizationId - Organization ID
 * @param userIds - Array of user IDs for createdBy field
 * @param categoryMap - Map of category name/code to category info
 * @param employeeMap - Map of employee email to employee info
 * @param locationRegionMap - Map of location ID to region
 * @returns Object with created RIU IDs and linked incidents
 */
export async function seedRius(
  prisma: PrismaClient,
  organizationId: string,
  userIds: string[],
  categoryMap: Map<string, CategoryInfo>,
  employeeMap: Map<string, EmployeeInfo>,
  locationRegionMap: Map<string, string> = new Map(),
): Promise<{ riuIds: string[]; linkedIncidents: LinkedIncident[] }> {
  // Initialize faker with deterministic seed
  faker.seed(SEED_CONFIG.masterSeed + SEED_OFFSET);

  const targetCount = SEED_CONFIG.volumes.rius;
  const riuIds: string[] = [];
  const riuBatch: RiuRecord[] = [];
  let batchNumber = 0;

  // Build arrays for random selection
  const categoryIds = Array.from(categoryMap.values()).map((c) => c.id);
  const categoryEntries = Array.from(categoryMap.entries());
  const employeeEntries = Array.from(employeeMap.entries());

  // Generate linked incidents plan
  const linkedIncidents = generateLinkedIncidentsPlan(targetCount, categoryIds);

  /**
   * Flush current batch to database
   */
  async function flushBatch(): Promise<void> {
    if (riuBatch.length === 0) return;

    await prisma.riskIntelligenceUnit.createMany({
      data: riuBatch.map((riu) => ({
        id: riu.id,
        organizationId: riu.organizationId,
        referenceNumber: riu.referenceNumber,
        type: riu.type,
        sourceChannel: riu.sourceChannel,
        details: riu.details,
        summary: riu.summary,
        reporterType: riu.reporterType,
        anonymousAccessCode: riu.anonymousAccessCode,
        reporterName: riu.reporterName,
        reporterEmail: riu.reporterEmail,
        reporterPhone: riu.reporterPhone,
        categoryId: riu.categoryId,
        severity: riu.severity,
        status: riu.status,
        locationName: riu.locationName,
        locationAddress: riu.locationAddress,
        locationCity: riu.locationCity,
        locationState: riu.locationState,
        locationZip: riu.locationZip,
        locationCountry: riu.locationCountry,
        aiSummary: riu.aiSummary,
        aiRiskScore: riu.aiRiskScore !== null ? String(riu.aiRiskScore) : null,
        customFields: riu.customFields ? JSON.parse(JSON.stringify(riu.customFields)) : undefined,
        createdAt: riu.createdAt,
        createdById: riu.createdById,
      })),
      skipDuplicates: true,
    });

    batchNumber++;
    riuBatch.length = 0;
  }

  console.log(`  Generating ${targetCount} RIUs with seasonality and realistic patterns...`);

  for (let index = 0; index < targetCount; index++) {
    // Progress logging every 500 RIUs
    if (index > 0 && index % 500 === 0) {
      console.log(`    Progress: ${index}/${targetCount} RIUs generated...`);
    }

    const riuId = faker.string.uuid();
    riuIds.push(riuId);

    // Check for edge cases
    const edgeCase = determineEdgeCase(index, targetCount);

    // Check for linked incident
    const linkedIncident = chance(LINKED_INCIDENT_RATE * 2)
      ? getIncidentNeedingReporters(linkedIncidents)
      : null;

    // Determine RIU type
    const riuType = weightedRandom(RIU_TYPE_DISTRIBUTION);
    const sourceChannel = TYPE_TO_CHANNEL[riuType];

    // Determine category
    let categoryId: string;
    let categoryCode: string;

    if (linkedIncident) {
      categoryId = linkedIncident.categoryId;
      const catEntry = categoryEntries.find(([, info]) => info.id === categoryId);
      categoryCode = catEntry ? catEntry[1].code : 'POL';
    } else {
      const randomCatEntry = pickRandom(categoryEntries);
      categoryId = randomCatEntry[1].id;
      categoryCode = randomCatEntry[1].code || randomCatEntry[0];
    }

    // Determine severity
    const severity = weightedRandom(TYPE_SEVERITY_DISTRIBUTION[riuType]);

    // Determine reporter type based on category
    const reporterType = determineReporterType(categoryCode);

    // Generate date with seasonality
    let createdAt: Date;
    if (edgeCase === 'boundary_date') {
      createdAt = generateBoundaryDate(index - 500);
    } else if (linkedIncident) {
      // Related reports within 1-14 days of incident
      const daysAfter = randomInt(1, 14);
      createdAt = addDays(linkedIncident.incidentDate, daysAfter);
    } else {
      const { date } = generateSeasonalHistoricalDate({ recentBias: 0.3 });
      createdAt = date;
    }

    // Determine region and adjust timestamp
    const randomEmployee = employeeEntries.length > 0 ? pickRandom(employeeEntries) : null;
    const locationId = randomEmployee?.[1]?.locationId || undefined;
    const region = determineRegionFromLocation(locationId, locationRegionMap);
    createdAt = adjustTimestampForRegion(createdAt, region);

    // Generate content based on type and edge case
    let details: string;
    if (edgeCase === 'long') {
      details = generateNarrative(categoryCode, { includeLongNarrative: true }).narrative;
    } else if (edgeCase === 'unicode') {
      details = generateUnicodeNarrative();
    } else if (edgeCase === 'minimal') {
      details = generateMinimalNarrative();
    } else if (linkedIncident) {
      details = generateLinkedNarrative(
        linkedIncident.riusCreated === 0,
        categoryCode,
      );
    } else {
      details = generateTypeContent(riuType, categoryCode);
    }

    // Generate reference number
    const referenceNumber = generateReferenceNumber('RIU', createdAt, index);

    // Generate anonymous access code if anonymous
    const anonymousAccessCode =
      reporterType === RiuReporterType.ANONYMOUS ? nanoid(12) : null;

    // Generate reporter info if identified
    let reporterName: string | null = null;
    let reporterEmail: string | null = null;
    let reporterPhone: string | null = null;

    if (reporterType === RiuReporterType.IDENTIFIED) {
      reporterName = faker.person.fullName();
      reporterEmail = faker.internet.email();
      reporterPhone = chance(0.7) ? faker.phone.number() : null;
    } else if (reporterType === RiuReporterType.CONFIDENTIAL) {
      // Confidential reporters provide contact info but identity protected
      reporterEmail = faker.internet.email();
      reporterPhone = chance(0.5) ? faker.phone.number() : null;
    }

    // Determine status based on type
    let status: RiuStatus;
    switch (riuType) {
      case RiuType.HOTLINE_REPORT:
        status = chance(0.05) ? RiuStatus.PENDING_QA : RiuStatus.RELEASED;
        break;
      case RiuType.WEB_FORM_SUBMISSION:
      case RiuType.INCIDENT_FORM:
        status = RiuStatus.RECEIVED;
        break;
      case RiuType.DISCLOSURE_RESPONSE:
      case RiuType.ATTESTATION_RESPONSE:
      case RiuType.SURVEY_RESPONSE:
        status = RiuStatus.COMPLETED;
        break;
      default:
        status = RiuStatus.RELEASED;
    }

    // Generate location info for some RIUs
    let locationName: string | null = null;
    let locationCity: string | null = null;
    let locationState: string | null = null;
    let locationCountry: string | null = null;

    if (chance(0.6)) {
      locationName = faker.company.name() + ' Office';
      locationCity = faker.location.city();
      locationState = faker.location.state();
      locationCountry = region === 'AMERICAS' ? 'US' : region === 'EMEA' ? 'GB' : 'JP';
    }

    // Select a random user for createdBy
    const createdById = pickRandom(userIds);

    // Generate optional AI enrichment for some RIUs
    let aiSummary: string | null = null;
    let aiRiskScore: number | null = null;

    if (chance(0.3)) {
      aiSummary = faker.lorem.sentences(2);
      aiRiskScore = Math.random() * 0.7 + 0.2; // 0.2 to 0.9
    }

    // Build custom fields for linked incidents
    let customFields: Record<string, unknown> | null = null;
    if (linkedIncident) {
      customFields = {
        linkedIncidentId: linkedIncident.incidentId,
        isPrimaryReport: linkedIncident.riusCreated === 0,
      };

      // Update linked incident tracking
      if (linkedIncident.riusCreated === 0) {
        linkedIncident.primaryRiuId = riuId;
      } else {
        linkedIncident.relatedRiuIds.push(riuId);
      }
      linkedIncident.riusCreated++;
    }

    // Add to batch
    riuBatch.push({
      id: riuId,
      organizationId,
      referenceNumber,
      type: riuType,
      sourceChannel,
      details,
      summary: details.length > 500 ? details.substring(0, 200) + '...' : null,
      reporterType,
      anonymousAccessCode,
      reporterName,
      reporterEmail,
      reporterPhone,
      categoryId,
      severity,
      status,
      locationName,
      locationAddress: null,
      locationCity,
      locationState,
      locationZip: null,
      locationCountry,
      aiSummary,
      aiRiskScore,
      customFields,
      createdAt,
      createdById,
    });

    // Flush batch if full
    if (riuBatch.length >= BATCH_SIZE) {
      await flushBatch();
    }
  }

  // Final flush
  await flushBatch();

  console.log(`  Created ${riuIds.length} RIUs`);
  console.log(`    - Linked incidents: ${linkedIncidents.filter((i) => i.riusCreated > 0).length}`);

  return { riuIds, linkedIncidents };
}
