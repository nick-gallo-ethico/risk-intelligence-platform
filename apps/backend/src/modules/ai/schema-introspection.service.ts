import { Injectable, Logger } from '@nestjs/common';

/**
 * Field type for schema introspection.
 * Used to describe field characteristics for AI-powered querying.
 */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'enum'
  | 'relation'
  | 'json';

/**
 * Schema definition for a single field.
 * Describes the field's characteristics for AI query generation.
 */
export interface FieldSchema {
  /** Database/API field name */
  name: string;
  /** Field type for query building */
  type: FieldType;
  /** Human-readable label */
  displayName: string;
  /** Whether the field can be used in filters */
  filterable: boolean;
  /** Whether the field can be used for sorting */
  sortable?: boolean;
  /** Whether the field can be aggregated (sum, avg, count) */
  aggregatable?: boolean;
  /** Valid values for enum types */
  values?: string[];
  /** Description for AI context */
  description?: string;
}

/**
 * Schema definition for an entity.
 * Used by AI to understand queryable data structures.
 */
export interface EntitySchema {
  /** Entity identifier (e.g., 'disclosure', 'conflict') */
  name: string;
  /** Human-readable entity name */
  displayName: string;
  /** Description for AI context */
  description: string;
  /** Queryable fields */
  fields: FieldSchema[];
  /** Related entities */
  relations: string[];
}

/**
 * Result of filter validation.
 */
export interface FilterValidationResult {
  valid: boolean;
  errors: string[];
  normalizedFilter?: Record<string, unknown>;
}

/**
 * Valid filter operators for query building.
 */
export const FILTER_OPERATORS = [
  'eq', // equals
  'ne', // not equals
  'gt', // greater than
  'gte', // greater than or equal
  'lt', // less than
  'lte', // less than or equal
  'contains', // string contains
  'startsWith', // string starts with
  'endsWith', // string ends with
  'in', // value in array
  'notIn', // value not in array
  'isNull', // is null
  'isNotNull', // is not null
] as const;

export type FilterOperator = (typeof FILTER_OPERATORS)[number];

/**
 * SchemaIntrospectionService provides schema discovery for AI-powered features.
 *
 * This service enables AI agents and skills to:
 * - Discover queryable entities and their fields
 * - Understand field types and valid values
 * - Validate AI-generated filters against schema
 * - Generate schema documentation for prompts
 *
 * Used by:
 * - AiTriageService: Schema context for NL query interpretation
 * - UserTableService (09-12): Field selectors for table builder UI
 * - AI Skills: Understanding available data structures
 *
 * @example
 * ```typescript
 * // Get schema for AI prompt
 * const schema = service.getSchemaForPrompt(['disclosure', 'conflict']);
 *
 * // Validate AI-generated filter
 * const result = service.validateFilter('disclosure', { status: 'SUBMITTED' });
 * ```
 */
@Injectable()
export class SchemaIntrospectionService {
  private readonly logger = new Logger(SchemaIntrospectionService.name);

  /**
   * Get all queryable entities with their field schemas.
   * Organization ID can be used for future org-specific schema extensions.
   *
   * @param _organizationId - Organization context (for future customization)
   * @returns Array of entity schemas
   */
  getQueryableEntities(_organizationId?: string): EntitySchema[] {
    // Note: organizationId reserved for future org-specific custom fields
    return [
      this.getDisclosureSchema(),
      this.getConflictSchema(),
      this.getCampaignSchema(),
      this.getCampaignAssignmentSchema(),
    ];
  }

  /**
   * Get schema for a specific entity.
   *
   * @param entityName - Entity identifier
   * @param _organizationId - Organization context
   * @returns Entity schema or undefined if not found
   */
  getEntitySchema(
    entityName: string,
    _organizationId?: string,
  ): EntitySchema | undefined {
    const entities = this.getQueryableEntities(_organizationId);
    return entities.find((e) => e.name === entityName);
  }

