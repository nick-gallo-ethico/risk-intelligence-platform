/**
 * Type-safe Prisma Model Accessor Types
 *
 * Provides type-safe dynamic access to Prisma model delegates,
 * replacing unsafe `(this.prisma as any)[modelName]` patterns.
 */

import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Model names that support dynamic Prisma access.
 * Maps to camelCase delegate names on PrismaClient.
 */
export type PrismaModelName =
  | "case"
  | "investigation"
  | "riskIntelligenceUnit"
  | "campaign"
  | "policy"
  | "person"
  | "user"
  | "organization"
  | "category"
  | "workflowTemplate"
  | "workflowInstance"
  | "formDefinition"
  | "formSubmission"
  | "auditLog"
  | "attachment"
  | "notification"
  | "thresholdRule"
  | "conflictAlert"
  | "riuDisclosureExtension";

/**
 * Maps model names to their Prisma delegate types.
 * Used for type-safe delegate access.
 */
export type PrismaModelDelegate<T extends PrismaModelName> = T extends "case"
  ? PrismaClient["case"]
  : T extends "investigation"
    ? PrismaClient["investigation"]
    : T extends "riskIntelligenceUnit"
      ? PrismaClient["riskIntelligenceUnit"]
      : T extends "campaign"
        ? PrismaClient["campaign"]
        : T extends "policy"
          ? PrismaClient["policy"]
          : T extends "person"
            ? PrismaClient["person"]
            : T extends "user"
              ? PrismaClient["user"]
              : T extends "organization"
                ? PrismaClient["organization"]
                : T extends "category"
                  ? PrismaClient["category"]
                  : T extends "workflowTemplate"
                    ? PrismaClient["workflowTemplate"]
                    : T extends "workflowInstance"
                      ? PrismaClient["workflowInstance"]
                      : T extends "formDefinition"
                        ? PrismaClient["formDefinition"]
                        : T extends "formSubmission"
                          ? PrismaClient["formSubmission"]
                          : T extends "auditLog"
                            ? PrismaClient["auditLog"]
                            : T extends "attachment"
                              ? PrismaClient["attachment"]
                              : T extends "notification"
                                ? PrismaClient["notification"]
                                : T extends "thresholdRule"
                                  ? PrismaClient["thresholdRule"]
                                  : T extends "conflictAlert"
                                    ? PrismaClient["conflictAlert"]
                                    : T extends "riuDisclosureExtension"
                                      ? PrismaClient["riuDisclosureExtension"]
                                      : never;

/**
 * Type-safe Prisma model delegate accessor.
 * Use instead of `(prisma as any)[modelName]`.
 *
 * @example
 * // Instead of:
 * (this.prisma as any)[modelName].findMany(...)
 *
 * // Use:
 * getPrismaDelegate(this.prisma, modelName).findMany(...)
 *
 * @param prisma - PrismaClient instance
 * @param model - Model name (camelCase)
 * @returns Typed Prisma delegate for the model
 */
export function getPrismaDelegate<T extends PrismaModelName>(
  prisma: PrismaClient,
  model: T,
): PrismaModelDelegate<T> {
  // Use type assertion to access dynamic property
  return (prisma as unknown as Record<T, PrismaModelDelegate<T>>)[model];
}

/**
 * Maps model names to their WhereInput types.
 */
export type PrismaWhereInput<T extends PrismaModelName> = T extends "case"
  ? Prisma.CaseWhereInput
  : T extends "investigation"
    ? Prisma.InvestigationWhereInput
    : T extends "riskIntelligenceUnit"
      ? Prisma.RiskIntelligenceUnitWhereInput
      : T extends "campaign"
        ? Prisma.CampaignWhereInput
        : T extends "policy"
          ? Prisma.PolicyWhereInput
          : T extends "person"
            ? Prisma.PersonWhereInput
            : T extends "user"
              ? Prisma.UserWhereInput
              : T extends "organization"
                ? Prisma.OrganizationWhereInput
                : T extends "category"
                  ? Prisma.CategoryWhereInput
                  : T extends "workflowTemplate"
                    ? Prisma.WorkflowTemplateWhereInput
                    : T extends "workflowInstance"
                      ? Prisma.WorkflowInstanceWhereInput
                      : T extends "formDefinition"
                        ? Prisma.FormDefinitionWhereInput
                        : T extends "formSubmission"
                          ? Prisma.FormSubmissionWhereInput
                          : T extends "auditLog"
                            ? Prisma.AuditLogWhereInput
                            : T extends "attachment"
                              ? Prisma.AttachmentWhereInput
                              : T extends "notification"
                                ? Prisma.NotificationWhereInput
                                : T extends "thresholdRule"
                                  ? Prisma.ThresholdRuleWhereInput
                                  : T extends "conflictAlert"
                                    ? Prisma.ConflictAlertWhereInput
                                    : T extends "riuDisclosureExtension"
                                      ? Prisma.RiuDisclosureExtensionWhereInput
                                      : never;

/**
 * Generic Prisma query arguments with where clause.
 */
export interface PrismaQueryArgs<T extends PrismaModelName> {
  where?: PrismaWhereInput<T>;
  orderBy?:
    | Record<string, "asc" | "desc">
    | Array<Record<string, "asc" | "desc">>;
  take?: number;
  skip?: number;
  include?: Record<string, boolean | object>;
  select?: Record<string, boolean | object>;
}

/**
 * Helper type for dynamic model access with basic operations.
 * Use when you need to access multiple models dynamically.
 */
export interface DynamicPrismaModel {
  findMany(args?: {
    where?: Record<string, unknown>;
    take?: number;
    skip?: number;
    orderBy?:
      | Record<string, "asc" | "desc">
      | Array<Record<string, "asc" | "desc">>;
    include?: Record<string, boolean | object>;
    select?: Record<string, boolean | object>;
  }): Promise<unknown[]>;
  findFirst(args?: {
    where?: Record<string, unknown>;
  }): Promise<unknown | null>;
  count(args?: { where?: Record<string, unknown> }): Promise<number>;
  groupBy(args: {
    by: string[];
    where?: Record<string, unknown>;
    _count?: boolean | Record<string, boolean>;
    orderBy?: Record<string, Record<string, "asc" | "desc">>;
  }): Promise<unknown[]>;
  aggregate(args: {
    where?: Record<string, unknown>;
    _sum?: Record<string, boolean>;
    _avg?: Record<string, boolean>;
    _min?: Record<string, boolean>;
    _max?: Record<string, boolean>;
  }): Promise<Record<string, unknown>>;
}

/**
 * Get a dynamic model accessor for runtime model name access.
 * Use for cases where model name is not known at compile time.
 *
 * @example
 * const model = getDynamicPrismaModel(this.prisma, modelName);
 * const results = await model.findMany({ where: { organizationId } });
 */
export function getDynamicPrismaModel(
  prisma: PrismaClient,
  modelName: string,
): DynamicPrismaModel {
  return (prisma as unknown as Record<string, DynamicPrismaModel>)[modelName];
}
