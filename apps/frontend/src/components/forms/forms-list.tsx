"use client";

/**
 * Forms List Component
 *
 * Displays a filterable table of form definitions.
 * Supports type filtering via tabs and displays form metadata.
 */

import React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { FormDefinition, FormType, FormStatus } from "@/lib/forms-api";

/**
 * Status badge colors and labels.
 */
const STATUS_CONFIG: Record<
  FormStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  PUBLISHED: { label: "Published", variant: "default" },
  DRAFT: { label: "Draft", variant: "secondary" },
  ARCHIVED: { label: "Archived", variant: "outline" },
};

/**
 * Type labels for display.
 */
const TYPE_LABELS: Record<FormType, string> = {
  DISCLOSURE: "Disclosure",
  ATTESTATION: "Attestation",
  SURVEY: "Survey",
  INTAKE: "Intake Form",
  WORKFLOW_TASK: "Workflow",
  CUSTOM: "Custom",
};

/**
 * Tab options for type filtering.
 */
const TYPE_TABS: { value: string; label: string; type?: FormType }[] = [
  { value: "all", label: "All Forms" },
  { value: "disclosure", label: "Disclosures", type: "DISCLOSURE" },
  { value: "attestation", label: "Attestations", type: "ATTESTATION" },
  { value: "survey", label: "Surveys", type: "SURVEY" },
  { value: "intake", label: "Intake", type: "INTAKE" },
  { value: "custom", label: "Custom", type: "CUSTOM" },
];

interface FormsListProps {
  forms: FormDefinition[];
  isLoading: boolean;
  onTypeFilter: (type?: FormType) => void;
  activeType?: FormType;
}

/**
 * Loading skeleton for forms table.
 */
function FormsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[80px]" />
          <Skeleton className="h-4 w-[60px]" />
          <Skeleton className="h-4 w-[120px]" />
        </div>
      ))}
    </div>
  );
}

export function FormsList({
  forms,
  isLoading,
  onTypeFilter,
  activeType,
}: FormsListProps) {
  const router = useRouter();

  // Determine active tab value from type
  const activeTab =
    TYPE_TABS.find((t) => t.type === activeType)?.value || "all";

  const handleTabChange = (value: string) => {
    const tab = TYPE_TABS.find((t) => t.value === value);
    onTypeFilter(tab?.type);
  };

  const handleRowClick = (form: FormDefinition) => {
    router.push(`/forms/${form.id}`);
  };

  return (
    <div className="space-y-4">
      {/* Type Filter Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          {TYPE_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Forms Table */}
      {isLoading ? (
        <FormsTableSkeleton />
      ) : forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            No forms found
            {activeType ? ` for type ${TYPE_LABELS[activeType]}` : ""}.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Create a new form to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Name</TableHead>
                <TableHead className="w-[120px]">Type</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[80px]">Version</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => (
                <TableRow
                  key={form.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(form)}
                >
                  <TableCell className="font-medium">
                    <div>
                      <p className="font-medium">{form.name}</p>
                      {form.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-[280px]">
                          {form.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{TYPE_LABELS[form.type]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_CONFIG[form.status].variant}>
                      {STATUS_CONFIG[form.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    v{form.version}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(form.updatedAt), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
