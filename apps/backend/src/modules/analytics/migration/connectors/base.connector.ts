import csvParser from "csv-parser";
import { Readable } from "stream";
import { MigrationSourceType } from "@prisma/client";

/**
 * Result of format detection for a file
 */
export interface FormatDetectionResult {
  isValid: boolean;
  confidence: number; // 0-1
  detectedType: MigrationSourceType;
  sampleRows: Record<string, unknown>[];
  errors?: string[];
}

/**
 * Field transformation types
 */
export type FieldTransform =
  | { type: "uppercase" }
  | { type: "lowercase" }
  | { type: "trim" }
  | { type: "parseDate"; format: string }
  | { type: "parseNumber" }
  | { type: "parseBoolean" }
  | { type: "mapValue"; mappings: Record<string, unknown> }
  | { type: "concat"; separator: string; fields: string[] }
  | { type: "split"; separator: string; index: number }
  | { type: "extractEmail" }
  | { type: "extractPhone" }
  | { type: "default"; value: unknown };

/**
 * Target entity types for migration
 */
export type MigrationTargetEntity = "Case" | "RIU" | "Person" | "Investigation";

/**
 * Field mapping configuration for connectors
 * Note: Named ConnectorFieldMapping to avoid conflict with entity FieldMapping
 */
export interface ConnectorFieldMapping {
  sourceField: string;
  targetField: string;
  targetEntity: MigrationTargetEntity;
  isRequired: boolean;
  transform?: FieldTransform;
  defaultValue?: unknown;
  description?: string;
}

/**
 * Alias for backwards compatibility and convenience
 */
export type FieldMapping = ConnectorFieldMapping;

/**
 * Validation result for a single row
 */
export interface ValidationResult {
  isValid: boolean;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
}

/**
 * Case create input for migration
 */
export interface CaseCreateInput {
  referenceNumber?: string;
  status?: string;
  severity?: string;
  categoryName?: string;
  details?: string;
  summary?: string;
  locationName?: string;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
  intakeTimestamp?: Date;
  incidentDate?: Date; // Note: not on Case model, but may come from source data
  closedAt?: Date;
  outcome?: string;
  outcomeNotes?: string;
  reporterAnonymous?: boolean;
  reporterType?: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  customFields?: Record<string, unknown>;
}

/**
 * RIU create input for migration
 */
export interface RiuCreateInput {
  referenceNumber?: string;
  type?: string;
  details?: string;
  summary?: string;
  severity?: string;
  categoryName?: string;
  reporterType?: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  locationName?: string;
  isAnonymous?: boolean;
  customFields?: Record<string, unknown>;
}

/**
 * Person create input for migration
 */
export interface PersonCreateInput {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  employeeId?: string;
  jobTitle?: string;
  department?: string;
  location?: string;
  company?: string;
  relationship?: string;
  notes?: string;
}

/**
 * Investigation create input for migration
 */
export interface InvestigationCreateInput {
  investigationNumber?: string;
  status?: string;
  dueDate?: Date;
  primaryInvestigatorName?: string;
  findingsSummary?: string;
  findingsDetail?: string;
  outcome?: string;
  notes?: string;
}

/**
 * Transformed row output with entity data
 */
export interface TransformedRow {
  case?: Partial<CaseCreateInput>;
  riu?: Partial<RiuCreateInput>;
  person?: Partial<PersonCreateInput>;
  investigation?: Partial<InvestigationCreateInput>;
  issues: string[];
}

/**
 * Migration connector interface
 * Defines the contract for all migration connectors
 */
export interface MigrationConnector {
  readonly sourceType: MigrationSourceType;

  /**
   * Detect if the file matches this connector's format
   */
  detectFormat(buffer: Buffer): Promise<FormatDetectionResult>;

  /**
   * Get available fields from the file
   */
  getAvailableFields(buffer: Buffer): Promise<string[]>;

  /**
   * Get suggested field mappings based on connector knowledge
   */
  getSuggestedMappings(): FieldMapping[];

  /**
   * Validate a single row against mappings
   */
  validateRow(
    row: Record<string, string>,
    mappings: FieldMapping[],
  ): ValidationResult;

  /**
   * Transform a single row based on mappings
   */
  transformRow(
    row: Record<string, string>,
    mappings: FieldMapping[],
  ): TransformedRow;

  /**
   * Create an async iterator for streaming large files
   */
  createRowStream(buffer: Buffer): AsyncIterable<Record<string, string>>;
}

