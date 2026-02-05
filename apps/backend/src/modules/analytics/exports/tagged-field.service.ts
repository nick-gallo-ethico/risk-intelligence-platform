import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Field tag types for controlling field inclusion in different export types.
 * These semantic tags categorize fields by their sensitivity and purpose.
 */
export enum FieldTag {
  AUDIT = 'AUDIT', // Required for compliance audits
  BOARD = 'BOARD', // Included in board reports
  PII = 'PII', // Contains personal information
  SENSITIVE = 'SENSITIVE', // Restricted access data
  EXTERNAL = 'EXTERNAL', // Safe for external sharing
  MIGRATION = 'MIGRATION', // Included in migration exports
}

/**
 * Platform field definition with semantic tags.
 * Each field represents a data point that can be included in exports.
 */
export interface TaggedField {
  /** Entity this field belongs to */
  entity: string;
  /** Field identifier */
  field: string;
  /** Human-readable label */
  label: string;
  /** Dot-notation path for value extraction (e.g., 'case.assignedTo.name') */
  path: string;
  /** Data type for formatting */
  type: 'string' | 'number' | 'date' | 'boolean' | 'json';
  /** Semantic tags controlling inclusion in exports */
  tags: FieldTag[];
  /** Optional description for admin UI */
  description?: string;
}

/**
 * Default platform field definitions with semantic tags.
 * These represent all exportable fields across the platform.
 */
