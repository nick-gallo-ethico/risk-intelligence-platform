/**
 * Template Library Seeder
 *
 * Seeds Acme Co. with comprehensive template libraries:
 * - Investigation Templates (by category)
 * - Interview Templates (question banks)
 * - Remediation Templates (corrective action plans)
 * - Disclosure Form Templates (COI, Gifts, Outside Employment, etc.)
 * - Web Intake Forms (speak-up, anonymous reporting)
 *
 * Usage:
 *   npx ts-node prisma/seeders/template.seeder.ts
 *
 * Or via seed orchestrator:
 *   npm run db:seed
 */

import { PrismaClient, Prisma, TemplateTier, WorkflowEntityType } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// ===========================================
// Types
// ===========================================

interface SeedContext {
  organizationId: string;
  complianceOfficerId: string;
  categoryMap: Map<string, string>; // categoryName -> categoryId
}

// ===========================================
// Investigation Templates
// ===========================================

const INVESTIGATION_TEMPLATES = [
  {
    name: 'Harassment Investigation',
    description: 'Standard investigation checklist for harassment, discrimination, and hostile work environment complaints.',
    categoryCode: 'HARASSMENT',
    sections: [
      {
        id: 'intake',
        title: 'Initial Intake & Assessment',
        order: 1,
        items: [
          { id: 'review-complaint', text: 'Review initial complaint details', isRequired: true, order: 1 },
          { id: 'assess-severity', text: 'Assess severity and urgency level', isRequired: true, order: 2 },
          { id: 'identify-parties', text: 'Identify all parties involved (complainant, respondent, witnesses)', isRequired: true, order: 3 },
          { id: 'check-prior-reports', text: 'Check for prior reports involving same parties', isRequired: true, order: 4 },
          { id: 'interim-measures', text: 'Determine if interim protective measures needed', isRequired: true, order: 5 },
        ],
      },
      {
        id: 'evidence',
        title: 'Evidence Collection',
        order: 2,
        items: [
          { id: 'collect-docs', text: 'Collect relevant documents (emails, messages, records)', isRequired: true, order: 1 },
          { id: 'preserve-electronic', text: 'Preserve electronic evidence (litigation hold if needed)', isRequired: true, order: 2 },
          { id: 'review-policies', text: 'Review applicable policies and procedures', isRequired: true, order: 3 },
          { id: 'timeline', text: 'Create chronological timeline of events', isRequired: false, order: 4 },
        ],
      },
      {
        id: 'interviews',
        title: 'Witness Interviews',
        order: 3,
        items: [
          { id: 'interview-complainant', text: 'Interview complainant', isRequired: true, order: 1 },
          { id: 'interview-respondent', text: 'Interview respondent', isRequired: true, order: 2 },
          { id: 'interview-witnesses', text: 'Interview witnesses', isRequired: true, order: 3 },
          { id: 'follow-up-interviews', text: 'Conduct follow-up interviews as needed', isRequired: false, order: 4 },
        ],
      },
      {
        id: 'analysis',
        title: 'Analysis & Findings',
        order: 4,
        items: [
          { id: 'credibility-assessment', text: 'Assess credibility of all parties', isRequired: true, order: 1 },
          { id: 'policy-analysis', text: 'Analyze facts against policy standards', isRequired: true, order: 2 },
          { id: 'document-findings', text: 'Document findings with supporting evidence', isRequired: true, order: 3 },
          { id: 'legal-review', text: 'Coordinate with legal (if substantiated)', isRequired: false, order: 4 },
        ],
      },
      {
        id: 'closure',
        title: 'Resolution & Closure',
        order: 5,
        items: [
          { id: 'determine-outcome', text: 'Determine final outcome', isRequired: true, order: 1 },
          { id: 'recommend-actions', text: 'Recommend corrective/remedial actions', isRequired: true, order: 2 },
          { id: 'notify-parties', text: 'Notify parties of outcome (per policy)', isRequired: true, order: 3 },
          { id: 'close-case', text: 'Complete case closure documentation', isRequired: true, order: 4 },
        ],
      },
    ],
    suggestedDurations: { intake: 3, evidence: 7, interviews: 14, analysis: 5, closure: 3 },
  },
  {
    name: 'Fraud Investigation',
    description: 'Comprehensive investigation checklist for financial fraud, embezzlement, and misappropriation cases.',
    categoryCode: 'FRAUD',
    sections: [
      {
        id: 'preliminary',
        title: 'Preliminary Assessment',
        order: 1,
        items: [
          { id: 'review-allegation', text: 'Review fraud allegation details', isRequired: true, order: 1 },
          { id: 'scope-assessment', text: 'Assess potential scope and financial impact', isRequired: true, order: 2 },
          { id: 'identify-controls', text: 'Identify relevant internal controls', isRequired: true, order: 3 },
          { id: 'notify-audit', text: 'Notify Internal Audit (if appropriate)', isRequired: false, order: 4 },
          { id: 'preserve-evidence', text: 'Implement evidence preservation measures', isRequired: true, order: 5 },
        ],
      },
      {
        id: 'financial-review',
        title: 'Financial Analysis',
        order: 2,
        items: [
          { id: 'obtain-records', text: 'Obtain relevant financial records', isRequired: true, order: 1 },
          { id: 'transaction-analysis', text: 'Perform detailed transaction analysis', isRequired: true, order: 2 },
          { id: 'reconciliations', text: 'Review account reconciliations', isRequired: true, order: 3 },
          { id: 'vendor-analysis', text: 'Analyze vendor/customer relationships', isRequired: false, order: 4 },
          { id: 'quantify-loss', text: 'Quantify estimated loss amount', isRequired: true, order: 5 },
        ],
      },
      {
        id: 'digital-forensics',
        title: 'Digital Evidence',
        order: 3,
        items: [
          { id: 'image-devices', text: 'Create forensic images of relevant devices', isRequired: false, order: 1 },
          { id: 'email-review', text: 'Review email communications', isRequired: true, order: 2 },
          { id: 'access-logs', text: 'Analyze system access logs', isRequired: true, order: 3 },
          { id: 'document-metadata', text: 'Examine document metadata', isRequired: false, order: 4 },
        ],
      },
      {
        id: 'interviews-fraud',
        title: 'Interviews',
        order: 4,
        items: [
          { id: 'interview-reporter', text: 'Interview person who reported fraud', isRequired: true, order: 1 },
          { id: 'interview-subject', text: 'Interview subject (with legal counsel present if requested)', isRequired: true, order: 2 },
          { id: 'interview-supervisors', text: 'Interview supervisors and approvers', isRequired: true, order: 3 },
          { id: 'interview-control-owners', text: 'Interview control owners', isRequired: false, order: 4 },
        ],
      },
      {
        id: 'findings-fraud',
        title: 'Findings & Remediation',
        order: 5,
        items: [
          { id: 'document-findings', text: 'Document all findings with evidence', isRequired: true, order: 1 },
          { id: 'determine-responsibility', text: 'Determine individual responsibility', isRequired: true, order: 2 },
          { id: 'control-recommendations', text: 'Develop control improvement recommendations', isRequired: true, order: 3 },
          { id: 'recovery-options', text: 'Assess recovery/restitution options', isRequired: false, order: 4 },
          { id: 'law-enforcement', text: 'Determine if law enforcement referral needed', isRequired: false, order: 5 },
        ],
      },
    ],
    suggestedDurations: { preliminary: 5, 'financial-review': 14, 'digital-forensics': 10, 'interviews-fraud': 10, 'findings-fraud': 7 },
  },
  {
    name: 'Ethics Violation Investigation',
    description: 'Standard checklist for investigating violations of company ethics policies and code of conduct.',
    categoryCode: 'ETHICS',
    sections: [
      {
        id: 'initial-review',
        title: 'Initial Review',
        order: 1,
        items: [
          { id: 'review-report', text: 'Review reported ethics concern', isRequired: true, order: 1 },
          { id: 'identify-policy', text: 'Identify applicable policy/code provisions', isRequired: true, order: 2 },
          { id: 'conflict-check', text: 'Check for conflicts of interest in investigation team', isRequired: true, order: 3 },
          { id: 'prior-violations', text: 'Review subject\'s prior ethics violations (if any)', isRequired: true, order: 4 },
        ],
      },
      {
        id: 'fact-gathering',
        title: 'Fact Gathering',
        order: 2,
        items: [
          { id: 'gather-evidence', text: 'Gather relevant documentary evidence', isRequired: true, order: 1 },
          { id: 'interview-involved', text: 'Interview involved parties', isRequired: true, order: 2 },
          { id: 'consult-experts', text: 'Consult subject matter experts if needed', isRequired: false, order: 3 },
        ],
      },
      {
        id: 'determination',
        title: 'Determination',
        order: 3,
        items: [
          { id: 'analyze-facts', text: 'Analyze facts against policy standards', isRequired: true, order: 1 },
          { id: 'apply-framework', text: 'Apply ethical decision-making framework', isRequired: true, order: 2 },
          { id: 'determine-violation', text: 'Determine if violation occurred', isRequired: true, order: 3 },
        ],
      },
      {
        id: 'resolution',
        title: 'Resolution',
        order: 4,
        items: [
          { id: 'recommend-discipline', text: 'Recommend appropriate disciplinary action', isRequired: true, order: 1 },
          { id: 'notify-hr', text: 'Coordinate with HR on personnel actions', isRequired: true, order: 2 },
          { id: 'document-outcome', text: 'Document outcome and lessons learned', isRequired: true, order: 3 },
          { id: 'training-needs', text: 'Identify training/communication needs', isRequired: false, order: 4 },
        ],
      },
    ],
    suggestedDurations: { 'initial-review': 3, 'fact-gathering': 10, determination: 5, resolution: 3 },
  },
  {
    name: 'Retaliation Investigation',
    description: 'Specialized checklist for investigating claims of retaliation following a protected activity.',
    categoryCode: 'RETALIATION',
    sections: [
      {
        id: 'protected-activity',
        title: 'Protected Activity Analysis',
        order: 1,
        items: [
          { id: 'identify-activity', text: 'Identify the alleged protected activity', isRequired: true, order: 1 },
          { id: 'verify-protected', text: 'Verify activity qualifies as protected', isRequired: true, order: 2 },
          { id: 'document-timeline', text: 'Document timeline of protected activity', isRequired: true, order: 3 },
          { id: 'prior-case-review', text: 'Review original case/report if applicable', isRequired: true, order: 4 },
        ],
      },
      {
        id: 'adverse-action',
        title: 'Adverse Action Analysis',
        order: 2,
        items: [
          { id: 'identify-adverse', text: 'Identify alleged adverse action(s)', isRequired: true, order: 1 },
          { id: 'verify-adverse', text: 'Verify action is materially adverse', isRequired: true, order: 2 },
          { id: 'document-adverse-timeline', text: 'Document timeline of adverse action', isRequired: true, order: 3 },
          { id: 'calculate-proximity', text: 'Calculate temporal proximity', isRequired: true, order: 4 },
        ],
      },
      {
        id: 'causal-connection',
        title: 'Causal Connection',
        order: 3,
        items: [
          { id: 'assess-knowledge', text: 'Assess decision-maker knowledge of protected activity', isRequired: true, order: 1 },
          { id: 'review-documentation', text: 'Review performance documentation/history', isRequired: true, order: 2 },
          { id: 'compare-treatment', text: 'Compare treatment with similarly situated employees', isRequired: true, order: 3 },
          { id: 'interview-decision-makers', text: 'Interview all decision-makers involved', isRequired: true, order: 4 },
        ],
      },
      {
        id: 'legitimate-reason',
        title: 'Legitimate Business Reason Review',
        order: 4,
        items: [
          { id: 'assess-reason', text: 'Assess employer\'s stated reason for action', isRequired: true, order: 1 },
          { id: 'review-policies', text: 'Review relevant policies and past practices', isRequired: true, order: 2 },
          { id: 'verify-consistency', text: 'Verify consistent application of policies', isRequired: true, order: 3 },
          { id: 'pretext-analysis', text: 'Analyze for potential pretext', isRequired: true, order: 4 },
        ],
      },
      {
        id: 'conclusion',
        title: 'Conclusion & Recommendations',
        order: 5,
        items: [
          { id: 'determine-retaliation', text: 'Determine if retaliation occurred', isRequired: true, order: 1 },
          { id: 'recommend-remedy', text: 'Recommend appropriate remedy', isRequired: true, order: 2 },
          { id: 'address-underlying', text: 'Address any underlying issues discovered', isRequired: false, order: 3 },
        ],
      },
    ],
    suggestedDurations: { 'protected-activity': 3, 'adverse-action': 3, 'causal-connection': 10, 'legitimate-reason': 5, conclusion: 3 },
  },
  {
    name: 'Conflict of Interest Investigation',
    description: 'Checklist for investigating undisclosed or problematic conflicts of interest.',
    categoryCode: 'CONFLICT_OF_INTEREST',
    sections: [
      {
        id: 'coi-identification',
        title: 'Conflict Identification',
        order: 1,
        items: [
          { id: 'identify-conflict', text: 'Identify the alleged conflict', isRequired: true, order: 1 },
          { id: 'review-disclosures', text: 'Review employee\'s prior COI disclosures', isRequired: true, order: 2 },
          { id: 'outside-interests', text: 'Identify all relevant outside interests', isRequired: true, order: 3 },
          { id: 'business-relationships', text: 'Map business relationships involved', isRequired: true, order: 4 },
        ],
      },
      {
        id: 'impact-assessment',
        title: 'Impact Assessment',
        order: 2,
        items: [
          { id: 'financial-impact', text: 'Assess financial impact to organization', isRequired: true, order: 1 },
          { id: 'decision-influence', text: 'Identify decisions influenced by conflict', isRequired: true, order: 2 },
          { id: 'vendor-review', text: 'Review related vendor/customer relationships', isRequired: true, order: 3 },
          { id: 'competitive-harm', text: 'Assess competitive harm potential', isRequired: false, order: 4 },
        ],
      },
      {
        id: 'coi-interviews',
        title: 'Interviews',
        order: 3,
        items: [
          { id: 'interview-employee', text: 'Interview employee with conflict', isRequired: true, order: 1 },
          { id: 'interview-supervisors', text: 'Interview supervisors', isRequired: true, order: 2 },
          { id: 'interview-affected', text: 'Interview affected stakeholders', isRequired: false, order: 3 },
        ],
      },
      {
        id: 'coi-resolution',
        title: 'Resolution',
        order: 4,
        items: [
          { id: 'determine-violation', text: 'Determine if policy violated', isRequired: true, order: 1 },
          { id: 'mitigation-plan', text: 'Develop conflict mitigation plan', isRequired: true, order: 2 },
          { id: 'document-controls', text: 'Document ongoing controls', isRequired: true, order: 3 },
          { id: 'disclosure-update', text: 'Update disclosure records', isRequired: true, order: 4 },
        ],
      },
    ],
    suggestedDurations: { 'coi-identification': 5, 'impact-assessment': 7, 'coi-interviews': 7, 'coi-resolution': 5 },
  },
  {
    name: 'Workplace Safety Investigation',
    description: 'Checklist for investigating safety incidents, near-misses, and safety policy violations.',
    categoryCode: 'SAFETY',
    sections: [
      {
        id: 'immediate-response',
        title: 'Immediate Response',
        order: 1,
        items: [
          { id: 'secure-scene', text: 'Secure incident scene (if applicable)', isRequired: true, order: 1 },
          { id: 'medical-attention', text: 'Ensure medical attention provided', isRequired: true, order: 2 },
          { id: 'notify-authorities', text: 'Notify relevant authorities (OSHA if required)', isRequired: true, order: 3 },
          { id: 'preserve-evidence', text: 'Preserve physical evidence', isRequired: true, order: 4 },
        ],
      },
      {
        id: 'fact-finding',
        title: 'Fact Finding',
        order: 2,
        items: [
          { id: 'document-scene', text: 'Document/photograph incident scene', isRequired: true, order: 1 },
          { id: 'collect-statements', text: 'Collect witness statements', isRequired: true, order: 2 },
          { id: 'review-procedures', text: 'Review applicable safety procedures', isRequired: true, order: 3 },
          { id: 'equipment-review', text: 'Review equipment maintenance records', isRequired: false, order: 4 },
          { id: 'training-review', text: 'Review employee training records', isRequired: true, order: 5 },
        ],
      },
      {
        id: 'root-cause',
        title: 'Root Cause Analysis',
        order: 3,
        items: [
          { id: 'apply-rca', text: 'Apply root cause analysis methodology', isRequired: true, order: 1 },
          { id: 'identify-contributing', text: 'Identify contributing factors', isRequired: true, order: 2 },
          { id: 'assess-controls', text: 'Assess effectiveness of existing controls', isRequired: true, order: 3 },
        ],
      },
      {
        id: 'corrective-action',
        title: 'Corrective Action',
        order: 4,
        items: [
          { id: 'develop-corrective', text: 'Develop corrective actions', isRequired: true, order: 1 },
          { id: 'implement-controls', text: 'Implement enhanced controls', isRequired: true, order: 2 },
          { id: 'update-procedures', text: 'Update procedures/training as needed', isRequired: true, order: 3 },
          { id: 'communicate-lessons', text: 'Communicate lessons learned', isRequired: false, order: 4 },
        ],
      },
    ],
    suggestedDurations: { 'immediate-response': 1, 'fact-finding': 5, 'root-cause': 5, 'corrective-action': 5 },
  },
  {
    name: 'Data Privacy Incident Investigation',
    description: 'Checklist for investigating data privacy incidents, breaches, and GDPR/CCPA compliance matters.',
    categoryCode: 'PRIVACY',
    sections: [
      {
        id: 'incident-assessment',
        title: 'Incident Assessment',
        order: 1,
        items: [
          { id: 'identify-incident', text: 'Identify nature of privacy incident', isRequired: true, order: 1 },
          { id: 'data-involved', text: 'Identify data types and subjects involved', isRequired: true, order: 2 },
          { id: 'scope-assessment', text: 'Assess scope and volume of data affected', isRequired: true, order: 3 },
          { id: 'jurisdictions', text: 'Identify applicable jurisdictions', isRequired: true, order: 4 },
        ],
      },
      {
        id: 'containment',
        title: 'Containment',
        order: 2,
        items: [
          { id: 'stop-exposure', text: 'Take steps to stop ongoing exposure', isRequired: true, order: 1 },
          { id: 'preserve-logs', text: 'Preserve system logs and access records', isRequired: true, order: 2 },
          { id: 'notify-it-security', text: 'Notify IT Security team', isRequired: true, order: 3 },
          { id: 'notify-dpo', text: 'Notify Data Protection Officer', isRequired: true, order: 4 },
        ],
      },
      {
        id: 'notification-assessment',
        title: 'Notification Assessment',
        order: 3,
        items: [
          { id: 'assess-risk', text: 'Assess risk of harm to individuals', isRequired: true, order: 1 },
          { id: 'regulatory-requirements', text: 'Determine regulatory notification requirements', isRequired: true, order: 2 },
          { id: 'prepare-notifications', text: 'Prepare required notifications', isRequired: true, order: 3 },
          { id: 'document-decisions', text: 'Document notification decisions', isRequired: true, order: 4 },
        ],
      },
      {
        id: 'remediation',
        title: 'Remediation',
        order: 4,
        items: [
          { id: 'implement-fixes', text: 'Implement technical fixes', isRequired: true, order: 1 },
          { id: 'process-improvements', text: 'Identify process improvements', isRequired: true, order: 2 },
          { id: 'training-needs', text: 'Address training needs', isRequired: false, order: 3 },
          { id: 'document-lessons', text: 'Document lessons learned', isRequired: true, order: 4 },
        ],
      },
    ],
    suggestedDurations: { 'incident-assessment': 2, containment: 2, 'notification-assessment': 3, remediation: 10 },
  },
  {
    name: 'General Misconduct Investigation',
    description: 'General-purpose investigation checklist for policy violations and misconduct not covered by specialized templates.',
    categoryCode: 'MISCONDUCT',
    sections: [
      {
        id: 'preliminary-review',
        title: 'Preliminary Review',
        order: 1,
        items: [
          { id: 'review-allegation', text: 'Review allegation details', isRequired: true, order: 1 },
          { id: 'identify-policies', text: 'Identify relevant policies', isRequired: true, order: 2 },
          { id: 'determine-scope', text: 'Determine investigation scope', isRequired: true, order: 3 },
        ],
      },
      {
        id: 'evidence-gathering',
        title: 'Evidence Gathering',
        order: 2,
        items: [
          { id: 'gather-documents', text: 'Gather relevant documents', isRequired: true, order: 1 },
          { id: 'interview-parties', text: 'Interview all relevant parties', isRequired: true, order: 2 },
          { id: 'review-records', text: 'Review employment/performance records', isRequired: true, order: 3 },
        ],
      },
      {
        id: 'analysis-findings',
        title: 'Analysis & Findings',
        order: 3,
        items: [
          { id: 'analyze-evidence', text: 'Analyze evidence collected', isRequired: true, order: 1 },
          { id: 'determine-facts', text: 'Determine facts', isRequired: true, order: 2 },
          { id: 'apply-policy', text: 'Apply policy standards to facts', isRequired: true, order: 3 },
        ],
      },
      {
        id: 'conclusion-recommendations',
        title: 'Conclusion & Recommendations',
        order: 4,
        items: [
          { id: 'document-conclusion', text: 'Document conclusion', isRequired: true, order: 1 },
          { id: 'recommend-action', text: 'Recommend appropriate action', isRequired: true, order: 2 },
          { id: 'close-case', text: 'Complete case closure', isRequired: true, order: 3 },
        ],
      },
    ],
    suggestedDurations: { 'preliminary-review': 3, 'evidence-gathering': 10, 'analysis-findings': 5, 'conclusion-recommendations': 3 },
  },
];

