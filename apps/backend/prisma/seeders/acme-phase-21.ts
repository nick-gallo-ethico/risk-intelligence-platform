/**
 * Phase 21 Demo Data Seeder - Project Management Module
 *
 * Seeds Acme Co. with Phase 21 specific data:
 * - 6 system project templates for common compliance projects
 * - 5 Acme Co. projects at various stages with realistic tasks
 * - Custom columns demonstrating column flexibility
 *
 * NOTE: ProjectUpdate, ProjectTaskSubscriber, and ProjectTaskDependency models
 * do not exist in the current schema. These are skipped.
 *
 * Usage:
 *   npx ts-node prisma/seeders/acme-phase-21.ts
 *
 * Or via seed orchestrator:
 *   npm run db:seed
 */

import {
  PrismaClient,
  Prisma,
  MilestoneCategory,
  MilestoneStatus,
  ProjectTaskStatus,
  ProjectTaskPriority,
  ProjectColumnType,
} from "@prisma/client";
import { faker } from "@faker-js/faker";
import * as crypto from "crypto";

const prisma = new PrismaClient();

// ===========================================
// Helper Functions
// ===========================================

function generateUUID(): string {
  return crypto.randomUUID();
}

function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ===========================================
// Types
// ===========================================

interface AcmeContext {
  organizationId: string;
  systemAdminId: string;
  userMap: Record<string, string>; // email -> userId
}

interface TemplateGroup {
  name: string;
  color: string;
  tasks: {
    title: string;
    priority: ProjectTaskPriority;
    defaultAssigneeRole?: string;
  }[];
}

interface TemplateDefinition {
  name: string;
  description: string;
  category: MilestoneCategory;
  groups: TemplateGroup[];
}

interface ProjectDefinition {
  name: string;
  category: MilestoneCategory;
  status: MilestoneStatus;
  ownerEmail: string;
  targetDaysFromNow: number;
  completedDaysAgo?: number;
  progressPercent: number;
  groups: {
    name: string;
    color: string;
    tasks: {
      title: string;
      status: ProjectTaskStatus;
      priority: ProjectTaskPriority;
      assigneeEmail?: string;
      startDaysAgo?: number;
      dueDaysFromNow?: number;
      completedDaysAgo?: number;
      description?: string;
    }[];
  }[];
  columns: {
    name: string;
    type: ProjectColumnType;
    settings?: Record<string, unknown>;
  }[];
  notes?: string;
}

// ===========================================
// System Templates Data
// ===========================================

