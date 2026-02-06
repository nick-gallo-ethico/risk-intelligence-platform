/**
 * Checklist Templates for Implementation Projects
 *
 * Defines phase-based task templates for different implementation types:
 * - SMB Quick Start: 1-2 week self-serve
 * - Enterprise Full: 6-8 week guided implementation
 * - Healthcare HIPAA: Industry-specific with compliance tasks
 * - Financial SOX: Industry-specific with SOX controls
 * - General Business: Standard 4-6 week implementation
 *
 * @see CONTEXT.md for implementation decisions
 */

import {
  ImplementationType,
  ImplementationPhase,
  PlgPhase,
} from "../types/implementation.types";

/**
 * Task template for implementation checklists
 */
export interface TaskTemplate {
  name: string;
  description?: string;
  isRequired: boolean;
  estimatedHours?: number;
}

/**
 * Phase template containing tasks
 */
export interface PhaseTemplate {
  phase: ImplementationPhase | PlgPhase;
  name: string;
  tasks: TaskTemplate[];
}

/**
 * Complete checklist template for an implementation type
 */
export interface ChecklistTemplate {
  type: ImplementationType;
  name: string;
  description: string;
  phases: PhaseTemplate[];
  estimatedWeeks: number;
}

/**
 * Checklist templates for all implementation types
 */