// ===========================================
// Interview Templates (Question Banks)
// ===========================================

const INTERVIEW_TEMPLATES = [
  {
    name: 'Complainant Interview - Harassment',
    description: 'Standard question set for interviewing complainants in harassment investigations.',
    categoryCode: 'HARASSMENT',
    questions: [
      { id: 'q1', question: 'Please describe in your own words what happened.', isRequired: true, guidance: 'Allow complainant to provide full narrative without interruption.', order: 1 },
      { id: 'q2', question: 'When did this first occur? How many times has it happened?', isRequired: true, guidance: 'Establish timeline and pattern.', order: 2 },
      { id: 'q3', question: 'Where did the incident(s) take place?', isRequired: true, guidance: 'Get specific locations - office, meeting room, offsite, etc.', order: 3 },
      { id: 'q4', question: 'Who else was present or witnessed these events?', isRequired: true, guidance: 'Document all potential witnesses.', order: 4 },
      { id: 'q5', question: 'How did the behavior make you feel? How has it affected your work?', isRequired: true, guidance: 'Document impact on complainant.', order: 5 },
      { id: 'q6', question: 'Did you tell the respondent to stop? What was their response?', isRequired: true, guidance: 'Understand if unwelcomeness was communicated.', order: 6 },
      { id: 'q7', question: 'Did you report this to anyone before filing this complaint?', isRequired: true, guidance: 'Identify prior notice to company.', order: 7 },
      { id: 'q8', question: 'Do you have any documents, emails, texts, or other evidence?', isRequired: true, guidance: 'Collect all available evidence.', order: 8 },
      { id: 'q9', question: 'Is there anything else you want to tell me about this situation?', isRequired: false, guidance: 'Open-ended to capture anything missed.', order: 9 },
      { id: 'q10', question: 'What outcome are you hoping for from this investigation?', isRequired: false, guidance: 'Understand complainant expectations.', order: 10 },
    ],
  },
  {
    name: 'Respondent Interview - Harassment',
    description: 'Standard question set for interviewing respondents in harassment investigations.',
    categoryCode: 'HARASSMENT',
    questions: [
      { id: 'r1', question: 'Are you aware of why we are meeting today?', isRequired: true, guidance: 'Gauge respondent awareness without revealing details prematurely.', order: 1 },
      { id: 'r2', question: 'Describe your relationship with [complainant name].', isRequired: true, guidance: 'Understand the working relationship.', order: 2 },
      { id: 'r3', question: 'The complainant has alleged [specific behavior]. What is your response?', isRequired: true, guidance: 'Present specific allegations and get response.', order: 3 },
      { id: 'r4', question: 'Did the incidents described occur as alleged?', isRequired: true, guidance: 'Get direct confirmation or denial.', order: 4 },
      { id: 'r5', question: 'Did the complainant ever tell you to stop this behavior?', isRequired: true, guidance: 'Establish notice.', order: 5 },
      { id: 'r6', question: 'Were there any witnesses to the interactions?', isRequired: true, guidance: 'Identify corroborating or contradicting witnesses.', order: 6 },
      { id: 'r7', question: 'Do you have any documents or evidence related to these allegations?', isRequired: true, guidance: 'Collect respondent evidence.', order: 7 },
      { id: 'r8', question: 'Is there anything else you want to share about this situation?', isRequired: false, guidance: 'Open-ended for additional context.', order: 8 },
    ],
  },
  {
    name: 'Witness Interview - General',
    description: 'General question set for interviewing witnesses in any type of investigation.',
    categoryCode: null,
    questions: [
      { id: 'w1', question: 'What is your role and how long have you been in this position?', isRequired: true, guidance: 'Establish witness background.', order: 1 },
      { id: 'w2', question: 'How do you know the parties involved in this matter?', isRequired: true, guidance: 'Understand relationship to parties.', order: 2 },
      { id: 'w3', question: 'Were you present during any of the incidents described?', isRequired: true, guidance: 'Establish what witness actually observed.', order: 3 },
      { id: 'w4', question: 'Please describe what you personally observed or heard.', isRequired: true, guidance: 'Get firsthand account - distinguish from hearsay.', order: 4 },
      { id: 'w5', question: 'When and where did this occur?', isRequired: true, guidance: 'Document specifics.', order: 5 },
      { id: 'w6', question: 'Who else was present?', isRequired: true, guidance: 'Identify other potential witnesses.', order: 6 },
      { id: 'w7', question: 'Have either party discussed this matter with you?', isRequired: true, guidance: 'Identify potential bias or contamination.', order: 7 },
      { id: 'w8', question: 'Do you have any documents or evidence related to this matter?', isRequired: true, guidance: 'Collect evidence.', order: 8 },
      { id: 'w9', question: 'Is there anything else relevant you would like to share?', isRequired: false, guidance: 'Open-ended.', order: 9 },
    ],
  },
  {
    name: 'Fraud Investigation Interview',
    description: 'Question set for interviewing subjects in fraud investigations.',
    categoryCode: 'FRAUD',
    questions: [
      { id: 'f1', question: 'Please describe your job responsibilities.', isRequired: true, guidance: 'Understand role and access.', order: 1 },
      { id: 'f2', question: 'Walk me through the normal process for [relevant transaction/approval].', isRequired: true, guidance: 'Understand standard process.', order: 2 },
      { id: 'f3', question: 'Were there any deviations from normal process?', isRequired: true, guidance: 'Identify irregularities.', order: 3 },
      { id: 'f4', question: 'Who else has access to [system/account/process]?', isRequired: true, guidance: 'Identify others with access.', order: 4 },
      { id: 'f5', question: 'Can you explain [specific transaction/anomaly]?', isRequired: true, guidance: 'Get explanation for specific items.', order: 5 },
      { id: 'f6', question: 'Who authorized this transaction?', isRequired: true, guidance: 'Identify approvers.', order: 6 },
      { id: 'f7', question: 'Are you aware of any control weaknesses or workarounds?', isRequired: true, guidance: 'Identify control gaps.', order: 7 },
      { id: 'f8', question: 'Is there anything else you want to tell me?', isRequired: false, guidance: 'Open-ended.', order: 8 },
    ],
  },
  {
    name: 'Exit Interview - Compliance Concerns',
    description: 'Question set for exit interviews focused on compliance and ethics concerns.',
    categoryCode: null,
    questions: [
      { id: 'e1', question: 'During your employment, did you observe any conduct that concerned you from an ethics or compliance perspective?', isRequired: true, guidance: 'Open-ended to surface concerns.', order: 1 },
      { id: 'e2', question: 'Were you ever asked to do something you believed was unethical or against policy?', isRequired: true, guidance: 'Direct question about pressure.', order: 2 },
      { id: 'e3', question: 'Did you ever report a concern through the hotline or to HR?', isRequired: true, guidance: 'Check for unreported concerns.', order: 3 },
      { id: 'e4', question: 'Were there concerns you wanted to report but didn\'t? If so, why not?', isRequired: true, guidance: 'Identify barriers to reporting.', order: 4 },
      { id: 'e5', question: 'How would you describe the "speak up" culture in your department?', isRequired: true, guidance: 'Assess culture.', order: 5 },
      { id: 'e6', question: 'Is there anything you believe the compliance team should know?', isRequired: false, guidance: 'Final opportunity to share.', order: 6 },
    ],
  },
];

