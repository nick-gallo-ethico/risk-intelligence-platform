/**
 * Flagship Cases Pattern Generator
 *
 * Named, memorable cases for sales team walkthroughs.
 * These are curated cases with rich narratives that demonstrate platform capabilities.
 *
 * Features:
 * - 5-10 named cases with memorable titles
 * - Complete investigation histories
 * - Pre-written AI summaries
 * - Various complexity levels
 * - CCO escalation examples
 * - External party involvement examples
 */

import { SEED_CONFIG } from '../config';

/**
 * Flagship case definition
 */
export interface FlagshipCase {
  /** Memorable case name for demos */
  name: string;
  /** Detailed narrative for walkthrough */
  narrative: string;
  /** Category for classification */
  category: string;
  /** Severity level */
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Has CCO/executive escalation */
  hasEscalation: boolean;
  /** Involves external party (legal, law enforcement) */
  hasExternalParty: boolean;
  /** External party type if applicable */
  externalPartyType?: 'legal' | 'law_enforcement' | 'regulator';
  /** Number of investigations (some complex cases have multiple) */
  investigationCount: number;
  /** Case status */
  status: 'NEW' | 'OPEN' | 'CLOSED';
  /** Pre-written AI summary for demo */
  aiSummary: string;
  /** AI risk score (0-100) */
  aiRiskScore: number;
  /** Duration in days for timeline */
  durationDays: number;
  /** Key demo points to highlight */
  demoPoints: string[];
  /** Outcome if closed */
  outcome?: 'SUBSTANTIATED' | 'UNSUBSTANTIATED' | 'INCONCLUSIVE';
  /** Reference number prefix */
  referencePrefix: string;
}

/**
 * Pre-defined flagship cases for sales demos
 */
