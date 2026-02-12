import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  ProjectTemplate,
  MilestoneCategory,
  ProjectTaskPriority,
  ProjectTaskStatus,
  ProjectColumnType,
  Prisma,
} from "@prisma/client";
import {
  CreateProjectTemplateDto,
  ApplyTemplateDto,
  ProjectTemplateResponseDto,
} from "./dto/project-template.dto";
import { addDays } from "date-fns";

/**
 * Template data structure for project templates.
 */
interface TemplateData {
  groups: Array<{
    name: string;
    color?: string;
    sortOrder: number;
  }>;
  columns: Array<{
    name: string;
    type: ProjectColumnType;
    settings?: Record<string, unknown>;
    sortOrder: number;
    width?: number;
    isRequired?: boolean;
  }>;
  tasks: Array<{
    title: string;
    description?: string;
    groupIndex: number; // maps to groups array index
    priority?: ProjectTaskPriority;
    relativeDueDays?: number; // days from project start
    sortOrder?: number;
  }>;
}

/**
 * System template definitions for built-in compliance project templates.
 */
const SYSTEM_TEMPLATES: Array<{
  name: string;
  description: string;
  category: MilestoneCategory;
  templateData: TemplateData;
}> = [
  {
    name: "New Client Implementation",
    description:
      "Comprehensive implementation checklist for onboarding new clients",
    category: MilestoneCategory.PROJECT,
    templateData: {
      groups: [
        { name: "Discovery & Planning", color: "#6366F1", sortOrder: 0 },
        { name: "Configuration", color: "#22C55E", sortOrder: 1 },
        { name: "Data Migration", color: "#F59E0B", sortOrder: 2 },
        { name: "Testing & Training", color: "#3B82F6", sortOrder: 3 },
        { name: "Go-Live", color: "#EC4899", sortOrder: 4 },
      ],
      columns: [
        { name: "Status", type: ProjectColumnType.STATUS, sortOrder: 0 },
        { name: "Owner", type: ProjectColumnType.PERSON, sortOrder: 1 },
        { name: "Due Date", type: ProjectColumnType.DATE, sortOrder: 2 },
        { name: "Priority", type: ProjectColumnType.PRIORITY, sortOrder: 3 },
      ],
      tasks: [
        {
          title: "Kickoff meeting",
          groupIndex: 0,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 0,
        },
        {
          title: "Gather requirements",
          groupIndex: 0,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 7,
        },
        {
          title: "Document current processes",
          groupIndex: 0,
          priority: ProjectTaskPriority.MEDIUM,
          relativeDueDays: 10,
        },
        {
          title: "Configure organization settings",
          groupIndex: 1,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 14,
        },
        {
          title: "Set up user accounts",
          groupIndex: 1,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 14,
        },
        {
          title: "Configure categories",
          groupIndex: 1,
          priority: ProjectTaskPriority.MEDIUM,
          relativeDueDays: 17,
        },
        {
          title: "Set up workflows",
          groupIndex: 1,
          priority: ProjectTaskPriority.MEDIUM,
          relativeDueDays: 21,
        },
        {
          title: "Extract legacy data",
          groupIndex: 2,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 21,
        },
        {
          title: "Map data fields",
          groupIndex: 2,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 24,
        },
        {
          title: "Import historical cases",
          groupIndex: 2,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 28,
        },
        {
          title: "Validate migrated data",
          groupIndex: 2,
          priority: ProjectTaskPriority.CRITICAL,
          relativeDueDays: 31,
        },
        {
          title: "User acceptance testing",
          groupIndex: 3,
          priority: ProjectTaskPriority.CRITICAL,
          relativeDueDays: 35,
        },
        {
          title: "Admin training",
          groupIndex: 3,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 38,
        },
        {
          title: "End-user training",
          groupIndex: 3,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 42,
        },
        {
          title: "Cutover planning",
          groupIndex: 4,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 45,
        },
        {
          title: "Go-live readiness check",
          groupIndex: 4,
          priority: ProjectTaskPriority.CRITICAL,
          relativeDueDays: 48,
        },
        {
          title: "Go live!",
          groupIndex: 4,
          priority: ProjectTaskPriority.CRITICAL,
          relativeDueDays: 50,
        },
      ],
    },
  },
  {
    name: "Annual Policy Review",
    description: "Track annual review and update of compliance policies",
    category: MilestoneCategory.AUDIT,
    templateData: {
      groups: [
        { name: "Planning", color: "#8B5CF6", sortOrder: 0 },
        { name: "Policy Review", color: "#06B6D4", sortOrder: 1 },
        { name: "Approval", color: "#F97316", sortOrder: 2 },
        { name: "Distribution", color: "#10B981", sortOrder: 3 },
      ],
      columns: [
        { name: "Status", type: ProjectColumnType.STATUS, sortOrder: 0 },
        { name: "Reviewer", type: ProjectColumnType.PERSON, sortOrder: 1 },
        { name: "Due Date", type: ProjectColumnType.DATE, sortOrder: 2 },
      ],
      tasks: [
        {
          title: "Identify policies due for review",
          groupIndex: 0,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 7,
        },
        {
          title: "Assign reviewers",
          groupIndex: 0,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 10,
        },
        {
          title: "Review Code of Conduct",
          groupIndex: 1,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 30,
        },
        {
          title: "Review Anti-Harassment Policy",
          groupIndex: 1,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 30,
        },
        {
          title: "Review Conflicts of Interest Policy",
          groupIndex: 1,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 30,
        },
        {
          title: "Review Whistleblower Policy",
          groupIndex: 1,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 30,
        },
        {
          title: "Legal review of changes",
          groupIndex: 2,
          priority: ProjectTaskPriority.CRITICAL,
          relativeDueDays: 45,
        },
        {
          title: "Board approval",
          groupIndex: 2,
          priority: ProjectTaskPriority.CRITICAL,
          relativeDueDays: 52,
        },
        {
          title: "Publish updated policies",
          groupIndex: 3,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 56,
        },
        {
          title: "Notify employees",
          groupIndex: 3,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 58,
        },
        {
          title: "Launch attestation campaign",
          groupIndex: 3,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 60,
        },
      ],
    },
  },
  {
    name: "Compliance Audit Prep",
    description: "Prepare for upcoming compliance audit or examination",
    category: MilestoneCategory.AUDIT,
    templateData: {
      groups: [
        { name: "Pre-Audit Planning", color: "#EF4444", sortOrder: 0 },
        { name: "Document Gathering", color: "#F59E0B", sortOrder: 1 },
        { name: "Internal Review", color: "#3B82F6", sortOrder: 2 },
        { name: "Audit Execution", color: "#10B981", sortOrder: 3 },
      ],
      columns: [
        { name: "Status", type: ProjectColumnType.STATUS, sortOrder: 0 },
        { name: "Owner", type: ProjectColumnType.PERSON, sortOrder: 1 },
        { name: "Due Date", type: ProjectColumnType.DATE, sortOrder: 2 },
      ],
      tasks: [
        {
          title: "Confirm audit scope and timeline",
          groupIndex: 0,
          priority: ProjectTaskPriority.CRITICAL,
          relativeDueDays: 0,
        },
        {
          title: "Assign audit liaison",
          groupIndex: 0,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 3,
        },
        {
          title: "Create document request list",
          groupIndex: 0,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 5,
        },
        {
          title: "Gather policies and procedures",
          groupIndex: 1,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 14,
        },
        {
          title: "Compile training records",
          groupIndex: 1,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 14,
        },
        {
          title: "Extract case reports",
          groupIndex: 1,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 14,
        },
        {
          title: "Compile disclosure records",
          groupIndex: 1,
          priority: ProjectTaskPriority.MEDIUM,
          relativeDueDays: 14,
        },
        {
          title: "Self-assessment review",
          groupIndex: 2,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 21,
        },
        {
          title: "Gap remediation",
          groupIndex: 2,
          priority: ProjectTaskPriority.CRITICAL,
          relativeDueDays: 28,
        },
        {
          title: "Audit kickoff meeting",
          groupIndex: 3,
          priority: ProjectTaskPriority.CRITICAL,
          relativeDueDays: 30,
        },
        {
          title: "Field work support",
          groupIndex: 3,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 45,
        },
        {
          title: "Exit meeting",
          groupIndex: 3,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 50,
        },
      ],
    },
  },
  {
    name: "Investigation Project",
    description: "Complex investigation requiring project management",
    category: MilestoneCategory.INVESTIGATION,
    templateData: {
      groups: [
        { name: "Intake & Planning", color: "#6366F1", sortOrder: 0 },
        { name: "Evidence Gathering", color: "#EC4899", sortOrder: 1 },
        { name: "Analysis", color: "#F59E0B", sortOrder: 2 },
        { name: "Closure", color: "#22C55E", sortOrder: 3 },
      ],
      columns: [
        { name: "Status", type: ProjectColumnType.STATUS, sortOrder: 0 },
        { name: "Investigator", type: ProjectColumnType.PERSON, sortOrder: 1 },
        { name: "Due Date", type: ProjectColumnType.DATE, sortOrder: 2 },
      ],
      tasks: [
        {
          title: "Review initial report",
          groupIndex: 0,
          priority: ProjectTaskPriority.CRITICAL,
          relativeDueDays: 1,
        },
        {
          title: "Develop investigation plan",
          groupIndex: 0,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 3,
        },
        {
          title: "Identify witnesses",
          groupIndex: 0,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 3,
        },
        {
          title: "Document preservation notice",
          groupIndex: 1,
          priority: ProjectTaskPriority.CRITICAL,
          relativeDueDays: 2,
        },
        {
          title: "Collect relevant documents",
          groupIndex: 1,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 10,
        },
        {
          title: "Conduct witness interviews",
          groupIndex: 1,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 21,
        },
        {
          title: "Interview subject",
          groupIndex: 1,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 28,
        },
        {
          title: "Analyze evidence",
          groupIndex: 2,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 35,
        },
        {
          title: "Draft findings",
          groupIndex: 2,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 42,
        },
        {
          title: "Legal review",
          groupIndex: 2,
          priority: ProjectTaskPriority.CRITICAL,
          relativeDueDays: 49,
        },
        {
          title: "Final report",
          groupIndex: 3,
          priority: ProjectTaskPriority.CRITICAL,
          relativeDueDays: 56,
        },
        {
          title: "Remediation recommendations",
          groupIndex: 3,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 56,
        },
        {
          title: "Close investigation",
          groupIndex: 3,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 60,
        },
      ],
    },
  },
  {
    name: "Training Rollout",
    description: "Plan and execute organization-wide training program",
    category: MilestoneCategory.TRAINING,
    templateData: {
      groups: [
        { name: "Planning", color: "#8B5CF6", sortOrder: 0 },
        { name: "Content Development", color: "#06B6D4", sortOrder: 1 },
        { name: "Delivery", color: "#F97316", sortOrder: 2 },
        { name: "Tracking", color: "#10B981", sortOrder: 3 },
      ],
      columns: [
        { name: "Status", type: ProjectColumnType.STATUS, sortOrder: 0 },
        { name: "Owner", type: ProjectColumnType.PERSON, sortOrder: 1 },
        { name: "Due Date", type: ProjectColumnType.DATE, sortOrder: 2 },
      ],
      tasks: [
        {
          title: "Define training objectives",
          groupIndex: 0,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 7,
        },
        {
          title: "Identify target audience",
          groupIndex: 0,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 7,
        },
        {
          title: "Set timeline",
          groupIndex: 0,
          priority: ProjectTaskPriority.MEDIUM,
          relativeDueDays: 10,
        },
        {
          title: "Develop training content",
          groupIndex: 1,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 28,
        },
        {
          title: "Create assessment",
          groupIndex: 1,
          priority: ProjectTaskPriority.MEDIUM,
          relativeDueDays: 35,
        },
        {
          title: "Review and approve content",
          groupIndex: 1,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 42,
        },
        {
          title: "Configure LMS",
          groupIndex: 2,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 45,
        },
        {
          title: "Launch training",
          groupIndex: 2,
          priority: ProjectTaskPriority.CRITICAL,
          relativeDueDays: 50,
        },
        {
          title: "Send reminders",
          groupIndex: 2,
          priority: ProjectTaskPriority.MEDIUM,
          relativeDueDays: 60,
        },
        {
          title: "Track completion",
          groupIndex: 3,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 70,
        },
        {
          title: "Generate completion report",
          groupIndex: 3,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 75,
        },
        {
          title: "Follow up on non-completers",
          groupIndex: 3,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 80,
        },
      ],
    },
  },
  {
    name: "Disclosure Campaign",
    description: "Execute annual disclosure collection campaign",
    category: MilestoneCategory.CAMPAIGN,
    templateData: {
      groups: [
        { name: "Setup", color: "#3B82F6", sortOrder: 0 },
        { name: "Launch", color: "#22C55E", sortOrder: 1 },
        { name: "Collection", color: "#F59E0B", sortOrder: 2 },
        { name: "Review", color: "#EF4444", sortOrder: 3 },
      ],
      columns: [
        { name: "Status", type: ProjectColumnType.STATUS, sortOrder: 0 },
        { name: "Owner", type: ProjectColumnType.PERSON, sortOrder: 1 },
        { name: "Due Date", type: ProjectColumnType.DATE, sortOrder: 2 },
      ],
      tasks: [
        {
          title: "Update disclosure form",
          groupIndex: 0,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 7,
        },
        {
          title: "Review population list",
          groupIndex: 0,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 10,
        },
        {
          title: "Configure reminder schedule",
          groupIndex: 0,
          priority: ProjectTaskPriority.MEDIUM,
          relativeDueDays: 12,
        },
        {
          title: "Send launch announcement",
          groupIndex: 1,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 14,
        },
        {
          title: "Launch campaign",
          groupIndex: 1,
          priority: ProjectTaskPriority.CRITICAL,
          relativeDueDays: 15,
        },
        {
          title: "Monitor completion rates",
          groupIndex: 2,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 25,
        },
        {
          title: "First reminder wave",
          groupIndex: 2,
          priority: ProjectTaskPriority.MEDIUM,
          relativeDueDays: 28,
        },
        {
          title: "Second reminder wave",
          groupIndex: 2,
          priority: ProjectTaskPriority.MEDIUM,
          relativeDueDays: 35,
        },
        {
          title: "Final reminder",
          groupIndex: 2,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 40,
        },
        {
          title: "Review flagged disclosures",
          groupIndex: 3,
          priority: ProjectTaskPriority.CRITICAL,
          relativeDueDays: 50,
        },
        {
          title: "Conflict resolution",
          groupIndex: 3,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 60,
        },
        {
          title: "Generate summary report",
          groupIndex: 3,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 65,
        },
        {
          title: "Board report",
          groupIndex: 3,
          priority: ProjectTaskPriority.HIGH,
          relativeDueDays: 70,
        },
      ],
    },
  },
];

