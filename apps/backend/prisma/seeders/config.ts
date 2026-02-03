/**
 * Seed Configuration for Demo Tenant (Acme Co.)
 *
 * This configuration defines all volumes, distributions, and organizational
 * structure for deterministic demo data generation.
 *
 * Key principles:
 * - masterSeed ensures fully reproducible data across runs
 * - currentDate is the reference point for all historical data
 * - All distributions are weighted to create realistic patterns
 */

// Demo user account definitions
export interface DemoUser {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  description: string;
}

// Division structure with industry weighting
export interface Division {
  name: string;
  weight: number;
}

// Location template for regional city distribution
export interface LocationTemplate {
  region: 'US' | 'EMEA' | 'APAC';
  cities: string[];
}

// Job level hierarchy with typical organizational distribution
export interface JobLevel {
  level: string;
  name: string;
  weight: number;
}

// Weighted option for distribution selections
export interface WeightedOption<T> {
  value: T;
  weight: number;
}

// Case timing configuration
export interface CaseTiming {
  simpleDaysRange: [number, number];
  complexMonthsRange: [number, number];
  targetAverageDays: number;
}

// Channel distribution configuration
export interface ChannelDistribution {
  phone: number;
  web: number;
  other: number;
}

// Anonymity distribution configuration
export interface AnonymityDistribution {
  anonymous: number;
  identified: number;
}

// Volume targets for seed data
export interface Volumes {
  employees: number;
  rius: number;
  cases: number;
  campaigns: number;
  policies: number;
  openCaseRatio: number;
}

// Organization structure configuration
export interface OrganizationConfig {
  divisions: Division[];
  regions: ('US' | 'EMEA' | 'APAC')[];
  locationCount: number;
  locationTemplates: LocationTemplate[];
  jobLevels: JobLevel[];
  hierarchy: string[];
}

// RIU type distribution
export type RiuType =
  | 'hotline_report'
  | 'web_form_submission'
  | 'disclosure_response'
  | 'attestation_response'
  | 'chatbot_transcript'
  | 'incident_form';

// Case severity levels
export type CaseSeverity = 'critical' | 'high' | 'medium' | 'low';

// Case status values
export type CaseStatus =
  | 'new'
  | 'in_triage'
  | 'assigned'
  | 'under_investigation'
  | 'pending_review'
  | 'closed';

// Investigation outcome values
export type InvestigationOutcome =
  | 'substantiated'
  | 'unsubstantiated'
  | 'inconclusive'
  | 'withdrawn';

// Category distribution
export interface CategoryConfig {
  name: string;
  weight: number;
  anonymousRate: number; // Higher for sensitive categories like harassment
}

// Full distributions configuration
export interface Distributions {
  riuTypes: WeightedOption<RiuType>[];
  caseSeverity: WeightedOption<CaseSeverity>[];
  caseStatus: WeightedOption<CaseStatus>[];
  investigationOutcome: WeightedOption<InvestigationOutcome>[];
  categories: CategoryConfig[];
}

// Complete seed configuration interface
export interface SeedConfig {
  masterSeed: number;
  currentDate: Date;
  historyYears: number;
  preIndexSearch: boolean;
  volumes: Volumes;
  organization: OrganizationConfig;
  caseTiming: CaseTiming;
  channelDistribution: ChannelDistribution;
  anonymityDistribution: AnonymityDistribution;
  distributions: Distributions;
  demoUsers: DemoUser[];
}

/**
 * SEED_CONFIG - Master configuration for demo tenant seed data
 *
 * All seeders use this configuration to ensure consistency across the entire
 * demo dataset. The masterSeed guarantees deterministic output.
 */
