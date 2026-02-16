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

  /**
   * Apply a transform function to a value.
   *
   * @param value - Value to transform
   * @param transform - Transform function to apply
   * @param _params - Transform parameters (reserved for future use)
   * @returns Transformed value
   */
  applyTransform(
    value: unknown,
    transform: TransformFunction,
    _params?: Record<string, unknown>,
  ): unknown {
    const strValue = String(value);

    switch (transform) {
      case TransformFunction.UPPERCASE:
        return strValue.toUpperCase();

      case TransformFunction.LOWERCASE:
        return strValue.toLowerCase();

      case TransformFunction.TRIM:
        return strValue.trim();

      case TransformFunction.PARSE_DATE:
      case TransformFunction.PARSE_DATE_US:
      case TransformFunction.PARSE_DATE_EU:
      case TransformFunction.PARSE_DATE_ISO:
        return this.parseDate(strValue, transform);

      case TransformFunction.PARSE_BOOLEAN:
        const lowered = strValue.toLowerCase().trim();
        return ["yes", "true", "1", "y"].includes(lowered);

      case TransformFunction.PARSE_NUMBER:
        return Number(strValue.replace(/[^0-9.-]/g, ""));

      case TransformFunction.SPLIT_COMMA:
        return strValue
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

      case TransformFunction.EXTRACT_EMAIL:
        const emailMatch = strValue.match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
        );
        return emailMatch ? emailMatch[0] : null;

      case TransformFunction.EXTRACT_PHONE:
        const phoneMatch = strValue.match(/[\d\-\(\)\s\.]+/);
        return phoneMatch ? phoneMatch[0].replace(/\D/g, "") : null;

      case TransformFunction.MAP_SEVERITY:
        return this.mapSeverity(strValue);

      case TransformFunction.MAP_STATUS:
        return this.mapStatus(strValue);

      case TransformFunction.MAP_CATEGORY:
        return strValue;

      default:
        return value;
    }
  }

  /**
   * Normalize a value to the expected target type.
   *
   * @param value - Value to normalize
   * @param targetType - Expected target type
   * @returns Normalized value
   */
  normalizeValue(
    value: unknown,
    targetType: "string" | "number" | "date" | "boolean" | "array",
  ): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    switch (targetType) {
      case "string":
        return String(value).trim();

      case "number":
        const num = Number(String(value).replace(/[^0-9.-]/g, ""));
        return isNaN(num) ? null : num;

      case "date":
        return this.parseDate(String(value), TransformFunction.PARSE_DATE);

      case "boolean":
        const str = String(value).toLowerCase().trim();
        return ["yes", "true", "1", "y"].includes(str);

      case "array":
        if (Array.isArray(value)) return value;
        return String(value)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

      default:
        return value;
    }
  }

  /**
   * Parse a date string.
   */
  private parseDate(value: string, format: TransformFunction): Date | null {
    try {
      const trimmed = value.trim();

      switch (format) {
        case TransformFunction.PARSE_DATE_US: {
          const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (match) {
            return new Date(
              parseInt(match[3]),
              parseInt(match[1]) - 1,
              parseInt(match[2]),
            );
          }
          break;
        }
        case TransformFunction.PARSE_DATE_EU: {
          const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (match) {
            return new Date(
              parseInt(match[3]),
              parseInt(match[2]) - 1,
              parseInt(match[1]),
            );
          }
          break;
        }
        case TransformFunction.PARSE_DATE_ISO: {
          const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (match) {
            return new Date(
              parseInt(match[1]),
              parseInt(match[2]) - 1,
              parseInt(match[3]),
            );
          }
          break;
        }
        default: {
          const date = new Date(trimmed);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Map severity strings to enum values.
   */
  private mapSeverity(value: string): string {
    const lowered = value.toLowerCase().trim();

    if (["high", "critical", "3", "urgent"].includes(lowered)) return "HIGH";
    if (["medium", "moderate", "2", "normal"].includes(lowered))
      return "MEDIUM";
    if (["low", "1", "minor"].includes(lowered)) return "LOW";

    return "MEDIUM";
  }

  /**
   * Map status strings to enum values.
   */
  private mapStatus(value: string): string {
    const lowered = value.toLowerCase().trim();

    if (["new", "pending", "received"].includes(lowered)) return "NEW";
    if (["open", "in progress", "active", "investigating"].includes(lowered))
      return "OPEN";
    if (["closed", "resolved", "complete", "completed"].includes(lowered))
      return "CLOSED";

    return "NEW";
  }
}
