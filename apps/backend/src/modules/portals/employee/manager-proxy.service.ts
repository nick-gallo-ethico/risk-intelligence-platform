/**
 * ManagerProxyService - Manager Proxy Reporting
 *
 * Provides methods for managers to submit reports on behalf of their team members:
 * - Get team members (direct reports)
 * - Validate proxy permission
 * - Submit proxy reports
 * - View proxy submission history
 *
 * Security:
 * - Manager must have active management relationship with the employee
 * - Proxy reason is required and audited
 * - Access code goes to employee (not manager) per CONTEXT.md
 */
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  RiuType,
  RiuSourceChannel,
  RiuReporterType,
  Severity,
  PersonRiuLabel,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from '@prisma/client';
import { customAlphabet } from 'nanoid';
import {
  ProxyReportDto,
  ProxyReason,
  TeamMember,
  ProxySubmissionResult,
  ProxySubmission,
} from './dto/proxy-report.dto';

/**
 * Custom nanoid alphabet excluding confusing characters (0, O, I, l, 1).
 * Same as RiuAccessService for consistency.
 */
const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ACCESS_CODE_LENGTH = 12;
const generateAccessCode = customAlphabet(ACCESS_CODE_ALPHABET, ACCESS_CODE_LENGTH);

/**
 * Maximum depth for checking transitive manager relationship.
 * Prevents infinite loops in hierarchy traversal.
 */
const MAX_HIERARCHY_DEPTH = 10;

