/**
 * GoLiveService - Go-Live Readiness Management
 *
 * Implements three-tier go-live system per CONTEXT.md:
 * 1. Hard gates (must pass): auth, admin trained, terms, contact
 * 2. Readiness score (85%+ recommended): weighted checklist items
 * 3. Client sign-off: for proceeding below threshold
 *
 * Formula: canGoLive = allGatesPassed AND (score >= 85 OR hasSignoff)
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  HARD_GATES,
  READINESS_ITEMS,
  RECOMMENDED_SCORE,
  GateStatus,
} from "../types/go-live.types";
import {
  UpdateGateDto,
  UpdateReadinessItemDto,
  ClientSignoffDto,
  InternalApprovalDto,
} from "./dto/go-live.dto";

/**
 * Go-live status summary
 */
export interface GoLiveStatus {
  /** Whether all hard gates have passed or been waived */
  allGatesPassed: boolean;
  /** Number of gates that passed or were waived */
  passedGates: number;
  /** Total number of hard gates */
  totalGates: number;
  /** Calculated readiness score (0-100) */
  readinessScore: number;
  /** Recommended minimum score (85) */
  recommendedScore: number;
  /** Whether score meets recommended threshold */
  isRecommendedMet: boolean;
  /** Whether client sign-off exists */
  hasSignoff: boolean;
  /** Whether go-live can proceed */
  canGoLive: boolean;
  /** List of blockers preventing go-live */
  blockers: string[];
}

/**
 * Detailed gate status for display
 */
export interface GateDetail {
  gateId: string;
  name: string;
  description: string;
  status: GateStatus | string;
  checkedAt: Date | null;
  checkedById: string | null;
  waiverReason: string | null;
  notes: string | null;
}

/**
 * Detailed readiness item status for display
 */
export interface ReadinessItemDetail {
  itemId: string;
  name: string;
  description: string;
  weight: number;
  category: string;
  isComplete: boolean;
  percentComplete: number;
  completedAt: Date | null;
  completedById: string | null;
  notes: string | null;
}

