/**
 * FlatExportController - REST endpoints for tag-based flat file exports
 *
 * Provides endpoints for:
 * - Field listing with semantic tags
 * - Export presets (Audit, Board, External, Migration, Full)
 * - Preview with sample data
 * - Tag-based export execution
 * - Organization-specific tag overrides
 *
 * Export workflow:
 * 1. User selects preset or configures tags (include/exclude)
 * 2. User previews columns and sample data (POST /preview)
 * 3. User executes export (POST /export) - returns file stream
 * 4. Audit log captures user, fields, tags, and reason
 *
 * @see TaggedFieldService for tag-based field filtering
 * @see FlatFileService for data extraction and formatting
 */

import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  StreamableFile,
  Header,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, UserRole } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TaggedFieldService, FieldTag, TaggedField, ExportPreset } from './tagged-field.service';
import { AuditService, CreateAuditLogDto } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  User,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from '@prisma/client';
import { format } from 'date-fns';
import * as ExcelJS from 'exceljs';

/**
 * Export format options.
 */
export enum ExportFileFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
}

/**
 * Export mode options.
 */
export enum ExportMode {
  NORMALIZED = 'normalized',
  DENORMALIZED = 'denormalized',
}

/**
 * DTO for flat export configuration.
 */
export interface FlatExportConfigDto {
  includeTags?: FieldTag[];
  excludeTags?: FieldTag[];
  entities?: string[];
  customFields?: string[];
  format: 'csv' | 'xlsx';
  mode: 'normalized' | 'denormalized';
  filters?: {
    dateRange?: { start: string; end: string };
    statuses?: string[];
    categories?: string[];
    businessUnits?: string[];
  };
  reason?: string;
}

/**
 * DTO for field tag updates.
 */
export interface UpdateFieldTagsDto {
  entity: string;
  field: string;
  tags: FieldTag[];
}

interface PreviewData {
  fields: { field: string; label: string }[];
  rowCount: number;
  sampleData: Record<string, unknown>[];
}

@Controller('exports/flat')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiTags('exports')
export class FlatExportController {
  private readonly logger = new Logger(FlatExportController.name);

