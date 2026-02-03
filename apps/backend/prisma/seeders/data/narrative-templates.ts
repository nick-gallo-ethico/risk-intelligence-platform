/**
 * AI-Quality Narrative Templates for Demo RIUs
 *
 * These are NOT lorem ipsum. They read like real compliance reports
 * with realistic language, specific details, and believable scenarios.
 *
 * Each category has:
 * - Category-specific anonymity rate
 * - Multiple template variations
 * - Placeholder tokens for dynamic content
 */

import { faker } from '@faker-js/faker';
import { pickRandom, randomInt, chance } from '../utils';

/**
 * Narrative template structure
 */
export interface NarrativeTemplate {
  /** Opening statement setting the tone */
  opener: string;
  /** Main body with {placeholders} for dynamic content */
  body: string;
  /** Optional additional details */
  details?: string[];
}

/**
 * Category narrative configuration
 */
export interface CategoryNarrativeConfig {
  /** Category-specific anonymity rate (0-1) */
  anonymityRate: number;
  /** Narrative templates for this category */
  templates: NarrativeTemplate[];
}

/**
 * Narrative templates by category
 * Anonymity rates based on CONTEXT.md requirements
 */
export const NARRATIVE_TEMPLATES: Record<string, CategoryNarrativeConfig> = {
  // ============================================
  // HARASSMENT (55% anonymous - sensitive topic)
  // ============================================
  harassment: {
    anonymityRate: 0.55,
    templates: [
      {
        opener: "I've been hesitant to come forward, but the situation has become unbearable.",
        body: 'For the past {duration}, {subject_role} has been making comments about my {attribute}. It started with what seemed like jokes, but has escalated to {specific_behavior}. Other team members have witnessed this, including on {date_reference}.',
        details: [
          'appearance during team meetings',
          'personal life choices in front of clients',
          'background in ways that made me uncomfortable',
          'work performance in a demeaning way',
        ],
      },
      {
        opener: 'I am reporting behavior that I believe constitutes workplace harassment.',
        body: 'On {date_reference}, {subject_role} made repeated unwelcome comments about {topic}. When I asked them to stop, they responded by {response}. This is not the first time - similar incidents occurred on {previous_dates}.',
        details: [
          'my personal relationships',
          'my physical appearance',
          'my cultural background',
          'my religious practices',
        ],
      },
      {
        opener: 'I need to report ongoing inappropriate behavior from a colleague.',
        body: '{subject_role} has been {behavior_type} for approximately {duration}. Specific instances include: {instance_1}, {instance_2}, and most recently {instance_3}. I have documentation of {evidence_type}.',
        details: [
          'sending inappropriate messages',
          'making unwanted physical contact',
          'making sexually suggestive comments',
          'creating a hostile atmosphere in meetings',
        ],
      },
      {
        opener: 'I am writing to formally report harassment in my department.',
        body: 'The behavior I am reporting involves {subject_role} consistently {behavior_description}. This has been happening since {start_date} and affects not just me but several colleagues. We have tried addressing this informally but the behavior continues.',
      },
      {
        opener: 'I witnessed what I believe to be harassment of a coworker.',
        body: 'On {date_reference}, I observed {subject_role} {witnessed_behavior} toward {victim_description}. The affected person appeared {victim_reaction}. I felt obligated to report this as it clearly violated company policy.',
      },
    ],
  },

  // ============================================
  // RETALIATION (70% anonymous - fear of reprisal)
  // ============================================
  retaliation: {
    anonymityRate: 0.7,
    templates: [
      {
        opener: 'I believe I am being retaliated against for my previous report.',
        body: 'Since I reported {original_issue} on {original_date}, I have experienced {retaliation_actions}. My performance reviews went from {old_rating} to {new_rating} despite no change in my work quality. Additionally, {additional_retaliation}.',
      },
      {
        opener: 'I need to report what I believe is retaliation for participating in an investigation.',
        body: 'After I provided information in the {investigation_type} investigation, {subject_role} has {retaliation_behavior}. I was told this would be confidential, but it appears {subject_role} knows I participated because {evidence}.',
      },
      {
        opener: 'I am filing this report because I fear I am being punished for speaking up.',
        body: 'Ever since I raised concerns about {original_concern} to HR on {date_reference}, I have been {consequences}. My {work_aspect} has been negatively impacted, and I have been {exclusion_behavior}.',
      },
      {
        opener: 'This is a follow-up to my previous report - the situation has gotten worse.',
        body: "After filing my initial complaint (case reference {case_number}), I've been subjected to {retaliation_list}. {subject_role} made it clear through {communication_method} that there would be consequences for reporting.",
      },
    ],
  },

  // ============================================
  // DISCRIMINATION (50% anonymous)
  // ============================================
  discrimination: {
    anonymityRate: 0.5,
    templates: [
      {
        opener: 'I believe I have been discriminated against based on my {protected_characteristic}.',
        body: 'Despite having {qualifications}, I was passed over for {opportunity} in favor of {comparison_description}. When I asked for feedback, {subject_role} told me {discriminatory_statement}. This is part of a pattern.',
      },
      {
        opener: 'I am reporting systemic discrimination in the {department} department.',
        body: 'Over the past {duration}, I have observed that employees who are {characteristic_group} are consistently {discriminatory_treatment}. Specifically, {example_1}, {example_2}, and {example_3}.',
      },
      {
        opener: 'I need to report what I believe is discriminatory hiring practices.',
        body: 'As someone involved in the hiring process for {team}, I have witnessed {subject_role} repeatedly {discriminatory_hiring_behavior}. Qualified candidates who are {affected_group} are systematically {treatment}.',
      },
      {
        opener: 'I am filing this complaint because of discriminatory comments made about my {characteristic}.',
        body: 'On {date_reference}, during {context}, {subject_role} made comments about my {characteristic} including {quote_1}. This made me feel {reaction} and I believe it affects how I am treated professionally.',
      },
    ],
  },

  // ============================================
  // FINANCIAL MISCONDUCT (35% anonymous)
  // ============================================
  financial_misconduct: {
    anonymityRate: 0.35,
    templates: [
      {
        opener: 'I have documentation that suggests improper financial practices.',
        body: 'While reviewing {document_type} for {time_period}, I noticed {discrepancy}. The amounts involved appear to be approximately {amount_range}. I have copies of {evidence_type} that support my concerns.',
      },
      {
        opener: 'I need to report suspicious financial activity I discovered in my role.',
        body: 'As {reporter_role}, I have access to {data_type}. I found that {subject_role} has been {financial_misconduct} totaling approximately {amount}. This appears to have been happening since {start_date}.',
      },
      {
        opener: 'I am reporting what I believe is expense fraud.',
        body: '{subject_role} has been submitting {expense_type} that I know to be {fraud_description}. For example, on {date_reference}, they claimed {claimed_expense} but I was present and know {actual_situation}.',
      },
      {
        opener: 'I have concerns about the integrity of financial records in our department.',
        body: 'I have noticed {irregularity} in our {record_type}. Specifically, {detail_1}, {detail_2}. The discrepancy amounts to {amount} over {time_period}. I believe {subject_role} may be responsible.',
      },
      {
        opener: 'I discovered what appears to be fraudulent vendor billing.',
        body: 'While processing invoices, I found that {vendor_name} invoices approved by {subject_role} show {irregularity}. The vendor address matches {suspicious_detail}. Total questionable payments: {amount}.',
      },
    ],
  },

  // ============================================
  // SAFETY VIOLATIONS (30% anonymous - people want action)
  // ============================================
  safety: {
    anonymityRate: 0.3,
    templates: [
      {
        opener: 'This is a safety concern that needs immediate attention.',
        body: 'On {date_reference}, I observed {safety_issue} in {location}. This violates {regulation_reference}. {consequence_statement}. I have photos/documentation from {evidence_date}.',
      },
      {
        opener: 'I am reporting a serious safety violation at our {facility_type}.',
        body: '{subject_role} has been requiring employees to {unsafe_practice}. This is happening in {location} and affects approximately {affected_count} workers. I have witnessed {specific_incident} on {date_reference}.',
      },
      {
        opener: 'There is an ongoing safety hazard that management refuses to address.',
        body: 'I reported {hazard_description} to {manager} on {first_report_date}. Despite my report, nothing has been done. The hazard continues to {ongoing_risk}. Someone could be {potential_injury}.',
      },
      {
        opener: 'I need to report unsafe working conditions in {department}.',
        body: 'Employees are being asked to {unsafe_task} without proper {missing_safety_measure}. On {date_reference}, {near_miss_description}. We have raised concerns but are told to {management_response}.',
      },
      {
        opener: 'I am reporting a safety violation involving {equipment_type}.',
        body: 'The {equipment_type} in {location} has been {equipment_issue}. Despite being reported on {report_date}, it remains in use. OSHA requires {requirement}, but we have {violation}.',
      },
    ],
  },

  // ============================================
  // CONFLICT OF INTEREST (25% anonymous - often self-disclosures)
  // ============================================
  conflict_of_interest: {
    anonymityRate: 0.25,
    templates: [
      {
        opener: 'I am reporting a potential conflict of interest involving myself.',
        body: 'I recently discovered that {relationship_description}. This could create a conflict with my role in {work_context}. I am disclosing this proactively to ensure transparency and seek guidance.',
      },
      {
        opener: 'I need to report a conflict of interest I observed with a colleague.',
        body: '{subject_role} has been {conflicting_activity} while also responsible for {company_responsibility}. I became aware of this when {discovery_method}. This appears to violate {policy_reference}.',
      },
      {
        opener: 'I have concerns about an undisclosed relationship affecting business decisions.',
        body: '{subject_role} has a {relationship_type} with {external_party}. Despite this, they have been {decision_making_role}. Recent decisions including {specific_decisions} appear to favor this relationship.',
      },
      {
        opener: 'I am disclosing an outside business interest that may create a conflict.',
        body: 'I have {business_interest} in {outside_company}. This company {potential_conflict} with my responsibilities at {company}. I am disclosing this as required by policy section {policy_section}.',
      },
    ],
  },

  // ============================================
  // DATA/PRIVACY (40% anonymous)
  // ============================================
  data_privacy: {
    anonymityRate: 0.4,
    templates: [
      {
        opener: 'I am reporting a potential data breach or privacy violation.',
        body: 'On {date_reference}, I discovered that {data_type} was {exposure_method}. Approximately {record_count} records may be affected. I believe this was caused by {cause_description}.',
      },
      {
        opener: 'I need to report unauthorized access to confidential information.',
        body: '{subject_role} accessed {data_type} without proper authorization on {date_reference}. They have no legitimate business need for this data. I discovered this when {discovery_method}.',
      },
      {
        opener: 'I have witnessed improper handling of sensitive data.',
        body: '{subject_role} has been {improper_handling} involving {data_type}. This violates {regulation}. Specific instances include {example_1} and {example_2}.',
      },
      {
        opener: 'I am reporting a HIPAA violation I observed.',
        body: 'On {date_reference}, {subject_role} {hipaa_violation}. This involved PHI for {patient_count} patients. The information included {phi_types}. I reported this to {reported_to} but no action was taken.',
      },
    ],
  },

  // ============================================
  // POLICY VIOLATIONS (35% anonymous)
  // ============================================
  policy_violation: {
    anonymityRate: 0.35,
    templates: [
      {
        opener: 'I am reporting a violation of company policy.',
        body: '{subject_role} has been {policy_violation} in violation of {policy_name}. This has been happening since {start_date}. I have documented {evidence_description}.',
      },
      {
        opener: 'I need to report ongoing policy non-compliance in {department}.',
        body: 'Multiple employees in {department} are {violation_description}. This is being tolerated or encouraged by {manager}. The policy requires {policy_requirement} but we are {actual_practice}.',
      },
      {
        opener: 'I am reporting misuse of company resources.',
        body: '{subject_role} has been using company {resource_type} for {personal_use}. This includes {specific_examples}. I estimate the value at {estimated_value} over {time_period}.',
      },
      {
        opener: 'I need to report a manager who is violating HR policies.',
        body: '{subject_role} has been {hr_violation}. This affects {affected_employees}. Despite complaints from {complaint_source}, the behavior continues. Specific instances: {instance_list}.',
      },
    ],
  },

  // ============================================
  // WORKPLACE VIOLENCE (60% anonymous - fear)
  // ============================================
  workplace_violence: {
    anonymityRate: 0.6,
    templates: [
      {
        opener: 'I am reporting threatening behavior from a coworker.',
        body: 'On {date_reference}, {subject_role} {threatening_behavior}. They said {threat_quote}. I felt {reporter_reaction}. Others witnessed this including {witnesses}.',
      },
      {
        opener: 'I need to report concerning behavior that could escalate to violence.',
        body: '{subject_role} has been displaying {concerning_behavior} over the past {duration}. They have made statements like {concerning_statement}. I am worried about {specific_concern}.',
      },
      {
        opener: 'This is an urgent report about a physical altercation.',
        body: 'On {date_reference} at approximately {time}, {subject_1} and {subject_2} engaged in {altercation_description} in {location}. {injury_status}. Security was {security_response}.',
      },
    ],
  },

  // ============================================
  // THEFT (45% anonymous)
  // ============================================
  theft: {
    anonymityRate: 0.45,
    templates: [
      {
        opener: 'I need to report theft of company property.',
        body: 'I witnessed {subject_role} {theft_description} from {location} on {date_reference}. The items taken included {stolen_items}. Estimated value: {value}.',
      },
      {
        opener: 'I am reporting suspected ongoing theft in {department}.',
        body: 'Over the past {duration}, {items_type} have been disappearing from {location}. I believe {subject_role} is responsible because {evidence_reason}. Total missing items: {item_count}.',
      },
      {
        opener: 'I need to report misappropriation of company assets.',
        body: '{subject_role} has been {misappropriation_method} company {asset_type}. I discovered this when {discovery}. The value involved is approximately {amount}.',
      },
    ],
  },

  // ============================================
  // GIFTS & ENTERTAINMENT (20% anonymous - often disclosures)
  // ============================================
  gifts_entertainment: {
    anonymityRate: 0.2,
    templates: [
      {
        opener: 'I am disclosing a gift I received from a vendor.',
        body: 'On {date_reference}, I received {gift_description} from {vendor_name}. The estimated value is {value}. I am disclosing this as required by our gift policy.',
      },
      {
        opener: 'I need to report a colleague accepting inappropriate gifts.',
        body: '{subject_role} has been accepting {gift_type} from {vendor_name}. This includes {specific_gifts}. Total estimated value: {total_value}. This vendor {business_relationship}.',
      },
      {
        opener: 'I am reporting excessive entertainment spending with vendors.',
        body: '{subject_role} has been {entertainment_activity} with {vendor_name} at company expense. Recent expenses include {expense_examples}. The frequency is {frequency} which seems excessive.',
      },
    ],
  },

  // ============================================
  // RFI (30% anonymous - just questions)
  // ============================================
  rfi: {
    anonymityRate: 0.3,
    templates: [
      {
        opener: 'I have a question about company policy.',
        body: 'I need clarification on {policy_area}. Specifically, {question}. I want to make sure I am following proper procedures for {context}.',
      },
      {
        opener: 'I need guidance on a compliance matter.',
        body: 'In my role as {reporter_role}, I encountered a situation involving {situation}. I am unsure how to proceed given {uncertainty}. Please advise.',
      },
      {
        opener: 'This is a general inquiry about reporting procedures.',
        body: 'I may have information about {potential_issue}. Before filing a formal report, I want to understand {inquiry}. Please contact me at {contact_method}.',
      },
    ],
  },
};

