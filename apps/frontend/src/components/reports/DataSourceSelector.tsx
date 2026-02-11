/**
 * DataSourceSelector Component
 *
 * A grid of selectable cards for choosing which entity type (data source)
 * to report on. Each card shows an icon, name, and description.
 */
"use client";

import React from "react";
import {
  Briefcase,
  FileInput,
  Users,
  Megaphone,
  FileText,
  Shield,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReportEntityType } from "@/types/reports";

interface DataSource {
  type: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DATA_SOURCES: DataSource[] = [
  {
    type: ReportEntityType.CASES,
    name: "Cases",
    description:
      "Track and analyze case data including status, outcomes, and timelines",
    icon: Briefcase,
  },
  {
    type: ReportEntityType.RIUS,
    name: "Intake Reports (RIUs)",
    description: "Risk Intelligence Units from all intake channels",
    icon: FileInput,
  },
  {
    type: ReportEntityType.PERSONS,
    name: "People",
    description: "Employee and person data linked to cases and disclosures",
    icon: Users,
  },
  {
    type: ReportEntityType.CAMPAIGNS,
    name: "Campaigns",
    description: "Disclosure campaigns, attestations, and survey responses",
    icon: Megaphone,
  },
  {
    type: ReportEntityType.POLICIES,
    name: "Policies",
    description: "Policy documents, versions, and attestation compliance",
    icon: FileText,
  },
  {
    type: ReportEntityType.DISCLOSURES,
    name: "Disclosures",
    description: "Conflict of interest and disclosure submissions",
    icon: Shield,
  },
  {
    type: ReportEntityType.INVESTIGATIONS,
    name: "Investigations",
    description: "Investigation details, findings, and remediation plans",
    icon: Search,
  },
];

interface DataSourceSelectorProps {
  selectedEntityType: string | null;
  onSelect: (type: string) => void;
}

export function DataSourceSelector({
  selectedEntityType,
  onSelect,
}: DataSourceSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {DATA_SOURCES.map((source) => {
        const Icon = source.icon;
        const isSelected = selectedEntityType === source.type;

        return (
          <Card
            key={source.type}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              isSelected
                ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                : "hover:border-muted-foreground/30",
            )}
            onClick={() => onSelect(source.type)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className={cn(
                      "font-medium text-sm",
                      isSelected && "text-primary",
                    )}
                  >
                    {source.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {source.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