const SYSTEM_TEMPLATES: TemplateDefinition[] = [
  {
    name: "New Client Implementation",
    description:
      "Standard workflow for new client implementations from kickoff through go-live. Includes discovery, configuration, data migration, testing, and training phases.",
    category: MilestoneCategory.PROJECT,
    groups: [
      {
        name: "Kickoff",
        color: "#3b82f6",
        tasks: [
          {
            title: "Schedule kickoff meeting",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Create project timeline",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Identify key stakeholders",
            priority: ProjectTaskPriority.MEDIUM,
          },
          {
            title: "Set up project communication channels",
            priority: ProjectTaskPriority.MEDIUM,
          },
        ],
      },
      {
        name: "Configuration",
        color: "#8b5cf6",
        tasks: [
          {
            title: "Configure SSO/authentication",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Set up user roles and permissions",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Configure categories and workflows",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Customize branding and themes",
            priority: ProjectTaskPriority.LOW,
          },
          {
            title: "Enable required modules",
            priority: ProjectTaskPriority.MEDIUM,
          },
        ],
      },
      {
        name: "Data Migration",
        color: "#f59e0b",
        tasks: [
          {
            title: "Map source data fields",
            priority: ProjectTaskPriority.HIGH,
          },
          { title: "Perform test import", priority: ProjectTaskPriority.HIGH },
          {
            title: "Validate imported data",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Execute production migration",
            priority: ProjectTaskPriority.CRITICAL,
          },
        ],
      },
      {
        name: "Testing & Training",
        color: "#22c55e",
        tasks: [
          { title: "Conduct UAT testing", priority: ProjectTaskPriority.HIGH },
          { title: "Train admin users", priority: ProjectTaskPriority.HIGH },
          { title: "Train end users", priority: ProjectTaskPriority.MEDIUM },
          {
            title: "Document custom configurations",
            priority: ProjectTaskPriority.MEDIUM,
          },
        ],
      },
      {
        name: "Go-Live",
        color: "#ef4444",
        tasks: [
          {
            title: "Complete go-live checklist",
            priority: ProjectTaskPriority.CRITICAL,
          },
          {
            title: "Verify all integrations",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Switch DNS/enable production",
            priority: ProjectTaskPriority.CRITICAL,
          },
          {
            title: "Post-launch monitoring",
            priority: ProjectTaskPriority.HIGH,
          },
        ],
      },
    ],
  },
  {
    name: "Annual Policy Review",
    description:
      "Systematic review and update of compliance policies. Covers identification, review, approval, and distribution phases.",
    category: MilestoneCategory.AUDIT,
    groups: [
      {
        name: "Policy Identification",
        color: "#3b82f6",
        tasks: [
          {
            title: "Inventory existing policies",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Identify policies due for review",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Prioritize review sequence",
            priority: ProjectTaskPriority.MEDIUM,
          },
        ],
      },
      {
        name: "Review & Update",
        color: "#8b5cf6",
        tasks: [
          {
            title: "Review regulatory changes",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Update policy content",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Track changes and rationale",
            priority: ProjectTaskPriority.MEDIUM,
          },
          {
            title: "SME review and feedback",
            priority: ProjectTaskPriority.MEDIUM,
          },
        ],
      },
      {
        name: "Approval",
        color: "#f59e0b",
        tasks: [
          { title: "Legal review", priority: ProjectTaskPriority.HIGH },
          { title: "Compliance sign-off", priority: ProjectTaskPriority.HIGH },
          { title: "Executive approval", priority: ProjectTaskPriority.HIGH },
        ],
      },
      {
        name: "Distribution & Attestation",
        color: "#22c55e",
        tasks: [
          {
            title: "Publish updated policies",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Send attestation campaign",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Track completion rates",
            priority: ProjectTaskPriority.MEDIUM,
          },
          {
            title: "Follow up on non-responders",
            priority: ProjectTaskPriority.MEDIUM,
          },
        ],
      },
    ],
  },
  {
    name: "Compliance Audit Preparation",
    description:
      "Structured preparation for compliance audits including scoping, evidence collection, internal review, and remediation.",
    category: MilestoneCategory.AUDIT,
    groups: [
      {
        name: "Scoping",
        color: "#3b82f6",
        tasks: [
          {
            title: "Define audit scope and objectives",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Identify control areas",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Create audit timeline",
            priority: ProjectTaskPriority.MEDIUM,
          },
          {
            title: "Assign control owners",
            priority: ProjectTaskPriority.MEDIUM,
          },
        ],
      },
      {
        name: "Evidence Collection",
        color: "#8b5cf6",
        tasks: [
          {
            title: "Gather policy documentation",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Collect process evidence",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Document system configurations",
            priority: ProjectTaskPriority.MEDIUM,
          },
          {
            title: "Compile training records",
            priority: ProjectTaskPriority.MEDIUM,
          },
          {
            title: "Organize supporting materials",
            priority: ProjectTaskPriority.LOW,
          },
        ],
      },
      {
        name: "Internal Review",
        color: "#f59e0b",
        tasks: [
          {
            title: "Control self-assessment",
            priority: ProjectTaskPriority.HIGH,
          },
          { title: "Gap analysis", priority: ProjectTaskPriority.HIGH },
          {
            title: "Review evidence completeness",
            priority: ProjectTaskPriority.MEDIUM,
          },
        ],
      },
      {
        name: "Remediation",
        color: "#ef4444",
        tasks: [
          {
            title: "Address identified gaps",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Update documentation",
            priority: ProjectTaskPriority.MEDIUM,
          },
          {
            title: "Implement process improvements",
            priority: ProjectTaskPriority.MEDIUM,
          },
        ],
      },
      {
        name: "Submission",
        color: "#22c55e",
        tasks: [
          {
            title: "Final evidence review",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Submit audit package",
            priority: ProjectTaskPriority.CRITICAL,
          },
          {
            title: "Schedule auditor interviews",
            priority: ProjectTaskPriority.MEDIUM,
          },
        ],
      },
    ],
  },
  {
    name: "Investigation Project",
    description:
      "Template for complex investigations requiring project-level tracking. Covers intake, investigation activities, documentation, and closure.",
    category: MilestoneCategory.INVESTIGATION,
    groups: [
      {
        name: "Intake & Assignment",
        color: "#3b82f6",
        tasks: [
          {
            title: "Review initial report",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Assign investigation team",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Define investigation scope",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Create investigation plan",
            priority: ProjectTaskPriority.MEDIUM,
          },
        ],
      },
      {
        name: "Investigation",
        color: "#8b5cf6",
        tasks: [
          {
            title: "Collect relevant documents",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Conduct witness interviews",
            priority: ProjectTaskPriority.HIGH,
          },
          { title: "Interview subject(s)", priority: ProjectTaskPriority.HIGH },
          { title: "Analyze evidence", priority: ProjectTaskPriority.HIGH },
          {
            title: "Timeline reconstruction",
            priority: ProjectTaskPriority.MEDIUM,
          },
        ],
      },
      {
        name: "Documentation",
        color: "#f59e0b",
        tasks: [
          { title: "Document findings", priority: ProjectTaskPriority.HIGH },
          {
            title: "Draft investigation report",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Legal review of report",
            priority: ProjectTaskPriority.MEDIUM,
          },
        ],
      },
      {
        name: "Remediation",
        color: "#ef4444",
        tasks: [
          {
            title: "Determine corrective actions",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Coordinate with HR/Legal",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Implement remediation",
            priority: ProjectTaskPriority.MEDIUM,
          },
        ],
      },
      {
        name: "Close-out",
        color: "#22c55e",
        tasks: [
          {
            title: "Final report approval",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Communicate outcomes",
            priority: ProjectTaskPriority.MEDIUM,
          },
          {
            title: "Archive investigation materials",
            priority: ProjectTaskPriority.LOW,
          },
        ],
      },
    ],
  },
  {
    name: "Training Rollout",
    description:
      "Template for rolling out compliance training programs. Includes content development, audience targeting, launch, and monitoring.",
    category: MilestoneCategory.TRAINING,
    groups: [
      {
        name: "Content Development",
        color: "#3b82f6",
        tasks: [
          {
            title: "Define learning objectives",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Develop training content",
            priority: ProjectTaskPriority.HIGH,
          },
          { title: "Create assessments", priority: ProjectTaskPriority.MEDIUM },
          {
            title: "SME review and approval",
            priority: ProjectTaskPriority.MEDIUM,
          },
        ],
      },
      {
        name: "Audience Targeting",
        color: "#8b5cf6",
        tasks: [
          {
            title: "Identify target audience",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Segment by role/department",
            priority: ProjectTaskPriority.MEDIUM,
          },
          {
            title: "Set completion deadlines",
            priority: ProjectTaskPriority.MEDIUM,
          },
        ],
      },
      {
        name: "Launch",
        color: "#f59e0b",
        tasks: [
          {
            title: "Configure training assignment",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Send launch communications",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Activate training campaign",
            priority: ProjectTaskPriority.CRITICAL,
          },
        ],
      },
      {
        name: "Monitoring & Follow-up",
        color: "#22c55e",
        tasks: [
          {
            title: "Track completion rates",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Send reminder notifications",
            priority: ProjectTaskPriority.MEDIUM,
          },
          {
            title: "Escalate non-completions",
            priority: ProjectTaskPriority.MEDIUM,
          },
          {
            title: "Generate completion reports",
            priority: ProjectTaskPriority.LOW,
          },
        ],
      },
    ],
  },
  {
    name: "Disclosure Campaign",
    description:
      "Template for annual disclosure campaigns (COI, gifts & entertainment). Covers form design, audience selection, launch, and reporting.",
    category: MilestoneCategory.CAMPAIGN,
    groups: [
      {
        name: "Form Design",
        color: "#3b82f6",
        tasks: [
          {
            title: "Review disclosure requirements",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Update disclosure form",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Configure approval workflows",
            priority: ProjectTaskPriority.MEDIUM,
          },
          {
            title: "Test form submission",
            priority: ProjectTaskPriority.MEDIUM,
          },
        ],
      },
      {
        name: "Audience Selection",
        color: "#8b5cf6",
        tasks: [
          {
            title: "Define disclosure population",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Verify employee data",
            priority: ProjectTaskPriority.MEDIUM,
          },
          {
            title: "Set submission deadline",
            priority: ProjectTaskPriority.HIGH,
          },
        ],
      },
      {
        name: "Campaign Launch",
        color: "#f59e0b",
        tasks: [
          {
            title: "Draft launch communications",
            priority: ProjectTaskPriority.MEDIUM,
          },
          {
            title: "Schedule reminder cadence",
            priority: ProjectTaskPriority.MEDIUM,
          },
          {
            title: "Launch disclosure campaign",
            priority: ProjectTaskPriority.CRITICAL,
          },
        ],
      },
      {
        name: "Monitoring",
        color: "#22c55e",
        tasks: [
          {
            title: "Track submission rates",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Review flagged disclosures",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Send reminders to non-responders",
            priority: ProjectTaskPriority.MEDIUM,
          },
        ],
      },
      {
        name: "Reporting",
        color: "#06b6d4",
        tasks: [
          {
            title: "Generate completion report",
            priority: ProjectTaskPriority.HIGH,
          },
          {
            title: "Summarize conflict trends",
            priority: ProjectTaskPriority.MEDIUM,
          },
          {
            title: "Present to leadership",
            priority: ProjectTaskPriority.MEDIUM,
          },
        ],
      },
    ],
  },
];

