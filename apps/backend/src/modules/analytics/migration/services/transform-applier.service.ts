import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { FieldMappingDto, TransformFunction } from "../dto/migration.dto";
import { MigrationSourceType } from "@prisma/client";

/**
 * Template summary returned when listing templates.
 */
export interface TemplateSummary {
  name: string;
  fieldCount: number;
  createdAt: Date;
}

/**
 * TransformApplierService handles value transformations and template management
 * for CSV import field mappings.
 *
 * Features:
 * - Template save/load for reusing mappings
 * - Template listing and deletion
 */
@Injectable()
export class TransformApplierService {
  private readonly logger = new Logger(TransformApplierService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Save mapping template for reuse.
   *
   * @param orgId - Organization ID
   * @param userId - User saving the template
   * @param name - Template name
   * @param mappings - Field mappings to save
   */
  async saveTemplate(
    orgId: string,
    userId: string,
    name: string,
    mappings: FieldMappingDto[],
  ): Promise<void> {
    await this.prisma.migrationFieldTemplate.upsert({
      where: {
        organizationId_sourceType_name: {
          organizationId: orgId,
          sourceType: MigrationSourceType.GENERIC_CSV,
          name,
        },
      },
      create: {
        organizationId: orgId,
        name,
        sourceType: MigrationSourceType.GENERIC_CSV,
        mappings: mappings as unknown as object,
        createdById: userId,
      },
      update: {
        mappings: mappings as unknown as object,
      },
    });

    this.logger.log(`Saved template "${name}" for org ${orgId}`);
  }

  /**
   * List saved templates for organization.
   *
   * @param orgId - Organization ID
   * @returns Array of template summaries
   */
  async listTemplates(orgId: string): Promise<TemplateSummary[]> {
    const templates = await this.prisma.migrationFieldTemplate.findMany({
      where: {
        organizationId: orgId,
        sourceType: MigrationSourceType.GENERIC_CSV,
      },
      select: {
        name: true,
        mappings: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return templates.map((t) => ({
      name: t.name,
      fieldCount: Array.isArray(t.mappings) ? t.mappings.length : 0,
      createdAt: t.createdAt,
    }));
  }

  /**
   * Load a specific template by name.
   *
   * @param orgId - Organization ID
   * @param templateName - Template name to load
   * @returns Field mappings or null if not found
   */
  async loadTemplate(
    orgId: string,
    templateName: string,
  ): Promise<FieldMappingDto[] | null> {
    const template = await this.prisma.migrationFieldTemplate.findFirst({
      where: {
        organizationId: orgId,
        sourceType: MigrationSourceType.GENERIC_CSV,
        name: templateName,
      },
    });

    if (!template) return null;

    return template.mappings as unknown as FieldMappingDto[];
  }

  /**
   * Delete a template.
   *
   * @param orgId - Organization ID
   * @param templateName - Template name to delete
   * @returns True if deleted, false if not found
   */
  async deleteTemplate(orgId: string, templateName: string): Promise<boolean> {
    try {
      await this.prisma.migrationFieldTemplate.delete({
        where: {
          organizationId_sourceType_name: {
            organizationId: orgId,
            sourceType: MigrationSourceType.GENERIC_CSV,
            name: templateName,
          },
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the appropriate transform function for a target field.
   *
   * @param targetField - Target field name
   * @returns Transform function or undefined
   */
  getTransformForField(targetField: string): TransformFunction | undefined {
    const dateFields = ["incidentDate", "createdAt", "closedAt", "dueDate"];
    if (dateFields.includes(targetField)) {
      return TransformFunction.PARSE_DATE;
    }

    if (targetField === "categoryName") {
      return TransformFunction.MAP_CATEGORY;
    }

    if (targetField === "status") {
      return TransformFunction.MAP_STATUS;
    }

    if (targetField === "severity") {
      return TransformFunction.MAP_SEVERITY;
    }

    if (targetField === "reporterEmail" || targetField === "email") {
      return TransformFunction.EXTRACT_EMAIL;
    }

    if (targetField === "reporterPhone" || targetField === "phone") {
      return TransformFunction.EXTRACT_PHONE;
    }

    if (targetField === "reporterType") {
      return TransformFunction.PARSE_BOOLEAN;
    }

    return undefined;
  }
}
