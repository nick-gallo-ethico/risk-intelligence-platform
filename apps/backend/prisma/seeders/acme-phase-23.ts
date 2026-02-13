/**
 * Phase 23 Demo Data Seeder - Help & Support System
 *
 * Seeds the platform with initial knowledge base articles that are
 * available to all tenants (global articles with organizationId: null).
 *
 * Creates 16 articles across 8 categories:
 * - getting-started (3 articles)
 * - cases (3 articles)
 * - campaigns (2 articles)
 * - reports (2 articles)
 * - policies (2 articles)
 * - settings (2 articles)
 * - faq (2 articles)
 *
 * Usage:
 *   npx ts-node prisma/seeders/acme-phase-23.ts
 *
 * Or via seed orchestrator:
 *   npm run db:seed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ===========================================
// Article Definitions
// ===========================================

interface ArticleDefinition {
  slug: string;
  title: string;
  category: string;
  sortOrder: number;
  excerpt: string;
  content: string;
  tags: string[];
}

const KNOWLEDGE_BASE_ARTICLES: ArticleDefinition[] = [
  // ================================
  // Getting Started (3 articles)
  // ================================
  {
    slug: "getting-started-overview",
    title: "Getting Started with Ethico",
    category: "getting-started",
    sortOrder: 1,
    excerpt:
      "A comprehensive introduction to the Ethico Risk Intelligence Platform, covering key concepts and navigation.",
    content: `
<h2>Welcome to Ethico</h2>
<p>The Ethico Risk Intelligence Platform is a comprehensive compliance management system designed to help organizations manage ethics hotlines, case investigations, policy management, and compliance campaigns from a single unified platform.</p>

<h3>Key Concepts</h3>
<p>Understanding these core concepts will help you navigate the platform effectively:</p>
<ul>
  <li><strong>RIUs (Risk Intelligence Units)</strong> - Immutable records of reports, disclosures, or submissions. These are the raw inputs that may create cases.</li>
  <li><strong>Cases</strong> - Work containers for tracking investigations, assignments, and outcomes related to one or more RIUs.</li>
  <li><strong>Campaigns</strong> - Outbound requests for disclosures, attestations, or surveys sent to employees.</li>
  <li><strong>Policies</strong> - Documents with versioning, approval workflows, and attestation tracking.</li>
</ul>

<h3>Main Navigation</h3>
<p>The sidebar provides access to all major areas:</p>
<ul>
  <li><strong>Dashboard</strong> - Your personalized overview with key metrics and tasks</li>
  <li><strong>Cases</strong> - View, search, and manage compliance cases</li>
  <li><strong>Campaigns</strong> - Create and track disclosure/attestation campaigns</li>
  <li><strong>Policies</strong> - Manage policy documents and track attestations</li>
  <li><strong>Analytics</strong> - Reports, dashboards, and data exports</li>
  <li><strong>Settings</strong> - Organization and user preferences</li>
</ul>

<h3>Getting Help</h3>
<p>If you need assistance at any time, click the Help icon in the top navigation bar to access the knowledge base, submit a support ticket, or view your existing tickets.</p>
    `.trim(),
    tags: ["onboarding", "introduction", "navigation", "basics"],
  },

  {
    slug: "navigating-the-dashboard",
    title: "Navigating Your Dashboard",
    category: "getting-started",
    sortOrder: 2,
    excerpt:
      "Learn how to use the dashboard to track your tasks, view key metrics, and take quick actions.",
    content: `
<h2>Your Personal Dashboard</h2>
<p>The dashboard is your home base in Ethico. It provides a personalized view of your work, key metrics, and quick access to common actions. The content adapts based on your role and permissions.</p>

<h3>My Tasks Widget</h3>
<p>The My Tasks section shows all work items assigned to you across the platform:</p>
<ul>
  <li><strong>Case assignments</strong> - Cases awaiting your action or investigation</li>
  <li><strong>Approval requests</strong> - Policies, campaigns, or other items pending your approval</li>
  <li><strong>Overdue items</strong> - Tasks past their due date highlighted for attention</li>
  <li><strong>Project tasks</strong> - Implementation and project management tasks</li>
</ul>
<p>Click any task to navigate directly to the relevant item.</p>

<h3>Key Metrics</h3>
<p>Depending on your role, you may see metrics such as:</p>
<ul>
  <li>Open cases by status and age</li>
  <li>Campaign completion rates</li>
  <li>Policy attestation compliance</li>
  <li>Recent activity trends</li>
</ul>

<h3>Quick Actions</h3>
<p>The dashboard provides shortcuts for common tasks:</p>
<ul>
  <li>Create a new case</li>
  <li>Start a new campaign</li>
  <li>Upload a policy document</li>
  <li>View recent activity</li>
</ul>

<h3>Customization</h3>
<p>Dashboard widgets can be rearranged by dragging them to your preferred positions. Your layout is saved automatically and persists across sessions.</p>
    `.trim(),
    tags: ["dashboard", "tasks", "metrics", "quick-actions"],
  },

  {
    slug: "understanding-roles",
    title: "Understanding User Roles",
    category: "getting-started",
    sortOrder: 3,
    excerpt:
      "An overview of the different user roles in Ethico and what permissions each role has.",
    content: `
<h2>Role-Based Access Control</h2>
<p>Ethico uses role-based access control (RBAC) to ensure users only see and do what's appropriate for their responsibilities. Each user is assigned one or more roles that determine their permissions.</p>

<h3>Standard Roles</h3>
<p>The platform includes these pre-defined roles:</p>
<ul>
  <li><strong>System Admin</strong> - Full access to all features, settings, and user management. Can configure the entire platform.</li>
  <li><strong>Compliance Officer (CCO)</strong> - Access to all cases, campaigns, policies, and analytics. Can assign work and close cases.</li>
  <li><strong>Triage Lead</strong> - Manages case intake and initial routing. Can view cases within scope and assign to investigators.</li>
  <li><strong>Investigator</strong> - Works on assigned cases. Can view and update cases assigned to them but not others.</li>
  <li><strong>Policy Author</strong> - Creates and edits policy documents. Cannot publish without approval.</li>
  <li><strong>Read Only</strong> - View-only access to permitted areas. Cannot make changes.</li>
  <li><strong>Employee</strong> - Basic access for campaign responses and policy attestations.</li>
</ul>

<h3>Permission Scopes</h3>
<p>Beyond roles, access can be further limited by:</p>
<ul>
  <li><strong>Business Unit</strong> - See only cases from specific business units</li>
  <li><strong>Region</strong> - Geographic restrictions on visibility</li>
  <li><strong>Category</strong> - Access only to certain case categories</li>
  <li><strong>Sensitivity Level</strong> - Restricted access to sensitive cases</li>
</ul>

<h3>Role Assignment</h3>
<p>Roles are assigned by System Admins in Settings > Users. A user can have multiple roles, and their effective permissions are the combination of all assigned roles.</p>

<h3>Checking Your Permissions</h3>
<p>To see your current roles and permissions, go to Settings > My Profile. If you believe you need additional access, contact your organization's System Admin.</p>
    `.trim(),
    tags: ["roles", "permissions", "access-control", "security"],
  },

  // ================================
  // Cases (3 articles)
  // ================================
  {
    slug: "working-with-cases",
    title: "Working with Cases",
    category: "cases",
    sortOrder: 1,
    excerpt:
      "Learn the case lifecycle, status pipeline, assignment, and best practices for case management.",
    content: `
<h2>Case Management Overview</h2>
<p>Cases are the primary work containers in Ethico. Each case tracks the investigation and resolution of one or more Risk Intelligence Units (RIUs) - the reports, disclosures, or submissions that initiated the matter.</p>

<h3>Case Lifecycle</h3>
<p>Cases progress through a standard pipeline:</p>
<ul>
  <li><strong>New</strong> - Just created, awaiting initial triage</li>
  <li><strong>In Triage</strong> - Being reviewed for assignment and categorization</li>
  <li><strong>Assigned</strong> - Assigned to an investigator or team</li>
  <li><strong>Under Investigation</strong> - Active investigation in progress</li>
  <li><strong>Pending Review</strong> - Investigation complete, awaiting management review</li>
  <li><strong>Closed</strong> - Case resolved with documented outcome</li>
</ul>

<h3>Viewing Cases</h3>
<p>The Cases page provides multiple views:</p>
<ul>
  <li><strong>List view</strong> - Sortable table with key case details</li>
  <li><strong>Board view</strong> - Kanban-style view organized by status</li>
  <li><strong>My Cases</strong> - Filter to only cases assigned to you</li>
</ul>
<p>Use filters to narrow by status, category, assignee, date range, and more.</p>

<h3>Case Details</h3>
<p>Each case detail page includes:</p>
<ul>
  <li>Basic information (case number, status, priority, category)</li>
  <li>Linked RIUs with the original report content</li>
  <li>Investigation panel for notes, findings, and documentation</li>
  <li>Activity timeline showing all actions taken</li>
  <li>Communications tab for reporter follow-up</li>
</ul>

<h3>Taking Action</h3>
<p>Depending on your role, you can:</p>
<ul>
  <li>Update case status and priority</li>
  <li>Assign or reassign to investigators</li>
  <li>Add investigation notes and upload documents</li>
  <li>Record interview summaries</li>
  <li>Close with documented findings</li>
</ul>
    `.trim(),
    tags: ["cases", "investigation", "workflow", "status"],
  },

  {
    slug: "case-investigations",
    title: "Managing Case Investigations",
    category: "cases",
    sortOrder: 2,
    excerpt:
      "How to conduct investigations using templates, checklists, interview documentation, and findings.",
    content: `
<h2>Investigation Process</h2>
<p>Investigations in Ethico are structured to ensure thoroughness, consistency, and proper documentation. Each case can have one or more investigations, each with its own assignee, timeline, and outcome.</p>

<h3>Investigation Templates</h3>
<p>Templates provide pre-configured checklists based on case category:</p>
<ul>
  <li><strong>Standard Investigation</strong> - General-purpose checklist for most cases</li>
  <li><strong>Harassment Investigation</strong> - Specific steps for workplace harassment claims</li>
  <li><strong>Fraud Investigation</strong> - Financial review and evidence collection steps</li>
  <li><strong>Conflict of Interest</strong> - Disclosure review and conflict assessment</li>
</ul>
<p>Apply a template when creating a new investigation to populate the checklist automatically.</p>

<h3>Checklist Items</h3>
<p>Each investigation includes checklist items that track progress:</p>
<ul>
  <li>Mark items complete as you work through them</li>
  <li>Add notes to individual items for context</li>
  <li>Completion percentage updates automatically</li>
  <li>Overdue items are highlighted</li>
</ul>

<h3>Interview Documentation</h3>
<p>Record interviews directly in the investigation:</p>
<ul>
  <li>Add interviewee name, role, and date</li>
  <li>Enter summary notes or full transcript</li>
  <li>Upload audio recordings or documents</li>
  <li>Link interviews to specific subjects</li>
</ul>

<h3>Recording Findings</h3>
<p>When the investigation is complete:</p>
<ol>
  <li>Document your findings in the Findings section</li>
  <li>Select an outcome (Substantiated, Unsubstantiated, Inconclusive, etc.)</li>
  <li>Add remediation recommendations if applicable</li>
  <li>Submit for review or close directly based on your permissions</li>
</ol>

<h3>Evidence Management</h3>
<p>All uploaded documents are securely stored and linked to the investigation. Use descriptive names and add notes to explain the relevance of each document.</p>
    `.trim(),
    tags: [
      "investigation",
      "templates",
      "checklists",
      "interviews",
      "findings",
    ],
  },

  {
    slug: "anonymous-communication",
    title: "Anonymous Reporter Communication",
    category: "cases",
    sortOrder: 3,
    excerpt:
      "Understanding how the anonymous relay system works for secure follow-up with reporters.",
    content: `
<h2>Anonymous Communication System</h2>
<p>Ethico provides a secure way to communicate with anonymous reporters without compromising their identity. This "Chinese Wall" approach allows follow-up questions and updates while maintaining complete anonymity.</p>

<h3>How It Works</h3>
<p>When a reporter submits an anonymous report, they receive an access code. This code allows them to:</p>
<ul>
  <li>Check the status of their report</li>
  <li>View messages from investigators</li>
  <li>Respond to questions without revealing identity</li>
  <li>Provide additional information</li>
</ul>
<p>All communications are routed through the Ethico relay system.</p>

<h3>Sending Messages to Reporters</h3>
<p>From the case Communications tab:</p>
<ol>
  <li>Click "New Message"</li>
  <li>Write your message - be clear and professional</li>
  <li>Send - the reporter will see it when they check their report</li>
</ol>
<p>Messages are timestamped and logged in the case activity.</p>

<h3>Receiving Responses</h3>
<p>When a reporter responds:</p>
<ul>
  <li>The response appears in the Communications tab</li>
  <li>Case assignees receive a notification</li>
  <li>The case activity log is updated</li>
</ul>
<p>Response times vary - reporters may check periodically or not at all.</p>

<h3>Best Practices</h3>
<ul>
  <li><strong>Be patient</strong> - Anonymous reporters check on their own schedule</li>
  <li><strong>Be specific</strong> - Ask clear, direct questions</li>
  <li><strong>Be reassuring</strong> - Remind them their identity is protected</li>
  <li><strong>Avoid jargon</strong> - Use plain language they can understand</li>
  <li><strong>Provide updates</strong> - Let them know their report is being taken seriously</li>
</ul>

<h3>Reporter Portal</h3>
<p>Reporters access the system via a separate portal using their access code. They never need to log in or provide identifying information to participate in follow-up communications.</p>
    `.trim(),
    tags: ["anonymous", "communication", "reporter", "follow-up", "relay"],
  },

  // ================================
  // Campaigns (2 articles)
  // ================================
  {
    slug: "campaign-overview",
    title: "Campaign Overview",
    category: "campaigns",
    sortOrder: 1,
    excerpt:
      "Understanding campaign types, lifecycle stages, and how campaigns work in Ethico.",
    content: `
<h2>What Are Campaigns?</h2>
<p>Campaigns are outbound requests sent to employees for disclosures, attestations, or surveys. They enable systematic collection of compliance-related information across your organization.</p>

<h3>Campaign Types</h3>
<ul>
  <li><strong>Disclosure Campaigns</strong> - Collect information about potential conflicts of interest, gifts received, outside employment, or financial relationships.</li>
  <li><strong>Attestation Campaigns</strong> - Confirm employees have read and acknowledge policies, completed training, or agree to terms.</li>
  <li><strong>Survey Campaigns</strong> - Gather feedback on workplace culture, compliance awareness, or other topics.</li>
</ul>

<h3>Campaign Lifecycle</h3>
<p>Campaigns progress through these stages:</p>
<ul>
  <li><strong>Draft</strong> - Being configured, not yet visible to employees</li>
  <li><strong>Scheduled</strong> - Ready to launch at a specified date/time</li>
  <li><strong>Active</strong> - Live and accepting responses</li>
  <li><strong>Paused</strong> - Temporarily halted (can be resumed)</li>
  <li><strong>Completed</strong> - Past due date, no longer accepting responses</li>
</ul>

<h3>Key Components</h3>
<p>Each campaign includes:</p>
<ul>
  <li><strong>Form</strong> - The questions or acknowledgments employees complete</li>
  <li><strong>Audience</strong> - Who receives the campaign (all employees, specific groups, etc.)</li>
  <li><strong>Schedule</strong> - Launch date, due date, and reminder schedule</li>
  <li><strong>Assignments</strong> - Individual records tracking each employee's completion</li>
</ul>

<h3>Monitoring Progress</h3>
<p>The Campaigns dashboard shows:</p>
<ul>
  <li>Overall completion percentage</li>
  <li>Breakdown by status (pending, in progress, completed, overdue)</li>
  <li>List of individual assignments with status</li>
  <li>Options to send reminders or export data</li>
</ul>

<h3>Automatic Case Creation</h3>
<p>Campaigns can be configured to automatically create cases when certain thresholds are met - for example, if a gift disclosure exceeds $500 or a conflict of interest is declared.</p>
    `.trim(),
    tags: ["campaigns", "disclosure", "attestation", "survey", "lifecycle"],
  },

  {
    slug: "creating-campaigns",
    title: "Creating and Managing Campaigns",
    category: "campaigns",
    sortOrder: 2,
    excerpt:
      "Step-by-step guide to creating campaigns with audience targeting, scheduling, and reminders.",
    content: `
<h2>Creating a New Campaign</h2>
<p>Follow these steps to create and launch a campaign:</p>

<h3>Step 1: Basic Information</h3>
<ol>
  <li>Navigate to Campaigns and click "New Campaign"</li>
  <li>Enter a name (e.g., "Q1 2026 Conflict of Interest Disclosure")</li>
  <li>Add a description explaining the purpose</li>
  <li>Select the campaign type (Disclosure, Attestation, or Survey)</li>
</ol>

<h3>Step 2: Select a Form</h3>
<p>Choose the form employees will complete:</p>
<ul>
  <li>Select from existing form templates</li>
  <li>Or create a new form with the Form Designer</li>
  <li>Preview the form to ensure it's correct</li>
</ul>

<h3>Step 3: Define the Audience</h3>
<p>Choose who receives the campaign:</p>
<ul>
  <li><strong>All Employees</strong> - Send to everyone active in the system</li>
  <li><strong>By Department</strong> - Target specific departments</li>
  <li><strong>By Location</strong> - Target specific locations or regions</li>
  <li><strong>Custom List</strong> - Upload a specific list of employees</li>
</ul>
<p>Review the employee count before proceeding.</p>

<h3>Step 4: Set Schedule</h3>
<ul>
  <li><strong>Launch Date</strong> - When employees receive notification</li>
  <li><strong>Due Date</strong> - Deadline for completion</li>
  <li><strong>Reminders</strong> - Automatic reminder schedule (e.g., 7 days, 3 days, 1 day before due)</li>
</ul>

<h3>Step 5: Review and Launch</h3>
<p>Review all settings on the confirmation page. You can either:</p>
<ul>
  <li><strong>Save as Draft</strong> - Save for later editing</li>
  <li><strong>Schedule</strong> - Set to launch automatically at the specified date</li>
  <li><strong>Launch Now</strong> - Start immediately</li>
</ul>

<h3>Managing Active Campaigns</h3>
<p>While a campaign is active, you can:</p>
<ul>
  <li>Send manual reminders to incomplete assignments</li>
  <li>Pause the campaign if needed</li>
  <li>View response details and export data</li>
  <li>Track completion rates in real time</li>
</ul>
    `.trim(),
    tags: ["campaigns", "create", "audience", "schedule", "reminders"],
  },

  // ================================
  // Reports & Analytics (2 articles)
  // ================================
  {
    slug: "understanding-analytics",
    title: "Understanding Analytics",
    category: "reports",
    sortOrder: 1,
    excerpt:
      "How to interpret dashboard KPIs, trend charts, and compliance metrics.",
    content: `
<h2>Analytics Overview</h2>
<p>The Analytics module provides insights into your compliance program through dashboards, metrics, and trend analysis. Use these tools to identify patterns, measure effectiveness, and report to stakeholders.</p>

<h3>Key Performance Indicators (KPIs)</h3>
<p>The main dashboard displays critical metrics:</p>
<ul>
  <li><strong>Open Cases</strong> - Total cases currently in progress</li>
  <li><strong>Average Resolution Time</strong> - Mean days from case creation to closure</li>
  <li><strong>Case Aging</strong> - Distribution of open cases by age bracket</li>
  <li><strong>Campaign Completion Rate</strong> - Percentage of campaign assignments completed</li>
  <li><strong>Policy Attestation Rate</strong> - Percentage of employees with current attestations</li>
</ul>

<h3>Trend Charts</h3>
<p>Visualize data over time:</p>
<ul>
  <li><strong>Case Volume</strong> - New cases per week/month with year-over-year comparison</li>
  <li><strong>Category Distribution</strong> - Breakdown of cases by type over time</li>
  <li><strong>Resolution Trends</strong> - Track how resolution times change</li>
  <li><strong>Substantiation Rates</strong> - Percentage of cases substantiated by category</li>
</ul>

<h3>Interpreting Data</h3>
<p>When reviewing analytics:</p>
<ul>
  <li><strong>Look for spikes</strong> - Sudden increases may indicate emerging issues</li>
  <li><strong>Watch for trends</strong> - Gradual changes may reflect cultural shifts</li>
  <li><strong>Compare periods</strong> - Year-over-year comparisons reveal seasonality</li>
  <li><strong>Drill down</strong> - Click metrics to see underlying detail</li>
</ul>

<h3>Filters and Segmentation</h3>
<p>Filter analytics by:</p>
<ul>
  <li>Date range</li>
  <li>Business unit or department</li>
  <li>Location or region</li>
  <li>Category or case type</li>
</ul>
<p>This helps identify where issues are concentrated.</p>

<h3>Benchmarking</h3>
<p>If enabled, compare your metrics against industry benchmarks to understand how your program performs relative to peers.</p>
    `.trim(),
    tags: ["analytics", "kpis", "metrics", "trends", "dashboards"],
  },

  {
    slug: "creating-reports",
    title: "Creating Custom Reports",
    category: "reports",
    sortOrder: 2,
    excerpt:
      "How to use the report designer to create custom reports and export data.",
    content: `
<h2>Report Designer</h2>
<p>The Report Designer allows you to create custom reports tailored to your specific needs. Build reports using drag-and-drop, configure filters, and schedule automatic delivery.</p>

<h3>Creating a New Report</h3>
<ol>
  <li>Navigate to Analytics > Reports</li>
  <li>Click "New Report"</li>
  <li>Choose a data source (Cases, Campaigns, Policies, etc.)</li>
  <li>Select fields to include in the report</li>
  <li>Add filters to narrow the data</li>
  <li>Choose a visualization type (table, chart, etc.)</li>
  <li>Save and name your report</li>
</ol>

<h3>Available Data Sources</h3>
<ul>
  <li><strong>Cases</strong> - All case data including status, category, assignee, dates</li>
  <li><strong>Investigations</strong> - Investigation details and outcomes</li>
  <li><strong>Campaigns</strong> - Campaign metadata and completion data</li>
  <li><strong>Campaign Responses</strong> - Individual response data</li>
  <li><strong>Policies</strong> - Policy versions and attestation status</li>
  <li><strong>Activity Log</strong> - User actions and system events</li>
</ul>

<h3>Filters and Parameters</h3>
<p>Make reports dynamic with parameters:</p>
<ul>
  <li><strong>Date Range</strong> - Let viewers select dates at runtime</li>
  <li><strong>Category</strong> - Filter by case or campaign type</li>
  <li><strong>Status</strong> - Include only specific statuses</li>
  <li><strong>User/Assignee</strong> - Filter by specific users</li>
</ul>

<h3>Export Options</h3>
<p>Export reports in multiple formats:</p>
<ul>
  <li><strong>PDF</strong> - Formatted for printing and sharing</li>
  <li><strong>Excel</strong> - Full data with formatting preserved</li>
  <li><strong>CSV</strong> - Raw data for further analysis</li>
</ul>

<h3>Scheduling Reports</h3>
<p>Set up automatic report delivery:</p>
<ol>
  <li>Open the report and click "Schedule"</li>
  <li>Set frequency (daily, weekly, monthly)</li>
  <li>Add email recipients</li>
  <li>Choose export format</li>
</ol>
<p>Reports are delivered automatically at the specified interval.</p>

<h3>Sharing Reports</h3>
<p>Share reports with colleagues:</p>
<ul>
  <li>Copy the report link for others to view</li>
  <li>Add to a shared dashboard</li>
  <li>Export and email manually</li>
</ul>
    `.trim(),
    tags: ["reports", "custom", "export", "designer", "scheduling"],
  },

  // ================================
  // Policies (2 articles)
  // ================================
  {
    slug: "policy-management",
    title: "Managing Policies",
    category: "policies",
    sortOrder: 1,
    excerpt:
      "Learn about the policy lifecycle, versioning, and approval workflows.",
    content: `
<h2>Policy Management Overview</h2>
<p>The Policies module enables you to create, approve, publish, and track policies across your organization. Built-in versioning ensures you always know which version is current and can reference historical versions.</p>

<h3>Policy Lifecycle</h3>
<p>Policies progress through these stages:</p>
<ul>
  <li><strong>Draft</strong> - Being written or edited</li>
  <li><strong>In Review</strong> - Submitted for approval workflow</li>
  <li><strong>Approved</strong> - Approved but not yet published</li>
  <li><strong>Published</strong> - Live and visible to employees</li>
  <li><strong>Archived</strong> - Retired, kept for historical reference</li>
</ul>

<h3>Creating a Policy</h3>
<ol>
  <li>Navigate to Policies and click "New Policy"</li>
  <li>Enter title, category, and description</li>
  <li>Use the rich text editor to write content</li>
  <li>Add attachments if needed (PDFs, forms, etc.)</li>
  <li>Save as draft to continue editing later</li>
</ol>

<h3>Version Control</h3>
<p>Every change to a published policy creates a new version:</p>
<ul>
  <li>Edit a published policy to create a new draft version</li>
  <li>The published version remains active until the new version is approved</li>
  <li>Version history shows all previous versions</li>
  <li>Compare versions to see what changed</li>
</ul>

<h3>Approval Workflows</h3>
<p>Configure who must approve policies before publication:</p>
<ul>
  <li>Set up approval stages (e.g., Legal Review → CCO Approval)</li>
  <li>Approvers receive notifications when policies are ready</li>
  <li>Track approval status in real time</li>
  <li>Rejected policies return to draft with comments</li>
</ul>

<h3>AI-Assisted Features</h3>
<p>Ethico can help with policy creation:</p>
<ul>
  <li><strong>Draft Generation</strong> - Generate initial content from a prompt</li>
  <li><strong>Translation</strong> - Translate policies into multiple languages</li>
  <li><strong>Summarization</strong> - Create employee-friendly summaries</li>
</ul>
    `.trim(),
    tags: ["policies", "versioning", "approval", "workflow", "lifecycle"],
  },

  {
    slug: "policy-attestations",
    title: "Policy Attestation Campaigns",
    category: "policies",
    sortOrder: 2,
    excerpt:
      "How to distribute policies, require attestation, and track read/acknowledge status.",
    content: `
<h2>Policy Attestations</h2>
<p>Policy attestations ensure employees have read and acknowledged important policies. Ethico tracks who has attested, sends reminders to those who haven't, and reports on compliance rates.</p>

<h3>Creating an Attestation Campaign</h3>
<ol>
  <li>From the Policy detail page, click "Create Attestation Campaign"</li>
  <li>Select the policy version to attest to</li>
  <li>Define the audience (all employees, specific groups, etc.)</li>
  <li>Set the due date and reminder schedule</li>
  <li>Launch the campaign</li>
</ol>
<p>Alternatively, create attestation campaigns from the Campaigns module.</p>

<h3>Employee Experience</h3>
<p>When employees receive an attestation request:</p>
<ol>
  <li>They receive an email notification with a link</li>
  <li>The policy displays in full for them to read</li>
  <li>They must scroll through the entire policy (or download and read)</li>
  <li>They check an acknowledgment box and submit</li>
  <li>A confirmation is shown and logged</li>
</ol>

<h3>Tracking Compliance</h3>
<p>Monitor attestation progress in real time:</p>
<ul>
  <li><strong>Overall completion rate</strong> - Percentage who have attested</li>
  <li><strong>By department</strong> - See which areas are lagging</li>
  <li><strong>Individual status</strong> - View each employee's attestation status</li>
  <li><strong>Overdue list</strong> - Employees past the due date</li>
</ul>

<h3>Sending Reminders</h3>
<p>Automatic reminders are sent based on your schedule. You can also:</p>
<ul>
  <li>Send manual reminders to all outstanding employees</li>
  <li>Send individual reminders to specific people</li>
  <li>Escalate to managers for persistent non-compliance</li>
</ul>

<h3>Reporting</h3>
<p>Generate attestation reports for:</p>
<ul>
  <li>Audit evidence</li>
  <li>Management reporting</li>
  <li>Regulatory compliance</li>
</ul>
<p>Reports include employee name, policy, attestation date, and IP address for audit purposes.</p>

<h3>Re-Attestation</h3>
<p>When policies are updated, create a new attestation campaign for the new version. Previous attestations are retained for the historical version.</p>
    `.trim(),
    tags: ["attestation", "policies", "compliance", "tracking", "reminders"],
  },

  // ================================
  // Settings & Admin (2 articles)
  // ================================
  {
    slug: "organization-settings",
    title: "Organization Settings",
    category: "settings",
    sortOrder: 1,
    excerpt:
      "Configure organization-level settings including branding, defaults, and integrations.",
    content: `
<h2>Organization Configuration</h2>
<p>Organization settings control platform-wide configurations. These settings apply to all users in your organization and are managed by System Admins.</p>

<h3>General Settings</h3>
<ul>
  <li><strong>Organization Name</strong> - Your organization's display name</li>
  <li><strong>Logo</strong> - Upload your logo for branding</li>
  <li><strong>Primary Color</strong> - Customize the platform accent color</li>
  <li><strong>Time Zone</strong> - Default time zone for dates and reporting</li>
  <li><strong>Date Format</strong> - Preferred date display format</li>
</ul>

<h3>Case Settings</h3>
<p>Configure case management defaults:</p>
<ul>
  <li><strong>Case Numbering</strong> - Prefix and sequence format (e.g., CASE-2026-0001)</li>
  <li><strong>Default Priority</strong> - Initial priority for new cases</li>
  <li><strong>SLA Targets</strong> - Target resolution times by category</li>
  <li><strong>Auto-Assignment Rules</strong> - Route cases based on category or source</li>
</ul>

<h3>Notification Settings</h3>
<p>Control how notifications are delivered:</p>
<ul>
  <li><strong>Email Delivery</strong> - SMTP configuration or use Ethico's service</li>
  <li><strong>Digest Frequency</strong> - Real-time, daily digest, or weekly digest</li>
  <li><strong>Escalation Rules</strong> - Automatic escalation for overdue items</li>
</ul>

<h3>Integrations</h3>
<p>Connect Ethico with other systems:</p>
<ul>
  <li><strong>HRIS</strong> - Sync employees from your HR system (Workday, BambooHR, etc.)</li>
  <li><strong>SSO</strong> - Configure single sign-on (Azure AD, Okta, Google)</li>
  <li><strong>Webhooks</strong> - Send events to external systems</li>
  <li><strong>API Access</strong> - Generate API keys for custom integrations</li>
</ul>

<h3>Security Settings</h3>
<ul>
  <li><strong>Password Policy</strong> - Minimum length, complexity, expiration</li>
  <li><strong>Session Timeout</strong> - Automatic logout after inactivity</li>
  <li><strong>Two-Factor Authentication</strong> - Require 2FA for all users</li>
  <li><strong>IP Restrictions</strong> - Limit access to specific IP ranges</li>
</ul>

<h3>Data Retention</h3>
<p>Configure how long data is retained:</p>
<ul>
  <li>Closed case retention period</li>
  <li>Activity log retention</li>
  <li>Archived policy retention</li>
</ul>
    `.trim(),
    tags: ["settings", "organization", "branding", "integrations", "security"],
  },

  {
    slug: "user-management",
    title: "User Management",
    category: "settings",
    sortOrder: 2,
    excerpt:
      "How to add users, assign roles, manage permissions, and handle user lifecycle.",
    content: `
<h2>Managing Users</h2>
<p>User management includes creating accounts, assigning roles, and managing the user lifecycle. Only System Admins can access user management settings.</p>

<h3>Adding New Users</h3>
<ol>
  <li>Navigate to Settings > Users</li>
  <li>Click "Add User"</li>
  <li>Enter email address and name</li>
  <li>Assign one or more roles</li>
  <li>Optionally set scope restrictions (business unit, region)</li>
  <li>Click "Send Invitation"</li>
</ol>
<p>The user receives an email to set their password and complete registration.</p>

<h3>Role Assignment</h3>
<p>Each user needs at least one role. Common combinations:</p>
<ul>
  <li><strong>Investigator</strong> - For staff who work on assigned cases</li>
  <li><strong>Triage Lead</strong> - For intake coordinators who route cases</li>
  <li><strong>Compliance Officer + Policy Author</strong> - For CCO staff who manage policies</li>
  <li><strong>System Admin</strong> - For IT or compliance leadership who configure the system</li>
</ul>

<h3>Permission Scoping</h3>
<p>Limit user access by organizational scope:</p>
<ul>
  <li><strong>Business Unit</strong> - See only cases from their business unit</li>
  <li><strong>Location</strong> - Restrict to specific office locations</li>
  <li><strong>Category</strong> - Access only certain case categories</li>
</ul>
<p>Scopes are additive with roles - users see the intersection of their role permissions and scope restrictions.</p>

<h3>Bulk Operations</h3>
<p>For larger organizations:</p>
<ul>
  <li><strong>Import Users</strong> - Upload a CSV to create multiple users</li>
  <li><strong>HRIS Sync</strong> - Automatically provision users from HR system</li>
  <li><strong>Bulk Role Assignment</strong> - Assign roles to multiple users at once</li>
</ul>

<h3>User Lifecycle</h3>
<p>Manage users through their employment:</p>
<ul>
  <li><strong>Active</strong> - Normal access based on roles</li>
  <li><strong>Suspended</strong> - Temporarily disabled (e.g., leave of absence)</li>
  <li><strong>Deactivated</strong> - Permanently disabled (e.g., termination)</li>
</ul>
<p>Deactivated users cannot log in but their historical actions are preserved.</p>

<h3>Password Resets</h3>
<p>Users can reset their own passwords via the login page. Admins can also:</p>
<ul>
  <li>Force a password reset on next login</li>
  <li>Send a password reset link manually</li>
</ul>
    `.trim(),
    tags: ["users", "roles", "permissions", "admin", "lifecycle"],
  },

  // ================================
  // FAQ (2 articles)
  // ================================
  {
    slug: "faq-general",
    title: "Frequently Asked Questions",
    category: "faq",
    sortOrder: 1,
    excerpt: "Answers to common questions about using the Ethico platform.",
    content: `
<h2>General Questions</h2>

<h3>What is the Ethico Risk Intelligence Platform?</h3>
<p>Ethico is a comprehensive compliance management platform that combines ethics hotline management, case investigations, policy management, and compliance campaigns in one unified system. It helps organizations manage their compliance programs more efficiently with AI-assisted features.</p>

<h3>How do I get access to the platform?</h3>
<p>Your organization's System Admin creates your account and sends an invitation email. Follow the link in the email to set your password and complete registration. If you haven't received an invitation, contact your compliance or IT department.</p>

<h3>I forgot my password. How do I reset it?</h3>
<p>Click the "Forgot Password" link on the login page and enter your email address. You'll receive a password reset link within a few minutes. If you don't receive it, check your spam folder or contact your System Admin.</p>

<h3>Why can't I see certain cases or features?</h3>
<p>Your access is determined by your assigned roles and permission scopes. If you believe you need additional access, contact your System Admin. They can adjust your roles or scopes as needed.</p>

<h3>How is my data protected?</h3>
<p>Ethico uses industry-standard security practices including encryption in transit and at rest, role-based access control, audit logging, and regular security assessments. Your data is isolated from other organizations using database-level security.</p>

<h3>Can I use Ethico on mobile devices?</h3>
<p>Yes, Ethico is a web application that works on modern mobile browsers. While optimized for desktop use, you can access key features from your phone or tablet when needed.</p>

<h3>Who do I contact for support?</h3>
<p>Use the Help & Support section (click the Help icon in the top navigation) to search the knowledge base or submit a support ticket. For urgent issues, contact your organization's System Admin who can escalate to Ethico support.</p>

<h3>How often is the platform updated?</h3>
<p>Ethico releases regular updates with new features, improvements, and security patches. Updates are applied automatically without requiring any action from you. Release notes are available in the Help section.</p>
    `.trim(),
    tags: ["faq", "general", "questions", "help"],
  },

  {
    slug: "troubleshooting",
    title: "Troubleshooting Common Issues",
    category: "faq",
    sortOrder: 2,
    excerpt:
      "Solutions for common issues including login problems, data not loading, and browser compatibility.",
    content: `
<h2>Common Issues and Solutions</h2>

<h3>I can't log in to my account</h3>
<p>Try these steps:</p>
<ul>
  <li>Verify you're using the correct email address</li>
  <li>Check caps lock - passwords are case-sensitive</li>
  <li>Use "Forgot Password" to reset your password</li>
  <li>Clear your browser cookies and try again</li>
  <li>If using SSO, ensure your corporate account is active</li>
</ul>
<p>If still unable to log in, contact your System Admin to verify your account status.</p>

<h3>Data is not loading or pages are slow</h3>
<p>Performance issues may be caused by:</p>
<ul>
  <li><strong>Slow internet connection</strong> - Test your connection speed</li>
  <li><strong>Browser extensions</strong> - Try disabling ad blockers or privacy extensions</li>
  <li><strong>Outdated browser</strong> - Update to the latest version</li>
  <li><strong>Cache issues</strong> - Clear browser cache and refresh</li>
</ul>
<p>If problems persist, try a different browser or device to isolate the issue.</p>

<h3>I'm not receiving email notifications</h3>
<p>Check the following:</p>
<ul>
  <li>Verify your email address is correct in your profile</li>
  <li>Check your spam/junk folder</li>
  <li>Add ethico emails to your safe sender list</li>
  <li>Check your notification preferences in Settings</li>
</ul>
<p>Your organization may have email filtering that blocks notifications - contact your IT team.</p>

<h3>Attachments won't upload</h3>
<p>File upload issues may be due to:</p>
<ul>
  <li><strong>File size</strong> - Maximum file size is typically 25MB</li>
  <li><strong>File type</strong> - Certain file types may be blocked for security</li>
  <li><strong>Network issues</strong> - Large uploads need stable connections</li>
</ul>
<p>Try compressing the file or splitting into smaller files.</p>

<h3>Search isn't finding what I'm looking for</h3>
<p>Improve your search results:</p>
<ul>
  <li>Use fewer, more specific keywords</li>
  <li>Try different word forms (report vs. reporting)</li>
  <li>Use filters to narrow by date, category, or status</li>
  <li>Check that you have permission to view the items you're searching for</li>
</ul>

<h3>Browser Compatibility</h3>
<p>Ethico supports the following browsers:</p>
<ul>
  <li>Google Chrome (recommended) - latest version</li>
  <li>Mozilla Firefox - latest version</li>
  <li>Microsoft Edge - latest version</li>
  <li>Safari - latest version</li>
</ul>
<p>Internet Explorer is not supported. For best experience, use Chrome or Edge.</p>

<h3>Still need help?</h3>
<p>If you can't resolve the issue:</p>
<ol>
  <li>Note the exact error message or behavior</li>
  <li>Note what steps led to the issue</li>
  <li>Submit a support ticket with these details</li>
  <li>Include screenshots if possible</li>
</ol>
    `.trim(),
    tags: ["troubleshooting", "login", "browser", "errors", "help"],
  },
];

// ===========================================
// Seeder Function
// ===========================================

/**
 * Seeds knowledge base articles as global articles (organizationId: null).
 * These articles are available to all tenants.
 */
