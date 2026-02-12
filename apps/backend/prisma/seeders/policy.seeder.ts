/**
 * Policy Library Seeder
 *
 * Seeds Acme Co. with comprehensive policy library:
 * - 50 realistic compliance policies
 * - Multi-language translations (EN, ES, FR, DE, PT, ZH)
 * - Published versions with version history
 * - Various policy types and statuses
 *
 * Usage:
 *   npx ts-node prisma/seeders/policy.seeder.ts
 *
 * Or via seed orchestrator:
 *   npm run db:seed
 */

import {
  PrismaClient,
  PolicyType,
  PolicyStatus,
  TranslationSource,
  TranslationReviewStatus,
} from "@prisma/client";
import { faker } from "@faker-js/faker";

// ===========================================
// Policy Content Library
// ===========================================

interface PolicyDefinition {
  title: string;
  slug: string;
  policyType: PolicyType;
  category: string;
  summary: string;
  content: string;
  translations: {
    languageCode: string;
    languageName: string;
    title: string;
  }[];
}

// Core compliance policies that every organization needs
const CORE_POLICIES: PolicyDefinition[] = [
  {
    title: "Code of Conduct",
    slug: "code-of-conduct",
    policyType: "CODE_OF_CONDUCT",
    category: "Ethics",
    summary:
      "The foundational document outlining expected behavior and ethical standards for all employees.",
    content: `<h1>Code of Conduct</h1>
<h2>Introduction</h2>
<p>Acme Corporation is committed to maintaining the highest standards of ethical conduct in all our business activities. This Code of Conduct establishes the principles and standards that guide our actions and decisions.</p>

<h2>Our Values</h2>
<ul>
<li><strong>Integrity:</strong> We act honestly and ethically in all our dealings.</li>
<li><strong>Respect:</strong> We treat all individuals with dignity and respect.</li>
<li><strong>Accountability:</strong> We take responsibility for our actions and decisions.</li>
<li><strong>Excellence:</strong> We strive for excellence in everything we do.</li>
</ul>

<h2>Scope</h2>
<p>This Code applies to all employees, officers, directors, contractors, and agents of Acme Corporation worldwide.</p>

<h2>Compliance with Laws</h2>
<p>All employees must comply with applicable laws, regulations, and company policies. When local laws conflict with this Code, employees should follow the stricter standard unless doing so would violate local law.</p>

<h2>Conflicts of Interest</h2>
<p>Employees must avoid situations where personal interests conflict, or appear to conflict, with the interests of the company. All potential conflicts must be disclosed to your manager and the Compliance department.</p>

<h2>Reporting Concerns</h2>
<p>Employees are encouraged to report any concerns about potential violations of this Code. Reports can be made through:</p>
<ul>
<li>Your direct manager or HR representative</li>
<li>The Compliance department</li>
<li>The Ethics Hotline (anonymous reporting available)</li>
</ul>

<h2>Non-Retaliation</h2>
<p>Acme Corporation prohibits retaliation against anyone who reports a concern in good faith or participates in an investigation.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Código de Conducta",
      },
      { languageCode: "fr", languageName: "French", title: "Code de Conduite" },
      { languageCode: "de", languageName: "German", title: "Verhaltenskodex" },
      {
        languageCode: "pt",
        languageName: "Portuguese",
        title: "Código de Conduta",
      },
      { languageCode: "zh", languageName: "Chinese", title: "行为准则" },
    ],
  },
  {
    title: "Anti-Harassment Policy",
    slug: "anti-harassment",
    policyType: "ANTI_HARASSMENT",
    category: "HR",
    summary:
      "Defines prohibited harassment behaviors and establishes reporting and investigation procedures.",
    content: `<h1>Anti-Harassment Policy</h1>
<h2>Policy Statement</h2>
<p>Acme Corporation is committed to providing a work environment free from harassment of any kind. This policy prohibits harassment based on race, color, religion, sex, national origin, age, disability, genetic information, veteran status, sexual orientation, gender identity, or any other protected characteristic.</p>

<h2>Definition of Harassment</h2>
<p>Harassment is unwelcome conduct that is based on a protected characteristic and:</p>
<ul>
<li>Submission to such conduct is made explicitly or implicitly a term or condition of employment;</li>
<li>Submission to or rejection of such conduct is used as the basis for employment decisions; or</li>
<li>Such conduct unreasonably interferes with work performance or creates an intimidating, hostile, or offensive work environment.</li>
</ul>

<h2>Sexual Harassment</h2>
<p>Sexual harassment includes unwelcome sexual advances, requests for sexual favors, and other verbal or physical conduct of a sexual nature when:</p>
<ul>
<li>Submission to such conduct is made a term or condition of employment;</li>
<li>Submission to or rejection of such conduct is used for employment decisions; or</li>
<li>Such conduct creates a hostile work environment.</li>
</ul>

<h2>Reporting Procedures</h2>
<p>Any employee who experiences or witnesses harassment should report it immediately to:</p>
<ul>
<li>Their supervisor or manager</li>
<li>Human Resources</li>
<li>The Compliance department</li>
<li>The Ethics Hotline</li>
</ul>

<h2>Investigation</h2>
<p>All reports will be promptly and thoroughly investigated. The company will take appropriate corrective action when harassment is found to have occurred.</p>

<h2>Consequences</h2>
<p>Employees who engage in harassment will be subject to disciplinary action, up to and including termination.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política Contra el Acoso",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique Anti-Harcèlement",
      },
      {
        languageCode: "de",
        languageName: "German",
        title: "Anti-Belästigungs-Richtlinie",
      },
      {
        languageCode: "pt",
        languageName: "Portuguese",
        title: "Política Contra Assédio",
      },
      { languageCode: "zh", languageName: "Chinese", title: "反骚扰政策" },
    ],
  },
  {
    title: "Anti-Bribery and Corruption Policy",
    slug: "anti-bribery",
    policyType: "ANTI_BRIBERY",
    category: "Compliance",
    summary:
      "Prohibits bribery and corrupt practices in all business dealings worldwide.",
    content: `<h1>Anti-Bribery and Corruption Policy</h1>
<h2>Policy Statement</h2>
<p>Acme Corporation has zero tolerance for bribery and corruption. We are committed to conducting business ethically and in compliance with all applicable anti-bribery laws, including the U.S. Foreign Corrupt Practices Act (FCPA) and the UK Bribery Act.</p>

<h2>Prohibited Conduct</h2>
<p>Employees and agents are prohibited from:</p>
<ul>
<li>Offering, promising, or giving a bribe to any person</li>
<li>Requesting, agreeing to receive, or accepting a bribe</li>
<li>Bribing a government official</li>
<li>Making facilitation or "grease" payments</li>
<li>Making political contributions on behalf of the company without approval</li>
</ul>

<h2>Gifts and Entertainment</h2>
<p>Gifts, meals, and entertainment for government officials require prior approval from the Compliance department. See the Gifts and Entertainment Policy for specific limits and approval requirements.</p>

<h2>Third-Party Due Diligence</h2>
<p>Before engaging agents, consultants, or other intermediaries who interact with government officials on our behalf, appropriate due diligence must be conducted and documented.</p>

<h2>Accurate Books and Records</h2>
<p>All transactions must be accurately recorded in the company's books and records. Employees must not create or maintain hidden or unrecorded funds or assets.</p>

<h2>Reporting</h2>
<p>Suspected violations must be reported immediately to the Compliance department or through the Ethics Hotline.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política Anticorrupción",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique Anti-Corruption",
      },
      {
        languageCode: "de",
        languageName: "German",
        title: "Antikorruptionsrichtlinie",
      },
      {
        languageCode: "pt",
        languageName: "Portuguese",
        title: "Política Anticorrupção",
      },
      {
        languageCode: "zh",
        languageName: "Chinese",
        title: "反贿赂和反腐败政策",
      },
    ],
  },
  {
    title: "Conflict of Interest Policy",
    slug: "conflict-of-interest",
    policyType: "CONFLICTS_OF_INTEREST",
    category: "Ethics",
    summary:
      "Requires disclosure of potential conflicts and provides guidance on managing them.",
    content: `<h1>Conflict of Interest Policy</h1>
<h2>Purpose</h2>
<p>This policy requires employees to disclose potential conflicts of interest and provides guidance on identifying and managing conflicts.</p>

<h2>What is a Conflict of Interest?</h2>
<p>A conflict of interest occurs when an employee's personal interests could interfere, or appear to interfere, with the interests of the company. Examples include:</p>
<ul>
<li>Financial interests in vendors, customers, or competitors</li>
<li>Outside employment or business activities</li>
<li>Family relationships with employees, vendors, or customers</li>
<li>Board memberships or advisory positions</li>
<li>Personal use of company resources or information</li>
</ul>

<h2>Disclosure Requirements</h2>
<p>Employees must:</p>
<ul>
<li>Complete the annual Conflict of Interest disclosure form</li>
<li>Update their disclosure whenever circumstances change</li>
<li>Disclose potential conflicts before entering into new relationships or activities</li>
</ul>

<h2>Review Process</h2>
<p>All disclosures are reviewed by the Compliance department. Employees will be notified of any required mitigation measures, such as recusal from certain decisions.</p>

<h2>Prohibited Relationships</h2>
<p>Some relationships may be prohibited even with disclosure. The Compliance department will determine whether a disclosed conflict can be managed or must be avoided.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Conflictos de Interés",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique sur les Conflits d'Intérêts",
      },
      {
        languageCode: "de",
        languageName: "German",
        title: "Richtlinie zu Interessenkonflikten",
      },
      {
        languageCode: "pt",
        languageName: "Portuguese",
        title: "Política de Conflito de Interesses",
      },
      { languageCode: "zh", languageName: "Chinese", title: "利益冲突政策" },
    ],
  },
  {
    title: "Gifts and Entertainment Policy",
    slug: "gifts-entertainment",
    policyType: "GIFT_ENTERTAINMENT",
    category: "Compliance",
    summary:
      "Establishes limits and approval requirements for giving and receiving gifts and entertainment.",
    content: `<h1>Gifts and Entertainment Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes standards for giving and receiving gifts, meals, and entertainment to avoid actual or perceived conflicts of interest and ensure compliance with anti-bribery laws.</p>

<h2>General Principles</h2>
<p>Business gifts and entertainment should:</p>
<ul>
<li>Be infrequent and reasonable in value</li>
<li>Serve a legitimate business purpose</li>
<li>Not be given or received with intent to influence business decisions</li>
<li>Be properly recorded in expense reports</li>
</ul>

<h2>Receiving Gifts</h2>
<table>
<tr><th>Value</th><th>Requirement</th></tr>
<tr><td>Under $50</td><td>No approval required</td></tr>
<tr><td>$50-$100</td><td>Manager approval</td></tr>
<tr><td>$100-$250</td><td>Compliance approval</td></tr>
<tr><td>Over $250</td><td>Generally prohibited</td></tr>
</table>

<h2>Giving Gifts</h2>
<p>Gifts to customers and vendors must be reasonable and properly documented. Gifts to government officials require prior Compliance approval regardless of value.</p>

<h2>Entertainment</h2>
<p>Business meals and entertainment must be reasonable and must include the employee as host. Lavish or extravagant entertainment is prohibited.</p>

<h2>Prohibited Items</h2>
<p>The following are prohibited regardless of value:</p>
<ul>
<li>Cash or cash equivalents (gift cards)</li>
<li>Gifts during contract negotiations</li>
<li>Gifts to government officials without approval</li>
<li>Entertainment with no business purpose</li>
</ul>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Regalos y Entretenimiento",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique Cadeaux et Divertissements",
      },
      {
        languageCode: "de",
        languageName: "German",
        title: "Geschenke- und Unterhaltungsrichtlinie",
      },
      {
        languageCode: "pt",
        languageName: "Portuguese",
        title: "Política de Presentes e Entretenimento",
      },
      { languageCode: "zh", languageName: "Chinese", title: "礼品和招待政策" },
    ],
  },
  {
    title: "Data Privacy Policy",
    slug: "data-privacy",
    policyType: "DATA_PRIVACY",
    category: "Privacy",
    summary:
      "Establishes requirements for protecting personal data and complying with privacy regulations.",
    content: `<h1>Data Privacy Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes requirements for collecting, using, and protecting personal data in compliance with applicable privacy laws including GDPR, CCPA, and HIPAA.</p>

<h2>Scope</h2>
<p>This policy applies to all personal data processed by Acme Corporation, including:</p>
<ul>
<li>Employee personal data</li>
<li>Customer and patient data</li>
<li>Vendor and contractor data</li>
<li>Website visitor data</li>
</ul>

<h2>Data Protection Principles</h2>
<p>All personal data must be:</p>
<ul>
<li>Collected for specified, legitimate purposes</li>
<li>Adequate, relevant, and limited to what is necessary</li>
<li>Accurate and kept up to date</li>
<li>Retained only as long as necessary</li>
<li>Protected with appropriate security measures</li>
</ul>

<h2>Individual Rights</h2>
<p>Individuals have the right to:</p>
<ul>
<li>Access their personal data</li>
<li>Correct inaccurate data</li>
<li>Request deletion of their data</li>
<li>Object to certain processing</li>
<li>Data portability</li>
</ul>

<h2>Data Breach Response</h2>
<p>Suspected data breaches must be reported immediately to the Privacy Officer. The company will respond to breaches in accordance with applicable law.</p>

<h2>Healthcare Data (HIPAA)</h2>
<p>Protected Health Information (PHI) is subject to additional safeguards. See the HIPAA Privacy and Security Policies for specific requirements.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Privacidad de Datos",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique de Confidentialité des Données",
      },
      {
        languageCode: "de",
        languageName: "German",
        title: "Datenschutzrichtlinie",
      },
      {
        languageCode: "pt",
        languageName: "Portuguese",
        title: "Política de Privacidade de Dados",
      },
      { languageCode: "zh", languageName: "Chinese", title: "数据隐私政策" },
    ],
  },
  {
    title: "Whistleblower Protection Policy",
    slug: "whistleblower-protection",
    policyType: "WHISTLEBLOWER",
    category: "Ethics",
    summary:
      "Protects employees who report concerns in good faith from retaliation.",
    content: `<h1>Whistleblower Protection Policy</h1>
<h2>Policy Statement</h2>
<p>Acme Corporation encourages employees to report suspected violations of law, regulation, or company policy. We are committed to protecting employees who report concerns in good faith from retaliation.</p>

<h2>Protected Activity</h2>
<p>This policy protects employees who:</p>
<ul>
<li>Report suspected violations of law or company policy</li>
<li>Participate in investigations</li>
<li>Refuse to participate in illegal or unethical conduct</li>
<li>Exercise rights under applicable whistleblower laws</li>
</ul>

<h2>Prohibition of Retaliation</h2>
<p>Retaliation against anyone who engages in protected activity is strictly prohibited. Retaliation includes:</p>
<ul>
<li>Termination or demotion</li>
<li>Reduction in compensation or benefits</li>
<li>Negative performance evaluations</li>
<li>Threats, harassment, or intimidation</li>
<li>Any other adverse employment action</li>
</ul>

<h2>Reporting Channels</h2>
<p>Concerns can be reported through:</p>
<ul>
<li>Direct supervisor or management</li>
<li>Human Resources</li>
<li>Legal or Compliance departments</li>
<li>Ethics Hotline (anonymous reporting available)</li>
<li>External agencies when appropriate</li>
</ul>

<h2>Consequences</h2>
<p>Employees who engage in retaliation will be subject to disciplinary action, up to and including termination.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Protección de Denunciantes",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique de Protection des Lanceurs d'Alerte",
      },
      {
        languageCode: "de",
        languageName: "German",
        title: "Hinweisgeberschutzrichtlinie",
      },
      {
        languageCode: "pt",
        languageName: "Portuguese",
        title: "Política de Proteção ao Denunciante",
      },
      { languageCode: "zh", languageName: "Chinese", title: "举报人保护政策" },
    ],
  },
  {
    title: "Information Security Policy",
    slug: "information-security",
    policyType: "INFORMATION_SECURITY",
    category: "IT",
    summary:
      "Establishes requirements for protecting company information and systems.",
    content: `<h1>Information Security Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes requirements for protecting company information assets and systems from unauthorized access, disclosure, modification, or destruction.</p>

<h2>Classification</h2>
<p>Information must be classified according to sensitivity:</p>
<ul>
<li><strong>Confidential:</strong> Highly sensitive information requiring strict controls</li>
<li><strong>Internal:</strong> Information for internal use only</li>
<li><strong>Public:</strong> Information approved for public release</li>
</ul>

<h2>Access Control</h2>
<p>Access to information systems must be:</p>
<ul>
<li>Authorized based on business need</li>
<li>Reviewed periodically</li>
<li>Revoked upon termination or role change</li>
</ul>

<h2>Password Requirements</h2>
<p>Passwords must:</p>
<ul>
<li>Be at least 12 characters long</li>
<li>Include uppercase, lowercase, numbers, and symbols</li>
<li>Be changed every 90 days</li>
<li>Not be shared or written down</li>
</ul>

<h2>Mobile Devices</h2>
<p>Mobile devices accessing company data must:</p>
<ul>
<li>Be encrypted</li>
<li>Have screen lock enabled</li>
<li>Be reported if lost or stolen immediately</li>
</ul>

<h2>Incident Reporting</h2>
<p>Security incidents must be reported immediately to IT Security. Examples include:</p>
<ul>
<li>Suspicious emails or attachments</li>
<li>Lost or stolen devices</li>
<li>Unauthorized access attempts</li>
<li>Malware infections</li>
</ul>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Seguridad de la Información",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique de Sécurité de l'Information",
      },
      {
        languageCode: "de",
        languageName: "German",
        title: "Informationssicherheitsrichtlinie",
      },
      {
        languageCode: "pt",
        languageName: "Portuguese",
        title: "Política de Segurança da Informação",
      },
      { languageCode: "zh", languageName: "Chinese", title: "信息安全政策" },
    ],
  },
  {
    title: "Travel and Expense Policy",
    slug: "travel-expense",
    policyType: "TRAVEL_EXPENSE",
    category: "Finance",
    summary:
      "Establishes guidelines and limits for business travel and expense reimbursement.",
    content: `<h1>Travel and Expense Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes guidelines for business travel and expense reimbursement to ensure appropriate use of company resources.</p>

<h2>Pre-Travel Approval</h2>
<p>All business travel must be pre-approved by your manager. International travel requires additional approval from the department head.</p>

<h2>Air Travel</h2>
<ul>
<li>Economy class for flights under 6 hours</li>
<li>Business class for international flights over 6 hours (VP+ approval required)</li>
<li>Book at least 14 days in advance when possible</li>
</ul>

<h2>Lodging</h2>
<ul>
<li>Standard hotel rooms at or below per diem rates</li>
<li>Use approved corporate hotels when available</li>
<li>Per diem rates vary by city (see Appendix A)</li>
</ul>

<h2>Ground Transportation</h2>
<ul>
<li>Public transportation preferred when practical</li>
<li>Rental cars: intermediate class unless business need</li>
<li>Rideshare services allowed for local transportation</li>
</ul>

<h2>Meals</h2>
<p>Reasonable meal expenses are reimbursable. Per diem rates apply:</p>
<table>
<tr><th>Meal</th><th>Limit</th></tr>
<tr><td>Breakfast</td><td>$20</td></tr>
<tr><td>Lunch</td><td>$25</td></tr>
<tr><td>Dinner</td><td>$50</td></tr>
</table>

<h2>Non-Reimbursable Expenses</h2>
<ul>
<li>Personal entertainment</li>
<li>Alcoholic beverages (except at approved client events)</li>
<li>First-class travel upgrades</li>
<li>Spouse or family travel expenses</li>
</ul>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Viajes y Gastos",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique de Voyage et de Dépenses",
      },
      {
        languageCode: "de",
        languageName: "German",
        title: "Reise- und Spesenrichtlinie",
      },
      {
        languageCode: "pt",
        languageName: "Portuguese",
        title: "Política de Viagens e Despesas",
      },
      { languageCode: "zh", languageName: "Chinese", title: "差旅费用政策" },
    ],
  },
  {
    title: "Social Media Policy",
    slug: "social-media",
    policyType: "SOCIAL_MEDIA",
    category: "Communications",
    summary:
      "Guidelines for employee use of social media in relation to company matters.",
    content: `<h1>Social Media Policy</h1>
<h2>Purpose</h2>
<p>This policy provides guidelines for employee use of social media platforms when discussing company matters or acting in a professional capacity.</p>

<h2>Personal Accounts</h2>
<p>When using personal social media accounts:</p>
<ul>
<li>Make clear that opinions are your own, not the company's</li>
<li>Do not share confidential company information</li>
<li>Respect coworkers' privacy</li>
<li>Be mindful that online conduct can reflect on the company</li>
</ul>

<h2>Official Company Accounts</h2>
<p>Only authorized employees may post on official company social media accounts. All official posts must be approved by the Communications department.</p>

<h2>Prohibited Content</h2>
<p>Employees must not post content that:</p>
<ul>
<li>Discloses confidential or proprietary information</li>
<li>Violates privacy or HIPAA regulations</li>
<li>Contains discriminatory or harassing language</li>
<li>Misrepresents company positions or products</li>
<li>Infringes on intellectual property rights</li>
</ul>

<h2>Crisis Communications</h2>
<p>During crisis situations, employees should not comment on the matter on social media. All communications should be directed through official company channels.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Redes Sociales",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique sur les Médias Sociaux",
      },
      {
        languageCode: "de",
        languageName: "German",
        title: "Social-Media-Richtlinie",
      },
      {
        languageCode: "pt",
        languageName: "Portuguese",
        title: "Política de Mídias Sociais",
      },
      { languageCode: "zh", languageName: "Chinese", title: "社交媒体政策" },
    ],
  },
  {
    title: "Acceptable Use Policy",
    slug: "acceptable-use",
    policyType: "ACCEPTABLE_USE",
    category: "IT",
    summary:
      "Defines acceptable use of company technology resources and systems.",
    content: `<h1>Acceptable Use Policy</h1>
<h2>Purpose</h2>
<p>This policy defines acceptable use of company technology resources including computers, networks, email, and internet access.</p>

<h2>General Use</h2>
<p>Company technology resources are provided for business purposes. Limited personal use is permitted if it:</p>
<ul>
<li>Does not interfere with work responsibilities</li>
<li>Does not violate any company policy</li>
<li>Does not consume excessive resources</li>
<li>Is conducted on personal time (breaks, lunch)</li>
</ul>

<h2>Prohibited Activities</h2>
<p>The following activities are prohibited:</p>
<ul>
<li>Accessing inappropriate or offensive content</li>
<li>Downloading unauthorized software</li>
<li>Sharing login credentials</li>
<li>Using resources for personal business activities</li>
<li>Circumventing security controls</li>
<li>Sending spam or chain letters</li>
</ul>

<h2>Email Use</h2>
<p>Email is a business tool. When using company email:</p>
<ul>
<li>Use professional language and tone</li>
<li>Do not send confidential information externally without encryption</li>
<li>Be aware that emails may be reviewed for business purposes</li>
</ul>

<h2>Monitoring</h2>
<p>The company reserves the right to monitor all use of company technology resources. Employees should have no expectation of privacy when using company systems.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Uso Aceptable",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique d'Utilisation Acceptable",
      },
      {
        languageCode: "de",
        languageName: "German",
        title: "Richtlinie zur akzeptablen Nutzung",
      },
      {
        languageCode: "pt",
        languageName: "Portuguese",
        title: "Política de Uso Aceitável",
      },
      { languageCode: "zh", languageName: "Chinese", title: "可接受使用政策" },
    ],
  },
];

// Additional policies to reach 50 total - expanded with substantial content
const ADDITIONAL_POLICIES: PolicyDefinition[] = [
  {
    title: "HIPAA Privacy Policy",
    slug: "hipaa-privacy",
    policyType: "DATA_PRIVACY",
    category: "Healthcare",
    summary:
      "Establishes requirements for protecting Protected Health Information under HIPAA.",
    content: `<h1>HIPAA Privacy Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes requirements for protecting Protected Health Information (PHI) in compliance with the Health Insurance Portability and Accountability Act (HIPAA). Acme Corporation is committed to safeguarding the privacy of all individuals whose health information we collect, use, or maintain.</p>

<h2>Scope</h2>
<p>This policy applies to all workforce members who access, use, or disclose PHI, including employees, contractors, volunteers, and business associates. It covers PHI in all forms: electronic, paper, and oral.</p>

<h2>Definitions</h2>
<ul>
<li><strong>Protected Health Information (PHI):</strong> Individually identifiable health information transmitted or maintained in any form</li>
<li><strong>Covered Entity:</strong> Health plans, healthcare clearinghouses, and healthcare providers who transmit health information electronically</li>
<li><strong>Business Associate:</strong> A person or entity that performs functions involving PHI on behalf of a covered entity</li>
</ul>

<h2>Minimum Necessary Standard</h2>
<p>Access to PHI must be limited to the minimum necessary to accomplish the intended purpose. Workforce members should only access, use, or disclose the specific PHI needed to perform their job functions. Role-based access controls must be implemented to enforce this standard.</p>

<h2>Patient Rights</h2>
<p>Patients have the following rights regarding their PHI:</p>
<ul>
<li>Right to access and obtain copies of their PHI</li>
<li>Right to request amendments to their PHI</li>
<li>Right to an accounting of disclosures</li>
<li>Right to request restrictions on uses and disclosures</li>
<li>Right to request confidential communications</li>
<li>Right to file a complaint if privacy rights are violated</li>
</ul>

<h2>Permitted Uses and Disclosures</h2>
<p>PHI may be used or disclosed for treatment, payment, and healthcare operations without patient authorization. Other uses require written patient authorization or must fall within specific exceptions defined by law.</p>

<h2>Breach Notification</h2>
<p>Breaches of unsecured PHI must be reported within the following timeframes:</p>
<ul>
<li>To affected individuals: Within 60 days of discovery</li>
<li>To HHS: Annually for breaches affecting fewer than 500 individuals; within 60 days for larger breaches</li>
<li>To media: Within 60 days for breaches affecting more than 500 residents of a state</li>
</ul>

<h2>Training and Compliance</h2>
<p>All workforce members must complete HIPAA privacy training within 30 days of hire and annually thereafter. Violations may result in disciplinary action up to and including termination, and may also result in civil or criminal penalties.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Privacidad HIPAA",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique de Confidentialité HIPAA",
      },
    ],
  },
  {
    title: "HIPAA Security Policy",
    slug: "hipaa-security",
    policyType: "INFORMATION_SECURITY",
    category: "Healthcare",
    summary:
      "Technical and administrative safeguards for electronic PHI under HIPAA.",
    content: `<h1>HIPAA Security Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes administrative, physical, and technical safeguards for electronic Protected Health Information (ePHI) as required by the HIPAA Security Rule. These safeguards ensure the confidentiality, integrity, and availability of ePHI.</p>

<h2>Scope</h2>
<p>This policy applies to all electronic systems, applications, and devices that create, receive, maintain, or transmit ePHI. This includes servers, workstations, mobile devices, and cloud services.</p>

<h2>Administrative Safeguards</h2>
<ul>
<li><strong>Security Management Process:</strong> Implement policies and procedures to prevent, detect, contain, and correct security violations</li>
<li><strong>Security Officer:</strong> Designate a security official responsible for developing and implementing security policies</li>
<li><strong>Workforce Security:</strong> Implement procedures for authorization and supervision of workforce members</li>
<li><strong>Information Access Management:</strong> Implement policies for authorizing access to ePHI</li>
<li><strong>Security Awareness Training:</strong> Implement a security awareness and training program for all workforce members</li>
<li><strong>Security Incident Procedures:</strong> Implement policies to address security incidents</li>
<li><strong>Contingency Plan:</strong> Establish policies for responding to emergencies that damage systems containing ePHI</li>
</ul>

<h2>Physical Safeguards</h2>
<ul>
<li><strong>Facility Access Controls:</strong> Limit physical access to facilities while ensuring authorized access</li>
<li><strong>Workstation Use:</strong> Specify proper functions and manner of use for workstations</li>
<li><strong>Workstation Security:</strong> Implement physical safeguards restricting access to workstations</li>
<li><strong>Device and Media Controls:</strong> Implement policies governing receipt and removal of hardware and electronic media</li>
</ul>

<h2>Technical Safeguards</h2>
<ul>
<li><strong>Access Control:</strong> Implement unique user identification, emergency access procedures, automatic logoff, and encryption</li>
<li><strong>Audit Controls:</strong> Implement hardware, software, and procedural mechanisms to record and examine access</li>
<li><strong>Integrity Controls:</strong> Implement policies protecting ePHI from improper alteration or destruction</li>
<li><strong>Transmission Security:</strong> Implement technical security measures to guard against unauthorized access during transmission</li>
</ul>

<h2>Risk Analysis and Management</h2>
<p>Acme Corporation conducts annual risk analyses to identify potential threats and vulnerabilities to ePHI. Risk management plans are developed and implemented to reduce risks to an appropriate level.</p>

<h2>Business Associate Agreements</h2>
<p>All business associates with access to ePHI must execute a Business Associate Agreement that includes required security provisions.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Seguridad HIPAA",
      },
      {
        languageCode: "de",
        languageName: "German",
        title: "HIPAA-Sicherheitsrichtlinie",
      },
    ],
  },
  {
    title: "Vendor Management Policy",
    slug: "vendor-management",
    policyType: "OTHER",
    category: "Procurement",
    summary:
      "Requirements for selecting, contracting with, and monitoring third-party vendors.",
    content: `<h1>Vendor Management Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes requirements for managing relationships with third-party vendors to ensure compliance, security, and value. Effective vendor management protects Acme Corporation from risks associated with outsourcing functions and services.</p>

<h2>Scope</h2>
<p>This policy applies to all vendor relationships where third parties provide goods, services, or access to company systems or data. This includes contractors, consultants, software providers, and service providers.</p>

<h2>Vendor Selection</h2>
<p>All significant vendor relationships must go through a formal selection process:</p>
<ul>
<li><strong>Needs Assessment:</strong> Document business requirements and justify the need for external vendor</li>
<li><strong>Request for Proposal (RFP):</strong> Issue RFP for contracts exceeding $50,000 annually</li>
<li><strong>Due Diligence:</strong> Review vendor financial stability, references, certifications, and security practices</li>
<li><strong>Contract Negotiation:</strong> Include required terms for data protection, compliance, and termination rights</li>
<li><strong>Legal Review:</strong> All contracts must be reviewed by Legal before execution</li>
</ul>

<h2>Risk Assessment</h2>
<p>Vendors are classified into risk tiers based on:</p>
<table>
<tr><th>Tier</th><th>Criteria</th><th>Review Frequency</th></tr>
<tr><td>Critical</td><td>Access to sensitive data, critical operations</td><td>Annually</td></tr>
<tr><td>High</td><td>Access to internal systems or confidential data</td><td>Every 2 years</td></tr>
<tr><td>Standard</td><td>Limited access, non-critical services</td><td>Every 3 years</td></tr>
</table>

<h2>Security Requirements</h2>
<p>Vendors with access to company data or systems must:</p>
<ul>
<li>Maintain appropriate security certifications (SOC 2, ISO 27001, etc.)</li>
<li>Execute confidentiality and data protection agreements</li>
<li>Allow security assessments or provide audit reports upon request</li>
<li>Notify Acme Corporation of any security incidents within 24 hours</li>
</ul>

<h2>Ongoing Monitoring</h2>
<p>Vendor performance and compliance must be monitored throughout the relationship through quarterly business reviews, annual security assessments, and continuous monitoring of service levels.</p>

<h2>Termination</h2>
<p>Upon termination, vendors must return or destroy all company data and certify destruction in writing.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Gestión de Proveedores",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique de Gestion des Fournisseurs",
      },
    ],
  },
  {
    title: "Record Retention Policy",
    slug: "record-retention",
    policyType: "OTHER",
    category: "Compliance",
    summary:
      "Establishes retention periods for various types of business records.",
    content: `<h1>Record Retention Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes requirements for retaining and disposing of business records in compliance with legal, regulatory, and operational requirements. Proper records management reduces storage costs, facilitates litigation response, and ensures regulatory compliance.</p>

<h2>Scope</h2>
<p>This policy applies to all business records in any format, including paper documents, electronic files, emails, databases, and backup media. It covers records created, received, or maintained by employees in the course of business.</p>

<h2>Retention Schedule</h2>
<table>
<tr><th>Record Type</th><th>Retention Period</th></tr>
<tr><td>Corporate Records (articles, bylaws, minutes)</td><td>Permanent</td></tr>
<tr><td>Tax Records and Supporting Documentation</td><td>7 years</td></tr>
<tr><td>Employee Personnel Files</td><td>7 years after termination</td></tr>
<tr><td>Contracts and Agreements</td><td>10 years after expiration</td></tr>
<tr><td>Financial Statements and Audit Reports</td><td>Permanent</td></tr>
<tr><td>Accounts Payable/Receivable</td><td>7 years</td></tr>
<tr><td>Customer Records</td><td>7 years after relationship ends</td></tr>
<tr><td>Email (general business)</td><td>3 years</td></tr>
<tr><td>Insurance Policies</td><td>Permanent</td></tr>
<tr><td>Healthcare/HIPAA Records</td><td>6 years from creation or last effective date</td></tr>
</table>

<h2>Litigation Hold</h2>
<p>Normal retention schedules are immediately suspended when a litigation hold is issued. Upon receiving notice of pending or threatened litigation, investigation, or audit:</p>
<ul>
<li>Preserve all potentially relevant records</li>
<li>Suspend automatic deletion processes</li>
<li>Notify all custodians of relevant records</li>
<li>Contact Legal before disposing of any records that may be relevant</li>
</ul>

<h2>Destruction Procedures</h2>
<p>Records must be destroyed securely when the retention period expires:</p>
<ul>
<li><strong>Paper:</strong> Cross-cut shredding or certified destruction service</li>
<li><strong>Electronic:</strong> Secure deletion with verification or physical destruction of media</li>
<li><strong>Documentation:</strong> Maintain destruction certificates for audit purposes</li>
</ul>

<h2>Responsibilities</h2>
<p>Department managers are responsible for ensuring their teams comply with this policy. The Records Management team provides guidance and conducts periodic audits.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Retención de Registros",
      },
      {
        languageCode: "de",
        languageName: "German",
        title: "Aufbewahrungsrichtlinie",
      },
    ],
  },
  {
    title: "Workplace Safety Policy",
    slug: "workplace-safety",
    policyType: "OTHER",
    category: "Safety",
    summary:
      "Establishes requirements for maintaining a safe work environment.",
    content: `<h1>Workplace Safety Policy</h1>
<h2>Purpose</h2>
<p>Acme Corporation is committed to providing a safe and healthy work environment for all employees, contractors, and visitors. This policy establishes safety standards, responsibilities, and procedures to prevent workplace injuries and illnesses.</p>

<h2>Scope</h2>
<p>This policy applies to all work locations, including offices, manufacturing facilities, remote work locations, and any location where company business is conducted.</p>

<h2>Management Responsibilities</h2>
<ul>
<li>Provide safe working conditions and necessary safety equipment</li>
<li>Ensure compliance with OSHA and applicable safety regulations</li>
<li>Conduct regular safety inspections and risk assessments</li>
<li>Investigate all incidents and implement corrective actions</li>
<li>Provide adequate safety training and resources</li>
</ul>

<h2>Employee Responsibilities</h2>
<p>All employees are responsible for:</p>
<ul>
<li>Following all safety procedures and using required personal protective equipment (PPE)</li>
<li>Reporting hazards, unsafe conditions, and near-misses immediately</li>
<li>Participating in required safety training</li>
<li>Not operating equipment without proper training and authorization</li>
<li>Maintaining a clean and organized work area</li>
</ul>

<h2>Incident Reporting</h2>
<p>All workplace injuries, illnesses, and near-misses must be reported immediately:</p>
<ul>
<li>Notify your supervisor within 1 hour of the incident</li>
<li>Complete an incident report within 24 hours</li>
<li>Cooperate with any investigation</li>
<li>Seek medical attention as needed</li>
</ul>

<h2>Emergency Procedures</h2>
<p>Employees must be familiar with emergency procedures for their work area:</p>
<ul>
<li>Know evacuation routes and assembly points</li>
<li>Know the location of fire extinguishers and first aid kits</li>
<li>Participate in emergency drills</li>
<li>Follow instructions from emergency wardens</li>
</ul>

<h2>Safety Training</h2>
<p>Required safety training includes new employee orientation, annual refresher training, job-specific hazard training, and emergency response training.</p>

<h2>Enforcement</h2>
<p>Violations of safety policies may result in disciplinary action, up to and including termination. Repeated violations or willful disregard for safety will not be tolerated.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Seguridad en el Trabajo",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique de Sécurité au Travail",
      },
      {
        languageCode: "de",
        languageName: "German",
        title: "Arbeitsschutzrichtlinie",
      },
    ],
  },
  {
    title: "Drug and Alcohol Policy",
    slug: "drug-alcohol",
    policyType: "OTHER",
    category: "HR",
    summary:
      "Prohibits drug and alcohol use in the workplace and establishes testing requirements.",
    content: `<h1>Drug and Alcohol Policy</h1>
<h2>Policy Statement</h2>
<p>Acme Corporation is committed to maintaining a drug-free workplace to ensure the safety, health, and productivity of all employees. The use, possession, sale, or distribution of illegal drugs or alcohol on company premises or while conducting company business is strictly prohibited.</p>

<h2>Scope</h2>
<p>This policy applies to all employees, contractors, and visitors. It covers conduct on company premises, at company-sponsored events, and while performing company business, including operating company vehicles.</p>

<h2>Prohibited Conduct</h2>
<ul>
<li>Reporting to work or working under the influence of alcohol or illegal drugs</li>
<li>Using, possessing, distributing, or selling illegal drugs on company property</li>
<li>Using prescription medications in a manner inconsistent with the prescription</li>
<li>Refusing to submit to required drug or alcohol testing</li>
<li>Tampering with or substituting test samples</li>
</ul>

<h2>Testing Program</h2>
<p>Drug and alcohol testing may be conducted under the following circumstances:</p>
<ul>
<li><strong>Pre-employment:</strong> All candidates receiving conditional offers of employment</li>
<li><strong>Post-accident:</strong> Following any workplace accident resulting in injury or property damage</li>
<li><strong>Reasonable Suspicion:</strong> When a supervisor has documented, objective evidence of impairment</li>
<li><strong>Random Testing:</strong> For employees in safety-sensitive positions</li>
<li><strong>Return-to-Duty:</strong> Following completion of any required rehabilitation program</li>
</ul>

<h2>Prescription Medications</h2>
<p>Employees taking prescription medications that may affect their ability to work safely must notify their supervisor and Human Resources. Medical documentation may be required to ensure safe job performance.</p>

<h2>Employee Assistance</h2>
<p>Acme Corporation encourages employees struggling with substance abuse to seek help through our Employee Assistance Program (EAP). Voluntary self-referral before a policy violation may be considered a mitigating factor.</p>

<h2>Consequences</h2>
<p>Violations of this policy will result in disciplinary action, up to and including immediate termination. Employees who test positive may be offered the opportunity to participate in a rehabilitation program as a condition of continued employment.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Drogas y Alcohol",
      },
    ],
  },
  {
    title: "Equal Employment Opportunity Policy",
    slug: "equal-employment",
    policyType: "OTHER",
    category: "HR",
    summary:
      "Commitment to equal employment opportunity without discrimination.",
    content: `<h1>Equal Employment Opportunity Policy</h1>
<h2>Policy Statement</h2>
<p>Acme Corporation is committed to providing equal employment opportunities to all qualified individuals without regard to race, color, religion, sex, national origin, age, disability, veteran status, sexual orientation, gender identity, genetic information, or any other characteristic protected by law.</p>

<h2>Scope</h2>
<p>This policy applies to all aspects of the employment relationship, including:</p>
<ul>
<li>Recruitment, hiring, and selection</li>
<li>Compensation and benefits</li>
<li>Training and development</li>
<li>Promotions and transfers</li>
<li>Termination, layoff, and recall</li>
<li>All other terms and conditions of employment</li>
</ul>

<h2>Prohibited Discrimination</h2>
<p>Discrimination based on any protected characteristic is strictly prohibited. This includes:</p>
<ul>
<li>Making employment decisions based on protected characteristics rather than qualifications</li>
<li>Treating employees differently based on protected characteristics</li>
<li>Creating or tolerating a hostile work environment</li>
<li>Retaliating against employees who report discrimination or participate in investigations</li>
</ul>

<h2>Reasonable Accommodation</h2>
<p>Acme Corporation will provide reasonable accommodations to:</p>
<ul>
<li>Qualified individuals with disabilities, unless doing so would cause undue hardship</li>
<li>Employees with sincerely held religious beliefs that conflict with work requirements</li>
<li>Pregnant employees who need accommodations</li>
</ul>
<p>Employees requesting accommodations should contact Human Resources to begin the interactive process.</p>

<h2>Affirmative Action</h2>
<p>As a federal contractor, Acme Corporation maintains Affirmative Action Programs for minorities, women, individuals with disabilities, and protected veterans. We take affirmative steps to ensure equal opportunity in recruitment, hiring, and advancement.</p>

<h2>Reporting Discrimination</h2>
<p>Employees who believe they have experienced or witnessed discrimination should report it immediately to their supervisor, Human Resources, or through the Ethics Hotline. All reports will be promptly investigated and kept confidential to the extent possible.</p>

<h2>Non-Retaliation</h2>
<p>Retaliation against anyone who reports discrimination in good faith or participates in an investigation is strictly prohibited and will result in disciplinary action.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Igualdad de Oportunidades",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique d'Égalité des Chances",
      },
    ],
  },
  {
    title: "Remote Work Policy",
    slug: "remote-work",
    policyType: "OTHER",
    category: "HR",
    summary: "Guidelines and requirements for employees working remotely.",
    content: `<h1>Remote Work Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes guidelines for remote work arrangements to ensure productivity, security, collaboration, and work-life balance. Acme Corporation recognizes that remote work can benefit both the organization and employees when implemented effectively.</p>

<h2>Eligibility</h2>
<p>Remote work eligibility is determined based on:</p>
<ul>
<li>Job role and responsibilities (some positions require on-site presence)</li>
<li>Performance history (satisfactory or above performance ratings)</li>
<li>Demonstrated ability to work independently</li>
<li>Manager approval</li>
<li>Ability to maintain secure work environment</li>
</ul>

<h2>Remote Work Arrangements</h2>
<table>
<tr><th>Type</th><th>Description</th><th>Approval</th></tr>
<tr><td>Full Remote</td><td>100% remote, no regular office requirement</td><td>VP + HR approval</td></tr>
<tr><td>Hybrid</td><td>Split between office and remote (e.g., 3 days in office)</td><td>Manager approval</td></tr>
<tr><td>Occasional</td><td>Ad-hoc remote work for specific circumstances</td><td>Manager approval</td></tr>
</table>

<h2>Employee Requirements</h2>
<ul>
<li>Maintain regular working hours and be available during core business hours (9 AM - 3 PM local time)</li>
<li>Respond to communications within reasonable timeframes</li>
<li>Participate in required video meetings with camera on</li>
<li>Ensure reliable internet connectivity (minimum 25 Mbps download)</li>
<li>Maintain a dedicated, professional workspace</li>
<li>Protect confidential information and follow security policies</li>
<li>Attend required in-person meetings and events</li>
</ul>

<h2>Security Requirements</h2>
<p>Remote employees must:</p>
<ul>
<li>Use company-provided equipment or approved personal devices</li>
<li>Connect through VPN when accessing company systems</li>
<li>Secure their home network with strong passwords</li>
<li>Lock screens when away from the computer</li>
<li>Not allow family members to access company devices or data</li>
</ul>

<h2>Equipment and Expenses</h2>
<p>The company will provide necessary equipment including laptop, monitor, and peripherals. Employees are responsible for maintaining appropriate home office furniture and environment. Internet service expenses are the employee's responsibility unless otherwise approved.</p>

<h2>Performance Management</h2>
<p>Remote employees are held to the same performance standards as on-site employees. Managers will conduct regular check-ins and performance reviews as normal.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Trabajo Remoto",
      },
      {
        languageCode: "de",
        languageName: "German",
        title: "Richtlinie für Remote-Arbeit",
      },
    ],
  },
  {
    title: "Intellectual Property Policy",
    slug: "intellectual-property",
    policyType: "OTHER",
    category: "Legal",
    summary:
      "Protects company intellectual property and defines ownership of employee creations.",
    content: `<h1>Intellectual Property Policy</h1>
<h2>Purpose</h2>
<p>This policy protects Acme Corporation's intellectual property assets and defines ownership rights for inventions, works, and ideas created by employees. Intellectual property is critical to our competitive advantage and must be properly protected.</p>

<h2>Company Ownership</h2>
<p>All intellectual property created by employees in the course of their employment belongs to Acme Corporation, including:</p>
<ul>
<li><strong>Inventions:</strong> Products, processes, methods, and improvements</li>
<li><strong>Patents:</strong> All patentable inventions and patent applications</li>
<li><strong>Copyrights:</strong> Documents, software, designs, and creative works</li>
<li><strong>Trade Secrets:</strong> Proprietary information, formulas, and processes</li>
<li><strong>Trademarks:</strong> Brands, logos, and product names</li>
<li><strong>Software:</strong> Code, algorithms, and applications</li>
</ul>

<h2>Invention Disclosure</h2>
<p>Employees must promptly disclose all inventions, discoveries, and developments made:</p>
<ul>
<li>During working hours or using company resources</li>
<li>Related to company business or research</li>
<li>Based on company confidential information</li>
</ul>
<p>Disclosure must be made using the Invention Disclosure Form submitted to the Legal department.</p>

<h2>Assignment of Rights</h2>
<p>As a condition of employment, employees assign to Acme Corporation all rights to intellectual property created within the scope of employment. Employees agree to execute any documents necessary to perfect the company's ownership rights.</p>

<h2>Protection Obligations</h2>
<p>Employees must protect company intellectual property by:</p>
<ul>
<li>Maintaining confidentiality of proprietary information</li>
<li>Using appropriate confidentiality markings on documents</li>
<li>Not disclosing IP to unauthorized parties</li>
<li>Reporting suspected IP theft or misappropriation</li>
</ul>

<h2>Third-Party Intellectual Property</h2>
<p>Employees must respect third-party intellectual property rights:</p>
<ul>
<li>Do not use unauthorized software or copyrighted materials</li>
<li>Properly license all third-party components</li>
<li>Do not bring prior employer's confidential information</li>
<li>Clear rights before using open-source software</li>
</ul>

<h2>Post-Employment Obligations</h2>
<p>IP protection obligations continue after employment ends. Former employees may not use or disclose company trade secrets or confidential information.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Propiedad Intelectual",
      },
      { languageCode: "zh", languageName: "Chinese", title: "知识产权政策" },
    ],
  },
  {
    title: "Environmental Policy",
    slug: "environmental",
    policyType: "OTHER",
    category: "Sustainability",
    summary: "Commitment to environmental responsibility and sustainability.",
    content: `<h1>Environmental Policy</h1>
<h2>Commitment</h2>
<p>Acme Corporation is committed to conducting business in an environmentally responsible manner. We recognize our obligation to minimize environmental impact while meeting business objectives and complying with all applicable environmental laws and regulations.</p>

<h2>Environmental Goals</h2>
<p>We are committed to achieving the following environmental objectives:</p>
<ul>
<li><strong>Carbon Reduction:</strong> Achieve net-zero carbon emissions by 2040</li>
<li><strong>Energy Efficiency:</strong> Reduce energy consumption by 30% by 2030 (baseline: 2020)</li>
<li><strong>Waste Reduction:</strong> Divert 90% of waste from landfills through recycling and composting</li>
<li><strong>Water Conservation:</strong> Reduce water usage by 25% by 2030</li>
<li><strong>Sustainable Sourcing:</strong> Source 100% renewable energy for operations by 2035</li>
</ul>

<h2>Pollution Prevention</h2>
<p>We prioritize pollution prevention through:</p>
<ul>
<li>Reducing waste at the source</li>
<li>Recycling and reusing materials where possible</li>
<li>Proper disposal of hazardous materials</li>
<li>Regular environmental audits and monitoring</li>
</ul>

<h2>Regulatory Compliance</h2>
<p>Acme Corporation complies with all applicable environmental laws, regulations, and permits. We maintain environmental management systems to track compliance and continuously improve our environmental performance.</p>

<h2>Employee Responsibilities</h2>
<p>All employees are expected to support our environmental initiatives:</p>
<ul>
<li>Conserve energy by turning off lights and equipment when not in use</li>
<li>Recycle paper, plastics, and other recyclable materials</li>
<li>Minimize printing and use double-sided printing when necessary</li>
<li>Report environmental concerns or violations</li>
<li>Participate in sustainability programs and training</li>
</ul>

<h2>Continuous Improvement</h2>
<p>We regularly review and update our environmental objectives and programs. Annual sustainability reports track progress against our goals and identify areas for improvement.</p>

<h2>Stakeholder Engagement</h2>
<p>We engage with stakeholders including employees, customers, suppliers, and communities to promote environmental responsibility throughout our value chain.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política Ambiental",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique Environnementale",
      },
      { languageCode: "de", languageName: "German", title: "Umweltrichtlinie" },
    ],
  },
  {
    title: "Business Continuity Policy",
    slug: "business-continuity",
    policyType: "OTHER",
    category: "Operations",
    summary: "Framework for maintaining operations during disruptions.",
    content: `<h1>Business Continuity Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes a framework for maintaining critical business operations during and after disruptions. Effective business continuity planning protects Acme Corporation's stakeholders, reputation, and financial stability.</p>

<h2>Scope</h2>
<p>This policy applies to all business units, facilities, and operations. It covers various disruption scenarios including natural disasters, cyber incidents, pandemics, supply chain failures, and infrastructure outages.</p>

<h2>Business Continuity Program</h2>
<p>The business continuity program includes:</p>
<ul>
<li><strong>Business Impact Analysis (BIA):</strong> Identify critical functions and recovery priorities</li>
<li><strong>Risk Assessment:</strong> Evaluate threats and vulnerabilities</li>
<li><strong>Recovery Strategies:</strong> Develop plans to restore operations</li>
<li><strong>Plan Development:</strong> Document detailed recovery procedures</li>
<li><strong>Testing and Exercises:</strong> Validate plans through regular testing</li>
<li><strong>Maintenance:</strong> Update plans based on changes and lessons learned</li>
</ul>

<h2>Recovery Time Objectives</h2>
<table>
<tr><th>Function Tier</th><th>Recovery Time</th><th>Examples</th></tr>
<tr><td>Tier 1 - Critical</td><td>0-4 hours</td><td>Customer service, payment processing</td></tr>
<tr><td>Tier 2 - Essential</td><td>4-24 hours</td><td>HR systems, internal communications</td></tr>
<tr><td>Tier 3 - Important</td><td>1-3 days</td><td>Training, non-critical reporting</td></tr>
<tr><td>Tier 4 - Deferrable</td><td>3+ days</td><td>Long-term projects, archives</td></tr>
</table>

<h2>Roles and Responsibilities</h2>
<ul>
<li><strong>Crisis Management Team:</strong> Overall coordination and decision-making</li>
<li><strong>Business Unit Leaders:</strong> Develop and maintain unit-level plans</li>
<li><strong>IT Recovery Team:</strong> Technology restoration and data recovery</li>
<li><strong>Communications Team:</strong> Internal and external stakeholder communications</li>
</ul>

<h2>Testing Requirements</h2>
<p>Business continuity plans must be tested:</p>
<ul>
<li>Desktop exercises: Annually</li>
<li>Functional exercises: Every 18 months</li>
<li>Full-scale exercises: Every 3 years</li>
</ul>

<h2>Plan Activation</h2>
<p>Plans are activated when a disruption impacts or threatens to impact critical business functions. The Crisis Management Team determines activation level and coordinates response.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Continuidad del Negocio",
      },
    ],
  },
  {
    title: "Insider Trading Policy",
    slug: "insider-trading",
    policyType: "OTHER",
    category: "Compliance",
    summary: "Prohibits trading on material non-public information.",
    content: `<h1>Insider Trading Policy</h1>
<h2>Purpose</h2>
<p>This policy prohibits trading in securities while in possession of material non-public information and establishes procedures to prevent insider trading. Violations can result in severe civil and criminal penalties for individuals and the company.</p>

<h2>Prohibition</h2>
<p>The following activities are strictly prohibited:</p>
<ul>
<li>Trading in company securities while in possession of material non-public information (MNPI)</li>
<li>Sharing MNPI with others who may trade ("tipping")</li>
<li>Trading in securities of other companies based on MNPI learned through your position</li>
<li>Recommending trades to others while in possession of MNPI</li>
</ul>

<h2>Material Non-Public Information</h2>
<p>Information is "material" if a reasonable investor would consider it important in making an investment decision. Examples include:</p>
<ul>
<li>Financial results before public announcement</li>
<li>Mergers, acquisitions, or divestitures</li>
<li>Major new contracts or loss of significant business</li>
<li>Changes in executive leadership</li>
<li>Significant litigation developments</li>
<li>Cybersecurity incidents</li>
</ul>

<h2>Blackout Periods</h2>
<p>Trading is prohibited during blackout periods:</p>
<ul>
<li><strong>Quarterly Blackouts:</strong> From 15 days before quarter-end until 2 business days after earnings release</li>
<li><strong>Event-Specific Blackouts:</strong> As announced by Legal for significant corporate events</li>
</ul>

<h2>Pre-Clearance Requirements</h2>
<p>The following individuals must pre-clear all trades with the Legal department:</p>
<ul>
<li>Directors and executive officers</li>
<li>Employees with regular access to financial information</li>
<li>Anyone designated as an "insider" by Legal</li>
</ul>

<h2>Trading Plans</h2>
<p>Employees may establish 10b5-1 trading plans to enable trading during blackout periods. Plans must be approved by Legal and meet SEC requirements.</p>

<h2>Consequences</h2>
<p>Violations may result in termination and referral to regulatory authorities for prosecution. SEC penalties can include disgorgement of profits, fines up to three times profits, and imprisonment.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Uso de Información Privilegiada",
      },
    ],
  },
  {
    title: "Antitrust and Competition Policy",
    slug: "antitrust",
    policyType: "OTHER",
    category: "Legal",
    summary: "Ensures compliance with antitrust and competition laws.",
    content: `<h1>Antitrust and Competition Policy</h1>
<h2>Policy Statement</h2>
<p>Acme Corporation is committed to fair and vigorous competition in compliance with all antitrust and competition laws. These laws protect the competitive process and benefit consumers through lower prices, better quality, and innovation.</p>

<h2>Scope</h2>
<p>This policy applies to all employees worldwide. Antitrust laws vary by jurisdiction, but the principles in this policy apply globally. When in doubt, consult with Legal before taking action.</p>

<h2>Prohibited Conduct</h2>
<p>The following conduct is strictly prohibited:</p>
<ul>
<li><strong>Price Fixing:</strong> Any agreement with competitors about prices, discounts, or pricing policies</li>
<li><strong>Market Allocation:</strong> Agreements to divide markets, territories, or customers</li>
<li><strong>Bid Rigging:</strong> Coordinating bids with competitors on contracts</li>
<li><strong>Group Boycotts:</strong> Agreements to refuse to deal with certain customers or suppliers</li>
<li><strong>Output Restrictions:</strong> Agreements to limit production or capacity</li>
</ul>

<h2>Competitor Interactions</h2>
<p>Exercise extreme caution when interacting with competitors:</p>
<ul>
<li>Never discuss pricing, costs, margins, or pricing strategies</li>
<li>Never discuss customer relationships or sales territories</li>
<li>Never discuss capacity, production plans, or market strategies</li>
<li>Leave immediately if competitors raise these topics at trade associations</li>
<li>Document any suspicious conversations and report to Legal</li>
</ul>

<h2>Trade Association Participation</h2>
<p>Participation in trade associations must be approved by Legal. Meetings must have written agendas and minutes. Antitrust guidelines must be distributed at meetings.</p>

<h2>Collecting Competitive Information</h2>
<p>Gathering competitive intelligence must be done legally and ethically:</p>
<ul>
<li>Use publicly available information</li>
<li>Do not misrepresent yourself to obtain information</li>
<li>Do not seek confidential information from competitors' employees</li>
</ul>

<h2>Consequences</h2>
<p>Antitrust violations can result in criminal prosecution, substantial fines, and imprisonment. The company may also face treble damages in civil lawsuits. Employees who violate this policy are subject to termination.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política Antimonopolio",
      },
      {
        languageCode: "de",
        languageName: "German",
        title: "Kartellrecht und Wettbewerbsrichtlinie",
      },
    ],
  },
];