export const FLAGSHIP_CASES: FlagshipCase[] = [
  {
    name: 'The Chicago Warehouse Incident',
    narrative: `On January 15th, a third-shift warehouse supervisor was reported for creating a hostile work environment through repeated intimidation tactics.

Multiple employees reported that supervisor Marcus Reynolds regularly uses profanity and aggressive language when addressing floor workers. On the date in question, Reynolds allegedly threw a clipboard at the wall near an employee after a shipping error was discovered.

Three employees have independently filed reports describing similar behavior. One employee stated, "I've worked here for 8 years and have never felt unsafe until Reynolds transferred from the Dallas facility."

The reports indicate this behavior has been escalating since the Q4 productivity push began. Witnesses include the night security officer and two team leads.

This incident follows two prior verbal complaints that were handled informally by the regional HR manager with no documented resolution.`,
    category: 'Harassment',
    severity: 'HIGH',
    hasEscalation: true,
    hasExternalParty: false,
    investigationCount: 1,
    status: 'OPEN',
    aiSummary:
      'High-severity harassment case involving warehouse supervisor. Pattern of escalating hostile behavior with multiple independent reports. Prior informal complaints went unresolved. Recommend immediate intervention and comprehensive investigation.',
    aiRiskScore: 85,
    durationDays: 0, // Still open
    demoPoints: [
      'Multiple independent reporters corroborating same pattern',
      'Prior complaint history showing escalation',
      'AI identified severity escalation pattern',
      'Real-time collaboration on investigation notes',
    ],
    referencePrefix: 'CASE-2026-CHI',
  },
  {
    name: 'Q3 Financial Irregularities',
    narrative: `During routine quarterly reconciliation, the internal audit team discovered discrepancies in expense reports submitted by Regional Sales Director Patricia Hendricks.

Over the past 18 months, Hendricks submitted approximately $127,000 in expense reports that cannot be verified against actual business activities. Specific concerns include:

1. Multiple high-dollar client dinners with no attendee documentation
2. Hotel stays in cities with no scheduled meetings
3. Conference registrations for events that records show were attended by other employees
4. Recurring charges at a resort that does not match any approved vendor list

Initial review of credit card statements reveals a pattern where personal expenses may have been intermixed with legitimate business expenses. The total questionable amount represents roughly 40% of Hendricks' expense claims during this period.

Hendricks is a 12-year employee with no prior disciplinary issues and consistently exceeds sales targets. The discrepancies were only discovered due to a new expense audit protocol implemented in Q3.

Legal counsel has been engaged due to the dollar amount involved.`,
    category: 'Financial Misconduct',
    severity: 'HIGH',
    hasEscalation: true,
    hasExternalParty: true,
    externalPartyType: 'legal',
    investigationCount: 2, // HR and Legal investigations
    status: 'CLOSED',
    aiSummary:
      'Significant expense fraud investigation involving $127K in unverified claims over 18 months. Pattern analysis reveals consistent misuse of expense system. Legal counsel engaged. High-performing employee with no prior issues - unusual profile requires thorough documentation.',
    aiRiskScore: 92,
    durationDays: 67,
    demoPoints: [
      'Complex financial investigation with document analysis',
      'Dual investigation tracks (HR and Legal)',
      'CCO escalation and board notification',
      'Pattern detection across 18-month timeframe',
    ],
    outcome: 'SUBSTANTIATED',
    referencePrefix: 'CASE-2025-FIN',
  },
  {
    name: 'Executive Expense Report',
    narrative: `An anonymous reporter in the executive admin pool has raised concerns about expense practices by the SVP of Marketing, Jonathan Park.

The reporter states they process expense reports and have noticed that Park routinely submits personal expenses including:
- Family vacation flights coded as "conference travel"
- Spouse's spa treatments at hotels during business trips
- Holiday gifts for personal contacts coded as "client appreciation"

The reporter estimates this has occurred consistently for at least two years and amounts to "tens of thousands of dollars."

The reporter is fearful of retaliation given Park's seniority and close relationship with the CEO. They specifically request anonymity be maintained and express concern that "nothing will be done because he's an executive."

Attached to the report are three expense reports with highlighted entries the reporter believes are personal.`,
    category: 'Financial Misconduct',
    severity: 'HIGH',
    hasEscalation: true,
    hasExternalParty: false,
    investigationCount: 1,
    status: 'OPEN',
    aiSummary:
      'Anonymous report alleging executive expense fraud by SVP Marketing. Reporter provides specific examples and documentary evidence. High retaliation concern noted. Sensitive investigation requiring executive oversight and strict confidentiality controls.',
    aiRiskScore: 88,
    durationDays: 0,
    demoPoints: [
      'Anonymous reporting with document attachments',
      'Executive-level subject requiring special handling',
      'Reporter concerns about retaliation documented',
      'Audit trail of who accessed sensitive case',
    ],
    referencePrefix: 'CASE-2026-EXP',
  },
  {
    name: 'Manufacturing Safety Incident',
    narrative: `On December 3rd at approximately 2:15 PM, a serious safety incident occurred at the Denver manufacturing facility when employee Kevin Martinez suffered a hand injury on the metal stamping press in Bay 4.

Investigation revealed that the safety interlock on the press had been deliberately bypassed using a metal shim. When interviewed, floor workers indicated this was a "common practice" to meet production quotas. Supervisor Janet Williams was allegedly aware of this practice and had verbally approved it.

Martinez required surgery and will be out for an estimated 8 weeks. OSHA notification was made within required timeframes.

Further investigation discovered:
- Three other presses with bypassed safety interlocks
- No documented safety inspection in 4 months (policy requires monthly)
- Training records show 12 employees never completed press safety certification

A review of production records shows Bay 4 consistently exceeded quotas by 15-20% since Q2, coinciding with when Williams was promoted to supervisor.

External safety consultant has been engaged for comprehensive audit.`,
    category: 'Safety',
    severity: 'HIGH',
    hasEscalation: true,
    hasExternalParty: true,
    externalPartyType: 'regulator',
    investigationCount: 2, // Safety investigation and Management review
    status: 'CLOSED',
    aiSummary:
      'Critical safety incident with systemic failures. Deliberately bypassed equipment safeguards, supervisor knowledge/approval, and training gaps. OSHA reportable injury. Pattern suggests production pressure overriding safety culture. Regulatory exposure significant.',
    aiRiskScore: 95,
    durationDays: 45,
    demoPoints: [
      'OSHA-reportable incident with regulatory involvement',
      'Systemic issues uncovered beyond initial incident',
      'Multiple root causes identified',
      'Remediation tracking and verification',
    ],
    outcome: 'SUBSTANTIATED',
    referencePrefix: 'CASE-2025-SAF',
  },
  {
    name: 'Healthcare Data Breach',
    narrative: `The IT Security team identified unauthorized access to patient records in the Charlotte hospital system on January 8th.

Analysis of access logs revealed that Dr. Sarah Chen accessed medical records for 47 patients who were not under her care. These access events occurred over a 3-month period, primarily during evening hours.

Cross-referencing the accessed records revealed that:
- 31 of the patients were employees of Acme Corporation
- 16 were family members of Acme employees
- Several records accessed just before employees went on medical leave

When confronted, Dr. Chen initially claimed the accesses were for "legitimate research purposes" but could not provide documentation of any approved research protocol.

This constitutes a potential HIPAA violation affecting up to 47 individuals. Legal counsel and the Privacy Officer have been engaged. Regulatory notification timeline is being assessed.

Dr. Chen has been placed on administrative leave pending investigation completion.`,
    category: 'Data Privacy',
    severity: 'HIGH',
    hasEscalation: true,
    hasExternalParty: true,
    externalPartyType: 'regulator',
    investigationCount: 1,
    status: 'CLOSED',
    aiSummary:
      'HIPAA violation involving unauthorized PHI access. 47 patient records accessed without legitimate purpose. Pattern suggests deliberate snooping, possibly related to employment decisions. Regulatory notification required. Administrative leave implemented.',
    aiRiskScore: 93,
    durationDays: 38,
    demoPoints: [
      'Healthcare compliance and HIPAA handling',
      'IT forensics and access log analysis',
      'Regulatory notification workflow',
      'Administrative action tracking',
    ],
    outcome: 'SUBSTANTIATED',
    referencePrefix: 'CASE-2026-HIP',
  },
  {
    name: 'Systematic Discrimination Pattern',
    narrative: `A class of seven female engineers in the Software Development department have collectively filed a discrimination complaint.

The complaint alleges that Director of Engineering Robert Thompson has systematically passed over qualified female candidates for promotion, given lower performance ratings to female team members, and made comments creating a hostile work environment.

Specific allegations include:
- Five promotion cycles where male candidates with less experience were selected
- Performance review analysis showing female engineers rated 0.7 points lower on average
- Comments in meetings such as "technical leadership isn't really suited for women"
- Exclusion of female engineers from high-visibility projects

The reporters have compiled documentation including:
- Promotion decision records for the past 3 years
- Performance rating comparisons
- Email threads with discriminatory comments
- Testimony from two male engineers corroborating the pattern

One of the reporters has indicated she is consulting with an employment attorney.

Given the number of reporters and systematic nature of allegations, this has been flagged for executive review.`,
    category: 'Discrimination',
    severity: 'HIGH',
    hasEscalation: true,
    hasExternalParty: true,
    externalPartyType: 'legal',
    investigationCount: 1,
    status: 'OPEN',
    aiSummary:
      'Systematic gender discrimination allegation from seven female engineers. Documented pattern of promotion bias, rating disparities, and hostile comments. Strong documentary evidence provided. Legal exposure high due to class nature and external counsel engagement.',
    aiRiskScore: 91,
    durationDays: 0,
    demoPoints: [
      'Multi-reporter coordinated complaint',
      'Statistical pattern analysis',
      'Documentary evidence management',
      'Litigation hold and preservation',
    ],
    referencePrefix: 'CASE-2026-DIS',
  },
  {
    name: 'Vendor Kickback Scheme',
    narrative: `The internal audit team has uncovered evidence of a potential kickback arrangement between Procurement Manager David Wilson and IT vendor TechServe Solutions.

Over the past two years, TechServe has been awarded 14 contracts totaling $2.3 million. Analysis revealed:
- TechServe's bids were consistently 5-10% higher than competitors
- Wilson overruled lower bids citing "quality concerns" without documentation
- TechServe was added to the approved vendor list by Wilson without standard vetting

A forensic review of Wilson's personal finances (conducted with legal oversight after reasonable suspicion was established) found:
- Unexplained deposits totaling $89,000 over 24 months
- Two vacations that coincide with TechServe contract awards
- A vehicle purchase shortly after the largest contract was signed

TechServe's CEO, Michael Reeves, is Wilson's former college roommate - a relationship that was not disclosed as required by the conflict of interest policy.

The FBI has been contacted due to the dollar amounts involved and potential wire fraud implications.`,
    category: 'Fraud',
    severity: 'HIGH',
    hasEscalation: true,
    hasExternalParty: true,
    externalPartyType: 'law_enforcement',
    investigationCount: 2,
    status: 'CLOSED',
    aiSummary:
      'Complex fraud investigation involving $2.3M in vendor contracts and $89K in suspected kickbacks. Undisclosed personal relationship, documented bid manipulation, and financial anomalies. FBI engaged due to federal implications. Comprehensive forensic and financial analysis completed.',
    aiRiskScore: 97,
    durationDays: 89,
    demoPoints: [
      'Law enforcement coordination',
      'Financial forensics integration',
      'Conflict of interest policy violation',
      'Multi-year pattern analysis',
    ],
    outcome: 'SUBSTANTIATED',
    referencePrefix: 'CASE-2025-FRD',
  },
  {
    name: 'Workplace Violence Threat',
    narrative: `On January 20th at 4:45 PM, Security received an urgent report that warehouse employee James Mitchell made threatening statements toward his supervisor and coworkers.

According to witnesses, Mitchell became agitated during a team meeting about schedule changes and stated:
- "You'll all regret this"
- "I know where everyone parks"
- "This isn't over"

Mitchell then left the building abruptly. One witness reported Mitchell mentioned "his gun collection" during a conversation last week.

Supervisor Sarah Park reported that Mitchell has been increasingly hostile since being passed over for a team lead position in December. Previous incidents include:
- Slamming doors and kicking equipment
- Heated argument with a coworker (informal verbal warning issued)
- Complaints about "unfair treatment" to anyone who would listen

Mitchell was removed from the premises by security and informed not to return pending investigation. Building security has been enhanced with additional patrols.

Threat assessment team has been convened. Local police have been notified.`,
    category: 'Workplace Violence',
    severity: 'HIGH',
    hasEscalation: true,
    hasExternalParty: true,
    externalPartyType: 'law_enforcement',
    investigationCount: 1,
    status: 'CLOSED',
    aiSummary:
      'Credible workplace violence threat requiring immediate intervention. Employee made specific threatening statements, pattern of escalating hostility, and references to weapons. Law enforcement notified, employee removed from premises, enhanced security implemented. Threat assessment critical priority.',
    aiRiskScore: 98,
    durationDays: 12,
    demoPoints: [
      'Urgent threat response workflow',
      'Security coordination',
      'Law enforcement notification',
      'Threat assessment team activation',
    ],
    outcome: 'SUBSTANTIATED',
    referencePrefix: 'CASE-2026-WPV',
  },
  {
    name: 'COI Disclosure - Board Member',
    narrative: `Board member Eleanor Vance has submitted a proactive conflict of interest disclosure regarding her spouse's recent appointment.

Disclosure details:
- Dr. William Vance was appointed Chief Medical Officer at HealthFirst Systems
- HealthFirst is one of Acme's largest healthcare clients (8% of Healthcare Division revenue)
- The appointment was effective January 1st
- Eleanor learned of the appointment in December but delayed disclosure "due to the holidays"

Current conflicts identified:
- Eleanor chairs the Client Relations Committee which oversees HealthFirst account
- Eleanor has voting rights on contract renewals including the upcoming HealthFirst renewal
- Eleanor receives detailed financial briefings that include HealthFirst performance data

Eleanor proposes to recuse from HealthFirst-related matters but requests guidance on scope.

This disclosure requires Board review and documentation of mitigation measures. General Counsel has been consulted.`,
    category: 'Conflict of Interest',
    severity: 'MEDIUM',
    hasEscalation: true,
    hasExternalParty: false,
    investigationCount: 1,
    status: 'CLOSED',
    aiSummary:
      'Board-level conflict of interest disclosure regarding spouse appointment at major client. Proactive disclosure, though delayed. Multiple conflict touchpoints identified. Requires formal recusal framework and Board documentation. Standard COI management with elevated stakeholder sensitivity.',
    aiRiskScore: 65,
    durationDays: 21,
    demoPoints: [
      'Board-level disclosure handling',
      'COI management framework',
      'Recusal documentation',
      'Proactive disclosure workflow',
    ],
    outcome: 'SUBSTANTIATED',
    referencePrefix: 'CASE-2026-COI',
  },
  {
    name: 'Retaliation After Safety Report',
    narrative: `Employee Michael Torres filed this complaint alleging retaliation for his previous safety report (CASE-2025-SAF-001, "Bay 4 Press Incident").

Torres was one of the whistleblowers in the original investigation. Since that case was closed:
- His shift was changed from days to nights (effective January 6)
- He was moved from Bay 2 (his preferred assignment for 5 years) to Bay 6
- His overtime hours were reduced from an average of 10 per week to zero
- His most recent performance review dropped from "meets expectations" to "needs improvement"

Torres states his supervisor, now-promoted Janet Williams (formerly of Bay 4), told him "People who cause problems get treated like problems."

Torres has provided:
- His work schedule showing the changes
- Overtime records before and after his testimony
- Performance review documents
- Text messages from coworkers expressing concern about his treatment

This case has been flagged as high-priority given it involves retaliation for protected activity.`,
    category: 'Retaliation',
    severity: 'HIGH',
    hasEscalation: true,
    hasExternalParty: false,
    investigationCount: 1,
    status: 'OPEN',
    aiSummary:
      'Retaliation complaint from safety whistleblower. Multiple adverse employment actions documented following protected activity. Direct statement from supervisor suggests retaliatory intent. Case linked to prior substantiated safety investigation. High legal exposure.',
    aiRiskScore: 89,
    durationDays: 0,
    demoPoints: [
      'Case-to-case linkage',
      'Protected activity retaliation tracking',
      'Temporal pattern analysis',
      'Witness statement correlation',
    ],
    referencePrefix: 'CASE-2026-RET',
  },
];

