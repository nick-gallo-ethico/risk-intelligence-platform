import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { CampaignAssignmentService } from "../assignments/campaign-assignment.service";
import { RiusService } from "../../rius/rius.service";
import { CasesService } from "../../cases/cases.service";
import {
  CampaignAssignment,
  AttestationType,
  AssignmentStatus,
  RiuType,
  RiuSourceChannel,
  RiuReporterType,
  Severity,
  CampaignType,
  SourceChannel,
  ReporterType,
  CaseType,
  Prisma,
} from "@prisma/client";
import {
  SubmitAttestationDto,
  QuizResult,
  QuizQuestionResult,
  QuizConfigDto,
  QuizAnswerDto,
  AttestationSubmissionResult,
} from "./dto/attestation.dto";

/**
 * Event emitted when an attestation is submitted.
 */
export class AttestationSubmittedEvent {
  constructor(
    public readonly assignmentId: string,
    public readonly employeeId: string,
    public readonly campaignId: string,
    public readonly attested: boolean,
    public readonly refused: boolean,
    public readonly riuId: string | null,
    public readonly caseId: string | null,
    public readonly organizationId: string,
  ) {}
}

/**
 * Service for processing attestation responses.
 *
 * Key behaviors:
 * - Creates immutable RIU record for every attestation (response or refusal)
 * - Handles three attestation types: CHECKBOX, SIGNATURE, QUIZ
 * - Auto-creates case on refusal if configured
 * - Enforces quiz passing requirements
 */
