import { Injectable } from "@nestjs/common";
import { MigrationSourceType } from "@prisma/client";
import {
  BaseMigrationConnector,
  FieldMapping,
  MigrationTargetEntity,
} from "./base.connector";

/**
 * Known EQS/Conversant column names
 * Based on typical Conversant/Integrity Line export formats
 */
const EQS_COLUMNS = [
  "Report ID",
  "Report Number",
  "Ref Number",
  "Reference Number",
  "Report Type",
  "Issue Category",
  "Category Name",
  "Status",
  "Status Name",
  "Created Date",
  "Report Date",
  "Received Date",
  "Closed Date",
  "Resolution Date",
  "Reporter Type",
  "Anonymous Report",
  "Is Anonymous",
  "Location",
  "Site Name",
  "Division",
  "Region",
  "Country",
  "Case Description",
  "Report Text",
  "Description",
  "Summary",
  "Investigation Status",
  "Investigation Outcome",
  "Outcome",
  "Resolution",
  "Assigned User",
  "Assignee",
  "Handler",
  "Severity",
  "Risk Level",
  "Subject Name",
  "Subject Employee ID",
  "Whistleblower ID",
];

/**
 * EQS category mappings to platform categories
 */
const EQS_CATEGORY_MAPPINGS: Record<string, string> = {
  Harassment: "Harassment",
  "Sexual Harassment": "Harassment",
  Discrimination: "Discrimination",
  Fraud: "Fraud",
  "Financial Misconduct": "Fraud",
  Theft: "Theft",
  Embezzlement: "Theft",
  "Conflict of Interest": "Conflict of Interest",
  COI: "Conflict of Interest",
  "Ethics Concern": "Ethics Violation",
  "Code Violation": "Ethics Violation",
  "Policy Violation": "Ethics Violation",
  "Health & Safety": "Safety Concern",
  "Safety Issue": "Safety Concern",
  "Workplace Safety": "Safety Concern",
  Retaliation: "Retaliation",
  "Substance Abuse": "Substance Abuse",
  "Violence/Threats": "Workplace Violence",
  "Workplace Violence": "Workplace Violence",
  Bullying: "Bullying",
  Corruption: "Corruption",
  Bribery: "Bribery",
  "Anti-Bribery": "Bribery",
  "Data Protection": "Privacy Violation",
  "Privacy Breach": "Privacy Violation",
  "GDPR Violation": "Privacy Violation",
  "Regulatory Compliance": "Regulatory Violation",
  "Compliance Issue": "Regulatory Violation",
  Environmental: "Environmental Concern",
  "Human Rights": "Human Rights Violation",
  "Labor Violation": "Labor Violation",
  "Supply Chain": "Supply Chain Concern",
  Other: "Other",
  General: "Other",
  Miscellaneous: "Other",
};

/**
 * EQS status mappings to platform status
 */
const EQS_STATUS_MAPPINGS: Record<string, string> = {
  New: "NEW",
  new: "NEW",
  Received: "NEW",
  received: "NEW",
  Submitted: "NEW",
  submitted: "NEW",
  Open: "OPEN",
  open: "OPEN",
  "In Progress": "IN_PROGRESS",
  "in progress": "IN_PROGRESS",
  Processing: "IN_PROGRESS",
  processing: "IN_PROGRESS",
  "Under Review": "IN_PROGRESS",
  Investigating: "IN_PROGRESS",
  "On Hold": "PENDING",
  "on hold": "PENDING",
  Waiting: "PENDING",
  waiting: "PENDING",
  "Pending Information": "PENDING_RESPONSE",
  "Awaiting Response": "PENDING_RESPONSE",
  Completed: "CLOSED",
  completed: "CLOSED",
  Closed: "CLOSED",
  closed: "CLOSED",
  Resolved: "CLOSED",
  resolved: "CLOSED",
  Archived: "CLOSED",
  archived: "CLOSED",
  Rejected: "DISMISSED",
  rejected: "DISMISSED",
  Dismissed: "DISMISSED",
  dismissed: "DISMISSED",
  "Not Actionable": "DISMISSED",
};

/**
 * EQS severity mappings to platform severity
 */