/**
 * Placeholder replacement values for dynamic content
 */
const PLACEHOLDER_VALUES: Record<string, string[] | (() => string)> = {
  duration: ['several weeks', 'the past few months', 'approximately six months', 'over a year'],
  subject_role: [
    'my direct supervisor',
    'a senior manager',
    'a team lead',
    'a department head',
    'a colleague',
    'a member of my team',
    'the project manager',
  ],
  attribute: [
    'appearance',
    'personal life',
    'age',
    'cultural background',
    'gender',
    'family status',
    'disability',
  ],
  specific_behavior: [
    'explicit comments in emails',
    'inappropriate touching',
    'public humiliation',
    'exclusion from meetings',
    'threatening my job security',
    'spreading rumors',
    'blocking my career advancement',
  ],
  date_reference: () =>
    faker.date.recent({ days: 30 }).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    }),
  previous_dates: () => {
    const dates = [
      faker.date.recent({ days: 60 }),
      faker.date.recent({ days: 90 }),
    ];
    return dates
      .map((d) =>
        d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
      )
      .join(' and ');
  },
  topic: [
    'my personal relationships',
    'my body',
    'my ethnicity',
    'my religion',
    'my sexual orientation',
    'my medical condition',
  ],
  response: [
    'laughing and calling me sensitive',
    "saying I couldn't take a joke",
    'increasing the frequency of comments',
    'involving other colleagues',
    'retaliating against me',
  ],
  behavior_type: ['making inappropriate comments', 'creating a hostile environment', 'engaging in bullying behavior'],
  protected_characteristic: ['age', 'gender', 'race', 'national origin', 'disability', 'religion', 'pregnancy status'],
  qualifications: ['15 years of experience', 'excellent performance reviews', 'advanced certifications', 'proven track record'],
  opportunity: ['the promotion', 'the project lead position', 'the training opportunity', 'the salary increase'],
  comparison_description: ['someone with less experience', 'a less qualified candidate', 'someone who just joined'],
  discriminatory_statement: [
    '"you wouldn\'t fit the culture"',
    '"we need someone with more energy"',
    '"clients prefer someone different"',
  ],
  document_type: ['quarterly reports', 'expense reports', 'vendor invoices', 'budget allocations', 'purchase orders'],
  time_period: ['Q3 2025', 'the last six months', 'FY 2025', 'the past year'],
  discrepancy: [
    'duplicate payments',
    'payments to unknown vendors',
    'inflated invoices',
    'missing documentation',
    'unauthorized transfers',
  ],
  amount_range: ['$15,000-$25,000', '$50,000-$100,000', 'over $200,000', 'between $5,000 and $10,000'],
  evidence_type: ['invoices', 'email correspondence', 'bank statements', 'approval records'],
  safety_issue: [
    'exposed electrical wiring',
    'blocked emergency exits',
    'malfunctioning safety equipment',
    'improper chemical storage',
    'missing safety guards on machinery',
  ],
  location: ['the warehouse', 'building B', 'the manufacturing floor', 'the loading dock', 'the laboratory'],
  regulation_reference: ['OSHA standards', 'fire safety codes', 'EPA regulations', 'company safety protocols'],
  consequence_statement: [
    'Someone could be seriously injured',
    'This creates an immediate hazard',
    'A previous incident occurred due to this',
    'We have already had near-misses',
  ],
  data_type: ['customer PII', 'employee records', 'financial data', 'health information', 'trade secrets'],
  exposure_method: ['sent to external parties', 'left accessible on shared drives', 'visible in public areas', 'shared via unsecured email'],
  record_count: ['hundreds of', 'thousands of', 'approximately 500', 'over 1,000'],
  policy_name: ['the Code of Conduct', 'IT Security Policy', 'Expense Policy', 'Travel Policy', 'Anti-Harassment Policy'],
  policy_violation: ['falsifying time records', 'using company equipment for personal business', 'sharing confidential information'],
  gift_description: ['a gift basket valued at approximately $150', 'tickets to a sporting event', 'a dinner at an expensive restaurant'],
  vendor_name: ['Acme Suppliers', 'Tech Solutions Inc.', 'Global Services Ltd.', 'Premium Partners Corp.'],
  value: ['$75', '$150', '$300', '$500', 'approximately $250'],
  original_issue: ['the harassment', 'safety concerns', 'financial irregularities', 'discrimination'],
  original_date: () =>
    faker.date.past({ years: 1 }).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  retaliation_actions: [
    'being excluded from key meetings',
    'having my projects reassigned',
    'receiving negative performance feedback',
    'being moved to a less desirable shift',
  ],
  old_rating: ['"exceeds expectations"', '"meets expectations"', '"strong performer"'],
  new_rating: ['"needs improvement"', '"below expectations"', '"underperforming"'],
};

