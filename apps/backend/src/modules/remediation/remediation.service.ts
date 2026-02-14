import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../modules/prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { RemediationStatus, Prisma } from "@prisma/client";
import {
  CreateRemediationPlanDto,
  UpdateRemediationPlanDto,
  RemediationQueryDto,
  CreateRemediationTemplateDto,
  StepTemplate,
} from "./dto/remediation.dto";

@Injectable()
export class RemediationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    dto: CreateRemediationPlanDto,
  ) {
    // If template provided, we'll create steps from it
    let templateSteps: StepTemplate[] | null = null;
    if (dto.templateId) {
      const template = await this.prisma.remediationTemplate.findFirst({
        where: { id: dto.templateId, organizationId },
      });
      if (template) {
        templateSteps = template.steps as unknown as StepTemplate[];
      }
    }

    const plan = await this.prisma.remediationPlan.create({
      data: {
        organizationId,
        caseId: dto.caseId,
        title: dto.title,
        description: dto.description,
        findingId: dto.findingId,
        findingDescription: dto.findingDescription,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        ownerId: dto.ownerId || userId,
        templateId: dto.templateId,
        createdById: userId,
        totalSteps: templateSteps?.length || 0,
      },
    });

    // Create steps from template if provided
    if (templateSteps && templateSteps.length > 0) {
      const planStartDate = new Date();
      await this.prisma.remediationStep.createMany({
        data: templateSteps.map((step) => ({
          planId: plan.id,
          organizationId,
          order: step.order,
          title: step.title,
          description: step.description,
          requiresCoApproval: step.requiresCoApproval,
          dueDate: step.dueDaysOffset
            ? new Date(
                planStartDate.getTime() +
                  step.dueDaysOffset * 24 * 60 * 60 * 1000,
              )
            : null,
        })),
      });
    }

    this.eventEmitter.emit("remediation.plan.created", {
      organizationId,
      planId: plan.id,
      caseId: dto.caseId,
      userId,
    });

    return this.findById(organizationId, plan.id);
  }

  async findById(organizationId: string, id: string) {
    const plan = await this.prisma.remediationPlan.findFirst({
      where: { id, organizationId },
      include: {
        steps: {
          orderBy: { order: "asc" },
        },
        case: {
          select: { id: true, referenceNumber: true, status: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException("Remediation plan not found");
    }

    return plan;
  }

  async findByCase(organizationId: string, caseId: string) {
    return this.prisma.remediationPlan.findMany({
      where: { organizationId, caseId },
      include: {
        steps: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAll(organizationId: string, query: RemediationQueryDto) {
    const where: Prisma.RemediationPlanWhereInput = {
      organizationId,
      ...(query.caseId && { caseId: query.caseId }),
      ...(query.status && { status: query.status }),
      ...(query.ownerId && { ownerId: query.ownerId }),
      ...(query.overdue && {
        dueDate: { lt: new Date() },
        status: { in: [RemediationStatus.DRAFT, RemediationStatus.ACTIVE] },
      }),
    };

    const [plans, total] = await Promise.all([
      this.prisma.remediationPlan.findMany({
        where,
        include: {
          case: {
            select: { id: true, referenceNumber: true },
          },
          _count: {
            select: { steps: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: ((query.page || 1) - 1) * (query.limit || 20),
        take: query.limit || 20,
      }),
      this.prisma.remediationPlan.count({ where }),
    ]);

    return {
      data: plans,
      meta: {
        total,
        page: query.page || 1,
        limit: query.limit || 20,
        totalPages: Math.ceil(total / (query.limit || 20)),
      },
    };
  }

  async update(
    organizationId: string,
    id: string,
    userId: string,
    dto: UpdateRemediationPlanDto,
  ) {
    await this.findById(organizationId, id);

    const plan = await this.prisma.remediationPlan.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.findingDescription !== undefined && {
          findingDescription: dto.findingDescription,
        }),
        ...(dto.status && { status: dto.status }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.ownerId && { ownerId: dto.ownerId }),
      },
    });

    this.eventEmitter.emit("remediation.plan.updated", {
      organizationId,
      planId: id,
      userId,
    });

    return plan;
  }

  async activate(organizationId: string, id: string, userId: string) {
    const plan = await this.findById(organizationId, id);

    if (plan.status !== RemediationStatus.DRAFT) {
      throw new BadRequestException("Only draft plans can be activated");
    }

    return this.update(organizationId, id, userId, {
      status: RemediationStatus.ACTIVE,
    });
  }

  async complete(organizationId: string, id: string, userId: string) {
    const plan = await this.findById(organizationId, id);

    // Check all required steps are completed
    const incompleteSteps = plan.steps.filter(
      (s) => s.status !== "COMPLETED" && s.status !== "SKIPPED",
    );

    if (incompleteSteps.length > 0) {
      throw new BadRequestException(
        `Cannot complete plan: ${incompleteSteps.length} steps still pending`,
      );
    }

    return this.prisma.remediationPlan.update({
      where: { id },
      data: {
        status: RemediationStatus.COMPLETED,
        completedAt: new Date(),
        completedById: userId,
      },
    });
  }

  async cancel(organizationId: string, id: string, userId: string) {
    await this.findById(organizationId, id);

    return this.prisma.remediationPlan.update({
      where: { id },
      data: {
        status: RemediationStatus.CANCELLED,
      },
    });
  }

  async updateStepCounts(planId: string) {
    const steps = await this.prisma.remediationStep.findMany({
      where: { planId },
    });

    const totalSteps = steps.length;
    const completedSteps = steps.filter((s) => s.status === "COMPLETED").length;
    const overdueSteps = steps.filter(
      (s) =>
        s.dueDate && new Date(s.dueDate) < new Date() && s.status === "PENDING",
    ).length;

    await this.prisma.remediationPlan.update({
      where: { id: planId },
      data: { totalSteps, completedSteps, overdueSteps },
    });
  }

  // ===== Templates =====

  async createTemplate(
    organizationId: string,
    userId: string,
    dto: CreateRemediationTemplateDto,
  ) {
    return this.prisma.remediationTemplate.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        steps: dto.steps as unknown as Prisma.InputJsonValue,
        createdById: userId,
      },
    });
  }

  async findAllTemplates(organizationId: string, categoryId?: string) {
    return this.prisma.remediationTemplate.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(categoryId && { categoryId }),
      },
      orderBy: { name: "asc" },
    });
  }
}
