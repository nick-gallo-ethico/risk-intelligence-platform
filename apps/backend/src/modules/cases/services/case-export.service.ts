/**
 * CaseExportService - Business logic for case export operations
 *
 * Handles:
 * - Column definition for case exports
 * - Row mapping from case data to export format
 * - Excel file generation
 *
 * Extracted from CasesController to maintain thin controller pattern.
 */

import { Injectable } from "@nestjs/common";
import { Case } from "@prisma/client";
import { ExcelExportService } from "../../analytics/exports/excel-export.service";
import { ColumnDefinition } from "../../analytics/exports/entities/export.entity";
import { CasesService } from "../cases.service";
import { CaseQueryDto } from "../dto";

/**
 * Export options
 */
export interface ExportOptions {
  format?: "excel" | "csv";
  columns?: string[];
}

@Injectable()
export class CaseExportService {
  /** Default column definitions for case exports */
  private readonly defaultColumnDefs: ColumnDefinition[] = [
    { key: "referenceNumber", label: "Case #", type: "string", width: 15 },
    { key: "summary", label: "Summary", type: "string", width: 40 },
    { key: "status", label: "Status", type: "string", width: 12 },
    { key: "severity", label: "Severity", type: "string", width: 10 },
    { key: "category", label: "Category", type: "string", width: 20 },
    { key: "createdAt", label: "Created Date", type: "date", width: 12 },
    { key: "assignee", label: "Assignee", type: "string", width: 20 },
    { key: "daysOpen", label: "Days Open", type: "number", width: 10 },
  ];

  constructor(
    private readonly casesService: CasesService,
    private readonly excelExportService: ExcelExportService,
  ) {}

  /**
   * Export filtered cases to Excel format.
   *
   * @param query - Case filter query
   * @param organizationId - Organization ID for tenant isolation
   * @param options - Export options
   * @returns Excel buffer ready to send as response
   */
  async exportCases(
    query: CaseQueryDto,
    organizationId: string,
    options: ExportOptions = {},
  ): Promise<Buffer> {
    // Get filtered cases
    const { data } = await this.casesService.findAll(query, organizationId);

    // Map case data to export rows
    const rows = this.mapCasesToRows(data);

    // Generate Excel buffer
    return this.excelExportService.generateBuffer(
      rows,
      this.defaultColumnDefs,
      { sheetName: "Cases Export" },
    );
  }

  /**
   * Get the export filename with current date.
   */
  getFilename(): string {
    return `cases-export-${new Date().toISOString().split("T")[0]}.xlsx`;
  }

  /**
   * Get content type for Excel files.
   */
  getContentType(): string {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  /**
   * Map case entities to export row format.
   */
  private mapCasesToRows(cases: Case[]): Array<Record<string, unknown>> {
    return cases.map((c) => ({
      referenceNumber: c.referenceNumber,
      summary: c.summary || c.details?.substring(0, 100) || "",
      status: c.status,
      severity: c.severity,
      category: this.extractCategoryName(c),
      createdAt: c.createdAt,
      assignee: this.extractAssigneeName(c),
      daysOpen: this.calculateDaysOpen(c.createdAt),
    }));
  }

  /**
   * Extract category name from case with primaryCategory relation.
   */
  private extractCategoryName(caseData: Case): string {
    const record = caseData as Record<string, unknown>;
    const category = record.primaryCategory as { name?: string } | null;
    return category?.name || "";
  }

  /**
   * Extract assignee full name from case with assignee relation.
   */
  private extractAssigneeName(caseData: Case): string {
    const record = caseData as Record<string, unknown>;
    const assignee = record.assignee as {
      firstName?: string;
      lastName?: string;
    } | null;

    if (!assignee) {
      return "Unassigned";
    }

    const firstName = assignee.firstName || "";
    const lastName = assignee.lastName || "";
    return `${firstName} ${lastName}`.trim() || "Unassigned";
  }

  /**
   * Calculate days since case was created.
   */
  private calculateDaysOpen(createdAt: Date): number {
    return Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );
  }
}