// ===========================================
// Remediation Templates
// ===========================================

const REMEDIATION_TEMPLATES = [
  {
    name: 'Standard Disciplinary Action',
    description: 'Template for progressive discipline including verbal warning, written warning, suspension, and termination path.',
    categoryCode: null,
    steps: [
      { order: 1, title: 'Verbal Warning', description: 'Document verbal warning in employee file. Manager meets with employee to discuss expectations.', roleSlug: 'MANAGER', requiresCoApproval: false, dueDaysOffset: 3 },
      { order: 2, title: 'Written Warning', description: 'Formal written warning documenting the violation and expected behavior change.', roleSlug: 'MANAGER', requiresCoApproval: true, dueDaysOffset: 7 },
      { order: 3, title: 'Performance Improvement Plan', description: 'If behavior continues, implement formal PIP with HR involvement.', roleSlug: 'MANAGER', requiresCoApproval: true, dueDaysOffset: 14 },
      { order: 4, title: 'Final Warning / Suspension', description: 'Final written warning or unpaid suspension depending on severity.', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: true, dueDaysOffset: 7 },
      { order: 5, title: 'Termination Review', description: 'If violations continue, review for termination with HR and Legal.', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: true, dueDaysOffset: 14 },
    ],
  },
  {
    name: 'Mandatory Training Completion',
    description: 'Template for requiring completion of compliance training as remediation.',
    categoryCode: null,
    steps: [
      { order: 1, title: 'Training Assignment', description: 'Assign required training module(s) in LMS.', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: false, dueDaysOffset: 2 },
      { order: 2, title: 'Training Completion', description: 'Employee completes assigned training within deadline.', roleSlug: 'EMPLOYEE', requiresCoApproval: false, dueDaysOffset: 14 },
      { order: 3, title: 'Knowledge Assessment', description: 'Verify understanding through quiz or manager discussion.', roleSlug: 'MANAGER', requiresCoApproval: false, dueDaysOffset: 3 },
      { order: 4, title: 'Document Completion', description: 'Document training completion and acknowledgment in employee file.', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: false, dueDaysOffset: 3 },
    ],
  },
  {
    name: 'Policy Acknowledgment',
    description: 'Template for requiring employee to acknowledge understanding of specific policy.',
    categoryCode: null,
    steps: [
      { order: 1, title: 'Policy Review Meeting', description: 'Manager meets with employee to review relevant policy in detail.', roleSlug: 'MANAGER', requiresCoApproval: false, dueDaysOffset: 5 },
      { order: 2, title: 'Written Acknowledgment', description: 'Employee signs acknowledgment of policy understanding and commitment to compliance.', roleSlug: 'EMPLOYEE', requiresCoApproval: false, dueDaysOffset: 2 },
      { order: 3, title: 'File Documentation', description: 'Document acknowledgment in employee file and case record.', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: false, dueDaysOffset: 2 },
    ],
  },
  {
    name: 'Conflict of Interest Mitigation',
    description: 'Template for implementing COI mitigation measures.',
    categoryCode: 'CONFLICT_OF_INTEREST',
    steps: [
      { order: 1, title: 'COI Assessment', description: 'Compliance reviews conflict and determines mitigation requirements.', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: false, dueDaysOffset: 5 },
      { order: 2, title: 'Recusal Implementation', description: 'If required, implement recusal from conflicted decisions/approvals.', roleSlug: 'MANAGER', requiresCoApproval: true, dueDaysOffset: 7 },
      { order: 3, title: 'Disclosure Update', description: 'Employee updates COI disclosure with current information.', roleSlug: 'EMPLOYEE', requiresCoApproval: false, dueDaysOffset: 5 },
      { order: 4, title: 'Control Verification', description: 'Verify mitigation controls are working as intended.', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: false, dueDaysOffset: 30 },
      { order: 5, title: 'Ongoing Monitoring', description: 'Establish ongoing monitoring requirements.', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: false, dueDaysOffset: 90 },
    ],
  },
  {
    name: 'Process Improvement',
    description: 'Template for implementing process/control improvements following an investigation.',
    categoryCode: null,
    steps: [
      { order: 1, title: 'Gap Analysis', description: 'Identify control gaps or process weaknesses revealed by investigation.', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: false, dueDaysOffset: 7 },
      { order: 2, title: 'Improvement Plan', description: 'Develop detailed improvement plan with ownership and timelines.', roleSlug: 'MANAGER', requiresCoApproval: true, dueDaysOffset: 14 },
      { order: 3, title: 'Implementation', description: 'Implement process/control improvements.', roleSlug: 'MANAGER', requiresCoApproval: false, dueDaysOffset: 30 },
      { order: 4, title: 'Communication', description: 'Communicate changes to affected employees.', roleSlug: 'MANAGER', requiresCoApproval: false, dueDaysOffset: 7 },
      { order: 5, title: 'Effectiveness Review', description: 'Review effectiveness of implemented improvements.', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: false, dueDaysOffset: 60 },
    ],
  },
  {
    name: 'Harassment - Substantiated Finding',
    description: 'Remediation plan for substantiated harassment findings.',
    categoryCode: 'HARASSMENT',
    steps: [
      { order: 1, title: 'Immediate Separation', description: 'Implement immediate separation of parties if not already done.', roleSlug: 'MANAGER', requiresCoApproval: true, dueDaysOffset: 1 },
      { order: 2, title: 'Disciplinary Action', description: 'Implement appropriate disciplinary action based on severity.', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: true, dueDaysOffset: 7 },
      { order: 3, title: 'Mandatory Training', description: 'Assign harassment prevention training to respondent.', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: false, dueDaysOffset: 3 },
      { order: 4, title: 'Complainant Check-in', description: 'Follow up with complainant to ensure no retaliation.', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: false, dueDaysOffset: 14 },
      { order: 5, title: 'Documentation', description: 'Ensure complete documentation in personnel files.', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: false, dueDaysOffset: 7 },
      { order: 6, title: '90-Day Follow-up', description: 'Conduct 90-day follow-up with complainant.', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: false, dueDaysOffset: 90 },
    ],
  },
  {
    name: 'Fraud Recovery',
    description: 'Template for fraud remediation including recovery efforts.',
    categoryCode: 'FRAUD',
    steps: [
      { order: 1, title: 'Access Revocation', description: 'Immediately revoke all system and physical access.', roleSlug: 'MANAGER', requiresCoApproval: false, dueDaysOffset: 1 },
      { order: 2, title: 'Legal Consultation', description: 'Consult with Legal on recovery options and law enforcement referral.', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: false, dueDaysOffset: 3 },
      { order: 3, title: 'Loss Quantification', description: 'Complete final quantification of losses.', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: true, dueDaysOffset: 14 },
      { order: 4, title: 'Recovery Initiation', description: 'Initiate recovery efforts (insurance claim, civil action, restitution).', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: true, dueDaysOffset: 30 },
      { order: 5, title: 'Control Remediation', description: 'Implement control improvements to prevent recurrence.', roleSlug: 'MANAGER', requiresCoApproval: true, dueDaysOffset: 60 },
      { order: 6, title: 'Audit Follow-up', description: 'Internal Audit review of implemented controls.', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: false, dueDaysOffset: 90 },
    ],
  },
  {
    name: 'Safety Incident Corrective Action',
    description: 'Template for corrective actions following safety incidents.',
    categoryCode: 'SAFETY',
    steps: [
      { order: 1, title: 'Immediate Hazard Control', description: 'Implement immediate controls to address hazard.', roleSlug: 'MANAGER', requiresCoApproval: false, dueDaysOffset: 1 },
      { order: 2, title: 'Incident Report Completion', description: 'Complete incident report with all required details.', roleSlug: 'MANAGER', requiresCoApproval: false, dueDaysOffset: 3 },
      { order: 3, title: 'Root Cause Corrective Action', description: 'Implement corrective actions addressing root cause.', roleSlug: 'MANAGER', requiresCoApproval: true, dueDaysOffset: 14 },
      { order: 4, title: 'Procedure Updates', description: 'Update safety procedures as needed.', roleSlug: 'MANAGER', requiresCoApproval: true, dueDaysOffset: 21 },
      { order: 5, title: 'Team Communication', description: 'Communicate lessons learned to affected teams.', roleSlug: 'MANAGER', requiresCoApproval: false, dueDaysOffset: 7 },
      { order: 6, title: 'Effectiveness Verification', description: 'Verify corrective actions are effective.', roleSlug: 'COMPLIANCE_OFFICER', requiresCoApproval: false, dueDaysOffset: 60 },
    ],
  },
];