// ===========================================
// Acme Co. Demo Projects Data
// ===========================================

const ACME_PROJECTS: ProjectDefinition[] = [
  {
    name: "Q1 2026 SOX Compliance Audit",
    category: MilestoneCategory.AUDIT,
    status: MilestoneStatus.IN_PROGRESS,
    ownerEmail: "demo-cco@acme.local",
    targetDaysFromNow: 47, // March 31, 2026
    progressPercent: 33,
    notes:
      "Quarterly SOX compliance audit for financial controls. Evidence collection in progress.",
    groups: [
      {
        name: "Evidence Collection",
        color: "#3b82f6",
        tasks: [
          {
            title: "Gather Q1 bank reconciliations",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-investigator@acme.local",
            startDaysAgo: 14,
            completedDaysAgo: 7,
            description:
              "Collect all bank reconciliation documents for Q1 2026",
          },
          {
            title: "Document revenue recognition controls",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-investigator@acme.local",
            startDaysAgo: 12,
            completedDaysAgo: 5,
          },
          {
            title: "Collect access control evidence",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.MEDIUM,
            assigneeEmail: "demo-investigator2@acme.local",
            startDaysAgo: 10,
            completedDaysAgo: 3,
          },
          {
            title: "Compile segregation of duties matrix",
            status: ProjectTaskStatus.IN_PROGRESS,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-investigator@acme.local",
            startDaysAgo: 5,
            dueDaysFromNow: 5,
          },
          {
            title: "Document change management procedures",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.MEDIUM,
            dueDaysFromNow: 10,
          },
        ],
      },
      {
        name: "Internal Review",
        color: "#f59e0b",
        tasks: [
          {
            title: "Review evidence for completeness",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-cco@acme.local",
            startDaysAgo: 3,
            completedDaysAgo: 1,
          },
          {
            title: "Gap analysis of control documentation",
            status: ProjectTaskStatus.IN_PROGRESS,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-cco@acme.local",
            startDaysAgo: 1,
            dueDaysFromNow: 7,
          },
          {
            title: "Management review meeting",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.MEDIUM,
            dueDaysFromNow: 14,
          },
          {
            title: "Control owner sign-off",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.HIGH,
            dueDaysFromNow: 21,
          },
        ],
      },
      {
        name: "Remediation",
        color: "#ef4444",
        tasks: [
          {
            title: "Address identified control gaps",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.HIGH,
            dueDaysFromNow: 30,
          },
          {
            title: "Update control documentation",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.MEDIUM,
            dueDaysFromNow: 35,
          },
          {
            title: "Final audit package preparation",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.CRITICAL,
            dueDaysFromNow: 42,
          },
        ],
      },
    ],
    columns: [
      {
        name: "Control ID",
        type: ProjectColumnType.TEXT,
        settings: { placeholder: "e.g., SOX-301" },
      },
      {
        name: "Risk Level",
        type: ProjectColumnType.LABEL,
        settings: {
          options: ["Low", "Medium", "High"],
          colors: ["#22c55e", "#f59e0b", "#ef4444"],
        },
      },
      {
        name: "Evidence Status",
        type: ProjectColumnType.STATUS,
        settings: {
          statuses: ["Not Started", "In Progress", "Collected", "Verified"],
        },
      },
    ],
  },
  {
    name: "Anti-Harassment Policy Rollout",
    category: MilestoneCategory.TRAINING,
    status: MilestoneStatus.IN_PROGRESS,
    ownerEmail: "demo-manager@acme.local",
    targetDaysFromNow: 16, // Feb 28, 2026
    progressPercent: 55,
    notes:
      "Organization-wide anti-harassment training following updated policy. Good progress on content.",
    groups: [
      {
        name: "Content Development",
        color: "#3b82f6",
        tasks: [
          {
            title: "Update policy content for 2026 regulations",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-policy@acme.local",
            startDaysAgo: 30,
            completedDaysAgo: 20,
          },
          {
            title: "Develop training module slides",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-policy@acme.local",
            startDaysAgo: 25,
            completedDaysAgo: 15,
          },
          {
            title: "Create knowledge assessment quiz",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.MEDIUM,
            assigneeEmail: "demo-policy@acme.local",
            startDaysAgo: 20,
            completedDaysAgo: 10,
          },
          {
            title: "Legal review of training content",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-reviewer@acme.local",
            startDaysAgo: 15,
            completedDaysAgo: 7,
          },
        ],
      },
      {
        name: "Distribution",
        color: "#8b5cf6",
        tasks: [
          {
            title: "Configure training assignment rules",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-admin@acme.local",
            startDaysAgo: 7,
            completedDaysAgo: 5,
          },
          {
            title: "Launch training campaign to all employees",
            status: ProjectTaskStatus.IN_PROGRESS,
            priority: ProjectTaskPriority.CRITICAL,
            assigneeEmail: "demo-manager@acme.local",
            startDaysAgo: 5,
            dueDaysFromNow: 3,
            description: "Currently at 45% completion rate",
          },
          {
            title: "Send manager notification of team progress",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.MEDIUM,
            dueDaysFromNow: 7,
          },
        ],
      },
      {
        name: "Tracking",
        color: "#22c55e",
        tasks: [
          {
            title: "Monitor completion rates daily",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.HIGH,
            dueDaysFromNow: 10,
          },
          {
            title: "Generate final completion report",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.MEDIUM,
            dueDaysFromNow: 14,
          },
        ],
      },
    ],
    columns: [
      {
        name: "Department",
        type: ProjectColumnType.LABEL,
        settings: {
          options: [
            "All",
            "Sales",
            "Engineering",
            "Operations",
            "Finance",
            "HR",
          ],
        },
      },
      {
        name: "Completion Rate",
        type: ProjectColumnType.NUMBER,
        settings: { suffix: "%", min: 0, max: 100 },
      },
    ],
  },
  {
    name: "EMEA Data Privacy Implementation",
    category: MilestoneCategory.PROJECT,
    status: MilestoneStatus.AT_RISK,
    ownerEmail: "demo-reviewer@acme.local",
    targetDaysFromNow: 3, // Feb 15, 2026 - overdue soon!
    progressPercent: 33,
    notes:
      "CRITICAL: Vendor delays blocking system changes. Escalation required.",
    groups: [
      {
        name: "Gap Analysis",
        color: "#3b82f6",
        tasks: [
          {
            title: "Review GDPR Article 30 requirements",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-reviewer@acme.local",
            startDaysAgo: 45,
            completedDaysAgo: 35,
          },
          {
            title: "Assess current data processing activities",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-investigator@acme.local",
            startDaysAgo: 40,
            completedDaysAgo: 30,
          },
          {
            title: "Document compliance gaps",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-reviewer@acme.local",
            startDaysAgo: 35,
            completedDaysAgo: 25,
            description: "15 gaps identified across 4 business units",
          },
        ],
      },
      {
        name: "Policy Updates",
        color: "#8b5cf6",
        tasks: [
          {
            title: "Update privacy notice for EMEA",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-policy@acme.local",
            startDaysAgo: 25,
            completedDaysAgo: 15,
          },
          {
            title: "Revise data retention policy",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-policy@acme.local",
            startDaysAgo: 20,
            completedDaysAgo: 10,
          },
          {
            title: "Create data subject request procedures",
            status: ProjectTaskStatus.IN_PROGRESS,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-policy@acme.local",
            startDaysAgo: 10,
            dueDaysFromNow: -2, // Overdue!
            description: "Blocked waiting for system changes",
          },
          {
            title: "Update vendor contracts with DPA clauses",
            status: ProjectTaskStatus.IN_PROGRESS,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-reviewer@acme.local",
            startDaysAgo: 15,
            dueDaysFromNow: 0, // Due today
          },
        ],
      },
      {
        name: "System Changes",
        color: "#ef4444",
        tasks: [
          {
            title: "Implement consent management module",
            status: ProjectTaskStatus.STUCK,
            priority: ProjectTaskPriority.CRITICAL,
            assigneeEmail: "demo-admin@acme.local",
            startDaysAgo: 20,
            dueDaysFromNow: -5, // Overdue!
            description:
              "BLOCKED: Vendor has not delivered API. Escalation sent to CTO.",
          },
          {
            title: "Configure data export functionality",
            status: ProjectTaskStatus.STUCK,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-admin@acme.local",
            startDaysAgo: 15,
            dueDaysFromNow: -3,
            description: "Depends on consent management module",
          },
          {
            title: "Implement automated data deletion",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.HIGH,
            dueDaysFromNow: 7,
          },
          {
            title: "Set up DSAR tracking dashboard",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.MEDIUM,
            dueDaysFromNow: 10,
          },
          {
            title: "Integration testing",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.HIGH,
            dueDaysFromNow: 14,
          },
        ],
      },
      {
        name: "Training",
        color: "#22c55e",
        tasks: [
          {
            title: "Develop GDPR awareness training",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.HIGH,
            dueDaysFromNow: 21,
          },
          {
            title: "Train customer service on DSAR handling",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.HIGH,
            dueDaysFromNow: 28,
          },
          {
            title: "Train IT on data deletion procedures",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.MEDIUM,
            dueDaysFromNow: 35,
          },
        ],
      },
    ],
    columns: [
      {
        name: "Region",
        type: ProjectColumnType.LABEL,
        settings: {
          options: ["UK", "Germany", "France", "EU-wide"],
          colors: ["#3b82f6", "#000000", "#ef4444", "#8b5cf6"],
        },
      },
      {
        name: "DPA Reference",
        type: ProjectColumnType.TEXT,
        settings: { placeholder: "e.g., Article 6(1)(a)" },
      },
      {
        name: "Impact Level",
        type: ProjectColumnType.STATUS,
        settings: { statuses: ["Low", "Medium", "High", "Critical"] },
      },
    ],
  },
  {
    name: "Annual COI Disclosure Campaign",
    category: MilestoneCategory.CAMPAIGN,
    status: MilestoneStatus.COMPLETED,
    ownerEmail: "demo-cco@acme.local",
    targetDaysFromNow: -12, // Jan 31, 2026 - target was in past
    completedDaysAgo: 15, // Completed Jan 28
    progressPercent: 100,
    notes:
      "Campaign achieved 94% completion rate. Final report submitted to board.",
    groups: [
      {
        name: "Preparation",
        color: "#3b82f6",
        tasks: [
          {
            title: "Review and update COI form",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-cco@acme.local",
            startDaysAgo: 60,
            completedDaysAgo: 50,
          },
          {
            title: "Verify employee population",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-admin@acme.local",
            startDaysAgo: 55,
            completedDaysAgo: 45,
          },
          {
            title: "Configure approval workflows",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.MEDIUM,
            assigneeEmail: "demo-admin@acme.local",
            startDaysAgo: 50,
            completedDaysAgo: 42,
          },
        ],
      },
      {
        name: "Execution",
        color: "#8b5cf6",
        tasks: [
          {
            title: "Launch campaign to all eligible employees",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.CRITICAL,
            assigneeEmail: "demo-cco@acme.local",
            startDaysAgo: 40,
            completedDaysAgo: 40,
          },
          {
            title: "Send week 1 reminder",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.MEDIUM,
            assigneeEmail: "demo-admin@acme.local",
            startDaysAgo: 33,
            completedDaysAgo: 33,
          },
          {
            title: "Send week 2 reminder",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.MEDIUM,
            assigneeEmail: "demo-admin@acme.local",
            startDaysAgo: 26,
            completedDaysAgo: 26,
          },
          {
            title: "Final deadline reminder",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-admin@acme.local",
            startDaysAgo: 18,
            completedDaysAgo: 18,
          },
        ],
      },
      {
        name: "Follow-up",
        color: "#22c55e",
        tasks: [
          {
            title: "Review flagged disclosures",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-cco@acme.local",
            startDaysAgo: 20,
            completedDaysAgo: 17,
            description:
              "12 disclosures flagged for review, 8 required follow-up",
          },
          {
            title: "Generate final completion report",
            status: ProjectTaskStatus.DONE,
            priority: ProjectTaskPriority.HIGH,
            assigneeEmail: "demo-cco@acme.local",
            startDaysAgo: 17,
            completedDaysAgo: 15,
            description:
              "94% completion rate achieved. Report submitted to board.",
          },
        ],
      },
    ],
    columns: [
      {
        name: "Employee Count",
        type: ProjectColumnType.NUMBER,
        settings: { min: 0 },
      },
      {
        name: "Completion Rate",
        type: ProjectColumnType.NUMBER,
        settings: { suffix: "%", min: 0, max: 100 },
      },
    ],
  },
  {
    name: "2026 Compliance Training Plan",
    category: MilestoneCategory.TRAINING,
    status: MilestoneStatus.NOT_STARTED,
    ownerEmail: "demo-manager@acme.local",
    targetDaysFromNow: 138, // June 30, 2026
    progressPercent: 0,
    notes: "Annual training plan. Kickoff meeting scheduled for March.",
    groups: [
      {
        name: "Planning",
        color: "#3b82f6",
        tasks: [
          {
            title: "Review training requirements by role",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.HIGH,
            dueDaysFromNow: 30,
            description:
              "Identify mandatory vs optional training by job function",
          },
          {
            title: "Assess training budget",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.MEDIUM,
            dueDaysFromNow: 35,
          },
          {
            title: "Create annual training calendar",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.HIGH,
            dueDaysFromNow: 45,
          },
        ],
      },
      {
        name: "Content",
        color: "#8b5cf6",
        tasks: [
          {
            title: "Inventory existing training materials",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.MEDIUM,
            dueDaysFromNow: 50,
          },
          {
            title: "Identify content gaps",
            status: ProjectTaskStatus.NOT_STARTED,
            priority: ProjectTaskPriority.MEDIUM,
            dueDaysFromNow: 60,
          },
        ],
      },
    ],
    columns: [
      {
        name: "Quarter",
        type: ProjectColumnType.LABEL,
        settings: { options: ["Q1", "Q2", "Q3", "Q4"] },
      },
      {
        name: "Audience Size",
        type: ProjectColumnType.NUMBER,
        settings: { min: 0 },
      },
    ],
  },
];