@Injectable()
export class GoLiveService {
  private readonly logger = new Logger(GoLiveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Initialize go-live tracking for a project.
   * Creates gate and readiness item records from constants.
   */
  async initializeGoLive(projectId: string): Promise<void> {
    // Verify project exists
    const project = await this.prisma.implementationProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // Create gate records for all hard gates
    const gateData = HARD_GATES.map((gate) => ({
      organizationId: project.clientOrganizationId,
      projectId,
      gateId: gate.id,
      status: GateStatus.PENDING,
    }));

    await this.prisma.goLiveGate.createMany({
      data: gateData,
      skipDuplicates: true,
    });

    // Create readiness item records
    const itemData = READINESS_ITEMS.map((item) => ({
      organizationId: project.clientOrganizationId,
      projectId,
      itemId: item.id,
      isComplete: false,
      percentComplete: 0,
    }));

    await this.prisma.readinessItem.createMany({
      data: itemData,
      skipDuplicates: true,
    });

    this.logger.log(`Initialized go-live tracking for project ${projectId}`);
    this.eventEmitter.emit("go-live.initialized", { projectId });
  }

  /**
   * Get current go-live status for a project.
   * Calculates gate status, readiness score, and determines if go-live is possible.
   */
  async getGoLiveStatus(projectId: string): Promise<GoLiveStatus> {
    const [gates, items, signoff] = await Promise.all([
      this.prisma.goLiveGate.findMany({ where: { projectId } }),
      this.prisma.readinessItem.findMany({ where: { projectId } }),
      this.prisma.goLiveSignoff.findUnique({ where: { projectId } }),
    ]);

    // Calculate gate status
    const passedGates = gates.filter(
      (g) => g.status === GateStatus.PASSED || g.status === GateStatus.WAIVED,
    ).length;
    const totalGates = HARD_GATES.length;
    const allGatesPassed = passedGates === totalGates;

    // Calculate readiness score (weighted)
    let readinessScore = 0;
    for (const item of items) {
      const itemDef = READINESS_ITEMS.find((i) => i.id === item.itemId);
      if (itemDef) {
        const itemScore = item.isComplete ? 100 : item.percentComplete;
        readinessScore += (itemScore / 100) * itemDef.weight;
      }
    }
    readinessScore = Math.round(readinessScore);

    const isRecommendedMet = readinessScore >= RECOMMENDED_SCORE;
    const hasSignoff = !!signoff?.clientSignedAt;

    // Determine blockers
    const blockers: string[] = [];
    if (!allGatesPassed) {
      const pendingGates = gates.filter(
        (g) =>
          g.status === GateStatus.PENDING || g.status === GateStatus.FAILED,
      );
      for (const gate of pendingGates) {
        const gateDef = HARD_GATES.find((g) => g.id === gate.gateId);
        if (gateDef) {
          blockers.push(`Hard gate not passed: ${gateDef.name}`);
        }
      }
    }
    if (!isRecommendedMet && !hasSignoff) {
      blockers.push(
        `Readiness score (${readinessScore}%) below recommended (${RECOMMENDED_SCORE}%) - sign-off required`,
      );
    }

    // Formula: canGoLive = allGatesPassed AND (score >= 85 OR hasSignoff)
    const canGoLive = allGatesPassed && (isRecommendedMet || hasSignoff);

    return {
      allGatesPassed,
      passedGates,
      totalGates,
      readinessScore,
      recommendedScore: RECOMMENDED_SCORE,
      isRecommendedMet,
      hasSignoff,
      canGoLive,
      blockers,
    };
  }

  /**
   * Get detailed gate status with definitions
   */
  async getGateDetails(projectId: string): Promise<GateDetail[]> {
    const gates = await this.prisma.goLiveGate.findMany({
      where: { projectId },
    });

    return HARD_GATES.map((gateDef) => {
      const gate = gates.find((g) => g.gateId === gateDef.id);
      return {
        gateId: gateDef.id,
        name: gateDef.name,
        description: gateDef.description,
        status: gate?.status ?? GateStatus.PENDING,
        checkedAt: gate?.checkedAt ?? null,
        checkedById: gate?.checkedById ?? null,
        waiverReason: gate?.waiverReason ?? null,
        notes: gate?.notes ?? null,
      };
    });
  }

  /**
   * Get detailed readiness item status with definitions
   */
  async getReadinessItemDetails(
    projectId: string,
  ): Promise<ReadinessItemDetail[]> {
    const items = await this.prisma.readinessItem.findMany({
      where: { projectId },
    });

    return READINESS_ITEMS.map((itemDef) => {
      const item = items.find((i) => i.itemId === itemDef.id);
      return {
        itemId: itemDef.id,
        name: itemDef.name,
        description: itemDef.description,
        weight: itemDef.weight,
        category: itemDef.category,
        isComplete: item?.isComplete ?? false,
        percentComplete: item?.percentComplete ?? 0,
        completedAt: item?.completedAt ?? null,
        completedById: item?.completedById ?? null,
        notes: item?.notes ?? null,
      };
    });
  }

  /**
   * Update a hard gate status.
   * Waiver requires reason.
   */
  async updateGate(
    projectId: string,
    gateId: string,
    dto: UpdateGateDto,
    checkedById: string,
  ): Promise<void> {
    const gate = await this.prisma.goLiveGate.findUnique({
      where: { projectId_gateId: { projectId, gateId } },
    });

    if (!gate) {
      throw new NotFoundException(`Gate ${gateId} not found for project`);
    }

    // Waiver requires reason
    if (dto.status === GateStatus.WAIVED && !dto.waiverReason) {
      throw new BadRequestException("Waiver reason required for waived gates");
    }

    const updateData: {
      status: GateStatus;
      checkedAt: Date;
      checkedById: string;
      notes?: string;
      waiverReason?: string;
      waiverApprovedById?: string;
      waiverApprovedAt?: Date;
    } = {
      status: dto.status,
      checkedAt: new Date(),
      checkedById,
      notes: dto.notes,
    };

    if (dto.status === GateStatus.WAIVED) {
      updateData.waiverReason = dto.waiverReason;
      updateData.waiverApprovedById = checkedById;
      updateData.waiverApprovedAt = new Date();
    }

    await this.prisma.goLiveGate.update({
      where: { id: gate.id },
      data: updateData,
    });

    this.logger.log(
      `Gate ${gateId} updated to ${dto.status} for project ${projectId}`,
    );
    this.eventEmitter.emit("go-live.gate.updated", {
      projectId,
      gateId,
      status: dto.status,
      checkedById,
    });
  }

  /**
   * Update a readiness item.
   * Supports partial completion (percentComplete).
   */
  async updateReadinessItem(
    projectId: string,
    itemId: string,
    dto: UpdateReadinessItemDto,
    completedById: string,
  ): Promise<void> {
    const item = await this.prisma.readinessItem.findUnique({
      where: { projectId_itemId: { projectId, itemId } },
    });

    if (!item) {
      throw new NotFoundException(
        `Readiness item ${itemId} not found for project`,
      );
    }

    await this.prisma.readinessItem.update({
      where: { id: item.id },
      data: {
        isComplete: dto.isComplete,
        percentComplete: dto.isComplete ? 100 : (dto.percentComplete ?? 0),
        completedAt: dto.isComplete ? new Date() : null,
        completedById: dto.isComplete ? completedById : null,
        notes: dto.notes,
      },
    });

    this.logger.log(
      `Readiness item ${itemId} updated for project ${projectId}: complete=${dto.isComplete}`,
    );
    this.eventEmitter.emit("go-live.item.updated", {
      projectId,
      itemId,
      isComplete: dto.isComplete,
      percentComplete: dto.isComplete ? 100 : (dto.percentComplete ?? 0),
    });
  }

  /**
   * Record client sign-off.
   * Required when proceeding below recommended threshold.
   * All hard gates must pass first.
   */
  async recordClientSignoff(
    projectId: string,
    dto: ClientSignoffDto,
  ): Promise<void> {
    const [status, project] = await Promise.all([
      this.getGoLiveStatus(projectId),
      this.prisma.implementationProject.findUnique({
        where: { id: projectId },
        select: { clientOrganizationId: true },
      }),
    ]);

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // Must have all gates passed to sign off
    if (!status.allGatesPassed) {
      throw new BadRequestException("All hard gates must pass before sign-off");
    }

    await this.prisma.goLiveSignoff.upsert({
      where: { projectId },
      create: {
        organizationId: project.clientOrganizationId,
        projectId,
        type: "CLIENT",
        readinessScoreAtSignoff: status.readinessScore,
        gatesPassedAtSignoff: status.passedGates,
        gatesTotalAtSignoff: status.totalGates,
        acknowledgedRisks: dto.acknowledgedRisks,
        signoffStatement: dto.signoffStatement,
        clientSignerName: dto.clientSignerName,
        clientSignerEmail: dto.clientSignerEmail,
        clientSignedAt: new Date(),
      },
      update: {
        readinessScoreAtSignoff: status.readinessScore,
        gatesPassedAtSignoff: status.passedGates,
        gatesTotalAtSignoff: status.totalGates,
        acknowledgedRisks: dto.acknowledgedRisks,
        signoffStatement: dto.signoffStatement,
        clientSignerName: dto.clientSignerName,
        clientSignerEmail: dto.clientSignerEmail,
        clientSignedAt: new Date(),
      },
    });

    this.logger.log(`Client sign-off recorded for project ${projectId}`);
    this.eventEmitter.emit("go-live.signoff.completed", {
      projectId,
      signerName: dto.clientSignerName,
      signerEmail: dto.clientSignerEmail,
      readinessScore: status.readinessScore,
      acknowledgedRisks: dto.acknowledgedRisks,
    });
  }

  /**
   * Record internal approval.
   * Follows client sign-off.
   */
  async recordInternalApproval(
    projectId: string,
    dto: InternalApprovalDto,
    approverId: string,
  ): Promise<void> {
    const signoff = await this.prisma.goLiveSignoff.findUnique({
      where: { projectId },
    });

    if (!signoff) {
      throw new BadRequestException(
        "Client sign-off required before internal approval",
      );
    }

    if (!signoff.clientSignedAt) {
      throw new BadRequestException(
        "Client must sign off before internal approval",
      );
    }

    await this.prisma.goLiveSignoff.update({
      where: { projectId },
      data: {
        internalApproverName: dto.internalApproverName,
        internalApproverId: approverId,
        internalApprovedAt: new Date(),
      },
    });

    this.logger.log(`Internal approval recorded for project ${projectId}`);
    this.eventEmitter.emit("go-live.internal-approval.completed", {
      projectId,
      approverName: dto.internalApproverName,
      approverId,
    });
  }

  /**
   * Get sign-off details for a project
   */
  async getSignoffDetails(projectId: string) {
    const signoff = await this.prisma.goLiveSignoff.findUnique({
      where: { projectId },
    });

    if (!signoff) {
      return null;
    }

    return {
      type: signoff.type,
      readinessScoreAtSignoff: signoff.readinessScoreAtSignoff,
      gatesPassedAtSignoff: signoff.gatesPassedAtSignoff,
      gatesTotalAtSignoff: signoff.gatesTotalAtSignoff,
      acknowledgedRisks: signoff.acknowledgedRisks,
      signoffStatement: signoff.signoffStatement,
      clientSignerName: signoff.clientSignerName,
      clientSignerEmail: signoff.clientSignerEmail,
      clientSignedAt: signoff.clientSignedAt,
      internalApproverName: signoff.internalApproverName,
      internalApproverId: signoff.internalApproverId,
      internalApprovedAt: signoff.internalApprovedAt,
      createdAt: signoff.createdAt,
    };
  }
}