// ===========================================
// Disclosure Form Templates
// ===========================================

const DISCLOSURE_FORM_TEMPLATES = [
  {
    name: 'Annual Conflict of Interest Disclosure',
    description: 'Annual COI disclosure form for all employees covering financial interests, outside positions, and family relationships.',
    disclosureType: 'COI',
    fields: [
      { id: 'has_financial_interest', type: 'BOOLEAN', label: 'Do you have a financial interest in any company that does business with our organization?', required: true },
      { id: 'financial_interests', type: 'REPEATER', label: 'Financial Interests', showIf: 'has_financial_interest', fields: [
        { id: 'company_name', type: 'TEXT', label: 'Company Name', required: true },
        { id: 'relationship_type', type: 'SELECT', label: 'Type of Interest', options: ['Ownership', 'Board Member', 'Advisor', 'Creditor', 'Other'], required: true },
        { id: 'value', type: 'CURRENCY', label: 'Estimated Value', required: true },
        { id: 'description', type: 'TEXTAREA', label: 'Description of Interest', required: true },
      ]},
      { id: 'has_outside_position', type: 'BOOLEAN', label: 'Do you hold any outside positions (board memberships, consulting, employment)?', required: true },
      { id: 'outside_positions', type: 'REPEATER', label: 'Outside Positions', showIf: 'has_outside_position', fields: [
        { id: 'organization', type: 'TEXT', label: 'Organization Name', required: true },
        { id: 'position', type: 'TEXT', label: 'Position/Title', required: true },
        { id: 'compensation', type: 'CURRENCY', label: 'Annual Compensation', required: false },
        { id: 'hours_per_week', type: 'NUMBER', label: 'Hours per Week', required: true },
      ]},
      { id: 'has_family_relationship', type: 'BOOLEAN', label: 'Do you have family members who work for or do business with our organization?', required: true },
      { id: 'family_relationships', type: 'REPEATER', label: 'Family Relationships', showIf: 'has_family_relationship', fields: [
        { id: 'name', type: 'TEXT', label: 'Family Member Name', required: true },
        { id: 'relationship', type: 'SELECT', label: 'Relationship', options: ['Spouse', 'Parent', 'Child', 'Sibling', 'In-Law', 'Other'], required: true },
        { id: 'organization', type: 'TEXT', label: 'Organization/Employer', required: true },
        { id: 'position', type: 'TEXT', label: 'Their Position', required: true },
      ]},
      { id: 'certification', type: 'BOOLEAN', label: 'I certify that the information provided is complete and accurate to the best of my knowledge.', required: true },
    ],
    sections: [
      { id: 'financial', title: 'Financial Interests', order: 1 },
      { id: 'outside', title: 'Outside Positions', order: 2 },
      { id: 'family', title: 'Family Relationships', order: 3 },
      { id: 'certification', title: 'Certification', order: 4 },
    ],
  },
  {
    name: 'Gift Disclosure Form',
    description: 'Form for disclosing received gifts, entertainment, and hospitality.',
    disclosureType: 'GIFT',
    fields: [
      { id: 'gift_date', type: 'DATE', label: 'Date Gift Received', required: true },
      { id: 'gift_type', type: 'SELECT', label: 'Type of Gift', options: ['Physical Gift', 'Entertainment', 'Meal', 'Travel', 'Hospitality', 'Other'], required: true },
      { id: 'gift_description', type: 'TEXTAREA', label: 'Description of Gift', required: true },
      { id: 'estimated_value', type: 'CURRENCY', label: 'Estimated Value', required: true },
      { id: 'giver_name', type: 'TEXT', label: 'Name of Person/Company Giving Gift', required: true },
      { id: 'giver_relationship', type: 'SELECT', label: 'Relationship to Giver', options: ['Vendor', 'Customer', 'Partner', 'Government Official', 'Other'], required: true },
      { id: 'business_purpose', type: 'TEXTAREA', label: 'Business Purpose', required: true },
      { id: 'pending_decisions', type: 'BOOLEAN', label: 'Are there any pending business decisions involving this person/company?', required: true },
      { id: 'pending_decision_details', type: 'TEXTAREA', label: 'Details of Pending Decisions', showIf: 'pending_decisions', required: true },
      { id: 'approval_requested', type: 'BOOLEAN', label: 'I am requesting approval to accept this gift', required: true },
    ],
    sections: [
      { id: 'gift_details', title: 'Gift Details', order: 1 },
      { id: 'giver_info', title: 'Giver Information', order: 2 },
      { id: 'business_context', title: 'Business Context', order: 3 },
    ],
  },
  {
    name: 'Outside Employment Disclosure',
    description: 'Form for disclosing outside employment, consulting, or business activities.',
    disclosureType: 'OUTSIDE_EMPLOYMENT',
    fields: [
      { id: 'employer_name', type: 'TEXT', label: 'Employer/Client Name', required: true },
      { id: 'position_title', type: 'TEXT', label: 'Position/Role', required: true },
      { id: 'employment_type', type: 'SELECT', label: 'Type of Work', options: ['Employment', 'Consulting', 'Board/Advisory', 'Own Business', 'Freelance', 'Other'], required: true },
      { id: 'start_date', type: 'DATE', label: 'Start Date', required: true },
      { id: 'hours_per_week', type: 'NUMBER', label: 'Average Hours per Week', required: true },
      { id: 'annual_compensation', type: 'CURRENCY', label: 'Annual Compensation', required: true },
      { id: 'work_description', type: 'TEXTAREA', label: 'Description of Work', required: true },
      { id: 'uses_company_resources', type: 'BOOLEAN', label: 'Does this work involve use of company time, equipment, or resources?', required: true },
      { id: 'competes_with_company', type: 'BOOLEAN', label: 'Does this work compete with or relate to company business?', required: true },
      { id: 'conflict_description', type: 'TEXTAREA', label: 'If yes, please explain', showIf: 'competes_with_company', required: true },
      { id: 'certification', type: 'BOOLEAN', label: 'I certify this outside activity will not interfere with my job responsibilities.', required: true },
    ],
    sections: [
      { id: 'position_info', title: 'Position Information', order: 1 },
      { id: 'time_commitment', title: 'Time Commitment', order: 2 },
      { id: 'conflict_assessment', title: 'Conflict Assessment', order: 3 },
    ],
  },
  {
    name: 'Political Activity Disclosure',
    description: 'Form for disclosing political contributions, activities, and positions.',
    disclosureType: 'POLITICAL',
    fields: [
      { id: 'activity_type', type: 'SELECT', label: 'Type of Political Activity', options: ['Contribution', 'Campaigning', 'Running for Office', 'Lobbying', 'Other'], required: true },
      { id: 'party_candidate', type: 'TEXT', label: 'Party/Candidate/Cause', required: true },
      { id: 'contribution_amount', type: 'CURRENCY', label: 'Contribution Amount (if applicable)', required: false },
      { id: 'time_commitment', type: 'TEXT', label: 'Time Commitment (if not monetary)', required: false },
      { id: 'activity_description', type: 'TEXTAREA', label: 'Description of Activity', required: true },
      { id: 'office_sought', type: 'TEXT', label: 'Office Sought (if running)', required: false },
      { id: 'company_affiliation_disclosed', type: 'BOOLEAN', label: 'Will your company affiliation be disclosed or apparent?', required: true },
      { id: 'uses_company_resources', type: 'BOOLEAN', label: 'Will you use any company resources for this activity?', required: true },
    ],
    sections: [
      { id: 'activity_details', title: 'Activity Details', order: 1 },
      { id: 'company_impact', title: 'Company Impact', order: 2 },
    ],
  },
  {
    name: 'Business Travel Disclosure',
    description: 'Form for disclosing business travel paid by third parties.',
    disclosureType: 'TRAVEL',
    fields: [
      { id: 'sponsor_name', type: 'TEXT', label: 'Name of Sponsor/Host', required: true },
      { id: 'sponsor_relationship', type: 'SELECT', label: 'Relationship to Sponsor', options: ['Vendor', 'Customer', 'Partner', 'Industry Association', 'Government', 'Other'], required: true },
      { id: 'travel_dates', type: 'DATE_RANGE', label: 'Travel Dates', required: true },
      { id: 'destination', type: 'TEXT', label: 'Destination', required: true },
      { id: 'purpose', type: 'TEXTAREA', label: 'Business Purpose', required: true },
      { id: 'expenses_covered', type: 'MULTISELECT', label: 'Expenses Covered by Sponsor', options: ['Airfare', 'Hotel', 'Meals', 'Ground Transportation', 'Registration Fees', 'Entertainment', 'Other'], required: true },
      { id: 'estimated_value', type: 'CURRENCY', label: 'Estimated Total Value', required: true },
      { id: 'pending_business', type: 'BOOLEAN', label: 'Is there pending business with this sponsor?', required: true },
      { id: 'approval_requested', type: 'BOOLEAN', label: 'I am requesting approval for this travel', required: true },
    ],
    sections: [
      { id: 'trip_details', title: 'Trip Details', order: 1 },
      { id: 'expenses', title: 'Expenses', order: 2 },
      { id: 'approval', title: 'Approval', order: 3 },
    ],
  },
  {
    name: 'Charitable Activities Disclosure',
    description: 'Form for disclosing charitable board positions and significant volunteer activities.',
    disclosureType: 'CHARITABLE',
    fields: [
      { id: 'organization_name', type: 'TEXT', label: 'Organization Name', required: true },
      { id: 'organization_type', type: 'SELECT', label: 'Organization Type', options: ['501(c)(3) Charity', 'Foundation', 'Religious Organization', 'Educational', 'Other Non-Profit'], required: true },
      { id: 'role', type: 'TEXT', label: 'Your Role', required: true },
      { id: 'is_board_member', type: 'BOOLEAN', label: 'Are you a board member or officer?', required: true },
      { id: 'time_commitment', type: 'TEXT', label: 'Time Commitment', required: true },
      { id: 'receives_compensation', type: 'BOOLEAN', label: 'Do you receive compensation?', required: true },
      { id: 'compensation_amount', type: 'CURRENCY', label: 'Compensation Amount', showIf: 'receives_compensation', required: true },
      { id: 'business_relationship', type: 'BOOLEAN', label: 'Does this organization do business with or receive funding from our company?', required: true },
      { id: 'relationship_details', type: 'TEXTAREA', label: 'Details of Business Relationship', showIf: 'business_relationship', required: true },
    ],
    sections: [
      { id: 'organization', title: 'Organization Details', order: 1 },
      { id: 'role_details', title: 'Your Role', order: 2 },
      { id: 'business_impact', title: 'Business Impact', order: 3 },
    ],
  },
  {
    name: 'Code of Conduct Attestation',
    description: 'Annual attestation confirming review and compliance with code of conduct.',
    disclosureType: 'ATTESTATION',
    fields: [
      { id: 'reviewed_code', type: 'BOOLEAN', label: 'I have read and understand the Code of Conduct.', required: true },
      { id: 'complied_past_year', type: 'BOOLEAN', label: 'I have complied with the Code of Conduct during the past year.', required: true },
      { id: 'will_comply', type: 'BOOLEAN', label: 'I commit to continue complying with the Code of Conduct.', required: true },
      { id: 'know_how_to_report', type: 'BOOLEAN', label: 'I know how to report ethics concerns or potential violations.', required: true },
      { id: 'has_concerns', type: 'BOOLEAN', label: 'I am aware of matters that may violate the Code of Conduct.', required: true },
      { id: 'concern_details', type: 'TEXTAREA', label: 'Please describe any concerns', showIf: 'has_concerns', required: true },
      { id: 'signature', type: 'SIGNATURE', label: 'Electronic Signature', required: true },
      { id: 'signature_date', type: 'DATE', label: 'Date', required: true },
    ],
    sections: [
      { id: 'attestation', title: 'Attestation', order: 1 },
      { id: 'concerns', title: 'Concerns', order: 2 },
      { id: 'signature', title: 'Signature', order: 3 },
    ],
  },
];