/**
 * Base migration connector providing common functionality
 * Concrete connectors extend this class
 */
export abstract class BaseMigrationConnector implements MigrationConnector {
  abstract readonly sourceType: MigrationSourceType;

  /**
   * Get suggested field mappings - must be implemented by subclasses
   */
  abstract getSuggestedMappings(): FieldMapping[];

  /**
   * Calculate confidence that headers match this connector's format
   * Must be implemented by subclasses
   */
  protected abstract calculateConfidence(headers: string[]): number;

  /**
   * Detect file format and calculate confidence
   */
  async detectFormat(buffer: Buffer): Promise<FormatDetectionResult> {
    const content = buffer.toString("utf-8").slice(0, 10000);
    const lines = content.split("\n");

    if (lines.length < 2) {
      return {
        isValid: false,
        confidence: 0,
        detectedType: this.sourceType,
        sampleRows: [],
        errors: ["File too short - needs at least header row and one data row"],
      };
    }

    const headers = this.parseHeaders(lines[0]);

    if (headers.length === 0) {
      return {
        isValid: false,
        confidence: 0,
        detectedType: this.sourceType,
        sampleRows: [],
        errors: ["No headers detected in file"],
      };
    }

    const sampleRows = await this.parseSampleRows(buffer, 5);
    const confidence = this.calculateConfidence(headers);

    return {
      isValid: confidence > 0.5,
      confidence,
      detectedType: this.sourceType,
      sampleRows,
    };
  }

  /**
   * Get available fields from file headers
   */
  async getAvailableFields(buffer: Buffer): Promise<string[]> {
    const content = buffer.toString("utf-8");
    const firstLine = content.split("\n")[0];
    return this.parseHeaders(firstLine);
  }

