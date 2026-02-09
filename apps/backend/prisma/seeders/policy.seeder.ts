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

import { PrismaClient, PolicyType, PolicyStatus, TranslationSource, TranslationReviewStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';

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
    title: 'Code of Conduct',
    slug: 'code-of-conduct',
    policyType: 'CODE_OF_CONDUCT',
    category: 'Ethics',
    summary: 'The foundational document outlining expected behavior and ethical standards for all employees.',
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
      { languageCode: 'es', languageName: 'Spanish', title: 'Código de Conducta' },
      { languageCode: 'fr', languageName: 'French', title: 'Code de Conduite' },
      { languageCode: 'de', languageName: 'German', title: 'Verhaltenskodex' },
      { languageCode: 'pt', languageName: 'Portuguese', title: 'Código de Conduta' },
      { languageCode: 'zh', languageName: 'Chinese', title: '行为准则' },
    ],
  },
  {
    title: 'Anti-Harassment Policy',
    slug: 'anti-harassment',
    policyType: 'ANTI_HARASSMENT',
    category: 'HR',
    summary: 'Defines prohibited harassment behaviors and establishes reporting and investigation procedures.',
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
      { languageCode: 'es', languageName: 'Spanish', title: 'Política Contra el Acoso' },
      { languageCode: 'fr', languageName: 'French', title: 'Politique Anti-Harcèlement' },
      { languageCode: 'de', languageName: 'German', title: 'Anti-Belästigungs-Richtlinie' },
      { languageCode: 'pt', languageName: 'Portuguese', title: 'Política Contra Assédio' },
      { languageCode: 'zh', languageName: 'Chinese', title: '反骚扰政策' },
    ],
  },
  {
    title: 'Anti-Bribery and Corruption Policy',
    slug: 'anti-bribery',
    policyType: 'ANTI_BRIBERY',
    category: 'Compliance',
    summary: 'Prohibits bribery and corrupt practices in all business dealings worldwide.',
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
      { languageCode: 'es', languageName: 'Spanish', title: 'Política Anticorrupción' },
      { languageCode: 'fr', languageName: 'French', title: 'Politique Anti-Corruption' },
      { languageCode: 'de', languageName: 'German', title: 'Antikorruptionsrichtlinie' },
      { languageCode: 'pt', languageName: 'Portuguese', title: 'Política Anticorrupção' },
      { languageCode: 'zh', languageName: 'Chinese', title: '反贿赂和反腐败政策' },
    ],
  },
  {
    title: 'Conflict of Interest Policy',
    slug: 'conflict-of-interest',
    policyType: 'CONFLICTS_OF_INTEREST',
    category: 'Ethics',
    summary: 'Requires disclosure of potential conflicts and provides guidance on managing them.',
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
      { languageCode: 'es', languageName: 'Spanish', title: 'Política de Conflictos de Interés' },
      { languageCode: 'fr', languageName: 'French', title: 'Politique sur les Conflits d\'Intérêts' },
      { languageCode: 'de', languageName: 'German', title: 'Richtlinie zu Interessenkonflikten' },
      { languageCode: 'pt', languageName: 'Portuguese', title: 'Política de Conflito de Interesses' },
      { languageCode: 'zh', languageName: 'Chinese', title: '利益冲突政策' },
    ],
  },
  {
    title: 'Gifts and Entertainment Policy',
    slug: 'gifts-entertainment',
    policyType: 'GIFT_ENTERTAINMENT',
    category: 'Compliance',
    summary: 'Establishes limits and approval requirements for giving and receiving gifts and entertainment.',
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
      { languageCode: 'es', languageName: 'Spanish', title: 'Política de Regalos y Entretenimiento' },
      { languageCode: 'fr', languageName: 'French', title: 'Politique Cadeaux et Divertissements' },
      { languageCode: 'de', languageName: 'German', title: 'Geschenke- und Unterhaltungsrichtlinie' },
      { languageCode: 'pt', languageName: 'Portuguese', title: 'Política de Presentes e Entretenimento' },
      { languageCode: 'zh', languageName: 'Chinese', title: '礼品和招待政策' },
    ],
  },
  {
    title: 'Data Privacy Policy',
    slug: 'data-privacy',
    policyType: 'DATA_PRIVACY',
    category: 'Privacy',
    summary: 'Establishes requirements for protecting personal data and complying with privacy regulations.',
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
      { languageCode: 'es', languageName: 'Spanish', title: 'Política de Privacidad de Datos' },
      { languageCode: 'fr', languageName: 'French', title: 'Politique de Confidentialité des Données' },
      { languageCode: 'de', languageName: 'German', title: 'Datenschutzrichtlinie' },
      { languageCode: 'pt', languageName: 'Portuguese', title: 'Política de Privacidade de Dados' },
      { languageCode: 'zh', languageName: 'Chinese', title: '数据隐私政策' },
    ],
  },
  {
    title: 'Whistleblower Protection Policy',
    slug: 'whistleblower-protection',
    policyType: 'WHISTLEBLOWER',
    category: 'Ethics',
    summary: 'Protects employees who report concerns in good faith from retaliation.',
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
      { languageCode: 'es', languageName: 'Spanish', title: 'Política de Protección de Denunciantes' },
      { languageCode: 'fr', languageName: 'French', title: 'Politique de Protection des Lanceurs d\'Alerte' },
      { languageCode: 'de', languageName: 'German', title: 'Hinweisgeberschutzrichtlinie' },
      { languageCode: 'pt', languageName: 'Portuguese', title: 'Política de Proteção ao Denunciante' },
      { languageCode: 'zh', languageName: 'Chinese', title: '举报人保护政策' },
    ],
  },
  {
    title: 'Information Security Policy',
    slug: 'information-security',
    policyType: 'INFORMATION_SECURITY',
    category: 'IT',
    summary: 'Establishes requirements for protecting company information and systems.',
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
      { languageCode: 'es', languageName: 'Spanish', title: 'Política de Seguridad de la Información' },
      { languageCode: 'fr', languageName: 'French', title: 'Politique de Sécurité de l\'Information' },
      { languageCode: 'de', languageName: 'German', title: 'Informationssicherheitsrichtlinie' },
      { languageCode: 'pt', languageName: 'Portuguese', title: 'Política de Segurança da Informação' },
      { languageCode: 'zh', languageName: 'Chinese', title: '信息安全政策' },
    ],
  },
  {
    title: 'Travel and Expense Policy',
    slug: 'travel-expense',
    policyType: 'TRAVEL_EXPENSE',
    category: 'Finance',
    summary: 'Establishes guidelines and limits for business travel and expense reimbursement.',
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
      { languageCode: 'es', languageName: 'Spanish', title: 'Política de Viajes y Gastos' },
      { languageCode: 'fr', languageName: 'French', title: 'Politique de Voyage et de Dépenses' },
      { languageCode: 'de', languageName: 'German', title: 'Reise- und Spesenrichtlinie' },
      { languageCode: 'pt', languageName: 'Portuguese', title: 'Política de Viagens e Despesas' },
      { languageCode: 'zh', languageName: 'Chinese', title: '差旅费用政策' },
    ],
  },
  {
    title: 'Social Media Policy',
    slug: 'social-media',
    policyType: 'SOCIAL_MEDIA',
    category: 'Communications',
    summary: 'Guidelines for employee use of social media in relation to company matters.',
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
      { languageCode: 'es', languageName: 'Spanish', title: 'Política de Redes Sociales' },
      { languageCode: 'fr', languageName: 'French', title: 'Politique sur les Médias Sociaux' },
      { languageCode: 'de', languageName: 'German', title: 'Social-Media-Richtlinie' },
      { languageCode: 'pt', languageName: 'Portuguese', title: 'Política de Mídias Sociais' },
      { languageCode: 'zh', languageName: 'Chinese', title: '社交媒体政策' },
    ],
  },
  {
    title: 'Acceptable Use Policy',
    slug: 'acceptable-use',
    policyType: 'ACCEPTABLE_USE',
    category: 'IT',
    summary: 'Defines acceptable use of company technology resources and systems.',
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
      { languageCode: 'es', languageName: 'Spanish', title: 'Política de Uso Aceptable' },
      { languageCode: 'fr', languageName: 'French', title: 'Politique d\'Utilisation Acceptable' },
      { languageCode: 'de', languageName: 'German', title: 'Richtlinie zur akzeptablen Nutzung' },
      { languageCode: 'pt', languageName: 'Portuguese', title: 'Política de Uso Aceitável' },
      { languageCode: 'zh', languageName: 'Chinese', title: '可接受使用政策' },
    ],
  },
];