// ===========================================
// Web Intake Forms
// ===========================================

const WEB_INTAKE_FORMS = [
  {
    name: 'Speak Up - Anonymous Report',
    description: 'Anonymous hotline web intake form for ethics and compliance concerns.',
    formType: 'INTAKE',
    allowAnonymous: true,
    schema: {
      type: 'object',
      required: ['concern_category', 'what_happened', 'when_occurred'],
      properties: {
        concern_category: {
          type: 'string',
          title: 'What type of concern are you reporting?',
          enum: ['Harassment/Discrimination', 'Fraud/Financial', 'Safety', 'Conflicts of Interest', 'Retaliation', 'Policy Violation', 'Other'],
        },
        what_happened: {
          type: 'string',
          title: 'Please describe what happened',
          description: 'Provide as much detail as possible including who was involved, what was said or done, and the impact.',
        },
        when_occurred: {
          type: 'string',
          title: 'When did this occur?',
          enum: ['Today', 'This week', 'This month', 'More than a month ago', 'Ongoing'],
        },
        specific_date: {
          type: 'string',
          format: 'date',
          title: 'Specific date (if known)',
        },
        location: {
          type: 'string',
          title: 'Where did this occur?',
        },
        people_involved: {
          type: 'string',
          title: 'Who was involved? (names, titles, or descriptions)',
        },
        witnesses: {
          type: 'string',
          title: 'Were there any witnesses? (names or descriptions)',
        },
        reported_before: {
          type: 'boolean',
          title: 'Have you reported this concern before?',
        },
        previous_report_details: {
          type: 'string',
          title: 'Details of previous report',
        },
        evidence: {
          type: 'boolean',
          title: 'Do you have any documents or evidence?',
        },
        allow_contact: {
          type: 'boolean',
          title: 'May we contact you for follow-up? (Your identity will remain protected)',
        },
        contact_method: {
          type: 'string',
          title: 'Preferred contact method',
          enum: ['Secure message through this system', 'Phone', 'Email'],
        },
        contact_info: {
          type: 'string',
          title: 'Contact information (if willing to provide)',
        },
      },
    },
    uiSchema: {
      what_happened: { 'ui:widget': 'textarea', 'ui:options': { rows: 6 } },
      people_involved: { 'ui:widget': 'textarea', 'ui:options': { rows: 3 } },
      witnesses: { 'ui:widget': 'textarea', 'ui:options': { rows: 2 } },
      previous_report_details: { 'ui:widget': 'textarea', 'ui:options': { rows: 3 } },
      'ui:order': ['concern_category', 'what_happened', 'when_occurred', 'specific_date', 'location', 'people_involved', 'witnesses', 'reported_before', 'previous_report_details', 'evidence', 'allow_contact', 'contact_method', 'contact_info'],
    },
  },
  {
    name: 'Speak Up - Identified Report',
    description: 'Non-anonymous intake form for employees who want to identify themselves.',
    formType: 'INTAKE',
    allowAnonymous: false,
    schema: {
      type: 'object',
      required: ['reporter_name', 'reporter_email', 'concern_category', 'what_happened', 'when_occurred'],
      properties: {
        reporter_name: {
          type: 'string',
          title: 'Your Name',
        },
        reporter_email: {
          type: 'string',
          format: 'email',
          title: 'Your Email',
        },
        reporter_phone: {
          type: 'string',
          title: 'Your Phone Number (optional)',
        },
        reporter_department: {
          type: 'string',
          title: 'Your Department',
        },
        reporter_location: {
          type: 'string',
          title: 'Your Location',
        },
        concern_category: {
          type: 'string',
          title: 'What type of concern are you reporting?',
          enum: ['Harassment/Discrimination', 'Fraud/Financial', 'Safety', 'Conflicts of Interest', 'Retaliation', 'Policy Violation', 'Other'],
        },
        what_happened: {
          type: 'string',
          title: 'Please describe what happened',
          description: 'Provide as much detail as possible.',
        },
        when_occurred: {
          type: 'string',
          title: 'When did this occur?',
          enum: ['Today', 'This week', 'This month', 'More than a month ago', 'Ongoing'],
        },
        location: {
          type: 'string',
          title: 'Where did this occur?',
        },
        people_involved: {
          type: 'string',
          title: 'Who was involved?',
        },
        witnesses: {
          type: 'string',
          title: 'Were there any witnesses?',
        },
        reported_before: {
          type: 'boolean',
          title: 'Have you reported this concern before?',
        },
        previous_report_details: {
          type: 'string',
          title: 'Details of previous report',
        },
        preferred_contact: {
          type: 'string',
          title: 'Preferred contact method',
          enum: ['Email', 'Phone', 'In-person meeting'],
        },
      },
    },
    uiSchema: {
      what_happened: { 'ui:widget': 'textarea', 'ui:options': { rows: 6 } },
      people_involved: { 'ui:widget': 'textarea', 'ui:options': { rows: 3 } },
      witnesses: { 'ui:widget': 'textarea', 'ui:options': { rows: 2 } },
      'ui:order': ['reporter_name', 'reporter_email', 'reporter_phone', 'reporter_department', 'reporter_location', 'concern_category', 'what_happened', 'when_occurred', 'location', 'people_involved', 'witnesses', 'reported_before', 'previous_report_details', 'preferred_contact'],
    },
  },
  {
    name: 'Request for Information',
    description: 'Form for general compliance and ethics questions.',
    formType: 'INTAKE',
    allowAnonymous: true,
    schema: {
      type: 'object',
      required: ['question_category', 'question'],
      properties: {
        question_category: {
          type: 'string',
          title: 'What is your question about?',
          enum: ['Policy Interpretation', 'Gift/Entertainment', 'Conflict of Interest', 'Outside Activities', 'International Compliance', 'General Ethics', 'Other'],
        },
        question: {
          type: 'string',
          title: 'Your Question',
          description: 'Please describe your question or the situation you need guidance on.',
        },
        urgency: {
          type: 'string',
          title: 'How urgent is this?',
          enum: ['Immediate (decision needed today)', 'This week', 'Not urgent'],
        },
        provide_identity: {
          type: 'boolean',
          title: 'Would you like to provide your contact information?',
        },
        name: {
          type: 'string',
          title: 'Your Name',
        },
        email: {
          type: 'string',
          format: 'email',
          title: 'Your Email',
        },
      },
    },
    uiSchema: {
      question: { 'ui:widget': 'textarea', 'ui:options': { rows: 6 } },
    },
  },
  {
    name: 'Supplier Compliance Concern',
    description: 'Form for reporting concerns about supplier/vendor conduct.',
    formType: 'INTAKE',
    allowAnonymous: true,
    schema: {
      type: 'object',
      required: ['supplier_name', 'concern_type', 'description'],
      properties: {
        supplier_name: {
          type: 'string',
          title: 'Supplier/Vendor Name',
        },
        concern_type: {
          type: 'string',
          title: 'Type of Concern',
          enum: ['Bribery/Corruption', 'Labor/Human Rights', 'Environmental', 'Quality/Safety', 'Contract Violation', 'Conflict of Interest', 'Other'],
        },
        description: {
          type: 'string',
          title: 'Description of Concern',
        },
        when_discovered: {
          type: 'string',
          title: 'When did you become aware of this?',
        },
        evidence: {
          type: 'string',
          title: 'What evidence do you have?',
        },
        ongoing: {
          type: 'boolean',
          title: 'Is this an ongoing issue?',
        },
        allow_contact: {
          type: 'boolean',
          title: 'May we contact you for more information?',
        },
        contact_info: {
          type: 'string',
          title: 'Contact Information',
        },
      },
    },
    uiSchema: {
      description: { 'ui:widget': 'textarea', 'ui:options': { rows: 6 } },
      evidence: { 'ui:widget': 'textarea', 'ui:options': { rows: 3 } },
    },
  },
];

