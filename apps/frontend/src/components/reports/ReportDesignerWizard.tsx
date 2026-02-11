/**
 * ReportDesignerWizard Component
 *
 * A 5-step wizard for creating custom reports.
 * Steps: Data Source -> Fields -> Filters -> Visualization -> Save
 */
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Table,
  BarChart2,
  LineChart,
  PieChart,
  TrendingUp,
  Layers,
  Filter,
  Save,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { reportsApi } from "@/services/reports-api";
import { DataSourceSelector } from "./DataSourceSelector";
import { ReportFieldPicker } from "./ReportFieldPicker";
import { ReportFilterBuilder } from "./ReportFilterBuilder";
import type {
  SavedReport,
  ReportField,
  ReportFieldGroup,
  ReportFilter,
  ReportAggregation,
  CreateReportInput,
} from "@/types/reports";

// Step definitions
const STEPS = [
  { id: 1, name: "Data Source", description: "Choose your data source" },
  { id: 2, name: "Fields", description: "Select report columns" },
  { id: 3, name: "Filters", description: "Filter, group, and sort" },
  { id: 4, name: "Visualization", description: "Choose display format" },
  { id: 5, name: "Save", description: "Name and save your report" },
];

// Visualization type definitions
interface VisualizationType {
  type: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  suggestedFor?: string[];
}

const VISUALIZATION_TYPES: VisualizationType[] = [
  {
    type: "table",
    name: "Table",
    description: "Show data in rows and columns",
    icon: Table,
  },
  {
    type: "bar",
    name: "Bar Chart",
    description: "Compare values across categories",
    icon: BarChart2,
    suggestedFor: ["groupBy"],
  },
  {
    type: "line",
    name: "Line Chart",
    description: "Show trends over time",
    icon: LineChart,
    suggestedFor: ["date", "groupBy"],
  },
  {
    type: "pie",
    name: "Pie Chart",
    description: "Show proportions of a whole",
    icon: PieChart,
    suggestedFor: ["groupBy"],
  },
  {
    type: "kpi",
    name: "KPI",
    description: "Display a single key metric",
    icon: TrendingUp,
    suggestedFor: ["aggregation"],
  },
  {
    type: "stacked_bar",
    name: "Stacked Bar",
    description: "Compare categories with breakdown",
    icon: Layers,
    suggestedFor: ["multiGroupBy"],
  },
  {
    type: "funnel",
    name: "Funnel",
    description: "Show stage progression",
    icon: Filter,
    suggestedFor: ["status", "stage"],
  },
];

interface ReportDesignerWizardProps {
  templateId?: string;
  onSave: (report: SavedReport) => void;
  onCancel: () => void;
}