// ===========================================
// Seeder Functions
// ===========================================

async function seedSystemTemplates(): Promise<number> {
  console.log("\n1. Creating System Project Templates...");
  let createdCount = 0;

  for (const template of SYSTEM_TEMPLATES) {
    // Check if template already exists (idempotent by name)
    const existing = await prisma.projectTemplate.findFirst({
      where: {
        name: template.name,
        isSystem: true,
        organizationId: null,
      },
    });

    if (existing) {
      console.log(`  - Template already exists: ${template.name}`);
      continue;
    }

    // Build templateData structure
    const templateData = {
      groups: template.groups.map((g, gIdx) => ({
        name: g.name,
        color: g.color,
        sortOrder: gIdx,
        tasks: g.tasks.map((t, tIdx) => ({
          title: t.title,
          priority: t.priority,
          sortOrder: tIdx,
          defaultAssigneeRole: t.defaultAssigneeRole,
        })),
      })),
    };

    await prisma.projectTemplate.create({
      data: {
        id: generateUUID(),
        organizationId: null,
        name: template.name,
        description: template.description,
        category: template.category,
        templateData: templateData as unknown as Prisma.InputJsonValue,
        isSystem: true,
        createdById: null,
      },
    });

    createdCount++;
    console.log(`  + Created: ${template.name} (${template.category})`);
  }

  return createdCount;
}

