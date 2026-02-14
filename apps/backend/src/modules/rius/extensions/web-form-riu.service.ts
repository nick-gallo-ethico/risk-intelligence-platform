import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { RiuWebFormExtension, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * DTO for creating a web form extension
 */
export interface CreateWebFormExtensionDto {
  formDefinitionId: string;
  formDefinitionVersion: number;
  formName?: string;
  submissionSource?: string;
  submitterIpAddress?: string;
  submitterUserAgent?: string;
  submissionDuration?: number;
  validationPassed?: boolean;
  validationErrors?: unknown;
  attachmentCount?: number;
  totalAttachmentSize?: number;
}

/**
 * Service for managing web form-specific RIU data.
 *
 * Web Form RIUs have additional fields for:
 * - Form metadata (definition ID, version, name)
 * - Submission metadata (source, IP, user agent, duration)
 * - Validation state (passed/failed, error details)
 * - Attachment tracking (count, total size)
 *
 * This service tracks which form version was used for the submission,
 * ensuring historical accuracy even when forms are updated.
 */
@Injectable()
export class WebFormRiuService {
  private readonly logger = new Logger(WebFormRiuService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a web form extension for an RIU.
   * Should be called when creating a WEB_FORM_SUBMISSION type RIU.
   *
   * @param riuId - The RIU ID
   * @param dto - The web form extension data
   * @param organizationId - The organization ID
   */
  async createExtension(
    riuId: string,
    dto: CreateWebFormExtensionDto,
    organizationId: string,
  ): Promise<RiuWebFormExtension> {
    // Validate required fields
    if (!dto.formDefinitionId) {
      throw new BadRequestException("Form definition ID is required");
    }

    if (dto.formDefinitionVersion == null || dto.formDefinitionVersion < 1) {
      throw new BadRequestException(
        "Valid form definition version is required",
      );
    }

    // Check if extension already exists
    const existing = await this.prisma.riuWebFormExtension.findUnique({
      where: { riuId },
    });

    if (existing) {
      throw new BadRequestException(
        `Web form extension already exists for RIU ${riuId}`,
      );
    }

    const extension = await this.prisma.riuWebFormExtension.create({
      data: {
        riuId,
        organizationId,
        formDefinitionId: dto.formDefinitionId,
        formDefinitionVersion: dto.formDefinitionVersion,
        formName: dto.formName,
        submissionSource: dto.submissionSource,
        submitterIpAddress: dto.submitterIpAddress,
        submitterUserAgent: dto.submitterUserAgent,
        submissionDuration: dto.submissionDuration,
        validationPassed: dto.validationPassed ?? true,
        validationErrors: dto.validationErrors as Prisma.InputJsonValue,
        attachmentCount: dto.attachmentCount ?? 0,
        totalAttachmentSize: dto.totalAttachmentSize ?? 0,
      },
    });

    this.logger.debug(
      `Created web form extension for RIU ${riuId} in org ${organizationId}, ` +
        `form: ${dto.formDefinitionId} v${dto.formDefinitionVersion}`,
    );

    return extension;
  }

  /**
   * Gets the web form extension for an RIU.
   * Returns null if not found.
   */
  async getExtension(riuId: string): Promise<RiuWebFormExtension | null> {
    return this.prisma.riuWebFormExtension.findUnique({
      where: { riuId },
    });
  }

  /**
   * Gets the web form extension or throws NotFoundException.
   */
  async getExtensionOrFail(riuId: string): Promise<RiuWebFormExtension> {
    const extension = await this.getExtension(riuId);

    if (!extension) {
      throw new NotFoundException(
        `Web form extension not found for RIU ${riuId}`,
      );
    }

    return extension;
  }

  /**
   * Gets all submissions for a specific form definition.
   * Useful for form analytics and reporting.
   */
  async getSubmissionsByForm(
    formDefinitionId: string,
    organizationId: string,
    options?: {
      version?: number;
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    data: RiuWebFormExtension[];
    total: number;
  }> {
    const where: Prisma.RiuWebFormExtensionWhereInput = {
      organizationId,
      formDefinitionId,
    };

    if (options?.version != null) {
      where.formDefinitionVersion = options.version;
    }

    const [data, total] = await Promise.all([
      this.prisma.riuWebFormExtension.findMany({
        where,
        include: {
          riu: {
            select: {
              id: true,
              referenceNumber: true,
              createdAt: true,
              status: true,
              severity: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      this.prisma.riuWebFormExtension.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Gets submissions with validation failures.
   * Useful for identifying form usability issues.
   */
  async getFailedValidationSubmissions(
    organizationId: string,
    formDefinitionId?: string,
  ): Promise<RiuWebFormExtension[]> {
    const where: Prisma.RiuWebFormExtensionWhereInput = {
      organizationId,
      validationPassed: false,
    };

    if (formDefinitionId) {
      where.formDefinitionId = formDefinitionId;
    }

    return this.prisma.riuWebFormExtension.findMany({
      where,
      include: {
        riu: {
          select: {
            id: true,
            referenceNumber: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Gets submission statistics for a form.
   * Useful for form analytics dashboard.
   */
  async getFormSubmissionStats(
    formDefinitionId: string,
    organizationId: string,
  ): Promise<{
    totalSubmissions: number;
    byVersion: { version: number; count: number }[];
    bySource: { source: string; count: number }[];
    validationStats: { passed: number; failed: number };
    avgSubmissionDuration: number | null;
    totalAttachments: number;
    totalAttachmentSize: number;
  }> {
    const baseWhere = { organizationId, formDefinitionId };

    // Get total count
    const totalSubmissions = await this.prisma.riuWebFormExtension.count({
      where: baseWhere,
    });

    // Get by version
    const byVersion = await this.prisma.riuWebFormExtension.groupBy({
      by: ["formDefinitionVersion"],
      where: baseWhere,
      _count: true,
    });

    // Get by source
    const bySource = await this.prisma.riuWebFormExtension.groupBy({
      by: ["submissionSource"],
      where: baseWhere,
      _count: true,
    });

    // Get validation stats
    const passedCount = await this.prisma.riuWebFormExtension.count({
      where: { ...baseWhere, validationPassed: true },
    });
    const failedCount = await this.prisma.riuWebFormExtension.count({
      where: { ...baseWhere, validationPassed: false },
    });

    // Get average submission duration
    const durationStats = await this.prisma.riuWebFormExtension.aggregate({
      where: {
        ...baseWhere,
        submissionDuration: { not: null },
      },
      _avg: { submissionDuration: true },
    });

    // Get attachment totals
    const attachmentStats = await this.prisma.riuWebFormExtension.aggregate({
      where: baseWhere,
      _sum: {
        attachmentCount: true,
        totalAttachmentSize: true,
      },
    });

    return {
      totalSubmissions,
      byVersion: byVersion.map((v) => ({
        version: v.formDefinitionVersion,
        count: v._count,
      })),
      bySource: bySource.map((s) => ({
        source: s.submissionSource ?? "unknown",
        count: s._count,
      })),
      validationStats: {
        passed: passedCount,
        failed: failedCount,
      },
      avgSubmissionDuration: durationStats._avg.submissionDuration,
      totalAttachments: attachmentStats._sum.attachmentCount ?? 0,
      totalAttachmentSize: attachmentStats._sum.totalAttachmentSize ?? 0,
    };
  }

  /**
   * Gets recent submissions from a specific IP address.
   * Useful for rate limiting and spam detection.
   */
  async getSubmissionsByIp(
    ipAddress: string,
    organizationId: string,
    withinHours = 24,
  ): Promise<RiuWebFormExtension[]> {
    const since = new Date();
    since.setHours(since.getHours() - withinHours);

    return this.prisma.riuWebFormExtension.findMany({
      where: {
        organizationId,
        submitterIpAddress: ipAddress,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Updates attachment tracking information.
   * Called when attachments are added to an RIU.
   */
  async updateAttachmentTracking(
    riuId: string,
    attachmentCount: number,
    totalAttachmentSize: number,
  ): Promise<RiuWebFormExtension> {
    // Verify extension exists
    await this.getExtensionOrFail(riuId);

    return this.prisma.riuWebFormExtension.update({
      where: { riuId },
      data: {
        attachmentCount,
        totalAttachmentSize,
      },
    });
  }
}
