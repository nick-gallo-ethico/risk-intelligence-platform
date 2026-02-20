"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import { handleApiError } from "@/lib/api-error-handler";

/**
 * Field type determines how the value is rendered
 */
type FormFieldType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "date"
  | "datetime"
  | "boolean"
  | "number"
  | "currency";

/**
 * Form field with label, value, and type
 */
interface FormField {
  label: string;
  value: string | string[] | number | boolean | null;
  type: FormFieldType;
}

/**
 * Section grouping related fields
 */
interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
}

/**
 * API response for RIU form data
 */
interface RiuFormDataResponse {
  riuId: string;
  riuType: string;
  referenceNumber: string;
  sections: FormSection[];
}

interface LinkedRiuFormAnswersProps {
  /** The RIU ID to fetch form data for */
  riuId: string;
  /** Optional RIU type for context */
  riuType?: string;
  /** External loading state */
  isLoading?: boolean;
}

/**
 * Displays RIU intake form answers organized by collapsible sections.
 *
 * Features:
 * - Fetches form data from GET /rius/:id/form-data
 * - Collapsible sections for readability
 * - Different rendering for field types (textarea, boolean, dates, etc.)
 * - Loading and error states
 *
 * Used in the Overview tab of case detail to show original intake details.
 */
export function LinkedRiuFormAnswers({
  riuId,
  riuType,
  isLoading: externalLoading,
}: LinkedRiuFormAnswersProps) {
  const [formData, setFormData] = useState<RiuFormDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );

  // Fetch form data on mount
  useEffect(() => {
    if (!riuId) return;

    const fetchFormData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get<RiuFormDataResponse>(
          `/rius/${riuId}/form-data`,
        );
        setFormData(response);

        // Expand first section by default
        if (response.sections.length > 0) {
          setExpandedSections(new Set([response.sections[0].id]));
        }
      } catch (err) {
        handleApiError(err, "Failed to load form answers");
        setError("Failed to load intake details");
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();
  }, [riuId]);

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string, open: boolean) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (open) {
        next.add(sectionId);
      } else {
        next.delete(sectionId);
      }
      return next;
    });
  }, []);

  // Expand/collapse all sections
  const expandAll = useCallback(() => {
    if (formData) {
      setExpandedSections(new Set(formData.sections.map((s) => s.id)));
    }
  }, [formData]);

  const collapseAll = useCallback(() => {
    setExpandedSections(new Set());
  }, []);

  // Loading state
  if (loading || externalLoading) {
    return <LinkedRiuFormAnswersSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-red-600 bg-red-50 rounded-md">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  // Empty state
  if (!formData || formData.sections.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center bg-muted rounded-md">
        No intake form data available.
      </div>
    );
  }

  // Calculate if all are expanded
  const allExpanded = formData.sections.every((s) =>
    expandedSections.has(s.id),
  );

  return (
    <div className="space-y-2">
      {/* Expand/Collapse all control */}
      <div className="flex justify-end">
        <button
          onClick={allExpanded ? collapseAll : expandAll}
          className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
        >
          {allExpanded ? "Collapse All" : "Expand All"}
        </button>
      </div>

      {/* Sections */}
      {formData.sections.map((section) => (
        <Collapsible
          key={section.id}
          open={expandedSections.has(section.id)}
          onOpenChange={(open) => toggleSection(section.id, open)}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted hover:bg-accent rounded-md transition-colors group">
            <span className="font-medium text-sm text-foreground">
              {section.title}
            </span>
            <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground">
              <span className="text-xs">
                {section.fields.length} field
                {section.fields.length !== 1 && "s"}
              </span>
              {expandedSections.has(section.id) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-2">
            <div className="border-l-2 border-border pl-3 mt-2 space-y-2">
              {section.fields.map((field, idx) => (
                <FormFieldDisplay key={`${section.id}-${idx}`} field={field} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

/**
 * Renders a single form field with appropriate formatting
 */
function FormFieldDisplay({ field }: { field: FormField }) {
  return (
    <div className="py-1">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {field.label}
      </dt>
      <dd className="text-sm text-foreground mt-0.5">
        {renderFieldValue(field)}
      </dd>
    </div>
  );
}

/**
 * Renders field value based on type
 */
function renderFieldValue(field: FormField): React.ReactNode {
  const { value, type } = field;

  // Handle null/undefined
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">Not provided</span>;
  }

  // Handle different types
  switch (type) {
    case "boolean":
      return (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
            value
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-muted text-muted-foreground",
          )}
        >
          {value ? "Yes" : "No"}
        </span>
      );

    case "textarea":
      return (
        <div className="whitespace-pre-wrap text-sm text-foreground bg-muted rounded p-2 max-h-40 overflow-y-auto">
          {String(value)}
        </div>
      );

    case "date":
      try {
        return new Date(String(value)).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch {
        return String(value);
      }

    case "datetime":
      try {
        return new Date(String(value)).toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
      } catch {
        return String(value);
      }

    case "number":
      return typeof value === "number" ? value.toLocaleString() : String(value);

    case "currency":
      // Currency is already formatted by backend
      return String(value);

    case "multiselect":
      if (Array.isArray(value)) {
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((v, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-xs text-foreground"
              >
                {v}
              </span>
            ))}
          </div>
        );
      }
      return String(value);

    case "select":
    case "text":
    default:
      return String(value);
  }
}

/**
 * Skeleton loader for LinkedRiuFormAnswers
 */
export function LinkedRiuFormAnswersSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-10 w-full rounded-md" />
          {i === 1 && (
            <div className="pl-6 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-36" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
