/**
 * RiuFormDataService - Form data structuring for RIU display
 *
 * Handles structuring RIU data into sections for UI display.
 * Type-specific section builders for different RIU types.
 *
 * Extracted from RiusService for maintainability.
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { RiskIntelligenceUnit, RiuType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  RiuFormDataResponse,
  FormSection,
  FormField,
  FormFieldType,
} from "../types/riu-form-data.types";

@Injectable()
export class RiuFormDataService {
  private readonly logger = new Logger(RiuFormDataService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns RIU intake form data structured by logical sections.
   * Section structure varies by RIU type.
   */
  async getFormData(
    organizationId: string,
    riuId: string,
  ): Promise<RiuFormDataResponse> {
    const riu = await this.prisma.riskIntelligenceUnit.findFirst({
      where: { id: riuId, organizationId },
      include: {
        category: {
          select: { id: true, name: true, code: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        hotlineExtension: true,
        disclosureExtension: true,
        webFormExtension: true,
      },
    });

    if (!riu) {
      throw new NotFoundException(`RIU with ID ${riuId} not found`);
    }

    return this.structureFormData(riu);
  }

  /**
   * Structures RIU data into sections based on RIU type
   */
  structureFormData(
    riu: RiskIntelligenceUnit & {
      category?: { id: string; name: string; code: string | null } | null;
      createdBy?: { id: string; firstName: string; lastName: string } | null;
      hotlineExtension?: {
        callDuration: number | null;
        interpreterUsed: boolean;
        interpreterLanguage: string | null;
        callerDemeanor: string | null;
        callbackRequested: boolean;
        callbackNumber: string | null;
        operatorNotes: string | null;
        qaStatus: string;
      } | null;
      disclosureExtension?: {
        disclosureType: string;
        disclosureSubtype: string | null;
        disclosureValue: unknown;
        disclosureCurrency: string | null;
        relatedPersonName: string | null;
        relatedCompany: string | null;
        relationshipType: string | null;
        effectiveDate: Date | null;
        expirationDate: Date | null;
        thresholdTriggered: boolean;
        conflictDetected: boolean;
        conflictReason: string | null;
      } | null;
      webFormExtension?: {
        formName: string | null;
        submissionSource: string | null;
        submissionDuration: number | null;
        attachmentCount: number;
      } | null;
    },
  ): RiuFormDataResponse {
    const sections: FormSection[] = [];

    switch (riu.type) {
      case RiuType.HOTLINE_REPORT:
        sections.push(...this.buildHotlineSections(riu));
        break;
      case RiuType.WEB_FORM_SUBMISSION:
        sections.push(...this.buildWebFormSections(riu));
        break;
      case RiuType.DISCLOSURE_RESPONSE:
        sections.push(...this.buildDisclosureSections(riu));
        break;
      default:
        sections.push(...this.buildGenericSections(riu));
    }

    return {
      riuId: riu.id,
      riuType: riu.type,
      referenceNumber: riu.referenceNumber,
      sections,
    };
  }

  /**
   * Build sections for HOTLINE_REPORT type
   */
  private buildHotlineSections(
    riu: RiskIntelligenceUnit & {
      category?: { id: string; name: string; code: string | null } | null;
      hotlineExtension?: {
        callDuration: number | null;
        interpreterUsed: boolean;
        interpreterLanguage: string | null;
        callerDemeanor: string | null;
        callbackRequested: boolean;
        callbackNumber: string | null;
        operatorNotes: string | null;
        qaStatus: string;
      } | null;
    },
  ): FormSection[] {
    const sections: FormSection[] = [];
    const ext = riu.hotlineExtension;

    // Report Information Section
    sections.push({
      id: "report-info",
      title: "Report Information",
      fields: [
        this.createField("Reference Number", riu.referenceNumber, "text"),
        this.createField(
          "Source Channel",
          this.formatSourceChannel(riu.sourceChannel),
          "text",
        ),
        this.createField("Created At", riu.createdAt, "datetime"),
        this.createField("Status", this.formatStatus(riu.status), "text"),
        ext?.callDuration
          ? this.createField(
              "Call Duration",
              `${Math.floor(ext.callDuration / 60)}m ${ext.callDuration % 60}s`,
              "text",
            )
          : null,
      ].filter((f): f is FormField => f !== null),
    });

    // Reporter Details Section
    sections.push({
      id: "reporter-details",
      title: "Reporter Details",
      fields: [
        this.createField(
          "Reporter Type",
          this.formatReporterType(riu.reporterType),
          "text",
        ),
        riu.reporterName
          ? this.createField("Reporter Name", riu.reporterName, "text")
          : null,
        riu.reporterEmail
          ? this.createField("Reporter Email", riu.reporterEmail, "text")
          : null,
        riu.reporterPhone
          ? this.createField("Reporter Phone", riu.reporterPhone, "text")
          : null,
        ext?.callbackRequested
          ? this.createField(
              "Callback Requested",
              ext.callbackRequested,
              "boolean",
            )
          : null,
        ext?.callbackNumber
          ? this.createField("Callback Number", ext.callbackNumber, "text")
          : null,
      ].filter((f): f is FormField => f !== null),
    });

    // Incident Details Section
    sections.push({
      id: "incident-details",
      title: "Incident Details",
      fields: [
        this.createField("Details", riu.details, "textarea"),
        riu.summary
          ? this.createField("Summary", riu.summary, "textarea")
          : null,
        this.buildLocationField(riu),
        ext?.callerDemeanor
          ? this.createField("Caller Demeanor", ext.callerDemeanor, "text")
          : null,
        ext?.interpreterUsed
          ? this.createField("Interpreter Used", ext.interpreterUsed, "boolean")
          : null,
        ext?.interpreterLanguage
          ? this.createField(
              "Interpreter Language",
              ext.interpreterLanguage,
              "text",
            )
          : null,
      ].filter((f): f is FormField => f !== null),
    });

    // Classification Section
    sections.push({
      id: "classification",
      title: "Classification",
      fields: [
        riu.category
          ? this.createField("Category", riu.category.name, "text")
          : null,
        this.createField("Severity", riu.severity, "text"),
      ].filter((f): f is FormField => f !== null),
    });

    // Processing Section (hotline-specific)
    if (ext) {
      sections.push({
        id: "processing",
        title: "Processing",
        fields: [
          this.createField(
            "QA Status",
            this.formatQaStatus(ext.qaStatus),
            "text",
          ),
          ext.operatorNotes
            ? this.createField("Operator Notes", ext.operatorNotes, "textarea")
            : null,
        ].filter((f): f is FormField => f !== null),
      });
    }

    // Custom Fields Section (if any)
    const customSection = this.buildCustomFieldsSection(riu);
    if (customSection.fields.length > 0) {
      sections.push(customSection);
    }

    return sections;
  }

  /**
   * Build sections for WEB_FORM_SUBMISSION type
   */
  private buildWebFormSections(
    riu: RiskIntelligenceUnit & {
      category?: { id: string; name: string; code: string | null } | null;
      webFormExtension?: {
        formName: string | null;
        submissionSource: string | null;
        submissionDuration: number | null;
        attachmentCount: number;
      } | null;
    },
  ): FormSection[] {
    const sections: FormSection[] = [];
    const ext = riu.webFormExtension;

    // Submission Information Section
    sections.push({
      id: "submission-info",
      title: "Submission Information",
      fields: [
        this.createField("Reference Number", riu.referenceNumber, "text"),
        ext?.formName
          ? this.createField("Form Name", ext.formName, "text")
          : null,
        this.createField(
          "Source Channel",
          this.formatSourceChannel(riu.sourceChannel),
          "text",
        ),
        ext?.submissionSource
          ? this.createField("Submission Source", ext.submissionSource, "text")
          : null,
        this.createField("Submitted At", riu.createdAt, "datetime"),
        ext?.submissionDuration
          ? this.createField(
              "Time to Complete",
              `${Math.floor(ext.submissionDuration / 60)}m ${ext.submissionDuration % 60}s`,
              "text",
            )
          : null,
        ext?.attachmentCount !== undefined
          ? this.createField("Attachments", ext.attachmentCount, "number")
          : null,
      ].filter((f): f is FormField => f !== null),
    });

    // Reporter Details Section
    sections.push({
      id: "reporter-details",
      title: "Reporter Details",
      fields: [
        this.createField(
          "Reporter Type",
          this.formatReporterType(riu.reporterType),
          "text",
        ),
        riu.reporterName
          ? this.createField("Reporter Name", riu.reporterName, "text")
          : null,
        riu.reporterEmail
          ? this.createField("Reporter Email", riu.reporterEmail, "text")
          : null,
        riu.reporterPhone
          ? this.createField("Reporter Phone", riu.reporterPhone, "text")
          : null,
      ].filter((f): f is FormField => f !== null),
    });

    // Report Details Section
    sections.push({
      id: "report-details",
      title: "Report Details",
      fields: [
        this.createField("Details", riu.details, "textarea"),
        riu.summary
          ? this.createField("Summary", riu.summary, "textarea")
          : null,
        this.buildLocationField(riu),
      ].filter((f): f is FormField => f !== null),
    });

    // Classification Section
    sections.push({
      id: "classification",
      title: "Classification",
      fields: [
        riu.category
          ? this.createField("Category", riu.category.name, "text")
          : null,
        this.createField("Severity", riu.severity, "text"),
        this.createField("Status", this.formatStatus(riu.status), "text"),
      ].filter((f): f is FormField => f !== null),
    });

    // Custom Fields Section (if any)
    const customSection = this.buildCustomFieldsSection(riu);
    if (customSection.fields.length > 0) {
      sections.push(customSection);
    }

    return sections;
  }

  /**
   * Build sections for DISCLOSURE_RESPONSE type
   */
  private buildDisclosureSections(
    riu: RiskIntelligenceUnit & {
      category?: { id: string; name: string; code: string | null } | null;
      disclosureExtension?: {
        disclosureType: string;
        disclosureSubtype: string | null;
        disclosureValue: unknown;
        disclosureCurrency: string | null;
        relatedPersonName: string | null;
        relatedCompany: string | null;
        relationshipType: string | null;
        effectiveDate: Date | null;
        expirationDate: Date | null;
        thresholdTriggered: boolean;
        conflictDetected: boolean;
        conflictReason: string | null;
      } | null;
    },
  ): FormSection[] {
    const sections: FormSection[] = [];
    const ext = riu.disclosureExtension;

    // Disclosure Information Section
    sections.push({
      id: "disclosure-info",
      title: "Disclosure Information",
      fields: [
        this.createField("Reference Number", riu.referenceNumber, "text"),
        ext
          ? this.createField(
              "Disclosure Type",
              this.formatDisclosureType(ext.disclosureType),
              "text",
            )
          : null,
        ext?.disclosureSubtype
          ? this.createField("Subtype", ext.disclosureSubtype, "text")
          : null,
        this.createField("Submitted At", riu.createdAt, "datetime"),
        this.createField("Status", this.formatStatus(riu.status), "text"),
      ].filter((f): f is FormField => f !== null),
    });

    // Disclosure Details Section
    if (ext) {
      sections.push({
        id: "disclosure-details",
        title: "Disclosure Details",
        fields: [
          this.createField("Details", riu.details, "textarea"),
          ext.disclosureValue !== null && ext.disclosureValue !== undefined
            ? this.createField(
                "Value",
                this.formatCurrency(
                  ext.disclosureValue,
                  ext.disclosureCurrency,
                ),
                "currency",
              )
            : null,
          ext.relatedPersonName
            ? this.createField("Related Person", ext.relatedPersonName, "text")
            : null,
          ext.relatedCompany
            ? this.createField("Related Company", ext.relatedCompany, "text")
            : null,
          ext.relationshipType
            ? this.createField(
                "Relationship Type",
                ext.relationshipType,
                "text",
              )
            : null,
          ext.effectiveDate
            ? this.createField("Effective Date", ext.effectiveDate, "date")
            : null,
          ext.expirationDate
            ? this.createField("Expiration Date", ext.expirationDate, "date")
            : null,
        ].filter((f): f is FormField => f !== null),
      });

      // Review Status Section
      sections.push({
        id: "review-status",
        title: "Review Status",
        fields: [
          this.createField(
            "Threshold Triggered",
            ext.thresholdTriggered,
            "boolean",
          ),
          this.createField(
            "Conflict Detected",
            ext.conflictDetected,
            "boolean",
          ),
          ext.conflictReason
            ? this.createField(
                "Conflict Reason",
                ext.conflictReason,
                "textarea",
              )
            : null,
        ].filter((f): f is FormField => f !== null),
      });
    }

    // Classification Section
    sections.push({
      id: "classification",
      title: "Classification",
      fields: [
        riu.category
          ? this.createField("Category", riu.category.name, "text")
          : null,
        this.createField("Severity", riu.severity, "text"),
      ].filter((f): f is FormField => f !== null),
    });

    // Custom Fields Section (if any)
    const customSection = this.buildCustomFieldsSection(riu);
    if (customSection.fields.length > 0) {
      sections.push(customSection);
    }

    return sections;
  }

  /**
   * Build generic sections for other RIU types (fallback)
   */
  private buildGenericSections(
    riu: RiskIntelligenceUnit & {
      category?: { id: string; name: string; code: string | null } | null;
    },
  ): FormSection[] {
    const sections: FormSection[] = [];

    // Basic Information Section
    sections.push({
      id: "basic-info",
      title: "Report Information",
      fields: [
        this.createField("Reference Number", riu.referenceNumber, "text"),
        this.createField("Type", riu.type, "text"),
        this.createField(
          "Source Channel",
          this.formatSourceChannel(riu.sourceChannel),
          "text",
        ),
        this.createField("Created At", riu.createdAt, "datetime"),
        this.createField("Status", this.formatStatus(riu.status), "text"),
      ],
    });

    // Content Section
    sections.push({
      id: "content",
      title: "Details",
      fields: [
        this.createField("Details", riu.details, "textarea"),
        riu.summary
          ? this.createField("Summary", riu.summary, "textarea")
          : null,
      ].filter((f): f is FormField => f !== null),
    });

    // Classification Section
    sections.push({
      id: "classification",
      title: "Classification",
      fields: [
        riu.category
          ? this.createField("Category", riu.category.name, "text")
          : null,
        this.createField("Severity", riu.severity, "text"),
      ].filter((f): f is FormField => f !== null),
    });

    return sections;
  }

  /**
   * Build custom fields section from RIU customFields JSON
   */
  private buildCustomFieldsSection(riu: RiskIntelligenceUnit): FormSection {
    const fields: FormField[] = [];

    if (riu.customFields && typeof riu.customFields === "object") {
      const customData = riu.customFields as Record<string, unknown>;
      for (const [key, value] of Object.entries(customData)) {
        if (value !== null && value !== undefined && value !== "") {
          const label = this.formatFieldLabel(key);
          const fieldType = this.inferFieldType(value);
          fields.push(
            this.createField(
              label,
              value as string | number | boolean,
              fieldType,
            ),
          );
        }
      }
    }

    if (riu.formResponses && typeof riu.formResponses === "object") {
      const formData = riu.formResponses as Record<string, unknown>;
      for (const [key, value] of Object.entries(formData)) {
        if (value !== null && value !== undefined && value !== "") {
          const label = this.formatFieldLabel(key);
          const fieldType = this.inferFieldType(value);
          fields.push(
            this.createField(
              label,
              value as string | number | boolean,
              fieldType,
            ),
          );
        }
      }
    }

    return {
      id: "custom-fields",
      title: "Additional Information",
      fields,
    };
  }

  /**
   * Helper to create a form field
   */
  private createField(
    label: string,
    value: string | number | boolean | Date | null,
    type: FormFieldType,
  ): FormField {
    let formattedValue: string | string[] | number | boolean | null = null;

    if (value === null || value === undefined) {
      formattedValue = null;
    } else if (value instanceof Date) {
      formattedValue = value.toISOString();
    } else if (typeof value === "boolean") {
      formattedValue = value;
    } else if (typeof value === "number") {
      formattedValue = value;
    } else {
      formattedValue = String(value);
    }

    return { label, value: formattedValue, type };
  }

  /**
   * Build location field from RIU location fields
   */
  private buildLocationField(riu: RiskIntelligenceUnit): FormField | null {
    const parts = [
      riu.locationName,
      riu.locationAddress,
      riu.locationCity,
      riu.locationState,
      riu.locationZip,
      riu.locationCountry,
    ].filter((p) => p !== null && p !== undefined && p !== "");

    if (parts.length === 0) {
      return null;
    }

    return this.createField("Location", parts.join(", "), "text");
  }

  // Formatting helpers
  private formatSourceChannel(channel: string): string {
    const channelMap: Record<string, string> = {
      HOTLINE: "Phone",
      WEB_FORM: "Web Form",
      PROXY: "Proxy",
      DIRECT_ENTRY: "Direct Entry",
      CHATBOT: "Chatbot",
      EMAIL: "Email",
      FAX: "Fax",
    };
    return channelMap[channel] || channel;
  }

  private formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      PENDING_QA: "Pending QA",
      RELEASED: "Released",
      ARCHIVED: "Archived",
    };
    return statusMap[status] || status;
  }

  private formatReporterType(type: string): string {
    const typeMap: Record<string, string> = {
      ANONYMOUS: "Anonymous",
      IDENTIFIED: "Identified",
      CONFIDENTIAL: "Confidential",
    };
    return typeMap[type] || type;
  }

  private formatQaStatus(status: string): string {
    const statusMap: Record<string, string> = {
      PENDING: "Pending",
      APPROVED: "Approved",
      REJECTED: "Rejected",
      NEEDS_REVISION: "Needs Revision",
    };
    return statusMap[status] || status;
  }

  private formatDisclosureType(type: string): string {
    const typeMap: Record<string, string> = {
      COI: "Conflict of Interest",
      GIFT_ENTERTAINMENT: "Gift & Entertainment",
      OUTSIDE_ACTIVITY: "Outside Activity",
      RELATIONSHIP: "Relationship Disclosure",
      FINANCIAL_INTEREST: "Financial Interest",
      OTHER: "Other",
    };
    return typeMap[type] || type;
  }

  private formatCurrency(value: unknown, currency?: string | null): string {
    if (value === null || value === undefined) return "";
    const numValue =
      typeof value === "number" ? value : parseFloat(String(value));
    if (isNaN(numValue)) return String(value);
    const currencyCode = currency || "USD";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(numValue);
  }

  private formatFieldLabel(key: string): string {
    return key
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private inferFieldType(value: unknown): FormFieldType {
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "number") return "number";
    if (Array.isArray(value)) return "multiselect";
    if (typeof value === "string") {
      if (value.length > 100) return "textarea";
      if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return "datetime";
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return "date";
    }
    return "text";
  }
}