export function ReportDesignerWizard({
  templateId,
  onSave,
  onCancel,
}: ReportDesignerWizardProps) {
  // Wizard state
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Report configuration state
  const [entityType, setEntityType] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [aggregation, setAggregation] = useState<ReportAggregation | null>(
    null,
  );
  const [visualization, setVisualization] = useState("table");
  const [chartConfig, setChartConfig] = useState<Record<string, unknown>>({});
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("PRIVATE");

  // Field registry for the selected entity type
  const [fieldGroups, setFieldGroups] = useState<ReportFieldGroup[]>([]);

  // Flatten all fields
  const allFields = useMemo(() => {
    const fields: ReportField[] = [];
    fieldGroups.forEach((group) => {
      fields.push(...group.fields);
    });
    return fields;
  }, [fieldGroups]);

  // Groupable fields
  const groupableFields = useMemo(() => {
    return allFields.filter((f) => f.groupable);
  }, [allFields]);

  // Sortable fields
  const sortableFields = useMemo(() => {
    return allFields.filter((f) => f.sortable);
  }, [allFields]);

  // Load field registry when entity type changes
  useEffect(() => {
    if (!entityType) return;

    reportsApi
      .getFields(entityType)
      .then(setFieldGroups)
      .catch((err) => {
        console.error("Failed to load fields:", err);
        setFieldGroups([]);
      });
  }, [entityType]);

  // Load template if provided
  useEffect(() => {
    if (!templateId) return;

    setLoading(true);
    reportsApi
      .getReport(templateId)
      .then((template) => {
        setEntityType(template.entityType);
        setSelectedFields(template.columns || []);
        setFilters(template.filters || []);
        setGroupBy(template.groupBy || []);
        setAggregation(template.aggregation || null);
        setVisualization(template.visualization || "table");
        setChartConfig(template.chartConfig || {});
        setSortBy(template.sortBy || null);
        setSortOrder(template.sortOrder || "desc");
        // Don't copy name/description for templates
        if (!template.isTemplate) {
          setName(template.name);
          setDescription(template.description || "");
        }
      })
      .catch((err) => {
        console.error("Failed to load template:", err);
      })
      .finally(() => setLoading(false));
  }, [templateId]);

  // Can proceed to next step?
  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        return entityType !== null;
      case 2:
        return selectedFields.length >= 1;
      case 3:
        return true; // Filters are optional
      case 4:
        return true; // Visualization has default
      case 5:
        return name.trim().length > 0;
      default:
        return false;
    }
  }, [step, entityType, selectedFields.length, name]);

  // Suggested visualization based on configuration
  const suggestedVisualization = useMemo(() => {
    if (groupBy.length > 0) {
      return "bar";
    }
    if (aggregation) {
      return "kpi";
    }
    return "table";
  }, [groupBy, aggregation]);

  const handleNext = () => {
    if (step < 5 && canProceed) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleStepClick = (targetStep: number) => {
    // Can only click on completed steps or current step
    if (targetStep <= step) {
      setStep(targetStep);
    }
  };

  const handleSave = useCallback(
    async (runAfterSave = false) => {
      if (!entityType || !name.trim()) return;

      setSaving(true);
      try {
        const input: CreateReportInput = {
          name: name.trim(),
          description: description.trim() || undefined,
          entityType,
          columns: selectedFields,
          filters: filters.length > 0 ? filters : undefined,
          groupBy: groupBy.length > 0 ? groupBy : undefined,
          aggregation: aggregation || undefined,
          visualization,
          chartConfig:
            Object.keys(chartConfig).length > 0 ? chartConfig : undefined,
          sortBy: sortBy || undefined,
          sortOrder,
          visibility,
        };

        const saved = await reportsApi.createReport(input);
        onSave(saved);

        // If runAfterSave is true, the parent will handle navigation with auto-run
        // This is handled by the onSave callback
      } catch (err) {
        console.error("Failed to save report:", err);
        // TODO: Show error toast
      } finally {
        setSaving(false);
      }
    },
    [
      entityType,
      name,
      description,
      selectedFields,
      filters,
      groupBy,
      aggregation,
      visualization,
      chartConfig,
      sortBy,
      sortOrder,
      visibility,
      onSave,
    ],
  );

  const handleGroupByChange = (fieldId: string, checked: boolean) => {
    if (checked) {
      setGroupBy([...groupBy, fieldId].slice(0, 3)); // Max 3 group by fields
    } else {
      setGroupBy(groupBy.filter((id) => id !== fieldId));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Step indicator */}
      <nav aria-label="Progress" className="mb-8">
        <ol className="flex items-center justify-center">
          {STEPS.map((s, index) => (
            <li
              key={s.id}
              className={cn(
                "flex items-center",
                index !== STEPS.length - 1 && "flex-1",
              )}
            >
              <button
                type="button"
                onClick={() => handleStepClick(s.id)}
                disabled={s.id > step}
                className={cn(
                  "flex items-center gap-2 group",
                  s.id <= step
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-50",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                    s.id < step
                      ? "bg-primary text-primary-foreground"
                      : s.id === step
                        ? "border-2 border-primary text-primary"
                        : "border-2 border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {s.id < step ? <Check className="h-4 w-4" /> : s.id}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium hidden sm:block",
                    s.id === step
                      ? "text-primary"
                      : s.id < step
                        ? "text-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  {s.name}
                </span>
              </button>
              {index !== STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-4 h-0.5 flex-1",
                    s.id < step ? "bg-primary" : "bg-muted-foreground/30",
                  )}
                />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Step content */}
      <div className="flex-1 overflow-auto">
        {/* Step 1: Data Source */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold">
                Choose the type of data you want to report on
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Select a data source to build your report
              </p>
            </div>
            <DataSourceSelector
              selectedEntityType={entityType}
              onSelect={setEntityType}
            />
          </div>
        )}

        {/* Step 2: Fields */}
        {step === 2 && entityType && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold">
                Select the fields to include in your report
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose and order the columns that will appear in your report
              </p>
            </div>
            <ReportFieldPicker
              entityType={entityType}
              selectedFields={selectedFields}
              onFieldsChange={setSelectedFields}
            />
          </div>
        )}

        {/* Step 3: Filters */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold">
                Add filters, grouping, and sorting (optional)
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Customize how your data is filtered and organized
              </p>
            </div>

            {/* Filter Builder */}
            <ReportFilterBuilder
              fields={allFields}
              filters={filters}
              onFiltersChange={setFilters}
            />

            {/* Group By Section */}
            {groupableFields.length > 0 && (
              <div className="border rounded-lg p-4 mt-6">
                <h3 className="font-medium text-sm mb-3">Group By</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Select up to 3 fields to group your results
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {groupableFields.slice(0, 12).map((field) => (
                    <label
                      key={field.id}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors",
                        groupBy.includes(field.id)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={groupBy.includes(field.id)}
                        onChange={(e) =>
                          handleGroupByChange(field.id, e.target.checked)
                        }
                        disabled={
                          groupBy.length >= 3 && !groupBy.includes(field.id)
                        }
                        className="rounded"
                      />
                      <span className="text-sm truncate">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Sort Section */}
            {sortableFields.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-sm mb-3">Sort Results</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Select
                      value={sortBy || ""}
                      onValueChange={(v) => setSortBy(v || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field to sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No sorting</SelectItem>
                        {sortableFields.map((field) => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-[140px]">
                    <Select
                      value={sortOrder}
                      onValueChange={(v) => setSortOrder(v as "asc" | "desc")}
                      disabled={!sortBy}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Visualization */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold">
                Choose how to display your results
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Select a visualization type for your report
                {suggestedVisualization !== "table" && (
                  <span className="block mt-1">
                    Based on your configuration, we suggest:{" "}
                    <strong>
                      {
                        VISUALIZATION_TYPES.find(
                          (v) => v.type === suggestedVisualization,
                        )?.name
                      }
                    </strong>
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {VISUALIZATION_TYPES.map((viz) => {
                const Icon = viz.icon;
                const isSelected = visualization === viz.type;
                const isSuggested = viz.type === suggestedVisualization;

                return (
                  <Card
                    key={viz.type}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      isSelected
                        ? "border-primary ring-2 ring-primary/20"
                        : "hover:border-muted-foreground/30",
                    )}
                    onClick={() => setVisualization(viz.type)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center gap-2">
                        <div
                          className={cn(
                            "p-3 rounded-lg",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3
                            className={cn(
                              "font-medium text-sm",
                              isSelected && "text-primary",
                            )}
                          >
                            {viz.name}
                          </h3>
                          {isSuggested && !isSelected && (
                            <span className="text-xs text-primary">
                              Suggested
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {viz.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Preview placeholder */}
            <div className="border rounded-lg p-8 text-center bg-muted/20">
              <p className="text-muted-foreground">
                Preview will appear here when report is saved and run
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Save */}
        {step === 5 && (
          <div className="max-w-lg mx-auto space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold">
                Name your report and choose who can see it
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Give your report a descriptive name and set visibility
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="report-name">
                  Report Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="report-name"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 100))}
                  placeholder="e.g., Open Cases by Category"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  {name.length}/100 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="report-description">Description</Label>
                <Textarea
                  id="report-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  placeholder="Optional description of what this report shows..."
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {description.length}/500 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label>Visibility</Label>
                <RadioGroup
                  value={visibility}
                  onValueChange={setVisibility}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="PRIVATE" id="visibility-private" />
                    <Label
                      htmlFor="visibility-private"
                      className="font-normal cursor-pointer"
                    >
                      <span className="font-medium">Private</span>
                      <span className="text-muted-foreground ml-2">
                        - Only you can see this report
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="TEAM" id="visibility-team" />
                    <Label
                      htmlFor="visibility-team"
                      className="font-normal cursor-pointer"
                    >
                      <span className="font-medium">Team</span>
                      <span className="text-muted-foreground ml-2">
                        - Your team members can view
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="EVERYONE" id="visibility-everyone" />
                    <Label
                      htmlFor="visibility-everyone"
                      className="font-normal cursor-pointer"
                    >
                      <span className="font-medium">Everyone</span>
                      <span className="text-muted-foreground ml-2">
                        - All organization members can view
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between pt-6 mt-6 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>

        <div className="flex items-center gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}

          {step < 5 ? (
            <Button onClick={handleNext} disabled={!canProceed}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={!canProceed || saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Report
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={!canProceed || saving}
              >
                <Play className="h-4 w-4 mr-2" />
                Save & Run
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