// Static array of 26 generated policies with substantial, unique content
const GENERATED_POLICIES: PolicyDefinition[] = [
  {
    title: "Overtime Compensation Policy",
    slug: "overtime-compensation",
    policyType: "OTHER",
    category: "HR",
    summary:
      "Establishes guidelines for overtime eligibility, authorization, and compensation.",
    content: `<h1>Overtime Compensation Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes guidelines for overtime work to ensure compliance with the Fair Labor Standards Act (FLSA) and state wage and hour laws while effectively managing labor costs and employee workload.</p>

<h2>Scope</h2>
<p>This policy applies to all non-exempt employees eligible for overtime compensation under federal and state law. Exempt employees are not eligible for overtime pay.</p>

<h2>Definitions</h2>
<ul>
<li><strong>Non-Exempt Employee:</strong> Employee entitled to overtime pay under FLSA</li>
<li><strong>Exempt Employee:</strong> Employee who meets FLSA exemption criteria and is not entitled to overtime</li>
<li><strong>Regular Rate:</strong> Employee's hourly rate including shift differentials and non-discretionary bonuses</li>
<li><strong>Workweek:</strong> Seven consecutive 24-hour periods beginning Sunday at 12:00 AM</li>
</ul>

<h2>Overtime Authorization</h2>
<p>All overtime must be authorized in advance:</p>
<ul>
<li>Employees must obtain manager approval before working overtime</li>
<li>Managers must approve overtime in the timekeeping system</li>
<li>Unauthorized overtime, while compensable, may result in disciplinary action</li>
<li>Emergency situations may require overtime without prior approval; document immediately after</li>
</ul>

<h2>Overtime Calculation</h2>
<table>
<tr><th>Scenario</th><th>Rate</th></tr>
<tr><td>Hours over 40 in workweek</td><td>1.5x regular rate</td></tr>
<tr><td>Hours over 8 in workday (CA only)</td><td>1.5x regular rate</td></tr>
<tr><td>Hours over 12 in workday (CA only)</td><td>2x regular rate</td></tr>
<tr><td>7th consecutive day worked (CA only)</td><td>1.5x first 8 hours, 2x thereafter</td></tr>
</table>

<h2>Time Recording</h2>
<p>Accurate time recording is essential. Employees must record all hours worked, including overtime, in the timekeeping system. Falsifying time records or working "off the clock" is strictly prohibited.</p>

<h2>Compensatory Time</h2>
<p>Private sector employees must receive overtime pay; compensatory time off in lieu of overtime pay is generally not permitted except for public sector employees as allowed by law.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Compensación por Horas Extra",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique de Rémunération des Heures Supplémentaires",
      },
    ],
  },
  {
    title: "Leave of Absence Policy",
    slug: "leave-of-absence",
    policyType: "OTHER",
    category: "HR",
    summary:
      "Comprehensive guidelines for all types of employee leave including FMLA, medical, and personal leave.",
    content: `<h1>Leave of Absence Policy</h1>
<h2>Purpose</h2>
<p>This policy outlines the types of leaves available to employees and the procedures for requesting and managing leave. Acme Corporation is committed to supporting employees who need time away from work for qualifying reasons.</p>

<h2>Types of Leave</h2>

<h3>Family and Medical Leave (FMLA)</h3>
<p>Eligible employees may take up to 12 weeks of unpaid, job-protected leave per year for:</p>
<ul>
<li>Birth and care of a newborn child</li>
<li>Placement of a child for adoption or foster care</li>
<li>Care for an immediate family member with a serious health condition</li>
<li>Medical leave when unable to work due to a serious health condition</li>
<li>Military family leave (up to 26 weeks for caregiver leave)</li>
</ul>

<h3>Short-Term Disability</h3>
<p>Provides income replacement for employees unable to work due to non-work-related illness or injury. Benefits begin after a 7-day waiting period and continue for up to 26 weeks at 60% of base salary.</p>

<h3>Long-Term Disability</h3>
<p>Provides income replacement for extended disabilities. Benefits begin after 180 days and provide 60% of base salary up to policy limits.</p>

<h3>Personal Leave</h3>
<p>Unpaid leave for personal reasons not covered by other leave types. Requires manager and HR approval. Maximum duration is 30 days.</p>

<h3>Bereavement Leave</h3>
<table>
<tr><th>Relationship</th><th>Paid Days</th></tr>
<tr><td>Spouse, child, parent</td><td>5 days</td></tr>
<tr><td>Sibling, grandparent, in-law</td><td>3 days</td></tr>
<tr><td>Other family member</td><td>1 day</td></tr>
</table>

<h2>Requesting Leave</h2>
<p>Employees must submit leave requests through the HR system at least 30 days in advance when foreseeable, or as soon as practicable for unexpected leaves. Medical certification may be required.</p>

<h2>Benefits During Leave</h2>
<p>Health insurance continues during approved FMLA leave. Employees on unpaid leave must arrange to pay their portion of premiums. PTO does not accrue during unpaid leave.</p>

<h2>Return to Work</h2>
<p>Employees returning from FMLA or other job-protected leave are entitled to return to their same or equivalent position. Fitness-for-duty certification may be required after medical leave.</p>`,
    translations: [
      {
        languageCode: "de",
        languageName: "German",
        title: "Richtlinie für Beurlaubung",
      },
    ],
  },
  {
    title: "Performance Management Policy",
    slug: "performance-management",
    policyType: "OTHER",
    category: "HR",
    summary:
      "Framework for ongoing performance feedback, goal setting, and annual reviews.",
    content: `<h1>Performance Management Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes a consistent, fair, and effective performance management process. Performance management at Acme Corporation is an ongoing process designed to develop employees, recognize achievements, and address performance concerns.</p>

<h2>Performance Management Cycle</h2>
<ul>
<li><strong>Goal Setting (January):</strong> Employees and managers collaborate to set annual objectives aligned with business priorities</li>
<li><strong>Quarterly Check-ins:</strong> Regular conversations about progress, obstacles, and development</li>
<li><strong>Mid-Year Review (July):</strong> Formal checkpoint to assess progress and adjust goals</li>
<li><strong>Annual Review (December):</strong> Comprehensive evaluation of performance against goals</li>
</ul>

<h2>Goal Setting</h2>
<p>Goals should follow the SMART framework:</p>
<ul>
<li><strong>Specific:</strong> Clear and well-defined</li>
<li><strong>Measurable:</strong> Quantifiable success criteria</li>
<li><strong>Achievable:</strong> Realistic and attainable</li>
<li><strong>Relevant:</strong> Aligned with team and company objectives</li>
<li><strong>Time-bound:</strong> Clear deadlines</li>
</ul>

<h2>Performance Ratings</h2>
<table>
<tr><th>Rating</th><th>Description</th></tr>
<tr><td>Exceptional</td><td>Consistently exceeds all expectations; role model</td></tr>
<tr><td>Exceeds Expectations</td><td>Frequently exceeds expectations; strong performer</td></tr>
<tr><td>Meets Expectations</td><td>Consistently meets expectations; solid contributor</td></tr>
<tr><td>Needs Improvement</td><td>Does not consistently meet expectations; requires development</td></tr>
<tr><td>Unsatisfactory</td><td>Fails to meet minimum expectations; immediate action required</td></tr>
</table>

<h2>Performance Improvement Plans</h2>
<p>Employees with "Needs Improvement" ratings may be placed on a Performance Improvement Plan (PIP). PIPs document specific areas for improvement, support provided, and a timeline for achieving acceptable performance.</p>

<h2>Documentation</h2>
<p>All performance discussions, feedback, and reviews must be documented in the performance management system. Documentation supports fair decisions and provides a record of employee development.</p>

<h2>Calibration</h2>
<p>Performance ratings are calibrated across the organization to ensure consistency and fairness. Managers participate in calibration sessions before finalizing ratings.</p>`,
    translations: [],
  },
  {
    title: "Grievance Procedure Policy",
    slug: "grievance-procedure",
    policyType: "OTHER",
    category: "HR",
    summary:
      "Formal process for employees to raise workplace concerns and have them addressed fairly.",
    content: `<h1>Grievance Procedure Policy</h1>
<h2>Purpose</h2>
<p>This policy provides employees with a formal process to raise workplace concerns and have them addressed fairly and promptly. Acme Corporation is committed to resolving employee grievances through open communication and fair procedures.</p>

<h2>Scope</h2>
<p>This procedure covers complaints related to working conditions, application of company policies, treatment by supervisors or coworkers, and other workplace concerns. Issues covered by other specific policies (harassment, discrimination, safety) should be reported through those channels.</p>

<h2>Informal Resolution</h2>
<p>Employees are encouraged to first attempt to resolve concerns informally by discussing them with their immediate supervisor. Many issues can be resolved through direct communication without formal procedures.</p>

<h2>Formal Grievance Process</h2>

<h3>Step 1: Written Grievance</h3>
<ul>
<li>Submit written grievance to HR within 10 business days of the incident</li>
<li>Include description of concern, relevant dates, witnesses, and desired resolution</li>
<li>HR acknowledges receipt within 2 business days</li>
</ul>

<h3>Step 2: Investigation</h3>
<ul>
<li>HR investigates the grievance, interviewing relevant parties</li>
<li>Investigation completed within 15 business days</li>
<li>Written response provided to employee</li>
</ul>

<h3>Step 3: Appeal</h3>
<ul>
<li>If dissatisfied, employee may appeal to HR Director within 5 business days</li>
<li>HR Director reviews the grievance and investigation</li>
<li>Final decision provided within 10 business days</li>
</ul>

<h2>Non-Retaliation</h2>
<p>Retaliation against employees who file grievances in good faith is strictly prohibited. Employees who believe they have experienced retaliation should report it immediately to HR or through the Ethics Hotline.</p>

<h2>Confidentiality</h2>
<p>Grievances are handled confidentially to the extent possible. Information is shared only with those who have a need to know for investigation and resolution purposes.</p>

<h2>Record Keeping</h2>
<p>Documentation of grievances and their resolution is maintained in confidential HR files for a minimum of five years.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Procedimiento de Quejas",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique de Procédure de Réclamation",
      },
    ],
  },
  {
    title: "Background Check Policy",
    slug: "background-check",
    policyType: "DATA_PRIVACY",
    category: "HR",
    summary:
      "Requirements and procedures for pre-employment and ongoing background screening.",
    content: `<h1>Background Check Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes requirements for background checks to ensure a safe workplace, protect company assets, and comply with regulatory requirements. Background screening helps Acme Corporation make informed hiring decisions while respecting candidate privacy.</p>

<h2>Scope</h2>
<p>Background checks are conducted for all candidates receiving conditional offers of employment. The scope of the check varies based on position level and access to sensitive information or assets.</p>

<h2>Types of Background Checks</h2>
<table>
<tr><th>Position Level</th><th>Checks Performed</th></tr>
<tr><td>All Positions</td><td>Identity verification, SSN trace, criminal history (7 years)</td></tr>
<tr><td>Positions with Financial Access</td><td>Above + credit check, professional license verification</td></tr>
<tr><td>Management/Executive</td><td>Above + education verification, employment history</td></tr>
<tr><td>Healthcare Positions</td><td>Above + OIG/GSA exclusion lists, state licensing board</td></tr>
</table>

<h2>Candidate Authorization</h2>
<p>Before conducting any background check, Acme Corporation will:</p>
<ul>
<li>Provide written disclosure that a background check will be performed</li>
<li>Obtain written authorization from the candidate</li>
<li>Provide a copy of "A Summary of Your Rights Under the FCRA"</li>
</ul>

<h2>Adverse Action Process</h2>
<p>If a hiring decision is influenced by background check results:</p>
<ul>
<li>Candidate receives a pre-adverse action notice with a copy of the report</li>
<li>Candidate has 5 business days to dispute inaccurate information</li>
<li>After the waiting period, a final adverse action notice is sent if appropriate</li>
</ul>

<h2>Individualized Assessment</h2>
<p>Criminal history is evaluated considering the nature of the offense, time elapsed, and relevance to the position. Acme Corporation does not automatically disqualify candidates based on criminal history but conducts individualized assessments.</p>

<h2>Ongoing Screening</h2>
<p>Employees in sensitive positions may be subject to periodic rescreening. Employees must report any arrests or convictions that occur during employment.</p>

<h2>Confidentiality</h2>
<p>Background check results are confidential and stored securely. Access is limited to HR personnel with a need to know.</p>`,
    translations: [
      {
        languageCode: "de",
        languageName: "German",
        title: "Richtlinie für Hintergrundüberprüfungen",
      },
    ],
  },
  {
    title: "Employee Referral Policy",
    slug: "employee-referral",
    policyType: "OTHER",
    category: "HR",
    summary:
      "Incentive program for employees who refer qualified candidates for open positions.",
    content: `<h1>Employee Referral Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes the Employee Referral Program, which rewards employees for referring qualified candidates who are hired. Employee referrals are one of our most effective recruiting sources, yielding candidates who are often a strong cultural fit.</p>

<h2>Eligibility</h2>
<p>All regular full-time and part-time employees are eligible to participate in the referral program, except:</p>
<ul>
<li>Hiring managers for the position being filled</li>
<li>HR and Talent Acquisition team members</li>
<li>Executives at VP level and above</li>
<li>Employees on performance improvement plans</li>
</ul>

<h2>Referral Bonuses</h2>
<table>
<tr><th>Position Level</th><th>Bonus Amount</th></tr>
<tr><td>Entry Level / Administrative</td><td>$1,000</td></tr>
<tr><td>Professional / Technical</td><td>$2,500</td></tr>
<tr><td>Senior Professional / Management</td><td>$5,000</td></tr>
<tr><td>Director and Above</td><td>$7,500</td></tr>
<tr><td>Hard-to-Fill Positions (designated)</td><td>Up to $10,000</td></tr>
</table>

<h2>How to Refer</h2>
<ul>
<li>Submit referrals through the Employee Referral Portal in the HR system</li>
<li>Include candidate's resume and your relationship to the candidate</li>
<li>Referrals must be submitted before the candidate applies independently</li>
</ul>

<h2>Payment Schedule</h2>
<p>Referral bonuses are paid as follows:</p>
<ul>
<li>50% after the referred employee completes 30 days of employment</li>
<li>50% after the referred employee completes 90 days of employment</li>
</ul>
<p>If the referred employee or referring employee leaves before the payment milestones, the remaining bonus is forfeited.</p>

<h2>Program Rules</h2>
<ul>
<li>Former employees rehired within 12 months are not eligible for referral bonuses</li>
<li>Referrals of family members require disclosure and may be subject to additional review</li>
<li>Bonuses are subject to applicable taxes</li>
<li>The company reserves the right to modify or discontinue the program</li>
</ul>`,
    translations: [],
  },
  {
    title: "Tuition Reimbursement Policy",
    slug: "tuition-reimbursement",
    policyType: "OTHER",
    category: "HR",
    summary:
      "Financial assistance for employees pursuing job-related education and certifications.",
    content: `<h1>Tuition Reimbursement Policy</h1>
<h2>Purpose</h2>
<p>Acme Corporation supports employee professional development through tuition reimbursement for job-related education. This benefit helps employees enhance their skills while contributing to the company's success.</p>

<h2>Eligibility</h2>
<p>To be eligible for tuition reimbursement, employees must:</p>
<ul>
<li>Be a regular full-time employee for at least 12 months</li>
<li>Maintain satisfactory job performance (meets expectations or above)</li>
<li>Obtain pre-approval before enrolling in courses</li>
<li>Remain employed throughout the course and for 12 months after completion</li>
</ul>

<h2>Covered Education</h2>
<p>The following educational activities are eligible for reimbursement:</p>
<ul>
<li>Undergraduate and graduate degree programs from accredited institutions</li>
<li>Professional certifications relevant to current or future role</li>
<li>Individual courses directly related to job responsibilities</li>
</ul>

<h2>Reimbursement Limits</h2>
<table>
<tr><th>Program Type</th><th>Annual Maximum</th></tr>
<tr><td>Undergraduate degree</td><td>$5,250</td></tr>
<tr><td>Graduate degree (job-related)</td><td>$10,000</td></tr>
<tr><td>Professional certifications</td><td>$3,000</td></tr>
</table>
<p>Reimbursement covers tuition, required fees, and books. Travel, parking, and personal expenses are not covered.</p>

<h2>Grade Requirements</h2>
<ul>
<li>Undergraduate courses: Minimum grade of C</li>
<li>Graduate courses: Minimum grade of B</li>
<li>Pass/Fail courses: Passing grade required</li>
<li>Certifications: Must pass certification exam</li>
</ul>

<h2>Repayment Agreement</h2>
<p>Employees who voluntarily leave within 12 months of receiving reimbursement must repay:</p>
<ul>
<li>100% if leaving within 6 months of reimbursement</li>
<li>50% if leaving between 6-12 months of reimbursement</li>
</ul>

<h2>Application Process</h2>
<p>Submit tuition reimbursement requests through the HR system at least 30 days before the course start date. Include course information, costs, and a statement of job relevance. Manager and HR approval required.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Reembolso de Matrícula",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique de Remboursement des Frais de Scolarité",
      },
    ],
  },
  {
    title: "Company Vehicle Use Policy",
    slug: "company-vehicle-use",
    policyType: "OTHER",
    category: "Operations",
    summary:
      "Guidelines for safe and appropriate use of company-owned vehicles.",
    content: `<h1>Company Vehicle Use Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes guidelines for the safe and appropriate use of company-owned vehicles. Proper vehicle use protects employee safety, reduces liability, and ensures efficient operation of company assets.</p>

<h2>Eligibility</h2>
<p>To operate a company vehicle, employees must:</p>
<ul>
<li>Be at least 21 years old</li>
<li>Possess a valid driver's license appropriate for the vehicle type</li>
<li>Maintain an acceptable driving record (reviewed annually via MVR check)</li>
<li>Complete defensive driving training</li>
<li>Be approved by Fleet Management</li>
</ul>

<h2>Acceptable Use</h2>
<p>Company vehicles may be used for:</p>
<ul>
<li>Business travel and client visits</li>
<li>Transportation of company materials and equipment</li>
<li>Commuting if specifically authorized</li>
</ul>

<h2>Prohibited Use</h2>
<ul>
<li>Personal use unless explicitly authorized</li>
<li>Transporting non-employees without business purpose</li>
<li>Operating while under the influence of drugs or alcohol</li>
<li>Using mobile devices while driving (hands-free only)</li>
<li>Transporting hazardous materials without proper authorization</li>
<li>Allowing unauthorized persons to drive the vehicle</li>
</ul>

<h2>Driver Responsibilities</h2>
<ul>
<li>Always wear seatbelts and require all passengers to do the same</li>
<li>Obey all traffic laws and speed limits</li>
<li>Report all accidents immediately, regardless of severity</li>
<li>Report any mechanical issues or maintenance needs</li>
<li>Keep the vehicle clean and in good condition</li>
<li>Complete vehicle inspection before each trip</li>
</ul>

<h2>Accidents and Violations</h2>
<p>Employees must report all accidents to their supervisor and Fleet Management within 24 hours. Employees are personally responsible for traffic violations and fines. Multiple violations may result in loss of driving privileges.</p>

<h2>Maintenance</h2>
<p>Regular maintenance is scheduled by Fleet Management. Employees must return vehicles for scheduled service and report any unusual noises, warning lights, or performance issues immediately.</p>`,
    translations: [
      {
        languageCode: "de",
        languageName: "German",
        title: "Richtlinie zur Nutzung von Firmenfahrzeugen",
      },
    ],
  },
  {
    title: "Expense Card Use Policy",
    slug: "expense-card-use",
    policyType: "OTHER",
    category: "Finance",
    summary:
      "Guidelines for proper use of corporate credit cards for business expenses.",
    content: `<h1>Expense Card Use Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes guidelines for the use of company expense cards to ensure appropriate business spending, accurate record-keeping, and compliance with company expense policies.</p>

<h2>Eligibility</h2>
<p>Corporate expense cards are issued to employees who have regular business travel or purchasing needs. Approval requires manager recommendation and Finance approval based on business need.</p>

<h2>Authorized Use</h2>
<p>Expense cards may be used for:</p>
<ul>
<li>Business travel (airfare, lodging, ground transportation)</li>
<li>Business meals and entertainment within policy limits</li>
<li>Office supplies and equipment when approved</li>
<li>Conference and training registration</li>
<li>Client-related expenses as approved</li>
</ul>

<h2>Prohibited Use</h2>
<ul>
<li>Personal expenses of any kind</li>
<li>Cash advances or ATM withdrawals</li>
<li>Gift cards (except approved employee recognition)</li>
<li>Alcoholic beverages (except approved client entertainment)</li>
<li>Any expense that violates company policy</li>
</ul>

<h2>Spending Limits</h2>
<table>
<tr><th>Category</th><th>Single Transaction</th><th>Monthly Limit</th></tr>
<tr><td>Standard Employee</td><td>$500</td><td>$2,500</td></tr>
<tr><td>Manager</td><td>$2,000</td><td>$10,000</td></tr>
<tr><td>Director+</td><td>$5,000</td><td>$25,000</td></tr>
</table>

<h2>Documentation Requirements</h2>
<p>All expense card transactions must be documented within 5 business days:</p>
<ul>
<li>Original itemized receipt (photos acceptable)</li>
<li>Business purpose of the expense</li>
<li>Names of attendees (for meals/entertainment)</li>
<li>Project or cost center code if applicable</li>
</ul>

<h2>Reconciliation</h2>
<p>Monthly statements must be reconciled within 10 business days of statement date. Late reconciliation may result in suspension of card privileges.</p>

<h2>Lost or Stolen Cards</h2>
<p>Report lost or stolen cards immediately to the card issuer and Finance. Cardholder may be responsible for unauthorized charges resulting from failure to report promptly.</p>`,
    translations: [],
  },
  {
    title: "Meeting Room Policy",
    slug: "meeting-room-policy",
    policyType: "OTHER",
    category: "Operations",
    summary:
      "Guidelines for reserving and using conference rooms and meeting spaces.",
    content: `<h1>Meeting Room Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes guidelines for the fair and efficient use of meeting rooms and conference spaces. Proper meeting room management ensures availability for business needs while maximizing the use of shared resources.</p>

<h2>Reservation System</h2>
<p>All meeting rooms must be reserved through the room booking system in Outlook or the facilities management portal. Walk-in use is permitted only for unreserved rooms and only for 30 minutes or less.</p>

<h2>Booking Guidelines</h2>
<ul>
<li>Reserve rooms only for the time actually needed</li>
<li>Maximum advance booking is 30 days (exceptions for recurring meetings)</li>
<li>Release unused reservations at least 2 hours in advance</li>
<li>Include meeting purpose and expected attendees in the booking</li>
<li>Large conference rooms (10+ capacity) require manager approval for full-day bookings</li>
</ul>

<h2>No-Show Policy</h2>
<p>Rooms not occupied within 10 minutes of the scheduled start time may be released for other use. Repeated no-shows may result in booking restrictions.</p>

<h2>Room Etiquette</h2>
<ul>
<li>Start and end meetings on time to respect subsequent users</li>
<li>Clean up after meetings: dispose of trash, erase whiteboards, return chairs</li>
<li>Report any equipment issues to Facilities immediately</li>
<li>Food and beverages are permitted but clean up is required</li>
<li>Keep noise levels appropriate for the office environment</li>
</ul>

<h2>Video Conference Rooms</h2>
<p>Rooms with video conferencing equipment have priority for meetings requiring this capability. Familiarize yourself with equipment before meetings or contact IT for assistance.</p>

<h2>External Visitors</h2>
<p>Meetings with external visitors require pre-registration through the visitor management system. Escorts are required in certain areas. Confidential materials should not be visible during external meetings.</p>

<h2>After-Hours Use</h2>
<p>Meeting room use outside normal business hours requires prior approval from Facilities. Employees must ensure the building is secured when leaving after hours.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Salas de Reuniones",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique des Salles de Réunion",
      },
    ],
  },
  {
    title: "Visitor Access Policy",
    slug: "visitor-access",
    policyType: "OTHER",
    category: "Security",
    summary:
      "Procedures for registering, escorting, and managing visitors to company facilities.",
    content: `<h1>Visitor Access Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes procedures for managing visitor access to Acme Corporation facilities. Proper visitor management protects our employees, assets, information, and ensures compliance with security requirements.</p>

<h2>Visitor Categories</h2>
<ul>
<li><strong>Business Visitors:</strong> Clients, vendors, partners, candidates for interviews</li>
<li><strong>Personal Visitors:</strong> Friends and family of employees (limited access)</li>
<li><strong>Service Providers:</strong> Contractors, maintenance workers, delivery personnel</li>
<li><strong>Government/Regulatory:</strong> Inspectors, auditors, law enforcement</li>
</ul>

<h2>Pre-Registration</h2>
<p>All visitors must be pre-registered through the visitor management system at least 24 hours in advance when possible. Registration includes:</p>
<ul>
<li>Visitor full name and company</li>
<li>Purpose of visit</li>
<li>Employee host name</li>
<li>Expected arrival and departure times</li>
<li>Areas to be visited</li>
</ul>

<h2>Check-In Procedures</h2>
<ul>
<li>All visitors must check in at reception and present valid photo ID</li>
<li>Visitors sign in and acknowledge visitor policies</li>
<li>Visitors receive a temporary badge that must be visible at all times</li>
<li>Employee hosts are notified when visitors arrive</li>
</ul>

<h2>Escort Requirements</h2>
<table>
<tr><th>Area</th><th>Escort Required?</th></tr>
<tr><td>Lobby and conference rooms</td><td>No (with badge)</td></tr>
<tr><td>General office areas</td><td>Yes</td></tr>
<tr><td>Data centers and server rooms</td><td>Yes, by authorized personnel only</td></tr>
<tr><td>Executive floors</td><td>Yes</td></tr>
</table>

<h2>Prohibited Items</h2>
<p>Visitors may not bring weapons, recording devices (without prior approval), or hazardous materials into the facility.</p>

<h2>Check-Out</h2>
<p>Visitors must check out at reception and return their temporary badge before leaving. Employee hosts are responsible for ensuring visitors check out.</p>

<h2>Emergencies</h2>
<p>In case of emergency evacuation, employee hosts are responsible for ensuring their visitors evacuate and proceed to the assembly point.</p>`,
    translations: [
      {
        languageCode: "de",
        languageName: "German",
        title: "Besucherzugangsrichtlinie",
      },
    ],
  },
  {
    title: "Emergency Response Policy",
    slug: "emergency-response",
    policyType: "OTHER",
    category: "Safety",
    summary:
      "Procedures for responding to workplace emergencies including evacuation and shelter-in-place.",
    content: `<h1>Emergency Response Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes procedures for responding to various workplace emergencies to protect the safety and well-being of all employees, visitors, and contractors. All employees must familiarize themselves with emergency procedures for their work location.</p>

<h2>Emergency Types</h2>
<ul>
<li>Fire or smoke</li>
<li>Medical emergencies</li>
<li>Severe weather (tornado, hurricane)</li>
<li>Earthquake</li>
<li>Active threat/security incident</li>
<li>Chemical spill or hazardous material release</li>
<li>Bomb threat</li>
<li>Utility failure</li>
</ul>

<h2>Emergency Contacts</h2>
<table>
<tr><th>Emergency</th><th>Contact</th></tr>
<tr><td>Life-threatening emergency</td><td>911</td></tr>
<tr><td>Security/non-emergency</td><td>Ext. 5000</td></tr>
<tr><td>Facilities emergency</td><td>Ext. 5001</td></tr>
<tr><td>After-hours security</td><td>555-123-4567</td></tr>
</table>

<h2>Evacuation Procedures</h2>
<ul>
<li>When alarm sounds, evacuate immediately via nearest exit</li>
<li>Do not use elevators</li>
<li>Assist persons with disabilities</li>
<li>Proceed to designated assembly point</li>
<li>Do not re-enter until all-clear is given</li>
<li>Floor wardens conduct sweep and report to Emergency Response Team</li>
</ul>

<h2>Shelter-in-Place</h2>
<p>For severe weather or external threats:</p>
<ul>
<li>Move to interior rooms away from windows</li>
<li>Close all doors</li>
<li>Follow announcements from Emergency Response Team</li>
<li>Remain sheltered until all-clear is given</li>
</ul>

<h2>Medical Emergencies</h2>
<p>Call 911 immediately for serious medical emergencies. Notify reception and security. First aid kits and AEDs are located at marked stations throughout the facility. Trained first responders are identified by badge designations.</p>

<h2>Communication</h2>
<p>Emergency notifications are sent via overhead announcement, text message, and email. Employees must ensure contact information is current in the HR system.</p>

<h2>Training</h2>
<p>Emergency response training is provided during new employee orientation and refreshed annually. Fire drills are conducted quarterly. Active threat training is provided annually.</p>`,
    translations: [],
  },
  {
    title: "Fire Safety Policy",
    slug: "fire-safety",
    policyType: "OTHER",
    category: "Safety",
    summary:
      "Fire prevention measures and emergency response procedures for fire incidents.",
    content: `<h1>Fire Safety Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes fire prevention measures and emergency response procedures to protect life and property. Fire safety is everyone's responsibility, and compliance with this policy is mandatory.</p>

<h2>Fire Prevention</h2>
<ul>
<li>Keep work areas free of combustible materials and clutter</li>
<li>Store flammable materials in approved containers and locations</li>
<li>Do not overload electrical outlets or use damaged cords</li>
<li>Keep heating equipment away from combustible materials</li>
<li>Dispose of waste properly and regularly</li>
<li>Report fire hazards to Facilities immediately</li>
</ul>

<h2>Prohibited Items</h2>
<ul>
<li>Space heaters (unless approved by Facilities)</li>
<li>Candles and open flames</li>
<li>Cooking appliances in non-designated areas</li>
<li>Storage in mechanical or electrical rooms</li>
<li>Blocking fire exits, extinguishers, or sprinkler heads</li>
</ul>

<h2>Fire Detection and Suppression</h2>
<p>The building is equipped with:</p>
<ul>
<li>Smoke detectors and fire alarms on every floor</li>
<li>Automatic sprinkler system throughout</li>
<li>Fire extinguishers at marked locations (inspected monthly)</li>
<li>Emergency lighting and exit signs</li>
</ul>

<h2>In Case of Fire</h2>
<ol>
<li><strong>ALERT:</strong> Activate the nearest fire alarm pull station</li>
<li><strong>EVACUATE:</strong> Leave immediately via nearest safe exit; do not use elevators</li>
<li><strong>CALL:</strong> Call 911 from a safe location</li>
<li><strong>ASSIST:</strong> Help others who need assistance if safe to do so</li>
<li><strong>ASSEMBLE:</strong> Go to designated assembly point and check in with floor warden</li>
</ol>

<h2>Fire Extinguisher Use (PASS Method)</h2>
<p>Only attempt to extinguish small fires if trained and if it's safe to do so:</p>
<ul>
<li><strong>P</strong>ull the pin</li>
<li><strong>A</strong>im at the base of the fire</li>
<li><strong>S</strong>queeze the handle</li>
<li><strong>S</strong>weep from side to side</li>
</ul>

<h2>Fire Drills</h2>
<p>Fire drills are conducted quarterly. All employees must participate and evacuate as if it were a real emergency. Feedback is collected to improve procedures.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Seguridad contra Incendios",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique de Sécurité Incendie",
      },
    ],
  },
  {
    title: "Electrical Safety Policy",
    slug: "electrical-safety",
    policyType: "OTHER",
    category: "Safety",
    summary:
      "Guidelines for safe use of electrical equipment and prevention of electrical hazards.",
    content: `<h1>Electrical Safety Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes guidelines for the safe use of electrical equipment and prevention of electrical hazards. Electrical safety protects employees from shock, burns, and fires caused by electrical hazards.</p>

<h2>General Electrical Safety</h2>
<ul>
<li>Only qualified electricians may perform electrical repairs or modifications</li>
<li>Report damaged outlets, switches, or equipment immediately</li>
<li>Do not use equipment with damaged cords or plugs</li>
<li>Keep electrical equipment away from water and moisture</li>
<li>Never overload circuits or use improper extension cords</li>
<li>Unplug equipment by grasping the plug, not the cord</li>
</ul>

<h2>Extension Cord Use</h2>
<ul>
<li>Use extension cords only temporarily, not as permanent wiring</li>
<li>Use cords rated for the intended load</li>
<li>Do not run cords under carpets, through walls, or across walkways</li>
<li>Do not daisy-chain multiple extension cords</li>
<li>Inspect cords before each use</li>
</ul>

<h2>Power Strip Safety</h2>
<table>
<tr><th>Do</th><th>Do Not</th></tr>
<tr><td>Use UL-listed power strips</td><td>Plug power strips into each other</td></tr>
<tr><td>Use surge protectors for electronics</td><td>Exceed amp/watt ratings</td></tr>
<tr><td>Turn off when not in use</td><td>Cover or conceal power strips</td></tr>
</table>

<h2>Lockout/Tagout</h2>
<p>Before servicing or maintaining equipment that could unexpectedly start up:</p>
<ul>
<li>Notify affected employees</li>
<li>Shut down equipment using normal procedures</li>
<li>Disconnect from energy sources</li>
<li>Apply locks and tags</li>
<li>Verify isolation before work begins</li>
</ul>

<h2>Electrical Emergencies</h2>
<ul>
<li><strong>Electrical shock:</strong> Do not touch the victim; disconnect power source first; call 911</li>
<li><strong>Electrical fire:</strong> Use CO2 or dry chemical extinguisher; never use water</li>
<li><strong>Downed power lines:</strong> Stay at least 35 feet away; call 911</li>
</ul>

<h2>Training</h2>
<p>Employees working with or around electrical equipment receive appropriate training. Qualified electrical workers complete additional certification requirements.</p>`,
    translations: [
      {
        languageCode: "de",
        languageName: "German",
        title: "Richtlinie zur elektrischen Sicherheit",
      },
    ],
  },
  {
    title: "Chemical Handling Policy",
    slug: "chemical-handling",
    policyType: "OTHER",
    category: "Safety",
    summary:
      "Safe handling, storage, and disposal procedures for hazardous chemicals.",
    content: `<h1>Chemical Handling Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes procedures for the safe handling, storage, and disposal of hazardous chemicals in compliance with OSHA's Hazard Communication Standard and other applicable regulations.</p>

<h2>Chemical Inventory</h2>
<p>A complete inventory of all hazardous chemicals used or stored at each facility is maintained by the Safety department. The inventory is updated when new chemicals are introduced or removed.</p>

<h2>Safety Data Sheets (SDS)</h2>
<p>Safety Data Sheets are available for all hazardous chemicals:</p>
<ul>
<li>SDS binders are located in each department that uses chemicals</li>
<li>Electronic SDS database is accessible through the company intranet</li>
<li>Review the SDS before using any chemical for the first time</li>
<li>Contact Safety if an SDS is not available</li>
</ul>

<h2>Labeling Requirements</h2>
<p>All chemical containers must be properly labeled with:</p>
<ul>
<li>Product identifier (chemical name)</li>
<li>Signal word (Danger or Warning)</li>
<li>Hazard pictograms</li>
<li>Hazard statements</li>
<li>Precautionary statements</li>
<li>Supplier information</li>
</ul>

<h2>Personal Protective Equipment</h2>
<p>Appropriate PPE must be worn when handling chemicals as specified in the SDS:</p>
<ul>
<li>Safety glasses or goggles</li>
<li>Chemical-resistant gloves</li>
<li>Lab coats or protective clothing</li>
<li>Respirators when required</li>
<li>Face shields for splash hazards</li>
</ul>

<h2>Storage Requirements</h2>
<ul>
<li>Store chemicals in designated areas with proper ventilation</li>
<li>Separate incompatible chemicals</li>
<li>Keep flammables in approved cabinets</li>
<li>Store at recommended temperatures</li>
<li>Keep containers closed when not in use</li>
</ul>

<h2>Spill Response</h2>
<p>For chemical spills, evacuate the area, notify Safety immediately, and use spill kits only if trained and if it is safe to do so. Large spills or unknown chemicals require professional hazmat response.</p>

<h2>Disposal</h2>
<p>Hazardous waste must be disposed of through the Safety department using approved waste management contractors. Never pour chemicals down drains or dispose of in regular trash.</p>`,
    translations: [],
  },
  {
    title: "Ergonomics Policy",
    slug: "ergonomics",
    policyType: "OTHER",
    category: "Safety",
    summary:
      "Guidelines for ergonomic workstation setup to prevent repetitive strain injuries.",
    content: `<h1>Ergonomics Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes guidelines for ergonomic workstation design to prevent musculoskeletal disorders and repetitive strain injuries. Proper ergonomics increases comfort, productivity, and reduces injury risk.</p>

<h2>Workstation Assessment</h2>
<p>Ergonomic assessments are available to all employees:</p>
<ul>
<li>Request an assessment through the Safety department</li>
<li>Assessments are conducted for new hires and upon request</li>
<li>Reassessments are available after workstation changes or injury</li>
</ul>

<h2>Workstation Setup Guidelines</h2>

<h3>Chair</h3>
<ul>
<li>Seat height: Feet flat on floor, thighs parallel to floor</li>
<li>Seat depth: 2-4 inches between seat edge and back of knees</li>
<li>Lumbar support: Positioned at the curve of lower back</li>
<li>Armrests: Elbows at 90 degrees, shoulders relaxed</li>
</ul>

<h3>Monitor</h3>
<ul>
<li>Distance: Arm's length away (20-26 inches)</li>
<li>Height: Top of screen at or slightly below eye level</li>
<li>Tilt: Slight backward tilt to reduce glare</li>
<li>Position: Directly in front, not to the side</li>
</ul>

<h3>Keyboard and Mouse</h3>
<ul>
<li>Keyboard at elbow height, wrists straight</li>
<li>Mouse next to keyboard at same height</li>
<li>Avoid reaching or stretching for frequently used items</li>
<li>Consider ergonomic keyboards or mice if needed</li>
</ul>

<h2>Work Habits</h2>
<ul>
<li>Take micro-breaks every 30 minutes (look away from screen, stretch hands)</li>
<li>Take longer breaks every 1-2 hours (stand, walk, stretch)</li>
<li>Vary tasks to avoid prolonged repetitive motions</li>
<li>Use keyboard shortcuts to reduce mouse use</li>
</ul>

<h2>Ergonomic Equipment</h2>
<p>Equipment available upon assessment recommendation:</p>
<ul>
<li>Adjustable chairs and monitor arms</li>
<li>Sit-stand desks</li>
<li>Ergonomic keyboards and mice</li>
<li>Document holders and footrests</li>
</ul>

<h2>Reporting Discomfort</h2>
<p>Report any pain, discomfort, or numbness to your supervisor and request an ergonomic assessment. Early intervention prevents minor issues from becoming serious injuries.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Ergonomía",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique Ergonomique",
      },
    ],
  },
  {
    title: "First Aid Policy",
    slug: "first-aid",
    policyType: "OTHER",
    category: "Safety",
    summary:
      "Procedures for providing first aid and accessing emergency medical equipment.",
    content: `<h1>First Aid Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes procedures for providing first aid in the workplace to ensure prompt and appropriate response to injuries and medical emergencies while minimizing risk to responders.</p>

<h2>First Aid Kits</h2>
<p>First aid kits are located throughout the facility:</p>
<ul>
<li>At least one kit per floor in clearly marked locations</li>
<li>Additional kits in high-risk areas (kitchen, warehouse, laboratory)</li>
<li>Inspected monthly and restocked as needed</li>
<li>Contents comply with OSHA requirements</li>
</ul>

<h2>Automated External Defibrillators (AEDs)</h2>
<p>AEDs are located in the following areas:</p>
<ul>
<li>Main lobby</li>
<li>Each floor near elevator banks</li>
<li>Fitness center</li>
<li>Cafeteria</li>
</ul>
<p>AEDs are checked monthly and can be used by anyone in an emergency, as they provide voice instructions.</p>

<h2>Trained First Responders</h2>
<p>Designated employees are trained in first aid and CPR/AED:</p>
<ul>
<li>Identified by special badge designation</li>
<li>At least two responders per floor during business hours</li>
<li>Certification renewed every two years</li>
<li>Volunteer for the program through Safety department</li>
</ul>

<h2>Response Procedures</h2>
<ol>
<li>Ensure the scene is safe</li>
<li>Call 911 for serious emergencies</li>
<li>Notify Security (Ext. 5000) and request first responder</li>
<li>Provide first aid within your training level</li>
<li>Stay with the victim until help arrives</li>
<li>Do not move a seriously injured person unless necessary for safety</li>
</ol>

<h2>Bloodborne Pathogen Protection</h2>
<p>When providing first aid involving blood or body fluids:</p>
<ul>
<li>Use gloves and other PPE from the first aid kit</li>
<li>Avoid direct contact with blood</li>
<li>Dispose of contaminated materials in biohazard containers</li>
<li>Wash hands thoroughly after removing gloves</li>
</ul>

<h2>Incident Reporting</h2>
<p>All first aid incidents must be documented using the incident report form within 24 hours. Reports help identify hazards and improve safety programs.</p>`,
    translations: [
      {
        languageCode: "de",
        languageName: "German",
        title: "Erste-Hilfe-Richtlinie",
      },
    ],
  },
  {
    title: "Incident Investigation Policy",
    slug: "incident-investigation",
    policyType: "OTHER",
    category: "Safety",
    summary:
      "Procedures for investigating workplace incidents to prevent recurrence.",
    content: `<h1>Incident Investigation Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes procedures for investigating workplace incidents to identify root causes, implement corrective actions, and prevent recurrence. Effective incident investigation is essential for continuous safety improvement.</p>

<h2>Reportable Incidents</h2>
<p>The following incidents must be reported and investigated:</p>
<ul>
<li>Injuries requiring medical treatment beyond first aid</li>
<li>Near-misses with potential for serious injury</li>
<li>Property damage exceeding $1,000</li>
<li>Environmental releases</li>
<li>Vehicle accidents</li>
<li>Security incidents</li>
</ul>

<h2>Immediate Response</h2>
<ol>
<li>Ensure the safety of all personnel</li>
<li>Provide first aid or call emergency services as needed</li>
<li>Secure the area to preserve evidence</li>
<li>Notify supervisor and Safety department immediately</li>
<li>Do not disturb the scene unless necessary for safety</li>
</ol>

<h2>Investigation Team</h2>
<p>Investigation teams are formed based on incident severity:</p>
<table>
<tr><th>Severity</th><th>Team Composition</th></tr>
<tr><td>Minor (first aid only)</td><td>Supervisor + Safety representative</td></tr>
<tr><td>Moderate (medical treatment)</td><td>Above + Department manager</td></tr>
<tr><td>Serious (hospitalization, fatality)</td><td>Above + Senior leadership + Legal</td></tr>
</table>

<h2>Investigation Process</h2>
<ol>
<li><strong>Gather facts:</strong> Interview witnesses, review documents, examine physical evidence</li>
<li><strong>Identify causes:</strong> Use root cause analysis techniques (5 Whys, fishbone diagram)</li>
<li><strong>Develop recommendations:</strong> Propose corrective and preventive actions</li>
<li><strong>Document findings:</strong> Complete investigation report</li>
<li><strong>Implement actions:</strong> Assign responsibility and track completion</li>
<li><strong>Verify effectiveness:</strong> Follow up to ensure actions prevent recurrence</li>
</ol>

<h2>Report Distribution</h2>
<p>Investigation reports are distributed to relevant stakeholders and reviewed by the Safety Committee. Lessons learned are communicated to prevent similar incidents at other locations.</p>

<h2>OSHA Reporting</h2>
<p>Fatalities must be reported to OSHA within 8 hours. Hospitalizations, amputations, and loss of eye must be reported within 24 hours.</p>`,
    translations: [],
  },
  {
    title: "Quality Assurance Policy",
    slug: "quality-assurance",
    policyType: "OTHER",
    category: "Operations",
    summary:
      "Framework for maintaining quality standards in products and services.",
    content: `<h1>Quality Assurance Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes Acme Corporation's commitment to quality and the framework for maintaining quality standards in all products and services. Quality is integral to our success and customer satisfaction.</p>

<h2>Quality Principles</h2>
<ul>
<li><strong>Customer Focus:</strong> Understand and meet customer requirements</li>
<li><strong>Leadership:</strong> Leaders establish quality culture and direction</li>
<li><strong>Engagement:</strong> All employees are responsible for quality</li>
<li><strong>Process Approach:</strong> Manage activities as interconnected processes</li>
<li><strong>Continuous Improvement:</strong> Constantly improve products and processes</li>
<li><strong>Evidence-Based Decisions:</strong> Use data to drive quality decisions</li>
</ul>

<h2>Quality Management System</h2>
<p>Our Quality Management System (QMS) is designed to:</p>
<ul>
<li>Meet ISO 9001 requirements</li>
<li>Document procedures and work instructions</li>
<li>Establish quality objectives and metrics</li>
<li>Provide framework for continuous improvement</li>
<li>Ensure regulatory compliance</li>
</ul>

<h2>Quality Objectives</h2>
<table>
<tr><th>Metric</th><th>Target</th></tr>
<tr><td>Customer satisfaction score</td><td>>90%</td></tr>
<tr><td>On-time delivery</td><td>>95%</td></tr>
<tr><td>Defect rate</td><td><1%</td></tr>
<tr><td>First-pass yield</td><td>>98%</td></tr>
<tr><td>Customer complaints</td><td><0.5% of orders</td></tr>
</table>

<h2>Roles and Responsibilities</h2>
<ul>
<li><strong>Quality Department:</strong> Maintains QMS, conducts audits, analyzes data</li>
<li><strong>Department Managers:</strong> Ensure team follows quality procedures</li>
<li><strong>All Employees:</strong> Follow procedures, report quality issues, participate in improvement</li>
</ul>

<h2>Quality Control</h2>
<p>Quality control activities include incoming inspection, in-process checks, final inspection, and testing per documented procedures.</p>

<h2>Corrective and Preventive Action</h2>
<p>When quality issues are identified, CAPA procedures are followed to investigate root causes, implement corrections, and prevent recurrence.</p>

<h2>Internal Audits</h2>
<p>Internal audits are conducted annually to verify QMS effectiveness and identify improvement opportunities.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Aseguramiento de Calidad",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique d'Assurance Qualité",
      },
    ],
  },
  {
    title: "Change Management Policy",
    slug: "change-management",
    policyType: "OTHER",
    category: "Operations",
    summary:
      "Procedures for managing changes to systems, processes, and infrastructure.",
    content: `<h1>Change Management Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes procedures for managing changes to systems, processes, and infrastructure. Effective change management reduces risk, minimizes service disruptions, and ensures changes are properly authorized and documented.</p>

<h2>Scope</h2>
<p>This policy applies to changes affecting:</p>
<ul>
<li>IT systems and infrastructure</li>
<li>Applications and software</li>
<li>Business processes</li>
<li>Facilities and equipment</li>
<li>Organizational structure</li>
</ul>

<h2>Change Categories</h2>
<table>
<tr><th>Category</th><th>Description</th><th>Approval</th></tr>
<tr><td>Standard</td><td>Pre-approved, low-risk, routine changes</td><td>Pre-approved</td></tr>
<tr><td>Normal</td><td>Planned changes following standard process</td><td>CAB approval</td></tr>
<tr><td>Emergency</td><td>Urgent changes to restore service</td><td>Emergency CAB</td></tr>
</table>

<h2>Change Advisory Board (CAB)</h2>
<p>The CAB reviews and approves change requests:</p>
<ul>
<li>Meets weekly to review pending changes</li>
<li>Includes representatives from IT, Operations, Security, and affected business units</li>
<li>Evaluates risk, impact, and readiness</li>
<li>Approves, denies, or requests more information</li>
</ul>

<h2>Change Request Process</h2>
<ol>
<li><strong>Request:</strong> Submit change request with description, justification, and impact analysis</li>
<li><strong>Review:</strong> Technical review and risk assessment</li>
<li><strong>Approval:</strong> CAB review and approval</li>
<li><strong>Schedule:</strong> Coordinate implementation timing</li>
<li><strong>Implement:</strong> Execute change with rollback plan ready</li>
<li><strong>Verify:</strong> Confirm successful implementation</li>
<li><strong>Close:</strong> Document results and lessons learned</li>
</ol>

<h2>Risk Assessment</h2>
<p>All changes are assessed for:</p>
<ul>
<li>Impact on availability and performance</li>
<li>Security implications</li>
<li>Dependencies and affected systems</li>
<li>Rollback feasibility</li>
</ul>

<h2>Change Windows</h2>
<p>Changes to production systems should be implemented during designated maintenance windows unless business-critical. Standard maintenance window: Saturdays 2:00 AM - 6:00 AM.</p>

<h2>Post-Implementation Review</h2>
<p>Significant changes require post-implementation review within 5 business days to assess success and identify improvements.</p>`,
    translations: [
      {
        languageCode: "de",
        languageName: "German",
        title: "Änderungsmanagement-Richtlinie",
      },
    ],
  },
  {
    title: "Project Management Policy",
    slug: "project-management",
    policyType: "OTHER",
    category: "Operations",
    summary:
      "Standards and procedures for managing projects across the organization.",
    content: `<h1>Project Management Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes standards for managing projects to ensure consistent execution, effective resource utilization, and alignment with strategic objectives. All significant initiatives should follow these project management guidelines.</p>

<h2>Project Definition</h2>
<p>A project is a temporary endeavor with defined scope, timeline, and resources. Initiatives meeting these criteria should be managed as projects:</p>
<ul>
<li>Budget exceeds $25,000</li>
<li>Duration exceeds 3 months</li>
<li>Involves multiple departments</li>
<li>Introduces significant change</li>
</ul>

<h2>Project Governance</h2>
<table>
<tr><th>Role</th><th>Responsibilities</th></tr>
<tr><td>Executive Sponsor</td><td>Strategic direction, resource allocation, escalation resolution</td></tr>
<tr><td>Steering Committee</td><td>Oversight, major decisions, priority conflicts</td></tr>
<tr><td>Project Manager</td><td>Day-to-day management, planning, reporting</td></tr>
<tr><td>Project Team</td><td>Deliverable execution, status updates</td></tr>
</table>

<h2>Project Lifecycle</h2>
<ol>
<li><strong>Initiation:</strong> Business case, charter, stakeholder identification</li>
<li><strong>Planning:</strong> Scope, schedule, budget, risk plan, communication plan</li>
<li><strong>Execution:</strong> Deliverable production, team management, issue resolution</li>
<li><strong>Monitoring:</strong> Progress tracking, change control, risk management</li>
<li><strong>Closing:</strong> Final deliverables, lessons learned, documentation</li>
</ol>

<h2>Required Documentation</h2>
<ul>
<li>Project Charter (Initiation gate)</li>
<li>Project Plan (Planning gate)</li>
<li>Status Reports (Weekly)</li>
<li>Change Requests (As needed)</li>
<li>Lessons Learned (Closing)</li>
</ul>

<h2>Status Reporting</h2>
<p>Project managers provide weekly status reports including:</p>
<ul>
<li>Overall project health (Green/Yellow/Red)</li>
<li>Accomplishments since last report</li>
<li>Planned activities for next period</li>
<li>Risks and issues requiring attention</li>
<li>Budget and schedule status</li>
</ul>

<h2>Change Control</h2>
<p>Scope, budget, or schedule changes require formal change request approval. The appropriate approval level depends on change magnitude and impact.</p>`,
    translations: [],
  },
  {
    title: "Code Review Policy",
    slug: "code-review",
    policyType: "OTHER",
    category: "IT",
    summary: "Standards for peer review of software code before deployment.",
    content: `<h1>Code Review Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes standards for code review to ensure code quality, security, and maintainability. Code review is a collaborative process that improves software quality and shares knowledge across the development team.</p>

<h2>Scope</h2>
<p>All code changes must be reviewed before merging to protected branches:</p>
<ul>
<li>Production code (all changes)</li>
<li>Infrastructure as code</li>
<li>Database migrations</li>
<li>Configuration changes</li>
<li>Test code</li>
</ul>

<h2>Review Requirements</h2>
<table>
<tr><th>Change Type</th><th>Minimum Reviewers</th><th>Required Expertise</th></tr>
<tr><td>Standard changes</td><td>1</td><td>Team member</td></tr>
<tr><td>Security-sensitive</td><td>2</td><td>Security champion required</td></tr>
<tr><td>Architecture changes</td><td>2</td><td>Tech lead required</td></tr>
<tr><td>Database changes</td><td>2</td><td>DBA required</td></tr>
</table>

<h2>Author Responsibilities</h2>
<ul>
<li>Keep changes small and focused (ideally <400 lines)</li>
<li>Write clear commit messages and PR descriptions</li>
<li>Include tests for new functionality</li>
<li>Self-review before requesting review</li>
<li>Respond to feedback constructively</li>
</ul>

<h2>Reviewer Responsibilities</h2>
<ul>
<li>Review within 24 business hours</li>
<li>Provide constructive, specific feedback</li>
<li>Check for correctness, security, and maintainability</li>
<li>Verify tests are adequate</li>
<li>Approve only when satisfied with quality</li>
</ul>

<h2>Review Checklist</h2>
<ul>
<li>Does the code work as intended?</li>
<li>Is the code readable and maintainable?</li>
<li>Are there security vulnerabilities?</li>
<li>Is error handling appropriate?</li>
<li>Are tests sufficient?</li>
<li>Does it follow coding standards?</li>
<li>Is documentation updated?</li>
</ul>

<h2>Automated Checks</h2>
<p>Automated checks must pass before manual review:</p>
<ul>
<li>Unit tests</li>
<li>Linting and static analysis</li>
<li>Security scanning</li>
<li>Build verification</li>
</ul>

<h2>Emergency Changes</h2>
<p>Emergency changes may be reviewed post-merge with expedited review documented and retrospective review within 24 hours.</p>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Revisión de Código",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique de Revue de Code",
      },
    ],
  },
  {
    title: "Release Management Policy",
    slug: "release-management",
    policyType: "OTHER",
    category: "IT",
    summary:
      "Procedures for planning, scheduling, and deploying software releases.",
    content: `<h1>Release Management Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes procedures for planning, scheduling, and deploying software releases. Effective release management ensures reliable deployments, minimizes disruptions, and enables rapid delivery of business value.</p>

<h2>Release Types</h2>
<table>
<tr><th>Type</th><th>Frequency</th><th>Content</th></tr>
<tr><td>Major</td><td>Quarterly</td><td>Significant new features, breaking changes</td></tr>
<tr><td>Minor</td><td>Monthly</td><td>New features, enhancements</td></tr>
<tr><td>Patch</td><td>As needed</td><td>Bug fixes, security patches</td></tr>
<tr><td>Hotfix</td><td>Emergency</td><td>Critical production issues</td></tr>
</table>

<h2>Release Planning</h2>
<ul>
<li>Release scope defined during sprint planning</li>
<li>Dependencies identified and coordinated</li>
<li>Release date communicated to stakeholders</li>
<li>Deployment runbook prepared</li>
</ul>

<h2>Release Criteria</h2>
<p>Releases must meet these criteria before deployment:</p>
<ul>
<li>All planned features complete and tested</li>
<li>All automated tests passing</li>
<li>Security scan completed with no critical issues</li>
<li>Performance testing completed (for major releases)</li>
<li>Release notes documented</li>
<li>Rollback plan verified</li>
</ul>

<h2>Deployment Process</h2>
<ol>
<li>Pre-deployment checklist completed</li>
<li>Stakeholders notified of deployment window</li>
<li>Deploy to staging environment and verify</li>
<li>Deploy to production during maintenance window</li>
<li>Execute smoke tests</li>
<li>Monitor for issues</li>
<li>Communicate completion to stakeholders</li>
</ol>

<h2>Rollback Procedures</h2>
<p>If critical issues are detected post-deployment:</p>
<ul>
<li>Assess severity and impact</li>
<li>Decide to fix forward or roll back</li>
<li>Execute rollback within maintenance window if needed</li>
<li>Communicate status to stakeholders</li>
<li>Conduct post-incident review</li>
</ul>

<h2>Release Documentation</h2>
<ul>
<li>Version number and release date</li>
<li>Features and enhancements included</li>
<li>Bug fixes and known issues</li>
<li>Configuration changes required</li>
<li>Database migration notes</li>
</ul>`,
    translations: [
      {
        languageCode: "de",
        languageName: "German",
        title: "Release-Management-Richtlinie",
      },
    ],
  },
  {
    title: "Patch Management Policy",
    slug: "patch-management",
    policyType: "INFORMATION_SECURITY",
    category: "IT",
    summary:
      "Procedures for applying security patches and software updates to systems.",
    content: `<h1>Patch Management Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes procedures for applying security patches and software updates to protect systems from vulnerabilities. Timely patching is critical to maintaining security posture and regulatory compliance.</p>

<h2>Scope</h2>
<p>This policy applies to all IT assets including:</p>
<ul>
<li>Operating systems (servers and workstations)</li>
<li>Applications and middleware</li>
<li>Network devices (routers, switches, firewalls)</li>
<li>Database systems</li>
<li>Security software</li>
</ul>

<h2>Patch Classification and Timelines</h2>
<table>
<tr><th>Severity</th><th>Description</th><th>Deployment Timeline</th></tr>
<tr><td>Critical</td><td>Actively exploited or high CVSS score</td><td>Within 72 hours</td></tr>
<tr><td>High</td><td>Significant vulnerability</td><td>Within 7 days</td></tr>
<tr><td>Medium</td><td>Moderate risk</td><td>Within 30 days</td></tr>
<tr><td>Low</td><td>Minor vulnerability</td><td>Next maintenance window</td></tr>
</table>

<h2>Patch Process</h2>
<ol>
<li><strong>Identification:</strong> Monitor vendor notifications and security bulletins</li>
<li><strong>Assessment:</strong> Evaluate applicability and risk to environment</li>
<li><strong>Testing:</strong> Test patches in non-production environment</li>
<li><strong>Approval:</strong> Obtain approval through change management</li>
<li><strong>Deployment:</strong> Deploy to production systems</li>
<li><strong>Verification:</strong> Confirm successful installation</li>
<li><strong>Documentation:</strong> Update asset inventory and compliance records</li>
</ol>

<h2>Exceptions</h2>
<p>Systems that cannot be patched within required timelines require:</p>
<ul>
<li>Documented risk acceptance from system owner</li>
<li>Compensating controls (network segmentation, monitoring)</li>
<li>Remediation plan with timeline</li>
<li>Regular review and reauthorization</li>
</ul>

<h2>Automated Patching</h2>
<p>Where possible, automated patching is implemented for:</p>
<ul>
<li>Workstation operating systems</li>
<li>Endpoint security software</li>
<li>Standard applications</li>
</ul>

<h2>Reporting</h2>
<p>Monthly patch compliance reports are generated showing:</p>
<ul>
<li>Patching compliance by system type</li>
<li>Outstanding critical and high vulnerabilities</li>
<li>Exception inventory</li>
</ul>`,
    translations: [],
  },
  {
    title: "Network Security Policy",
    slug: "network-security",
    policyType: "INFORMATION_SECURITY",
    category: "IT",
    summary:
      "Requirements for securing network infrastructure and communications.",
    content: `<h1>Network Security Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes requirements for securing network infrastructure and communications to protect company data and systems from unauthorized access, interception, and disruption.</p>

<h2>Network Architecture</h2>
<ul>
<li>Networks are segmented by function and sensitivity</li>
<li>Production, development, and corporate networks are separated</li>
<li>DMZ isolates public-facing systems</li>
<li>Sensitive systems are placed in restricted network segments</li>
</ul>

<h2>Firewall Requirements</h2>
<ul>
<li>All network perimeters protected by firewalls</li>
<li>Default deny policy for inbound traffic</li>
<li>Rules documented and reviewed quarterly</li>
<li>Changes follow change management process</li>
<li>Logs retained for 1 year minimum</li>
</ul>

<h2>Network Access Control</h2>
<ul>
<li>All devices authenticated before network access</li>
<li>Unauthorized devices blocked or isolated</li>
<li>Guest networks separated from corporate networks</li>
<li>VPN required for remote access</li>
</ul>

<h2>Encryption</h2>
<table>
<tr><th>Communication Type</th><th>Requirement</th></tr>
<tr><td>Internal sensitive data</td><td>TLS 1.2 or higher</td></tr>
<tr><td>External communications</td><td>TLS 1.2 or higher</td></tr>
<tr><td>Remote access</td><td>VPN with strong encryption</td></tr>
<tr><td>Wireless</td><td>WPA3 or WPA2-Enterprise</td></tr>
</table>

<h2>Intrusion Detection/Prevention</h2>
<ul>
<li>IDS/IPS deployed at network perimeters</li>
<li>Signatures updated regularly</li>
<li>Alerts monitored 24/7 by Security Operations</li>
<li>Incidents investigated and responded to per incident response procedures</li>
</ul>

<h2>Network Monitoring</h2>
<ul>
<li>Network traffic monitored for anomalies</li>
<li>NetFlow data collected and analyzed</li>
<li>Bandwidth utilization tracked</li>
<li>Suspicious activity investigated</li>
</ul>

<h2>Wireless Security</h2>
<ul>
<li>Corporate wireless requires certificate-based authentication</li>
<li>Guest wireless isolated from corporate networks</li>
<li>Rogue access point detection enabled</li>
<li>WPA2-Enterprise minimum; WPA3 preferred</li>
</ul>`,
    translations: [
      {
        languageCode: "es",
        languageName: "Spanish",
        title: "Política de Seguridad de Red",
      },
      {
        languageCode: "fr",
        languageName: "French",
        title: "Politique de Sécurité Réseau",
      },
    ],
  },
  {
    title: "Cloud Security Policy",
    slug: "cloud-security",
    policyType: "INFORMATION_SECURITY",
    category: "IT",
    summary: "Security requirements for cloud services and infrastructure.",
    content: `<h1>Cloud Security Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes security requirements for cloud services and infrastructure. As cloud adoption increases, consistent security controls are essential to protect data and maintain compliance.</p>

<h2>Approved Cloud Providers</h2>
<p>Only approved cloud providers may be used for company data:</p>
<ul>
<li>Microsoft Azure (primary IaaS/PaaS)</li>
<li>Amazon Web Services (approved for specific use cases)</li>
<li>Microsoft 365 (productivity and collaboration)</li>
<li>Salesforce (CRM)</li>
</ul>
<p>New cloud services require security review and approval before use.</p>

<h2>Data Classification in Cloud</h2>
<table>
<tr><th>Data Classification</th><th>Cloud Storage Allowed</th><th>Requirements</th></tr>
<tr><td>Public</td><td>Any approved provider</td><td>Standard controls</td></tr>
<tr><td>Internal</td><td>Approved providers</td><td>Encryption, access controls</td></tr>
<tr><td>Confidential</td><td>Approved providers (US region)</td><td>Encryption, audit logging, MFA</td></tr>
<tr><td>Restricted</td><td>Private cloud only</td><td>All controls + DLP</td></tr>
</table>

<h2>Identity and Access Management</h2>
<ul>
<li>Single sign-on (SSO) required for all cloud services</li>
<li>Multi-factor authentication (MFA) required</li>
<li>Privileged access uses separate accounts</li>
<li>Access reviews conducted quarterly</li>
<li>Service accounts documented and secured</li>
</ul>

<h2>Configuration Security</h2>
<ul>
<li>Cloud Security Posture Management (CSPM) deployed</li>
<li>Infrastructure as Code (IaC) for consistent configuration</li>
<li>Security baselines defined and enforced</li>
<li>Misconfigurations detected and remediated promptly</li>
</ul>

<h2>Data Protection</h2>
<ul>
<li>Encryption at rest using customer-managed keys for sensitive data</li>
<li>Encryption in transit (TLS 1.2+)</li>
<li>Data Loss Prevention (DLP) for confidential data</li>
<li>Backup and recovery tested regularly</li>
</ul>

<h2>Monitoring and Logging</h2>
<ul>
<li>Cloud audit logs collected and retained</li>
<li>Security monitoring integrated with SIEM</li>
<li>Alerts configured for security events</li>
<li>Regular review of cloud security posture</li>
</ul>

<h2>Shared Responsibility</h2>
<p>Understand the shared responsibility model: cloud providers secure the infrastructure; we secure our data, configurations, and access controls.</p>`,
    translations: [
      {
        languageCode: "de",
        languageName: "German",
        title: "Cloud-Sicherheitsrichtlinie",
      },
    ],
  },
];

