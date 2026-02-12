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

import { SEED_CONFIG } from "../config";

/**
 * Flagship case definition
 */
export interface FlagshipCase {
  /** Memorable case name for demos */
  name: string;
  /** Detailed narrative for walkthrough (legacy - use details instead) */
  narrative: string;
  /** Rich case details (200-400 words) - comprehensive investigator case file content */
  details: string;
  /** Executive summary (50-75 words) - dashboard-ready overview */
  summary: string;
  /** Category for classification */
  category: string;
  /** Severity level */
  severity: "HIGH" | "MEDIUM" | "LOW";
  /** Has CCO/executive escalation */
  hasEscalation: boolean;
  /** Involves external party (legal, law enforcement) */
  hasExternalParty: boolean;
  /** External party type if applicable */
  externalPartyType?: "legal" | "law_enforcement" | "regulator";
  /** Number of investigations (some complex cases have multiple) */
  investigationCount: number;
  /** Case status */
  status: "NEW" | "OPEN" | "CLOSED";
  /** Pre-written AI summary for demo */
  aiSummary: string;
  /** AI risk score (0-100) */
  aiRiskScore: number;
  /** Duration in days for timeline */
  durationDays: number;
  /** Key demo points to highlight */
  demoPoints: string[];
  /** Outcome if closed */
  outcome?: "SUBSTANTIATED" | "UNSUBSTANTIATED" | "INCONCLUSIVE";
  /** Reference number prefix */
  referencePrefix: string;
}

/**
 * Pre-defined flagship cases for sales demos
 */
