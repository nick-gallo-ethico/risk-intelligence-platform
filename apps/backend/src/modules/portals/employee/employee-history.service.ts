/**
 * EmployeeHistoryService - Employee History Views
 *
 * Provides methods for employees to view their compliance history:
 * - My Reports: RIUs they have submitted
 * - My Disclosures: Disclosure campaign assignments
 * - My Attestations: Policy attestation assignments
 * - Compliance Overview: Summary counts and score
 *
 * All queries are scoped to the authenticated user's Person record
 * within their organization.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CampaignType,
  RiuStatus,
  AssignmentStatus,
  PersonRiuLabel,
} from '@prisma/client';
import {
  ReportSummary,
  DisclosureSummary,
  AttestationSummary,
  ComplianceOverview,
  PaginationOptions,
  PaginatedResult,
} from './types/employee-history.types';

/**
 * Default pagination values.
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class EmployeeHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get reports (RIUs) submitted by the employee.
   * Returns reports where the employee is linked as the REPORTER.
   *
   * @param personId - The employee's Person ID
   * @param organizationId - Organization scope
   * @param options - Pagination options
   * @returns Paginated list of report summaries
   */
  async getMyReports(
    personId: string,
    organizationId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ReportSummary>> {
    const page = options?.page ?? DEFAULT_PAGE;
    const limit = Math.min(options?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    // Find RIUs where this person is the REPORTER
    const [riuAssociations, total] = await Promise.all([
      this.prisma.personRiuAssociation.findMany({
        where: {
          organizationId,
          personId,
          label: PersonRiuLabel.REPORTER,
        },
        include: {
          riu: {
            include: {
              category: {
                select: { name: true },
              },
              caseAssociations: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                include: {
                  case: {
                    select: { status: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.personRiuAssociation.count({
        where: {
          organizationId,
          personId,
          label: PersonRiuLabel.REPORTER,
        },
      }),
    ]);

    const data: ReportSummary[] = riuAssociations.map((assoc) => ({
      id: assoc.riu.id,
      referenceNumber: assoc.riu.referenceNumber,
      category: assoc.riu.category?.name ?? null,
      status: assoc.riu.status,
      submittedAt: assoc.riu.createdAt,
      caseStatus: assoc.riu.caseAssociations[0]?.case?.status,
      hasAccessCode: !!assoc.riu.anonymousAccessCode,
    }));

    return {
      data,
      total,
      page,
      limit,
      hasMore: skip + data.length < total,
    };
  }

  /**
   * Get disclosure assignments for the employee.
   * Returns disclosure campaign assignments where the employee is assigned.
   *
   * @param personId - The employee's Person ID
   * @param organizationId - Organization scope
   * @param options - Pagination options
   * @returns Paginated list of disclosure summaries
   */
  async getMyDisclosures(
    personId: string,
    organizationId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<DisclosureSummary>> {
    const page = options?.page ?? DEFAULT_PAGE;
    const limit = Math.min(options?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    // Get the employee ID from the Person record
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      select: { employeeId: true },
    });

    if (!person?.employeeId) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        hasMore: false,
      };
    }

    // Find disclosure campaign assignments
    const [assignments, total] = await Promise.all([
      this.prisma.campaignAssignment.findMany({
        where: {
          organizationId,
          employeeId: person.employeeId,
          campaign: {
            type: CampaignType.DISCLOSURE,
          },
        },
        include: {
          campaign: {
            select: {
              name: true,
              type: true,
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.campaignAssignment.count({
        where: {
          organizationId,
          employeeId: person.employeeId,
          campaign: {
            type: CampaignType.DISCLOSURE,
          },
        },
      }),
    ]);

    const data: DisclosureSummary[] = assignments.map((assignment) => ({
      id: assignment.id,
      type: this.extractDisclosureType(assignment),
      campaignName: assignment.campaign.name,
      status: assignment.status,
      submittedAt: assignment.completedAt,
      dueDate: assignment.dueDate,
      // Next review date could be calculated based on disclosure type rules
      // For now, return undefined as this is org-configurable
      nextReviewDate: undefined,
    }));

    return {
      data,
      total,
      page,
      limit,
      hasMore: skip + data.length < total,
    };
  }

  /**
   * Get attestation assignments for the employee.
   * Returns attestation campaign assignments with pending/completed separation.
   *
   * @param personId - The employee's Person ID
   * @param organizationId - Organization scope
   * @param options - Pagination options
   * @returns Paginated list of attestation summaries
   */
  async getMyAttestations(
    personId: string,
    organizationId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<AttestationSummary>> {
    const page = options?.page ?? DEFAULT_PAGE;
    const limit = Math.min(options?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    // Get the employee ID from the Person record
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      select: { employeeId: true },
    });

    if (!person?.employeeId) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        hasMore: false,
      };
    }

    // Find attestation campaign assignments
    const [assignments, total] = await Promise.all([
      this.prisma.campaignAssignment.findMany({
        where: {
          organizationId,
          employeeId: person.employeeId,
          campaign: {
            type: CampaignType.ATTESTATION,
          },
        },
        include: {
          campaign: {
            select: {
              name: true,
              description: true,
            },
          },
        },
        orderBy: [
          // Pending first (completed last)
          { completedAt: { sort: 'asc', nulls: 'first' } },
          // Then by due date
          { dueDate: 'asc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.campaignAssignment.count({
        where: {
          organizationId,
          employeeId: person.employeeId,
          campaign: {
            type: CampaignType.ATTESTATION,
          },
        },
      }),
    ]);

    const data: AttestationSummary[] = assignments.map((assignment) => ({
      id: assignment.id,
      // Policy name is typically in the campaign name for attestations
      policyName: assignment.campaign.description ?? assignment.campaign.name,
      campaignName: assignment.campaign.name,
      dueDate: assignment.dueDate,
      completedAt: assignment.completedAt,
      status: assignment.status,
    }));

    return {
      data,
      total,
      page,
      limit,
      hasMore: skip + data.length < total,
    };
  }

  /**
   * Get compliance overview with summary counts and score.
   *
   * @param personId - The employee's Person ID
   * @param organizationId - Organization scope
   * @returns Compliance overview with counts and score
   */
  async getComplianceOverview(
    personId: string,
    organizationId: string,
  ): Promise<ComplianceOverview> {
    // Get the employee ID from the Person record
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      select: { employeeId: true },
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    // Run all count queries in parallel
    const [
      totalReports,
      pendingReports,
      totalDisclosures,
      upcomingDisclosureReviews,
      totalAttestations,
      pendingAttestations,
      overdueAttestations,
      completedAttestations,
    ] = await Promise.all([
      // Total reports (RIUs where person is REPORTER)
      this.prisma.personRiuAssociation.count({
        where: {
          organizationId,
          personId,
          label: PersonRiuLabel.REPORTER,
        },
      }),
      // Pending reports (not linked to case or closed)
      this.prisma.personRiuAssociation.count({
        where: {
          organizationId,
          personId,
          label: PersonRiuLabel.REPORTER,
          riu: {
            status: {
              in: [
                RiuStatus.PENDING_QA,
                RiuStatus.IN_QA,
                RiuStatus.RELEASED,
                RiuStatus.RECEIVED,
              ],
            },
          },
        },
      }),
      // Total disclosures
      person?.employeeId
        ? this.prisma.campaignAssignment.count({
            where: {
              organizationId,
              employeeId: person.employeeId,
              campaign: { type: CampaignType.DISCLOSURE },
            },
          })
        : 0,
      // Disclosures with upcoming review (due within 30 days)
      person?.employeeId
        ? this.prisma.campaignAssignment.count({
            where: {
              organizationId,
              employeeId: person.employeeId,
              campaign: { type: CampaignType.DISCLOSURE },
              dueDate: { lte: thirtyDaysFromNow },
              status: {
                in: [
                  AssignmentStatus.PENDING,
                  AssignmentStatus.NOTIFIED,
                  AssignmentStatus.IN_PROGRESS,
                ],
              },
            },
          })
        : 0,
      // Total attestations
      person?.employeeId
        ? this.prisma.campaignAssignment.count({
            where: {
              organizationId,
              employeeId: person.employeeId,
              campaign: { type: CampaignType.ATTESTATION },
            },
          })
        : 0,
      // Pending attestations (not completed)
      person?.employeeId
        ? this.prisma.campaignAssignment.count({
            where: {
              organizationId,
              employeeId: person.employeeId,
              campaign: { type: CampaignType.ATTESTATION },
              status: {
                in: [
                  AssignmentStatus.PENDING,
                  AssignmentStatus.NOTIFIED,
                  AssignmentStatus.IN_PROGRESS,
                ],
              },
            },
          })
        : 0,
      // Overdue attestations
      person?.employeeId
        ? this.prisma.campaignAssignment.count({
            where: {
              organizationId,
              employeeId: person.employeeId,
              campaign: { type: CampaignType.ATTESTATION },
              status: AssignmentStatus.OVERDUE,
            },
          })
        : 0,
      // Completed attestations
      person?.employeeId
        ? this.prisma.campaignAssignment.count({
            where: {
              organizationId,
              employeeId: person.employeeId,
              campaign: { type: CampaignType.ATTESTATION },
              status: AssignmentStatus.COMPLETED,
            },
          })
        : 0,
    ]);

    // Calculate compliance score
    // Score = (completed attestations / total attestations) * 50 +
    //         (disclosures up to date / total disclosures) * 50
    // If no items in a category, that portion is 100%

    let attestationScore = 100;
    if (totalAttestations > 0) {
      attestationScore = Math.round(
        (completedAttestations / totalAttestations) * 100,
      );
    }

    let disclosureScore = 100;
    if (totalDisclosures > 0) {
      // Disclosures "up to date" = completed disclosures (assuming no overdue)
      const overdueDisclosures = upcomingDisclosureReviews; // Simplification
      const upToDateDisclosures = totalDisclosures - overdueDisclosures;
      disclosureScore = Math.round(
        (upToDateDisclosures / totalDisclosures) * 100,
      );
    }

    // Weighted average (attestations are typically more critical)
    const complianceScore = Math.round(
      attestationScore * 0.6 + disclosureScore * 0.4,
    );

    return {
      reports: {
        total: totalReports,
        pending: pendingReports,
      },
      disclosures: {
        total: totalDisclosures,
        upcomingReviews: upcomingDisclosureReviews,
      },
      attestations: {
        total: totalAttestations,
        pending: pendingAttestations,
        overdue: overdueAttestations,
      },
      complianceScore,
    };
  }

  // ==================== Private Methods ====================

  /**
   * Extract disclosure type from assignment metadata.
   * The disclosure type may be stored in campaign metadata or assignment notes.
   */
  private extractDisclosureType(assignment: {
    campaign: { name: string };
    notes?: string | null;
  }): string | null {
    // Try to extract from campaign name (common pattern: "COI Disclosure 2024")
    const campaignName = assignment.campaign.name.toUpperCase();
    if (campaignName.includes('COI') || campaignName.includes('CONFLICT')) {
      return 'COI';
    }
    if (campaignName.includes('GIFT')) {
      return 'GIFT';
    }
    if (campaignName.includes('EMPLOYMENT') || campaignName.includes('OUTSIDE')) {
      return 'OUTSIDE_EMPLOYMENT';
    }
    if (campaignName.includes('POLITICAL')) {
      return 'POLITICAL';
    }
    if (campaignName.includes('TRAVEL')) {
      return 'TRAVEL';
    }
    if (campaignName.includes('CHARITABLE')) {
      return 'CHARITABLE';
    }

    return null;
  }
}
