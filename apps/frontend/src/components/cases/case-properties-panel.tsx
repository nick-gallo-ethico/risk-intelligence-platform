"use client";

import { useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import {
  CollapsiblePropertyCard,
  type PropertyField,
} from "@/components/record-detail/CollapsiblePropertyCard";
import { CategorySelector } from "@/components/record-detail/CategorySelector";
import { apiClient } from "@/lib/api";
import type {
  Case,
  CaseStatus,
  RiskLevel,
  RegulatoryFramework,
  Severity,
  SourceChannel,
  UpdateCaseInput,
} from "@/types/case";

/** Collapsible state for each property card section */
interface CollapsibleStates {
  aboutOpen: boolean;
  setAboutOpen: (open: boolean) => void;
  intakeOpen: boolean;
  setIntakeOpen: (open: boolean) => void;
  classificationOpen: boolean;
  setClassificationOpen: (open: boolean) => void;
}

interface CasePropertiesPanelProps {
  caseData: Case | null;
  isLoading: boolean;
  onUpdate?: (updatedCase: Case) => void;
  /** Optional externally-controlled collapsible state (for localStorage persistence) */
  collapsibleStates?: CollapsibleStates;
}

const STATUS_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
];

const SEVERITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const SOURCE_CHANNEL_OPTIONS = [
  { value: "HOTLINE", label: "Hotline" },
  { value: "WEB_FORM", label: "Web Form" },
  { value: "PROXY", label: "Proxy" },
  { value: "DIRECT_ENTRY", label: "Direct Entry" },
  { value: "CHATBOT", label: "Chatbot" },
];