// Additional policies to reach 50 total
const ADDITIONAL_POLICIES: PolicyDefinition[] = [
  {
    title: 'HIPAA Privacy Policy',
    slug: 'hipaa-privacy',
    policyType: 'DATA_PRIVACY',
    category: 'Healthcare',
    summary: 'Establishes requirements for protecting Protected Health Information under HIPAA.',
    content: `<h1>HIPAA Privacy Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes requirements for protecting Protected Health Information (PHI) in compliance with the Health Insurance Portability and Accountability Act (HIPAA).</p>

<h2>Scope</h2>
<p>This policy applies to all workforce members who access, use, or disclose PHI.</p>

<h2>Minimum Necessary Standard</h2>
<p>Access to PHI must be limited to the minimum necessary to accomplish the intended purpose.</p>

<h2>Patient Rights</h2>
<p>Patients have rights regarding their PHI including access, amendment, accounting of disclosures, and restrictions on use.</p>

<h2>Breach Notification</h2>
<p>Breaches of unsecured PHI must be reported to affected individuals, HHS, and in some cases, the media.</p>`,
    translations: [
      { languageCode: 'es', languageName: 'Spanish', title: 'Política de Privacidad HIPAA' },
      { languageCode: 'fr', languageName: 'French', title: 'Politique de Confidentialité HIPAA' },
    ],
  },
  {
    title: 'HIPAA Security Policy',
    slug: 'hipaa-security',
    policyType: 'INFORMATION_SECURITY',
    category: 'Healthcare',
    summary: 'Technical and administrative safeguards for electronic PHI under HIPAA.',
    content: `<h1>HIPAA Security Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes administrative, physical, and technical safeguards for electronic Protected Health Information (ePHI).</p>

<h2>Administrative Safeguards</h2>
<ul>
<li>Security management process</li>
<li>Workforce security training</li>
<li>Contingency planning</li>
</ul>

<h2>Physical Safeguards</h2>
<ul>
<li>Facility access controls</li>
<li>Workstation and device security</li>
</ul>

<h2>Technical Safeguards</h2>
<ul>
<li>Access controls and audit logs</li>
<li>Encryption in transit and at rest</li>
<li>Integrity controls</li>
</ul>`,
    translations: [
      { languageCode: 'es', languageName: 'Spanish', title: 'Política de Seguridad HIPAA' },
      { languageCode: 'de', languageName: 'German', title: 'HIPAA-Sicherheitsrichtlinie' },
    ],
  },
  {
    title: 'Vendor Management Policy',
    slug: 'vendor-management',
    policyType: 'OTHER',
    category: 'Procurement',
    summary: 'Requirements for selecting, contracting with, and monitoring third-party vendors.',
    content: `<h1>Vendor Management Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes requirements for managing relationships with third-party vendors to ensure compliance, security, and value.</p>

<h2>Vendor Selection</h2>
<p>All significant vendor relationships must go through a selection process including:</p>
<ul>
<li>Needs assessment</li>
<li>Request for proposal (RFP) when appropriate</li>
<li>Due diligence review</li>
<li>Contract negotiation</li>
</ul>

<h2>Risk Assessment</h2>
<p>Vendors are classified based on risk level considering access to data, criticality, and regulatory requirements.</p>

<h2>Ongoing Monitoring</h2>
<p>Vendor performance and compliance must be monitored throughout the relationship.</p>`,
    translations: [
      { languageCode: 'es', languageName: 'Spanish', title: 'Política de Gestión de Proveedores' },
      { languageCode: 'fr', languageName: 'French', title: 'Politique de Gestion des Fournisseurs' },
    ],
  },
  {
    title: 'Record Retention Policy',
    slug: 'record-retention',
    policyType: 'OTHER',
    category: 'Compliance',
    summary: 'Establishes retention periods for various types of business records.',
    content: `<h1>Record Retention Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes requirements for retaining and disposing of business records in compliance with legal and regulatory requirements.</p>

<h2>Retention Periods</h2>
<p>Records must be retained according to the retention schedule. See Appendix A for specific retention periods by record type.</p>

<h2>Litigation Hold</h2>
<p>Normal retention schedules are suspended when a litigation hold is in place. Contact Legal before disposing of any records subject to a hold.</p>

<h2>Destruction</h2>
<p>Records must be destroyed securely using approved methods when the retention period has expired.</p>`,
    translations: [
      { languageCode: 'es', languageName: 'Spanish', title: 'Política de Retención de Registros' },
      { languageCode: 'de', languageName: 'German', title: 'Aufbewahrungsrichtlinie' },
    ],
  },
  {
    title: 'Workplace Safety Policy',
    slug: 'workplace-safety',
    policyType: 'OTHER',
    category: 'Safety',
    summary: 'Establishes requirements for maintaining a safe work environment.',
    content: `<h1>Workplace Safety Policy</h1>
<h2>Purpose</h2>
<p>Acme Corporation is committed to providing a safe and healthy work environment for all employees, contractors, and visitors.</p>

<h2>Responsibilities</h2>
<p>All employees are responsible for:</p>
<ul>
<li>Following safety procedures</li>
<li>Reporting hazards immediately</li>
<li>Using required personal protective equipment</li>
<li>Participating in safety training</li>
</ul>

<h2>Incident Reporting</h2>
<p>All workplace injuries and near-misses must be reported immediately to your supervisor and Safety.</p>

<h2>Emergency Procedures</h2>
<p>Employees must be familiar with emergency evacuation procedures for their work area.</p>`,
    translations: [
      { languageCode: 'es', languageName: 'Spanish', title: 'Política de Seguridad en el Trabajo' },
      { languageCode: 'fr', languageName: 'French', title: 'Politique de Sécurité au Travail' },
      { languageCode: 'de', languageName: 'German', title: 'Arbeitsschutzrichtlinie' },
    ],
  },
  {
    title: 'Drug and Alcohol Policy',
    slug: 'drug-alcohol',
    policyType: 'OTHER',
    category: 'HR',
    summary: 'Prohibits drug and alcohol use in the workplace and establishes testing requirements.',
    content: `<h1>Drug and Alcohol Policy</h1>
<h2>Policy Statement</h2>
<p>Acme Corporation maintains a drug-free workplace. The use, possession, or distribution of illegal drugs or alcohol on company premises or while conducting company business is prohibited.</p>

<h2>Testing</h2>
<p>Drug and alcohol testing may be conducted:</p>
<ul>
<li>Pre-employment</li>
<li>Post-accident</li>
<li>For reasonable suspicion</li>
<li>Randomly for safety-sensitive positions</li>
</ul>

<h2>Consequences</h2>
<p>Violations of this policy will result in disciplinary action, up to and including termination.</p>`,
    translations: [
      { languageCode: 'es', languageName: 'Spanish', title: 'Política de Drogas y Alcohol' },
    ],
  },
  {
    title: 'Equal Employment Opportunity Policy',
    slug: 'equal-employment',
    policyType: 'OTHER',
    category: 'HR',
    summary: 'Commitment to equal employment opportunity without discrimination.',
    content: `<h1>Equal Employment Opportunity Policy</h1>
<h2>Policy Statement</h2>
<p>Acme Corporation is committed to providing equal employment opportunities to all qualified individuals without regard to race, color, religion, sex, national origin, age, disability, veteran status, sexual orientation, gender identity, or any other protected characteristic.</p>

<h2>Scope</h2>
<p>This policy applies to all terms and conditions of employment including recruitment, hiring, placement, promotion, termination, layoff, recall, transfer, leaves of absence, compensation, and training.</p>

<h2>Reasonable Accommodation</h2>
<p>We will provide reasonable accommodations to qualified individuals with disabilities and for sincerely held religious beliefs.</p>`,
    translations: [
      { languageCode: 'es', languageName: 'Spanish', title: 'Política de Igualdad de Oportunidades' },
      { languageCode: 'fr', languageName: 'French', title: 'Politique d\'Égalité des Chances' },
    ],
  },
  {
    title: 'Remote Work Policy',
    slug: 'remote-work',
    policyType: 'OTHER',
    category: 'HR',
    summary: 'Guidelines and requirements for employees working remotely.',
    content: `<h1>Remote Work Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes guidelines for remote work arrangements to ensure productivity, security, and work-life balance.</p>

<h2>Eligibility</h2>
<p>Remote work eligibility is determined based on role requirements, performance history, and manager approval.</p>

<h2>Requirements</h2>
<ul>
<li>Maintain regular working hours and availability</li>
<li>Ensure secure home office environment</li>
<li>Protect confidential information</li>
<li>Attend required in-person meetings</li>
</ul>

<h2>Equipment</h2>
<p>The company will provide necessary equipment. Employees are responsible for maintaining a suitable work environment.</p>`,
    translations: [
      { languageCode: 'es', languageName: 'Spanish', title: 'Política de Trabajo Remoto' },
      { languageCode: 'de', languageName: 'German', title: 'Richtlinie für Remote-Arbeit' },
    ],
  },
  {
    title: 'Intellectual Property Policy',
    slug: 'intellectual-property',
    policyType: 'OTHER',
    category: 'Legal',
    summary: 'Protects company intellectual property and defines ownership of employee creations.',
    content: `<h1>Intellectual Property Policy</h1>
<h2>Ownership</h2>
<p>All intellectual property created by employees in the course of their employment belongs to the company, including:</p>
<ul>
<li>Inventions and patents</li>
<li>Copyrighted works</li>
<li>Trade secrets</li>
<li>Software and code</li>
</ul>

<h2>Protection</h2>
<p>Employees must protect company intellectual property and trade secrets, both during and after employment.</p>

<h2>Third-Party IP</h2>
<p>Employees must respect third-party intellectual property rights and not use unauthorized materials.</p>`,
    translations: [
      { languageCode: 'es', languageName: 'Spanish', title: 'Política de Propiedad Intelectual' },
      { languageCode: 'zh', languageName: 'Chinese', title: '知识产权政策' },
    ],
  },
  {
    title: 'Environmental Policy',
    slug: 'environmental',
    policyType: 'OTHER',
    category: 'Sustainability',
    summary: 'Commitment to environmental responsibility and sustainability.',
    content: `<h1>Environmental Policy</h1>
<h2>Commitment</h2>
<p>Acme Corporation is committed to conducting business in an environmentally responsible manner and minimizing our environmental impact.</p>

<h2>Goals</h2>
<ul>
<li>Reduce energy consumption and greenhouse gas emissions</li>
<li>Minimize waste and increase recycling</li>
<li>Use sustainable materials when feasible</li>
<li>Comply with all environmental regulations</li>
</ul>

<h2>Employee Responsibilities</h2>
<p>All employees are expected to support our environmental initiatives through responsible resource use.</p>`,
    translations: [
      { languageCode: 'es', languageName: 'Spanish', title: 'Política Ambiental' },
      { languageCode: 'fr', languageName: 'French', title: 'Politique Environnementale' },
      { languageCode: 'de', languageName: 'German', title: 'Umweltrichtlinie' },
    ],
  },
  {
    title: 'Business Continuity Policy',
    slug: 'business-continuity',
    policyType: 'OTHER',
    category: 'Operations',
    summary: 'Framework for maintaining operations during disruptions.',
    content: `<h1>Business Continuity Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes a framework for maintaining critical business operations during and after disruptions.</p>

<h2>Scope</h2>
<p>This policy applies to all business units and covers natural disasters, cyber incidents, pandemics, and other disruptions.</p>

<h2>Requirements</h2>
<ul>
<li>Identify critical business functions</li>
<li>Develop recovery plans</li>
<li>Test plans regularly</li>
<li>Train employees on their roles</li>
</ul>`,
    translations: [
      { languageCode: 'es', languageName: 'Spanish', title: 'Política de Continuidad del Negocio' },
    ],
  },
  {
    title: 'Insider Trading Policy',
    slug: 'insider-trading',
    policyType: 'OTHER',
    category: 'Compliance',
    summary: 'Prohibits trading on material non-public information.',
    content: `<h1>Insider Trading Policy</h1>
<h2>Prohibition</h2>
<p>Trading in company securities while in possession of material non-public information is prohibited. Sharing such information with others who may trade is also prohibited.</p>

<h2>Blackout Periods</h2>
<p>Designated insiders are subject to trading blackout periods around earnings releases and other material events.</p>

<h2>Pre-Clearance</h2>
<p>Officers and directors must pre-clear all trades with the Legal department.</p>`,
    translations: [
      { languageCode: 'es', languageName: 'Spanish', title: 'Política de Uso de Información Privilegiada' },
    ],
  },
  {
    title: 'Antitrust and Competition Policy',
    slug: 'antitrust',
    policyType: 'OTHER',
    category: 'Legal',
    summary: 'Ensures compliance with antitrust and competition laws.',
    content: `<h1>Antitrust and Competition Policy</h1>
<h2>Policy Statement</h2>
<p>Acme Corporation is committed to fair competition and compliance with all antitrust and competition laws.</p>

<h2>Prohibited Conduct</h2>
<ul>
<li>Price fixing with competitors</li>
<li>Market allocation agreements</li>
<li>Bid rigging</li>
<li>Boycotts</li>
</ul>

<h2>Competitor Interactions</h2>
<p>Exercise caution when interacting with competitors at trade associations or other events. Never discuss pricing, costs, or market strategies.</p>`,
    translations: [
      { languageCode: 'es', languageName: 'Spanish', title: 'Política Antimonopolio' },
      { languageCode: 'de', languageName: 'German', title: 'Kartellrecht und Wettbewerbsrichtlinie' },
    ],
  },
];

