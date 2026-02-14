/**
 * ReportFieldRegistryService - Dynamic field discovery for report designer
 *
 * Provides comprehensive field catalogs for all reportable entity types.
 * Fields include:
 * - Static fields from Prisma schema (in field-registry-data.ts)
 * - Dynamic custom properties per tenant (via CustomPropertyFieldService)
 * - Relationship traversal (e.g., case.category.name)
 * - Field metadata: label, type, group, filterable, sortable, groupable, aggregatable
 *
 * This is a thin coordinator that delegates to:
 * - field-registry-data.ts: Static field definitions
 * - CustomPropertyFieldService: Dynamic custom property fields
 */

import { Injectable, Logger } from "@nestjs/common";
import { ReportFieldDto, ReportFieldGroupDto } from "./dto/report.dto";
import { ReportEntityType } from "./entities/saved-report.entity";
import {
  FieldDefinition,
  ENTITY_FIELD_REGISTRIES,
  FIELD_GROUP_ORDER,
} from "./services/field-registry-data";
import { CustomPropertyFieldService } from "./services/custom-property-field.service";

@Injectable()
export class ReportFieldRegistryService {
  private readonly logger = new Logger(ReportFieldRegistryService.name);

  constructor(
    private readonly customPropertyFieldService: CustomPropertyFieldService,
  ) {}

  /**
   * Get all available fields for an entity type, including custom properties.
   *
   * @param entityType The entity type (cases, rius, persons, etc.)
   * @param organizationId The tenant organization ID
   * @returns Array of field definitions
   */
  async getFieldsForEntityType(
    entityType: ReportEntityType,
    organizationId: string,
  ): Promise<ReportFieldDto[]> {
    // Get static fields
    const staticFields = this.getStaticFields(entityType);

    // Get custom properties
    const customFields =
      await this.customPropertyFieldService.getCustomPropertyFields(
        entityType,
        organizationId,
      );

    return [...staticFields, ...customFields];
  }

  /**
   * Get fields organized into groups for UI display.
   *
   * @param entityType The entity type
   * @param organizationId The tenant organization ID
   * @returns Array of field groups with their fields
   */
  async getFieldGroups(
    entityType: ReportEntityType,
    organizationId: string,
  ): Promise<ReportFieldGroupDto[]> {
    const fields = await this.getFieldsForEntityType(
      entityType,
      organizationId,
    );

    // Group fields by their group name
    const groupMap = new Map<string, ReportFieldDto[]>();

    for (const field of fields) {
      const groupName = field.group;
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, []);
      }
      groupMap.get(groupName)!.push(field);
    }

    // Convert to array and sort groups
    const groups: ReportFieldGroupDto[] = [];
    for (const [groupName, groupFields] of groupMap) {
      groups.push({
        groupName,
        fields: groupFields,
      });
    }

    // Sort groups in a logical order
    groups.sort((a, b) => {
      const aIndex = FIELD_GROUP_ORDER.indexOf(a.groupName);
      const bIndex = FIELD_GROUP_ORDER.indexOf(b.groupName);
      if (aIndex === -1 && bIndex === -1)
        return a.groupName.localeCompare(b.groupName);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return groups;
  }

  /**
   * Get static fields for an entity type from the hardcoded registry.
   */
  private getStaticFields(entityType: ReportEntityType): ReportFieldDto[] {
    const registry = ENTITY_FIELD_REGISTRIES[entityType];
    if (!registry) {
      this.logger.warn(
        `No field registry found for entity type: ${entityType}`,
      );
      return [];
    }

    return registry.map((def) => this.fieldDefinitionToDto(def));
  }

  /**
   * Convert internal field definition to DTO.
   */
  private fieldDefinitionToDto(def: FieldDefinition): ReportFieldDto {
    return {
      id: def.id,
      label: def.label,
      type: def.type,
      group: def.group,
      prismaField: def.prismaField,
      filterable: def.filterable,
      sortable: def.sortable,
      groupable: def.groupable,
      aggregatable: def.aggregatable,
      enumValues: def.enumValues,
      isComputed: def.isComputed,
      isCustomProperty: def.isCustomProperty,
      joinPath: def.joinPath,
    };
  }

  /**
   * Get all supported entity types.
   */
  getSupportedEntityTypes(): ReportEntityType[] {
    return Object.keys(ENTITY_FIELD_REGISTRIES) as ReportEntityType[];
  }

  /**
   * Get field count for an entity type (including custom properties).
   */
  async getFieldCount(
    entityType: ReportEntityType,
    organizationId: string,
  ): Promise<number> {
    const fields = await this.getFieldsForEntityType(
      entityType,
      organizationId,
    );
    return fields.length;
  }

  /**
   * Validate that a list of field IDs are valid for an entity type.
   */
  async validateFields(
    entityType: ReportEntityType,
    organizationId: string,
    fieldIds: string[],
  ): Promise<{ valid: boolean; invalidFields: string[] }> {
    const fields = await this.getFieldsForEntityType(
      entityType,
      organizationId,
    );
    const validFieldIds = new Set(fields.map((f) => f.id));

    const invalidFields = fieldIds.filter((id) => !validFieldIds.has(id));

    return {
      valid: invalidFields.length === 0,
      invalidFields,
    };
  }

  /**
   * Get a single field definition by ID.
   */
  async getFieldById(
    entityType: ReportEntityType,
    organizationId: string,
    fieldId: string,
  ): Promise<ReportFieldDto | undefined> {
    const fields = await this.getFieldsForEntityType(
      entityType,
      organizationId,
    );
    return fields.find((f) => f.id === fieldId);
  }
}