const EQS_SEVERITY_MAPPINGS: Record<string, string> = {
  High: "HIGH",
  high: "HIGH",
  Critical: "HIGH",
  critical: "HIGH",
  Severe: "HIGH",
  severe: "HIGH",
  "Level 3": "HIGH",
  "3": "HIGH",
  Medium: "MEDIUM",
  medium: "MEDIUM",
  Moderate: "MEDIUM",
  moderate: "MEDIUM",
  Standard: "MEDIUM",
  standard: "MEDIUM",
  "Level 2": "MEDIUM",
  "2": "MEDIUM",
  Low: "LOW",
  low: "LOW",
  Minor: "LOW",
  minor: "LOW",
  Minimal: "LOW",
  minimal: "LOW",
  "Level 1": "LOW",
  "1": "LOW",
};

/**
 * EQS/Conversant connector
 * Parses exports from EQS Group's Integrity Line and Conversant systems
 */
@Injectable()
export class EqsConnector extends BaseMigrationConnector {
  readonly sourceType = MigrationSourceType.EQS;

  /**
   * Calculate confidence that headers match EQS format
   */
  protected calculateConfidence(headers: string[]): number {
    const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

    // Count matches against known EQS columns
    const matchCount = EQS_COLUMNS.filter((col) =>
      normalizedHeaders.some(
        (h) =>
          h === col.toLowerCase() ||
          h.includes(col.toLowerCase()) ||
          col.toLowerCase().includes(h),
      ),
    ).length;

    // EQS files typically have specific identifying columns
    const hasEqsIdentifiers =
      normalizedHeaders.some(
        (h) =>
          h.includes("report id") ||
          h.includes("report number") ||
          h.includes("ref number"),
      ) &&
      normalizedHeaders.some(
        (h) => h.includes("report type") || h.includes("issue category"),
      );

    // Some EQS exports have "whistleblower" terminology
    const hasWhistleblowerTerms = normalizedHeaders.some(
      (h) => h.includes("whistleblower") || h.includes("integrity"),
    );

    // Base confidence from column matches
    const baseConfidence = matchCount / Math.min(headers.length, 15);

    // Boost confidence if EQS identifiers are present
    let confidence = baseConfidence;
    if (hasEqsIdentifiers) {
      confidence = Math.min(confidence + 0.25, 1.0);
    }
    if (hasWhistleblowerTerms) {
      confidence = Math.min(confidence + 0.15, 1.0);
    }

    return confidence;
  }