/**
 * Get flagship cases filtered by status
 *
 * @param status - Status to filter by
 * @returns Filtered flagship cases
 */
export function getFlagshipCasesByStatus(
  status: 'NEW' | 'OPEN' | 'CLOSED',
): FlagshipCase[] {
  return FLAGSHIP_CASES.filter((c) => c.status === status);
}

/**
 * Get flagship cases by category
 *
 * @param category - Category to filter by
 * @returns Filtered flagship cases
 */
export function getFlagshipCasesByCategory(category: string): FlagshipCase[] {
  return FLAGSHIP_CASES.filter(
    (c) => c.category.toLowerCase() === category.toLowerCase(),
  );
}

/**
 * Get flagship cases with external party involvement
 *
 * @returns Flagship cases involving legal, law enforcement, or regulators
 */
export function getFlagshipCasesWithExternalParty(): FlagshipCase[] {
  return FLAGSHIP_CASES.filter((c) => c.hasExternalParty);
}

/**
 * Get flagship cases with CCO escalation
 *
 * @returns Flagship cases that were escalated to CCO
 */
export function getEscalatedFlagshipCases(): FlagshipCase[] {
  return FLAGSHIP_CASES.filter((c) => c.hasEscalation);
}

/**
 * Seed flagship cases into the database
 *
 * This function creates the curated flagship cases with their full content.
 * It should be called during case seeding to ensure these special cases exist.
 *
 * @param categoryNameToId - Map of category names to IDs
 * @returns Array of flagship case data ready for insertion
 */