// ===========================================
// Workflow Templates
// ===========================================

interface WorkflowStage {
  id: string;
  name: string;
  description: string;
  order: number;
  type: 'START' | 'APPROVAL' | 'REVIEW' | 'END';
  assigneeRole?: string;
  requiredApprovals?: number;
  actions?: string[];
}

interface WorkflowTransition {
  id: string;
  fromStage: string;
  toStage: string;
  trigger: 'MANUAL' | 'APPROVAL' | 'REJECTION' | 'AUTO';
  label: string;
  requiredRole?: string;
}

interface WorkflowTemplateDefinition {
  name: string;
  description: string;
  entityType: WorkflowEntityType;
  stages: WorkflowStage[];
  transitions: WorkflowTransition[];
  initialStage: string;
  defaultSlaDays?: number;
  slaConfig?: Record<string, number>;
  isDefault?: boolean;
  tags?: string[];
}

const WORKFLOW_TEMPLATES: WorkflowTemplateDefinition[] = [
  {
    name: 'Standard Policy Approval',
    description: 'Two-step approval workflow for policies: Policy Review followed by Final Approval. Used for all standard policy documents.',
    entityType: WorkflowEntityType.POLICY,
    isDefault: true,
    defaultSlaDays: 14,
    tags: ['policy', 'standard', 'two-step'],
    stages: [
      {
        id: 'draft',
        name: 'Draft',
        description: 'Policy is being drafted or revised.',
        order: 1,
        type: 'START',
        actions: ['edit', 'submit_for_review'],
      },
      {
        id: 'policy_review',
        name: 'Policy Review',
        description: 'Policy is under review by the Policy Reviewer. Reviewer checks content, formatting, and compliance with standards.',
        order: 2,
        type: 'REVIEW',
        assigneeRole: 'POLICY_REVIEWER',
        actions: ['approve', 'reject', 'request_changes', 'add_comment'],
      },
      {
        id: 'final_approval',
        name: 'Final Approval',
        description: 'Policy awaits final approval from the Compliance Officer or designated approver.',
        order: 3,
        type: 'APPROVAL',
        assigneeRole: 'COMPLIANCE_OFFICER',
        requiredApprovals: 1,
        actions: ['approve', 'reject', 'request_changes', 'add_comment'],
      },
      {
        id: 'approved',
        name: 'Approved',
        description: 'Policy has been approved and is ready for publication.',
        order: 4,
        type: 'END',
        actions: ['publish', 'archive'],
      },
      {
        id: 'rejected',
        name: 'Rejected',
        description: 'Policy was rejected and requires revision.',
        order: 5,
        type: 'END',
        actions: ['resubmit', 'archive'],
      },
    ],
    transitions: [
      {
        id: 'submit',
        fromStage: 'draft',
        toStage: 'policy_review',
        trigger: 'MANUAL',
        label: 'Submit for Review',
        requiredRole: 'POLICY_AUTHOR',
      },
      {
        id: 'review_approve',
        fromStage: 'policy_review',
        toStage: 'final_approval',
        trigger: 'APPROVAL',
        label: 'Approve & Forward',
        requiredRole: 'POLICY_REVIEWER',
      },
      {
        id: 'review_reject',
        fromStage: 'policy_review',
        toStage: 'draft',
        trigger: 'REJECTION',
        label: 'Request Changes',
        requiredRole: 'POLICY_REVIEWER',
      },
      {
        id: 'final_approve',
        fromStage: 'final_approval',
        toStage: 'approved',
        trigger: 'APPROVAL',
        label: 'Approve Policy',
        requiredRole: 'COMPLIANCE_OFFICER',
      },
      {
        id: 'final_reject',
        fromStage: 'final_approval',
        toStage: 'draft',
        trigger: 'REJECTION',
        label: 'Reject & Return',
        requiredRole: 'COMPLIANCE_OFFICER',
      },
      {
        id: 'resubmit',
        fromStage: 'rejected',
        toStage: 'policy_review',
        trigger: 'MANUAL',
        label: 'Resubmit',
        requiredRole: 'POLICY_AUTHOR',
      },
    ],
    initialStage: 'draft',
    slaConfig: {
      policy_review: 5, // 5 days for review
      final_approval: 3, // 3 days for final approval
    },
  },
  {
    name: 'Expedited Policy Approval',
    description: 'Single-step fast-track approval for urgent policy updates. Requires CCO approval only.',
    entityType: WorkflowEntityType.POLICY,
    isDefault: false,
    defaultSlaDays: 3,
    tags: ['policy', 'expedited', 'urgent'],
    stages: [
      {
        id: 'draft',
        name: 'Draft',
        description: 'Policy is being drafted.',
        order: 1,
        type: 'START',
        actions: ['edit', 'submit_for_approval'],
      },
      {
        id: 'cco_approval',
        name: 'CCO Approval',
        description: 'Policy awaits CCO approval for expedited publication.',
        order: 2,
        type: 'APPROVAL',
        assigneeRole: 'COMPLIANCE_OFFICER',
        requiredApprovals: 1,
        actions: ['approve', 'reject', 'add_comment'],
      },
      {
        id: 'approved',
        name: 'Approved',
        description: 'Policy has been approved.',
        order: 3,
        type: 'END',
        actions: ['publish'],
      },
    ],
    transitions: [
      {
        id: 'submit_expedited',
        fromStage: 'draft',
        toStage: 'cco_approval',
        trigger: 'MANUAL',
        label: 'Submit for Expedited Approval',
        requiredRole: 'POLICY_AUTHOR',
      },
      {
        id: 'cco_approve',
        fromStage: 'cco_approval',
        toStage: 'approved',
        trigger: 'APPROVAL',
        label: 'Approve',
        requiredRole: 'COMPLIANCE_OFFICER',
      },
      {
        id: 'cco_reject',
        fromStage: 'cco_approval',
        toStage: 'draft',
        trigger: 'REJECTION',
        label: 'Reject',
        requiredRole: 'COMPLIANCE_OFFICER',
      },
    ],
    initialStage: 'draft',
  },
  {
    name: 'Three-Tier Policy Approval',
    description: 'Three-level approval workflow for high-impact policies: Legal Review, Compliance Review, Executive Approval.',
    entityType: WorkflowEntityType.POLICY,
    isDefault: false,
    defaultSlaDays: 21,
    tags: ['policy', 'high-impact', 'three-tier'],
    stages: [
      {
        id: 'draft',
        name: 'Draft',
        description: 'Policy is being drafted.',
        order: 1,
        type: 'START',
        actions: ['edit', 'submit'],
      },
      {
        id: 'legal_review',
        name: 'Legal Review',
        description: 'Legal team reviews policy for regulatory compliance and legal risk.',
        order: 2,
        type: 'REVIEW',
        assigneeRole: 'LEGAL',
        actions: ['approve', 'reject', 'request_changes', 'add_comment'],
      },
      {
        id: 'compliance_review',
        name: 'Compliance Review',
        description: 'Compliance team reviews for alignment with compliance standards.',
        order: 3,
        type: 'REVIEW',
        assigneeRole: 'COMPLIANCE_OFFICER',
        actions: ['approve', 'reject', 'request_changes', 'add_comment'],
      },
      {
        id: 'executive_approval',
        name: 'Executive Approval',
        description: 'Executive sign-off required for high-impact policies.',
        order: 4,
        type: 'APPROVAL',
        assigneeRole: 'EXECUTIVE',
        requiredApprovals: 1,
        actions: ['approve', 'reject', 'add_comment'],
      },
      {
        id: 'approved',
        name: 'Approved',
        description: 'Policy has been approved at all levels.',
        order: 5,
        type: 'END',
        actions: ['publish', 'archive'],
      },
    ],
    transitions: [
      {
        id: 'submit_legal',
        fromStage: 'draft',
        toStage: 'legal_review',
        trigger: 'MANUAL',
        label: 'Submit for Legal Review',
        requiredRole: 'POLICY_AUTHOR',
      },
      {
        id: 'legal_approve',
        fromStage: 'legal_review',
        toStage: 'compliance_review',
        trigger: 'APPROVAL',
        label: 'Approve & Forward to Compliance',
        requiredRole: 'LEGAL',
      },
      {
        id: 'legal_reject',
        fromStage: 'legal_review',
        toStage: 'draft',
        trigger: 'REJECTION',
        label: 'Return for Revision',
        requiredRole: 'LEGAL',
      },
      {
        id: 'compliance_approve',
        fromStage: 'compliance_review',
        toStage: 'executive_approval',
        trigger: 'APPROVAL',
        label: 'Approve & Forward to Executive',
        requiredRole: 'COMPLIANCE_OFFICER',
      },
      {
        id: 'compliance_reject',
        fromStage: 'compliance_review',
        toStage: 'draft',
        trigger: 'REJECTION',
        label: 'Return for Revision',
        requiredRole: 'COMPLIANCE_OFFICER',
      },
      {
        id: 'exec_approve',
        fromStage: 'executive_approval',
        toStage: 'approved',
        trigger: 'APPROVAL',
        label: 'Executive Approval',
        requiredRole: 'EXECUTIVE',
      },
      {
        id: 'exec_reject',
        fromStage: 'executive_approval',
        toStage: 'compliance_review',
        trigger: 'REJECTION',
        label: 'Return to Compliance',
        requiredRole: 'EXECUTIVE',
      },
    ],
    initialStage: 'draft',
    slaConfig: {
      legal_review: 7,
      compliance_review: 7,
      executive_approval: 5,
    },
  },
  {
    name: 'Case Investigation Workflow',
    description: 'Standard workflow for case investigations: Triage, Investigation, Review, Closure.',
    entityType: WorkflowEntityType.CASE,
    isDefault: true,
    defaultSlaDays: 30,
    tags: ['case', 'investigation', 'standard'],
    stages: [
      {
        id: 'new',
        name: 'New',
        description: 'Case has been created and awaits triage.',
        order: 1,
        type: 'START',
        actions: ['assign', 'triage', 'close_duplicate'],
      },
      {
        id: 'triage',
        name: 'Triage',
        description: 'Case is being triaged and assigned.',
        order: 2,
        type: 'REVIEW',
        assigneeRole: 'TRIAGE_LEAD',
        actions: ['assign_investigator', 'request_info', 'close'],
      },
      {
        id: 'investigation',
        name: 'Under Investigation',
        description: 'Case is actively being investigated.',
        order: 3,
        type: 'REVIEW',
        assigneeRole: 'INVESTIGATOR',
        actions: ['add_findings', 'interview', 'collect_evidence', 'complete'],
      },
      {
        id: 'review',
        name: 'Management Review',
        description: 'Investigation findings are under management review.',
        order: 4,
        type: 'APPROVAL',
        assigneeRole: 'COMPLIANCE_OFFICER',
        requiredApprovals: 1,
        actions: ['approve', 'request_more_info', 'reopen'],
      },
      {
        id: 'closed',
        name: 'Closed',
        description: 'Case has been closed.',
        order: 5,
        type: 'END',
        actions: ['reopen', 'archive'],
      },
    ],
    transitions: [
      {
        id: 'start_triage',
        fromStage: 'new',
        toStage: 'triage',
        trigger: 'AUTO',
        label: 'Begin Triage',
      },
      {
        id: 'assign_case',
        fromStage: 'triage',
        toStage: 'investigation',
        trigger: 'MANUAL',
        label: 'Assign to Investigator',
        requiredRole: 'TRIAGE_LEAD',
      },
      {
        id: 'complete_investigation',
        fromStage: 'investigation',
        toStage: 'review',
        trigger: 'MANUAL',
        label: 'Submit for Review',
        requiredRole: 'INVESTIGATOR',
      },
      {
        id: 'approve_closure',
        fromStage: 'review',
        toStage: 'closed',
        trigger: 'APPROVAL',
        label: 'Approve & Close',
        requiredRole: 'COMPLIANCE_OFFICER',
      },
      {
        id: 'reopen_investigation',
        fromStage: 'review',
        toStage: 'investigation',
        trigger: 'REJECTION',
        label: 'Request More Information',
        requiredRole: 'COMPLIANCE_OFFICER',
      },
    ],
    initialStage: 'new',
    slaConfig: {
      triage: 2,
      investigation: 21,
      review: 5,
    },
  },
  {
    name: 'Disclosure Review Workflow',
    description: 'Workflow for reviewing employee disclosures: Review, Approval, and optional Mitigation.',
    entityType: WorkflowEntityType.DISCLOSURE,
    isDefault: true,
    defaultSlaDays: 14,
    tags: ['disclosure', 'coi', 'review'],
    stages: [
      {
        id: 'submitted',
        name: 'Submitted',
        description: 'Disclosure has been submitted and awaits review.',
        order: 1,
        type: 'START',
        actions: ['assign_reviewer'],
      },
      {
        id: 'under_review',
        name: 'Under Review',
        description: 'Disclosure is being reviewed by compliance.',
        order: 2,
        type: 'REVIEW',
        assigneeRole: 'COMPLIANCE_OFFICER',
        actions: ['approve', 'require_mitigation', 'reject', 'request_info'],
      },
      {
        id: 'mitigation_required',
        name: 'Mitigation Required',
        description: 'Conflict identified; mitigation plan required.',
        order: 3,
        type: 'REVIEW',
        assigneeRole: 'COMPLIANCE_OFFICER',
        actions: ['approve_mitigation', 'reject'],
      },
      {
        id: 'approved',
        name: 'Approved',
        description: 'Disclosure has been approved (no conflict or mitigated).',
        order: 4,
        type: 'END',
        actions: ['archive'],
      },
      {
        id: 'rejected',
        name: 'Rejected',
        description: 'Disclosure was rejected or activity prohibited.',
        order: 5,
        type: 'END',
        actions: ['archive'],
      },
    ],
    transitions: [
      {
        id: 'begin_review',
        fromStage: 'submitted',
        toStage: 'under_review',
        trigger: 'AUTO',
        label: 'Begin Review',
      },
      {
        id: 'approve_no_conflict',
        fromStage: 'under_review',
        toStage: 'approved',
        trigger: 'APPROVAL',
        label: 'Approve - No Conflict',
        requiredRole: 'COMPLIANCE_OFFICER',
      },
      {
        id: 'require_mitigation',
        fromStage: 'under_review',
        toStage: 'mitigation_required',
        trigger: 'MANUAL',
        label: 'Require Mitigation',
        requiredRole: 'COMPLIANCE_OFFICER',
      },
      {
        id: 'reject_disclosure',
        fromStage: 'under_review',
        toStage: 'rejected',
        trigger: 'REJECTION',
        label: 'Reject - Prohibited',
        requiredRole: 'COMPLIANCE_OFFICER',
      },
      {
        id: 'approve_with_mitigation',
        fromStage: 'mitigation_required',
        toStage: 'approved',
        trigger: 'APPROVAL',
        label: 'Approve with Mitigation',
        requiredRole: 'COMPLIANCE_OFFICER',
      },
      {
        id: 'reject_mitigation',
        fromStage: 'mitigation_required',
        toStage: 'rejected',
        trigger: 'REJECTION',
        label: 'Reject - Cannot Mitigate',
        requiredRole: 'COMPLIANCE_OFFICER',
      },
    ],
    initialStage: 'submitted',
    slaConfig: {
      under_review: 7,
      mitigation_required: 7,
    },
  },
];

