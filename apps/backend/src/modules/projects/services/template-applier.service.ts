import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ProjectTaskStatus, ProjectTaskPriority, Prisma } from "@prisma/client";
import { addDays } from "date-fns";
import { ApplyTemplateDto } from "../dto/project-template.dto";
import {
  TemplateData,
  TemplateRegistryService,
} from "./template-registry.service";

/**
 * TemplateApplierService handles applying templates to create new projects.
 *
 * Responsibilities:
 * - Apply template to create Milestone with groups, columns, tasks
 * - Calculate due dates from relative days
 * - Map group indices to created group IDs
 */
@Injectable()
export class TemplateApplierService {
  private readonly logger = new Logger(TemplateApplierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateRegistry: TemplateRegistryService,
  ) {}

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
   * Clone an existing project by applying it as a template.
   * Extracts template data from existing project and applies it.
   */
  async cloneProject(
    sourceProjectId: string,
    orgId: string,
    userId: string,
    newName: string,
    targetDate: Date,
    ownerId?: string,
  ): Promise<string> {
    // Load source project with all details
    const source = await this.prisma.milestone.findFirst({
      where: { id: sourceProjectId, organizationId: orgId },
      include: {
        groups: { orderBy: { sortOrder: "asc" } },
        columns: { orderBy: { sortOrder: "asc" } },
        tasks: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!source) {
      throw new NotFoundException("Source project not found");
    }

    // Build template data from source
    const templateData: TemplateData = {
      groups: source.groups.map((g) => ({
        name: g.name,
        color: g.color || undefined,
        sortOrder: g.sortOrder,
      })),
      columns: source.columns.map((c) => ({
        name: c.name,
        type: c.type,
        settings: c.settings as Record<string, unknown> | undefined,
        sortOrder: c.sortOrder,
        width: c.width || undefined,
        isRequired: c.isRequired,
      })),
      tasks: source.tasks.map((t, i) => {
        // Calculate relative days from original target date
        let relativeDueDays: number | undefined;
        if (t.dueDate && source.targetDate) {
          const diff = Math.round(
            (t.dueDate.getTime() - source.targetDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          relativeDueDays = diff + 50; // Add back the 50-day offset
        }

        // Find group index
        const groupIndex = source.groups.findIndex((g) => g.id === t.groupId);

        return {
          title: t.title,
          description: t.description || undefined,
          groupIndex: groupIndex >= 0 ? groupIndex : 0,
          priority: t.priority,
          relativeDueDays,
          sortOrder: t.sortOrder,
        };
      }),
    };

    // Create in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const milestone = await tx.milestone.create({
        data: {
          organizationId: orgId,
          name: newName,
          category: source.category,
          targetDate,
          ownerId: ownerId || source.ownerId,
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
          ? addDays(targetDate, taskDef.relativeDueDays - 50)
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

      await tx.milestone.update({
        where: { id: milestone.id },
        data: { totalItems: templateData.tasks.length },
      });

      return milestone;
    });

    this.logger.log(
      `Cloned project "${source.name}" as "${newName}" (${result.id})`,
    );

    return result.id;
  }
}