@Injectable()
export class ManagerProxyService {
  private readonly logger = new Logger(ManagerProxyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get team members (direct reports) for a manager.
   *
   * @param managerPersonId - The manager's Person ID
   * @param organizationId - Organization scope
   * @returns List of direct reports
   */
  async getTeamMembers(
    managerPersonId: string,
    organizationId: string,
  ): Promise<TeamMember[]> {
    // Find all persons where this manager is their manager
    const directReports = await this.prisma.person.findMany({
      where: {
        organizationId,
        managerId: managerPersonId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        businessUnitName: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return directReports.map((person) => ({
      id: person.id,
      name: [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Unknown',
      email: person.email,
      jobTitle: person.jobTitle,
      department: person.businessUnitName,
    }));
  }

  /**
   * Check if manager can submit proxy report for an employee.
   * Validates direct or transitive reporting relationship.
   *
   * @param managerPersonId - The manager's Person ID
   * @param employeePersonId - The employee's Person ID
   * @param organizationId - Organization scope
   * @returns True if valid proxy relationship exists
   */
  async canProxyFor(
    managerPersonId: string,
    employeePersonId: string,
    organizationId: string,
  ): Promise<boolean> {
    // Same person cannot proxy for themselves
    if (managerPersonId === employeePersonId) {
      return false;
    }

    // Check direct relationship first (most common case)
    const employee = await this.prisma.person.findFirst({
      where: {
        id: employeePersonId,
        organizationId,
        status: 'ACTIVE',
      },
      select: { managerId: true },
    });

    if (!employee) {
      return false;
    }

    // Direct report check
    if (employee.managerId === managerPersonId) {
      return true;
    }

    // Check transitive relationship (skip-level managers)
    return this.checkTransitiveManagership(
      managerPersonId,
      employee.managerId,
      organizationId,
      0,
    );
  }

  /**
   * Submit a proxy report on behalf of an employee.
   *
   * @param managerPersonId - The manager's Person ID
   * @param userId - The manager's User ID (for audit)
   * @param dto - Proxy report details
   * @param organizationId - Organization scope
   * @returns Result with access code for employee
   */
  async submitProxyReport(
    managerPersonId: string,
    userId: string,
    dto: ProxyReportDto,
    organizationId: string,
  ): Promise<ProxySubmissionResult> {
    // Validate proxy permission
    const canProxy = await this.canProxyFor(
      managerPersonId,
      dto.employeePersonId,
      organizationId,
    );

    if (!canProxy) {
      throw new ForbiddenException(
        'You do not have permission to submit reports on behalf of this employee',
      );
    }

    // Validate reason notes if OTHER is selected
    if (dto.reason === ProxyReason.OTHER && !dto.reasonNotes) {
      throw new BadRequestException(
        'Reason notes are required when selecting OTHER as the proxy reason',
      );
    }

    // Get employee details
    const employee = await this.prisma.person.findUnique({
      where: { id: dto.employeePersonId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        employeeId: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const employeeName = [employee.firstName, employee.lastName]
      .filter(Boolean)
      .join(' ') || 'Unknown';

    // Generate unique access code for the employee
    const accessCode = await this.generateUniqueAccessCode();

    // Generate reference number
    const referenceNumber = await this.generateReferenceNumber(organizationId);

    // Create the RIU as a proxy submission
    const riu = await this.prisma.riskIntelligenceUnit.create({
      data: {
        organizationId,
        referenceNumber,
        createdById: userId,

        // Type Classification
        type: RiuType.WEB_FORM_SUBMISSION,
        sourceChannel: RiuSourceChannel.PROXY,

        // Content
        details: dto.content,

        // Reporter (the employee)
        reporterType: RiuReporterType.CONFIDENTIAL,
        anonymousAccessCode: accessCode,
        reporterName: employeeName,
        reporterEmail: employee.email,

        // Classification
        categoryId: dto.categoryId,
        severity: dto.isUrgent ? Severity.HIGH : Severity.MEDIUM,

        // Proxy metadata in customFields
        customFields: {
          isProxySubmission: true,
          proxySubmitterId: managerPersonId,
          proxyReason: dto.reason,
          proxyReasonNotes: dto.reasonNotes,
        },
      },
    });

    // Create person-RIU associations
    await this.prisma.personRiuAssociation.createMany({
      data: [
        {
          organizationId,
          personId: dto.employeePersonId,
          riuId: riu.id,
          label: PersonRiuLabel.REPORTER,
          notes: 'Submitted via manager proxy',
          createdById: userId,
        },
      ],
    });

    // Audit log the proxy action
    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.RIU,
      entityId: riu.id,
      action: 'proxy_report.submitted',
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: `Manager submitted proxy report on behalf of ${employeeName}`,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: {
        employeePersonId: dto.employeePersonId,
        employeeName,
        proxyReason: dto.reason,
        proxyReasonNotes: dto.reasonNotes,
        referenceNumber,
      },
    });

    // Emit event for downstream processing
    this.eventEmitter.emit('proxy_report.submitted', {
      organizationId,
      riuId: riu.id,
      referenceNumber,
      managerPersonId,
      employeePersonId: dto.employeePersonId,
      reason: dto.reason,
    });

    this.logger.log(
      `Manager ${managerPersonId} submitted proxy report ${referenceNumber} for employee ${dto.employeePersonId}`,
    );

    return {
      accessCode,
      reportId: riu.id,
      referenceNumber,
      employeeName,
    };
  }

  /**
   * Get list of proxy submissions made by a manager.
   *
   * @param managerPersonId - The manager's Person ID
   * @param organizationId - Organization scope
   * @returns List of proxy submissions
   */
  async getProxySubmissions(
    managerPersonId: string,
    organizationId: string,
  ): Promise<ProxySubmission[]> {
    // Find RIUs with proxy metadata indicating this manager submitted them
    const rius = await this.prisma.riskIntelligenceUnit.findMany({
      where: {
        organizationId,
        sourceChannel: RiuSourceChannel.PROXY,
        customFields: {
          path: ['proxySubmitterId'],
          equals: managerPersonId,
        },
      },
      include: {
        personAssociations: {
          where: { label: PersonRiuLabel.REPORTER },
          include: {
            person: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rius.map((riu) => {
      const customFields = riu.customFields as Record<string, unknown> | null;
      const reporter = riu.personAssociations[0]?.person;
      const employeeName = reporter
        ? [reporter.firstName, reporter.lastName].filter(Boolean).join(' ')
        : 'Unknown';

      return {
        reportId: riu.id,
        employeeName,
        submittedAt: riu.createdAt,
        status: riu.status,
        reason: (customFields?.proxyReason as ProxyReason) || ProxyReason.OTHER,
      };
    });
  }

  // ==================== Private Methods ====================

  /**
   * Check transitive manager relationship via hierarchy traversal.
   * Walks up the manager chain from currentManagerId looking for targetManagerId.
   */
  private async checkTransitiveManagership(
    targetManagerId: string,
    currentManagerId: string | null,
    organizationId: string,
    depth: number,
  ): Promise<boolean> {
    // Prevent infinite loops
    if (depth >= MAX_HIERARCHY_DEPTH || !currentManagerId) {
      return false;
    }

    // Direct match
    if (currentManagerId === targetManagerId) {
      return true;
    }

    // Get the current manager's manager
    const person = await this.prisma.person.findFirst({
      where: {
        id: currentManagerId,
        organizationId,
      },
      select: { managerId: true },
    });

    if (!person?.managerId) {
      return false;
    }

    // Recurse up the chain
    return this.checkTransitiveManagership(
      targetManagerId,
      person.managerId,
      organizationId,
      depth + 1,
    );
  }

  /**
   * Generate a unique access code for anonymous/confidential reporting.
   */
  private async generateUniqueAccessCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = generateAccessCode();
      const existing = await this.prisma.riskIntelligenceUnit.findFirst({
        where: { anonymousAccessCode: code },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique access code after maximum attempts');
    }

    return code;
  }

  /**
   * Generate a reference number for the RIU.
   * Format: RIU-YYYY-NNNNN
   */
  private async generateReferenceNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RIU-${year}-`;

    // Find the highest reference number for this year and org
    const lastRiu = await this.prisma.riskIntelligenceUnit.findFirst({
      where: {
        organizationId,
        referenceNumber: { startsWith: prefix },
      },
      orderBy: { referenceNumber: 'desc' },
      select: { referenceNumber: true },
    });

    let nextNumber = 1;
    if (lastRiu) {
      const lastNumber = parseInt(lastRiu.referenceNumber.split('-')[2], 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }
}
