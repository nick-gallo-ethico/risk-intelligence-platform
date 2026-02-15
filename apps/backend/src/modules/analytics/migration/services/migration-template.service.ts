import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { MigrationSourceType } from "@prisma/client";
import { FieldMappingDto, TargetEntityType } from "../dto/migration.dto";
import { MigrationParserService } from "./migration-parser.service";

/**
 * MigrationTemplateService manages field mapping templates for data imports.
 *
 * Responsibilities:
 * - Save field mapping templates for reuse
 * - Load saved templates by source type
 * - Validate field mappings across all entity types
 *
 * This service extracts template management logic from MigrationService
 * to follow the thin coordinator pattern.
 */
@Injectable()
export class MigrationTemplateService {
  private readonly logger = new Logger(MigrationTemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly migrationParserService: MigrationParserService,
  ) {}

  /**
   * Load a saved field mapping template.
   *
   * @param organizationId - Tenant organization ID
   * @param sourceType - Migration source type (NAVEX, EQS, etc.)
   * @returns Array of saved field mappings, or empty array if no template exists
   */
  async loadTemplate(
    organizationId: string,
    sourceType: MigrationSourceType,
  ): Promise<FieldMappingDto[]> {
    const template = await this.prisma.migrationFieldTemplate.findFirst({
      where: { organizationId, sourceType },
      orderBy: { updatedAt: "desc" },
    });

    if (template) {
      this.logger.debug(
        `Loaded template for ${sourceType} with ${(template.mappings as unknown as FieldMappingDto[]).length} mappings`,
      );
    }

    return template ? (template.mappings as unknown as FieldMappingDto[]) : [];
  }

  /**
   * Save a field mapping template for reuse.
   *
   * @param organizationId - Tenant organization ID
   * @param sourceType - Migration source type
   * @param name - Template name
   * @param mappings - Field mappings to save
   * @param userId - User saving the template
   */
  async saveTemplate(
    organizationId: string,
    sourceType: MigrationSourceType,
    name: string,
    mappings: FieldMappingDto[],
    userId: string,
  ): Promise<void> {
    await this.prisma.migrationFieldTemplate.upsert({
      where: {
        organizationId_sourceType_name: {
          organizationId,
          sourceType,
          name,
        },
      },
      create: {
        organizationId,
        sourceType,
        name,
        mappings: JSON.parse(JSON.stringify(mappings)),
        createdById: userId,
      },
      update: { mappings: JSON.parse(JSON.stringify(mappings)) },
    });

    this.logger.log(
      `Saved template '${name}' for ${sourceType} with ${mappings.length} mappings`,
    );
  }

  /**
   * Validate field mappings across all entity types.
   *
   * @param mappings - Field mappings to validate
   * @returns Array of validation errors (empty if valid)
   */
  validateMappings(mappings: FieldMappingDto[]): string[] {
    return Object.values(TargetEntityType).flatMap((entityType) =>
      this.migrationParserService.validateMapping(
        mappings.filter((m) => m.targetEntity === entityType),
        entityType,
      ),
    );
  }

  /**
   * Validate mappings and throw if errors found.
   *
   * @param mappings - Field mappings to validate
   * @throws BadRequestException if validation errors exist
   */
  validateMappingsOrThrow(mappings: FieldMappingDto[]): void {
    const errors = this.validateMappings(mappings);
    if (errors.length > 0) {
      throw new BadRequestException(errors.join("; "));
    }
  }
}