const RISK_LEVEL_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const RISK_LEVEL_COLORS: Record<string, string> = {
  LOW: "bg-green-100 text-green-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

/** Predefined regulatory framework options per spec Section 14.6 */
const REGULATORY_FRAMEWORK_OPTIONS: Array<{
  value: RegulatoryFramework;
  label: string;
}> = [
  { value: "HIPAA", label: "HIPAA" },
  { value: "SOX", label: "SOX" },
  { value: "GDPR", label: "GDPR" },
  { value: "OSHA", label: "OSHA" },
  { value: "STATE_PRIVACY_LAW", label: "State Privacy Law" },
  { value: "OTHER", label: "Other" },
];

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSourceChannel(
  channel: SourceChannel | null | undefined,
): string {
  if (!channel) return "";
  return channel
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * CasePropertiesPanel - Left sidebar property cards for case detail.
 *
 * Restructured into 3 collapsible cards per spec Sections 14.4-14.6:
 * - About This Case (expanded by default): Core case metadata
 * - Intake Information (collapsed by default): Reporter and intake details
 * - Classification (expanded by default): Tags and categorization
 *
 * Features:
 * - Inline editing for editable fields
 * - Read-only display for system fields
 * - Respects reporter anonymity (hides PII when anonymous)
 */
export function CasePropertiesPanel({
  caseData,
  isLoading,
  onUpdate,
  collapsibleStates,
}: CasePropertiesPanelProps) {
  const updateCase = useCallback(
    async (field: keyof UpdateCaseInput, value: string | string[]) => {
      if (!caseData) return;

      try {
        const updatedCase = await apiClient.patch<Case>(
          `/cases/${caseData.id}`,
          { [field]: value },
        );
        toast.success("Case updated successfully");
        onUpdate?.(updatedCase);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update case";
        toast.error(message);
        throw error;
      }
    },
    [caseData, onUpdate],
  );

  // Handlers for category changes - must be before early returns (React hooks rule)
  const handlePrimaryCategoryChange = useCallback(
    async (categoryId: string | null) => {
      if (!caseData) return;
      try {
        const updatedCase = await apiClient.patch<Case>(
          `/cases/${caseData.id}`,
          {
            primaryCategoryId: categoryId,
            secondaryCategoryId: null,
          },
        );
        toast.success("Category updated");
        onUpdate?.(updatedCase);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update category";
        toast.error(message);
      }
    },
    [caseData, onUpdate],
  );

  const handleSecondaryCategoryChange = useCallback(
    async (categoryId: string | null) => {
      if (!caseData) return;
      try {
        const updatedCase = await apiClient.patch<Case>(
          `/cases/${caseData.id}`,
          { secondaryCategoryId: categoryId },
        );
        toast.success("Subcategory updated");
        onUpdate?.(updatedCase);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update subcategory";
        toast.error(message);
      }
    },
    [caseData, onUpdate],
  );

  if (isLoading) {
    return <CasePropertiesPanelSkeleton />;
  }

  if (!caseData) {
    return null;
  }

  // Get case owner name
  const caseOwnerName = caseData.assignedInvestigators?.[0]
    ? `${caseData.assignedInvestigators[0].firstName} ${caseData.assignedInvestigators[0].lastName}`
    : null;

  // About This Case fields (per spec Section 14.4)
  const aboutThisCaseFields: PropertyField[] = [
    {
      key: "status",
      label: "Status",
      value: caseData.status,
      type: "select",
      options: STATUS_OPTIONS,
      onChange: (value) => updateCase("status", value as CaseStatus),
      renderValue: (val) =>
        val ? <StatusBadge status={val as CaseStatus} /> : null,
    },
    {
      key: "severity",
      label: "Severity",
      value: caseData.severity,
      type: "select",
      options: SEVERITY_OPTIONS,
      onChange: (value) => updateCase("severity", value as Severity),
      renderValue: (val) =>
        val ? <SeverityBadge severity={val as Severity} /> : null,
    },
    {
      key: "priority",
      label: "Priority",
      value: (caseData as { priority?: string }).priority ?? null,
      type: "select",
      options: PRIORITY_OPTIONS,
      placeholder: "Not set",
    },
    {
      key: "caseType",
      label: "Case Type",
      value: caseData.caseType,
      type: "readonly",
      placeholder: "Not specified",
    },
    {
      key: "sourceChannel",
      label: "Source Channel",
      value: caseData.sourceChannel
        ? formatSourceChannel(caseData.sourceChannel)
        : null,
      type: "readonly",
      placeholder: "Not specified",
    },
    {
      key: "openDate",
      label: "Open Date",
      value: formatDate(caseData.createdAt),
      type: "readonly",
    },
    {
      key: "targetCloseDate",
      label: "Target Close Date",
      value: formatDate(
        (caseData as { targetCloseDate?: string }).targetCloseDate,
      ),
      type: "date",
      editable: true,
      placeholder: "Not set",
    },
    {
      key: "slaDueDate",
      label: "SLA Due Date",
      value: formatDate(caseData.slaDueAt),
      type: "readonly",
      placeholder: "Not set",
    },
    {
      key: "caseOwner",
      label: "Case Owner",
      value: caseOwnerName,
      type: "readonly",
      placeholder: "Unassigned",
    },
    {
      key: "department",
      label: "Department",
      value: (caseData as { department?: string }).department ?? null,
      type: "text",
      editable: true,
      placeholder: "Not specified",
    },
  ];

  // Intake Information fields (per spec Section 14.5)
  const intakeFields: PropertyField[] = [
    {
      key: "reporterType",
      label: "Reporter Type",
      value: caseData.reporterType,
      type: "readonly",
      placeholder: "Not specified",
    },
    {
      key: "reporterName",
      label: "Reporter Name",
      value: caseData.reporterAnonymous ? "Anonymous" : caseData.reporterName,
      type: caseData.reporterAnonymous ? "readonly" : "text",
      editable: !caseData.reporterAnonymous,
      onChange: (value) => updateCase("reporterName", value as string),
      placeholder: "Not provided",
    },
    {
      key: "reporterEmail",
      label: "Reporter Email",
      value: caseData.reporterAnonymous ? "Hidden" : caseData.reporterEmail,
      type: caseData.reporterAnonymous ? "readonly" : "text",
      editable: !caseData.reporterAnonymous,
      onChange: (value) => updateCase("reporterEmail", value as string),
      placeholder: "Not provided",
    },
    {
      key: "reporterPhone",
      label: "Reporter Phone",
      value: caseData.reporterAnonymous ? "Hidden" : caseData.reporterPhone,
      type: caseData.reporterAnonymous ? "readonly" : "text",
      editable: !caseData.reporterAnonymous,
      onChange: (value) => updateCase("reporterPhone", value as string),
      placeholder: "Not provided",
    },
    {
      key: "accessCode",
      label: "Access Code",
      value:
        (caseData as { anonymousAccessCode?: string }).anonymousAccessCode ??
        null,
      type: "readonly",
      placeholder: "N/A",
    },
    {
      key: "incidentDate",
      label: "Incident Date",
      value: formatDate((caseData as { incidentDate?: string }).incidentDate),
      type: "date",
      editable: true,
      placeholder: "Not specified",
    },
    {
      key: "incidentLocation",
      label: "Incident Location",
      value:
        (caseData as { incidentLocation?: string }).incidentLocation ?? null,
      type: "text",
      editable: true,
      placeholder: "Not specified",
    },
    {
      key: "locationCity",
      label: "Location City",
      value: caseData.locationCity,
      type: "text",
      editable: true,
      onChange: (value) => updateCase("locationCity", value as string),
      placeholder: "Not specified",
    },
    {
      key: "locationState",
      label: "Location State",
      value: caseData.locationState,
      type: "text",
      editable: true,
      onChange: (value) => updateCase("locationState", value as string),
      placeholder: "Not specified",
    },
    {
      key: "locationCountry",
      label: "Location Country",
      value: caseData.locationCountry,
      type: "text",
      editable: true,
      onChange: (value) => updateCase("locationCountry", value as string),
      placeholder: "Not specified",
    },
    {
      key: "intakeTimestamp",
      label: "Intake Time",
      value: formatDateTime(caseData.intakeTimestamp),
      type: "readonly",
    },
  ];

  // Classification fields (per spec Section 14.6)
  // Uses CategorySelector for primary/subcategory, plus Tags, Risk Level, Regulatory Framework
  const classificationFields: PropertyField[] = [
    {
      key: "tags",
      label: "Tags",
      value: caseData.tags,
      type: "tags",
      editable: true,
      onChange: (value) => updateCase("tags", value as string[]),
      placeholder: "No tags",
    },
    {
      key: "riskLevel",
      label: "Risk Level",
      value: caseData.riskLevel ?? null,
      type: "select",
      options: RISK_LEVEL_OPTIONS,
      onChange: (value) => updateCase("riskLevel", value as RiskLevel),
      renderValue: (val) => {
        if (!val || typeof val !== "string") return null;
        const colorClass =
          RISK_LEVEL_COLORS[val] ?? "bg-gray-100 text-gray-800";
        const label =
          RISK_LEVEL_OPTIONS.find((o) => o.value === val)?.label ?? val;
        return (
          <Badge
            variant="outline"
            className={`${colorClass} border-0 text-xs font-medium`}
          >
            {label}
          </Badge>
        );
      },
      placeholder: "Not assessed",
    },
    {
      key: "regulatoryFrameworks",
      label: "Regulatory",
      value: caseData.regulatoryFrameworks ?? [],
      type: "tags",
      editable: true,
      onChange: (value) =>
        updateCase("regulatoryFrameworks", value as RegulatoryFramework[]),
      placeholder: "None selected",
    },
  ];

  return (
    <div className="space-y-3 p-4">
      {/* About This Case (expanded by default) */}
      <CollapsiblePropertyCard
        title="About This Case"
        fields={aboutThisCaseFields}
        defaultCollapsed={false}
        isOpen={collapsibleStates?.aboutOpen}
        onOpenChange={collapsibleStates?.setAboutOpen}
        showSettingsGear={false}
      />

      {/* Intake Information (collapsed by default) */}
      <CollapsiblePropertyCard
        title="Intake Information"
        fields={intakeFields}
        defaultCollapsed={true}
        isOpen={collapsibleStates?.intakeOpen}
        onOpenChange={collapsibleStates?.setIntakeOpen}
        showSettingsGear={false}
      />

      {/* Classification (expanded by default) - per spec Section 14.6 */}
      <CollapsiblePropertyCard
        title="Classification"
        fields={classificationFields}
        defaultCollapsed={false}
        isOpen={collapsibleStates?.classificationOpen}
        onOpenChange={collapsibleStates?.setClassificationOpen}
        showSettingsGear={false}
      >
        {/* CategorySelector rendered as custom children above the standard fields */}
        <div className="pb-2 border-b border-gray-100">
          <CategorySelector
            primaryCategoryId={caseData.categoryId}
            secondaryCategoryId={caseData.secondaryCategoryId}
            onPrimaryCategoryChange={handlePrimaryCategoryChange}
            onSecondaryCategoryChange={handleSecondaryCategoryChange}
          />
        </div>
      </CollapsiblePropertyCard>
    </div>
  );
}

/**
 * Skeleton loader for CasePropertiesPanel
 */
export function CasePropertiesPanelSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map((section) => (
        <Card key={section}>
          <CardHeader className="pb-2 py-3 px-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-28" />
            </div>
          </CardHeader>
          <CardContent className="pt-2 px-4 pb-3 space-y-2">
            {[1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="flex justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