/**
 * Replace placeholders in text with random values
 *
 * @param text - Text with {placeholder} tokens
 * @returns Text with placeholders replaced
 */
function replacePlaceholders(text: string): string {
  return text.replace(/\{(\w+)\}/g, (match, placeholder) => {
    const values = PLACEHOLDER_VALUES[placeholder];
    if (!values) {
      // If no value defined, generate something generic
      return faker.lorem.words(2);
    }

    if (typeof values === 'function') {
      return values();
    }

    return pickRandom(values);
  });
}

/**
 * Generate a narrative for a specific category
 *
 * @param category - Category code (e.g., 'harassment', 'safety')
 * @param options - Generation options
 * @returns Object with narrative text and suggested anonymity rate
 *
 * @example
 * const { narrative, suggestedAnonymityRate } = generateNarrative('harassment');
 */
export function generateNarrative(
  category: string,
  options: { forceAnonymous?: boolean; includeLongNarrative?: boolean } = {},
): { narrative: string; suggestedAnonymityRate: number } {
  // Normalize category key
  const categoryKey = category.toLowerCase().replace(/[^a-z_]/g, '_');

  // Get category config or default
  const config = NARRATIVE_TEMPLATES[categoryKey] || NARRATIVE_TEMPLATES.policy_violation;

  // Select a random template
  const template = pickRandom(config.templates);

  // Build the narrative
  let narrative = replacePlaceholders(template.opener) + '\n\n' + replacePlaceholders(template.body);

  // Add optional details
  if (template.details && chance(0.5)) {
    const detail = pickRandom(template.details);
    narrative += ` Specifically, this involved ${detail}.`;
  }

  // Add long narrative content if requested
  if (options.includeLongNarrative) {
    narrative += generateLongNarrativeAddendum();
  }

  return {
    narrative,
    suggestedAnonymityRate: config.anonymityRate,
  };
}