  /**
   * Format schema for AI prompt injection.
   * Generates human-readable schema documentation for LLM context.
   *
   * @param entityTypes - Optional filter for specific entity types
   * @param organizationId - Organization context
   * @returns Formatted schema string for prompt injection
   */
  getSchemaForPrompt(entityTypes?: string[], organizationId?: string): string {
    const entities = this.getQueryableEntities(organizationId);
    const filtered = entityTypes
      ? entities.filter((e) => entityTypes.includes(e.name))
      : entities;

    return filtered
      .map((entity) => {
        const fieldDocs = entity.fields
          .map((f) => {
            let line = `- ${f.name} (${f.type}): ${f.displayName}`;
            if (f.values && f.values.length > 0) {
              line += ` [values: ${f.values.join(', ')}]`;
            }
            if (f.filterable) line += ' [filterable]';
            if (f.sortable) line += ' [sortable]';
            if (f.aggregatable) line += ' [aggregatable]';
            return line;
          })
          .join('\n');

        const relationDocs =
          entity.relations.length > 0
            ? `\nRelations: ${entity.relations.join(', ')}`
            : '';

        return `## ${entity.displayName}\n${entity.description}\n\n${fieldDocs}${relationDocs}`;
      })
      .join('\n\n');
  }

  /**
   * Validate a filter object against entity schema.
   * Checks that fields exist, types match, and operators are valid.
   *
   * @param entityName - Entity to validate against
   * @param filter - Filter object to validate
   * @param organizationId - Organization context
   * @returns Validation result with errors if any
   */
  validateFilter(
    entityName: string,
    filter: Record<string, unknown>,
    organizationId?: string,
  ): FilterValidationResult {
    const entity = this.getEntitySchema(entityName, organizationId);
    if (!entity) {
      return {
        valid: false,
        errors: [`Unknown entity: ${entityName}`],
      };
    }

    const errors: string[] = [];
    const normalizedFilter: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(filter)) {
      // Handle nested operators (e.g., { status: { eq: 'SUBMITTED' } })
      const [fieldName, operator] = this.parseFilterKey(key);
      const field = entity.fields.find((f) => f.name === fieldName);

      if (!field) {
        errors.push(`Unknown field: ${fieldName} on entity ${entityName}`);
        continue;
      }

      if (!field.filterable) {
        errors.push(`Field ${fieldName} is not filterable`);
        continue;
      }

      // Validate value type matches field type
      const typeError = this.validateFieldValue(field, value, operator);
      if (typeError) {
        errors.push(typeError);
        continue;
      }

      normalizedFilter[key] = value;
    }