// ===========================================
// Seeder Functions
// ===========================================

async function seedWorkflowTemplates(ctx: SeedContext): Promise<void> {
  console.log('\nSeeding Workflow Templates...');

  for (const template of WORKFLOW_TEMPLATES) {
    await prisma.workflowTemplate.upsert({
      where: {
        organizationId_name_version: {
          organizationId: ctx.organizationId,
          name: template.name,
          version: 1,
        },
      },
      update: {
        description: template.description,
        stages: template.stages as unknown as Prisma.InputJsonValue,
        transitions: template.transitions as unknown as Prisma.InputJsonValue,
        initialStage: template.initialStage,
        defaultSlaDays: template.defaultSlaDays,
        slaConfig: template.slaConfig as unknown as Prisma.InputJsonValue,
        isDefault: template.isDefault ?? false,
        tags: template.tags ?? [],
      },
      create: {
        organizationId: ctx.organizationId,
        name: template.name,
        description: template.description,
        entityType: template.entityType,
        stages: template.stages as unknown as Prisma.InputJsonValue,
        transitions: template.transitions as unknown as Prisma.InputJsonValue,
        initialStage: template.initialStage,
        defaultSlaDays: template.defaultSlaDays,
        slaConfig: template.slaConfig as unknown as Prisma.InputJsonValue,
        isActive: true,
        isDefault: template.isDefault ?? false,
        tags: template.tags ?? [],
        createdById: ctx.complianceOfficerId,
      },
    });

    console.log(`  Created: ${template.name} (${template.entityType})`);
  }

  console.log(`  Total: ${WORKFLOW_TEMPLATES.length} workflow templates`);
}