const PLATFORM_FIELDS: TaggedField[] = [
  // Case fields
  {
    entity: 'Case',
    field: 'id',
    label: 'Case ID',
    path: 'case.id',
    type: 'string',
    tags: [FieldTag.AUDIT, FieldTag.BOARD, FieldTag.MIGRATION],
    description: 'Unique case identifier',
  },
  {
    entity: 'Case',
    field: 'referenceNumber',
    label: 'Reference #',
    path: 'case.referenceNumber',
    type: 'string',
    tags: [FieldTag.AUDIT, FieldTag.BOARD, FieldTag.EXTERNAL, FieldTag.MIGRATION],
    description: 'Human-readable case reference number',
  },
  {
    entity: 'Case',
    field: 'status',
    label: 'Status',
    path: 'case.status',
    type: 'string',
    tags: [FieldTag.AUDIT, FieldTag.BOARD, FieldTag.EXTERNAL, FieldTag.MIGRATION],
    description: 'Current case status',
  },
  {
    entity: 'Case',
    field: 'createdAt',
    label: 'Created Date',
    path: 'case.createdAt',
    type: 'date',
    tags: [FieldTag.AUDIT, FieldTag.BOARD, FieldTag.MIGRATION],
    description: 'Date case was created',
  },
  {
    entity: 'Case',
    field: 'closedAt',
    label: 'Closed Date',
    path: 'case.closedAt',
    type: 'date',
    tags: [FieldTag.AUDIT, FieldTag.BOARD, FieldTag.MIGRATION],
    description: 'Date case was closed',
  },
  {
    entity: 'Case',
    field: 'resolution',
    label: 'Resolution',
    path: 'case.resolution',
    type: 'string',
    tags: [FieldTag.AUDIT, FieldTag.BOARD],
    description: 'Case resolution outcome',
  },
  {
    entity: 'Case',
    field: 'assignedTo',
    label: 'Assigned To',
    path: 'case.assignedTo.name',
    type: 'string',
    tags: [FieldTag.AUDIT],
    description: 'Name of assigned investigator',
  },
  {
    entity: 'Case',
    field: 'priority',
    label: 'Priority',
    path: 'case.priority',
    type: 'string',
    tags: [FieldTag.AUDIT, FieldTag.BOARD, FieldTag.MIGRATION],
    description: 'Case priority level',
  },
  {
    entity: 'Case',
    field: 'daysOpen',
    label: 'Days Open',
    path: 'case.daysOpen',
    type: 'number',
    tags: [FieldTag.AUDIT, FieldTag.BOARD],
    description: 'Number of days case has been open',
  },

  // RIU fields
  {
    entity: 'RIU',
    field: 'id',
    label: 'RIU ID',
    path: 'riu.id',
    type: 'string',
    tags: [FieldTag.AUDIT, FieldTag.MIGRATION],
    description: 'Unique RIU identifier',
  },
  {
    entity: 'RIU',
    field: 'type',
    label: 'RIU Type',
    path: 'riu.type',
    type: 'string',
    tags: [FieldTag.AUDIT, FieldTag.BOARD, FieldTag.MIGRATION],
    description: 'Type of risk intelligence unit',
  },
  {
    entity: 'RIU',
    field: 'details',
    label: 'Description',
    path: 'riu.details',
    type: 'string',
    tags: [FieldTag.AUDIT, FieldTag.SENSITIVE, FieldTag.MIGRATION],
    description: 'Detailed description of the incident',
  },
  {
    entity: 'RIU',
    field: 'reporterType',
    label: 'Reporter Type',
    path: 'riu.reporterType',
    type: 'string',
    tags: [FieldTag.AUDIT, FieldTag.BOARD, FieldTag.MIGRATION],
    description: 'Type of reporter (anonymous, confidential, identified)',
  },
  {
    entity: 'RIU',
    field: 'categoryName',
    label: 'Category',
    path: 'riu.category.name',
    type: 'string',
    tags: [FieldTag.AUDIT, FieldTag.BOARD, FieldTag.EXTERNAL, FieldTag.MIGRATION],
    description: 'Incident category',
  },
  {
    entity: 'RIU',
    field: 'severity',
    label: 'Severity',
    path: 'riu.severity',
    type: 'string',
    tags: [FieldTag.AUDIT, FieldTag.BOARD, FieldTag.MIGRATION],
    description: 'Severity level',
  },
  {
    entity: 'RIU',
    field: 'incidentDate',
    label: 'Incident Date',
    path: 'riu.incidentDate',
    type: 'date',
    tags: [FieldTag.AUDIT, FieldTag.BOARD, FieldTag.MIGRATION],
    description: 'Date of the incident',
  },
  {
    entity: 'RIU',
    field: 'sourceChannel',
    label: 'Source Channel',
    path: 'riu.sourceChannel',
    type: 'string',
    tags: [FieldTag.AUDIT, FieldTag.BOARD],
    description: 'How the report was received',
  },
  {
    entity: 'RIU',
    field: 'aiSummary',
    label: 'AI Summary',
    path: 'riu.aiSummary',
    type: 'string',
    tags: [FieldTag.BOARD],
    description: 'AI-generated summary',
  },

  // Location fields
  {
    entity: 'Location',
    field: 'name',
    label: 'Location',
    path: 'riu.location.name',
    type: 'string',
    tags: [FieldTag.AUDIT, FieldTag.BOARD, FieldTag.EXTERNAL],
    description: 'Location name',
  },
  {
    entity: 'Location',
    field: 'country',
    label: 'Country',
    path: 'riu.location.country',
    type: 'string',
    tags: [FieldTag.AUDIT, FieldTag.BOARD, FieldTag.EXTERNAL],
    description: 'Country',
  },

  // Business Unit fields
  {
    entity: 'BusinessUnit',
    field: 'name',
    label: 'Business Unit',
    path: 'riu.businessUnit.name',
    type: 'string',
    tags: [FieldTag.AUDIT, FieldTag.BOARD, FieldTag.EXTERNAL],
    description: 'Business unit name',
  },

  // Investigation fields
  {
    entity: 'Investigation',
    field: 'id',
    label: 'Investigation ID',
    path: 'investigations[].id',
    type: 'string',
    tags: [FieldTag.AUDIT],
    description: 'Unique investigation identifier',
  },
  {
    entity: 'Investigation',
    field: 'status',
    label: 'Investigation Status',
    path: 'investigations[].status',
    type: 'string',
    tags: [FieldTag.AUDIT, FieldTag.BOARD],
    description: 'Current investigation status',
  },
  {
    entity: 'Investigation',
    field: 'findings',
    label: 'Findings',
    path: 'investigations[].findings',
    type: 'string',
    tags: [FieldTag.AUDIT, FieldTag.SENSITIVE],
    description: 'Investigation findings',
  },
  {
    entity: 'Investigation',
    field: 'assignedTo',
    label: 'Investigator',
    path: 'investigations[].assignedTo.name',
    type: 'string',
    tags: [FieldTag.AUDIT],
    description: 'Assigned investigator name',
  },

  // Person fields (PII)
  {
    entity: 'Person',
    field: 'firstName',
    label: 'First Name',
    path: 'subjects[].firstName',
    type: 'string',
    tags: [FieldTag.PII, FieldTag.SENSITIVE],
    description: 'Subject first name',
  },
  {
    entity: 'Person',
    field: 'lastName',
    label: 'Last Name',
    path: 'subjects[].lastName',
    type: 'string',
    tags: [FieldTag.PII, FieldTag.SENSITIVE],
    description: 'Subject last name',
  },
  {
    entity: 'Person',
    field: 'email',
    label: 'Email',
    path: 'subjects[].email',
    type: 'string',
    tags: [FieldTag.PII, FieldTag.SENSITIVE],
    description: 'Subject email address',
  },
  {
    entity: 'Person',
    field: 'role',
    label: 'Role',
    path: 'subjects[].role',
    type: 'string',
    tags: [FieldTag.AUDIT],
    description: 'Subject role in case',
  },

  // Remediation fields
  {
    entity: 'Remediation',
    field: 'status',
    label: 'Remediation Status',
    path: 'remediation.status',
    type: 'string',
    tags: [FieldTag.AUDIT, FieldTag.BOARD],
    description: 'Remediation status',
  },
  {
    entity: 'Remediation',
    field: 'completedSteps',
    label: 'Completed Steps',
    path: 'remediation.completedSteps',
    type: 'number',
    tags: [FieldTag.AUDIT],
    description: 'Number of completed remediation steps',
  },
  {
    entity: 'Remediation',
    field: 'totalSteps',
    label: 'Total Steps',
    path: 'remediation.totalSteps',
    type: 'number',
    tags: [FieldTag.AUDIT],
    description: 'Total remediation steps',
  },

  // SLA fields
  {
    entity: 'SLA',
    field: 'dueAt',
    label: 'SLA Due Date',
    path: 'sla.dueAt',
    type: 'date',
    tags: [FieldTag.AUDIT, FieldTag.BOARD],
    description: 'SLA due date',
  },
  {
    entity: 'SLA',
    field: 'breached',
    label: 'SLA Breached',
    path: 'sla.breached',
    type: 'boolean',
    tags: [FieldTag.AUDIT, FieldTag.BOARD],
    description: 'Whether SLA was breached',
  },
];

