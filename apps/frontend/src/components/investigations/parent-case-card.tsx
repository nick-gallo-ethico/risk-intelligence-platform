"use client";

import { FileText, ExternalLink } from "lucide-react";
import { AssociationCard } from "@/components/ui/association-card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface ParentCase {
  id: string;
  referenceNumber: string;
  status: string;
  severity: string;
  summary: string | null;
  categoryName: string | null;
  createdAt: string;
}

interface ParentCaseCardProps {
  caseData: ParentCase | null | undefined;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  OPEN: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  PENDING_REVIEW: "bg-purple-100 text-purple-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "bg-green-100 text-green-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

/**
 * ParentCaseCard - Shows the parent case that an investigation belongs to.
 *
 * Features:
 * - Displays case reference number, status, severity
 * - Shows category name and summary excerpt
 * - Clicking card navigates to case detail page
 * - "View case" link in footer
 * - Handles null/undefined caseData gracefully
 */
export function ParentCaseCard({ caseData }: ParentCaseCardProps) {
  if (!caseData) {
    return (
      <AssociationCard
        title="Parent Case"
        count={0}
        icon={FileText}
        collapsible={false}
      >
        <p className="text-sm text-gray-500 py-2">No parent case linked</p>
      </AssociationCard>
    );
  }

  return (
    <AssociationCard
      title="Parent Case"
      count={1}
      icon={FileText}
      viewAllHref={`/cases/${caseData.id}`}
      viewAllLabel="View case"
      collapsible={false}
    >
      <Link
        href={`/cases/${caseData.id}`}
        className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
      >
        {/* Reference number and status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <span className="font-medium text-gray-900">
              {caseData.referenceNumber}
            </span>
          </div>
          <Badge className={STATUS_COLORS[caseData.status] || "bg-gray-100"}>
            {caseData.status.replace("_", " ")}
          </Badge>
        </div>

        {/* Category */}
        {caseData.categoryName && (
          <p className="text-sm text-gray-600 mb-2">{caseData.categoryName}</p>
        )}

        {/* Summary */}
        {caseData.summary && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-2">
            {caseData.summary}
          </p>
        )}

        {/* Severity and date */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span>Severity:</span>
            <Badge
              variant="outline"
              className={`text-xs ${SEVERITY_COLORS[caseData.severity] || ""}`}
            >
              {caseData.severity}
            </Badge>
          </div>
          <span>
            Created: {new Date(caseData.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* View link indicator */}
        <div className="flex items-center justify-end mt-2 text-blue-600">
          <span className="text-xs mr-1">View case</span>
          <ExternalLink className="h-3 w-3" />
        </div>
      </Link>
    </AssociationCard>
  );
}