/**
 * ProjectTemplateService manages project templates for reusable project structures.
 *
 * Features:
 * - CRUD operations for custom templates
 * - System templates for common compliance projects
 * - Apply template to create new project with groups, columns, and tasks
 */
@Injectable()
export class ProjectTemplateService {
  private readonly logger = new Logger(ProjectTemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new project template.
   */
  async create(
    orgId: string,
    userId: string,
    dto: CreateProjectTemplateDto,
  ): Promise<ProjectTemplate> {
    const template = await this.prisma.projectTemplate.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        templateData: dto.templateData as Prisma.InputJsonValue,
        isSystem: false,
        createdById: userId,
      },
    });

    this.logger.log(`Template created: ${template.id} - ${template.name}`);

    return template;
  }

  /**
   * Lists all templates available to the organization.
   * Includes both organization-specific and system templates.
   */
  async list(orgId: string): Promise<ProjectTemplateResponseDto[]> {
    // Ensure system templates exist
    await this.ensureSystemTemplates();

    const templates = await this.prisma.projectTemplate.findMany({
      where: {
        OR: [{ organizationId: orgId }, { isSystem: true }],
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return templates.map(
      (t): ProjectTemplateResponseDto => ({
        id: t.id,
        name: t.name,
        description: t.description ?? undefined,
        category: t.category,
        templateData: t.templateData as Record<string, unknown>,
        isSystem: t.isSystem,
        createdBy: t.createdBy
          ? {
              id: t.createdBy.id,
              name: `${t.createdBy.firstName} ${t.createdBy.lastName}`,
            }
          : undefined,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }),
    );
  }

  /**
   * Gets a single template by ID.
   */
  async get(
    orgId: string,
    templateId: string,
  ): Promise<ProjectTemplateResponseDto | null> {
    const template = await this.prisma.projectTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ organizationId: orgId }, { isSystem: true }],
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!template) return null;

    return {
      id: template.id,
      name: template.name,
      description: template.description ?? undefined,
      category: template.category,
      templateData: template.templateData as Record<string, unknown>,
      isSystem: template.isSystem,
      createdBy: template.createdBy
        ? {
            id: template.createdBy.id,
            name: `${template.createdBy.firstName} ${template.createdBy.lastName}`,
          }
        : undefined,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  /**
   * Deletes a template (only non-system templates).
   */
  async delete(orgId: string, templateId: string): Promise<void> {
    const template = await this.prisma.projectTemplate.findFirst({
      where: { id: templateId, organizationId: orgId },
    });

    if (!template) {
      throw new NotFoundException("Template not found");
    }

    if (template.isSystem) {
      throw new ForbiddenException("Cannot delete system templates");
    }

    await this.prisma.projectTemplate.delete({
      where: { id: templateId },
    });

    this.logger.log(`Template deleted: ${templateId}`);
  }

  /**
   * Applies a template to create a new project (Milestone).
   * Creates groups, columns, and tasks from the template data.
   * Returns the new project ID.
   */
  async applyTemplate(
    orgId: string,
    userId: string,
    dto: ApplyTemplateDto,
  ): Promise<string> {
    const template = await this.prisma.projectTemplate.findFirst({
      where: {
        id: dto.templateId,
        OR: [{ organizationId: orgId }, { isSystem: true }],
      },
    });

    if (!template) {
      throw new NotFoundException("Template not found");
    }

    const templateData = template.templateData as unknown as TemplateData;

    // Create the project (Milestone) in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the Milestone (project)
      const milestone = await tx.milestone.create({
        data: {
          organizationId: orgId,
          name: dto.name,
          category: template.category,
          targetDate: dto.targetDate,
          ownerId: dto.ownerId,
          status: "NOT_STARTED",
          createdById: userId,
        },
      });

      // Create groups
      const groupIdMap = new Map<number, string>();
      for (let i = 0; i < templateData.groups.length; i++) {
        const groupDef = templateData.groups[i];
        const group = await tx.projectGroup.create({
          data: {
            organizationId: orgId,
            milestoneId: milestone.id,
            name: groupDef.name,
            color: groupDef.color,
            sortOrder: groupDef.sortOrder,
          },
        });
        groupIdMap.set(i, group.id);
      }

      // Create columns
      for (const colDef of templateData.columns) {
        await tx.projectColumn.create({
          data: {
            organizationId: orgId,
            milestoneId: milestone.id,
            name: colDef.name,
            type: colDef.type,
            settings: colDef.settings as Prisma.InputJsonValue,
            sortOrder: colDef.sortOrder,
            width: colDef.width,
            isRequired: colDef.isRequired ?? false,
          },
        });
      }

      // Create tasks
      for (let i = 0; i < templateData.tasks.length; i++) {
        const taskDef = templateData.tasks[i];
        const groupId = groupIdMap.get(taskDef.groupIndex);
        const dueDate = taskDef.relativeDueDays
          ? addDays(dto.targetDate, taskDef.relativeDueDays - 50) // Offset from target date
          : undefined;

        await tx.projectTask.create({
          data: {
            organizationId: orgId,
            milestoneId: milestone.id,
            groupId,
            title: taskDef.title,
            description: taskDef.description,
            status: ProjectTaskStatus.NOT_STARTED,
            priority: taskDef.priority ?? ProjectTaskPriority.MEDIUM,
            dueDate,
            sortOrder: taskDef.sortOrder ?? i,
            createdById: userId,
          },
        });
      }

      // Update milestone with task counts
      await tx.milestone.update({
        where: { id: milestone.id },
        data: {
          totalItems: templateData.tasks.length,
        },
      });

      return milestone;
    });

    this.logger.log(
      `Applied template "${template.name}" to create project "${dto.name}" (${result.id})`,
    );

    return result.id;
  }

  /**
   * Ensures system templates exist in the database.
   * Idempotent - only creates templates that don't exist.
   */
  private async ensureSystemTemplates(): Promise<void> {
    for (const templateDef of SYSTEM_TEMPLATES) {
      const existing = await this.prisma.projectTemplate.findFirst({
        where: { name: templateDef.name, isSystem: true },
      });

      if (!existing) {
        await this.prisma.projectTemplate.create({
          data: {
            name: templateDef.name,
            description: templateDef.description,
            category: templateDef.category,
            templateData:
              templateDef.templateData as unknown as Prisma.InputJsonValue,
            isSystem: true,
            organizationId: null,
            createdById: null,
          },
        });

        this.logger.log(`Created system template: ${templateDef.name}`);
      }
    }
  }
}