/**
 * Export preset configuration.
 */
export interface ExportPreset {
  name: string;
  description: string;
  tags: {
    include: FieldTag[];
    exclude: FieldTag[];
  };
}

/**
 * TaggedFieldService
 *
 * Manages semantic field tagging for flat file exports.
 * Fields are tagged with categories like AUDIT, BOARD, PII, SENSITIVE, EXTERNAL, MIGRATION
 * to control which fields are included in different export types.
 *
 * Key features:
 * - Platform-wide field definitions with default tags
 * - Organization-specific tag overrides
 * - Preset configurations for common export scenarios
 * - Tag-based field filtering
 */
@Injectable()
export class TaggedFieldService {
  private readonly logger = new Logger(TaggedFieldService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all platform field definitions.
   */
  getAllFields(): TaggedField[] {
    return PLATFORM_FIELDS;
  }

  /**
   * Get fields filtered by tag inclusion/exclusion criteria.
   *
   * @param config - Filter configuration
   * @returns Filtered list of fields
   */
  getFieldsByTags(config: {
    includeTags?: FieldTag[];
    excludeTags?: FieldTag[];
    entities?: string[];
  }): TaggedField[] {
    let fields = [...PLATFORM_FIELDS];

    // Filter by entity if specified
    if (config.entities && config.entities.length > 0) {
      fields = fields.filter((f) => config.entities!.includes(f.entity));
    }

    // Include fields with any of includeTags
    if (config.includeTags && config.includeTags.length > 0) {
      fields = fields.filter((f) => f.tags.some((t) => config.includeTags!.includes(t)));
    }

    // Exclude fields with any of excludeTags
    if (config.excludeTags && config.excludeTags.length > 0) {
      fields = fields.filter((f) => !f.tags.some((t) => config.excludeTags!.includes(t)));
    }

    return fields;
  }

  /**
   * Get organization-specific field tag overrides.
   * Returns a map of field keys to their custom tags.
   *
   * Note: Uses JSON field in Organization settings for phase 1.
   * Future: May use dedicated table for complex override scenarios.
   */
  async getOrgFieldTags(orgId: string): Promise<Map<string, FieldTag[]>> {
    try {
      const org = await this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { settings: true },
      });

      const map = new Map<string, FieldTag[]>();

      if (org?.settings && typeof org.settings === 'object') {
        const settings = org.settings as Record<string, unknown>;
        const overrides = settings.fieldTagOverrides as
          | Record<string, FieldTag[]>
          | undefined;

        if (overrides) {
          for (const [key, tags] of Object.entries(overrides)) {
            map.set(key, tags);
          }
        }
      }

      return map;
    } catch (error) {
      this.logger.warn(
        `Failed to get org field tags: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return new Map();
    }
  }

  /**
   * Get fields with organization-specific overrides applied.
   *
   * @param orgId - Organization ID
   * @param config - Optional filter configuration
   * @returns Fields with overrides applied, then filtered
   */
  async getFieldsWithOverrides(
    orgId: string,
    config?: { includeTags?: FieldTag[]; excludeTags?: FieldTag[] },
  ): Promise<TaggedField[]> {
    const overrides = await this.getOrgFieldTags(orgId);

    // Apply overrides to base fields
    const fieldsWithOverrides = PLATFORM_FIELDS.map((field) => {
      const key = `${field.entity}.${field.field}`;
      if (overrides.has(key)) {
        return { ...field, tags: overrides.get(key)! };
      }
      return field;
    });

    // Apply tag filters if provided
    if (!config) {
      return fieldsWithOverrides;
    }

    let result = fieldsWithOverrides;

    if (config.includeTags && config.includeTags.length > 0) {
      result = result.filter((f) => f.tags.some((t) => config.includeTags!.includes(t)));
    }

    if (config.excludeTags && config.excludeTags.length > 0) {
      result = result.filter((f) => !f.tags.some((t) => config.excludeTags!.includes(t)));
    }

    return result;
  }

  /**
   * Update organization-specific field tags.
   * Stores overrides in Organization.settings JSON field.
   *
   * @param orgId - Organization ID
   * @param userId - User making the change (for audit)
   * @param updates - List of field tag updates
   */
  async updateFieldTags(
    orgId: string,
    _userId: string,
    updates: { entity: string; field: string; tags: FieldTag[] }[],
  ): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    const overrides =
      (settings.fieldTagOverrides as Record<string, FieldTag[]>) || {};

    for (const update of updates) {
      const key = `${update.entity}.${update.field}`;
      overrides[key] = update.tags;
    }

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...settings,
          fieldTagOverrides: overrides,
        },
      },
    });

    this.logger.log(
      `Updated ${updates.length} field tag overrides for org ${orgId}`,
    );
  }

  /**
   * Build column definitions from tagged fields.
   * Used by export services to configure output columns.
   *
   * @param fields - List of tagged fields
   * @returns Column definitions for export
   */
  buildColumns(
    fields: TaggedField[],
  ): { field: string; label: string; path: string; type: string }[] {
    return fields.map((f) => ({
      field: `${f.entity}_${f.field}`,
      label: f.label,
      path: f.path,
      type: f.type,
    }));
  }

  /**
   * Get preset export configurations.
   * These provide quick-start options for common export scenarios.
   */
  getPresets(): ExportPreset[] {
    return [
      {
        name: 'Audit Export',
        description: 'All fields required for compliance audits',
        tags: { include: [FieldTag.AUDIT], exclude: [] },
      },
      {
        name: 'Board Report Data',
        description: 'Fields suitable for board-level reporting',
        tags: { include: [FieldTag.BOARD], exclude: [FieldTag.PII, FieldTag.SENSITIVE] },
      },
      {
        name: 'External Sharing',
        description: 'Safe for external parties (no PII or sensitive data)',
        tags: { include: [FieldTag.EXTERNAL], exclude: [FieldTag.PII, FieldTag.SENSITIVE] },
      },
      {
        name: 'Migration Export',
        description: 'All data needed for system migration',
        tags: { include: [FieldTag.MIGRATION], exclude: [] },
      },
      {
        name: 'Full Export (Admin)',
        description: 'All fields including PII and sensitive data',
        tags: { include: [], exclude: [] },
      },
    ];
  }

  /**
   * Get unique entity names from platform fields.
   */
  getEntities(): string[] {
    const entities = new Set(PLATFORM_FIELDS.map((f) => f.entity));
    return Array.from(entities);
  }

  /**
   * Check if a field configuration includes PII data.
   *
   * @param fields - Fields to check
   * @returns true if any field has PII tag
   */
  includesPii(fields: TaggedField[]): boolean {
    return fields.some((f) => f.tags.includes(FieldTag.PII));
  }

  /**
   * Check if a field configuration includes sensitive data.
   *
   * @param fields - Fields to check
   * @returns true if any field has SENSITIVE tag
   */
  includesSensitive(fields: TaggedField[]): boolean {
    return fields.some((f) => f.tags.includes(FieldTag.SENSITIVE));
  }
}
