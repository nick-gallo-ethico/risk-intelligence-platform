import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { QueryEntityType } from "../dto/ai-query.dto";

/**
 * Field whitelist definition with type information for validation.
 */
export interface FieldDefinition {
  prismaField: string;
  type: "string" | "number" | "date" | "boolean" | "enum";
  enumValues?: string[];
  /** Whether this field can be used in filters */
  filterable: boolean;
  /** Whether this field can be used in ORDER BY */
  sortable: boolean;
  /** Whether this field can be used in GROUP BY */
  groupable: boolean;
}

export type EntityFieldWhitelist = Record<string, FieldDefinition>;

/**
 * FieldWhitelistService provides field security validation for AI-powered queries.
 *
 * SECURITY: This service whitelists allowed fields per entity type to prevent:
 * - SQL injection via field names
 * - Access to sensitive/internal fields
 * - Data exposure through unintended joins
 *
 * All field names are validated against whitelists before being used in queries.
 */
@Injectable()
export class FieldWhitelistService {
  private readonly logger = new Logger(FieldWhitelistService.name);

  /**
   * Whitelisted fields for each entity type.
   * SECURITY: Only fields in this whitelist can be queried.
   */
  private readonly ALLOWED_FIELDS: Record<
    QueryEntityType,
    EntityFieldWhitelist
  > = {
    [QueryEntityType.CASE]: {
      id: {
        prismaField: "id",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: false,
      },
      referenceNumber: {
        prismaField: "referenceNumber",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: false,
      },
      status: {
        prismaField: "status",
        type: "enum",
        enumValues: ["NEW", "IN_PROGRESS", "PENDING", "CLOSED", "MERGED"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      outcome: {
        prismaField: "outcome",
        type: "enum",
        enumValues: [
          "SUBSTANTIATED",
          "UNSUBSTANTIATED",
          "INCONCLUSIVE",
          "NO_ACTION_REQUIRED",
        ],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      pipelineStage: {
        prismaField: "pipelineStage",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      createdAt: {
        prismaField: "createdAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      updatedAt: {
        prismaField: "updatedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      outcomeAt: {
        prismaField: "outcomeAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      assigneeId: {
        prismaField: "assigneeId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
      categoryId: {
        prismaField: "categoryId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
      severity: {
        prismaField: "severity",
        type: "enum",
        enumValues: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      businessUnitId: {
        prismaField: "businessUnitId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
      locationId: {
        prismaField: "locationId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
    },

    [QueryEntityType.RIU]: {
      id: {
        prismaField: "id",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: false,
      },
      referenceNumber: {
        prismaField: "referenceNumber",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: false,
      },
      type: {
        prismaField: "type",
        type: "enum",
        enumValues: [
          "HOTLINE_REPORT",
          "WEB_FORM_SUBMISSION",
          "DISCLOSURE_RESPONSE",
          "EMAIL_INTAKE",
          "CHATBOT_TRANSCRIPT",
        ],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      sourceChannel: {
        prismaField: "sourceChannel",
        type: "enum",
        enumValues: ["PHONE", "WEB_FORM", "EMAIL", "CHATBOT", "PROXY"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      reporterType: {
        prismaField: "reporterType",
        type: "enum",
        enumValues: ["ANONYMOUS", "CONFIDENTIAL", "IDENTIFIED"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      status: {
        prismaField: "status",
        type: "enum",
        enumValues: ["PENDING_QA", "IN_QA", "RELEASED", "REJECTED"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      severity: {
        prismaField: "severity",
        type: "enum",
        enumValues: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      categoryId: {
        prismaField: "categoryId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
      createdAt: {
        prismaField: "createdAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      releasedAt: {
        prismaField: "releasedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      locationCity: {
        prismaField: "locationCity",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      locationState: {
        prismaField: "locationState",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: true,
      },
    },

    [QueryEntityType.CAMPAIGN]: {
      id: {
        prismaField: "id",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: false,
      },
      name: {
        prismaField: "name",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: false,
      },
      type: {
        prismaField: "type",
        type: "enum",
        enumValues: ["DISCLOSURE", "ATTESTATION", "TRAINING", "SURVEY"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      status: {
        prismaField: "status",
        type: "enum",
        enumValues: [
          "DRAFT",
          "SCHEDULED",
          "ACTIVE",
          "PAUSED",
          "COMPLETED",
          "CANCELLED",
        ],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      launchAt: {
        prismaField: "launchAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      launchedAt: {
        prismaField: "launchedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      dueDate: {
        prismaField: "dueDate",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      createdAt: {
        prismaField: "createdAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      updatedAt: {
        prismaField: "updatedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      audienceMode: {
        prismaField: "audienceMode",
        type: "enum",
        enumValues: ["ALL", "SEGMENT", "MANUAL"],
        filterable: true,
        sortable: false,
        groupable: true,
      },
    },

    [QueryEntityType.PERSON]: {
      id: {
        prismaField: "id",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: false,
      },
      type: {
        prismaField: "type",
        type: "enum",
        enumValues: [
          "EMPLOYEE",
          "SUBJECT",
          "WITNESS",
          "EXTERNAL_CONTACT",
          "UNKNOWN",
        ],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      source: {
        prismaField: "source",
        type: "enum",
        enumValues: ["HRIS", "MANUAL", "INTAKE", "DISCLOSURE"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      businessUnitId: {
        prismaField: "businessUnitId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
      businessUnitName: {
        prismaField: "businessUnitName",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      jobTitle: {
        prismaField: "jobTitle",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      employmentStatus: {
        prismaField: "employmentStatus",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      locationId: {
        prismaField: "locationId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
      locationName: {
        prismaField: "locationName",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      createdAt: {
        prismaField: "createdAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      updatedAt: {
        prismaField: "updatedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
    },

    [QueryEntityType.DISCLOSURE]: {
      id: {
        prismaField: "id",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: false,
      },
      type: {
        prismaField: "type",
        type: "enum",
        enumValues: [
          "CONFLICT_OF_INTEREST",
          "GIFT",
          "ENTERTAINMENT",
          "OUTSIDE_ACTIVITY",
          "FINANCIAL_INTEREST",
        ],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      status: {
        prismaField: "status",
        type: "enum",
        enumValues: ["PENDING", "APPROVED", "REJECTED", "REQUIRES_REVIEW"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      riskLevel: {
        prismaField: "riskLevel",
        type: "enum",
        enumValues: ["LOW", "MEDIUM", "HIGH"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      submittedAt: {
        prismaField: "submittedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      reviewedAt: {
        prismaField: "reviewedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      createdAt: {
        prismaField: "createdAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      updatedAt: {
        prismaField: "updatedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      businessUnitId: {
        prismaField: "businessUnitId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
    },

    [QueryEntityType.INVESTIGATION]: {
      id: {
        prismaField: "id",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: false,
      },
      caseId: {
        prismaField: "caseId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
      status: {
        prismaField: "status",
        type: "enum",
        enumValues: [
          "PENDING",
          "IN_PROGRESS",
          "ON_HOLD",
          "COMPLETED",
          "CANCELLED",
        ],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      assigneeId: {
        prismaField: "assigneeId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
      outcome: {
        prismaField: "outcome",
        type: "enum",
        enumValues: [
          "SUBSTANTIATED",
          "UNSUBSTANTIATED",
          "INCONCLUSIVE",
          "REFERRED",
        ],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      startedAt: {
        prismaField: "startedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      completedAt: {
        prismaField: "completedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      createdAt: {
        prismaField: "createdAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      updatedAt: {
        prismaField: "updatedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
    },
  };

  /**
   * Validate and get field definition.
   * @throws BadRequestException if field is not allowed
   */
  validateField(
    entityType: QueryEntityType,
    fieldName: string,
    operation: "filter" | "sort" | "group",
  ): FieldDefinition {
    const whitelist = this.ALLOWED_FIELDS[entityType];
    if (!whitelist) {
      throw new BadRequestException(`Unknown entity type: ${entityType}`);
    }

    const fieldDef = whitelist[fieldName];
    if (!fieldDef) {
      this.logger.warn(
        `Attempted access to non-whitelisted field: ${entityType}.${fieldName}`,
      );
      throw new BadRequestException(`Field not allowed: ${fieldName}`);
    }

    if (operation === "filter" && !fieldDef.filterable) {
      throw new BadRequestException(`Field ${fieldName} cannot be filtered`);
    }
    if (operation === "sort" && !fieldDef.sortable) {
      throw new BadRequestException(`Field ${fieldName} cannot be sorted`);
    }
    if (operation === "group" && !fieldDef.groupable) {
      throw new BadRequestException(`Field ${fieldName} cannot be grouped`);
    }

    return fieldDef;
  }

  /**
   * Check if a field is allowed for an entity type.
   */
  isFieldAllowed(entityType: QueryEntityType, fieldName: string): boolean {
    const whitelist = this.ALLOWED_FIELDS[entityType];
    return whitelist ? fieldName in whitelist : false;
  }

  /**
   * Get allowed fields for an entity type (for AI prompt construction).
   */
  getAllowedFields(entityType: QueryEntityType): string[] {
    const whitelist = this.ALLOWED_FIELDS[entityType];
    return whitelist ? Object.keys(whitelist) : [];
  }

  /**
   * Get field metadata for AI prompt construction.
   */
  getFieldMetadata(entityType: QueryEntityType): Array<{
    field: string;
    type: string;
    enumValues?: string[];
  }> {
    const whitelist = this.ALLOWED_FIELDS[entityType];
    if (!whitelist) return [];

    return Object.entries(whitelist).map(([field, def]) => ({
      field,
      type: def.type,
      enumValues: def.enumValues,
    }));
  }

  /**
   * Get the field whitelist for an entity type.
   */
  getFieldWhitelist(entityType: QueryEntityType): EntityFieldWhitelist | null {
    return this.ALLOWED_FIELDS[entityType] || null;
  }
}
