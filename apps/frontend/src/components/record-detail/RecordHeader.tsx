"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

/**
 * Status color configuration for case status badges
 */
const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  NEW: { bg: "bg-blue-100", text: "text-blue-800", label: "New" },
  OPEN: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Open" },
  ACTIVE: { bg: "bg-green-100", text: "text-green-800", label: "Active" },
  ASSIGNED: { bg: "bg-indigo-100", text: "text-indigo-800", label: "Assigned" },
  REVIEW: { bg: "bg-purple-100", text: "text-purple-800", label: "Review" },
  CLOSED: { bg: "bg-gray-100", text: "text-gray-800", label: "Closed" },
  ARCHIVED: { bg: "bg-gray-200", text: "text-gray-600", label: "Archived" },
};

/**
 * Severity color configuration
 */
const SEVERITY_CONFIG: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  LOW: { bg: "bg-green-100", text: "text-green-800", label: "Low" },
  MEDIUM: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Medium" },
  HIGH: { bg: "bg-orange-100", text: "text-orange-800", label: "High" },
  CRITICAL: { bg: "bg-red-100", text: "text-red-800", label: "Critical" },
};

interface AssignedUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface RecordHeaderProps {
  /** Reference number to display (e.g., "CASE-2026-00142") */
  referenceNumber: string;
  /** Current status (e.g., "NEW", "OPEN", "CLOSED") */
  status: string;
  /** Current severity (e.g., "LOW", "MEDIUM", "HIGH", "CRITICAL") */
  severity: string;
  /** Primary category name */
  category?: string;
  /** Date the record was opened/created (formatted for display) */
  openDate: string;
  /** Case age text (e.g., "Open for 29 days" or "Closed after 14 days") */
  caseAge: string;
  /** Users assigned to this record */
  assignedTo: AssignedUser[];
  /** Callback when copy button is clicked */
  onCopyReference?: () => void;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * RecordHeader - Top of left sidebar showing case identity.
 *
 * Displays:
 * - Reference number (large bold text + copy icon)
 * - Status badge (colored pill)
 * - Severity badge (colored pill)
 * - Category (text)
 * - Open date
 * - Case age
 * - Assigned users (avatar stack)
 *
 * Per spec Section 14.1.
 */
export function RecordHeader({
  referenceNumber,
  status,
  severity,
  category,
  openDate,
  caseAge,
  assignedTo,
  onCopyReference,
  isLoading = false,
}: RecordHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyReference = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referenceNumber);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
      onCopyReference?.();
    } catch (error) {
      console.error("Failed to copy reference number:", error);
      toast.error("Failed to copy");
    }
  }, [referenceNumber, onCopyReference]);

  if (isLoading) {
    return <RecordHeaderSkeleton />;
  }

  const statusConfig = STATUS_CONFIG[status.toUpperCase()] ?? {
    bg: "bg-gray-100",
    text: "text-gray-800",
    label: status,
  };

  const severityConfig = severity
    ? (SEVERITY_CONFIG[severity.toUpperCase()] ?? {
        bg: "bg-gray-100",
        text: "text-gray-800",
        label: severity,
      })
    : null;

  // Get initials from name
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white p-4">
      {/* Reference Number with Copy Button */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-bold text-gray-900 font-mono">
          {referenceNumber}
        </h2>
        <button
          onClick={handleCopyReference}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
          aria-label="Copy reference number"
          title="Copy reference number"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          )}
        </button>
      </div>

      {/* Status and Severity Badges */}
      <div className="flex items-center gap-2 mb-4">
        <Badge
          variant="outline"
          className={cn(
            statusConfig.bg,
            statusConfig.text,
            "border-transparent text-xs font-semibold",
          )}
        >
          {statusConfig.label}
        </Badge>
        {severityConfig && (
          <Badge
            variant="outline"
            className={cn(
              severityConfig.bg,
              severityConfig.text,
              "border-transparent text-xs font-semibold",
            )}
          >
            {severityConfig.label}
          </Badge>
        )}
      </div>

      {/* Info Details */}
      <div className="space-y-2 text-sm">
        {/* Category */}
        {category && (
          <div className="text-gray-700 font-medium">{category}</div>
        )}

        {/* Open Date */}
        <div className="text-gray-500">
          <span className="text-gray-400">Opened:</span>{" "}
          <span className="text-gray-700">{openDate}</span>
        </div>

        {/* Case Age */}
        <div className="text-gray-500">{caseAge}</div>

        {/* Assigned To */}
        {assignedTo.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-gray-400 text-xs">Assigned:</span>
            <div className="flex -space-x-2">
              {assignedTo.slice(0, 3).map((user) => (
                <Avatar
                  key={user.id}
                  className="w-6 h-6 border-2 border-white"
                  title={user.name}
                >
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="text-[10px] bg-gray-100">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {assignedTo.length > 3 && (
                <div
                  className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center"
                  title={`${assignedTo.length - 3} more`}
                >
                  <span className="text-[10px] text-gray-600 font-medium">
                    +{assignedTo.length - 3}
                  </span>
                </div>
              )}
            </div>
            {assignedTo.length <= 2 && (
              <span className="text-gray-700 text-xs truncate max-w-[120px]">
                {assignedTo.map((u) => u.name.split(" ")[0]).join(", ")}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for RecordHeader
 */
function RecordHeaderSkeleton() {
  return (
    <div className="bg-white p-4">
      {/* Reference Number */}
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Info Details */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-3 w-14" />
          <div className="flex -space-x-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