    return {
      valid: errors.length === 0,
      errors,
      normalizedFilter: errors.length === 0 ? normalizedFilter : undefined,
    };
  }

  /**
   * Get list of valid actions for an entity.
   * Used by AI to understand what bulk operations are available.
   *
   * @param entityName - Entity identifier
   * @returns Array of valid action names
   */
  getValidActions(entityName: string): string[] {
    switch (entityName) {
      case 'disclosure':
        return ['approve', 'reject', 'request_info'];
      case 'conflict':
        return ['dismiss', 'escalate', 'resolve'];
      case 'campaignAssignment':
        return ['remind', 'extend_deadline', 'reassign'];
      default:
        return [];
    }
  }

  /**
   * Get field names that can be used for sorting.
   *
   * @param entityName - Entity identifier
   * @param organizationId - Organization context
   * @returns Array of sortable field names
   */
  getSortableFields(entityName: string, organizationId?: string): string[] {
    const entity = this.getEntitySchema(entityName, organizationId);
    if (!entity) return [];
    return entity.fields.filter((f) => f.sortable).map((f) => f.name);
  }

  /**
   * Get field names that can be aggregated.
   *
   * @param entityName - Entity identifier
   * @param organizationId - Organization context
   * @returns Array of aggregatable field names
   */
  getAggregatableFields(
    entityName: string,
    organizationId?: string,
  ): string[] {
    const entity = this.getEntitySchema(entityName, organizationId);
    if (!entity) return [];
    return entity.fields.filter((f) => f.aggregatable).map((f) => f.name);
  }

  // ===========================================
  // Private: Entity Schema Definitions
  // ===========================================

  private getDisclosureSchema(): EntitySchema {
    return {
      name: 'disclosure',
      displayName: 'Disclosures',
      description:
        'Employee disclosure submissions including conflicts of interest, gifts, outside employment, etc.',
      fields: [
        {
          name: 'id',
          type: 'string',
          displayName: 'ID',
          filterable: true,
          sortable: false,
        },
        {
          name: 'referenceNumber',
          type: 'string',
          displayName: 'Reference Number',
          filterable: true,
          sortable: true,
        },
        {
          name: 'status',
          type: 'enum',
          displayName: 'Status',
          filterable: true,
          sortable: true,
          values: [
            'DRAFT',
            'SUBMITTED',
            'UNDER_REVIEW',
            'APPROVED',
            'REJECTED',
          ],
          description: 'Current processing status of the disclosure',
        },
        {
          name: 'disclosureType',
          type: 'enum',
          displayName: 'Disclosure Type',
          filterable: true,
          sortable: true,
          values: [
            'COI',
            'GIFT',
            'OUTSIDE_EMPLOYMENT',
            'POLITICAL',
            'CHARITABLE',
            'RELATIONSHIP',
          ],
          description: 'Category of disclosure',
        },
        {
          name: 'disclosureValue',
          type: 'number',
          displayName: 'Value',
          filterable: true,
          sortable: true,
          aggregatable: true,
          description: 'Monetary value in reporting currency',
        },
        {
          name: 'disclosureCurrency',
          type: 'string',
          displayName: 'Currency',
          filterable: true,
          sortable: false,
          description: 'ISO currency code (e.g., USD, EUR)',
        },
        {
          name: 'estimatedAnnualValue',
          type: 'number',
          displayName: 'Estimated Annual Value',
          filterable: true,
          sortable: true,
          aggregatable: true,
        },
        {
          name: 'thresholdTriggered',
          type: 'boolean',
          displayName: 'Threshold Triggered',
          filterable: true,
          description: 'Whether any threshold rules were triggered',
        },
        {
          name: 'conflictDetected',
          type: 'boolean',
          displayName: 'Conflict Detected',
          filterable: true,
          description: 'Whether any conflicts were detected',
        },
        {
          name: 'relatedCompany',
          type: 'string',
          displayName: 'Related Company',
          filterable: true,
          sortable: true,
          description: 'Name of related external entity',
        },
        {
          name: 'relatedPersonName',
          type: 'string',
          displayName: 'Related Person',
          filterable: true,
          sortable: true,
          description: 'Name of related individual',
        },
        {
          name: 'relationshipType',
          type: 'string',
          displayName: 'Relationship Type',
          filterable: true,
          description: 'Type of relationship (e.g., spouse, sibling, friend)',
        },
        {
          name: 'effectiveDate',
          type: 'datetime',
          displayName: 'Effective Date',
          filterable: true,
          sortable: true,
          description: 'When the disclosed interest/activity began',
        },
        {
          name: 'expirationDate',
          type: 'datetime',
          displayName: 'Expiration Date',
          filterable: true,
          sortable: true,
          description: 'When the disclosed interest/activity ends',
        },
        {
          name: 'submittedAt',
          type: 'datetime',
          displayName: 'Submitted Date',
          filterable: true,
          sortable: true,
        },
        {
          name: 'createdAt',
          type: 'datetime',
          displayName: 'Created Date',
          filterable: true,
          sortable: true,
        },
        {
          name: 'submittedById',
          type: 'relation',
          displayName: 'Submitted By',
          filterable: true,
          sortable: true,
          description: 'Employee who submitted the disclosure',
        },
        {
          name: 'campaignId',
          type: 'relation',
          displayName: 'Campaign',
          filterable: true,
          description: 'Campaign the disclosure was submitted for',
        },
      ],
      relations: ['submitter', 'campaign', 'conflicts', 'reviews'],
    };
  }

  private getConflictSchema(): EntitySchema {
    return {
      name: 'conflict',
      displayName: 'Conflict Alerts',
      description:
        'Detected potential conflicts on disclosures requiring review.',
      fields: [
        {
          name: 'id',
          type: 'string',
          displayName: 'ID',
          filterable: true,
          sortable: false,
        },
        {
          name: 'conflictType',
          type: 'enum',
          displayName: 'Conflict Type',
          filterable: true,
          sortable: true,
          values: [
            'VENDOR_MATCH',
            'APPROVAL_AUTHORITY',
            'PRIOR_CASE_HISTORY',
            'HRIS_MATCH',
            'GIFT_AGGREGATE',
            'RELATIONSHIP_PATTERN',
            'SELF_DEALING',
          ],
          description: 'Category of detected conflict',
        },
        {
          name: 'severity',
          type: 'enum',
          displayName: 'Severity',
          filterable: true,
          sortable: true,
          values: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          description: 'Risk level of the conflict',
        },
        {
          name: 'status',
          type: 'enum',
          displayName: 'Status',
          filterable: true,
          sortable: true,
          values: ['OPEN', 'DISMISSED', 'ESCALATED', 'RESOLVED'],
          description: 'Current review status',
        },
        {
          name: 'matchedEntity',
          type: 'string',
          displayName: 'Matched Entity',
          filterable: true,
          sortable: true,
          description: 'Name of the entity that triggered the match',
        },
        {
          name: 'matchConfidence',
          type: 'number',
          displayName: 'Match Confidence',
          filterable: true,
          sortable: true,
          aggregatable: true,
          description: 'Confidence score 0-100',
        },
        {
          name: 'summary',
          type: 'string',
          displayName: 'Summary',
          filterable: false,
          sortable: false,
          description: 'Human-readable summary of the conflict',
        },
        {
          name: 'dismissedCategory',
          type: 'enum',
          displayName: 'Dismissal Category',
          filterable: true,
          values: [
            'FALSE_MATCH_DIFFERENT_ENTITY',
            'FALSE_MATCH_NAME_COLLISION',
            'ALREADY_REVIEWED',
            'PRE_APPROVED_EXCEPTION',
            'BELOW_THRESHOLD',
            'OTHER',
          ],
          description: 'Why the conflict was dismissed',
        },
        {
          name: 'createdAt',
          type: 'datetime',
          displayName: 'Detected Date',
          filterable: true,
          sortable: true,
        },
        {
          name: 'dismissedAt',
          type: 'datetime',
          displayName: 'Dismissed Date',
          filterable: true,
          sortable: true,
        },
        {
          name: 'disclosureId',
          type: 'relation',
          displayName: 'Disclosure',
          filterable: true,
          description: 'Source disclosure',
        },
        {
          name: 'escalatedToCaseId',
          type: 'relation',
          displayName: 'Escalated Case',
          filterable: true,
          description: 'Case created from escalation',
        },
      ],
      relations: ['disclosure', 'escalatedCase', 'exclusion'],
    };
  }

  private getCampaignSchema(): EntitySchema {
    return {
      name: 'campaign',
      displayName: 'Campaigns',
      description:
        'Disclosure campaigns for collecting employee certifications.',
      fields: [
        {
          name: 'id',
          type: 'string',
          displayName: 'ID',
          filterable: true,
          sortable: false,
        },
        {
          name: 'name',
          type: 'string',
          displayName: 'Campaign Name',
          filterable: true,
          sortable: true,
        },
        {
          name: 'campaignType',
          type: 'enum',
          displayName: 'Campaign Type',
          filterable: true,
          values: [
            'DISCLOSURE',
            'ATTESTATION',
            'SURVEY',
            'TRAINING_ACKNOWLEDGMENT',
          ],
        },
        {
          name: 'status',
          type: 'enum',
          displayName: 'Status',
          filterable: true,
          sortable: true,
          values: ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED'],
        },
        {
          name: 'startDate',
          type: 'datetime',
          displayName: 'Start Date',
          filterable: true,
          sortable: true,
        },
        {
          name: 'endDate',
          type: 'datetime',
          displayName: 'End Date',
          filterable: true,
          sortable: true,
        },
        {
          name: 'targetCount',
          type: 'number',
          displayName: 'Target Count',
          filterable: true,
          sortable: true,
          aggregatable: true,
        },
        {
          name: 'completedCount',
          type: 'number',
          displayName: 'Completed Count',
          filterable: true,
          sortable: true,
          aggregatable: true,
        },
        {
          name: 'completionRate',
          type: 'number',
          displayName: 'Completion Rate',
          filterable: true,
          sortable: true,
          aggregatable: true,
          description: 'Percentage of completed assignments',
        },
        {
          name: 'createdAt',
          type: 'datetime',
          displayName: 'Created Date',
          filterable: true,
          sortable: true,
        },
      ],
      relations: ['assignments', 'formTemplate', 'segment'],
    };
  }

  private getCampaignAssignmentSchema(): EntitySchema {
    return {
      name: 'campaignAssignment',
      displayName: 'Campaign Assignments',
      description: 'Individual employee assignments within campaigns.',
      fields: [
        {
          name: 'id',
          type: 'string',
          displayName: 'ID',
          filterable: true,
          sortable: false,
        },
        {
          name: 'status',
          type: 'enum',
          displayName: 'Status',
          filterable: true,
          sortable: true,
          values: [
            'PENDING',
            'SENT',
            'STARTED',
            'COMPLETED',
            'OVERDUE',
            'EXEMPTED',
          ],
        },
        {
          name: 'dueDate',
          type: 'datetime',
          displayName: 'Due Date',
          filterable: true,
          sortable: true,
        },
        {
          name: 'completedAt',
          type: 'datetime',
          displayName: 'Completed Date',
          filterable: true,
          sortable: true,
        },
        {
          name: 'sentAt',
          type: 'datetime',
          displayName: 'Sent Date',
          filterable: true,
          sortable: true,
        },
        {
          name: 'reminderCount',
          type: 'number',
          displayName: 'Reminder Count',
          filterable: true,
          sortable: true,
          aggregatable: true,
        },
        {
          name: 'lastReminderAt',
          type: 'datetime',
          displayName: 'Last Reminder',
          filterable: true,
          sortable: true,
        },
        {
          name: 'employeeId',
          type: 'relation',
          displayName: 'Employee',
          filterable: true,
        },
        {
          name: 'campaignId',
          type: 'relation',
          displayName: 'Campaign',
          filterable: true,
        },
      ],
      relations: ['employee', 'campaign', 'disclosure'],
    };
  }

  // ===========================================
  // Private: Validation Helpers
  // ===========================================

  private parseFilterKey(key: string): [string, FilterOperator | null] {
    // Support both dot notation (status.eq) and underscore (status_eq)
    const dotMatch = key.match(/^(.+)\.(\w+)$/);
    if (dotMatch) {
      const operator = dotMatch[2] as FilterOperator;
      if (FILTER_OPERATORS.includes(operator)) {
        return [dotMatch[1], operator];
      }
    }

    const underscoreMatch = key.match(/^(.+)_(\w+)$/);
    if (underscoreMatch) {
      const operator = underscoreMatch[2] as FilterOperator;
      if (FILTER_OPERATORS.includes(operator)) {
        return [underscoreMatch[1], operator];
      }
    }

    // No operator specified, assume equality
    return [key, null];
  }

  private validateFieldValue(
    field: FieldSchema,
    value: unknown,
    _operator: FilterOperator | null,
  ): string | null {
    // Null checks for isNull/isNotNull operators
    if (value === null) {
      return null; // Valid for null checks
    }

    switch (field.type) {
      case 'string':
      case 'relation':
        if (typeof value !== 'string' && !Array.isArray(value)) {
          return `Field ${field.name} expects string, got ${typeof value}`;
        }
        break;

      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          return `Field ${field.name} expects number, got ${typeof value}`;
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          return `Field ${field.name} expects boolean, got ${typeof value}`;
        }
        break;

      case 'datetime':
        if (typeof value === 'string') {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return `Field ${field.name} expects valid date, got invalid date string`;
          }
        } else if (!(value instanceof Date)) {
          return `Field ${field.name} expects date, got ${typeof value}`;
        }
        break;

      case 'enum':
        if (field.values && !field.values.includes(String(value))) {
          if (Array.isArray(value)) {
            const invalid = value.filter((v) => !field.values!.includes(String(v)));
            if (invalid.length > 0) {
              return `Field ${field.name} has invalid enum values: ${invalid.join(', ')}. Valid: ${field.values.join(', ')}`;
            }
          } else {
            return `Field ${field.name} has invalid enum value: ${value}. Valid: ${field.values.join(', ')}`;
          }
        }
        break;

      case 'json':
        // JSON fields accept any structure
        break;
    }

    return null;
  }
}
