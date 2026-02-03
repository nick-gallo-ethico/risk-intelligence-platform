import { Injectable, Logger } from '@nestjs/common';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import ajvErrors from 'ajv-errors';
import {
  FormSchema,
  ValidationResult,
  ValidationError,
  ConditionalRule,
} from './types/form.types';

/**
 * FormValidationService provides JSON Schema validation using Ajv.
 * Used to validate form submissions against their schema definitions.
 *
 * Features:
 * - Standard JSON Schema 7 validation
 * - Custom formats (phone, currency)
 * - Conditional field requirements
 * - Schema meta-validation
 */
@Injectable()
export class FormValidationService {
  private readonly logger = new Logger(FormValidationService.name);
  private readonly ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true, // Report all errors, not just first
      coerceTypes: true, // Coerce string "123" to number 123
      removeAdditional: 'all', // Remove properties not in schema
      useDefaults: true, // Apply default values from schema
    });

    // Add standard formats (email, uri, date-time, etc.)
    addFormats(this.ajv);

    // Add custom error messages support
    ajvErrors(this.ajv);

    // Add custom formats for compliance forms
    this.addCustomFormats();
  }

  /**
   * Add custom formats specific to compliance forms.
   */
  private addCustomFormats(): void {
    // Phone number format (international)
    this.ajv.addFormat('phone', {
      type: 'string',
      validate: (value: string) => /^\+?[\d\s\-()]+$/.test(value),
    });

    // Currency format (decimal with optional cents)
    this.ajv.addFormat('currency', {
      type: 'string',
      validate: (value: string) => /^\d+(\.\d{1,2})?$/.test(value),
    });

    // Social Security Number format (redacted support)
    this.ajv.addFormat('ssn', {
      type: 'string',
      validate: (value: string) =>
        /^\d{3}-?\d{2}-?\d{4}$/.test(value) || /^\*{3}-?\*{2}-?\d{4}$/.test(value),
    });

    // Employee ID format (alphanumeric)
    this.ajv.addFormat('employee-id', {
      type: 'string',
      validate: (value: string) => /^[A-Za-z0-9-_]+$/.test(value),
    });
  }

  /**
   * Validate submission data against a JSON Schema.
   * Returns validation result with detailed errors.
   */
  validate(schema: FormSchema, data: Record<string, unknown>): ValidationResult {
    try {
      const validate = this.ajv.compile(schema);
      const dataCopy = JSON.parse(JSON.stringify(data)); // Clone to avoid mutation
      const valid = validate(dataCopy);

      if (valid) {
        return { valid: true, errors: [] };
      }

      const errors: ValidationError[] = (validate.errors || []).map((error) => ({
        field: this.formatFieldPath(error.instancePath, error.params),
        message: this.formatErrorMessage(error),
        keyword: error.keyword,
      }));

      return { valid: false, errors };
    } catch (error) {
      this.logger.error(`Validation error: ${error.message}`, error.stack);
      return {
        valid: false,
        errors: [
          {
            field: 'schema',
            message: 'Schema validation failed: ' + error.message,
            keyword: 'compile',
          },
        ],
      };
    }
  }

  /**
   * Validate the schema itself (meta-validation).
   * Ensures the schema is valid JSON Schema before saving.
   */
  validateSchema(schema: FormSchema): ValidationResult {
    try {
      this.ajv.compile(schema);
      return { valid: true, errors: [] };
    } catch (error) {
      this.logger.warn(`Invalid schema: ${error.message}`);
      return {
        valid: false,
        errors: [
          {
            field: 'schema',
            message: error.message,
            keyword: 'schema',
          },
        ],
      };
    }
  }

  /**
   * Apply conditional rules to determine effective required fields.
   * Modifies schema based on current data values.
   */
  applyConditionals(
    schema: FormSchema,
    data: Record<string, unknown>,
    conditionals: ConditionalRule[],
  ): FormSchema {
    const modified = JSON.parse(JSON.stringify(schema)) as FormSchema;
    const required = new Set<string>(
      Array.isArray(modified.required) ? modified.required : [],
    );

    for (const rule of conditionals) {
      if (this.evaluateCondition(rule.if, data)) {
        // Add required fields
        for (const field of rule.then.require || []) {
          required.add(field);
        }
        // Remove unrequired fields
        for (const field of rule.then.unrequire || []) {
          required.delete(field);
        }
      }
    }

    modified.required = Array.from(required);
    return modified;
  }

  /**
   * Evaluate a conditional rule's condition against data.
   */
  private evaluateCondition(
    condition: ConditionalRule['if'],
    data: Record<string, unknown>,
  ): boolean {
    const actualValue = this.getNestedValue(data, condition.field);
    const expectedValue = condition.value;
    const operator = condition.operator || 'eq';

    switch (operator) {
      case 'eq':
        return actualValue === expectedValue;
      case 'neq':
        return actualValue !== expectedValue;
      case 'gt':
        return Number(actualValue) > Number(expectedValue);
      case 'lt':
        return Number(actualValue) < Number(expectedValue);
      case 'gte':
        return Number(actualValue) >= Number(expectedValue);
      case 'lte':
        return Number(actualValue) <= Number(expectedValue);
      case 'contains':
        return String(actualValue).includes(String(expectedValue));
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
      default:
        return false;
    }
  }

  /**
   * Get nested value from object using dot notation.
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Format field path from Ajv error.
   */
  private formatFieldPath(
    instancePath: string,
    params?: Record<string, unknown>,
  ): string {
    // Handle missing property errors
    if (params?.missingProperty) {
      const basePath = instancePath.replace(/^\//, '').replace(/\//g, '.');
      const propertyPath = String(params.missingProperty);
      return basePath ? `${basePath}.${propertyPath}` : propertyPath;
    }

    // Convert /path/to/field to path.to.field
    const path = instancePath.replace(/^\//, '').replace(/\//g, '.');
    return path || 'root';
  }

  /**
   * Format error message for display.
   */
  private formatErrorMessage(error: {
    keyword: string;
    message?: string;
    params?: Record<string, unknown>;
  }): string {
    // Use custom message if available
    if (error.message) {
      return error.message;
    }

    // Generate message based on keyword
    switch (error.keyword) {
      case 'required':
        return `${error.params?.missingProperty || 'This field'} is required`;
      case 'type':
        return `Must be of type ${error.params?.type}`;
      case 'minLength':
        return `Must be at least ${error.params?.limit} characters`;
      case 'maxLength':
        return `Must be at most ${error.params?.limit} characters`;
      case 'minimum':
        return `Must be at least ${error.params?.limit}`;
      case 'maximum':
        return `Must be at most ${error.params?.limit}`;
      case 'pattern':
        return 'Invalid format';
      case 'format':
        return `Must be a valid ${error.params?.format}`;
      case 'enum':
        return `Must be one of: ${(error.params?.allowedValues as unknown[])?.join(', ')}`;
      default:
        return 'Validation failed';
    }
  }
}