export function prepareFlagshipCasesForSeeding(
  categoryNameToId: Map<string, string>,
): Array<{
  flagship: FlagshipCase;
  categoryId: string;
}> {
  return FLAGSHIP_CASES.map((flagship) => {
    // Find matching category ID
    const categoryId = categoryNameToId.get(flagship.category) ||
      Array.from(categoryNameToId.values())[0]; // Fallback to first category

    return {
      flagship,
      categoryId,
    };
  });
}

/**
 * Get flagship case summary for demo metrics
 */
export function getFlagshipStats(): {
  total: number;
  open: number;
  closed: number;
  withEscalation: number;
  withExternalParty: number;
  avgRiskScore: number;
} {
  const open = FLAGSHIP_CASES.filter((c) => c.status === 'OPEN' || c.status === 'NEW').length;
  const closed = FLAGSHIP_CASES.filter((c) => c.status === 'CLOSED').length;
  const withEscalation = FLAGSHIP_CASES.filter((c) => c.hasEscalation).length;
  const withExternalParty = FLAGSHIP_CASES.filter((c) => c.hasExternalParty).length;
  const avgRiskScore =
    FLAGSHIP_CASES.reduce((sum, c) => sum + c.aiRiskScore, 0) / FLAGSHIP_CASES.length;

  return {
    total: FLAGSHIP_CASES.length,
    open,
    closed,
    withEscalation,
    withExternalParty,
    avgRiskScore: Math.round(avgRiskScore),
  };
}