/**
 * Generate additional content to make a narrative longer (for edge cases)
 */
function generateLongNarrativeAddendum(): string {
  const sections = [
    '\n\n## Timeline of Events\n\n',
    generateTimeline(),
    '\n\n## Supporting Details\n\n',
    faker.lorem.paragraphs(3),
    '\n\n## Additional Context\n\n',
    faker.lorem.paragraphs(2),
    '\n\n## Impact Assessment\n\n',
    faker.lorem.paragraph(),
    '\n\n## Witness Information\n\n',
    `The following individuals may have relevant information: ${faker.person.fullName()}, ${faker.person.fullName()}, and ${faker.person.fullName()}.`,
    '\n\n## Documentation\n\n',
    `I have the following documentation available: ${faker.helpers.arrayElements(['emails', 'photos', 'meeting notes', 'chat logs', 'performance reviews', 'calendar invites'], 3).join(', ')}.`,
  ];

  return sections.join('');
}

/**
 * Generate a timeline of events for long narratives
 */
function generateTimeline(): string {
  const events: string[] = [];
  const baseDate = faker.date.past({ years: 1 });

  for (let i = 0; i < 5; i++) {
    const eventDate = new Date(baseDate.getTime() + i * 30 * 24 * 60 * 60 * 1000);
    const dateStr = eventDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    events.push(`- ${dateStr}: ${faker.lorem.sentence()}`);
  }

  return events.join('\n');
}