export async function seedPhase23(): Promise<void> {
  console.log("\n========================================");
  console.log("PHASE 23 SEED - Help & Support System");
  console.log("========================================\n");

  console.log("Seeding global knowledge base articles...\n");

  let created = 0;
  let updated = 0;

  for (const article of KNOWLEDGE_BASE_ARTICLES) {
    const result = await prisma.knowledgeBaseArticle.upsert({
      where: { slug: article.slug },
      update: {
        title: article.title,
        category: article.category,
        sortOrder: article.sortOrder,
        excerpt: article.excerpt,
        content: article.content,
        tags: article.tags,
        isPublished: true,
        updatedAt: new Date(),
      },
      create: {
        slug: article.slug,
        title: article.title,
        category: article.category,
        sortOrder: article.sortOrder,
        excerpt: article.excerpt,
        content: article.content,
        tags: article.tags,
        isPublished: true,
        organizationId: null, // Global article - available to all tenants
      },
    });

    // Check if this was a create or update by comparing timestamps
    const isNew =
      result.createdAt.getTime() ===
      (result.updatedAt?.getTime() ?? result.createdAt.getTime());
    if (isNew) {
      created++;
      console.log(`  + Created: ${article.title}`);
    } else {
      updated++;
      console.log(`  ~ Updated: ${article.title}`);
    }
  }

  console.log("\n========================================");
  console.log("PHASE 23 SEED COMPLETE");
  console.log("========================================");
  console.log(`\nSummary:`);
  console.log(`  - Articles created: ${created}`);
  console.log(`  - Articles updated: ${updated}`);
  console.log(`  - Total articles: ${KNOWLEDGE_BASE_ARTICLES.length}`);
  console.log(
    `  - Categories covered: ${new Set(KNOWLEDGE_BASE_ARTICLES.map((a) => a.category)).size}`,
  );
  console.log("========================================\n");
}

// Run if executed directly
if (require.main === module) {
  seedPhase23()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
