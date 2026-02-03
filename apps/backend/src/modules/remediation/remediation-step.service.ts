import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StepStatus } from '@prisma/client';
import {
  CreateRemediationStepDto,
  UpdateRemediationStepDto,
  CompleteStepDto,
  ApproveStepDto,
} from './dto/remediation.dto';
import { RemediationService } from './remediation.service';

@Injectable()
export class RemediationStepService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly remediationService: RemediationService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    dto: CreateRemediationStepDto,
  ) {
    // Validate dependencies form a DAG (no circular dependencies)
    if (dto.dependsOnStepIds?.length) {
      await this.validateDependencies(dto.planId, dto.dependsOnStepIds);
    }

    const step = await this.prisma.remediationStep.create({
      data: {
        planId: dto.planId,
        organizationId,
        order: dto.order,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assigneeUserId: dto.assigneeUserId,
        assigneeEmail: dto.assigneeEmail,
        assigneeName: dto.assigneeName,
        requiresCoApproval: dto.requiresCoApproval || false,
        dependsOnStepIds: dto.dependsOnStepIds || [],
      },
    });

    // Update plan step counts
    await this.remediationService.updateStepCounts(dto.planId);

    this.eventEmitter.emit('remediation.step.created', {
      organizationId,
      stepId: step.id,
      planId: dto.planId,
      userId,
    });

    return step;
  }

  async findById(organizationId: string, id: string) {
    const step = await this.prisma.remediationStep.findFirst({
      where: { id, organizationId },
      include: {
        plan: {
          select: { id: true, title: true, caseId: true, status: true },
        },
      },
    });

    if (!step) {
      throw new NotFoundException('Remediation step not found');
    }

    return step;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateRemediationStepDto,
  ) {
    const existing = await this.findById(organizationId, id);

    if (dto.dependsOnStepIds?.length) {
      await this.validateDependencies(existing.planId, dto.dependsOnStepIds, id);
    }

    const step = await this.prisma.remediationStep.update({
      where: { id },
      data: {
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.assigneeUserId !== undefined && {
          assigneeUserId: dto.assigneeUserId,
        }),
        ...(dto.assigneeEmail !== undefined && {
          assigneeEmail: dto.assigneeEmail,
        }),
        ...(dto.assigneeName !== undefined && {
          assigneeName: dto.assigneeName,
        }),
        ...(dto.requiresCoApproval !== undefined && {
          requiresCoApproval: dto.requiresCoApproval,
        }),
        ...(dto.dependsOnStepIds && { dependsOnStepIds: dto.dependsOnStepIds }),
      },
    });

    return step;
  }

  async complete(
    organizationId: string,
    id: string,
    userId: string,
    dto: CompleteStepDto,
  ) {
    const step = await this.findById(organizationId, id);

    // Check dependencies are satisfied
    if (step.dependsOnStepIds.length > 0) {
      const dependencySteps = await this.prisma.remediationStep.findMany({
        where: { id: { in: step.dependsOnStepIds } },
      });

      const unmetDependencies = dependencySteps.filter(
        (s) =>
          s.status !== StepStatus.COMPLETED && s.status !== StepStatus.SKIPPED,
      );

      if (unmetDependencies.length > 0) {
        throw new BadRequestException(
          `Cannot complete: ${unmetDependencies.length} prerequisite steps incomplete`,
        );
      }
    }

    const updatedStep = await this.prisma.remediationStep.update({
      where: { id },
      data: {
        status: StepStatus.COMPLETED,
        completedAt: new Date(),
        completedById: userId,
        completionNotes: dto.completionNotes,
        completionEvidence: dto.completionEvidence as object,
      },
    });

    // Update plan step counts
    await this.remediationService.updateStepCounts(step.planId);

    this.eventEmitter.emit('remediation.step.completed', {
      organizationId,
      stepId: id,
      planId: step.planId,
      userId,
      requiresApproval: step.requiresCoApproval,
    });

    return updatedStep;
  }

  async approve(
    organizationId: string,
    id: string,
    userId: string,
    dto: ApproveStepDto,
  ) {
    const step = await this.findById(organizationId, id);

    if (!step.requiresCoApproval) {
      throw new BadRequestException('This step does not require approval');
    }

    if (step.status !== StepStatus.COMPLETED) {
      throw new BadRequestException('Step must be completed before approval');
    }

    const updatedStep = await this.prisma.remediationStep.update({
      where: { id },
      data: {
        approvedById: userId,
        approvedAt: new Date(),
        approvalNotes: dto.approvalNotes,
      },
    });

    this.eventEmitter.emit('remediation.step.approved', {
      organizationId,
      stepId: id,
      planId: step.planId,
      userId,
    });

    return updatedStep;
  }

  async skip(
    organizationId: string,
    id: string,
    userId: string,
    reason: string,
  ) {
    const step = await this.findById(organizationId, id);

    const updatedStep = await this.prisma.remediationStep.update({
      where: { id },
      data: {
        status: StepStatus.SKIPPED,
        completionNotes: `Skipped: ${reason}`,
        completedAt: new Date(),
        completedById: userId,
      },
    });

    await this.remediationService.updateStepCounts(step.planId);

    return updatedStep;
  }

  async delete(organizationId: string, id: string) {
    const step = await this.findById(organizationId, id);

    await this.prisma.remediationStep.delete({ where: { id } });

    await this.remediationService.updateStepCounts(step.planId);
  }

  async reorder(
    organizationId: string,
    planId: string,
    stepOrders: { id: string; order: number }[],
  ) {
    await this.prisma.$transaction(
      stepOrders.map(({ id, order }) =>
        this.prisma.remediationStep.updateMany({
          where: { id, organizationId, planId },
          data: { order },
        }),
      ),
    );
  }

  // Validate no circular dependencies
  private async validateDependencies(
    planId: string,
    dependsOnStepIds: string[],
    excludeStepId?: string,
  ) {
    const allSteps = await this.prisma.remediationStep.findMany({
      where: { planId },
      select: { id: true, dependsOnStepIds: true },
    });

    // Build adjacency list including the new/updated step
    const adjacencyList = new Map<string, string[]>();
    for (const step of allSteps) {
      if (step.id === excludeStepId) {
        // Use the new dependencies for the step being updated
        adjacencyList.set(step.id, dependsOnStepIds);
      } else {
        adjacencyList.set(step.id, step.dependsOnStepIds);
      }
    }

    // If this is a new step (not in allSteps), add it
    if (excludeStepId && !adjacencyList.has(excludeStepId)) {
      adjacencyList.set(excludeStepId, dependsOnStepIds);
    }

    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) return true;
      if (visited.has(stepId)) return false;

      visited.add(stepId);
      recursionStack.add(stepId);

      const deps = adjacencyList.get(stepId) || [];
      for (const depId of deps) {
        if (hasCycle(depId)) return true;
      }

      recursionStack.delete(stepId);
      return false;
    };

    // Check for cycles starting from any node
    for (const stepId of adjacencyList.keys()) {
      visited.clear();
      recursionStack.clear();
      if (hasCycle(stepId)) {
        throw new BadRequestException('Circular dependency detected');
      }
    }
  }

  // Get steps assigned to a user
  async findByAssignee(
    organizationId: string,
    userId: string,
    email?: string,
  ) {
    return this.prisma.remediationStep.findMany({
      where: {
        organizationId,
        OR: [
          { assigneeUserId: userId },
          ...(email ? [{ assigneeEmail: email }] : []),
        ],
        status: { in: [StepStatus.PENDING, StepStatus.IN_PROGRESS] },
      },
      include: {
        plan: {
          select: { id: true, title: true, caseId: true },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });
  }
}