export const FLAGSHIP_CASES: FlagshipCase[] = [
  {
    name: "The Chicago Warehouse Incident",
    narrative: `On January 15th, a third-shift warehouse supervisor was reported for creating a hostile work environment through repeated intimidation tactics that have escalated significantly over the past four months.

Multiple employees reported that supervisor Marcus Reynolds regularly uses profanity and aggressive language when addressing floor workers. On the date in question, Reynolds allegedly threw a clipboard at the wall approximately three feet from employee Jennifer Martinez after a shipping error was discovered on a priority customer order. Martinez reported that she ducked instinctively, fearing the clipboard was aimed at her.

Three employees have independently filed reports describing similar behavior patterns. One employee stated, "I've worked here for 8 years and have never felt unsafe until Reynolds transferred from the Dallas facility." Another witness, Daniel Kim, provided a written log documenting seven specific incidents dating back to September 2025, including verbal abuse, threats of termination for minor errors, and public humiliation of workers in front of their peers.

The reports indicate this behavior has been escalating since the Q4 productivity push began. Witnesses include the night security officer who was present during the clipboard incident, two team leads who have observed multiple confrontations, and several floor workers who have independently corroborated the pattern of intimidation.

This incident follows two prior verbal complaints that were handled informally by the regional HR manager with no documented resolution. A records request to the Dallas facility revealed that Reynolds had similar informal complaints at his previous assignment. The cumulative pattern suggests a management style that prioritizes production targets over employee safety and dignity. Employee turnover in Bay 4 has increased 40% since Reynolds assumed the supervisor role, and three workers have requested transfers to other shifts citing fear of retaliation.`,
    details: `This case was initiated on January 15, 2026, following three independent reports filed within a 48-hour period regarding the conduct of Marcus Reynolds, a third-shift warehouse supervisor at the Chicago distribution center. All three reporters describe a pattern of hostile and intimidating behavior that has intensified over the past four months, coinciding with the Q4 productivity initiative.

The precipitating incident occurred on January 14th at approximately 11:45 PM during the third shift. According to witness accounts, Reynolds discovered a mislabeled shipment destined for a priority customer and responded by throwing a clipboard against the wall approximately three feet from warehouse associate Jennifer Martinez. Martinez filed a formal complaint the following morning, stating she feared for her physical safety. Security camera footage from Bay 7 has been preserved and confirms the incident.

Two additional employees, warehouse leads Daniel Kim and Robert Chen, submitted reports within hours of Martinez's complaint. Both describe an escalating pattern of verbal abuse including profanity, threats of termination, and public humiliation of workers for minor errors. Kim provided a written log of seven specific incidents dating back to September 2025.

Investigation into Reynolds' employment history revealed that he transferred from the Dallas facility in August 2025. A records request to Dallas HR uncovered two prior informal complaints regarding similar behavior, neither of which resulted in documented corrective action. Reynolds received a satisfactory performance review in Q3 2025 with no mention of interpersonal concerns.

The case has been escalated to the Chief Compliance Officer due to the severity of the alleged conduct, the pattern of prior complaints, and potential liability exposure. Interviews have been scheduled with all three reporters, the night security officer who was present during the clipboard incident, and Reynolds' direct supervisor. HR has placed Reynolds on administrative leave pending investigation completion.`,
    summary: `Anonymous and identified reports from three warehouse employees allege supervisor Marcus Reynolds created a hostile work environment through intimidation and verbal abuse, culminating in a January 14th incident where he threw a clipboard near an employee. Prior informal complaints at his previous facility went unaddressed. Escalated to CCO. Investigation active.`,
    category: "Harassment",
    severity: "HIGH",
    hasEscalation: true,
    hasExternalParty: false,
    investigationCount: 1,
    status: "OPEN",
    aiSummary:
      "High-severity harassment case involving third-shift warehouse supervisor Marcus Reynolds. Pattern analysis reveals escalating hostile behavior with three independent reporters corroborating intimidation tactics over four months. Prior informal complaints at current and previous facility went unresolved. Physical safety risk identified based on clipboard throwing incident. Recommend immediate administrative leave, witness interviews, and Dallas facility records review.",
    aiRiskScore: 85,
    durationDays: 0, // Still open
    demoPoints: [
      "Multiple independent reporters corroborating same pattern",
      "Prior complaint history showing escalation",
      "AI identified severity escalation pattern",
      "Real-time collaboration on investigation notes",
    ],
    referencePrefix: "CASE-2026-CHI",
  },
  {
    name: "Q3 Financial Irregularities",
    narrative: `During routine quarterly reconciliation, the internal audit team discovered significant discrepancies in expense reports submitted by Regional Sales Director Patricia Hendricks that warrant comprehensive investigation.

Over the past 18 months, Hendricks submitted approximately $127,000 in expense reports that cannot be verified against actual business activities. The forensic review identified $43,200 in client entertainment claims lacking required attendee documentation across 31 transactions, $28,750 in hotel accommodations in cities with no corresponding calendar entries or client meetings across 14 separate stays, $18,400 for conference registrations where attendance records indicate different employees participated, and $37,132 in recurring charges at Palmetto Resort over 11 visits with no documented business purpose.

Analysis of submission patterns revealed that 89% of client entertainment expenses were submitted without the mandatory attendee lists required by policy. Geographic data from corporate laptop records shows Hendricks was not present in claimed locations on at least 23 occasions. Expense submissions spiked consistently during the final week of each month, suggesting possible quota-driven behavior.

Initial review of credit card statements reveals a systematic pattern where personal expenses appear intermixed with legitimate business costs. The total questionable amount represents roughly 40% of Hendricks' expense claims during this period, far exceeding statistical norms for expense audit flags.

Hendricks is a 12-year employee with no prior disciplinary issues and consistently exceeds sales targets, which may explain why the expense patterns went unnoticed until now. The discrepancies were only discovered due to a new expense audit protocol implemented in Q3 that cross-references expense claims against calendar, travel booking, and CRM activity data.

When initially interviewed, Hendricks maintained all expenses were legitimate but could not provide supporting documentation when specific incidents were raised. Legal counsel has been engaged due to the dollar amount involved and potential civil recovery implications. Employment action is pending investigation completion.`,
    details: `This investigation was initiated on November 3, 2025, when the internal audit team flagged anomalies during implementation of enhanced expense verification protocols mandated by the Q3 compliance initiative. Senior Auditor Michelle Tran identified a cluster of irregularities in expense reports submitted by Patricia Hendricks, Regional Sales Director for the Southeast territory.

The initial audit covered the period from May 2024 through October 2025, revealing $127,482 in expense claims that could not be verified against business activity records. The questionable expenses fell into four distinct categories: client entertainment with missing attendee documentation ($43,200 across 31 transactions), hotel accommodations in cities with no corresponding calendar entries or client meetings ($28,750 across 14 stays), conference and training registrations for events not attended by Hendricks ($18,400 for 7 events), and recurring charges at Palmetto Resort totaling $37,132 over 11 visits despite no approved business purpose.

A forensic accounting review conducted by outside counsel examined Hendricks' corporate credit card statements, travel booking records, and CRM activity logs. The analysis revealed a systematic pattern: expense submissions spiked during the final week of each month, claims for client entertainment were submitted without required attendee lists in 89% of instances, and geographic data from her laptop showed she was not present in claimed locations on 23 occasions.

Hendricks was interviewed on December 4, 2025, with HR and legal counsel present. She initially maintained all expenses were legitimate business costs, but was unable to provide documentation when specific incidents were raised. When confronted with the geographic discrepancy data, she declined to continue the interview and requested union representation.

The investigation was completed on January 9, 2026, with findings substantiated. The case was escalated to the CCO and presented to the Audit Committee on January 15. Employment action was taken on January 18, and civil recovery proceedings were initiated through outside counsel. The company has implemented additional expense controls including real-time receipt verification and manager approval for claims exceeding $500.`,
    summary: `Internal audit discovered $127,000 in unverified expense claims by Regional Sales Director Patricia Hendricks over 18 months. Forensic review revealed systematic patterns including fabricated client dinners, hotel stays in cities not visited, and unauthorized resort charges. Investigation substantiated. Employment terminated and civil recovery initiated.`,
    category: "Financial Misconduct",
    severity: "HIGH",
    hasEscalation: true,
    hasExternalParty: true,
    externalPartyType: "legal",
    investigationCount: 2, // HR and Legal investigations
    status: "CLOSED",
    aiSummary:
      "Significant expense fraud investigation involving $127,482 in unverified claims over 18 months. Pattern analysis reveals systematic manipulation: 89% of entertainment claims missing documentation, geographic contradictions on 23 occasions. Forensic accounting identified four fraud categories including fabricated client events and unauthorized resort charges. Legal counsel engaged for civil recovery. Recommend comprehensive interview and asset preservation.",
    aiRiskScore: 92,
    durationDays: 67,
    demoPoints: [
      "Complex financial investigation with document analysis",
      "Dual investigation tracks (HR and Legal)",
      "CCO escalation and board notification",
      "Pattern detection across 18-month timeframe",
    ],
    outcome: "SUBSTANTIATED",
    referencePrefix: "CASE-2025-FIN",
  },
  {
    name: "Executive Expense Report",
    narrative: `An anonymous reporter in the executive admin pool has raised detailed concerns about expense practices by the SVP of Marketing, Jonathan Park, providing documentary evidence to support their allegations.

The reporter states they process expense reports as part of their regular duties and have noticed over an extended period that Park routinely submits personal expenses disguised as business costs. Specific allegations include family vacation flights to destinations like Cancun and Hawaii coded as "conference travel" despite no conferences being scheduled in those locations, spa and wellness treatments for Park's spouse charged as hotel incidentals during business trips and never questioned during approval, holiday gifts purchased from luxury retailers for personal contacts outside the business submitted as "client appreciation" expenses, and first-class upgrades on personal travel submitted as business travel reimbursement.

The reporter estimates this pattern has occurred consistently for at least two years and the total amount involved is "tens of thousands of dollars, possibly more." They indicated they have access to additional documentation if needed and can identify specific transactions that appear fraudulent.

The reporter expressed significant fear of retaliation given Park's seniority and his close personal relationship with the CEO, noting they have been overheard making disparaging comments about previous compliance investigations. The reporter specifically requested that their identity be protected and stated, "I need this job but I also know what I'm seeing is wrong. I'm afraid nothing will be done because he's an executive." They emphasized their willingness to cooperate if anonymity can be guaranteed.

Attached to the report are three expense reports spanning 2024-2025 with highlighted entries the reporter believes are personal expenses totaling $7,190. These include a $4,200 airfare entry to Cancun during a period with no scheduled conferences, spa charges of $890 at a Phoenix resort, and $2,100 in gift purchases from a luxury retailer. The reporter indicated these are representative samples of a larger pattern.`,
    details: `This case was initiated on January 22, 2026, following an anonymous report submitted through the ethics hotline by an individual identifying themselves as a member of the executive administrative support team. The reporter provided specific allegations regarding expense practices of Jonathan Park, Senior Vice President of Marketing, and attached three expense reports with entries they believe represent personal expenses fraudulently submitted for business reimbursement.

The reporter alleges a pattern of expense misuse spanning at least two years. Specific allegations include: round-trip airfare for family members coded as conference travel expenses on at least four occasions, spa and wellness treatments for Park's spouse charged during business trips and submitted as part of hotel incidentals, personal holiday gifts purchased and submitted as client appreciation gifts, and upgrades to first-class air travel for personal trips submitted as business travel.

The reporter expressed significant fear of retaliation, noting that Park maintains a close personal relationship with the CEO and has been overheard making disparaging comments about previous compliance investigations. The reporter specifically requested that their identity be protected and stated, "I need this job but I also know what I'm seeing is wrong. I'm afraid nothing will be done because he's an executive." They indicated willingness to provide additional documentation if their anonymity can be guaranteed.

Due to the seniority of the subject, this case has been escalated to the Chief Compliance Officer with restricted access controls implemented. Only the CCO, General Counsel, and primary investigator have viewing permissions. The Audit Committee Chair has been notified per executive investigation protocol, and an independent forensic accountant has been retained to review Park's expense submissions for the 24-month period referenced by the reporter.

Initial review of the attached expense reports identified three entries flagged by the reporter: a $4,200 airfare entry to Cancun during a period with no scheduled conferences, spa charges of $890 at a Phoenix resort, and $2,100 in gift purchases from a luxury retailer. Investigation is proceeding with enhanced confidentiality protocols.`,
    summary: `Anonymous report from executive admin pool alleges SVP Marketing Jonathan Park has systematically submitted personal expenses as business costs for two or more years. Specific allegations include family vacation airfare, spouse's spa treatments, and personal gifts. Reporter fears retaliation. Escalated to CCO with restricted access. Forensic review initiated.`,
    category: "Financial Misconduct",
    severity: "HIGH",
    hasEscalation: true,
    hasExternalParty: false,
    investigationCount: 1,
    status: "OPEN",
    aiSummary:
      "Anonymous report alleging executive expense fraud by SVP Marketing Jonathan Park spanning two years. Reporter provides three expense reports as documentary evidence with fraudulent entries totaling $7,190. Allegations include family vacation flights coded as conference travel and spouse's spa treatments. High retaliation concern due to subject's CEO relationship. Requires CCO-restricted investigation and forensic expense review.",
    aiRiskScore: 88,
    durationDays: 0,
    demoPoints: [
      "Anonymous reporting with document attachments",
      "Executive-level subject requiring special handling",
      "Reporter concerns about retaliation documented",
      "Audit trail of who accessed sensitive case",
    ],
    referencePrefix: "CASE-2026-EXP",
  },
  {
    name: "Manufacturing Safety Incident",
    narrative: `On December 3rd at approximately 2:15 PM, a serious safety incident occurred at the Denver manufacturing facility when employee Kevin Martinez suffered a traumatic hand injury on the metal stamping press in Bay 4 that required emergency surgery.

Investigation revealed that the safety interlock on Press #4 had been deliberately bypassed using a metal shim inserted into the guard sensor. When interviewed, floor workers indicated this was a "common practice" that had been occurring "for months" to avoid production delays caused by the interlock system. Supervisor Janet Williams was allegedly aware of this practice and had verbally authorized it, with one employee stating Williams said "production comes first" when questioned about the safety modifications.

Martinez was transported to Denver Health Medical Center where he underwent emergency surgery for traumatic hand injuries. His treating physician has indicated an estimated 8-week recovery period with potential permanent limitations to fine motor function. The press involved has been locked out and tagged per company procedure. OSHA notification was made within the required 24-hour window, and an OSHA compliance officer visited the facility on December 5th. The company is cooperating fully with the regulatory investigation.

Further investigation led by EHS Manager Thomas Okonkwo discovered systemic failures extending beyond the initial incident. Three additional presses in the bay were found with identical bypass modifications installed. The last documented safety inspection was conducted in August, four months prior, despite company policy requiring monthly inspections. Training records were incomplete, with 12 employees showing no completion record for the mandatory press safety certification required before operating the equipment.

A review of production metrics revealed that Bay 4 has consistently exceeded its quota by 15-20% since Q2 2025, the period when Williams was promoted to supervisor. This correlation suggests a management culture that prioritized production over safety. Williams has been placed on administrative leave pending investigation completion. Outside safety consultants from Industrial Safety Partners have been engaged to conduct a comprehensive facility audit.`,
    details: `This case was initiated on December 3, 2025, at 2:37 PM following a serious workplace injury at the Denver manufacturing facility. Employee Kevin Martinez, a machine operator in Bay 4, sustained a traumatic hand injury when the metal stamping press cycled unexpectedly while he was clearing a jammed workpiece. Martinez was transported to Denver Health Medical Center where he underwent emergency surgery. His treating physician has indicated an estimated 8-week recovery period with potential permanent limitations to fine motor function.

The incident was reported to OSHA within the required 24-hour window. An OSHA compliance officer visited the facility on December 5, 2025, and the company is cooperating fully with the regulatory investigation. The press involved has been locked out and tagged per company procedure pending inspection.

An initial investigation led by EHS Manager Thomas Okonkwo revealed that the safety interlock on Press #4 had been deliberately bypassed using a metal shim inserted into the guard sensor. When interviewed, multiple floor workers stated this was a known practice that had been occurring "for months" to avoid production delays caused by the interlock system. Three employees specifically stated that supervisor Janet Williams was aware of the practice and had verbally authorized it, with one stating Williams said "production comes first."

Subsequent inspection of other equipment in the bay discovered identical bypass modifications on three additional presses, and the last documented safety inspection was conducted in August 2025 despite company policy requiring monthly inspections. Training records were incomplete, with 12 employees showing no completion record for the mandatory press safety certification required before operating the equipment.

A review of production metrics revealed that Bay 4 has consistently exceeded its quota by 15-20% since Q2 2025, the period when Williams was promoted to supervisor. This correlation suggests a management culture prioritizing production over safety. The plant manager has been notified, and Williams has been placed on administrative leave.

Outside safety consultants from Industrial Safety Partners have been engaged to conduct a comprehensive facility audit. Preliminary remediation actions include removing all bypass modifications, retraining all press operators, and implementing daily supervisor safety sign-offs. The investigation concluded on January 17, 2026, with all allegations substantiated.`,
    summary: `OSHA-reportable injury at Denver manufacturing facility when employee suffered hand trauma due to deliberately bypassed safety interlock. Investigation revealed systemic issues: three additional bypassed presses, four months without safety inspections, incomplete operator training, and supervisor approval of unsafe practices. Regulatory investigation ongoing. All findings substantiated.`,
    category: "Safety",
    severity: "HIGH",
    hasEscalation: true,
    hasExternalParty: true,
    externalPartyType: "regulator",
    investigationCount: 2, // Safety investigation and Management review
    status: "CLOSED",
    aiSummary:
      "Critical OSHA-reportable safety incident at Denver facility. Employee sustained traumatic hand injury from press with deliberately bypassed safety interlock. Systemic failures: four modified presses, four-month inspection gap, 12 uncertified employees, supervisor authorization of unsafe practices. Production metrics show quota overperformance correlating with safety shortcuts. Significant regulatory exposure. External safety consultants engaged.",
    aiRiskScore: 95,
    durationDays: 45,
    demoPoints: [
      "OSHA-reportable incident with regulatory involvement",
      "Systemic issues uncovered beyond initial incident",
      "Multiple root causes identified",
      "Remediation tracking and verification",
    ],
    outcome: "SUBSTANTIATED",
    referencePrefix: "CASE-2025-SAF",
  },
  {
    name: "Healthcare Data Breach",
    narrative: `The IT Security team identified unauthorized access to patient records in the Charlotte Regional Medical Center electronic health record system on January 8th, triggering immediate investigation under HIPAA breach protocols.

Analysis of EHR access logs for the preceding 90-day period revealed that Dr. Sarah Chen, an internal medicine physician, had accessed medical records for 47 patients who were not assigned to her care, had not been referred to her practice, and had no documented clinical relationship with her. These access events occurred between October 1, 2025, and January 6, 2026, with 78% of accesses occurring after 6:00 PM during non-clinical hours, suggesting deliberate timing to avoid observation.

Cross-referencing the accessed records against corporate databases revealed a concerning pattern with potential employment implications. Thirty-one of the 47 patients were identified as employees of Acme Corporation, a company where Dr. Chen's spouse serves as Director of Human Resources. An additional 16 patients were identified as immediate family members of Acme employees. Most concerning, 8 of the accessed employee records were viewed within two weeks before those employees were placed on medical leave, suggesting potential misuse of protected health information in employment decisions.

When initially interviewed on January 12th with Privacy Officer Amanda Foster and legal counsel present, Dr. Chen claimed the accesses were for a research study she was conducting. However, she could not produce IRB approval, research protocol documentation, or patient consent forms when requested. When presented with the correlation to Acme employees and the geographic discrepancy data showing access during off-hours, she declined to continue the interview.

The Privacy Officer determined this incident constitutes a reportable HIPAA breach affecting 47 individuals. Breach notification letters were prepared, and the Office for Civil Rights has been notified as required by regulation. Dr. Chen was placed on administrative leave and medical staff privileges have been suspended pending Medical Executive Committee review. The case has been referred to the State Medical Board for licensure implications.`,
    details: `This case was initiated on January 8, 2026, following a security alert generated by the Charlotte Regional Medical Center's electronic health record (EHR) audit system. The IT Security team identified a pattern of access to patient records that did not align with normal clinical workflows and warranted investigation.

Analysis of EHR access logs for the preceding 90-day period revealed that Dr. Sarah Chen, an internal medicine physician, had accessed medical records for 47 patients who were not assigned to her care, had not been referred to her practice, and had no documented clinical relationship with her. These access events occurred between October 1, 2025, and January 6, 2026, with 78% of accesses occurring after 6:00 PM during non-clinical hours.

Cross-referencing the affected patient records against corporate databases revealed a concerning pattern: 31 of the 47 patients were employees of Acme Corporation, a company where Dr. Chen's spouse serves as Director of Human Resources. An additional 16 patients were identified as immediate family members of Acme employees. Further analysis showed that 8 of the accessed employee records were viewed within two weeks before those employees were placed on medical leave, suggesting potential misuse of medical information in employment decisions.

Dr. Chen was interviewed on January 12, 2026, with Privacy Officer Amanda Foster and legal counsel present. Dr. Chen initially stated the accesses were for a research study she was conducting, but could not produce IRB approval, research protocol documentation, or patient consent forms. When presented with the correlation to Acme employees, Dr. Chen declined to answer additional questions.

The Privacy Officer determined this incident constitutes a reportable HIPAA breach affecting 47 individuals. Breach notification letters were prepared and sent to all affected patients on January 25, 2026. The Office for Civil Rights was notified as required by regulation. Dr. Chen was placed on administrative leave on January 13, 2026, and medical staff privileges have been suspended pending review by the Medical Executive Committee.

The investigation concluded on February 15, 2026, with findings substantiated. Hospital leadership has implemented additional access monitoring protocols, and the case has been referred to the State Medical Board for consideration of licensure implications.`,
    summary: `IT Security detected unauthorized access to 47 patient records by Dr. Sarah Chen over a 3-month period. Cross-referencing revealed 31 patients were employees and 16 were family members of employees at a company where Dr. Chen's spouse is HR Director. HIPAA breach confirmed, regulatory notifications made. Investigation substantiated, privileges suspended.`,
    category: "Data Privacy",
    severity: "HIGH",
    hasEscalation: true,
    hasExternalParty: true,
    externalPartyType: "regulator",
    investigationCount: 1,
    status: "CLOSED",
    aiSummary:
      "HIPAA breach involving unauthorized PHI access by Dr. Sarah Chen across 47 patient records over 90 days. Pattern analysis: 78% after-hours access, correlation with spouse's employer (31 Acme employees, 16 family members), temporal link to 8 subsequent medical leaves. Suggests PHI misuse for employment decisions. OCR notified, breach letters sent, privileges suspended. State Medical Board referral initiated.",
    aiRiskScore: 93,
    durationDays: 38,
    demoPoints: [
      "Healthcare compliance and HIPAA handling",
      "IT forensics and access log analysis",
      "Regulatory notification workflow",
      "Administrative action tracking",
    ],
    outcome: "SUBSTANTIATED",
    referencePrefix: "CASE-2026-HIP",
  },
  {
    name: "Systematic Discrimination Pattern",
    narrative: `A coordinated complaint filed by seven female software engineers in the Technology Division alleges systematic gender discrimination by Director of Engineering Robert Thompson spanning his three-year tenure in the role.

The complaint alleges that Thompson has systematically passed over qualified female candidates for promotion, given lower performance ratings to female team members, excluded women from high-visibility projects, and made comments creating a hostile work environment. The seven reporters, all senior or staff-level engineers with between 4 and 11 years of tenure, have compiled extensive documentation supporting their allegations.

The reporters outline five specific promotion cycles between January 2023 and December 2025 where male candidates with less experience and comparable or lower performance ratings were selected over equally or more qualified female candidates. They provided a detailed comparison matrix showing qualifications, years of experience, and performance ratings for each instance. Statistical analysis of performance review data shows that female engineers under Thompson's supervision received average ratings of 3.2 out of 5.0, compared to 3.9 for male engineers with similar experience levels and project outcomes, a 0.7-point differential the reporters contend cannot be explained by performance differences.

The reporters documented specific inappropriate comments made by Thompson in team meetings and one-on-one discussions, including statements such as "technical leadership really isn't suited for women," "she's too emotional for a senior role," and "we need someone with executive presence" allegedly said after female candidates were passed over. Two male colleagues, Engineers David Park and James Martinez, have provided written statements corroborating that they witnessed similar comments and observed the pattern of exclusion.

Additionally, analysis provided shows that 87% of visible project assignments went to male team members despite a department composition that is 35% female. One reporter, Lisa Nakamura, has indicated she has retained external employment counsel and is evaluating her options. General Counsel has implemented a litigation hold on all documents related to engineering promotions, performance reviews, and project assignments for the 2023-2026 period.`,
    details: `This case was initiated on January 18, 2026, when seven female software engineers in the Technology Division submitted a coordinated discrimination complaint against Robert Thompson, Director of Engineering. The complaint alleges a systematic pattern of gender discrimination in promotion decisions, performance evaluations, project assignments, and workplace conduct spanning Thompson's three-year tenure in the role.

The seven reporters, all senior or staff-level engineers with between 4 and 11 years of tenure, have compiled extensive documentation supporting their allegations. Their complaint outlines five specific promotion cycles between January 2023 and December 2025 where they allege male candidates with less experience and comparable or lower performance were selected over equally or more qualified female candidates. The reporters provided a detailed comparison matrix showing qualifications, years of experience, and performance ratings for each instance.

Statistical analysis of performance review data submitted by the reporters shows that female engineers under Thompson's supervision received average ratings of 3.2 out of 5.0, compared to 3.9 for male engineers with similar experience levels and project outcomes. The reporters contend this 0.7-point differential cannot be explained by performance differences and reflects systematic bias in the evaluation process.

The reporters have documented specific incidents of inappropriate comments made by Thompson in team meetings and one-on-one discussions. These include statements such as "technical leadership really isn't suited for women," "she's too emotional for a senior role," and "we need someone with executive presence," allegedly said after female candidates were passed over. Two male colleagues, Engineers David Park and James Martinez, have provided written statements corroborating that they witnessed similar comments.

Additionally, the reporters allege that female engineers were systematically excluded from high-visibility projects, client presentations, and technical leadership opportunities. They provided an analysis showing that 87% of visible project assignments went to male team members despite a department composition that is 35% female.

One reporter, Lisa Nakamura, has indicated that she has retained external employment counsel and is evaluating her options. General Counsel has implemented a litigation hold on all documents related to engineering promotions, performance reviews, and project assignments for the 2023-2026 period. The case has been escalated to the CCO and CEO for executive oversight.`,
    summary: `Seven female software engineers filed a coordinated discrimination complaint against Engineering Director Robert Thompson, alleging systematic bias in promotions, performance ratings (0.7-point average disadvantage), project assignments, and hostile workplace comments. Reporters provided statistical analysis and two male colleagues corroborated. One reporter has retained external counsel. Litigation hold implemented.`,
    category: "Discrimination",
    severity: "HIGH",
    hasEscalation: true,
    hasExternalParty: true,
    externalPartyType: "legal",
    investigationCount: 1,
    status: "OPEN",
    aiSummary:
      "Systematic gender discrimination allegation from seven female engineers against Director Robert Thompson. Statistical analysis: 0.7-point rating disparity, 87% male project assignment despite 35% female composition. Five promotion cycles favoring less qualified males documented. Two male witnesses corroborate discriminatory comments. One reporter retained external counsel. Litigation hold implemented. High legal exposure requires immediate investigation.",
    aiRiskScore: 91,
    durationDays: 0,
    demoPoints: [
      "Multi-reporter coordinated complaint",
      "Statistical pattern analysis",
      "Documentary evidence management",
      "Litigation hold and preservation",
    ],
    referencePrefix: "CASE-2026-DIS",
  },
  {
    name: "Vendor Kickback Scheme",
    narrative: `The internal audit team has uncovered substantial evidence of a kickback arrangement between Procurement Manager David Wilson and IT vendor TechServe Solutions following an anonymous ethics hotline tip alleging vendor favoritism.

Over the past 24 months, TechServe Solutions has been awarded 14 contracts totaling $2,347,892. Comprehensive analysis of the procurement files revealed systematic irregularities. In 11 of these 14 instances, TechServe's bid was not the lowest, with margins ranging from 5% to 12% above competing bids. Wilson cited "quality concerns" or "technical superiority" to justify selecting TechServe over lower bidders in documentation, but no supporting technical evaluations were found in the procurement files. The vendor qualification checklist for TechServe was marked complete, but the financial review, reference checks, and insurance verification sections were all left blank. The approval was backdated by three months to coincide with a legitimate vendor review cycle.

Background investigation revealed that TechServe CEO Michael Reeves and Wilson were college roommates at State University from 2005-2009. This relationship was not disclosed on Wilson's annual conflict of interest certification, which specifically asks about business relationships with former classmates. The undisclosed personal relationship creates significant conflict concerns.

With legal counsel approval after establishing reasonable suspicion, a forensic accountant reviewed Wilson's personal finances. The review identified $89,000 in unexplained deposits to Wilson's personal bank account over the 24-month period. Additionally, Wilson took two international vacations that coincided temporally with major TechServe contract awards, and purchased a $65,000 luxury vehicle one month after TechServe was awarded its largest contract, the $847,000 data center modernization project.

Given the dollar amounts involved and potential wire fraud implications, General Counsel made the decision to contact the FBI on December 2, 2025. The company has provided full cooperation with the federal investigation. Wilson was placed on administrative leave and his access to procurement systems was immediately revoked.`,
    details: `This investigation was initiated on October 15, 2025, following an anonymous tip received through the ethics hotline alleging that Procurement Manager David Wilson was receiving personal benefits in exchange for favorable vendor selection decisions. The tip specifically mentioned IT vendor TechServe Solutions and suggested that Wilson and TechServe's CEO had a personal relationship that was influencing procurement decisions.

Internal Audit conducted a comprehensive review of IT procurement activities for the 24-month period from October 2023 through September 2025. The analysis identified 14 contracts awarded to TechServe Solutions totaling $2,347,892. In 11 of these 14 instances, TechServe's bid was not the lowest, with margins ranging from 5% to 12% above competing bids. Documentation review showed that Wilson cited "quality concerns" or "technical superiority" to justify selecting TechServe over lower bidders, but no supporting analysis or technical evaluations were documented in the procurement files.

Further investigation revealed that TechServe Solutions was added to the company's approved vendor list by Wilson in September 2023 without completing the standard vendor vetting process. The vendor qualification checklist was marked complete, but the financial review, reference checks, and insurance verification sections were all left blank. The approval was backdated by three months to coincide with a legitimate vendor review cycle.

A background check discovered that TechServe CEO Michael Reeves and Wilson were college roommates at State University from 2005-2009. This relationship was not disclosed on Wilson's annual conflict of interest certification, which specifically asks about business relationships with former classmates.

With legal counsel's approval and after establishing reasonable suspicion of fraud, the company retained a forensic accountant to review Wilson's personal finances. The review identified $89,000 in unexplained deposits to Wilson's personal bank account over the 24-month period. Additionally, Wilson took two international vacations that coincided temporally with major TechServe contract awards, and purchased a luxury vehicle one month after TechServe was awarded its largest contract.

Given the dollar amounts involved and potential wire fraud implications, General Counsel made the decision to contact the FBI on December 2, 2025. The company has provided full cooperation with the federal investigation while continuing its internal investigation. Wilson was placed on administrative leave on December 5, 2025, and his access to procurement systems was immediately revoked.

The internal investigation concluded on January 12, 2026, with all allegations substantiated. Criminal proceedings are ongoing under FBI jurisdiction.`,
    summary: `Internal audit investigation revealed a kickback scheme between Procurement Manager David Wilson and TechServe Solutions involving $2.3M in vendor contracts. TechServe won 14 contracts despite higher bids, Wilson bypassed vendor vetting, and $89,000 in unexplained deposits were found. Undisclosed college roommate relationship with vendor CEO. FBI engaged. All allegations substantiated.`,
    category: "Fraud",
    severity: "HIGH",
    hasEscalation: true,
    hasExternalParty: true,
    externalPartyType: "law_enforcement",
    investigationCount: 2,
    status: "CLOSED",
    aiSummary:
      "Complex commercial fraud involving $2.35M in vendor contracts and $89,000 in suspected kickbacks. Evidence: 11 of 14 contracts to higher bidder, backdated approvals, undisclosed college roommate relationship with vendor CEO. Forensic review shows unexplained deposits correlating with awards. FBI engaged due to wire fraud implications. Wilson on administrative leave, access revoked.",
    aiRiskScore: 97,
    durationDays: 89,
    demoPoints: [
      "Law enforcement coordination",
      "Financial forensics integration",
      "Conflict of interest policy violation",
      "Multi-year pattern analysis",
    ],
    outcome: "SUBSTANTIATED",
    referencePrefix: "CASE-2025-FRD",
  },
  {
    name: "Workplace Violence Threat",
    narrative: `On January 20th at 4:45 PM, Security received an urgent priority report that warehouse employee James Mitchell made specific threatening statements toward his supervisor and coworkers during a team meeting, triggering immediate threat assessment protocols.

According to six witness statements collected within hours of the incident, Mitchell became visibly agitated during a 4:30 PM team meeting where changes to the Q1 work schedule were announced. Witnesses report that Mitchell's face became flushed, he began speaking in a raised voice, and ultimately stood up and made the following statements: "You'll all regret this," "I know where everyone parks," and "This isn't over." Mitchell then left the meeting room abruptly, collected personal belongings from his locker, and exited the building. Security cameras captured his departure at 4:47 PM.

One witness, forklift operator Michael Santos, reported that during a break conversation the previous week, Mitchell had mentioned owning "a collection of guns" and made comments about "not being someone you want to mess with." Santos stated he did not think much of the comments at the time but found them concerning in light of the meeting room incident.

Supervisor Sarah Park provided context on Mitchell's recent behavior patterns. Since being passed over for a team lead position in December 2025, Mitchell had exhibited increasing hostility including slamming doors, kicking equipment, and having a heated argument with coworker David Chen that resulted in an informal verbal warning. Park noted that Mitchell had been complaining about "unfair treatment" to multiple colleagues and had become increasingly isolated from the team.

Security Director Frank Thompson implemented immediate safety measures within 30 minutes of the incident: enhanced patrols of parking lot and building perimeter, Mitchell added to building access deny list with badge deactivated, and affected employees offered early departure with pay. The company's threat assessment team convened an emergency meeting and assessed the threat level as credible and high based on the specific nature of the threats, the escalation pattern, and the weapons references. Local police were notified at 6:45 PM and conducted a welfare check and threat assessment interview with Mitchell at his residence.`,
    details: `This case was initiated on January 20, 2026, at 4:52 PM as an urgent priority incident following a report of threatening statements made by warehouse employee James Mitchell. The report was received by the Corporate Security Operations Center via emergency call from supervisor Sarah Park, who was present when the statements were made.

According to six witness statements collected within hours of the incident, Mitchell became visibly agitated during a 4:30 PM team meeting where changes to the Q1 work schedule were announced. Witnesses report that Mitchell's face became flushed, he began speaking in a raised voice, and ultimately stood up and made the following statements: "You'll all regret this," "I know where everyone parks," and "This isn't over." Mitchell then left the meeting room abruptly, collected personal belongings from his locker, and exited the building. Security cameras captured his departure at 4:47 PM.

One witness, forklift operator Michael Santos, reported that during a break conversation the previous week, Mitchell had mentioned owning "a collection of guns" and made comments about "not being someone you want to mess with." Santos stated he did not think much of the comments at the time but found them concerning in light of the meeting room incident.

Supervisor Park provided context on Mitchell's recent behavior patterns. Since being passed over for a team lead position in December 2025, Mitchell had exhibited increasing hostility including slamming doors, kicking equipment, and having a heated argument with coworker David Chen that resulted in an informal verbal warning. Park noted that Mitchell had been complaining about "unfair treatment" to multiple colleagues and had become increasingly isolated from the team.

Immediate safety measures were implemented within 30 minutes of the incident. Security Director Frank Thompson ordered enhanced patrols of the parking lot and building perimeter. Mitchell was added to the building access deny list, and his badge was deactivated. Park and the employees who witnessed the statements were offered the option of leaving early with pay, which three accepted.

The company's threat assessment team, consisting of Security, HR, Legal, and an external workplace violence consultant, convened an emergency meeting at 6:00 PM. Based on the specific nature of the threats, the escalation pattern, and the weapons references, the team assessed the threat level as credible and high. Local police were notified at 6:45 PM, and officers conducted a welfare check and threat assessment interview with Mitchell at his residence that evening.

Mitchell was formally separated from employment on January 25, 2026, following completion of the investigation. A no-contact order was served, and affected employees were provided information about personal safety measures. The investigation concluded on February 1, 2026, with findings substantiated. No further incidents have been reported.`,
    summary: `Warehouse employee James Mitchell made specific threatening statements during team meeting including "You'll all regret this" and "I know where everyone parks." Prior incidents of escalating hostility documented, references to gun collection reported. Employee removed from premises, law enforcement notified, threat assessment team activated. Threat deemed credible. Employment terminated.`,
    category: "Workplace Violence",
    severity: "HIGH",
    hasEscalation: true,
    hasExternalParty: true,
    externalPartyType: "law_enforcement",
    investigationCount: 1,
    status: "CLOSED",
    aiSummary:
      "Critical workplace violence threat requiring immediate intervention. Employee made specific threatening statements including parking lot references: 'I know where everyone parks.' Pattern shows escalating hostility since December promotion denial. Weapons concern flagged based on gun collection comments. Six witnesses documented. Threat rated credible. Law enforcement notified, employee removed, enhanced security implemented.",
    aiRiskScore: 98,
    durationDays: 12,
    demoPoints: [
      "Urgent threat response workflow",
      "Security coordination",
      "Law enforcement notification",
      "Threat assessment team activation",
    ],
    outcome: "SUBSTANTIATED",
    referencePrefix: "CASE-2026-WPV",
  },
  {
    name: "COI Disclosure - Board Member",
    narrative: `Board member Eleanor Vance has submitted a proactive conflict of interest disclosure regarding her spouse's recent appointment as Chief Medical Officer at HealthFirst Systems, one of the company's most significant healthcare sector clients.

The disclosure details that Dr. William Vance was appointed Chief Medical Officer at HealthFirst Systems effective January 1, 2026. HealthFirst represents approximately 8% of the Healthcare Division's annual revenue, making it one of the company's top 20 client accounts. Vance indicated in her disclosure that she became aware of her husband's pending appointment in early December 2025, but delayed filing the disclosure "due to the holiday period and wanting to gather complete information." This 4-week delay in disclosure, while not a policy violation, has been noted for process improvement consideration.

Initial conflict assessment identified multiple significant touchpoints between Vance's Board responsibilities and the HealthFirst relationship. Vance currently chairs the Client Relations Committee, which has oversight responsibility for the company's top 20 client accounts including HealthFirst. The committee reviews quarterly account performance, approves strategic account plans, and makes recommendations on contract renewals. The HealthFirst contract is scheduled for renewal in Q3 2026, creating an immediate timeline concern.

Additionally, Vance has voting rights on matters that come before the full Board, which would include any significant contract modifications or strategic decisions regarding the HealthFirst relationship. She also receives the monthly Board financial briefing package, which includes detailed performance data on major accounts including HealthFirst revenue, margin, and strategic initiatives. Access to this competitively sensitive information creates potential information asymmetry concerns.

Vance proposed recusing herself from HealthFirst-related matters but requested guidance from the Governance Committee on the appropriate scope of recusal. Specific questions raised included whether she should step down from the Client Relations Committee entirely, whether she should be excluded from Board sessions where HealthFirst is discussed, and whether she needs to be removed from financial briefing distribution lists. General Counsel Jennifer Roberts has been consulted and provided a preliminary opinion that a formal recusal framework is warranted.`,
    details: `This case was initiated on January 6, 2026, when Board member Eleanor Vance submitted a proactive conflict of interest disclosure through the Board Secretary's office. The disclosure concerned the appointment of her spouse, Dr. William Vance, as Chief Medical Officer at HealthFirst Systems, effective January 1, 2026. HealthFirst Systems is one of the company's largest healthcare sector clients, representing approximately 8% of Healthcare Division revenue.

Vance indicated in her disclosure that she became aware of her husband's pending appointment in early December 2025, but delayed filing the disclosure "due to the holiday period and wanting to gather complete information." This 4-week delay in disclosure, while not a policy violation, has been noted for process improvement consideration.

An initial conflict assessment identified multiple touchpoints between Vance's Board responsibilities and the HealthFirst relationship. Vance currently chairs the Client Relations Committee, which has oversight responsibility for the company's top 20 client accounts including HealthFirst. The committee reviews quarterly account performance, approves strategic account plans, and makes recommendations on contract renewals. The HealthFirst contract is scheduled for renewal in Q3 2026.

Additionally, Vance has voting rights on matters that come before the full Board, which would include any significant contract modifications or strategic decisions regarding the HealthFirst relationship. She also receives the monthly Board financial briefing package, which includes detailed performance data on major accounts including HealthFirst revenue, margin, and strategic initiatives.

Vance proposed recusing herself from HealthFirst-related matters but requested guidance from the Governance Committee on the appropriate scope of recusal. Specific questions raised included whether she should step down from the Client Relations Committee entirely, whether she should be excluded from Board sessions where HealthFirst is discussed, and whether she needs to be removed from financial briefing distribution lists.

General Counsel Jennifer Roberts was consulted on January 8, 2026, and provided a preliminary opinion that a formal recusal framework is warranted. The Governance Committee convened on January 15, 2026, to review the disclosure and establish mitigation measures.

The Committee approved the following framework: Vance will recuse from all Client Relations Committee matters pertaining to HealthFirst including account reviews and renewal discussions. She will be excluded from Board discussions specifically concerning HealthFirst strategic decisions or contract matters, though she retains participation in general Healthcare Division discussions. Financial briefings will be provided in two versions, with HealthFirst-specific data redacted from Vance's materials. All recusals will be documented in meeting minutes.

Vance acknowledged and accepted the mitigation framework on January 22, 2026. The case was closed on January 27, 2026, with documentation filed with the Board Secretary for ongoing monitoring. Annual re-certification will be required while the conflict persists.`,
    summary: `Board member Eleanor Vance disclosed spouse's appointment as CMO at HealthFirst Systems, a major client representing 8% of Healthcare Division revenue. Multiple conflict touchpoints identified including committee chairmanship and contract renewal authority. Governance Committee approved formal recusal framework covering committee participation, Board discussions, and financial briefings.`,
    category: "Conflict of Interest",
    severity: "MEDIUM",
    hasEscalation: true,
    hasExternalParty: false,
    investigationCount: 1,
    status: "CLOSED",
    aiSummary:
      "Board-level conflict of interest disclosure regarding spouse's CMO appointment at HealthFirst Systems, representing 8% of Healthcare Division revenue. Multiple conflict touchpoints: chairs Client Relations Committee, voting rights on Q3 2026 contract renewal, access to competitive financial briefings. Proactive disclosure noted though 4-week delay warrants review. Governance Committee review required for formal recusal framework.",
    aiRiskScore: 65,
    durationDays: 21,
    demoPoints: [
      "Board-level disclosure handling",
      "COI management framework",
      "Recusal documentation",
      "Proactive disclosure workflow",
    ],
    outcome: "SUBSTANTIATED",
    referencePrefix: "CASE-2026-COI",
  },
  {
    name: "Retaliation After Safety Report",
    narrative: `Employee Michael Torres has filed a complaint alleging retaliation for his participation as a witness in case CASE-2025-SAF-001, the Bay 4 Press Incident investigation that resulted in substantiated safety violations and regulatory action.

Torres was one of three employees who provided testimony about the bypassed safety interlocks and supervisor Janet Williams' alleged approval of unsafe practices during the original investigation. Since the closure of the safety investigation on January 17, 2026, Torres has experienced a series of adverse employment actions that he believes constitute unlawful retaliation for his protected whistleblowing activity.

The specific adverse actions documented in his complaint include: a shift change from day shift (7:00 AM - 3:00 PM) to night shift (11:00 PM - 7:00 AM) effective January 20, 2026, reassignment from Bay 2 where he has worked for 5 years to Bay 6, complete elimination of overtime opportunities with his average weekly overtime hours dropping from 10 to zero, and a performance review rating decrease from "meets expectations" to "needs improvement" on his January 15 evaluation despite no documented performance issues prior to his testimony.

Most significantly, Torres alleges that his new supervisor, Janet Williams, made a direct statement linking his treatment to his participation in the safety investigation. Williams was transferred from Bay 4 to supervise Bays 5-6 as part of the remediation from the safety case, placing her in Torres's direct chain of command. Torres states that on January 22, Williams told him directly: "People who cause problems get treated like problems." Torres immediately documented this statement in a personal notebook and provided the entry as evidence.

Torres has provided supporting documentation with his complaint, including printed schedules showing the shift and bay assignment changes, overtime authorization records from the past 6 months demonstrating the before-and-after differential, his 2025 and 2026 performance reviews for comparison, and text message screenshots from three coworkers expressing concern about his treatment and stating they believed it was connected to the safety investigation. General Counsel has been notified due to significant legal exposure arising from potential violations of OSHA whistleblower protection provisions.`,
    details: `This case was initiated on January 28, 2026, when manufacturing employee Michael Torres filed a complaint through the ethics hotline alleging retaliation for his participation as a witness in case CASE-2025-SAF-001, the Bay 4 Press Incident investigation that resulted in substantiated safety violations. Torres was one of three employees who provided testimony about the bypassed safety interlocks and supervisor Janet Williams' alleged approval of unsafe practices.

Torres alleges that since the closure of the safety investigation on January 17, 2026, he has experienced a series of adverse employment actions that he believes are retaliation for his protected whistleblowing activity. The specific adverse actions documented in his complaint include: a shift change from day shift (7:00 AM - 3:00 PM) to night shift (11:00 PM - 7:00 AM) effective January 20, reassignment from Bay 2 where he has worked for 5 years to Bay 6, elimination of overtime opportunities with his average weekly overtime hours dropping from 10 to zero, and a performance review rating decrease from "meets expectations" to "needs improvement" on his January 15 evaluation.

Torres provided supporting documentation with his complaint, including printed schedules showing the shift and bay assignment changes, overtime authorization records from the past 6 months, his 2025 and 2026 performance reviews, and text message screenshots from three coworkers expressing concern about his treatment and stating they believed it was connected to the safety investigation.

Most significantly, Torres alleges that his new supervisor, Janet Williams, made a direct statement linking his treatment to his participation in the safety investigation. Williams was transferred from Bay 4 to supervise Bays 5-6 as part of the remediation from the safety case, placing her in Torres's direct chain of command. Torres states that on January 22, Williams told him directly: "People who cause problems get treated like problems." Torres immediately documented this statement in a personal notebook and provided the entry as evidence.

This case has been designated high-priority due to the direct connection to prior protected activity, the temporal proximity of the adverse actions to the conclusion of the safety investigation, and the alleged direct statement by Williams suggesting retaliatory intent. General Counsel has been notified due to the significant legal exposure arising from potential violations of OSHA whistleblower protection provisions.

The investigation is proceeding with interviews of all parties, review of historical scheduling and performance documentation, and analysis of whether similarly situated employees who did not participate in the safety investigation experienced comparable treatment. Williams has been counseled not to discuss the case with Torres or other employees pending investigation completion.`,
    summary: `Manufacturing employee Michael Torres alleges retaliation for whistleblowing in the Bay 4 safety investigation. Since case closure, he experienced shift change to nights, bay reassignment, elimination of overtime, and lowered performance rating. Supervisor Janet Williams allegedly stated "People who cause problems get treated like problems." Case linked to prior substantiated CASE-2025-SAF-001.`,
    category: "Retaliation",
    severity: "HIGH",
    hasEscalation: true,
    hasExternalParty: false,
    investigationCount: 1,
    status: "OPEN",
    aiSummary:
      "Retaliation complaint from OSHA-protected safety whistleblower following Bay 4 Press Incident testimony. Multiple adverse actions within 10 days: shift change to nights, bay reassignment, overtime elimination, performance downgrade. Critical evidence: supervisor's direct statement 'People who cause problems get treated like problems.' Supervisor was original investigation subject. Prima facie retaliation established. General Counsel engaged.",
    aiRiskScore: 89,
    durationDays: 0,
    demoPoints: [
      "Case-to-case linkage",
      "Protected activity retaliation tracking",
      "Temporal pattern analysis",
      "Witness statement correlation",
    ],
    referencePrefix: "CASE-2026-RET",
  },
];

/**
 * Get flagship cases filtered by status
 *
 * @param status - Status to filter by
 * @returns Filtered flagship cases
 */
export function getFlagshipCasesByStatus(
  status: "NEW" | "OPEN" | "CLOSED",
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
    const categoryId =
      categoryNameToId.get(flagship.category) ||
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
  const open = FLAGSHIP_CASES.filter(
    (c) => c.status === "OPEN" || c.status === "NEW",
  ).length;
  const closed = FLAGSHIP_CASES.filter((c) => c.status === "CLOSED").length;
  const withEscalation = FLAGSHIP_CASES.filter((c) => c.hasEscalation).length;
  const withExternalParty = FLAGSHIP_CASES.filter(
    (c) => c.hasExternalParty,
  ).length;
  const avgRiskScore =
    FLAGSHIP_CASES.reduce((sum, c) => sum + c.aiRiskScore, 0) /
    FLAGSHIP_CASES.length;

  return {
    total: FLAGSHIP_CASES.length,
    open,
    closed,
    withEscalation,
    withExternalParty,
    avgRiskScore: Math.round(avgRiskScore),
  };
}
