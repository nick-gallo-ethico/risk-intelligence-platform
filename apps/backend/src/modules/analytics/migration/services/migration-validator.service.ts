import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { MigrationJobStatus } from "@prisma/client";
import {
  FieldMappingDto,
  TransformFunction,
  ValidationError,
  PreviewRow,
} from "../dto/migration.dto";
import { MigrationParserService } from "./migration-parser.service";

// Max rows for preview
const PREVIEW_LIMIT = 10;

// Max validation errors to store
const MAX_VALIDATION_ERRORS = 1000;

/**
 * MigrationValidatorService handles row validation, error collection, and preview generation.
 *
 * Responsibilities:
 * - Validate individual rows against field mappings
 * - Check required fields and field types
 * - Validate transform functions
 * - Collect and aggregate validation errors
 * - Generate preview rows with transformed data
 *
 * This service extracts validation-related logic from MigrationService
 * to follow the thin coordinator pattern.
 */
@Injectable()
export class MigrationValidatorService {
  private readonly logger = new Logger(MigrationValidatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parserService: MigrationParserService,
  ) {}

  // Validation

  /**
   * Validate all data rows against field mappings.
   * Updates job status with validation progress.
   *
   * @param organizationId - Tenant organization ID
   * @param jobId - Migration job ID
   * @param data - Array of data rows to validate
   * @param mappings - Field mappings to validate against
   * @returns Validation results with error counts and details
   */
  async validateJob(
    organizationId: string,
    jobId: string,
    data: Record<string, unknown>[],
    mappings: FieldMappingDto[],
  ): Promise<{
    validRows: number;
    errorRows: number;
    errors: ValidationError[];
  }> {
    const errors: ValidationError[] = [];
    let validRows = 0;
    let errorRows = 0;

    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: MigrationJobStatus.VALIDATING,
        currentStep: "Validating data",
        progress: 0,
      },
    });

    // Validate each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowErrors = this.validateRow(row, mappings, i + 1);

      if (rowErrors.length > 0) {
        errorRows++;
        if (errors.length < MAX_VALIDATION_ERRORS) {
          errors.push(...rowErrors);
        }
      } else {
        validRows++;
      }

      // Update progress every 100 rows
      if (i % 100 === 0) {
        const progress = Math.round((i / data.length) * 100);
        await this.prisma.migrationJob.update({
          where: { id: jobId },
          data: {
            progress,
            currentStep: `Validating row ${i + 1} of ${data.length}`,
          },
        });
      }
    }

    // Update job with validation results
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        validRows,
        errorRows,
        validationErrors: JSON.parse(JSON.stringify(errors)),
        status: MigrationJobStatus.PREVIEW,
        currentStep: "Validation complete",
        progress: 100,
      },
    });

    this.logger.log(
      `Validation complete for job ${jobId}: ${validRows} valid, ${errorRows} errors`,
    );

    return { validRows, errorRows, errors };
  }

  /**
   * Validate a single row against field mappings.
   *
   * @param row - Data row to validate
   * @param mappings - Field mappings to validate against
   * @param rowNumber - Row number for error reporting
   * @returns Array of validation errors for this row
   */
  validateRow(
    row: Record<string, unknown>,
    mappings: FieldMappingDto[],
    rowNumber: number,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const mapping of mappings) {
      const value = row[mapping.sourceField];

      // Check required fields
      const requiredError = this.validateRequiredField(
        value,
        mapping,
        rowNumber,
      );
      if (requiredError) {
        errors.push(requiredError);
        continue;
      }

      // Skip validation for empty optional fields
      if (value === null || value === undefined || value === "") {
        continue;
      }

      // Validate based on transform function
      if (mapping.transformFunction) {
        const transformError = this.validateTransform(
          value,
          mapping.transformFunction,
          rowNumber,
          mapping.sourceField,
        );
        if (transformError) {
          errors.push(transformError);
        }
      }
    }

    return errors;
  }

  /**
   * Validate that required fields are present.
   *
   * @param value - Field value
   * @param mapping - Field mapping with required flag
   * @param rowNumber - Row number for error reporting
   * @returns Validation error if required field is missing
   */
  validateRequiredField(
    value: unknown,
    mapping: FieldMappingDto,
    rowNumber: number,
  ): ValidationError | null {
    if (
      mapping.isRequired &&
      (value === null || value === undefined || value === "")
    ) {
      return {
        rowNumber,
        field: mapping.sourceField,
        value,
        error: "Required field is empty",
        severity: "error",
      };
    }
    return null;
  }

  /**
   * Validate field types based on target field expectations.
   *
   * @param value - Field value
   * @param expectedType - Expected data type
   * @param rowNumber - Row number for error reporting
   * @param field - Field name for error reporting
   * @returns Validation error if type is invalid
   */
  validateFieldType(
    value: unknown,
    expectedType: "string" | "number" | "date" | "boolean" | "array",
    rowNumber: number,
    field: string,
  ): ValidationError | null {
    if (value === null || value === undefined || value === "") {
      return null; // Empty values are handled by required check
    }

    const strValue = String(value);

    switch (expectedType) {
      case "number":
        if (isNaN(Number(strValue.replace(/[^0-9.-]/g, "")))) {
          return {
            rowNumber,
            field,
            value,
            error: `Invalid number: ${value}`,
            severity: "error",
          };
        }
        break;

      case "date":
        const date = new Date(strValue);
        if (isNaN(date.getTime())) {
          return {
            rowNumber,
            field,
            value,
            error: `Invalid date: ${value}`,
            severity: "error",
          };
        }
        break;

      case "boolean":
        const boolStr = strValue.toLowerCase().trim();
        if (
          !["yes", "no", "true", "false", "1", "0", "y", "n"].includes(boolStr)
        ) {
          return {
            rowNumber,
            field,
            value,
            error: `Invalid boolean: ${value}`,
            severity: "warning",
          };
        }
        break;
    }

    return null;
  }

  /**
   * Validate foreign key references exist.
   *
   * @param row - Data row containing foreign key values
   * @param targetEntity - Target entity type
   * @param orgId - Organization ID for lookups
   * @returns Array of validation errors for missing references
   */
  async validateForeignKeys(
    row: Record<string, unknown>,
    targetEntity: string,
    orgId: string,
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Validate category reference if present
    const categoryName = row["categoryName"];
    if (categoryName && typeof categoryName === "string") {
      const category = await this.prisma.category.findFirst({
        where: {
          organizationId: orgId,
          name: categoryName,
        },
      });

      if (!category) {
        errors.push({
          rowNumber: 0, // Caller should update this
          field: "categoryName",
          value: categoryName,
          error: `Category not found: ${categoryName}`,
          severity: "warning",
        });
      }
    }

    // Validate location reference if present
    const locationName = row["locationName"];
    if (locationName && typeof locationName === "string") {
      const location = await this.prisma.businessUnit.findFirst({
        where: {
          organizationId: orgId,
          name: locationName,
        },
      });

      if (!location) {
        errors.push({
          rowNumber: 0,
          field: "locationName",
          value: locationName,
          error: `Location not found: ${locationName}`,
          severity: "warning",
        });
      }
    }

    return errors;
  }

  /**
   * Collect and aggregate validation errors.
   *
   * @param errors - Array of validation errors to aggregate
   * @returns Aggregated error summary
   */
  collectErrors(errors: ValidationError[]): {
    byField: Record<string, number>;
    bySeverity: Record<string, number>;
    totalErrors: number;
    totalWarnings: number;
  } {
    const byField: Record<string, number> = {};
    const bySeverity: Record<string, number> = { error: 0, warning: 0 };

    for (const error of errors) {
      byField[error.field] = (byField[error.field] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    }

    return {
      byField,
      bySeverity,
      totalErrors: bySeverity["error"] || 0,
      totalWarnings: bySeverity["warning"] || 0,
    };
  }

  // Preview Generation

  /**
   * Generate preview rows with transformed data.
   *
   * @param organizationId - Tenant organization ID
   * @param jobId - Migration job ID
   * @param data - Array of data rows
   * @param mappings - Field mappings for transformation
   * @param limit - Maximum number of preview rows
   * @returns Array of preview rows with transformed data
   */
  async getPreview(
    organizationId: string,
    jobId: string,
    data: Record<string, unknown>[],
    mappings: FieldMappingDto[],
    limit: number = PREVIEW_LIMIT,
  ): Promise<PreviewRow[]> {
    const previewRows: PreviewRow[] = [];

    // Generate preview for first N rows
    const sampleData = data.slice(0, limit);

    for (let i = 0; i < sampleData.length; i++) {
      const row = sampleData[i];
      const transformedData = this.parserService.applyFieldMapping(
        row,
        mappings,
      );
      const rowErrors = this.validateRow(row, mappings, i + 1);

      previewRows.push({
        rowNumber: i + 1,
        sourceData: row,
        transformedData,
        issues: rowErrors.map((e) => `${e.field}: ${e.error}`),
      });
    }

    // Save preview data to job
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        previewData: JSON.parse(JSON.stringify(previewRows)),
      },
    });

    this.logger.log(
      `Generated ${previewRows.length} preview rows for job ${jobId}`,
    );

    return previewRows;
  }

  // Private Helpers

  /**
   * Validate a value for a specific transform function.
   */
  private validateTransform(
    value: unknown,
    transform: TransformFunction,
    rowNumber: number,
    field: string,
  ): ValidationError | null {
    switch (transform) {
      case TransformFunction.PARSE_DATE:
      case TransformFunction.PARSE_DATE_US:
      case TransformFunction.PARSE_DATE_EU:
      case TransformFunction.PARSE_DATE_ISO:
        const dateValue = this.parseDate(String(value), transform);
        if (dateValue === null) {
          return {
            rowNumber,
            field,
            value,
            error: `Invalid date format: ${value}`,
            severity: "error",
          };
        }
        break;

      case TransformFunction.PARSE_NUMBER:
        if (isNaN(Number(value))) {
          return {
            rowNumber,
            field,
            value,
            error: `Invalid number: ${value}`,
            severity: "error",
          };
        }
        break;

      case TransformFunction.EXTRACT_EMAIL:
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        if (!emailRegex.test(String(value))) {
          return {
            rowNumber,
            field,
            value,
            error: `No valid email found in: ${value}`,
            severity: "warning",
          };
        }
        break;
    }

    return null;
  }

  /**
   * Parse a date string for validation.
   */
  private parseDate(value: string, format: TransformFunction): Date | null {
    try {
      const trimmed = value.trim();

      switch (format) {
        case TransformFunction.PARSE_DATE_US: {
          // MM/DD/YYYY
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
          // DD/MM/YYYY
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
          // YYYY-MM-DD
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
          // Auto-detect
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
}