// Generate remaining policies programmatically
function generateAdditionalPolicies(count: number): PolicyDefinition[] {
  const categories = ['HR', 'Compliance', 'Finance', 'Operations', 'IT', 'Legal', 'Healthcare', 'Safety'];
  const topics = [
    'Overtime Compensation',
    'Leave of Absence',
    'Performance Management',
    'Grievance Procedure',
    'Background Check',
    'Employee Referral',
    'Tuition Reimbursement',
    'Company Vehicle Use',
    'Expense Card Use',
    'Meeting Room Policy',
    'Visitor Access',
    'Emergency Response',
    'Fire Safety',
    'Electrical Safety',
    'Chemical Handling',
    'Ergonomics',
    'First Aid',
    'Incident Investigation',
    'Quality Assurance',
    'Change Management',
    'Project Management',
    'Code Review',
    'Release Management',
    'Patch Management',
    'Network Security',
    'Cloud Security',
    'Physical Security',
    'Access Badge Policy',
    'Clean Desk Policy',
    'Document Control',
    'Training Requirements',
    'Competency Assessment',
    'Succession Planning',
    'Diversity and Inclusion',
    'Supplier Diversity',
    'Charitable Contributions',
    'Political Activity',
    'Media Relations',
    'Customer Complaints',
  ];

  const policies: PolicyDefinition[] = [];

  for (let i = 0; i < count && i < topics.length; i++) {
    const topic = topics[i];
    const category = categories[i % categories.length];
    const slug = topic.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    policies.push({
      title: `${topic} Policy`,
      slug,
      policyType: 'OTHER',
      category,
      summary: `Establishes guidelines and requirements for ${topic.toLowerCase()}.`,
      content: `<h1>${topic} Policy</h1>
<h2>Purpose</h2>
<p>This policy establishes guidelines and requirements for ${topic.toLowerCase()} at Acme Corporation.</p>

<h2>Scope</h2>
<p>This policy applies to all employees and contractors.</p>

<h2>Policy</h2>
<p>All employees must follow established procedures for ${topic.toLowerCase()}.</p>

<h2>Responsibilities</h2>
<ul>
<li>Employees: Follow policy requirements</li>
<li>Managers: Ensure team compliance</li>
<li>HR/Compliance: Monitor and enforce</li>
</ul>

<h2>Exceptions</h2>
<p>Exceptions require written approval from the appropriate department head.</p>`,
      translations: i % 3 === 0 ? [
        { languageCode: 'es', languageName: 'Spanish', title: `Política de ${topic}` },
        { languageCode: 'fr', languageName: 'French', title: `Politique de ${topic}` },
      ] : i % 3 === 1 ? [
        { languageCode: 'de', languageName: 'German', title: `${topic}-Richtlinie` },
      ] : [],
    });
  }

  return policies;
}