// ===========================================
// Seeder Function
// ===========================================

export async function seedPolicies(
  prisma: PrismaClient,
  organizationId: string,
  ownerId: string,
): Promise<{
  policyCount: number;
  translationCount: number;
  updatedCount: number;
}> {
  console.log("  Seeding policies...");

  // Combine all policy definitions (11 CORE + 13 ADDITIONAL + 26 GENERATED = 50 total)
  const allPolicies = [
    ...CORE_POLICIES,
    ...ADDITIONAL_POLICIES,
    ...GENERATED_POLICIES,
  ];

  let policyCount = 0;
  let translationCount = 0;
  let updatedCount = 0;

  // Variety of effective dates across years (2023-2025)
  const effectiveDates = [
    new Date("2023-06-15"),
    new Date("2024-01-15"),
    new Date("2024-07-01"),
    new Date("2025-01-15"),
    new Date("2025-06-01"),
  ];

  // Status distribution: ~80% PUBLISHED, ~10% DRAFT, ~10% RETIRED
  // Assign specific policies to DRAFT and RETIRED for variety
  const draftSlugs = new Set([
    "cloud-security", // Recently drafted IT security policy
    "change-management", // Under review
    "project-management", // Being updated
    "code-review", // New engineering standards
    "ergonomics", // Pending safety review
  ]);

  const retiredSlugs = new Set([
    "meeting-room-policy", // Replaced by new booking system
    "visitor-access", // Consolidated into physical security
    "expense-card-use", // Replaced by new expense system
    "company-vehicle-use", // Fleet policy updated
    "employee-referral", // Program restructured
  ]);

  // Version patterns: most v2, some v1 (new), some v3 (heavily revised)
  const v1OnlySlugs = new Set([
    "cloud-security",
    "change-management",
    "code-review",
  ]); // New policies at v1
  const v3Slugs = new Set([
    "code-of-conduct",
    "anti-harassment",
    "information-security",
    "data-privacy",
  ]); // Core policies at v3

  for (let i = 0; i < allPolicies.length; i++) {
    const policyDef = allPolicies[i];

    // Determine status for this policy
    let status: PolicyStatus = "PUBLISHED";
    if (draftSlugs.has(policyDef.slug)) {
      status = "DRAFT";
    } else if (retiredSlugs.has(policyDef.slug)) {
      status = "RETIRED";
    }

    // Determine effective date (rotate through the list)
    const effectiveDate = effectiveDates[i % effectiveDates.length];
    const reviewDate = new Date(
      effectiveDate.getTime() + 365 * 24 * 60 * 60 * 1000,
    ); // 12 months after

    // Determine version pattern
    let maxVersion = 2;
    if (v1OnlySlugs.has(policyDef.slug)) {
      maxVersion = 1;
    } else if (v3Slugs.has(policyDef.slug)) {
      maxVersion = 3;
    }

    // Check if policy already exists (for idempotent upsert)
    const existing = await prisma.policy.findUnique({
      where: {
        organizationId_slug: {
          organizationId,
          slug: policyDef.slug,
        },
      },
      include: {
        versions: {
          where: { isLatest: true },
          take: 1,
        },
      },
    });

    if (existing) {
      // Update existing policy's latest version content
      if (existing.versions.length > 0) {
        const latestVersion = existing.versions[0];
        const updatedContent =
          status === "DRAFT"
            ? policyDef.content
            : policyDef.content.replace(
                "</h1>",
                "</h1>\n<p><em>Updated for 2026 compliance requirements.</em></p>",
              );

        await prisma.policyVersion.update({
          where: { id: latestVersion.id },
          data: {
            content: updatedContent,
            plainText: updatedContent
              .replace(/<[^>]*>/g, " ")
              .replace(/\s+/g, " ")
              .trim(),
            summary: policyDef.summary,
          },
        });

        // Update policy metadata
        await prisma.policy.update({
          where: { id: existing.id },
          data: {
            title: policyDef.title,
            policyType: policyDef.policyType,
            category: policyDef.category,
            status,
            effectiveDate: status === "DRAFT" ? null : effectiveDate,
            reviewDate: status === "DRAFT" ? null : reviewDate,
            retiredAt: status === "RETIRED" ? new Date("2025-12-01") : null,
          },
        });

        updatedCount++;
      }
      continue;
    }

    // Create the policy
    const policy = await prisma.policy.create({
      data: {
        organizationId,
        title: policyDef.title,
        slug: policyDef.slug,
        policyType: policyDef.policyType,
        category: policyDef.category,
        status,
        currentVersion: maxVersion,
        draftContent: status === "DRAFT" ? policyDef.content : null,
        ownerId,
        effectiveDate: status === "DRAFT" ? null : effectiveDate,
        reviewDate: status === "DRAFT" ? null : reviewDate,
        retiredAt: status === "RETIRED" ? new Date("2025-12-01") : null,
        createdById: ownerId,
        createdAt: new Date(effectiveDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days before effective
      },
    });

    // Create version 1 (initial publication)
    // Note: For DRAFT policies, we still create versions but the policy status indicates unpublished
    const version1 = await prisma.policyVersion.create({
      data: {
        organizationId,
        policyId: policy.id,
        version: 1,
        versionLabel: "v1.0",
        content: policyDef.content,
        plainText: policyDef.content
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
        summary: policyDef.summary,
        changeNotes:
          status === "DRAFT" ? "Initial draft" : "Initial publication",
        publishedAt: effectiveDate,
        publishedById: ownerId,
        effectiveDate: effectiveDate,
        isLatest: maxVersion === 1,
      },
    });

    // For v1-only policies, capture the version ID for translations
    let latestVersionId: string | null = maxVersion === 1 ? version1.id : null;

    // Create version 2 if applicable
    if (maxVersion >= 2) {
      const v2Date = new Date(
        effectiveDate.getTime() + 180 * 24 * 60 * 60 * 1000,
      ); // 6 months later
      const updatedContentV2 = policyDef.content.replace(
        "</h1>",
        "</h1>\n<p><em>Updated for 2025 compliance requirements.</em></p>",
      );

      const version2 = await prisma.policyVersion.create({
        data: {
          organizationId,
          policyId: policy.id,
          version: 2,
          versionLabel: "v2.0",
          content: updatedContentV2,
          plainText: updatedContentV2
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
          summary: policyDef.summary,
          changeNotes:
            "Updated for 2025 compliance requirements and regulatory changes.",
          publishedAt: v2Date,
          publishedById: ownerId,
          effectiveDate: v2Date,
          isLatest: maxVersion === 2,
        },
      });

      if (maxVersion === 2) {
        latestVersionId = version2.id;
      }
    }

    // Create version 3 if applicable (core policies only)
    if (maxVersion >= 3) {
      const v3Date = new Date("2026-01-15");
      const updatedContentV3 = policyDef.content.replace(
        "</h1>",
        "</h1>\n<p><em>Updated for 2026 compliance requirements.</em></p>",
      );

      const version3 = await prisma.policyVersion.create({
        data: {
          organizationId,
          policyId: policy.id,
          version: 3,
          versionLabel: "v3.0",
          content: updatedContentV3,
          plainText: updatedContentV3
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
          summary: policyDef.summary,
          changeNotes:
            "Major update for 2026 compliance requirements, regulatory changes, and organizational restructuring.",
          publishedAt: v3Date,
          publishedById: ownerId,
          effectiveDate: v3Date,
          isLatest: true,
        },
      });

      latestVersionId = version3.id;
    }

    policyCount++;

    // Create translations for the latest version (only for PUBLISHED policies with translations)
    if (
      status === "PUBLISHED" &&
      latestVersionId &&
      policyDef.translations.length > 0
    ) {
      for (const trans of policyDef.translations) {
        const translatedContent = generateTranslatedContent(
          policyDef.content,
          trans.languageCode,
        );

        await prisma.policyVersionTranslation.create({
          data: {
            organizationId,
            policyVersionId: latestVersionId,
            languageCode: trans.languageCode,
            languageName: trans.languageName,
            title: trans.title,
            content: translatedContent,
            plainText: translatedContent
              .replace(/<[^>]*>/g, " ")
              .replace(/\s+/g, " ")
              .trim(),
            translatedBy: "AI",
            aiModel: "claude-3-opus",
            reviewStatus:
              trans.languageCode === "es" ? "APPROVED" : "PENDING_REVIEW",
            reviewedAt: trans.languageCode === "es" ? new Date() : null,
            reviewedById: trans.languageCode === "es" ? ownerId : null,
            isStale: false,
          },
        });

        translationCount++;
      }
    }
  }

  console.log(
    `  Created ${policyCount} policies, updated ${updatedCount}, with ${translationCount} translations`,
  );
  return { policyCount, translationCount, updatedCount };
}

// Helper function to generate mock translations
function generateTranslatedContent(
  content: string,
  languageCode: string,
): string {
  // In production, this would use AI translation
  // For demo purposes, we add language markers
  const languageMarkers: Record<string, string> = {
    es: "[ES] ",
    fr: "[FR] ",
    de: "[DE] ",
    pt: "[PT] ",
    zh: "[ZH] ",
  };

  const marker = languageMarkers[languageCode] || "";

  // Add language marker to headings
  return content.replace(/<h([1-6])>/g, `<h$1>${marker}`);
}

// ===========================================
// Standalone execution
// ===========================================

async function main() {
  const prisma = new PrismaClient();

  try {
    // Get test organization and user
    const organization = await prisma.organization.findUnique({
      where: { slug: "acme-corp" },
    });

    if (!organization) {
      console.error("Acme Corp organization not found. Run main seed first.");
      process.exit(1);
    }

    const user = await prisma.user.findFirst({
      where: {
        organizationId: organization.id,
        email: "demo-cco@acme.local",
      },
    });

    if (!user) {
      console.error("Demo CCO user not found. Run main seed first.");
      process.exit(1);
    }

    const result = await seedPolicies(prisma, organization.id, user.id);
    console.log(
      `Seeded ${result.policyCount} policies with ${result.translationCount} translations`,
    );
  } catch (error) {
    console.error("Error seeding policies:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