async function seedAcmeProjects(ctx: AcmeContext): Promise<number> {
  console.log("\n2. Creating Acme Co. Projects...");
  let createdCount = 0;
  const now = new Date();

  for (const project of ACME_PROJECTS) {
    // Check if project already exists (idempotent by name)
    const existing = await prisma.milestone.findFirst({
      where: {
        organizationId: ctx.organizationId,
        name: project.name,
      },
    });

    if (existing) {
      console.log(`  - Project already exists: ${project.name}`);
      continue;
    }

    // Resolve owner user ID
    const ownerId = ctx.userMap[project.ownerEmail];
    if (!ownerId) {
      console.log(
        `  ! Warning: Owner not found for ${project.name}: ${project.ownerEmail}`,
      );
      continue;
    }

    // Calculate dates
    const targetDate = addDays(now, project.targetDaysFromNow);
    const completedAt = project.completedDaysAgo
      ? subDays(now, project.completedDaysAgo)
      : null;

    // Count total items for progress tracking
    const totalItems = project.groups.reduce(
      (sum, g) => sum + g.tasks.length,
      0,
    );
    const completedItems = project.groups.reduce(
      (sum, g) =>
        sum + g.tasks.filter((t) => t.status === ProjectTaskStatus.DONE).length,
      0,
    );

    // Create milestone (project)
    const milestone = await prisma.milestone.create({
      data: {
        id: generateUUID(),
        organizationId: ctx.organizationId,
        name: project.name,
        description: project.notes,
        category: project.category,
        targetDate,
        completedAt,
        status: project.status,
        totalItems,
        completedItems,
        progressPercent: project.progressPercent,
        ownerId,
        createdById: ownerId,
      },
    });

    console.log(`  + Created project: ${project.name} (${project.status})`);

    // Create groups and tasks
    for (let gIdx = 0; gIdx < project.groups.length; gIdx++) {
      const groupDef = project.groups[gIdx];

      const group = await prisma.projectGroup.create({
        data: {
          id: generateUUID(),
          organizationId: ctx.organizationId,
          milestoneId: milestone.id,
          name: groupDef.name,
          color: groupDef.color,
          sortOrder: gIdx,
          isCollapsed: false,
        },
      });

      // Create tasks in this group
      for (let tIdx = 0; tIdx < groupDef.tasks.length; tIdx++) {
        const taskDef = groupDef.tasks[tIdx];

        // Resolve assignee
        const assigneeId = taskDef.assigneeEmail
          ? ctx.userMap[taskDef.assigneeEmail]
          : null;

        // Calculate task dates
        const startDate = taskDef.startDaysAgo
          ? subDays(now, taskDef.startDaysAgo)
          : null;
        const dueDate =
          taskDef.dueDaysFromNow !== undefined
            ? addDays(now, taskDef.dueDaysFromNow)
            : null;
        const taskCompletedAt = taskDef.completedDaysAgo
          ? subDays(now, taskDef.completedDaysAgo)
          : null;

        await prisma.projectTask.create({
          data: {
            id: generateUUID(),
            organizationId: ctx.organizationId,
            milestoneId: milestone.id,
            groupId: group.id,
            title: taskDef.title,
            description: taskDef.description,
            status: taskDef.status,
            priority: taskDef.priority,
            assigneeId,
            startDate,
            dueDate,
            completedAt: taskCompletedAt,
            sortOrder: tIdx,
            createdById: ownerId,
          },
        });
      }

      console.log(
        `    - Group: ${groupDef.name} (${groupDef.tasks.length} tasks)`,
      );
    }

    // Create custom columns
    for (let cIdx = 0; cIdx < project.columns.length; cIdx++) {
      const colDef = project.columns[cIdx];

      await prisma.projectColumn.create({
        data: {
          id: generateUUID(),
          organizationId: ctx.organizationId,
          milestoneId: milestone.id,
          name: colDef.name,
          type: colDef.type,
          settings: colDef.settings
            ? (colDef.settings as unknown as Prisma.InputJsonValue)
            : undefined,
          sortOrder: cIdx,
          isRequired: false,
        },
      });
    }

    console.log(`    - Columns: ${project.columns.length} custom columns`);

    createdCount++;
  }

  return createdCount;
}

