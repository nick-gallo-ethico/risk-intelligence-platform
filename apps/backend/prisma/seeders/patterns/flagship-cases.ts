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
    narrative: `On January 15th, a third-shift warehouse supervisor was reported for creating a hostile work environment through repeated intimidation tactics.

Multiple employees reported that supervisor Marcus Reynolds regularly uses profanity and aggressive language when addressing floor workers. On the date in question, Reynolds allegedly threw a clipboard at the wall near an employee after a shipping error was discovered.

Three employees have independently filed reports describing similar behavior. One employee stated, "I've worked here for 8 years and have never felt unsafe until Reynolds transferred from the Dallas facility."

The reports indicate this behavior has been escalating since the Q4 productivity push began. Witnesses include the night security officer and two team leads.

This incident follows two prior verbal complaints that were handled informally by the regional HR manager with no documented resolution.`,
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
      "High-severity harassment case involving warehouse supervisor. Pattern of escalating hostile behavior with multiple independent reports. Prior informal complaints went unresolved. Recommend immediate intervention and comprehensive investigation.",
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
    narrative: `During routine quarterly reconciliation, the internal audit team discovered discrepancies in expense reports submitted by Regional Sales Director Patricia Hendricks.

Over the past 18 months, Hendricks submitted approximately $127,000 in expense reports that cannot be verified against actual business activities. Specific concerns include:

1. Multiple high-dollar client dinners with no attendee documentation
2. Hotel stays in cities with no scheduled meetings
3. Conference registrations for events that records show were attended by other employees
4. Recurring charges at a resort that does not match any approved vendor list

Initial review of credit card statements reveals a pattern where personal expenses may have been intermixed with legitimate business expenses. The total questionable amount represents roughly 40% of Hendricks' expense claims during this period.

Hendricks is a 12-year employee with no prior disciplinary issues and consistently exceeds sales targets. The discrepancies were only discovered due to a new expense audit protocol implemented in Q3.

Legal counsel has been engaged due to the dollar amount involved.`,
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
      "Significant expense fraud investigation involving $127K in unverified claims over 18 months. Pattern analysis reveals consistent misuse of expense system. Legal counsel engaged. High-performing employee with no prior issues - unusual profile requires thorough documentation.",
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
    narrative: `An anonymous reporter in the executive admin pool has raised concerns about expense practices by the SVP of Marketing, Jonathan Park.

The reporter states they process expense reports and have noticed that Park routinely submits personal expenses including:
- Family vacation flights coded as "conference travel"
- Spouse's spa treatments at hotels during business trips
- Holiday gifts for personal contacts coded as "client appreciation"

The reporter estimates this has occurred consistently for at least two years and amounts to "tens of thousands of dollars."

The reporter is fearful of retaliation given Park's seniority and close relationship with the CEO. They specifically request anonymity be maintained and express concern that "nothing will be done because he's an executive."

Attached to the report are three expense reports with highlighted entries the reporter believes are personal.`,
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
      "Anonymous report alleging executive expense fraud by SVP Marketing. Reporter provides specific examples and documentary evidence. High retaliation concern noted. Sensitive investigation requiring executive oversight and strict confidentiality controls.",
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
    narrative: `On December 3rd at approximately 2:15 PM, a serious safety incident occurred at the Denver manufacturing facility when employee Kevin Martinez suffered a hand injury on the metal stamping press in Bay 4.

Investigation revealed that the safety interlock on the press had been deliberately bypassed using a metal shim. When interviewed, floor workers indicated this was a "common practice" to meet production quotas. Supervisor Janet Williams was allegedly aware of this practice and had verbally approved it.

Martinez required surgery and will be out for an estimated 8 weeks. OSHA notification was made within required timeframes.

Further investigation discovered:
- Three other presses with bypassed safety interlocks
- No documented safety inspection in 4 months (policy requires monthly)
- Training records show 12 employees never completed press safety certification

A review of production records shows Bay 4 consistently exceeded quotas by 15-20% since Q2, coinciding with when Williams was promoted to supervisor.

External safety consultant has been engaged for comprehensive audit.`,
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
      "Critical safety incident with systemic failures. Deliberately bypassed equipment safeguards, supervisor knowledge/approval, and training gaps. OSHA reportable injury. Pattern suggests production pressure overriding safety culture. Regulatory exposure significant.",
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
    narrative: `The IT Security team identified unauthorized access to patient records in the Charlotte hospital system on January 8th.

Analysis of access logs revealed that Dr. Sarah Chen accessed medical records for 47 patients who were not under her care. These access events occurred over a 3-month period, primarily during evening hours.

Cross-referencing the accessed records revealed that:
- 31 of the patients were employees of Acme Corporation
- 16 were family members of Acme employees
- Several records accessed just before employees went on medical leave

When confronted, Dr. Chen initially claimed the accesses were for "legitimate research purposes" but could not provide documentation of any approved research protocol.

This constitutes a potential HIPAA violation affecting up to 47 individuals. Legal counsel and the Privacy Officer have been engaged. Regulatory notification timeline is being assessed.

Dr. Chen has been placed on administrative leave pending investigation completion.`,
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
      "HIPAA violation involving unauthorized PHI access. 47 patient records accessed without legitimate purpose. Pattern suggests deliberate snooping, possibly related to employment decisions. Regulatory notification required. Administrative leave implemented.",
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
      "Systematic gender discrimination allegation from seven female engineers. Documented pattern of promotion bias, rating disparities, and hostile comments. Strong documentary evidence provided. Legal exposure high due to class nature and external counsel engagement.",
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
      "Complex fraud investigation involving $2.3M in vendor contracts and $89K in suspected kickbacks. Undisclosed personal relationship, documented bid manipulation, and financial anomalies. FBI engaged due to federal implications. Comprehensive forensic and financial analysis completed.",
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
      "Credible workplace violence threat requiring immediate intervention. Employee made specific threatening statements, pattern of escalating hostility, and references to weapons. Law enforcement notified, employee removed from premises, enhanced security implemented. Threat assessment critical priority.",
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
      "Board-level conflict of interest disclosure regarding spouse appointment at major client. Proactive disclosure, though delayed. Multiple conflict touchpoints identified. Requires formal recusal framework and Board documentation. Standard COI management with elevated stakeholder sensitivity.",
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
      "Retaliation complaint from safety whistleblower. Multiple adverse employment actions documented following protected activity. Direct statement from supervisor suggests retaliatory intent. Case linked to prior substantiated safety investigation. High legal exposure.",
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
