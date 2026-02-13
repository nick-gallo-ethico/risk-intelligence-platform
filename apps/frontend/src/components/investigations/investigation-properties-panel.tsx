"use client";

import { useState } from "react";
import { ChevronRight, Settings2, Calendar, User, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Investigation } from "@/types/investigation";

interface InvestigationPropertiesPanelProps {
  investigation: Investigation;
  onUpdate?: (updates: Partial<Investigation>) => void;
}

type SectionId = "status" | "assignment" | "timeline" | "template" | "findings";

/**
 * Investigation properties panel for left sidebar.
 *
 * Displays collapsible sections for:
 * - Status & Classification (status, rationale, type, department, SLA)
 * - Assignment (primary investigator, additional investigators)
 * - Timeline (due date, created, updated, closed)
 * - Template & Checklist (template name, progress bar)
 * - Findings (outcome, root cause) - shown only for PENDING_REVIEW/CLOSED
 */
export function InvestigationPropertiesPanel({
  investigation,
  onUpdate,
}: InvestigationPropertiesPanelProps) {
  const [expandedSections, setExpandedSections] = useState<SectionId[]>([
    "status",
    "assignment",
  ]);

  const toggleSection = (section: SectionId) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section],
    );
  };

  const renderSectionHeader = (
    id: SectionId,
    title: string,
    icon?: React.ReactNode,
  ) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between py-3 px-1 hover:bg-gray-50 rounded"
    >
      <div className="flex items-center gap-2">
        <ChevronRight
          className={cn(
            "h-4 w-4 text-gray-500 transition-transform duration-200",
            expandedSections.includes(id) && "rotate-90",
          )}
        />
        {icon}
        <span className="text-sm font-semibold text-gray-900">{title}</span>
      </div>
      <Settings2
        className="h-4 w-4 text-gray-400 hover:text-gray-600"
        onClick={(e) => e.stopPropagation()}
      />
    </button>
  );

  const showFindings =
    investigation.status === "PENDING_REVIEW" ||
    investigation.status === "CLOSED";

  // Get assigned investigators
  const assignedInvestigators =
    investigation.assignedInvestigators ||
    (investigation.primaryInvestigator
      ? [investigation.primaryInvestigator]
      : []);

  return (
    <Card className="shadow-sm">
      <CardContent className="p-2 divide-y">
        {/* Status & Classification */}
        <div>
          {renderSectionHeader("status", "Status & Classification", null)}
          {expandedSections.includes("status") && (
            <div className="px-6 pb-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Status</span>
                <Badge>{investigation.status?.replace("_", " ")}</Badge>
              </div>
              {investigation.statusRationale && (
                <div>
                  <span className="text-sm text-gray-500">Rationale</span>
                  <p className="text-sm text-gray-700 mt-1">
                    {investigation.statusRationale}
                  </p>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Type</span>
                <span className="text-sm text-gray-900">
                  {investigation.type ||
                    investigation.investigationType ||
                    "Not set"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Department</span>
                <span className="text-sm text-gray-900">
                  {investigation.department || "Not set"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">SLA Status</span>
                <Badge
                  variant={
                    investigation.slaStatus === "OVERDUE"
                      ? "destructive"
                      : investigation.slaStatus === "WARNING"
                        ? "outline"
                        : "secondary"
                  }
                >
                  {investigation.slaStatus || "On Track"}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Assignment */}
        <div>
          {renderSectionHeader(
            "assignment",
            "Assignment",
            <User className="h-4 w-4 text-gray-400" />,
          )}
          {expandedSections.includes("assignment") && (
            <div className="px-6 pb-3 space-y-3">
              <div>
                <span className="text-sm text-gray-500">
                  Primary Investigator
                </span>
                {assignedInvestigators[0] ? (
                  <p className="text-sm text-gray-900">
                    {assignedInvestigators[0].firstName}{" "}
                    {assignedInvestigators[0].lastName}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">Unassigned</p>
                )}
              </div>
              {assignedInvestigators.length > 1 && (
                <div>
                  <span className="text-sm text-gray-500">
                    Additional Investigators
                  </span>
                  <p className="text-sm text-gray-900">
                    {assignedInvestigators
                      .slice(1)
                      .map((inv) => `${inv.firstName} ${inv.lastName}`)
                      .join(", ")}
                  </p>
                </div>
              )}
              {investigation.assignedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Assigned Date</span>
                  <span className="text-sm text-gray-900">
                    {new Date(investigation.assignedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div>
          {renderSectionHeader(
            "timeline",
            "Timeline",
            <Calendar className="h-4 w-4 text-gray-400" />,
          )}
          {expandedSections.includes("timeline") && (
            <div className="px-6 pb-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Due Date</span>
                <span className="text-sm text-gray-900">
                  {investigation.dueDate
                    ? new Date(investigation.dueDate).toLocaleDateString()
                    : "Not set"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Created</span>
                <span className="text-sm text-gray-900">
                  {new Date(investigation.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Last Updated</span>
                <span className="text-sm text-gray-900">
                  {new Date(investigation.updatedAt).toLocaleDateString()}
                </span>
              </div>
              {investigation.status === "CLOSED" && investigation.closedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Closed Date</span>
                  <span className="text-sm text-gray-900">
                    {new Date(investigation.closedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Template & Checklist */}
        <div>
          {renderSectionHeader(
            "template",
            "Template & Checklist",
            <Clock className="h-4 w-4 text-gray-400" />,
          )}
          {expandedSections.includes("template") && (
            <div className="px-6 pb-3 space-y-3">
              <div>
                <span className="text-sm text-gray-500">Template</span>
                <p className="text-sm text-gray-900">
                  {investigation.templateName || "No template applied"}
                </p>
              </div>
              {investigation.checklistProgress !== undefined && (
                <div>
                  <span className="text-sm text-gray-500">
                    Checklist Progress
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${investigation.checklistProgress}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-700">
                      {investigation.checklistProgress}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Findings (conditional) */}
        {showFindings && (
          <div>
            {renderSectionHeader("findings", "Findings", null)}
            {expandedSections.includes("findings") && (
              <div className="px-6 pb-3 space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Outcome</span>
                  <p className="text-sm text-gray-900">
                    {investigation.outcome?.replace("_", " ") || "Pending"}
                  </p>
                </div>
                {investigation.rootCause && (
                  <div>
                    <span className="text-sm text-gray-500">Root Cause</span>
                    <p className="text-sm text-gray-700">
                      {investigation.rootCause}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