async function seedInvestigationTemplates(ctx: SeedContext): Promise<void> {
  console.log('\nSeeding Investigation Templates...');

  for (const template of INVESTIGATION_TEMPLATES) {
    const categoryId = ctx.categoryMap.get(template.categoryCode);

    await prisma.investigationTemplate.upsert({
      where: {
        organizationId_name_version: {
          organizationId: ctx.organizationId,
          name: template.name,
          version: 1,
        },
      },
      update: {
        description: template.description,
        sections: template.sections as unknown as Prisma.InputJsonValue,
        suggestedDurations: template.suggestedDurations as unknown as Prisma.InputJsonValue,
      },
      create: {
        organizationId: ctx.organizationId,
        name: template.name,
        description: template.description,
        categoryId: categoryId || null,
        tier: TemplateTier.OFFICIAL,
        createdById: ctx.complianceOfficerId,
        sections: template.sections as unknown as Prisma.InputJsonValue,
        suggestedDurations: template.suggestedDurations as unknown as Prisma.InputJsonValue,
        isSystemTemplate: true,
        isActive: true,
        isDefault: template.name === 'General Misconduct Investigation',
      },
    });

    console.log(`  Created: ${template.name}`);
  }

  console.log(`  Total: ${INVESTIGATION_TEMPLATES.length} investigation templates`);
}

async function seedInterviewTemplates(ctx: SeedContext): Promise<void> {
  console.log('\nSeeding Interview Templates...');

  for (const template of INTERVIEW_TEMPLATES) {
    const categoryId = template.categoryCode ? ctx.categoryMap.get(template.categoryCode) : null;

    await prisma.interviewTemplate.upsert({
      where: {
        organizationId_name: {
          organizationId: ctx.organizationId,
          name: template.name,
        },
      },
      update: {
        description: template.description,
        questions: template.questions as unknown as Prisma.InputJsonValue,
      },
      create: {
        organizationId: ctx.organizationId,
        name: template.name,
        description: template.description,
        categoryId: categoryId || null,
        questions: template.questions as unknown as Prisma.InputJsonValue,
        isSystem: true,
        isActive: true,
        createdById: ctx.complianceOfficerId,
      },
    });

    console.log(`  Created: ${template.name}`);
  }

  console.log(`  Total: ${INTERVIEW_TEMPLATES.length} interview templates`);
}

async function seedRemediationTemplates(ctx: SeedContext): Promise<void> {
  console.log('\nSeeding Remediation Templates...');

  for (const template of REMEDIATION_TEMPLATES) {
    const categoryId = template.categoryCode ? ctx.categoryMap.get(template.categoryCode) : null;

    await prisma.remediationTemplate.upsert({
      where: {
        organizationId_name: {
          organizationId: ctx.organizationId,
          name: template.name,
        },
      },
      update: {
        description: template.description,
        steps: template.steps as unknown as Prisma.InputJsonValue,
      },
      create: {
        organizationId: ctx.organizationId,
        name: template.name,
        description: template.description,
        categoryId: categoryId || null,
        steps: template.steps as unknown as Prisma.InputJsonValue,
        isSystem: true,
        isActive: true,
        createdById: ctx.complianceOfficerId,
      },
    });

    console.log(`  Created: ${template.name}`);
  }

  console.log(`  Total: ${REMEDIATION_TEMPLATES.length} remediation templates`);
}

async function seedDisclosureFormTemplates(ctx: SeedContext): Promise<void> {
  console.log('\nSeeding Disclosure Form Templates...');

  for (const template of DISCLOSURE_FORM_TEMPLATES) {
    await prisma.disclosureFormTemplate.upsert({
      where: {
        organizationId_name_version: {
          organizationId: ctx.organizationId,
          name: template.name,
          version: 1,
        },
      },
      update: {
        description: template.description,
        fields: template.fields as unknown as Prisma.InputJsonValue,
        sections: template.sections as unknown as Prisma.InputJsonValue,
      },
      create: {
        organizationId: ctx.organizationId,
        name: template.name,
        description: template.description,
        disclosureType: template.disclosureType as any,
        fields: template.fields as unknown as Prisma.InputJsonValue,
        sections: template.sections as unknown as Prisma.InputJsonValue,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedBy: ctx.complianceOfficerId,
        isSystem: true,
        createdById: ctx.complianceOfficerId,
      },
    });

    console.log(`  Created: ${template.name}`);
  }

  console.log(`  Total: ${DISCLOSURE_FORM_TEMPLATES.length} disclosure form templates`);
}

async function seedWebIntakeForms(ctx: SeedContext): Promise<void> {
  console.log('\nSeeding Web Intake Forms...');

  for (const form of WEB_INTAKE_FORMS) {
    await prisma.formDefinition.upsert({
      where: {
        organizationId_name_version: {
          organizationId: ctx.organizationId,
          name: form.name,
          version: 1,
        },
      },
      update: {
        description: form.description,
        schema: form.schema as unknown as Prisma.InputJsonValue,
        uiSchema: form.uiSchema as unknown as Prisma.InputJsonValue,
      },
      create: {
        organizationId: ctx.organizationId,
        name: form.name,
        description: form.description,
        formType: form.formType as any,
        schema: form.schema as unknown as Prisma.InputJsonValue,
        uiSchema: form.uiSchema as unknown as Prisma.InputJsonValue,
        allowAnonymous: form.allowAnonymous,
        isActive: true,
        isPublished: true,
        publishedAt: new Date(),
        createdById: ctx.complianceOfficerId,
      },
    });

    console.log(`  Created: ${form.name}`);
  }

  console.log(`  Total: ${WEB_INTAKE_FORMS.length} web intake forms`);
}

// ===========================================
// Main Seeder
// ===========================================

export async function seedTemplates(): Promise<void> {
  console.log('\n========================================');
  console.log('TEMPLATE LIBRARY SEEDER');
  console.log('========================================');

  // Get Acme organization
  const acmeOrg = await prisma.organization.findFirst({
    where: {
      OR: [
        { slug: 'acme-corp' },
        { name: { contains: 'Acme' } },
      ],
    },
  });

  if (!acmeOrg) {
    console.error('ERROR: Acme organization not found. Run base seed first.');
    return;
  }

  // Get compliance officer user
  const complianceOfficer = await prisma.user.findFirst({
    where: {
      organizationId: acmeOrg.id,
      OR: [
        { email: 'demo-cco@acme.local' },
        { email: { contains: 'compliance' } },
        { role: 'COMPLIANCE_OFFICER' },
      ],
    },
  });

  if (!complianceOfficer) {
    console.error('ERROR: Compliance officer user not found.');
    return;
  }

  // Build category map
  const categories = await prisma.category.findMany({
    where: { organizationId: acmeOrg.id },
    select: { id: true, code: true, name: true },
  });

  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    if (cat.code) categoryMap.set(cat.code, cat.id);
    categoryMap.set(cat.name, cat.id);
  }

  const ctx: SeedContext = {
    organizationId: acmeOrg.id,
    complianceOfficerId: complianceOfficer.id,
    categoryMap,
  };

  console.log(`\nOrganization: ${acmeOrg.name}`);
  console.log(`Compliance Officer: ${complianceOfficer.email}`);
  console.log(`Categories mapped: ${categoryMap.size}`);

  // Run all seeders
  await seedWorkflowTemplates(ctx);
  await seedInvestigationTemplates(ctx);
  await seedInterviewTemplates(ctx);
  await seedRemediationTemplates(ctx);
  await seedDisclosureFormTemplates(ctx);
  await seedWebIntakeForms(ctx);

  console.log('\n========================================');
  console.log('TEMPLATE LIBRARY SEEDER COMPLETE');
  console.log('========================================');
  console.log('\nSummary:');
  console.log(`  - ${WORKFLOW_TEMPLATES.length} Workflow Templates`);
  console.log(`  - ${INVESTIGATION_TEMPLATES.length} Investigation Templates`);
  console.log(`  - ${INTERVIEW_TEMPLATES.length} Interview Templates`);
  console.log(`  - ${REMEDIATION_TEMPLATES.length} Remediation Templates`);
  console.log(`  - ${DISCLOSURE_FORM_TEMPLATES.length} Disclosure Form Templates`);
  console.log(`  - ${WEB_INTAKE_FORMS.length} Web Intake Forms`);
  console.log('========================================\n');
}

// ===========================================
// CLI Entry Point
// ===========================================

async function main(): Promise<void> {
  try {
    await seedTemplates();
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
