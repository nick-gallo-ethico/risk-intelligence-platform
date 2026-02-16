import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { MigrationSourceType, MigrationJobStatus } from "@prisma/client";
import {
  FieldMappingDto,
  TransformFunction,
  TargetEntityType,
  FormatDetectionResponseDto,
  PreviewRow,
} from "../dto/migration.dto";
import {
  getFieldMappingHints,
  TARGET_FIELDS,
} from "../entities/migration.entity";
import { FormatDetectorService } from "./format-detector.service";
import { MappingGeneratorService } from "./mapping-generator.service";
import { TransformApplierService } from "./transform-applier.service";

/**
 * MigrationParserService handles file parsing, format detection, and field mapping.
 *
 * Architecture: Thin coordinator delegating to:
 * - FormatDetectorService: File format and source type detection
 * - MappingGeneratorService: Field mapping generation and validation
 * - TransformApplierService: Value transformation application
 *
 * Responsibilities:
 * - Orchestrate format detection and mapping generation workflow
 * - Persist mapping state to database
 * - Apply field mappings to transform data rows
 */
@Injectable()
export class MigrationParserService {
  private readonly logger = new Logger(MigrationParserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly formatDetector: FormatDetectorService,
    private readonly mappingGenerator: MappingGeneratorService,
    private readonly transformApplier: TransformApplierService,
  ) {}

  /**
   * Detect file format and suggest field mappings.
   * Updates job status and stores detection results.
   */
  async detectFormat(
    organizationId: string,
    jobId: string,
    job: { sourceType: MigrationSourceType },
    fileContent: Record<string, unknown>[],
  ): Promise<FormatDetectionResponseDto> {
    // Update job status to validating
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: MigrationJobStatus.VALIDATING,
        currentStep: "Detecting file format",
      },
    });

    // Detect fields from first row
    const detectedFields =
      fileContent.length > 0 ? Object.keys(fileContent[0]) : [];

    // Get sample rows for preview
    const sampleRows = fileContent.slice(0, 5);

    // Get suggested mappings
    const suggestedMappings = this.mappingGenerator.generateMappingsFromContent(
      detectedFields,
      job.sourceType,
      fileContent,
    );

    // Calculate confidence
    const matchedCount = suggestedMappings.filter((m) => m.targetField).length;
    const confidence =
      detectedFields.length > 0
        ? Math.round((matchedCount / detectedFields.length) * 100)
        : 0;

    // Update job with total rows and status
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        totalRows: fileContent.length,
        status: MigrationJobStatus.MAPPING,
        currentStep: "Awaiting field mapping",
      },
    });

    this.logger.log(
      `Format detected for job ${jobId}: ${detectedFields.length} fields, ${confidence}% confidence`,
    );

    return {
      sourceType: job.sourceType,
      confidence,
      detectedFields,
      sampleRows,
      suggestedMappings,
    };
  }

  /**
   * Detect source type from headers.
   */
  detectSourceType(
    headers: string[],
    sampleRows?: Record<string, unknown>[],
  ): MigrationSourceType {
    return this.formatDetector.detectSourceType(headers, sampleRows);
  }

  /**
   * Detect CSV delimiter from content.
   */
  detectDelimiter(content: string): string {
    return this.formatDetector.detectDelimiter(content);
  }

  /**
   * Detect file encoding from buffer.
   */
  detectEncoding(buffer: Buffer): string {
    return this.formatDetector.detectEncoding(buffer);
  }

  /**
   * Generate suggested field mappings.
   */
  generateSuggestedMappings(
    sourceFields: string[],
    hints: Record<
      string,
      { targetField: string; targetEntity: TargetEntityType }
    >,
    sourceType: MigrationSourceType,
  ): FieldMappingDto[] {
    return this.mappingGenerator.generateSuggestedMappings(
      sourceFields,
      hints,
      sourceType,
    );
  }

  /**
   * Generate AI-assisted field mapping suggestions.
   */
  async generateFieldSuggestions(
    sourceHeaders: string[],
    targetEntity: TargetEntityType,
    sampleData?: Record<string, unknown>[],
  ): Promise<FieldMappingDto[]> {
    return this.mappingGenerator.generateFieldSuggestions(
      sourceHeaders,
      targetEntity,
      sampleData,
    );
  }

  /**
   * Apply field mapping to transform a row.
   */
  applyFieldMapping(
    row: Record<string, unknown>,
    mappings: FieldMappingDto[],
  ): PreviewRow["transformedData"] {
    const result: PreviewRow["transformedData"] = {
      case: {},
      riu: {},
      person: {},
      investigation: {},
    };

    for (const mapping of mappings) {
      if (!mapping.targetField) continue;

      let value = row[mapping.sourceField];

      // Apply transform if specified
      if (mapping.transformFunction && value !== null && value !== undefined) {
        value = this.transformApplier.applyTransform(
          value,
          mapping.transformFunction,
          mapping.transformParams,
        );
      }

      // Apply default value if empty
      if (
        (value === null || value === undefined || value === "") &&
        mapping.defaultValue !== undefined
      ) {
        value = mapping.defaultValue;
      }

      // Skip if still empty
      if (value === null || value === undefined || value === "") continue;

      // Add to appropriate entity
      switch (mapping.targetEntity) {
        case TargetEntityType.CASE:
          result.case![mapping.targetField] = value;
          break;
        case TargetEntityType.RIU:
          result.riu![mapping.targetField] = value;
          break;
        case TargetEntityType.PERSON:
          result.person![mapping.targetField] = value;
          break;
        case TargetEntityType.INVESTIGATION:
          result.investigation![mapping.targetField] = value;
          break;
      }
    }

    return result;
  }

  /**
   * Validate mappings against target entity.
   */
  validateMapping(
    mappings: FieldMappingDto[],
    targetEntity: TargetEntityType,
  ): string[] {
    return this.mappingGenerator.validateMappings(mappings, targetEntity);
  }

  /**
   * Save field mappings to the migration job.
   */
  async saveFieldMappings(
    organizationId: string,
    jobId: string,
    mappings: FieldMappingDto[],
  ): Promise<void> {
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        fieldMappings: JSON.parse(JSON.stringify(mappings)),
        status: MigrationJobStatus.MAPPING,
        currentStep: "Field mappings saved",
      },
    });

    this.logger.log(`Saved ${mappings.length} field mappings for job ${jobId}`);
  }

  /**
   * Parse a single row using the provided mappings.
   */
  parseRow(
    row: Record<string, unknown>,
    mappings: FieldMappingDto[],
    _transforms?: Record<string, TransformFunction>,
  ): PreviewRow["transformedData"] {
    return this.applyFieldMapping(row, mappings);
  }

  /**
   * Apply a transform function to a value.
   */
  applyTransform(
    value: unknown,
    transform: TransformFunction,
    params?: Record<string, unknown>,
  ): unknown {
    return this.transformApplier.applyTransform(value, transform, params);
  }

  /**
   * Normalize a value to the expected target type.
   */
  normalizeValue(
    value: unknown,
    targetType: "string" | "number" | "date" | "boolean" | "array",
  ): unknown {
    return this.transformApplier.normalizeValue(value, targetType);
  }
}
