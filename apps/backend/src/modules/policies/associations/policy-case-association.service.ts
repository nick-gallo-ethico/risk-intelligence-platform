import { Injectable, Logger } from "@nestjs/common";
import { PolicyCaseAssociation, PolicyType } from "@prisma/client";
import {
  CreatePolicyCaseAssociationDto,
  UpdatePolicyCaseAssociationDto,
  PolicyCaseQueryDto,
  ViolationStatItem,
} from "./dto/association.dto";
import { AssociationCrudService, ViolationAnalyticsService } from "./services";

// Re-export events for backward compatibility
export {
  PolicyLinkedToCaseEvent,
  PolicyUnlinkedFromCaseEvent,
} from "./services";

// Re-export analytics types
export type {
  ViolationTrendDataPoint,
  ViolationCategoryBreakdown,
  ViolationSummary,
} from "./services";

/**
 * Thin coordinator service for managing policy-to-case associations.
 *
 * Delegates to:
 * - AssociationCrudService: CRUD operations, event emission
 * - ViolationAnalyticsService: Violation statistics and reporting
 *
 * Policy-case links support three types:
 * - VIOLATION: Policy was violated in this case
 * - REFERENCE: Case references this policy
 * - GOVERNING: Policy governs the situation in this case
 *
 * All operations verify both policy and case belong to the same organization.
 */
@Injectable()
export class PolicyCaseAssociationService {
  private readonly logger = new Logger(PolicyCaseAssociationService.name);

  constructor(
    private readonly crudService: AssociationCrudService,
    private readonly analyticsService: ViolationAnalyticsService,
  ) {}

  /**
   * Creates a policy-to-case association.
   */
  async create(
    dto: CreatePolicyCaseAssociationDto,
    userId: string,
    organizationId: string,
  ): Promise<PolicyCaseAssociation> {
    return this.crudService.create(dto, userId, organizationId);
  }

  /**
   * Updates a policy-case association.
   */
  async update(
    id: string,
    dto: UpdatePolicyCaseAssociationDto,
    userId: string,
    organizationId: string,
  ): Promise<PolicyCaseAssociation> {
    return this.crudService.update(id, dto, userId, organizationId);
  }

  /**
   * Deletes a policy-case association.
   */
  async delete(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    return this.crudService.delete(id, userId, organizationId);
  }

  /**
   * Finds all associations for a policy.
   */
  async findByPolicy(
    policyId: string,
    organizationId: string,
  ): Promise<PolicyCaseAssociation[]> {
    return this.crudService.findByPolicy(policyId, organizationId);
  }

  /**
   * Finds all associations for a case.
   */
  async findByCase(
    caseId: string,
    organizationId: string,
  ): Promise<PolicyCaseAssociation[]> {
    return this.crudService.findByCase(caseId, organizationId);
  }

  /**
   * Finds a single association by ID.
   */
  async findById(
    id: string,
    organizationId: string,
  ): Promise<PolicyCaseAssociation> {
    return this.crudService.findById(id, organizationId);
  }

  /**
   * Queries associations with filtering and pagination.
   */
  async findAll(
    query: PolicyCaseQueryDto,
    organizationId: string,
  ): Promise<{ data: PolicyCaseAssociation[]; total: number }> {
    return this.crudService.findAll(query, organizationId);
  }

  /**
   * Returns violation statistics aggregated by policy.
   */
  async getViolationStats(
    organizationId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      policyType?: PolicyType;
    },
  ): Promise<ViolationStatItem[]> {
    return this.analyticsService.getViolationStats(organizationId, filters);
  }

  /**
   * Returns violations grouped by policy type/category.
   */
  async getViolationsByCategory(
    organizationId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    return this.analyticsService.getViolationsByCategory(
      organizationId,
      filters,
    );
  }

  /**
   * Returns violation trends over time periods.
   */
  async getViolationTrends(
    organizationId: string,
    options: {
      startDate: Date;
      endDate: Date;
      periodType: "monthly" | "quarterly";
      policyType?: PolicyType;
    },
  ) {
    return this.analyticsService.getViolationTrends(organizationId, options);
  }

  /**
   * Returns a summary of violation analytics.
   */
  async getViolationSummary(
    organizationId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    return this.analyticsService.getViolationSummary(organizationId, filters);
  }

  /**
   * Links a policy to a case with a specific link type.
   * Convenience method wrapping create() with cleaner interface.
   */
  async linkPolicyToCase(
    policyId: string,
    caseId: string,
    linkType: "VIOLATION" | "REFERENCE" | "GOVERNING",
    userId: string,
    organizationId: string,
    options?: {
      linkReason?: string;
      violationDate?: string;
      policyVersionId?: string;
    },
  ): Promise<PolicyCaseAssociation> {
    const dto: CreatePolicyCaseAssociationDto = {
      policyId,
      caseId,
      linkType: linkType as any,
      linkReason: options?.linkReason,
      violationDate: options?.violationDate,
      policyVersionId: options?.policyVersionId,
    };

    return this.crudService.create(dto, userId, organizationId);
  }
}