@Injectable()
export class AttestationResponseService {
  private readonly logger = new Logger(AttestationResponseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly riusService: RiusService,
    private readonly casesService: CasesService,
    private readonly assignmentService: CampaignAssignmentService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Submit an attestation response.
   * Creates RIU for audit trail and optionally creates case on refusal.
   */
  async submitAttestation(
    dto: SubmitAttestationDto,
    employeeId: string,
    organizationId: string,
    userId: string,
  ): Promise<AttestationSubmissionResult> {
    // Get assignment with campaign and policy details
    const assignment = await this.prisma.campaignAssignment.findFirst({
      where: {
        id: dto.assignmentId,
        organizationId,
      },
      include: {
        campaign: {
          include: {
            policy: true,
            policyVersion: true,
          },
        },
        employee: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Assignment ${dto.assignmentId} not found`,
      );
    }

    // Verify assignment belongs to this employee
    if (assignment.employeeId !== employeeId) {
      throw new ForbiddenException(
        "This assignment does not belong to you",
      );
    }

    // Verify campaign is an attestation campaign
    if (assignment.campaign.type !== CampaignType.ATTESTATION) {
      throw new BadRequestException(
        "This assignment is not for an attestation campaign",
      );
    }

    // Verify assignment is not already completed
    if (
      assignment.attestedAt ||
      assignment.refusedAt ||
      assignment.status === AssignmentStatus.COMPLETED
    ) {
      throw new BadRequestException(
        "This attestation has already been submitted",
      );
    }

    const attestationType =
      assignment.campaign.attestationType ?? AttestationType.CHECKBOX;

    // Handle refusal
    if (dto.refused) {
      return this.handleRefusal(
        assignment,
        dto.refusalReason ?? "No reason provided",
        userId,
        organizationId,
      );
    }

    // Handle attestation based on type
    let quizResult: QuizResult | undefined;

    switch (attestationType) {
      case AttestationType.CHECKBOX:
        if (!dto.acknowledged) {
          throw new BadRequestException(
            "You must acknowledge the policy to complete attestation",
          );
        }
        break;

      case AttestationType.SIGNATURE:
        if (!dto.signatureData) {
          throw new BadRequestException(
            "Signature is required to complete attestation",
          );
        }
        break;

      case AttestationType.QUIZ:
        if (!dto.quizAnswers || dto.quizAnswers.length === 0) {
          throw new BadRequestException(
            "Quiz answers are required to complete attestation",
          );
        }

        // Score the quiz
        const quizConfig = assignment.campaign
          .quizConfig as unknown as QuizConfigDto;
        quizResult = this.scoreQuiz(quizConfig, dto.quizAnswers);

        // Check if passed
        if (!quizResult.passed) {
          // Increment attempt count
          const newAttempts = (assignment.quizAttempts ?? 0) + 1;
          const maxAttempts = quizConfig.maxAttempts ?? 3;

          await this.prisma.campaignAssignment.update({
            where: { id: assignment.id },
            data: {
              quizAttempts: newAttempts,
              quizScore: quizResult.score,
            },
          });

          // Check if max attempts reached
          if (maxAttempts > 0 && newAttempts >= maxAttempts) {
            // Treat max attempts exceeded as a failure - may need manual intervention
            return {
              assignment: {
                id: assignment.id,
                status: "FAILED",
                quizScore: quizResult.score,
              },
              quizResult,
            };
          }

          throw new BadRequestException({
            message: `Quiz not passed. Score: ${quizResult.score}%. Required: ${quizConfig.passingScore}%`,
            quizResult,
            attemptsRemaining:
              maxAttempts > 0 ? maxAttempts - newAttempts : "unlimited",
          });
        }
        break;
    }

    // Create attestation RIU (immutable audit record)
    const riu = await this.riusService.create(
      {
        type: RiuType.ATTESTATION_RESPONSE,
        sourceChannel: RiuSourceChannel.CAMPAIGN,
        reporterType: RiuReporterType.IDENTIFIED,
        reporterName: `${assignment.employee.firstName} ${assignment.employee.lastName}`,
        reporterEmail: assignment.employee.email,
        details: this.buildAttestationDetails(
          assignment,
          attestationType,
          dto,
          quizResult,
        ),
        summary: `Policy attestation: ${assignment.campaign.policy?.title ?? "Unknown Policy"}`,
        severity: Severity.LOW,
        campaignId: assignment.campaignId,
        campaignAssignmentId: assignment.id,
        formResponses: {
          attestationType,
          acknowledged: dto.acknowledged,
          hasSignature: !!dto.signatureData,
          quizScore: quizResult?.score,
          quizPassed: quizResult?.passed,
        },
      },
      userId,
      organizationId,
    );

    // Update assignment
    const updatedAssignment = await this.prisma.campaignAssignment.update({
      where: { id: assignment.id },
      data: {
        status: AssignmentStatus.COMPLETED,
        completedAt: new Date(),
        attestedAt: new Date(),
        attestationType,
        quizScore: quizResult?.score,
        quizAttempts: quizResult ? (assignment.quizAttempts ?? 0) + 1 : null,
        signatureData: dto.signatureData,
        riuId: riu.id,
      },
    });

    // Update campaign statistics
    await this.updateCampaignStatistics(assignment.campaignId);

    this.logger.log(
      `Attestation completed for assignment ${assignment.id} (employee ${employeeId})`,
    );

    // Emit event
    this.eventEmitter.emit(
      "attestation.submitted",
      new AttestationSubmittedEvent(
        assignment.id,
        employeeId,
        assignment.campaignId,
        true,
        false,
        riu.id,
        null,
        organizationId,
      ),
    );

    return {
      assignment: {
        id: updatedAssignment.id,
        status: updatedAssignment.status,
        attestedAt: updatedAssignment.attestedAt ?? undefined,
        quizScore: updatedAssignment.quizScore ?? undefined,
      },
      riu: {
        id: riu.id,
        referenceNumber: riu.referenceNumber,
        type: riu.type,
      },
      quizResult,
    };
  }

  /**
   * Handle attestation refusal.
   */
  private async handleRefusal(
    assignment: CampaignAssignment & {
      campaign: {
        policy: { title: string } | null;
        policyVersion: { content: string } | null;
        autoCreateCaseOnRefusal: boolean;
      };
      employee: { firstName: string; lastName: string; email: string };
    },
    reason: string,
    userId: string,
    organizationId: string,
  ): Promise<AttestationSubmissionResult> {
    // Create refusal RIU
    const riu = await this.riusService.create(
      {
        type: RiuType.ATTESTATION_RESPONSE,
        sourceChannel: RiuSourceChannel.CAMPAIGN,
        reporterType: RiuReporterType.IDENTIFIED,
        reporterName: `${assignment.employee.firstName} ${assignment.employee.lastName}`,
        reporterEmail: assignment.employee.email,
        details: `Attestation refused for policy "${assignment.campaign.policy?.title ?? "Unknown"}"\n\nRefusal reason: ${reason}`,
        summary: `Policy attestation REFUSED: ${assignment.campaign.policy?.title ?? "Unknown Policy"}`,
        severity: Severity.MEDIUM, // Refusals are elevated severity
        campaignId: assignment.campaignId,
        campaignAssignmentId: assignment.id,
        formResponses: {
          refused: true,
          refusalReason: reason,
        },
      },
      userId,
      organizationId,
    );

    // Update assignment
    const updatedAssignment = await this.prisma.campaignAssignment.update({
      where: { id: assignment.id },
      data: {
        status: AssignmentStatus.COMPLETED,
        completedAt: new Date(),
        refusedAt: new Date(),
        refusalReason: reason,
        riuId: riu.id,
      },
    });

    let createdCase: { id: string; referenceNumber: string } | undefined;

    // Create case if configured
    if (assignment.campaign.autoCreateCaseOnRefusal) {
      const caseRecord = await this.casesService.create(
        {
          sourceChannel: SourceChannel.DIRECT_ENTRY,
          caseType: CaseType.REPORT,
          reporterType: ReporterType.IDENTIFIED,
          reporterAnonymous: false,
          reporterName: `${assignment.employee.firstName} ${assignment.employee.lastName}`,
          reporterEmail: assignment.employee.email,
          details: `Policy attestation refusal\n\nPolicy: ${assignment.campaign.policy?.title ?? "Unknown"}\nReason: ${reason}`,
          summary: `Policy attestation refused by ${assignment.employee.firstName} ${assignment.employee.lastName}`,
          severity: Severity.MEDIUM,
          tags: ["attestation-refusal", "policy-compliance"],
        },
        userId,
        organizationId,
      );

      createdCase = {
        id: caseRecord.id,
        referenceNumber: caseRecord.referenceNumber,
      };

      this.logger.log(
        `Created case ${caseRecord.referenceNumber} for attestation refusal`,
      );
    }

    // Update campaign statistics
    await this.updateCampaignStatistics(assignment.campaignId);

    this.logger.log(
      `Attestation refused for assignment ${assignment.id} (employee ${assignment.employeeId})`,
    );

    // Emit event
    this.eventEmitter.emit(
      "attestation.submitted",
      new AttestationSubmittedEvent(
        assignment.id,
        assignment.employeeId,
        assignment.campaignId,
        false,
        true,
        riu.id,
        createdCase?.id ?? null,
        organizationId,
      ),
    );

    return {
      assignment: {
        id: updatedAssignment.id,
        status: updatedAssignment.status,
        refusedAt: updatedAssignment.refusedAt ?? undefined,
      },
      riu: {
        id: riu.id,
        referenceNumber: riu.referenceNumber,
        type: riu.type,
      },
      case: createdCase,
    };
  }

  /**
   * Score a quiz based on answers.
   */
  scoreQuiz(quizConfig: QuizConfigDto, answers: QuizAnswerDto[]): QuizResult {
    const results: QuizQuestionResult[] = [];
    let correctCount = 0;

    for (const question of quizConfig.questions) {
      const answer = answers.find((a) => a.questionId === question.id);
      const selectedOptionId = answer?.answerId ?? "";
      const isCorrect = selectedOptionId === question.correctOptionId;

      if (isCorrect) {
        correctCount++;
      }

      results.push({
        questionId: question.id,
        questionText: question.text,
        selectedOptionId,
        correctOptionId: question.correctOptionId,
        isCorrect,
        explanation: question.explanation,
      });
    }

    const totalQuestions = quizConfig.questions.length;
    const score =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = score >= quizConfig.passingScore;

    return {
      score,
      passed,
      totalQuestions,
      correctAnswers: correctCount,
      results,
    };
  }

  /**
   * Get attestation history for an employee.
   */
  async getAttestationHistory(
    employeeId: string,
    organizationId: string,
    options?: {
      skip?: number;
      take?: number;
    },
  ): Promise<{
    assignments: CampaignAssignment[];
    total: number;
  }> {
    const where: Prisma.CampaignAssignmentWhereInput = {
      employeeId,
      organizationId,
      campaign: {
        type: CampaignType.ATTESTATION,
      },
    };

    const [assignments, total] = await Promise.all([
      this.prisma.campaignAssignment.findMany({
        where,
        include: {
          campaign: {
            include: {
              policy: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  policyType: true,
                },
              },
              policyVersion: {
                select: {
                  id: true,
                  version: true,
                  versionLabel: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: options?.skip,
        take: options?.take,
      }),
      this.prisma.campaignAssignment.count({ where }),
    ]);

    return { assignments, total };
  }

  /**
   * Get pending attestations for an employee.
   */
  async getPendingAttestations(
    employeeId: string,
    organizationId: string,
  ): Promise<CampaignAssignment[]> {
    return this.prisma.campaignAssignment.findMany({
      where: {
        employeeId,
        organizationId,
        campaign: {
          type: CampaignType.ATTESTATION,
          status: "ACTIVE",
        },
        attestedAt: null,
        refusedAt: null,
        status: {
          in: [
            AssignmentStatus.PENDING,
            AssignmentStatus.NOTIFIED,
            AssignmentStatus.IN_PROGRESS,
          ],
        },
      },
      include: {
        campaign: {
          include: {
            policy: {
              select: {
                id: true,
                title: true,
                slug: true,
                policyType: true,
              },
            },
            policyVersion: {
              select: {
                id: true,
                version: true,
                versionLabel: true,
                content: true,
              },
            },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });
  }

  /**
   * Get assignment details for attestation UI.
   */
  async getAssignmentForAttestation(
    assignmentId: string,
    employeeId: string,
    organizationId: string,
  ): Promise<{
    assignment: CampaignAssignment;
    policy: {
      id: string;
      title: string;
      content: string;
    };
    campaign: {
      id: string;
      name: string;
      attestationType: AttestationType | null;
      quizConfig: QuizConfigDto | null;
      forceScroll: boolean;
    };
  }> {
    const assignment = await this.prisma.campaignAssignment.findFirst({
      where: {
        id: assignmentId,
        employeeId,
        organizationId,
      },
      include: {
        campaign: {
          include: {
            policy: true,
            policyVersion: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    if (assignment.campaign.type !== CampaignType.ATTESTATION) {
      throw new BadRequestException("This is not an attestation assignment");
    }

    return {
      assignment,
      policy: {
        id: assignment.campaign.policy?.id ?? "",
        title: assignment.campaign.policy?.title ?? "Unknown Policy",
        content: assignment.campaign.policyVersion?.content ?? "",
      },
      campaign: {
        id: assignment.campaign.id,
        name: assignment.campaign.name,
        attestationType: assignment.campaign.attestationType,
        quizConfig: assignment.campaign
          .quizConfig as unknown as QuizConfigDto | null,
        forceScroll: assignment.campaign.forceScroll,
      },
    };
  }

  /**
   * Build attestation details for RIU record.
   */
  private buildAttestationDetails(
    assignment: CampaignAssignment & {
      campaign: { policy: { title: string } | null };
      employee: { firstName: string; lastName: string };
    },
    attestationType: AttestationType,
    dto: SubmitAttestationDto,
    quizResult?: QuizResult,
  ): string {
    const lines = [
      `Policy attestation completed`,
      ``,
      `Policy: ${assignment.campaign.policy?.title ?? "Unknown"}`,
      `Employee: ${assignment.employee.firstName} ${assignment.employee.lastName}`,
      `Attestation Type: ${attestationType}`,
      `Date: ${new Date().toISOString()}`,
    ];

    if (attestationType === AttestationType.QUIZ && quizResult) {
      lines.push(``);
      lines.push(`Quiz Results:`);
      lines.push(`- Score: ${quizResult.score}%`);
      lines.push(`- Passed: ${quizResult.passed ? "Yes" : "No"}`);
      lines.push(
        `- Questions Correct: ${quizResult.correctAnswers}/${quizResult.totalQuestions}`,
      );
    }

    if (attestationType === AttestationType.SIGNATURE) {
      lines.push(``);
      lines.push(`Electronic signature captured.`);
    }

    return lines.join("\n");
  }

  /**
   * Update campaign statistics after attestation submission.
   */
  private async updateCampaignStatistics(campaignId: string): Promise<void> {
    const [total, completed, overdue] = await Promise.all([
      this.prisma.campaignAssignment.count({ where: { campaignId } }),
      this.prisma.campaignAssignment.count({
        where: {
          campaignId,
          status: AssignmentStatus.COMPLETED,
        },
      }),
      this.prisma.campaignAssignment.count({
        where: {
          campaignId,
          status: AssignmentStatus.OVERDUE,
        },
      }),
    ]);

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        totalAssignments: total,
        completedAssignments: completed,
        overdueAssignments: overdue,
        completionPercentage: percentage,
      },
    });
  }
}
