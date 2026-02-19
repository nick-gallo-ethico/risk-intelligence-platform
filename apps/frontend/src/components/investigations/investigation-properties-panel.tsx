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
      className="w-full flex items-center justify-between py-3 px-1 hover:bg-muted rounded"
    >
      <div className="flex items-center gap-2">
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            expandedSections.includes(id) && "rotate-90",
          )}
        />
        {icon}
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <Settings2
        className="h-4 w-4 text-muted-foreground hover:text-foreground"
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
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge>{investigation.status?.replace("_", " ")}</Badge>
              </div>
              {investigation.statusRationale && (
                <div>
                  <span className="text-sm text-muted-foreground">
                    Rationale
                  </span>
                  <p className="text-sm text-foreground mt-1">
                    {investigation.statusRationale}
                  </p>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Type</span>
                <span className="text-sm text-foreground">
                  {investigation.type ||
                    investigation.investigationType ||
                    "Not set"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Department
                </span>
                <span className="text-sm text-foreground">
                  {investigation.department || "Not set"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  SLA Status
                </span>
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
            <User className="h-4 w-4 text-muted-foreground" />,
          )}
          {expandedSections.includes("assignment") && (
            <div className="px-6 pb-3 space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">
                  Primary Investigator
                </span>
                {assignedInvestigators[0] ? (
                  <p className="text-sm text-foreground">
                    {assignedInvestigators[0].firstName}{" "}
                    {assignedInvestigators[0].lastName}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Unassigned</p>
                )}
              </div>
              {assignedInvestigators.length > 1 && (
                <div>
                  <span className="text-sm text-muted-foreground">
                    Additional Investigators
                  </span>
                  <p className="text-sm text-foreground">
                    {assignedInvestigators
                      .slice(1)
                      .map((inv) => `${inv.firstName} ${inv.lastName}`)
                      .join(", ")}
                  </p>
                </div>
              )}
              {investigation.assignedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Assigned Date
                  </span>
                  <span className="text-sm text-foreground">
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
            <Calendar className="h-4 w-4 text-muted-foreground" />,
          )}
          {expandedSections.includes("timeline") && (
            <div className="px-6 pb-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Due Date</span>
                <span className="text-sm text-foreground">
                  {investigation.dueDate
                    ? new Date(investigation.dueDate).toLocaleDateString()
                    : "Not set"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm text-foreground">
                  {new Date(investigation.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Last Updated
                </span>
                <span className="text-sm text-foreground">
                  {new Date(investigation.updatedAt).toLocaleDateString()}
                </span>
              </div>
              {investigation.status === "CLOSED" && investigation.closedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Closed Date
                  </span>
                  <span className="text-sm text-foreground">
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
            <Clock className="h-4 w-4 text-muted-foreground" />,
          )}
          {expandedSections.includes("template") && (
            <div className="px-6 pb-3 space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Template</span>
                <p className="text-sm text-foreground">
                  {investigation.templateName || "No template applied"}
                </p>
              </div>
              {investigation.checklistProgress !== undefined && (
                <div>
                  <span className="text-sm text-muted-foreground">
                    Checklist Progress
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${investigation.checklistProgress}%` }}
                      />
                    </div>
                    <span className="text-sm text-foreground">
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
                  <span className="text-sm text-muted-foreground">Outcome</span>
                  <p className="text-sm text-foreground">
                    {investigation.outcome?.replace("_", " ") || "Pending"}
                  </p>
                </div>
                {investigation.rootCause && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Root Cause
                    </span>
                    <p className="text-sm text-foreground">
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