// ===========================================
// Seeder Function
// ===========================================

export async function seedPolicies(
  prisma: PrismaClient,
  organizationId: string,
  ownerId: string,
): Promise<{ policyCount: number; translationCount: number }> {
  console.log('  Seeding policies...');

  // Combine all policy definitions
  const allPolicies = [
    ...CORE_POLICIES,
    ...ADDITIONAL_POLICIES,
    ...generateAdditionalPolicies(50 - CORE_POLICIES.length - ADDITIONAL_POLICIES.length),
  ];

  let policyCount = 0;
  let translationCount = 0;

  // Historical dates for version history
  const baseDate = new Date('2024-01-15');
  const updateDate = new Date('2025-06-01');
  const currentDate = new Date('2026-01-15');

  for (const policyDef of allPolicies) {
    // Check if policy already exists
    const existing = await prisma.policy.findUnique({
      where: {
        organizationId_slug: {
          organizationId,
          slug: policyDef.slug,
        },
      },
    });

    if (existing) {
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
        status: 'PUBLISHED',
        currentVersion: 2, // Version 2 is current
        draftContent: null,
        ownerId,
        effectiveDate: baseDate,
        reviewDate: new Date('2027-01-15'),
        createdById: ownerId,
        createdAt: new Date(baseDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days before effective
      },
    });

    // Create version 1 (initial publication)
    const version1 = await prisma.policyVersion.create({
      data: {
        organizationId,
        policyId: policy.id,
        version: 1,
        versionLabel: 'v1.0',
        content: policyDef.content,
        plainText: policyDef.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        summary: policyDef.summary,
        changeNotes: 'Initial publication',
        publishedAt: baseDate,
        publishedById: ownerId,
        effectiveDate: baseDate,
        isLatest: false,
      },
    });

    // Create version 2 (update)
    const updatedContent = policyDef.content.replace(
      '</h1>',
      '</h1>\n<p><em>Updated for 2026 compliance requirements.</em></p>',
    );

    const version2 = await prisma.policyVersion.create({
      data: {
        organizationId,
        policyId: policy.id,
        version: 2,
        versionLabel: 'v2.0',
        content: updatedContent,
        plainText: updatedContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        summary: policyDef.summary,
        changeNotes: 'Updated for 2026 compliance requirements and regulatory changes.',
        publishedAt: currentDate,
        publishedById: ownerId,
        effectiveDate: currentDate,
        isLatest: true,
      },
    });

    policyCount++;

    // Create translations for the latest version
    for (const trans of policyDef.translations) {
      // Generate translated content (in production this would use AI)
      const translatedContent = generateTranslatedContent(policyDef.content, trans.languageCode);

      await prisma.policyVersionTranslation.create({
        data: {
          organizationId,
          policyVersionId: version2.id,
          languageCode: trans.languageCode,
          languageName: trans.languageName,
          title: trans.title,
          content: translatedContent,
          plainText: translatedContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
          translatedBy: 'AI',
          aiModel: 'claude-3-opus',
          reviewStatus: trans.languageCode === 'es' ? 'APPROVED' : 'PENDING_REVIEW',
          reviewedAt: trans.languageCode === 'es' ? new Date() : null,
          reviewedById: trans.languageCode === 'es' ? ownerId : null,
          isStale: false,
        },
      });

      translationCount++;
    }
  }

  console.log(`  Created ${policyCount} policies with ${translationCount} translations`);
  return { policyCount, translationCount };
}

// Helper function to generate mock translations
function generateTranslatedContent(content: string, languageCode: string): string {
  // In production, this would use AI translation
  // For demo purposes, we add language markers
  const languageMarkers: Record<string, string> = {
    es: '[ES] ',
    fr: '[FR] ',
    de: '[DE] ',
    pt: '[PT] ',
    zh: '[ZH] ',
  };

  const marker = languageMarkers[languageCode] || '';

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
      where: { slug: 'acme-corp' },
    });

    if (!organization) {
      console.error('Acme Corp organization not found. Run main seed first.');
      process.exit(1);
    }

    const user = await prisma.user.findFirst({
      where: {
        organizationId: organization.id,
        email: 'demo-cco@acme.local',
      },
    });

    if (!user) {
      console.error('Demo CCO user not found. Run main seed first.');
      process.exit(1);
    }

    const result = await seedPolicies(prisma, organization.id, user.id);
    console.log(`Seeded ${result.policyCount} policies with ${result.translationCount} translations`);
  } catch (error) {
    console.error('Error seeding policies:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