export const SEED_CONFIG: SeedConfig = {
  // Reproducibility - same seed = same data every time
  masterSeed: 20260202,

  // Reference date for all historical data (not "today" - fixed point in time)
  currentDate: new Date('2026-02-02T00:00:00Z'),

  // Historical data window
  historyYears: 3,

  // Elasticsearch indices pre-built for demo performance
  preIndexSearch: true,

  // Volume targets per CONTEXT.md
  volumes: {
    employees: 20000,
    rius: 5000,
    cases: 4500,
    campaigns: 20,
    policies: 50,
    openCaseRatio: 0.1, // 10% open at any time (~450 active cases)
  },

  // Organization structure - multi-industry conglomerate
  organization: {
    // Division weighting reflects a healthcare-focused company
    divisions: [
      { name: 'Healthcare', weight: 0.5 },
      { name: 'Technology', weight: 0.2 },
      { name: 'Retail', weight: 0.2 },
      { name: 'Energy', weight: 0.1 },
    ],

    regions: ['US', 'EMEA', 'APAC'],

    // 50+ global locations
    locationCount: 50,

    locationTemplates: [
      // US locations (majority - 13 cities)
      {
        region: 'US',
        cities: [
          'New York',
          'Chicago',
          'Los Angeles',
          'Houston',
          'Phoenix',
          'Charlotte',
          'Dallas',
          'San Francisco',
          'Seattle',
          'Denver',
          'Atlanta',
          'Boston',
          'Miami',
        ],
      },
      // EMEA locations (10 cities)
      {
        region: 'EMEA',
        cities: [
          'London',
          'Paris',
          'Frankfurt',
          'Amsterdam',
          'Dublin',
          'Madrid',
          'Milan',
          'Stockholm',
          'Warsaw',
          'Zurich',
        ],
      },
      // APAC locations (10 cities)
      {
        region: 'APAC',
        cities: [
          'Tokyo',
          'Singapore',
          'Hong Kong',
          'Sydney',
          'Mumbai',
          'Shanghai',
          'Seoul',
          'Bangalore',
          'Melbourne',
          'Manila',
        ],
      },
    ],

    // Standard corporate job levels with typical distribution
    jobLevels: [
      { level: 'IC', name: 'Individual Contributor', weight: 0.7 },
      { level: 'Manager', name: 'Manager', weight: 0.15 },
      { level: 'Director', name: 'Director', weight: 0.08 },
      { level: 'VP', name: 'Vice President', weight: 0.04 },
      { level: 'SVP', name: 'Senior Vice President', weight: 0.02 },
      { level: 'C-Suite', name: 'C-Suite Executive', weight: 0.01 },
    ],

    // Organizational hierarchy levels
    hierarchy: ['Division', 'Business Unit', 'Department', 'Team'],
  },

  // Case duration targets per CONTEXT.md
  caseTiming: {
    simpleDaysRange: [2, 4], // Simple cases: 2-4 days
    complexMonthsRange: [1, 3], // Complex cases: 1-3 months
    targetAverageDays: 22, // Aggregate average under 20-22 days
  },

  // Channel distribution (hotline-heavy per CONTEXT.md)
  channelDistribution: {
    phone: 0.6, // 60% phone
    web: 0.3, // 30% web
    other: 0.1, // 10% other (email, proxy, etc.)
  },

  // Anonymity distribution per CONTEXT.md
  anonymityDistribution: {
    anonymous: 0.4, // 40% anonymous
    identified: 0.6, // 60% identified
  },

  // Distribution weights for various entity types
  distributions: {
    // RIU type distribution (primarily hotline-driven)
    riuTypes: [
      { value: 'hotline_report', weight: 0.55 },
      { value: 'web_form_submission', weight: 0.25 },
      { value: 'disclosure_response', weight: 0.08 },
      { value: 'attestation_response', weight: 0.05 },
      { value: 'chatbot_transcript', weight: 0.04 },
      { value: 'incident_form', weight: 0.03 },
    ],

    // Severity distribution (pyramid - few critical, most low)
    caseSeverity: [
      { value: 'critical', weight: 0.05 },
      { value: 'high', weight: 0.15 },
      { value: 'medium', weight: 0.35 },
      { value: 'low', weight: 0.45 },
    ],

    // Case status distribution (10% open per CONTEXT.md)
    caseStatus: [
      { value: 'new', weight: 0.02 },
      { value: 'in_triage', weight: 0.03 },
      { value: 'assigned', weight: 0.02 },
      { value: 'under_investigation', weight: 0.03 },
      { value: 'pending_review', weight: 0.0 }, // 10% total open
      { value: 'closed', weight: 0.9 }, // 90% closed
    ],

    // Investigation outcome distribution (60% substantiation per CONTEXT.md)
    investigationOutcome: [
      { value: 'substantiated', weight: 0.6 },
      { value: 'unsubstantiated', weight: 0.25 },
      { value: 'inconclusive', weight: 0.1 },
      { value: 'withdrawn', weight: 0.05 },
    ],

    // Category distribution with anonymity rates
    categories: [
      { name: 'Harassment', weight: 0.2, anonymousRate: 0.7 },
      { name: 'Discrimination', weight: 0.15, anonymousRate: 0.65 },
      { name: 'Fraud', weight: 0.12, anonymousRate: 0.5 },
      { name: 'Conflict of Interest', weight: 0.1, anonymousRate: 0.3 },
      { name: 'Safety Violation', weight: 0.1, anonymousRate: 0.35 },
      { name: 'Policy Violation', weight: 0.1, anonymousRate: 0.25 },
      { name: 'Theft', weight: 0.08, anonymousRate: 0.45 },
      { name: 'Retaliation', weight: 0.07, anonymousRate: 0.8 },
      { name: 'Data Privacy', weight: 0.05, anonymousRate: 0.4 },
      { name: 'Other', weight: 0.03, anonymousRate: 0.3 },
    ],
  },

  // Demo user accounts for different personas
  demoUsers: [
    {
      email: 'demo-admin@acme.example.com',
      firstName: 'Alex',
      lastName: 'Administrator',
      role: 'SYSTEM_ADMIN',
      description: 'System Administrator with full access',
    },
    {
      email: 'demo-cco@acme.example.com',
      firstName: 'Christine',
      lastName: 'Chen',
      role: 'CCO',
      description: 'Chief Compliance Officer - executive oversight',
    },
    {
      email: 'demo-triage@acme.example.com',
      firstName: 'Taylor',
      lastName: 'Torres',
      role: 'TRIAGE_LEAD',
      description: 'Triage Lead - initial case routing and assignment',
    },
    {
      email: 'demo-investigator1@acme.example.com',
      firstName: 'Isaac',
      lastName: 'Investigator',
      role: 'INVESTIGATOR',
      description: 'Senior Investigator - handles complex cases',
    },
    {
      email: 'demo-investigator2@acme.example.com',
      firstName: 'Ivy',
      lastName: 'Ingram',
      role: 'INVESTIGATOR',
      description: 'Investigator - general case handling',
    },
    {
      email: 'demo-policy@acme.example.com',
      firstName: 'Patricia',
      lastName: 'Policy',
      role: 'POLICY_AUTHOR',
      description: 'Policy Author - creates and manages policies',
    },
    {
      email: 'demo-reviewer@acme.example.com',
      firstName: 'Robert',
      lastName: 'Reviewer',
      role: 'POLICY_REVIEWER',
      description: 'Policy Reviewer - approves policy changes',
    },
    {
      email: 'demo-manager@acme.example.com',
      firstName: 'Marcus',
      lastName: 'Manager',
      role: 'DEPARTMENT_ADMIN',
      description: 'Department Manager - limited view of team cases',
    },
    {
      email: 'demo-employee@acme.example.com',
      firstName: 'Emily',
      lastName: 'Employee',
      role: 'EMPLOYEE',
      description: 'Regular Employee - can submit reports and view own cases',
    },
  ],
};
