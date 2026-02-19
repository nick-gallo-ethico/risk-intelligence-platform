"use client";

/**
 * Project Card Component
 *
 * Displays implementation project summary in card format:
 * - Organization name and implementation type
 * - Status badge with color coding
 * - Target go-live date
 * - Health score percentage
 * - Current phase indicator
 */

import Link from "next/link";
import { Building2, Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ProjectCardProps {
  project: {
    id: string;
    type: string;
    status: string;
    currentPhase: string;
    healthScore: number;
    targetGoLiveDate: string | null;
    organization: { name: string };
  };
}

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  IN_PROGRESS:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  AT_RISK:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  ON_HOLD:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  COMPLETED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function formatType(type: string): string {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ");
}

function formatPhase(phase: string): string {
  return phase
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function ProjectCard({ project }: ProjectCardProps) {
  const healthColor =
    project.healthScore >= 80
      ? "text-green-600 dark:text-green-400"
      : project.healthScore >= 60
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";

  const healthBgColor =
    project.healthScore >= 80
      ? "bg-green-500"
      : project.healthScore >= 60
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <Link
      href={`/internal/implementation/${project.id}`}
      className="block p-5 bg-card border rounded-lg hover:shadow-md transition-shadow group"
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {project.organization.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {formatType(project.type)}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium",
            STATUS_COLORS[project.status] || STATUS_COLORS.NOT_STARTED,
          )}
        >
          {formatStatus(project.status)}
        </span>
      </div>

      {/* Health score bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground">Health Score</span>
          <span className={cn("font-semibold", healthColor)}>
            {project.healthScore}%
          </span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", healthBgColor)}
            style={{ width: `${project.healthScore}%` }}
          />
        </div>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {project.targetGoLiveDate
                ? format(new Date(project.targetGoLiveDate), "MMM d, yyyy")
                : "TBD"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
          <span className="text-xs uppercase tracking-wide">
            {formatPhase(project.currentPhase)}
          </span>
          <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