  /**
   * Get suggested field mappings for EQS exports
   */
  getSuggestedMappings(): FieldMapping[] {
    return [
      // Report identifiers
      {
        sourceField: "Report ID",
        targetField: "referenceNumber",
        targetEntity: "RIU" as MigrationTargetEntity,
        isRequired: true,
        transform: { type: "trim" },
        description: "Unique report identifier from EQS",
      },
      {
        sourceField: "Report Number",
        targetField: "referenceNumber",
        targetEntity: "RIU" as MigrationTargetEntity,
        isRequired: true,
        transform: { type: "trim" },
        description: "Report number",
      },
      {
        sourceField: "Ref Number",
        targetField: "referenceNumber",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: true,
        transform: { type: "trim" },
        description: "Reference number",
      },
      {
        sourceField: "Reference Number",
        targetField: "referenceNumber",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: true,
        transform: { type: "trim" },
        description: "Reference number",
      },

      // Classification
      {
        sourceField: "Report Type",
        targetField: "categoryName",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "mapValue", mappings: EQS_CATEGORY_MAPPINGS },
        description: "Report type/category",
      },
      {
        sourceField: "Issue Category",
        targetField: "categoryName",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "mapValue", mappings: EQS_CATEGORY_MAPPINGS },
        description: "Issue category",
      },
      {
        sourceField: "Category Name",
        targetField: "categoryName",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "mapValue", mappings: EQS_CATEGORY_MAPPINGS },
        description: "Category name",
      },

      // Status
      {
        sourceField: "Status",
        targetField: "status",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: true,
        transform: { type: "mapValue", mappings: EQS_STATUS_MAPPINGS },
        description: "Current status",
      },
      {
        sourceField: "Status Name",
        targetField: "status",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: true,
        transform: { type: "mapValue", mappings: EQS_STATUS_MAPPINGS },
        description: "Status name",
      },
      {
        sourceField: "Investigation Status",
        targetField: "status",
        targetEntity: "Investigation" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "mapValue", mappings: EQS_STATUS_MAPPINGS },
        description: "Investigation status",
      },

      // Severity
      {
        sourceField: "Severity",
        targetField: "severity",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "mapValue", mappings: EQS_SEVERITY_MAPPINGS },
        description: "Severity level",
      },
      {
        sourceField: "Risk Level",
        targetField: "severity",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "mapValue", mappings: EQS_SEVERITY_MAPPINGS },
        description: "Risk level",
      },

      // Dates - EQS typically uses ISO format (yyyy-MM-dd)
      {
        sourceField: "Created Date",
        targetField: "createdAt",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: true,
        transform: { type: "parseDate", format: "yyyy-MM-dd" },
        description: "Date created",
      },
      {
        sourceField: "Report Date",
        targetField: "intakeTimestamp",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "parseDate", format: "yyyy-MM-dd" },
        description: "Date reported",
      },
      {
        sourceField: "Received Date",
        targetField: "intakeTimestamp",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "parseDate", format: "yyyy-MM-dd" },
        description: "Date received",
      },
      {
        sourceField: "Closed Date",
        targetField: "closedAt",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "parseDate", format: "yyyy-MM-dd" },
        description: "Date closed",
      },
      {
        sourceField: "Resolution Date",
        targetField: "closedAt",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "parseDate", format: "yyyy-MM-dd" },
        description: "Date resolved",
      },

      // Reporter information
      {
        sourceField: "Anonymous Report",
        targetField: "isAnonymous",
        targetEntity: "RIU" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "parseBoolean" },
        description: "Whether report is anonymous",
      },
      {
        sourceField: "Is Anonymous",
        targetField: "isAnonymous",
        targetEntity: "RIU" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "parseBoolean" },
        description: "Whether reporter is anonymous",
      },
      {
        sourceField: "Reporter Type",
        targetField: "reporterType",
        targetEntity: "RIU" as MigrationTargetEntity,
        isRequired: false,
        description: "Type of reporter",
      },
      {
        sourceField: "Whistleblower ID",
        targetField: "reporterReference",
        targetEntity: "RIU" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Anonymous reporter reference ID",
      },

      // Content
      {
        sourceField: "Report Text",
        targetField: "details",
        targetEntity: "RIU" as MigrationTargetEntity,
        isRequired: true,
        transform: { type: "trim" },
        description: "Full report text",
      },
      {
        sourceField: "Case Description",
        targetField: "details",
        targetEntity: "RIU" as MigrationTargetEntity,
        isRequired: true,
        transform: { type: "trim" },
        description: "Case description",
      },
      {
        sourceField: "Description",
        targetField: "details",
        targetEntity: "RIU" as MigrationTargetEntity,
        isRequired: true,
        transform: { type: "trim" },
        description: "Report description",
      },
      {
        sourceField: "Summary",
        targetField: "summary",
        targetEntity: "RIU" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Report summary",
      },
      {
        sourceField: "Outcome",
        targetField: "outcome",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Case outcome",
      },
      {
        sourceField: "Investigation Outcome",
        targetField: "outcome",
        targetEntity: "Investigation" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Investigation outcome",
      },
      {
        sourceField: "Resolution",
        targetField: "outcome",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Resolution details",
      },

      // Location
      {
        sourceField: "Location",
        targetField: "locationName",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Location name",
      },
      {
        sourceField: "Site Name",
        targetField: "locationName",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Site name",
      },
      {
        sourceField: "Division",
        targetField: "businessUnitName",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Division/Business unit",
      },
      {
        sourceField: "Region",
        targetField: "locationState",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Region",
      },
      {
        sourceField: "Country",
        targetField: "locationCountry",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Country",
      },

      // Person/Subject
      {
        sourceField: "Subject Name",
        targetField: "name",
        targetEntity: "Person" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Subject name",
      },
      {
        sourceField: "Subject Employee ID",
        targetField: "employeeId",
        targetEntity: "Person" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Subject employee ID",
      },

      // Assignment
      {
        sourceField: "Assigned User",
        targetField: "primaryInvestigatorName",
        targetEntity: "Investigation" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Assigned user",
      },
      {
        sourceField: "Assignee",
        targetField: "primaryInvestigatorName",
        targetEntity: "Investigation" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Case assignee",
      },
      {
        sourceField: "Handler",
        targetField: "primaryInvestigatorName",
        targetEntity: "Investigation" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Case handler",
      },
    ];
  }

  /**
   * Get category mapping for custom transform
   */
  getCategoryMappings(): Record<string, string> {
    return EQS_CATEGORY_MAPPINGS;
  }

  /**
   * Get status mapping for custom transform
   */
  getStatusMappings(): Record<string, string> {
    return EQS_STATUS_MAPPINGS;
  }

  /**
   * Get severity mapping for custom transform
   */
  getSeverityMappings(): Record<string, string> {
    return EQS_SEVERITY_MAPPINGS;
  }
}