  /**
   * Validate a single row against field mappings
   */
  validateRow(
    row: Record<string, string>,
    mappings: FieldMapping[],
  ): ValidationResult {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    for (const mapping of mappings) {
      const value = row[mapping.sourceField];

      // Check required fields
      if (mapping.isRequired && (!value || value.trim() === "")) {
        errors.push({
          field: mapping.sourceField,
          message: "Required field is empty",
        });
        continue;
      }

      // Skip validation for empty optional fields
      if (!value || value.trim() === "") {
        continue;
      }

      // Validate based on transform type
      if (mapping.transform) {
        const validationError = this.validateTransform(
          value,
          mapping.transform,
        );
        if (validationError) {
          if (mapping.isRequired) {
            errors.push({
              field: mapping.sourceField,
              message: validationError,
            });
          } else {
            warnings.push({
              field: mapping.sourceField,
              message: validationError,
            });
          }
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Transform a single row based on field mappings
   */
  transformRow(
    row: Record<string, string>,
    mappings: FieldMapping[],
  ): TransformedRow {
    const result: TransformedRow = { issues: [] };

    for (const mapping of mappings) {
      if (!mapping.targetField) continue;

      let value: unknown = row[mapping.sourceField];

      // Apply transform if specified
      if (value && mapping.transform) {
        try {
          value = this.applyTransform(String(value), mapping.transform, row);
        } catch (error) {
          result.issues.push(
            `Transform failed for ${mapping.sourceField}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
          continue;
        }
      }

      // Use default if empty
      if (
        (value === null || value === undefined || value === "") &&
        mapping.defaultValue !== undefined
      ) {
        value = mapping.defaultValue;
      }

      // Skip if still empty
      if (value === null || value === undefined || value === "") continue;

      // Set on target entity
      this.setTargetField(
        result,
        mapping.targetEntity,
        mapping.targetField,
        value,
      );
    }

    return result;
  }

  /**
   * Create an async iterator for streaming CSV rows
   */
  async *createRowStream(
    buffer: Buffer,
  ): AsyncIterable<Record<string, string>> {
    const stream = Readable.from(buffer);
    const parser = stream.pipe(csvParser());

    for await (const row of parser) {
      yield row as Record<string, string>;
    }
  }

  /**
   * Parse CSV headers handling quoted values
   */
  protected parseHeaders(line: string): string[] {
    const headers: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        headers.push(current.trim().replace(/^"|"$/g, ""));
        current = "";
      } else if (char !== "\r") {
        current += char;
      }
    }

    // Add the last field
    if (current) {
      headers.push(current.trim().replace(/^"|"$/g, ""));
    }

    return headers.filter((h) => h.length > 0);
  }

  /**
   * Apply a field transform to a value
   */
  protected applyTransform(
    value: string,
    transform: FieldTransform,
    row: Record<string, string>,
  ): unknown {
    switch (transform.type) {
      case "uppercase":
        return value.toUpperCase();

      case "lowercase":
        return value.toLowerCase();

      case "trim":
        return value.trim();

      case "parseDate":
        return this.parseDate(value, transform.format);

      case "parseNumber":
        const num = parseFloat(value.replace(/[^0-9.-]/g, ""));
        if (isNaN(num)) throw new Error(`Invalid number: ${value}`);
        return num;

      case "parseBoolean":
        const lowered = value.toLowerCase().trim();
        return ["yes", "true", "1", "y"].includes(lowered);

      case "mapValue":
        return transform.mappings[value] ?? value;

      case "concat":
        return transform.fields
          .map((f) => row[f] || "")
          .join(transform.separator);

      case "split":
        const parts = value.split(transform.separator);
        return parts[transform.index] || "";

      case "extractEmail":
        const emailMatch = value.match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
        );
        return emailMatch ? emailMatch[0] : null;

      case "extractPhone":
        const phoneMatch = value.match(/[\d\-\(\)\s\.]+/);
        return phoneMatch ? phoneMatch[0].replace(/\D/g, "") : null;

      case "default":
        return value || transform.value;

      default:
        return value;
    }
  }

  /**
   * Validate a transform can be applied to a value
   */
  protected validateTransform(
    value: string,
    transform: FieldTransform,
  ): string | null {
    switch (transform.type) {
      case "parseDate": {
        try {
          this.parseDate(value, transform.format);
          return null;
        } catch {
          return `Invalid date format: expected ${transform.format}`;
        }
      }

      case "parseNumber": {
        const num = parseFloat(value.replace(/[^0-9.-]/g, ""));
        if (isNaN(num)) {
          return `Invalid number: ${value}`;
        }
        return null;
      }

      case "extractEmail": {
        const emailMatch = value.match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
        );
        if (!emailMatch) {
          return `No valid email found in: ${value}`;
        }
        return null;
      }

      default:
        return null;
    }
  }

  /**
   * Parse a date string with specified format
   */
  protected parseDate(value: string, format: string): Date {
    const trimmed = value.trim();

    switch (format) {
      case "MM/dd/yyyy":
      case "MM/DD/YYYY": {
        // US format: MM/DD/YYYY
        const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (match) {
          const date = new Date(
            parseInt(match[3]),
            parseInt(match[1]) - 1,
            parseInt(match[2]),
          );
          if (!isNaN(date.getTime())) return date;
        }
        break;
      }

      case "dd/MM/yyyy":
      case "DD/MM/YYYY": {
        // EU format: DD/MM/YYYY
        const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (match) {
          const date = new Date(
            parseInt(match[3]),
            parseInt(match[2]) - 1,
            parseInt(match[1]),
          );
          if (!isNaN(date.getTime())) return date;
        }
        break;
      }

      case "yyyy-MM-dd":
      case "YYYY-MM-DD": {
        // ISO format: YYYY-MM-DD
        const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
          const date = new Date(
            parseInt(match[1]),
            parseInt(match[2]) - 1,
            parseInt(match[3]),
          );
          if (!isNaN(date.getTime())) return date;
        }
        break;
      }

      default: {
        // Try auto-detection
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) return date;
      }
    }

    throw new Error(`Invalid date: ${value} (expected format: ${format})`);
  }

  /**
   * Set a field value on the appropriate target entity
   */
  private setTargetField(
    result: TransformedRow,
    entity: MigrationTargetEntity,
    field: string,
    value: unknown,
  ): void {
    const entityKey = entity.toLowerCase() as keyof Omit<
      TransformedRow,
      "issues"
    >;

    if (!result[entityKey]) {
      result[entityKey] = {};
    }

    // TypeScript needs help with dynamic property assignment
    (result[entityKey] as Record<string, unknown>)[field] = value;
  }

  /**
   * Parse sample rows from buffer for preview
   */
  private async parseSampleRows(
    buffer: Buffer,
    count: number,
  ): Promise<Record<string, unknown>[]> {
    const rows: Record<string, unknown>[] = [];

    try {
      for await (const row of this.createRowStream(buffer)) {
        rows.push(row);
        if (rows.length >= count) break;
      }
    } catch (error) {
      // Return what we have on parse error
    }

    return rows;
  }
}