// ===========================================
// Main Seeder
// ===========================================

/**
 * Main seeder function for Phase 21 Acme Co. demo data.
 * Creates system project templates and Acme Co. demo projects.
 */
export async function seedPhase21(): Promise<void> {
  console.log("\n========================================");
  console.log("ACME PHASE 21 SEED - Project Management");
  console.log("========================================\n");

  // Initialize faker for reproducibility
  faker.seed(20260221);

  // Get Acme organization
  const acmeOrg = await prisma.organization.findFirst({
    where: {
      OR: [{ slug: "acme-corp" }, { name: { contains: "Acme" } }],
    },
  });

  if (!acmeOrg) {
    console.error("ERROR: Acme organization not found. Run base seed first.");
    return;
  }

  console.log(`Found Acme organization: ${acmeOrg.name} (${acmeOrg.id})`);

  // Get system admin user
  const systemAdmin = await prisma.user.findFirst({
    where: {
      organizationId: acmeOrg.id,
      OR: [{ email: "demo-admin@acme.local" }, { role: "SYSTEM_ADMIN" }],
    },
  });

  if (!systemAdmin) {
    console.error("ERROR: System admin user not found.");
    return;
  }

  console.log(`System Admin: ${systemAdmin.email}`);

  // Build userMap from demo users
  const demoUsers = await prisma.user.findMany({
    where: {
      organizationId: acmeOrg.id,
      email: { contains: "demo-" },
    },
    select: { id: true, email: true },
  });

  const userMap: Record<string, string> = {};
  for (const user of demoUsers) {
    userMap[user.email] = user.id;
  }

  console.log(`Found ${demoUsers.length} demo users`);

  const ctx: AcmeContext = {
    organizationId: acmeOrg.id,
    systemAdminId: systemAdmin.id,
    userMap,
  };

  // Seed system templates (organizationId = null)
  const templatesCreated = await seedSystemTemplates();

  // Seed Acme Co. projects
  const projectsCreated = await seedAcmeProjects(ctx);

  // Summary
  console.log("\n========================================");
  console.log("ACME PHASE 21 SEED COMPLETE");
  console.log("========================================");
  console.log(`\nSummary:`);
  console.log(`  - System templates created: ${templatesCreated}`);
  console.log(`  - Acme Co. projects created: ${projectsCreated}`);
  console.log(
    "\nNote: ProjectUpdate, ProjectTaskSubscriber, and ProjectTaskDependency",
  );
  console.log(
    "models do not exist in schema. Skipped conversation/subscriber/dependency seeding.",
  );
  console.log("========================================\n");
}

// Run if executed directly
if (require.main === module) {
  seedPhase21()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
