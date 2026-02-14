/**
 * CustomPropertyFieldService - Handles custom property field discovery
 *
 * Fetches and maps custom property definitions from the database
 * to report field format for the report designer.
 *
 * Extracted from ReportFieldRegistryService for maintainability.
 */

import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { ReportFieldDto } from "../dto/report.dto";
import { ReportEntityType } from "../entities/saved-report.entity";
import {
  CUSTOM_PROPERTY_ENTITY_MAP,
  PROPERTY_TYPE_MAP,
} from "./field-registry-data";

@Injectable()
export class CustomPropertyFieldService {
  private readonly logger = new Logger(CustomPropertyFieldService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get custom property fields from the database for this tenant.
   *
   * @param entityType The report entity type (cases, rius, persons, etc.)
   * @param organizationId The tenant organization ID
   * @returns Array of custom property fields as ReportFieldDto
   */
  async getCustomPropertyFields(
    entityType: ReportEntityType,
    organizationId: string,
  ): Promise<ReportFieldDto[]> {
    // Find the CustomPropertyDefinition entityType that maps to this report entity type
    let customPropertyEntityType: string | undefined;
    for (const [propEntityType, reportEntityType] of Object.entries(
      CUSTOM_PROPERTY_ENTITY_MAP,
    )) {
      if (reportEntityType === entityType) {
        customPropertyEntityType = propEntityType;
        break;
      }
    }

    if (!customPropertyEntityType) {
      // No custom property support for this entity type
      return [];
    }

    try {
      const customProperties =
        await this.prisma.customPropertyDefinition.findMany({
          where: {
            organizationId,
            entityType: customPropertyEntityType as any,
            isActive: true,
          },
          orderBy: [{ groupName: "asc" }, { displayOrder: "asc" }],
        });

      return customProperties.map((prop) => ({
        id: `custom_${prop.key}`,
        label: prop.name,
        type: PROPERTY_TYPE_MAP[prop.dataType] || "string",
        group: prop.groupName || "Custom Properties",
        prismaField: `customFields.${prop.key}`,
        filterable: true,
        sortable: prop.dataType !== "MULTI_SELECT",
        groupable: ["SELECT", "BOOLEAN"].includes(prop.dataType),
        aggregatable: prop.dataType === "NUMBER",
        enumValues: prop.options
          ? (prop.options as any)?.options?.map((o: any) => o.value || o)
          : undefined,
        isCustomProperty: true,
      }));
    } catch (error) {
      this.logger.error(
        `Error fetching custom properties for ${entityType}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Checks if custom properties are supported for an entity type.
   */
  supportsCustomProperties(entityType: ReportEntityType): boolean {
    return Object.values(CUSTOM_PROPERTY_ENTITY_MAP).includes(entityType);
  }

  /**
   * Gets the custom property entity type for a report entity type.
   */
  getCustomPropertyEntityType(
    entityType: ReportEntityType,
  ): string | undefined {
    for (const [propEntityType, reportEntityType] of Object.entries(
      CUSTOM_PROPERTY_ENTITY_MAP,
    )) {
      if (reportEntityType === entityType) {
        return propEntityType;
      }
    }
    return undefined;
  }
}