export const CHECKLIST_TEMPLATES: Record<ImplementationType, ChecklistTemplate> =
  {
    [ImplementationType.SMB_QUICK_START]: {
      type: ImplementationType.SMB_QUICK_START,
      name: "SMB Quick Start",
      description: "Self-serve implementation for small businesses (1-2 weeks)",
      estimatedWeeks: 2,
      phases: [
        {
          phase: ImplementationPhase.CONFIGURATION,
          name: "Setup",
          tasks: [
            {
              name: "Create tenant account",
              description: "Provision new tenant with basic configuration",
              isRequired: true,
              estimatedHours: 1,
            },
            {
              name: "Upload logo and configure branding",
              description: "Apply customer brand colors and logo",
              isRequired: true,
              estimatedHours: 0.5,
            },
            {
              name: "Set up authentication",
              description: "Configure SSO or password-based auth",
              isRequired: true,
              estimatedHours: 1,
            },
            {
              name: "Invite first admin",
              description: "Send invitation to primary admin user",
              isRequired: true,
              estimatedHours: 0.5,
            },
          ],
        },
        {
          phase: ImplementationPhase.UAT,
          name: "First Steps",
          tasks: [
            {
              name: "Create first policy",
              description: "Help customer create their first policy document",
              isRequired: false,
              estimatedHours: 1,
            },
            {
              name: "Set up categories",
              description: "Configure case and disclosure categories",
              isRequired: true,
              estimatedHours: 1,
            },
            {
              name: "Configure email templates",
              description: "Customize notification email content",
              isRequired: false,
              estimatedHours: 1,
            },
            {
              name: "Test hotline number",
              description: "Verify hotline routing and intake flow",
              isRequired: true,
              estimatedHours: 0.5,
            },
          ],
        },
        {
          phase: ImplementationPhase.GO_LIVE,
          name: "Go Live",
          tasks: [
            {
              name: "Invite team members",
              description: "Send invitations to all users",
              isRequired: true,
              estimatedHours: 0.5,
            },
            {
              name: "Complete admin certification",
              description: "Admin must pass platform fundamentals course",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Sign terms of service",
              description: "Legal agreement signature required",
              isRequired: true,
              estimatedHours: 0.5,
            },
          ],
        },
      ],
    },

    [ImplementationType.ENTERPRISE_FULL]: {
      type: ImplementationType.ENTERPRISE_FULL,
      name: "Enterprise Full",
      description: "Guided implementation for enterprise clients (6-8 weeks)",
      estimatedWeeks: 8,
      phases: [
        {
          phase: ImplementationPhase.DISCOVERY,
          name: "Discovery",
          tasks: [
            {
              name: "Kickoff meeting",
              description:
                "Introduction, stakeholder alignment, project timeline review",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Requirements gathering",
              description: "Document detailed business requirements and use cases",
              isRequired: true,
              estimatedHours: 4,
            },
            {
              name: "Process mapping workshop",
              description: "Map current compliance workflows and pain points",
              isRequired: true,
              estimatedHours: 4,
            },
            {
              name: "Integration requirements review",
              description: "Assess HRIS, SSO, and third-party integrations",
              isRequired: false,
              estimatedHours: 2,
            },
            {
              name: "Data migration planning",
              description: "Identify data sources and migration approach",
              isRequired: false,
              estimatedHours: 3,
            },
          ],
        },
        {
          phase: ImplementationPhase.CONFIGURATION,
          name: "Configuration",
          tasks: [
            {
              name: "Tenant provisioning",
              description: "Create tenant with enterprise settings",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Organization structure setup",
              description:
                "Configure departments, locations, business units hierarchy",
              isRequired: true,
              estimatedHours: 3,
            },
            {
              name: "Category taxonomy configuration",
              description: "Set up case categories, severity levels, tags",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Workflow configuration",
              description: "Configure case routing, SLAs, escalation rules",
              isRequired: true,
              estimatedHours: 4,
            },
            {
              name: "Branding and white-labeling",
              description: "Apply complete brand identity across platform",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "SSO integration",
              description: "Configure Azure AD, Okta, or SAML integration",
              isRequired: false,
              estimatedHours: 4,
            },
            {
              name: "HRIS integration",
              description: "Connect employee data sync from HR system",
              isRequired: false,
              estimatedHours: 4,
            },
            {
              name: "Custom fields setup",
              description: "Configure custom properties for cases and disclosures",
              isRequired: false,
              estimatedHours: 2,
            },
            {
              name: "Email template customization",
              description: "Tailor notification templates to brand voice",
              isRequired: false,
              estimatedHours: 2,
            },
          ],
        },
        {
          phase: ImplementationPhase.DATA_MIGRATION,
          name: "Data Migration",
          tasks: [
            {
              name: "Data export from legacy system",
              description: "Extract data from NAVEX, EQS, or other system",
              isRequired: false,
              estimatedHours: 4,
            },
            {
              name: "Field mapping review",
              description:
                "Review AI-suggested mappings, adjust as needed",
              isRequired: false,
              estimatedHours: 2,
            },
            {
              name: "Test migration (sandbox)",
              description: "Run migration in sandbox environment",
              isRequired: false,
              estimatedHours: 3,
            },
            {
              name: "Migration validation",
              description: "Verify data integrity, spot-check records",
              isRequired: false,
              estimatedHours: 2,
            },
            {
              name: "Production migration",
              description: "Execute final migration to production",
              isRequired: false,
              estimatedHours: 2,
            },
          ],
        },
        {
          phase: ImplementationPhase.UAT,
          name: "User Acceptance Testing",
          tasks: [
            {
              name: "Admin training session",
              description: "Train platform administrators on configuration",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Investigator training session",
              description: "Train investigators on case management workflow",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "End-to-end workflow testing",
              description: "Test complete case lifecycle from intake to closure",
              isRequired: true,
              estimatedHours: 4,
            },
            {
              name: "Integration testing",
              description: "Verify SSO, HRIS, and other integrations",
              isRequired: false,
              estimatedHours: 2,
            },
            {
              name: "User feedback collection",
              description: "Gather feedback from test users",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Issue remediation",
              description: "Address issues identified during testing",
              isRequired: true,
              estimatedHours: 4,
            },
          ],
        },
        {
          phase: ImplementationPhase.GO_LIVE,
          name: "Go-Live",
          tasks: [
            {
              name: "Go-live readiness review",
              description: "Final checklist review with stakeholders",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "User communication sent",
              description: "Send launch announcement to all users",
              isRequired: true,
              estimatedHours: 1,
            },
            {
              name: "Production cutover",
              description: "Switch from legacy to new platform",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Hotline number activation",
              description: "Port or activate production hotline number",
              isRequired: true,
              estimatedHours: 1,
            },
            {
              name: "Post-launch monitoring (24h)",
              description: "Monitor platform for issues during first 24 hours",
              isRequired: true,
              estimatedHours: 8,
            },
          ],
        },
        {
          phase: ImplementationPhase.OPTIMIZATION,
          name: "Optimization",
          tasks: [
            {
              name: "30-day health check",
              description: "Review adoption metrics and usage patterns",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Adoption metrics review",
              description: "Analyze user engagement and feature adoption",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "CSM handoff meeting",
              description:
                "Transition from implementation to customer success",
              isRequired: true,
              estimatedHours: 1,
            },
          ],
        },
      ],
    },

    [ImplementationType.HEALTHCARE_HIPAA]: {
      type: ImplementationType.HEALTHCARE_HIPAA,
      name: "Healthcare (HIPAA)",
      description: "HIPAA-compliant implementation with healthcare defaults",
      estimatedWeeks: 6,
      phases: [
        {
          phase: ImplementationPhase.DISCOVERY,
          name: "Discovery",
          tasks: [
            {
              name: "Kickoff meeting",
              description: "Introduction and project planning",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "HIPAA compliance review",
              description: "Review HIPAA requirements and BAA",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "PHI handling requirements",
              description: "Document PHI data flows and safeguards",
              isRequired: true,
              estimatedHours: 3,
            },
            {
              name: "Requirements gathering",
              description: "Healthcare-specific workflow requirements",
              isRequired: true,
              estimatedHours: 4,
            },
          ],
        },
        {
          phase: ImplementationPhase.CONFIGURATION,
          name: "Configuration",
          tasks: [
            {
              name: "Tenant provisioning with HIPAA defaults",
              description: "Create tenant with HIPAA-compliant settings enabled",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Healthcare category taxonomy",
              description:
                "Configure healthcare-specific categories (patient safety, HIPAA breach, etc.)",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "HIPAA disclosure directives",
              description:
                "Set up disclosure requirements per HIPAA regulations",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Branding configuration",
              description: "Apply healthcare organization branding",
              isRequired: true,
              estimatedHours: 1,
            },
            {
              name: "SSO integration",
              description: "Configure enterprise SSO for healthcare staff",
              isRequired: true,
              estimatedHours: 4,
            },
            {
              name: "Access control configuration",
              description: "Set up role-based access aligned with HIPAA",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Audit logging verification",
              description: "Verify comprehensive audit trail for HIPAA",
              isRequired: true,
              estimatedHours: 1,
            },
          ],
        },
        {
          phase: ImplementationPhase.DATA_MIGRATION,
          name: "Data Migration",
          tasks: [
            {
              name: "Legacy data assessment",
              description: "Evaluate data from previous compliance system",
              isRequired: false,
              estimatedHours: 3,
            },
            {
              name: "PHI data classification",
              description: "Identify and classify any PHI in migration data",
              isRequired: false,
              estimatedHours: 2,
            },
            {
              name: "Secure migration execution",
              description: "Migrate data with encryption and audit logging",
              isRequired: false,
              estimatedHours: 4,
            },
          ],
        },
        {
          phase: ImplementationPhase.UAT,
          name: "User Acceptance Testing",
          tasks: [
            {
              name: "Compliance officer training",
              description: "Train compliance team on platform features",
              isRequired: true,
              estimatedHours: 3,
            },
            {
              name: "HIPAA workflow testing",
              description: "Test breach notification and disclosure workflows",
              isRequired: true,
              estimatedHours: 3,
            },
            {
              name: "Access control verification",
              description: "Verify role-based access restrictions",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Audit trail testing",
              description: "Verify comprehensive audit logging",
              isRequired: true,
              estimatedHours: 1,
            },
          ],
        },
        {
          phase: ImplementationPhase.GO_LIVE,
          name: "Go-Live",
          tasks: [
            {
              name: "Security review sign-off",
              description: "IT security team approval for production",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Go-live readiness review",
              description: "Final checklist with compliance leadership",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Production cutover",
              description: "Switch to new platform",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Hotline activation",
              description: "Activate healthcare hotline",
              isRequired: true,
              estimatedHours: 1,
            },
          ],
        },
        {
          phase: ImplementationPhase.OPTIMIZATION,
          name: "Optimization",
          tasks: [
            {
              name: "30-day compliance review",
              description: "Review platform compliance with HIPAA requirements",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "CSM handoff",
              description: "Transition to ongoing customer success management",
              isRequired: true,
              estimatedHours: 1,
            },
          ],
        },
      ],
    },

    [ImplementationType.FINANCIAL_SOX]: {
      type: ImplementationType.FINANCIAL_SOX,
      name: "Financial Services (SOX)",
      description: "SOX-compliant implementation for financial services",
      estimatedWeeks: 6,
      phases: [
        {
          phase: ImplementationPhase.DISCOVERY,
          name: "Discovery",
          tasks: [
            {
              name: "Kickoff meeting",
              description: "Introduction and project planning",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "SOX compliance requirements",
              description: "Review SOX Section 404 and whistleblower requirements",
              isRequired: true,
              estimatedHours: 3,
            },
            {
              name: "Control framework mapping",
              description: "Map platform controls to SOX requirements",
              isRequired: true,
              estimatedHours: 4,
            },
            {
              name: "Requirements gathering",
              description: "Financial services-specific workflow requirements",
              isRequired: true,
              estimatedHours: 4,
            },
          ],
        },
        {
          phase: ImplementationPhase.CONFIGURATION,
          name: "Configuration",
          tasks: [
            {
              name: "Tenant provisioning with SOX defaults",
              description: "Create tenant with financial services settings",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Financial services categories",
              description:
                "Configure categories (fraud, financial misstatement, retaliation, etc.)",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Audit committee escalation workflow",
              description: "Configure automatic escalation to audit committee",
              isRequired: true,
              estimatedHours: 3,
            },
            {
              name: "Retention policy configuration",
              description: "Set up document retention per SOX requirements",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "SSO integration",
              description: "Configure enterprise SSO",
              isRequired: true,
              estimatedHours: 4,
            },
            {
              name: "Segregation of duties",
              description: "Configure role-based access with SOD controls",
              isRequired: true,
              estimatedHours: 2,
            },
          ],
        },
        {
          phase: ImplementationPhase.DATA_MIGRATION,
          name: "Data Migration",
          tasks: [
            {
              name: "Legacy data assessment",
              description: "Evaluate historical case data",
              isRequired: false,
              estimatedHours: 3,
            },
            {
              name: "Migration with audit trail",
              description: "Migrate data preserving complete audit history",
              isRequired: false,
              estimatedHours: 4,
            },
          ],
        },
        {
          phase: ImplementationPhase.UAT,
          name: "User Acceptance Testing",
          tasks: [
            {
              name: "Compliance team training",
              description: "Train compliance and legal teams",
              isRequired: true,
              estimatedHours: 3,
            },
            {
              name: "Audit committee workflow testing",
              description: "Test escalation and reporting workflows",
              isRequired: true,
              estimatedHours: 3,
            },
            {
              name: "Control testing",
              description: "Verify SOX control implementation",
              isRequired: true,
              estimatedHours: 3,
            },
          ],
        },
        {
          phase: ImplementationPhase.GO_LIVE,
          name: "Go-Live",
          tasks: [
            {
              name: "Internal audit sign-off",
              description: "Internal audit team approval",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Go-live readiness review",
              description: "Final checklist with compliance leadership",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Production cutover",
              description: "Switch to new platform",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Hotline activation",
              description: "Activate financial services hotline",
              isRequired: true,
              estimatedHours: 1,
            },
          ],
        },
        {
          phase: ImplementationPhase.OPTIMIZATION,
          name: "Optimization",
          tasks: [
            {
              name: "Control effectiveness review",
              description: "Review platform control effectiveness",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "CSM handoff",
              description: "Transition to ongoing customer success management",
              isRequired: true,
              estimatedHours: 1,
            },
          ],
        },
      ],
    },

    [ImplementationType.GENERAL_BUSINESS]: {
      type: ImplementationType.GENERAL_BUSINESS,
      name: "General Business",
      description: "Standard implementation for general businesses (4-6 weeks)",
      estimatedWeeks: 5,
      phases: [
        {
          phase: ImplementationPhase.DISCOVERY,
          name: "Discovery",
          tasks: [
            {
              name: "Kickoff meeting",
              description: "Introduction and project planning",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Requirements gathering",
              description: "Document business requirements",
              isRequired: true,
              estimatedHours: 3,
            },
            {
              name: "Process review",
              description: "Review current compliance processes",
              isRequired: true,
              estimatedHours: 2,
            },
          ],
        },
        {
          phase: ImplementationPhase.CONFIGURATION,
          name: "Configuration",
          tasks: [
            {
              name: "Tenant provisioning",
              description: "Create tenant with standard settings",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Organization structure setup",
              description: "Configure departments and locations",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Category configuration",
              description: "Set up case and disclosure categories",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Workflow configuration",
              description: "Configure case routing and escalation",
              isRequired: true,
              estimatedHours: 3,
            },
            {
              name: "Branding",
              description: "Apply company branding",
              isRequired: true,
              estimatedHours: 1,
            },
            {
              name: "SSO integration",
              description: "Configure SSO if applicable",
              isRequired: false,
              estimatedHours: 3,
            },
            {
              name: "HRIS integration",
              description: "Connect HR system if applicable",
              isRequired: false,
              estimatedHours: 3,
            },
          ],
        },
        {
          phase: ImplementationPhase.DATA_MIGRATION,
          name: "Data Migration",
          tasks: [
            {
              name: "Data migration",
              description: "Migrate historical data if needed",
              isRequired: false,
              estimatedHours: 4,
            },
          ],
        },
        {
          phase: ImplementationPhase.UAT,
          name: "User Acceptance Testing",
          tasks: [
            {
              name: "Admin training",
              description: "Train platform administrators",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "User training",
              description: "Train compliance team users",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Workflow testing",
              description: "Test case and disclosure workflows",
              isRequired: true,
              estimatedHours: 2,
            },
          ],
        },
        {
          phase: ImplementationPhase.GO_LIVE,
          name: "Go-Live",
          tasks: [
            {
              name: "Go-live readiness review",
              description: "Final checklist review",
              isRequired: true,
              estimatedHours: 1,
            },
            {
              name: "Production cutover",
              description: "Switch to new platform",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "Hotline activation",
              description: "Activate hotline number",
              isRequired: true,
              estimatedHours: 1,
            },
          ],
        },
        {
          phase: ImplementationPhase.OPTIMIZATION,
          name: "Optimization",
          tasks: [
            {
              name: "30-day review",
              description: "Review adoption and address issues",
              isRequired: true,
              estimatedHours: 2,
            },
            {
              name: "CSM handoff",
              description: "Transition to customer success",
              isRequired: true,
              estimatedHours: 1,
            },
          ],
        },
      ],
    },
  };

/**
 * Get template for an implementation type
 */
export function getTemplate(type: ImplementationType): ChecklistTemplate {
  return CHECKLIST_TEMPLATES[type];
}

/**
 * Get total task count for a template
 */
export function getTaskCount(type: ImplementationType): {
  required: number;
  optional: number;
  total: number;
} {
  const template = CHECKLIST_TEMPLATES[type];
  let required = 0;
  let optional = 0;

  for (const phase of template.phases) {
    for (const task of phase.tasks) {
      if (task.isRequired) required++;
      else optional++;
    }
  }

  return { required, optional, total: required + optional };
}

/**
 * Get estimated total hours for a template
 */
export function getEstimatedHours(type: ImplementationType): number {
  const template = CHECKLIST_TEMPLATES[type];
  let totalHours = 0;

  for (const phase of template.phases) {
    for (const task of phase.tasks) {
      totalHours += task.estimatedHours ?? 0;
    }
  }

  return totalHours;
}
