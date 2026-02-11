"use client";

import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { toast } from "@/components/ui/toaster";
import { PropertySection } from "./property-section";
import { EditableField } from "./editable-field";
import { FileUpload, FileList } from "@/components/files";
import { apiClient } from "@/lib/api";
import { attachmentsApi } from "@/lib/attachments-api";
import type {
  Case,
  CaseStatus,
  Severity,
  SourceChannel,
  UpdateCaseInput,
} from "@/types/case";
import type { Attachment } from "@/types/attachment";

interface CasePropertiesPanelProps {
  caseData: Case | null;
  isLoading: boolean;
  onUpdate?: (updatedCase: Case) => void;
}

const STATUS_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
];

// Severity matches backend Prisma enum
const SEVERITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

const SOURCE_CHANNEL_OPTIONS = [
  { value: "HOTLINE", label: "Hotline" },
  { value: "WEB_FORM", label: "Web Form" },
  { value: "PROXY", label: "Proxy" },
  { value: "DIRECT_ENTRY", label: "Direct Entry" },
  { value: "CHATBOT", label: "Chatbot" },
];

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSourceChannel(channel: SourceChannel): string {
  return channel
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Left-side Case Properties Panel with inline editing.
 *
 * Features:
 * - Collapsible sections (Status & Classification, Intake, Reporter, Location, Metadata)
 * - Inline edit for editable fields (click to edit, save on blur/Enter, cancel on Escape)
 * - Read-only fields for reference number and timestamps
 * - Respects reporter anonymity (hides PII when anonymous)
 */
export function CasePropertiesPanel({
  caseData,
  isLoading,
  onUpdate,
}: CasePropertiesPanelProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // Fetch attachments when case data changes
  useEffect(() => {
    if (!caseData?.id) {
      setAttachments([]);
      return;
    }

    setAttachmentsLoading(true);
    attachmentsApi
      .getForEntity("CASE", caseData.id)
      .then((response) => {
        setAttachments(response.items);
      })
      .catch((err) => {
        console.error("Failed to fetch attachments:", err);
      })
      .finally(() => {
        setAttachmentsLoading(false);
      });
  }, [caseData?.id]);

  const handleAttachmentUploadComplete = useCallback(
    (attachment: Attachment) => {
      setAttachments((prev) => [...prev, attachment]);
      setShowUpload(false);
    },
    [],
  );

  const handleAttachmentDelete = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

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
        throw error; // Re-throw to keep edit mode open
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

  return (
    <div className="space-y-4 p-4">
      {/* Status & Classification Section */}
      <PropertySection title="Status & Classification">
        <EditableField
          label="Status"
          value={caseData.status}
          fieldType="select"
          options={STATUS_OPTIONS}
          onSave={(value) => updateCase("status", value as CaseStatus)}
          renderValue={(val) =>
            val ? <StatusBadge status={val as CaseStatus} /> : null
          }
        />
        <EditableField
          label="Severity"
          value={caseData.severity}
          fieldType="select"
          options={SEVERITY_OPTIONS}
          onSave={(value) => updateCase("severity", value as Severity)}
          renderValue={(val) =>
            val ? <SeverityBadge severity={val as Severity} /> : null
          }
        />
        <EditableField
          label="Severity Reason"
          value={caseData.severityReason}
          fieldType="text"
          placeholder="Not specified"
          onSave={(value) => updateCase("severityReason", value as string)}
        />
        <EditableField
          label="Tags"
          value={caseData.tags}
          fieldType="tags"
          placeholder="No tags"
          onSave={(value) => updateCase("tags", value as string[])}
        />
      </PropertySection>

      {/* Intake Information Section */}
      <PropertySection title="Intake Information">
        <EditableField
          label="Source"
          value={caseData.sourceChannel}
          fieldType="select"
          options={SOURCE_CHANNEL_OPTIONS}
          onSave={(value) =>
            updateCase("sourceChannel", value as SourceChannel)
          }
          renderValue={(val) =>
            val ? formatSourceChannel(val as SourceChannel) : null
          }
        />
        <EditableField
          label="Case Type"
          value={caseData.caseType}
          readOnly
          onSave={async () => {}}
        />
        <EditableField
          label="Intake Time"
          value={formatDate(caseData.intakeTimestamp)}
          readOnly
          onSave={async () => {}}
        />
      </PropertySection>

      {/* Reporter Information Section */}
      <PropertySection title="Reporter Information">
        <EditableField
          label="Reporter Type"
          value={caseData.reporterType}
          readOnly
          onSave={async () => {}}
        />
        <EditableField
          label="Anonymous"
          value={caseData.reporterAnonymous ? "Yes" : "No"}
          readOnly
          onSave={async () => {}}
        />
        {!caseData.reporterAnonymous && (
          <>
            <EditableField
              label="Name"
              value={caseData.reporterName}
              fieldType="text"
              placeholder="Not provided"
              onSave={(value) => updateCase("reporterName", value as string)}
            />
            <EditableField
              label="Email"
              value={caseData.reporterEmail}
              fieldType="text"
              placeholder="Not provided"
              onSave={(value) => updateCase("reporterEmail", value as string)}
            />
            <EditableField
              label="Phone"
              value={caseData.reporterPhone}
              fieldType="text"
              placeholder="Not provided"
              onSave={(value) => updateCase("reporterPhone", value as string)}
            />
          </>
        )}
      </PropertySection>

      {/* Location Section */}
      <PropertySection title="Location">
        <EditableField
          label="City"
          value={caseData.locationCity}
          fieldType="text"
          placeholder="Not specified"
          onSave={(value) => updateCase("locationCity", value as string)}
        />
        <EditableField
          label="State"
          value={caseData.locationState}
          fieldType="text"
          placeholder="Not specified"
          onSave={(value) => updateCase("locationState", value as string)}
        />
        <EditableField
          label="Country"
          value={caseData.locationCountry}
          fieldType="text"
          placeholder="Not specified"
          onSave={(value) => updateCase("locationCountry", value as string)}
        />
      </PropertySection>

      {/* Metadata Section (Read-only) */}
      <PropertySection title="Metadata">
        <EditableField
          label="Reference"
          value={caseData.referenceNumber}
          readOnly
          onSave={async () => {}}
        />
        <EditableField
          label="Created"
          value={formatDate(caseData.createdAt)}
          readOnly
          onSave={async () => {}}
        />
        <EditableField
          label="Updated"
          value={formatDate(caseData.updatedAt)}
          readOnly
          onSave={async () => {}}
        />
        {caseData.createdBy && (
          <EditableField
            label="Created By"
            value={`${caseData.createdBy.firstName} ${caseData.createdBy.lastName}`}
            readOnly
            onSave={async () => {}}
          />
        )}
      </PropertySection>

      {/* Attachments Section */}
      <PropertySection title={`Attachments (${attachments.length})`}>
        <div className="space-y-4">
          {showUpload ? (
            <div className="space-y-3">
              <FileUpload
                entityType="CASE"
                entityId={caseData.id}
                onUploadComplete={handleAttachmentUploadComplete}
                maxFiles={10}
              />
              <button
                onClick={() => setShowUpload(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add attachment
            </button>
          )}

          <FileList
            attachments={attachments}
            isLoading={attachmentsLoading}
            onDelete={handleAttachmentDelete}
          />
        </div>
      </PropertySection>
    </div>
  );
}

export function CasePropertiesPanelSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3, 4, 5, 6].map((section) => (
        <Card key={section}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            {[1, 2, 3].map((row) => (
              <div key={row} className="flex justify-between py-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