  constructor(
    private readonly taggedFieldService: TaggedFieldService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get available fields with their tags.
   */
  @Get('fields')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Get available export fields with tags' })
  @ApiResponse({ status: 200, description: 'List of fields with their tags' })
  async getFields(
    @CurrentUser() user: User,
  ): Promise<{ fields: TaggedField[] }> {
    const fields = await this.taggedFieldService.getFieldsWithOverrides(
      user.organizationId,
    );
    return { fields };
  }

  /**
   * Get preset export configurations.
   */
  @Get('presets')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Get export presets' })
  @ApiResponse({ status: 200, description: 'List of export presets' })
  getPresets(): { presets: ExportPreset[] } {
    return { presets: this.taggedFieldService.getPresets() };
  }

  /**
   * Get available tags with descriptions.
   */
  @Get('tags')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Get available field tags' })
  @ApiResponse({ status: 200, description: 'List of available tags' })
  getTags(): { tags: { value: FieldTag; label: string; description: string }[] } {
    return {
      tags: [
        {
          value: FieldTag.AUDIT,
          label: 'Audit',
          description: 'Required for compliance audits',
        },
        {
          value: FieldTag.BOARD,
          label: 'Board',
          description: 'Included in board reports',
        },
        {
          value: FieldTag.PII,
          label: 'PII',
          description: 'Contains personal information',
        },
        {
          value: FieldTag.SENSITIVE,
          label: 'Sensitive',
          description: 'Restricted access data',
        },
        {
          value: FieldTag.EXTERNAL,
          label: 'External',
          description: 'Safe for external sharing',
        },
        {
          value: FieldTag.MIGRATION,
          label: 'Migration',
          description: 'Included in migration exports',
        },
      ],
    };
  }

  /**
   * Preview export configuration.
   * Returns columns and sample data without generating full export.
   */
  @Post('preview')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Preview export configuration' })
  @ApiResponse({ status: 200, description: 'Preview with columns and sample data' })
  async previewExport(
    @CurrentUser() user: User,
    @Body() config: FlatExportConfigDto,
  ): Promise<PreviewData> {
    // Get fields based on config
    const fields = await this.taggedFieldService.getFieldsWithOverrides(
      user.organizationId,
      {
        includeTags: config.includeTags,
        excludeTags: config.excludeTags,
      },
    );

    // Filter by entities if specified
    const filteredFields = config.entities?.length
      ? fields.filter((f) => config.entities!.includes(f.entity))
      : fields;

    // Build column definitions
    const columns = this.taggedFieldService.buildColumns(filteredFields);

    // Get sample data
    const { data, totalCount } = await this.queryData(
      user.organizationId,
      config.filters,
      5,
    );

    // Transform to flat format
    const sampleData = data.map((row) =>
      this.flattenRow(row, columns, config.mode === 'denormalized'),
    );

    return {
      fields: columns.map((c) => ({ field: c.field, label: c.label })),
      rowCount: totalCount,
      sampleData,
    };
  }

  /**
   * Execute flat file export.
   * Returns file stream for download.
   */
  @Post('export')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @Header('Content-Type', 'application/octet-stream')
  @ApiOperation({ summary: 'Execute flat file export' })
  @ApiResponse({ status: 200, description: 'Export file stream' })
  async executeExport(
    @CurrentUser() user: User,
    @Body() config: FlatExportConfigDto,
  ): Promise<StreamableFile> {
    const startTime = Date.now();

    // Get fields
    const fields = await this.taggedFieldService.getFieldsWithOverrides(
      user.organizationId,
      {
        includeTags: config.includeTags,
        excludeTags: config.excludeTags,
      },
    );

    const filteredFields = config.entities?.length
      ? fields.filter((f) => config.entities!.includes(f.entity))
      : fields;

    const columns = this.taggedFieldService.buildColumns(filteredFields);

    // Generate export
    const buffer = await this.generateExport(
      user.organizationId,
      columns,
      config.filters,
      config.format,
      config.mode,
    );

    // Audit log
    const includesPii = this.taggedFieldService.includesPii(filteredFields);
    const includesSensitive = this.taggedFieldService.includesSensitive(filteredFields);

    await this.logAudit({
      entityType: AuditEntityType.REPORT,
      entityId: `flat-export-${Date.now()}`,
      action: 'FLAT_FILE_EXPORTED',
      actionCategory: AuditActionCategory.ACCESS,
      actionDescription: `${user.firstName} ${user.lastName} exported ${filteredFields.length} fields in ${config.format} format`,
      organizationId: user.organizationId,
      actorUserId: user.id,
      actorType: ActorType.USER,
      context: {
        fieldCount: filteredFields.length,
        format: config.format,
        mode: config.mode,
        includeTags: config.includeTags,
        excludeTags: config.excludeTags,
        reason: config.reason,
        includesPii,
        includesSensitive,
        durationMs: Date.now() - startTime,
      },
    });

    this.logger.log(
      `Exported ${filteredFields.length} fields for org ${user.organizationId} in ${Date.now() - startTime}ms`,
    );

    const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm');
    const filename = `case-export-${timestamp}.${config.format}`;

    return new StreamableFile(buffer, {
      type:
        config.format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  /**
   * Update field tags for organization.
   */
  @Post('fields/tags')
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Update field tags for organization' })
  @ApiResponse({ status: 200, description: 'Tags updated successfully' })
  async updateFieldTags(
    @CurrentUser() user: User,
    @Body() updates: UpdateFieldTagsDto[],
  ): Promise<{ updated: number }> {
    await this.taggedFieldService.updateFieldTags(
      user.organizationId,
      user.id,
      updates,
    );

    // Audit log
    await this.logAudit({
      entityType: AuditEntityType.ORGANIZATION,
      entityId: user.organizationId,
      action: 'FIELD_TAGS_UPDATED',
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `${user.firstName} ${user.lastName} updated ${updates.length} field tag configurations`,
      organizationId: user.organizationId,
      actorUserId: user.id,
      actorType: ActorType.USER,
      context: {
        updates: updates.map((u) => ({
          field: `${u.entity}.${u.field}`,
          tags: u.tags,
        })),
      },
    });

    return { updated: updates.length };
  }

  /**
   * Query case data with filters.
   */
  private async queryData(
    orgId: string,
    filters?: FlatExportConfigDto['filters'],
    limit?: number,
  ): Promise<{ data: unknown[]; totalCount: number }> {
    const where: Record<string, unknown> = {
      organizationId: orgId,
    };

    if (filters?.dateRange) {
      where.createdAt = {
        gte: new Date(filters.dateRange.start),
        lte: new Date(filters.dateRange.end),
      };
    }

    if (filters?.statuses?.length) {
      where.status = { in: filters.statuses };
    }

    if (filters?.categories?.length) {
      where.categoryId = { in: filters.categories };
    }

    if (filters?.businessUnits?.length) {
      where.businessUnitId = { in: filters.businessUnits };
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.case.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          primaryCategory: { select: { id: true, name: true, code: true } },
          investigations: {
            take: 3,
            select: {
              id: true,
              status: true,
              findingsSummary: true,
              createdAt: true,
              primaryInvestigatorId: true,
            },
          },
          riuAssociations: {
            take: 1,
            include: {
              riu: {
                select: {
                  id: true,
                  type: true,
                  severity: true,
                  locationName: true,
                  locationCountry: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.case.count({ where }),
    ]);

    return { data, totalCount };
  }

  /**
   * Flatten a case row into export columns.
   */
  private flattenRow(
    row: unknown,
    columns: { field: string; label: string; path: string; type: string }[],
    _denormalized: boolean,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const caseData = row as Record<string, unknown>;

    for (const col of columns) {
      const value = this.resolvePath(caseData, col.path);
      result[col.field] = this.formatValue(value, col.type);
    }

    return result;
  }

  /**
   * Resolve dot-notation path to value.
   */
  private resolvePath(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    // Handle 'case.' prefix
    if (parts[0] === 'case') {
      parts.shift();
    }

    // Handle 'riu.' prefix - navigate to first RIU
    if (parts[0] === 'riu') {
      const riuAssociations = obj.riuAssociations as Array<{
        riu: unknown;
      }>;
      if (riuAssociations?.length > 0) {
        current = riuAssociations[0].riu;
        parts.shift();
      } else {
        return null;
      }
    }

    for (const part of parts) {
      if (current === null || current === undefined) {
        return null;
      }

      // Handle array notation like 'investigations[]'
      if (part.endsWith('[]')) {
        const arrayKey = part.slice(0, -2);
        const arr = (current as Record<string, unknown>)[arrayKey];
        if (Array.isArray(arr) && arr.length > 0) {
          current = arr[0]; // Take first item for flat export
        } else {
          return null;
        }
      } else {
        current = (current as Record<string, unknown>)[part];
      }
    }

    return current;
  }

  /**
   * Format value for export.
   */
  private formatValue(value: unknown, type: string): unknown {
    if (value === null || value === undefined) {
      return '';
    }

    switch (type) {
      case 'date':
        if (value instanceof Date) {
          return format(value, 'yyyy-MM-dd HH:mm:ss');
        }
        if (typeof value === 'string') {
          return format(new Date(value), 'yyyy-MM-dd HH:mm:ss');
        }
        return value;

      case 'boolean':
        return value ? 'Yes' : 'No';

      case 'json':
        return JSON.stringify(value);

      default:
        return value;
    }
  }

  /**
   * Generate export file buffer.
   */
  private async generateExport(
    orgId: string,
    columns: { field: string; label: string; path: string; type: string }[],
    filters?: FlatExportConfigDto['filters'],
    format: 'csv' | 'xlsx' = 'xlsx',
    mode: 'normalized' | 'denormalized' = 'denormalized',
  ): Promise<Buffer> {
    const { data } = await this.queryData(orgId, filters);
    const rows = data.map((row) => this.flattenRow(row, columns, mode === 'denormalized'));

    if (format === 'csv') {
      return this.generateCsv(columns, rows);
    }

    return this.generateXlsx(columns, rows);
  }

  /**
   * Generate CSV buffer.
   */
  private generateCsv(
    columns: { field: string; label: string }[],
    rows: Record<string, unknown>[],
  ): Buffer {
    const header = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
    const dataRows = rows.map((row) =>
      columns
        .map((c) => {
          const val = row[c.field];
          if (val === null || val === undefined) return '';
          const str = String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(','),
    );

    return Buffer.from([header, ...dataRows].join('\n'), 'utf-8');
  }

  /**
   * Generate XLSX buffer.
   */
  private async generateXlsx(
    columns: { field: string; label: string }[],
    rows: Record<string, unknown>[],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Export');

    // Add headers
    worksheet.columns = columns.map((c) => ({
      header: c.label,
      key: c.field,
      width: 20,
    }));

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };

    // Add data rows
    for (const row of rows) {
      worksheet.addRow(row);
    }

    // Enable auto-filter
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: rows.length + 1, column: columns.length },
    };

    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Log audit entry with error handling.
   */
  private async logAudit(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.auditService.log(dto);
    } catch (error) {
      this.logger.warn(
        `Failed to log audit: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
