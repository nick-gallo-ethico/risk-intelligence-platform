/**
 * AI Conversation Seeder
 *
 * Creates ~50 AiConversation records with AiMessage history so AI chat
 * panels show realistic prior interactions. This demonstrates the AI
 * assistant capabilities in demos.
 *
 * Features:
 * - 5 conversation types covering different AI use cases
 * - Linked to actual cases, investigations, and policies
 * - Realistic conversation flows with 2-6 messages each
 * - Token counts and model metadata
 * - Mix of ACTIVE, PAUSED, and ARCHIVED statuses
 * - Timestamps distributed over last 30 days
 */

import { PrismaClient, AiConversationStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { subDays, subHours, addMinutes } from 'date-fns';
import { SEED_CONFIG } from './config';
import {
  pickRandom,
  randomInt,
  chance,
  DEMO_CURRENT_DATE,
} from './utils';

// Seed offset for AI conversations (masterSeed + 7000)
const SEED_OFFSET = 7000;

// Batch size for database inserts
const BATCH_SIZE = 50;

// AI model used for responses
const AI_MODEL = 'claude-3-5-sonnet-20241022';

// ============================================
// Conversation Templates
// ============================================

interface ConversationTemplate {
  type: 'case' | 'investigation' | 'policy' | 'disclosure' | 'analytics';
  entityType: string | null;
  agentType: string;
  titleTemplates: string[];
  exchanges: Array<{
    userPrompt: string;
    assistantResponse: string;
    inputTokens: number;
    outputTokens: number;
  }>[];
}

// Case Summarization Conversations (15)
const CASE_SUMMARIZATION_TEMPLATES: ConversationTemplate = {
  type: 'case',
  entityType: 'case',
  agentType: 'case',
  titleTemplates: [
    'Case Summary Request',
    'Risk Factor Analysis',
    'Case Overview',
    'Summary and Recommendations',
    'Quick Case Briefing',
  ],
  exchanges: [
    // Template 1: Basic summary
    [
      {
        userPrompt: 'Can you summarize this case for me?',
        assistantResponse: `I'll provide a comprehensive summary of this case.

**Case Overview:**
This case involves a workplace conduct allegation filed through our ethics hotline. The complainant reported concerns about management behavior that may have violated our Code of Conduct.

**Key Details:**
- The incident occurred over a period of approximately two weeks
- Multiple witnesses were identified in the initial report
- The subject is a mid-level manager in the operations department
- The complainant chose to remain anonymous but provided detailed documentation

**Current Status:**
The case is currently under active investigation with witness interviews scheduled for next week.

**Initial Assessment:**
Based on the information provided, this appears to be a substantive complaint that warrants thorough investigation. The pattern of behavior described, if verified, would constitute a policy violation.`,
        inputTokens: 85,
        outputTokens: 245,
      },
      {
        userPrompt: 'What are the key risk factors I should be aware of?',
        assistantResponse: `Based on my analysis of this case, here are the primary risk factors to consider:

**High-Priority Risks:**

1. **Repeat Behavior Pattern**
   - Similar concerns were raised informally 6 months ago
   - No formal documentation of previous complaints
   - Suggests potential systemic issue requiring attention

2. **Management Awareness**
   - Direct supervisor was allegedly informed of concerns
   - Lack of action may indicate leadership gap
   - Creates potential liability exposure

3. **Regulatory Exposure**
   - Allegations involve protected class discrimination elements
   - EEOC complaint possibility within statute of limitations
   - Document retention and investigation procedures are critical

**Medium-Priority Risks:**

4. **Witness Availability**
   - Two key witnesses have upcoming PTO scheduled
   - One witness transferred to different department
   - Recommend prioritizing their interviews

5. **Retaliation Concerns**
   - Complainant expressed fear of retaliation
   - Enhanced monitoring of subject's interactions recommended
   - Consider protective measures for identified witnesses

**Recommendations:**
- Expedite witness interviews before availability changes
- Engage Legal for regulatory compliance guidance
- Implement enhanced confidentiality protocols`,
        inputTokens: 120,
        outputTokens: 385,
      },
    ],
    // Template 2: Timeline focus
    [
      {
        userPrompt: 'Can you walk me through the timeline of events in this case?',
        assistantResponse: `Here's a chronological breakdown of the key events in this case:

**Timeline of Events:**

**Week 1 - Initial Incident (January 15-19)**
- January 15: First alleged incident occurred during team meeting
- January 17: Complainant discussed concerns with a colleague
- January 19: Second incident reported during performance review

**Week 2 - Escalation (January 22-26)**
- January 22: Complainant attempted to address issue directly with subject
- January 24: Subject allegedly responded negatively to feedback
- January 26: Complainant consulted HR informally (no formal report filed)

**Week 3 - Formal Report (January 29-31)**
- January 29: Anonymous report submitted via ethics hotline
- January 30: Case created and assigned to investigation team
- January 31: Initial assessment completed, high priority assigned

**Current Week - Investigation Phase**
- February 1: Document collection initiated
- February 2: Witness list compiled
- February 3: Interview scheduling in progress

**Key Observations:**
- Two-week gap between first incident and formal report is notable
- Informal HR consultation did not result in action
- Timeline suggests escalating pattern of behavior`,
        inputTokens: 95,
        outputTokens: 365,
      },
    ],
    // Template 3: Comparison with similar cases
    [
      {
        userPrompt: 'Have we seen similar cases before? What were the outcomes?',
        assistantResponse: `I've analyzed our case database and found several relevant precedents:

**Similar Cases in Past 24 Months:**

**Case #1: CASE-2024-02847 (Substantiated)**
- Category: Workplace Harassment
- Similarity Score: 87%
- Outcome: Policy violation confirmed
- Resolution: Written warning, mandatory training
- Duration: 18 days

**Case #2: CASE-2024-01563 (Substantiated)**
- Category: Code of Conduct Violation
- Similarity Score: 82%
- Outcome: Multiple policy violations found
- Resolution: Demotion and performance plan
- Duration: 34 days

**Case #3: CASE-2023-04921 (Unsubstantiated)**
- Category: Management Conduct
- Similarity Score: 76%
- Outcome: Insufficient evidence
- Resolution: Coaching provided, no formal action
- Duration: 22 days

**Pattern Analysis:**
- 67% of similar cases resulted in substantiated findings
- Average resolution time: 25 days
- Most common outcome: Formal warning with training requirement

**Recommendations Based on Precedent:**
- Current case has strong documentary evidence, suggesting higher likelihood of substantiation
- Consider proactive management coaching regardless of outcome
- Budget 20-30 days for thorough investigation`,
        inputTokens: 110,
        outputTokens: 420,
      },
    ],
    // Template 4: Quick status check
    [
      {
        userPrompt: 'What\'s the current status of this investigation?',
        assistantResponse: `Here's a quick status update on the investigation:

**Investigation Status: ACTIVE - In Progress**

**Completion Progress:** Approximately 45%

**Completed Steps:**
- Initial intake and assessment
- Document collection from HR systems
- Email preservation request submitted
- Witness list compiled (7 individuals identified)

**In Progress:**
- Witness interviews (2 of 7 completed)
- Subject notification pending (scheduled for tomorrow)
- Access log review from IT security

**Pending:**
- Subject interview
- Final witness interviews
- Documentary evidence analysis
- Findings report drafting

**Timeline:**
- Days since case opened: 8
- Estimated completion: 12-15 additional days
- SLA Status: On track (due in 22 days)

**Immediate Next Steps:**
1. Complete interview with witness #3 (today, 2 PM)
2. Notify subject of investigation (tomorrow morning)
3. Schedule subject interview for end of week`,
        inputTokens: 75,
        outputTokens: 295,
      },
    ],
  ],
};

// Investigation Guidance Conversations (10)
const INVESTIGATION_GUIDANCE_TEMPLATES: ConversationTemplate = {
  type: 'investigation',
  entityType: 'investigation',
  agentType: 'investigation',
  titleTemplates: [
    'Investigation Next Steps',
    'Interview Strategy',
    'Evidence Collection Guidance',
    'Investigation Planning',
    'Witness Interview Prep',
  ],
  exchanges: [
    // Template 1: Next steps guidance
    [
      {
        userPrompt: 'What should be my next steps in this investigation?',
        assistantResponse: `Based on the current investigation status and evidence collected, I recommend the following next steps:

**Immediate Actions (Next 48 Hours):**

1. **Complete Pending Witness Interviews**
   - Sarah Johnson (Finance) - Direct observer of incident
   - Michael Chen (IT) - Has relevant email evidence
   - Priority: High - both have knowledge of key events

2. **Request Additional Documentation**
   - Performance review records for subject (last 2 years)
   - Team meeting notes from Q4 2025
   - Access badge logs for dates in question

3. **Schedule Subject Interview**
   - Allow 2-3 days after witness interviews
   - Prepare specific questions based on witness statements
   - Review company policies they may have violated

**Strategic Recommendations:**

4. **Evidence Preservation**
   - Issue litigation hold to IT for relevant communications
   - Secure physical documents from subject's workspace
   - Capture screenshots of any relevant system access logs

5. **Policy Review**
   - Confirm which specific policies may have been violated
   - Document the applicable sections
   - Prepare policy excerpts for subject interview

6. **Coordination**
   - Brief Legal on regulatory exposure
   - Update HR on potential disciplinary outcomes
   - Schedule case review meeting for next week

**Timeline Estimate:** 10-14 days to completion if steps followed`,
        inputTokens: 95,
        outputTokens: 425,
      },
      {
        userPrompt: 'How should I approach the interview with the subject?',
        assistantResponse: `Here's a comprehensive approach for conducting the subject interview:

**Pre-Interview Preparation:**

1. **Documentation Review**
   - Review all witness statements for key themes
   - Identify specific incidents to discuss
   - Prepare timeline of events to reference
   - Have relevant policy documents available

2. **Question Framework**
   - Start with open-ended questions to get their perspective
   - Move to specific incidents chronologically
   - Address each policy concern separately
   - End with opportunity for them to add information

**Interview Structure:**

**Opening (5-10 minutes)**
- Explain purpose of investigation
- Clarify their rights (representation, confidentiality limits)
- Emphasize importance of honest, complete answers
- Explain non-retaliation protections

**Core Questions (30-45 minutes)**
- "Can you describe your working relationship with [complainant]?"
- "Walk me through what happened on [specific date]"
- "What was your understanding of [specific situation]?"
- "How do you typically handle [type of situation]?"
- "Were there any witnesses to [incident]?"

**Addressing Allegations (20-30 minutes)**
- Present specific allegations without revealing sources
- Allow them to respond fully before follow-up
- Note any inconsistencies with other statements
- Ask for any documentation supporting their account

**Closing (10 minutes)**
- Ask if there's anything else relevant
- Explain next steps in the process
- Remind about confidentiality expectations
- Provide contact information for questions

**Key Tips:**
- Maintain neutral, professional demeanor
- Document exact quotes when possible
- Don't reveal witness identities
- Don't make promises about outcomes`,
        inputTokens: 85,
        outputTokens: 520,
      },
    ],
    // Template 2: Evidence evaluation
    [
      {
        userPrompt: 'How strong is the evidence we have so far?',
        assistantResponse: `I've evaluated the current evidence and here's my assessment:

**Evidence Strength Analysis:**

**Strong Evidence (Highly Credible):**

1. **Email Documentation**
   - 12 emails showing inappropriate communication
   - Timestamps corroborate complainant's timeline
   - Clear policy language violations
   - Strength: Very Strong

2. **Witness Statement - Jennifer Adams**
   - Direct observation of key incident
   - Detailed, consistent account
   - No apparent bias or motive to fabricate
   - Strength: Strong

**Moderate Evidence (Requires Corroboration):**

3. **Witness Statement - Robert Torres**
   - Second-hand knowledge of some events
   - Generally consistent with other accounts
   - Some timeline discrepancies to clarify
   - Strength: Moderate

4. **Performance Data**
   - Shows pattern but doesn't prove causation
   - Useful for establishing context
   - Strength: Moderate (circumstantial)

**Gaps to Address:**

- No direct evidence of specific incident on January 17
- Subject's perspective not yet documented
- Access log analysis incomplete
- One key witness unavailable

**Overall Assessment:**
Current evidence is sufficient to support a preliminary finding but would benefit from additional corroboration. The subject interview will be critical for final determination.

**Recommendation:** Proceed with subject interview while continuing to gather additional documentation. Evidence is trending toward substantiation.`,
        inputTokens: 90,
        outputTokens: 435,
      },
    ],
    // Template 3: Interview preparation
    [
      {
        userPrompt: 'Help me prepare questions for the witness interviews tomorrow.',
        assistantResponse: `Here are tailored interview questions for tomorrow's witnesses:

**Witness #1: Maria Santos (Team Lead)**
*Context: Direct supervisor, present during team meeting incident*

**Opening Questions:**
- How long have you worked with both the complainant and subject?
- Describe the typical team dynamics before these events

**Incident-Specific Questions:**
- Walk me through the January 18th team meeting
- What specifically did you observe or hear?
- How did others in the room react?
- Did you have any conversations about this afterward?

**Pattern Questions:**
- Have you noticed any similar behavior before this incident?
- How would you describe the subject's management style?
- Have other team members raised concerns with you?

---

**Witness #2: David Park (IT Administrator)**
*Context: Has access to email and system logs*

**Technical Evidence Questions:**
- What systems do you have access to for this investigation?
- Can you walk me through the email retention policies?
- Were there any unusual access patterns you noticed?

**Observation Questions:**
- You work on the same floor - any relevant observations?
- Have you heard any discussions about these matters?
- Is there any additional data that might be relevant?

---

**General Tips for Both Interviews:**
- Start with rapport-building
- Use open-ended questions first
- Follow up on specific details
- Ask "What else should I know?"
- Document any reluctance to answer

**Estimated Duration:** 45-60 minutes each`,
        inputTokens: 80,
        outputTokens: 465,
      },
    ],
  ],
};

// Policy Drafting Assistance Conversations (10)
const POLICY_DRAFTING_TEMPLATES: ConversationTemplate = {
  type: 'policy',
  entityType: 'policy',
  agentType: 'compliance-manager',
  titleTemplates: [
    'Policy Draft Review',
    'Anti-Retaliation Policy Help',
    'Policy Language Suggestions',
    'Compliance Policy Update',
    'Policy Gap Analysis',
  ],
  exchanges: [
    // Template 1: Draft assistance
    [
      {
        userPrompt: 'Help me draft an anti-retaliation policy section.',
        assistantResponse: `I'll help you draft a comprehensive anti-retaliation policy section. Here's a suggested framework:

---

## Anti-Retaliation Policy

### Policy Statement

Acme Corporation strictly prohibits retaliation against any employee who, in good faith:
- Reports suspected violations of law, regulation, or company policy
- Participates in an investigation or compliance review
- Refuses to participate in activities they reasonably believe to be illegal or unethical
- Exercises rights protected under applicable whistleblower laws

### Definition of Retaliation

Retaliation includes any adverse action taken against an individual because of their protected activity, including but not limited to:

- Termination, demotion, or suspension
- Reduction in compensation, benefits, or work hours
- Negative performance evaluations not based on actual performance
- Denial of promotion or training opportunities
- Exclusion from meetings or work activities
- Threats, intimidation, or harassment
- Any other action that would discourage a reasonable person from reporting concerns

### Protected Reporting Channels

Employees may report concerns through any of the following without fear of retaliation:
- Direct supervisor or management chain
- Human Resources department
- Legal or Compliance departments
- Ethics Hotline (anonymous reporting available)
- External regulatory agencies when appropriate

### Investigation of Retaliation Claims

All claims of retaliation will be:
- Taken seriously and investigated promptly
- Handled with appropriate confidentiality
- Investigated by personnel independent from the original report

### Consequences

Any employee found to have engaged in retaliation will be subject to disciplinary action, up to and including termination of employment.

---

Would you like me to adjust the tone, add specific provisions, or modify any sections?`,
        inputTokens: 75,
        outputTokens: 510,
      },
      {
        userPrompt: 'Can you make the language more accessible for a global audience?',
        assistantResponse: `Absolutely. Here's the revised version with clearer, more globally accessible language:

---

## Protection from Retaliation

### Our Commitment

We protect employees who speak up. If you report a concern in good faith, we will not allow anyone to treat you unfairly because you spoke up.

### What is Retaliation?

Retaliation means punishing someone for reporting a problem or helping with an investigation. This includes:

**Employment Actions:**
- Firing, demoting, or suspending you
- Cutting your pay or benefits
- Reducing your work hours
- Giving you unfair performance reviews

**Workplace Treatment:**
- Excluding you from meetings or projects
- Moving you to a less desirable position
- Threatening or intimidating you
- Making your work environment hostile

### When Are You Protected?

You are protected when you:
- Report something you believe is wrong
- Help with a company investigation
- Refuse to do something you believe is illegal
- Contact a government agency about a concern

**Important:** You are protected even if your concern turns out to be incorrect, as long as you reported it honestly.

### How to Report Concerns

You can report concerns through:
- Your manager or their manager
- Human Resources
- The Compliance team
- Our Ethics Hotline (you can report anonymously)
- Government agencies

### What Happens If You Experience Retaliation?

- Report it immediately to HR or Compliance
- We will investigate your claim promptly
- Someone independent will handle the investigation
- We will take action to stop the retaliation

### Consequences for Retaliation

Anyone who retaliates against an employee will face serious consequences, including possible termination.

---

This version uses shorter sentences, common words, and clear structure for easier translation and comprehension across cultures.`,
        inputTokens: 95,
        outputTokens: 530,
      },
    ],
    // Template 2: Policy review
    [
      {
        userPrompt: 'Review this policy section and suggest improvements.',
        assistantResponse: `I've reviewed the policy section you've shared. Here's my analysis and recommendations:

**Current Strengths:**
- Clear statement of prohibited conduct
- Reasonable scope definition
- Appropriate consequence framework

**Areas for Improvement:**

**1. Clarity Issues**
*Current:* "Employees shall not engage in conduct unbecoming of a company representative."
*Issue:* Vague and subjective - what does "unbecoming" mean?
*Suggested:* "Employees must conduct themselves professionally and in accordance with company values when representing Acme Corporation."

**2. Missing Definitions**
The following terms should be defined:
- "Business hours" - clarify time zones for global employees
- "Company property" - include digital assets and data
- "Supervisor approval" - specify required level

**3. Procedural Gaps**
- No timeline specified for reporting violations
- Unclear escalation path if supervisor is involved
- Missing guidance for cross-border situations

**4. Legal Compliance**
Consider adding:
- Reference to local law variations
- Data privacy considerations (GDPR compliance)
- Whistleblower protection statement

**5. Formatting Suggestions**
- Add numbered sections for easy reference
- Include a quick-reference summary
- Add effective date and version number

**Priority Recommendations:**
1. Define "unbecoming conduct" (High)
2. Add reporting timeline (Medium)
3. Include cross-border guidance (Medium)
4. Add privacy compliance note (Low)

Would you like me to draft revised language for any of these sections?`,
        inputTokens: 140,
        outputTokens: 470,
      },
    ],
    // Template 3: Policy comparison
    [
      {
        userPrompt: 'How does our current policy compare to industry best practices?',
        assistantResponse: `I've compared your current policy against industry best practices and regulatory guidance. Here's my analysis:

**Compliance Scorecard:**

| Area | Your Policy | Best Practice | Gap |
|------|-------------|---------------|-----|
| Scope Definition | 85% | 95% | Minor |
| Prohibited Conduct | 90% | 90% | None |
| Reporting Channels | 70% | 95% | Significant |
| Investigation Process | 75% | 90% | Moderate |
| Non-Retaliation | 80% | 95% | Moderate |
| Global Applicability | 60% | 85% | Significant |

**Key Gaps Identified:**

**1. Reporting Channels (Priority: High)**
*Best Practice:* Multiple anonymous options, 24/7 availability, multilingual support
*Your Policy:* Single hotline mentioned, no multilingual reference
*Recommendation:* Add web portal, mobile app, and language support information

**2. Global Applicability (Priority: High)**
*Best Practice:* Explicit local law compliance statement, regional adaptations
*Your Policy:* US-centric language, no international considerations
*Recommendation:* Add clause addressing local law variations and GDPR

**3. Non-Retaliation (Priority: Medium)**
*Best Practice:* Specific examples, protection timeline, monitoring commitment
*Your Policy:* General statement only
*Recommendation:* Expand with specific protections and examples

**4. Investigation Process (Priority: Medium)**
*Best Practice:* Timeline commitments, independence requirements, appeal process
*Your Policy:* General commitment only
*Recommendation:* Add specific timelines and procedural safeguards

**Benchmark Comparison:**
- Fortune 500 Average: 88%
- Your Current Score: 77%
- Target Score: 90%+

**Next Steps:**
1. Address high-priority gaps (reporting channels, global applicability)
2. Schedule policy review committee meeting
3. Engage Legal for international compliance review`,
        inputTokens: 85,
        outputTokens: 560,
      },
    ],
  ],
};

// Disclosure Review Conversations (8)
const DISCLOSURE_REVIEW_TEMPLATES: ConversationTemplate = {
  type: 'disclosure',
  entityType: 'case',
  agentType: 'compliance-manager',
  titleTemplates: [
    'COI Disclosure Review',
    'Gift Threshold Analysis',
    'Disclosure Escalation Check',
    'Conflict Assessment',
    'Disclosure Recommendation',
  ],
  exchanges: [
    // Template 1: Escalation recommendation
    [
      {
        userPrompt: 'Does this COI disclosure require escalation?',
        assistantResponse: `Based on my analysis of the disclosure, I recommend **escalation** for the following reasons:

**Disclosure Summary:**
- Employee: Regional Sales Manager
- Disclosed Interest: 15% ownership stake in TechVendor Solutions
- Relationship: TechVendor is under consideration for Q2 procurement contract

**Escalation Triggers Identified:**

**1. Financial Interest Exceeds Threshold**
- Disclosed: $45,000 estimated value
- Company Threshold: $10,000
- Status: **Exceeds by 350%**

**2. Direct Business Relationship**
- TechVendor is actively bidding on Acme contract
- Employee has influence over vendor selection process
- Creates direct conflict with fiduciary duties

**3. Decision-Making Authority**
- Employee sits on procurement review committee
- Has voting rights on vendor selection
- Involvement would compromise process integrity

**Risk Assessment: HIGH**

**Recommended Actions:**

1. **Immediate Recusal**
   - Remove employee from all TechVendor-related decisions
   - Document recusal in procurement files
   - Notify procurement committee chair

2. **Conflict Mitigation**
   - Reassign vendor relationship management
   - Establish information barrier for bid information
   - Consider temporary reporting structure change

3. **Monitoring**
   - Quarterly review of relationship status
   - Annual re-disclosure requirement
   - Audit trail of vendor interactions

4. **Documentation**
   - Record conflict management plan
   - Obtain employee acknowledgment
   - File with Compliance records

**Escalation Path:** This should go to the Chief Compliance Officer for approval given the dollar amount and direct business relationship.

Would you like me to draft the recusal memo or conflict management plan?`,
        inputTokens: 95,
        outputTokens: 520,
      },
    ],
    // Template 2: Gift analysis
    [
      {
        userPrompt: 'Is this gift acceptable under our policy?',
        assistantResponse: `I've analyzed the gift against our Gifts and Entertainment Policy. Here's my assessment:

**Gift Details:**
- Item: Premium golf outing (green fees, cart, meals)
- Estimated Value: $325
- Source: Vendor representative (CloudTech Inc.)
- Recipient: IT Director
- Timing: During active contract renewal

**Policy Analysis:**

**Threshold Check:**
| Category | Limit | This Gift | Status |
|----------|-------|-----------|--------|
| General Vendor Gift | $100 | $325 | **EXCEEDS** |
| Entertainment | $150 | $325 | **EXCEEDS** |
| Annual Cumulative | $500 | $325* | Check Required |

*Need to verify YTD gifts from this vendor

**Red Flags Identified:**

1. **Value Exceeds Policy Limit**
   - Gift value ($325) exceeds entertainment threshold ($150)
   - Would require VP-level approval per policy

2. **Active Business Relationship**
   - Contract renewal in progress
   - Recipient has decision-making authority
   - Creates appearance of improper influence

3. **Timing Concerns**
   - Gift offered during contract negotiation period
   - Could be perceived as attempt to influence outcome

**Recommendation: DECLINE**

The gift should be **declined** for the following reasons:
- Exceeds monetary threshold significantly
- Timing creates appearance of improper influence
- Recipient has direct authority over vendor relationship

**Alternative Options:**

1. **Decline with explanation**
   - Thank vendor, cite company policy
   - Suggest future opportunity after contract finalized

2. **Modify to comply**
   - Accept only if value reduced to <$100
   - Split cost (employee pays difference)

3. **Escalate for exception**
   - Requires written justification
   - CCO approval needed
   - Not recommended given timing

**Sample Decline Language:**
"Thank you for the invitation. Our company policy limits vendor entertainment during active contract discussions. I'd be happy to consider a similar invitation after our renewal is finalized."`,
        inputTokens: 110,
        outputTokens: 570,
      },
    ],
    // Template 3: Disclosure completeness
    [
      {
        userPrompt: 'Is this disclosure complete or do I need more information?',
        assistantResponse: `I've reviewed the disclosure form submission for completeness. Here's my assessment:

**Submission Status: INCOMPLETE**

**Completed Fields:**
- Employee name and department
- Type of interest disclosed
- General description of relationship
- Start date of relationship

**Missing Required Information:**

**1. Financial Details (Required)**
- Ownership percentage: Not specified
- Estimated dollar value: Not specified
- Compensation received: Not specified
- These fields are required for any financial interest disclosure

**2. Entity Information (Required)**
- Legal name of outside entity: Partially complete
- Entity business description: Missing
- Entity location/jurisdiction: Missing

**3. Acme Business Relationship (Required)**
- Current vendor/customer status: Not answered
- Pending business relationship: Not answered
- Employee's involvement: Not specified

**4. Family Member Information (Conditional)**
- Form indicates family member involvement
- Relationship type not specified
- Family member's role at entity not described

**Questions to Request:**

1. "Please provide the estimated value of your financial interest in [Entity Name]."

2. "Does [Entity Name] currently have, or is it seeking, any business relationship with Acme Corporation?"

3. "Please describe the nature of the family member's involvement and their relationship to you."

4. "Do you have any decision-making authority over matters involving [Entity Name]?"

**Recommended Action:**
Return disclosure to employee with specific questions. Set 5 business day deadline for completion.

**Draft Follow-up Message:**
"Thank you for submitting your disclosure. To complete our review, please provide additional information in the following areas: [list above]. Please respond within 5 business days."

Would you like me to draft the complete follow-up communication?`,
        inputTokens: 85,
        outputTokens: 510,
      },
    ],
  ],
};

// Analytics Questions Conversations (7)
const ANALYTICS_TEMPLATES: ConversationTemplate = {
  type: 'analytics',
  entityType: null,
  agentType: 'compliance-manager',
  titleTemplates: [
    'Trending Categories Analysis',
    'Quarterly Metrics Review',
    'Case Volume Trends',
    'SLA Performance Check',
    'Regional Comparison',
  ],
  exchanges: [
    // Template 1: Trending categories
    [
      {
        userPrompt: 'What are the trending case categories this quarter?',
        assistantResponse: `I've analyzed the case data for this quarter. Here are the trending categories:

**Q1 2026 Category Trends**

**Top 5 Categories by Volume:**

| Rank | Category | Count | % of Total | Trend vs Q4 |
|------|----------|-------|------------|-------------|
| 1 | Harassment | 47 | 22% | +15% |
| 2 | Policy Violation | 38 | 18% | +3% |
| 3 | Conflict of Interest | 31 | 15% | +8% |
| 4 | Fraud | 28 | 13% | -5% |
| 5 | Discrimination | 24 | 11% | +2% |

**Notable Trends:**

**1. Harassment (+15%)**
This is the most significant increase this quarter.
- 60% of cases from Healthcare division
- Majority involve supervisor-subordinate relationships
- Recommend targeted training initiative

**2. Conflict of Interest (+8%)**
Uptick likely related to annual disclosure cycle.
- Vendor relationships most common type
- Technology and Retail divisions leading
- Consider enhanced disclosure reminders

**3. Fraud (-5%)**
Slight decrease is positive but monitor closely.
- Expense reimbursement still #1 fraud type
- New expense system may be deterring abuse
- Continue current controls

**Regional Distribution:**
- US: 58% of cases (stable)
- EMEA: 27% of cases (+4%)
- APAC: 15% of cases (-2%)

**Recommendations:**
1. Launch harassment prevention training in Healthcare
2. Review vendor management processes in Technology
3. Investigate EMEA increase with regional compliance lead

**Comparison to Industry Benchmarks:**
Your harassment rate (22%) is slightly above industry average (18%). Other categories are within normal ranges.

Would you like me to drill down into any specific category or region?`,
        inputTokens: 70,
        outputTokens: 520,
      },
    ],
    // Template 2: SLA performance
    [
      {
        userPrompt: 'How are we performing against our SLA targets?',
        assistantResponse: `Here's a comprehensive SLA performance analysis:

**Overall SLA Performance: 87%** (Target: 90%)

**SLA Breakdown by Metric:**

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Initial Response | 24 hrs | 18 hrs | **MET** |
| Case Assignment | 48 hrs | 42 hrs | **MET** |
| Investigation Start | 5 days | 5.2 days | **NEAR MISS** |
| Case Resolution | 30 days | 34 days | **MISSED** |
| Substantiation Rate | N/A | 62% | Benchmark |

**Resolution Time Analysis:**

**On-Time Closures: 82%**
- Simple cases (2-4 days): 94% on-time
- Standard cases (5-20 days): 88% on-time
- Complex cases (21-60 days): 71% on-time
- Extended cases (60+ days): 58% on-time

**Root Causes for Delays:**

1. **Witness Availability (38% of delays)**
   - Witnesses on leave or traveling
   - Scheduling conflicts
   - Recommendation: Earlier witness identification

2. **Document Collection (29% of delays)**
   - IT request backlog
   - Cross-department coordination
   - Recommendation: Expedited process for investigations

3. **Subject Interview Delays (22% of delays)**
   - Subject on leave
   - Legal representation requests
   - Recommendation: Earlier subject notification

4. **Complex Fact Patterns (11% of delays)**
   - Multiple allegations
   - International components
   - Appropriate extensions - monitor only

**Improvement Actions:**

**Quick Wins:**
- Pre-schedule witness interviews within 48 hours of assignment
- Establish priority queue with IT for investigation requests
- Create subject notification template for faster processing

**Long-term:**
- Review complex case staffing model
- Consider investigation capacity planning
- Evaluate case complexity scoring for SLA adjustment

**Trend:** SLA performance has improved 3% from last quarter but remains below target. Current trajectory projects reaching 90% target in Q3.`,
        inputTokens: 75,
        outputTokens: 580,
      },
    ],
    // Template 3: Quick stats
    [
      {
        userPrompt: 'Give me a quick overview of our current case metrics.',
        assistantResponse: `Here's your quick metrics dashboard:

**Current Case Snapshot**

**Open Cases: 127**
- New (unassigned): 12
- In Triage: 18
- Under Investigation: 74
- Pending Review: 23

**SLA Status:**
- On Track: 89 (70%)
- Warning (<7 days): 24 (19%)
- Overdue: 14 (11%)

**This Week's Activity:**
- Cases Opened: 23
- Cases Closed: 28
- Net Change: -5 (backlog decreasing)

**Resolution Metrics (Last 30 Days):**
- Cases Closed: 112
- Average Resolution: 22 days
- Substantiation Rate: 61%

**By Priority:**
| Priority | Open | Avg Age |
|----------|------|---------|
| Critical | 3 | 8 days |
| High | 18 | 14 days |
| Medium | 52 | 19 days |
| Low | 54 | 24 days |

**Team Workload:**
- Average cases per investigator: 12
- Highest workload: J. Martinez (18 cases)
- Available capacity: 2 investigators below target

**Key Alerts:**
- 3 critical cases require immediate attention
- 14 cases overdue (action needed)
- 1 investigator on leave next week

**Quick Actions Recommended:**
1. Reassign 2 cases from Martinez
2. Escalate 3 critical cases for daily review
3. Address 14 overdue cases today

Need more detail on any metric?`,
        inputTokens: 65,
        outputTokens: 450,
      },
    ],
  ],
};

// ============================================
// Seeder Functions
// ============================================

interface SeededConversationData {
  id: string;
  userId: string;
  entityType: string | null;
  entityId: string | null;
  title: string;
  status: AiConversationStatus;
  agentType: string;
  createdAt: Date;
  messages: Array<{
    role: string;
    content: string;
    inputTokens: number;
    outputTokens: number;
    createdAt: Date;
  }>;
}

/**
 * Generate conversations from a template
 */
function generateConversations(
  template: ConversationTemplate,
  count: number,
  entityIds: string[],
  userIds: string[],
  startingConversationIndex: number,
): SeededConversationData[] {
  const conversations: SeededConversationData[] = [];

  for (let i = 0; i < count; i++) {
    const conversationIndex = startingConversationIndex + i;

    // Select an exchange template
    const exchangeTemplate = template.exchanges[i % template.exchanges.length];

    // Select a title
    const title = template.titleTemplates[i % template.titleTemplates.length];

    // Select user and entity
    const userId = userIds[conversationIndex % userIds.length];
    const entityId = template.entityType && entityIds.length > 0
      ? entityIds[conversationIndex % entityIds.length]
      : null;

    // Determine status based on age (older conversations more likely archived)
    const daysAgo = randomInt(1, 30);
    let status: AiConversationStatus = AiConversationStatus.ACTIVE;
    if (daysAgo > 25) {
      status = chance(0.7) ? AiConversationStatus.ARCHIVED : AiConversationStatus.PAUSED;
    } else if (daysAgo > 15) {
      status = chance(0.3) ? AiConversationStatus.PAUSED : AiConversationStatus.ACTIVE;
    }

    // Calculate timestamps
    const createdAt = subDays(DEMO_CURRENT_DATE, daysAgo);

    // Generate messages with realistic timing
    const messages: SeededConversationData['messages'] = [];
    let messageTime = createdAt;

    for (const exchange of exchangeTemplate) {
      // User message
      messages.push({
        role: 'user',
        content: exchange.userPrompt,
        inputTokens: exchange.inputTokens,
        outputTokens: 0,
        createdAt: messageTime,
      });

      // Small delay for AI response (30 seconds to 2 minutes)
      messageTime = addMinutes(messageTime, randomInt(1, 3));

      // Assistant message
      messages.push({
        role: 'assistant',
        content: exchange.assistantResponse,
        inputTokens: 0,
        outputTokens: exchange.outputTokens,
        createdAt: messageTime,
      });

      // Delay before next exchange (5-30 minutes)
      messageTime = addMinutes(messageTime, randomInt(5, 30));
    }

    conversations.push({
      id: faker.string.uuid(),
      userId,
      entityType: template.entityType,
      entityId,
      title,
      status,
      agentType: template.agentType,
      createdAt,
      messages,
    });
  }

  return conversations;
}

/**
 * Seed AI Conversations for a demo tenant
 *
 * @param prisma - Prisma client instance
 * @param organizationId - Organization ID
 * @param cases - Array of case records for linking
 * @param investigations - Array of investigation records for linking
 * @param policies - Array of policy records for linking
 * @param userIds - Array of demo user IDs
 */
export async function seedAIConversations(
  prisma: PrismaClient,
  organizationId: string,
  cases: Array<{ id: string }>,
  investigations: Array<{ id: string }>,
  policies: Array<{ id: string }>,
  userIds: string[],
): Promise<{ conversationCount: number; messageCount: number }> {
  // Initialize faker with deterministic seed
  faker.seed(SEED_CONFIG.masterSeed + SEED_OFFSET);

  console.log('  Seeding AI conversations...');

  // Get entity IDs for linking
  const caseIds = cases.map(c => c.id);
  const investigationIds = investigations.map(i => i.id);
  const policyIds = policies.map(p => p.id);

  // Generate all conversations
  const allConversations: SeededConversationData[] = [];
  let conversationIndex = 0;

  // Case Summarization (15)
  const caseSumConvos = generateConversations(
    CASE_SUMMARIZATION_TEMPLATES,
    15,
    caseIds,
    userIds,
    conversationIndex,
  );
  allConversations.push(...caseSumConvos);
  conversationIndex += 15;

  // Investigation Guidance (10)
  const invGuidanceConvos = generateConversations(
    INVESTIGATION_GUIDANCE_TEMPLATES,
    10,
    investigationIds,
    userIds,
    conversationIndex,
  );
  allConversations.push(...invGuidanceConvos);
  conversationIndex += 10;

  // Policy Drafting (10)
  const policyConvos = generateConversations(
    POLICY_DRAFTING_TEMPLATES,
    10,
    policyIds,
    userIds,
    conversationIndex,
  );
  allConversations.push(...policyConvos);
  conversationIndex += 10;

  // Disclosure Review (8)
  const disclosureConvos = generateConversations(
    DISCLOSURE_REVIEW_TEMPLATES,
    8,
    caseIds,
    userIds,
    conversationIndex,
  );
  allConversations.push(...disclosureConvos);
  conversationIndex += 8;

  // Analytics Questions (7)
  const analyticsConvos = generateConversations(
    ANALYTICS_TEMPLATES,
    7,
    [], // No entity link for analytics
    userIds,
    conversationIndex,
  );
  allConversations.push(...analyticsConvos);

  // Calculate totals for token tracking
  let totalMessageCount = 0;

  // Insert conversations in batches
  for (let i = 0; i < allConversations.length; i += BATCH_SIZE) {
    const batch = allConversations.slice(i, i + BATCH_SIZE);

    for (const convo of batch) {
      // Calculate total tokens
      const totalInputTokens = convo.messages.reduce((sum, m) => sum + m.inputTokens, 0);
      const totalOutputTokens = convo.messages.reduce((sum, m) => sum + m.outputTokens, 0);
      const lastMessageAt = convo.messages[convo.messages.length - 1]?.createdAt || convo.createdAt;

      // Create conversation
      const conversation = await prisma.aiConversation.create({
        data: {
          id: convo.id,
          organizationId,
          userId: convo.userId,
          entityType: convo.entityType,
          entityId: convo.entityId,
          title: convo.title,
          status: convo.status,
          agentType: convo.agentType,
          createdAt: convo.createdAt,
          updatedAt: lastMessageAt,
          lastMessageAt,
          totalInputTokens,
          totalOutputTokens,
          pausedAt: convo.status === AiConversationStatus.PAUSED ? subHours(lastMessageAt, randomInt(1, 24)) : null,
          archivedAt: convo.status === AiConversationStatus.ARCHIVED ? subHours(lastMessageAt, randomInt(1, 48)) : null,
        },
      });

      // Create messages
      for (const msg of convo.messages) {
        await prisma.aiMessage.create({
          data: {
            conversationId: conversation.id,
            organizationId,
            role: msg.role,
            content: msg.content,
            inputTokens: msg.inputTokens > 0 ? msg.inputTokens : null,
            outputTokens: msg.outputTokens > 0 ? msg.outputTokens : null,
            model: msg.role === 'assistant' ? AI_MODEL : null,
            createdAt: msg.createdAt,
          },
        });
        totalMessageCount++;
      }
    }
  }

  console.log(`  Created ${allConversations.length} AI conversations with ${totalMessageCount} messages`);
  console.log(`    - Case Summarization: 15`);
  console.log(`    - Investigation Guidance: 10`);
  console.log(`    - Policy Drafting: 10`);
  console.log(`    - Disclosure Review: 8`);
  console.log(`    - Analytics Questions: 7`);

  return {
    conversationCount: allConversations.length,
    messageCount: totalMessageCount,
  };
}

/**
 * Standalone execution entry point
 */
async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    // Get test organization
    const organization = await prisma.organization.findUnique({
      where: { slug: 'acme-corp' },
    });

    if (!organization) {
      console.error('Acme Corp organization not found. Run main seed first.');
      process.exit(1);
    }

    // Get users
    const users = await prisma.user.findMany({
      where: { organizationId: organization.id },
      select: { id: true },
    });

    if (users.length === 0) {
      console.error('No users found. Run main seed first.');
      process.exit(1);
    }

    // Get cases
    const cases = await prisma.case.findMany({
      where: { organizationId: organization.id },
      select: { id: true },
      take: 50,
    });

    // Get investigations
    const investigations = await prisma.investigation.findMany({
      where: { organizationId: organization.id },
      select: { id: true },
      take: 50,
    });

    // Get policies
    const policies = await prisma.policy.findMany({
      where: { organizationId: organization.id },
      select: { id: true },
      take: 50,
    });

    const result = await seedAIConversations(
      prisma,
      organization.id,
      cases,
      investigations,
      policies,
      users.map(u => u.id),
    );

    console.log(`\nSeeding complete:`);
    console.log(`  Conversations: ${result.conversationCount}`);
    console.log(`  Messages: ${result.messageCount}`);
  } catch (error) {
    console.error('Error seeding AI conversations:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