/**
 * Generate a Unicode-rich narrative for edge case testing
 *
 * @returns Narrative with international characters and Unicode
 */
export function generateUnicodeNarrative(): string {
  const unicodeExamples = [
    'Employee 李明 (Li Ming) reported that the incident occurred in the Shanghai office.',
    "My colleague Müller made inappropriate comments about François' accent.",
    "The email subject was '¡Urgente! Revisión necesaria' which seemed unprofessional.",
    "Witness statement from Björk Guðmundsdóttir confirms the timeline.",
    "The message included the phrase '这是不可接受的' which translates to 'this is unacceptable'.",
    "Employee Özgür reported harassment from colleague Wojciech.",
    "The document was titled 'Política de Ética Empresarial' and was not translated.",
    "Comments were made about employee Naïve's name, mocking the diaeresis.",
    "The team in São Paulo reported similar issues with the same manager.",
    "Employee Håkon from the Oslo office corroborated the complaint.",
  ];

  const opener = pickRandom(unicodeExamples);
  const body = faker.lorem.paragraphs(2);
  const additionalUnicode = pickRandom(unicodeExamples.filter((e) => e !== opener));

  return `${opener}\n\n${body}\n\n${additionalUnicode}`;
}

/**
 * Generate minimal content narrative for edge case testing
 *
 * @returns Minimal valid narrative
 */
export function generateMinimalNarrative(): string {
  return 'Report filed.';
}

/**
 * Get anonymity rate for a category
 *
 * @param category - Category code
 * @returns Anonymity rate (0-1)
 */
export function getCategoryAnonymityRate(category: string): number {
  const categoryKey = category.toLowerCase().replace(/[^a-z_]/g, '_');
  const config = NARRATIVE_TEMPLATES[categoryKey];
  return config?.anonymityRate ?? 0.4; // Default to 40% if category not found
}

/**
 * Get all categories with their anonymity rates
 */
export function getAllCategoryAnonymityRates(): Record<string, number> {
  const rates: Record<string, number> = {};
  for (const [key, config] of Object.entries(NARRATIVE_TEMPLATES)) {
    rates[key] = config.anonymityRate;
  }
  return rates;
}
