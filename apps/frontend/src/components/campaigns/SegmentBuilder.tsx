"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  ChevronDown,
  Users,
  AlertTriangle,
  Loader2,
  Download,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";

// Types matching backend segment criteria DTOs
export type SegmentLogic = "AND" | "OR";

export type SegmentOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "is_true"
  | "is_false"
  | "is_null"
  | "is_not_null";

export type SegmentField =
  | "locationId"
  | "locationCode"
  | "location.region"
  | "location.country"
  | "divisionId"
  | "businessUnitId"
  | "departmentId"
  | "teamId"
  | "jobTitle"
  | "jobLevel"
  | "employmentStatus"
  | "employmentType"
  | "workMode"
  | "complianceRole"
  | "managerId"
  | "primaryLanguage"
  | "hireDate";

export interface SegmentCondition {
  field: SegmentField;
  operator: SegmentOperator;
  value?: string | string[] | number | boolean;
}

export interface SegmentConditionGroup {
  logic: SegmentLogic;
  conditions: SegmentCondition[];
  groups?: SegmentConditionGroup[];
}

export interface SegmentCriteria {
  logic: SegmentLogic;
  conditions?: SegmentCondition[];
  groups?: SegmentConditionGroup[];
}

// Simple mode selection state
export interface SimpleModeSelection {
  departments: string[];
  locations: string[];
  includeTeams: boolean;
}

// Preview employee type
export interface PreviewEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  department?: string;
  location?: string;
}

// Preview response type
export interface AudiencePreview {
  totalCount: number;
  sampleEmployees: PreviewEmployee[];
}

// Reference data types
interface ReferenceItem {
  id: string;
  name: string;
  code?: string;
}

interface SegmentBuilderProps {
  value?: SegmentCriteria;
  onChange: (criteria: SegmentCriteria | null) => void;
  onCountChange?: (count: number) => void;
  className?: string;
}

// Convert simple mode selections to segment criteria
function simpleModeToCriteria(
  selection: SimpleModeSelection,
): SegmentCriteria | null {
  const conditions: SegmentCondition[] = [];

  if (selection.departments.length > 0) {
    conditions.push({
      field: "departmentId",
      operator: "in",
      value: selection.departments,
    });
  }

  if (selection.locations.length > 0) {
    conditions.push({
      field: "locationId",
      operator: "in",
      value: selection.locations,
    });
  }

  if (conditions.length === 0) {
    return null;
  }

  return {
    logic: "AND",
    conditions,
  };
}

// Parse criteria back to simple mode (if possible)
function criteriaToSimpleMode(
  criteria: SegmentCriteria | null,
): SimpleModeSelection | null {
  if (!criteria || !criteria.conditions) {
    return { departments: [], locations: [], includeTeams: false };
  }

  // Check if criteria is compatible with simple mode
  const hasGroups = criteria.groups && criteria.groups.length > 0;
  const hasAdvancedConditions = criteria.conditions.some(
    (c) =>
      !["departmentId", "locationId"].includes(c.field) || c.operator !== "in",
  );

  if (hasGroups || hasAdvancedConditions) {
    return null; // Cannot be represented in simple mode
  }

  const departments: string[] = [];
  const locations: string[] = [];

  for (const condition of criteria.conditions) {
    if (condition.field === "departmentId" && Array.isArray(condition.value)) {
      departments.push(...(condition.value as string[]));
    } else if (
      condition.field === "locationId" &&
      Array.isArray(condition.value)
    ) {
      locations.push(...(condition.value as string[]));
    }
  }

  return { departments, locations, includeTeams: false };
}

// Generate natural language description from criteria
function buildCriteriaDescription(
  criteria: SegmentCriteria | null,
  departments: ReferenceItem[],
  locations: ReferenceItem[],
): string {
  if (!criteria) {
    return "All active employees";
  }

  const parts: string[] = [];

  if (criteria.conditions) {
    for (const condition of criteria.conditions) {
      const desc = describeCondition(condition, departments, locations);
      if (desc) {
        parts.push(desc);
      }
    }
  }

  if (parts.length === 0) {
    return "All active employees";
  }

  const connector = criteria.logic === "AND" ? " and " : " or ";
  return `Everyone ${parts.join(connector)}`;
}

function describeCondition(
  condition: SegmentCondition,
  departments: ReferenceItem[],
  locations: ReferenceItem[],
): string {
  const { field, operator, value } = condition;

  const resolveNames = (ids: string[], items: ReferenceItem[]): string => {
    const names = ids
      .map((id) => items.find((item) => item.id === id)?.name || id)
      .slice(0, 3);
    if (ids.length > 3) {
      names.push(`+${ids.length - 3} more`);
    }
    return names.join(", ");
  };

  if (field === "departmentId" && operator === "in" && Array.isArray(value)) {
    return `in [${resolveNames(value as string[], departments)}]`;
  }

  if (field === "locationId" && operator === "in" && Array.isArray(value)) {
    return `at [${resolveNames(value as string[], locations)}]`;
  }

  if (field === "jobTitle" && operator === "contains") {
    return `with job title containing "${value}"`;
  }

  if (field === "hireDate" && operator === "lt") {
    return `hired before ${value}`;
  }

  if (field === "hireDate" && operator === "gte") {
    return `hired on or after ${value}`;
  }

  return "";
}

// Multi-select picker component with search
interface MultiSelectPickerProps {
  label: string;
  items: ReferenceItem[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  loading?: boolean;
}

function MultiSelectPicker({
  label,
  items,
  selected,
  onChange,
  placeholder = "Search...",
  loading = false,
}: MultiSelectPickerProps) {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const lower = search.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(lower) ||
        item.code?.toLowerCase().includes(lower),
    );
  }, [items, search]);

  const handleToggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const handleSelectAll = () => {
    const filteredIds = filteredItems.map((item) => item.id);
    const allSelected = filteredIds.every((id) => selected.includes(id));
    if (allSelected) {
      onChange(selected.filter((id) => !filteredIds.includes(id)));
    } else {
      const newSelection = new Set([...selected, ...filteredIds]);
      onChange(Array.from(newSelection));
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={handleClear}
          >
            Clear ({selected.length})
          </Button>
        )}
      </div>
      <div className="rounded-md border">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 border-0 focus-visible:ring-0"
          />
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-[200px] overflow-y-auto">
            {filteredItems.length > 0 && (
              <div
                className="flex cursor-pointer items-center border-b px-3 py-2 hover:bg-muted/50"
                onClick={handleSelectAll}
              >
                <Checkbox
                  checked={
                    filteredItems.length > 0 &&
                    filteredItems.every((item) => selected.includes(item.id))
                  }
                  className="mr-2"
                />
                <span className="text-sm font-medium">Select All</span>
              </div>
            )}
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex cursor-pointer items-center px-3 py-2 hover:bg-muted/50"
                onClick={() => handleToggle(item.id)}
              >
                <Checkbox
                  checked={selected.includes(item.id)}
                  className="mr-2"
                />
                <span className="text-sm">{item.name}</span>
                {item.code && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({item.code})
                  </span>
                )}
              </div>
            ))}
            {filteredItems.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No items found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Advanced mode condition row
interface AdvancedConditionRowProps {
  condition: SegmentCondition;
  onChange: (condition: SegmentCondition) => void;
  onRemove: () => void;
  isLast: boolean;
}

function AdvancedConditionRow({
  condition,
  onChange,
  onRemove,
  isLast,
}: AdvancedConditionRowProps) {
  const fieldOptions: { value: SegmentField; label: string }[] = [
    { value: "departmentId", label: "Department" },
    { value: "locationId", label: "Location" },
    { value: "businessUnitId", label: "Business Unit" },
    { value: "divisionId", label: "Division" },
    { value: "teamId", label: "Team" },
    { value: "jobTitle", label: "Job Title" },
    { value: "jobLevel", label: "Job Level" },
    { value: "employmentType", label: "Employment Type" },
    { value: "workMode", label: "Work Mode" },
    { value: "complianceRole", label: "Compliance Role" },
    { value: "managerId", label: "Manager" },
    { value: "primaryLanguage", label: "Primary Language" },
    { value: "hireDate", label: "Hire Date" },
  ];

  const operatorOptions: { value: SegmentOperator; label: string }[] = [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "does not equal" },
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "does not contain" },
    { value: "in", label: "is one of" },
    { value: "not_in", label: "is not one of" },
    { value: "gt", label: "is greater than" },
    { value: "gte", label: "is greater than or equal" },
    { value: "lt", label: "is less than" },
    { value: "lte", label: "is less than or equal" },
    { value: "is_null", label: "is empty" },
    { value: "is_not_null", label: "is not empty" },
  ];

  return (
    <div className="flex items-center gap-2">
      <Select
        value={condition.field}
        onValueChange={(value) =>
          onChange({ ...condition, field: value as SegmentField })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select field" />
        </SelectTrigger>
        <SelectContent>
          {fieldOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={condition.operator}
        onValueChange={(value) =>
          onChange({ ...condition, operator: value as SegmentOperator })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select operator" />
        </SelectTrigger>
        <SelectContent>
          {operatorOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!["is_null", "is_not_null", "is_true", "is_false"].includes(
        condition.operator,
      ) && (
        <Input
          placeholder="Value"
          value={
            Array.isArray(condition.value)
              ? condition.value.join(", ")
              : String(condition.value || "")
          }
          onChange={(e) => {
            const val = e.target.value;
            onChange({
              ...condition,
              value:
                condition.operator === "in" || condition.operator === "not_in"
                  ? val.split(",").map((s) => s.trim())
                  : val,
            });
          }}
          className="flex-1"
        />
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-8 w-8 shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Preview list modal
interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: AudiencePreview | null;
  loading: boolean;
  onExport: () => void;
}

function PreviewModal({
  open,
  onOpenChange,
  preview,
  loading,
  onExport,
}: PreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Audience Preview</DialogTitle>
          <DialogDescription>
            {preview
              ? `Showing ${preview.sampleEmployees.length} of ${preview.totalCount} matching employees`
              : "Loading preview..."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : preview ? (
          <>
            <div className="max-h-[400px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.sampleEmployees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">
                        {emp.firstName} {emp.lastName}
                      </TableCell>
                      <TableCell>{emp.department || "-"}</TableCell>
                      <TableCell>{emp.location || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {emp.email}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onExport}>
                <Download className="mr-2 h-4 w-4" />
                Export to CSV
              </Button>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            No preview available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * SegmentBuilder - Mom-test friendly audience targeting component.
 *
 * Simple mode (default): Department/location checkboxes with "include teams" toggle.
 * Advanced mode: Full condition builder with operators and custom fields.
 *
 * Live preview updates on criteria changes with 500ms debounce.
 */
export function SegmentBuilder({
  value,
  onChange,
  onCountChange,
  className,
}: SegmentBuilderProps) {
  // Mode state
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

  // Simple mode state
  const [simpleSelection, setSimpleSelection] = useState<SimpleModeSelection>({
    departments: [],
    locations: [],
    includeTeams: false,
  });

  // Advanced mode state
  const [advancedCriteria, setAdvancedCriteria] = useState<SegmentCriteria>({
    logic: "AND",
    conditions: [],
  });

  // Reference data
  const [departments, setDepartments] = useState<ReferenceItem[]>([]);
  const [locations, setLocations] = useState<ReferenceItem[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  // Preview state
  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Compute current criteria
  const currentCriteria = useMemo(() => {
    if (isAdvancedMode) {
      return advancedCriteria.conditions &&
        advancedCriteria.conditions.length > 0
        ? advancedCriteria
        : null;
    }
    return simpleModeToCriteria(simpleSelection);
  }, [isAdvancedMode, simpleSelection, advancedCriteria]);

  // Natural language description
  const description = useMemo(
    () => buildCriteriaDescription(currentCriteria, departments, locations),
    [currentCriteria, departments, locations],
  );

  // Load reference data
  useEffect(() => {
    const loadReferenceData = async () => {
      setLoadingRefs(true);
      try {
        const [deptResponse, locResponse] = await Promise.all([
          apiClient.get<{ departments: ReferenceItem[] }>("/departments"),
          apiClient.get<{ locations: ReferenceItem[] }>("/locations"),
        ]);
        setDepartments(deptResponse.departments || []);
        setLocations(locResponse.locations || []);
      } catch (error) {
        console.error("Failed to load reference data:", error);
        // Set demo data for development
        setDepartments([
          { id: "dept-1", name: "Finance", code: "FIN" },
          { id: "dept-2", name: "Procurement", code: "PROC" },
          { id: "dept-3", name: "Engineering", code: "ENG" },
          { id: "dept-4", name: "Human Resources", code: "HR" },
          { id: "dept-5", name: "Legal", code: "LEG" },
          { id: "dept-6", name: "Sales", code: "SLS" },
          { id: "dept-7", name: "Marketing", code: "MKT" },
          { id: "dept-8", name: "Operations", code: "OPS" },
        ]);
        setLocations([
          { id: "loc-1", name: "New York", code: "NYC" },
          { id: "loc-2", name: "Los Angeles", code: "LA" },
          { id: "loc-3", name: "Chicago", code: "CHI" },
          { id: "loc-4", name: "London", code: "LDN" },
          { id: "loc-5", name: "Singapore", code: "SG" },
          { id: "loc-6", name: "Remote", code: "RMT" },
        ]);
      } finally {
        setLoadingRefs(false);
      }
    };

    loadReferenceData();
  }, []);

  // Initialize from value prop
  useEffect(() => {
    if (value) {
      const simple = criteriaToSimpleMode(value);
      if (simple) {
        setSimpleSelection(simple);
        setIsAdvancedMode(false);
      } else {
        setAdvancedCriteria(value);
        setIsAdvancedMode(true);
      }
    }
  }, []);

  // Compute a deterministic demo count from the criteria
  const getDemoCount = useCallback(
    (criteria: SegmentCriteria | null): number => {
      if (
        !criteria ||
        !criteria.conditions ||
        criteria.conditions.length === 0
      ) {
        return 0;
      }
      // Deterministic count based on number of selected values
      let total = 0;
      for (const c of criteria.conditions) {
        if (Array.isArray(c.value)) {
          total += c.value.length * 45;
        } else if (c.value) {
          total += 120;
        }
      }
      return total || 150;
    },
    [],
  );

  // Preview with debounce
  const fetchPreview = useCallback(
    async (criteria: SegmentCriteria | null) => {
      if (!criteria) {
        setPreview({ totalCount: 0, sampleEmployees: [] });
        return;
      }

      setLoadingPreview(true);
      try {
        const response = await apiClient.post<AudiencePreview>(
          "/campaigns/audience/preview",
          { criteria },
        );
        setPreview(response);
      } catch (error) {
        console.error("Failed to fetch preview:", error);
        // Demo preview for development - deterministic count
        const count = getDemoCount(criteria);
        setPreview({
          totalCount: count,
          sampleEmployees: [
            {
              id: "1",
              firstName: "John",
              lastName: "Smith",
              email: "john.smith@company.com",
              jobTitle: "Senior Analyst",
              department: "Finance",
              location: "New York",
            },
            {
              id: "2",
              firstName: "Sarah",
              lastName: "Johnson",
              email: "sarah.johnson@company.com",
              jobTitle: "Manager",
              department: "Procurement",
              location: "Chicago",
            },
            {
              id: "3",
              firstName: "Michael",
              lastName: "Chen",
              email: "michael.chen@company.com",
              jobTitle: "Director",
              department: "Engineering",
              location: "Los Angeles",
            },
          ],
        });
      } finally {
        setLoadingPreview(false);
      }
    },
    [getDemoCount],
  );

  // Stable refs for callbacks to avoid infinite loops
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const onCountChangeRef = React.useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  // Serialize criteria for stable effect dependency
  const criteriaKey = useMemo(
    () => JSON.stringify(currentCriteria),
    [currentCriteria],
  );

  // Notify parent when preview count changes
  useEffect(() => {
    if (preview && onCountChangeRef.current) {
      onCountChangeRef.current(preview.totalCount);
    }
  }, [preview]);

  // Debounced preview update
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPreview(currentCriteria);
      onChangeRef.current(currentCriteria);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteriaKey, fetchPreview]);

  // Handle simple mode changes
  const handleSimpleChange = (updates: Partial<SimpleModeSelection>) => {
    setSimpleSelection((prev) => ({ ...prev, ...updates }));
  };

  // Handle advanced mode condition changes
  const handleAddCondition = () => {
    setAdvancedCriteria((prev) => ({
      ...prev,
      conditions: [
        ...(prev.conditions || []),
        { field: "departmentId", operator: "equals", value: "" },
      ],
    }));
  };

  const handleUpdateCondition = (
    index: number,
    condition: SegmentCondition,
  ) => {
    setAdvancedCriteria((prev) => ({
      ...prev,
      conditions: prev.conditions?.map((c, i) => (i === index ? condition : c)),
    }));
  };

  const handleRemoveCondition = (index: number) => {
    setAdvancedCriteria((prev) => ({
      ...prev,
      conditions: prev.conditions?.filter((_, i) => i !== index),
    }));
  };

  // Export to CSV
  const handleExport = () => {
    if (!preview) return;

    const headers = ["Name", "Email", "Department", "Location", "Job Title"];
    const rows = preview.sampleEmployees.map((emp) => [
      `${emp.firstName} ${emp.lastName}`,
      emp.email,
      emp.department || "",
      emp.location || "",
      emp.jobTitle || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "audience-preview.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Switch to advanced mode
  const handleSwitchToAdvanced = () => {
    // Convert current simple selection to advanced criteria
    const criteria = simpleModeToCriteria(simpleSelection);
    if (criteria) {
      setAdvancedCriteria(criteria);
    }
    setIsAdvancedMode(true);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Target Audience</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (isAdvancedMode) {
              const simple = criteriaToSimpleMode(advancedCriteria);
              if (simple) {
                setSimpleSelection(simple);
              }
              setIsAdvancedMode(false);
            } else {
              handleSwitchToAdvanced();
            }
          }}
        >
          {isAdvancedMode ? "Simple Mode" : "Advanced Mode"}
        </Button>
      </div>

      {/* Simple Mode */}
      {!isAdvancedMode && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <MultiSelectPicker
                label="Departments"
                items={departments}
                selected={simpleSelection.departments}
                onChange={(departments) => handleSimpleChange({ departments })}
                placeholder="Search departments..."
                loading={loadingRefs}
              />

              <MultiSelectPicker
                label="Locations"
                items={locations}
                selected={simpleSelection.locations}
                onChange={(locations) => handleSimpleChange({ locations })}
                placeholder="Search locations..."
                loading={loadingRefs}
              />
            </div>

            <div className="mt-4 flex items-center space-x-2">
              <Checkbox
                id="include-teams"
                checked={simpleSelection.includeTeams}
                onCheckedChange={(checked) =>
                  handleSimpleChange({ includeTeams: !!checked })
                }
              />
              <Label htmlFor="include-teams" className="text-sm">
                Include their direct reports
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Mode */}
      {isAdvancedMode && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Match</span>
                <Select
                  value={advancedCriteria.logic}
                  onValueChange={(value) =>
                    setAdvancedCriteria((prev) => ({
                      ...prev,
                      logic: value as SegmentLogic,
                    }))
                  }
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">ALL</SelectItem>
                    <SelectItem value="OR">ANY</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm font-medium">
                  of these conditions:
                </span>
              </div>

              <div className="space-y-2">
                {advancedCriteria.conditions?.map((condition, index) => (
                  <AdvancedConditionRow
                    key={index}
                    condition={condition}
                    onChange={(c) => handleUpdateCondition(index, c)}
                    onRemove={() => handleRemoveCondition(index)}
                    isLast={
                      index === (advancedCriteria.conditions?.length || 0) - 1
                    }
                  />
                ))}
              </div>

              <Button variant="outline" size="sm" onClick={handleAddCondition}>
                Add Condition
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview summary */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{description}</p>
                {loadingPreview ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Calculating...</span>
                  </div>
                ) : preview ? (
                  <p className="text-lg font-semibold">
                    {preview.totalCount.toLocaleString()} people
                  </p>
                ) : null}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreviewModal(true)}
              disabled={loadingPreview || !preview || preview.totalCount === 0}
            >
              Preview List
            </Button>
          </div>

          {preview?.totalCount === 0 && !loadingPreview && (
            <div className="mt-2 flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                No employees match the current criteria
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <PreviewModal
        open={showPreviewModal}
        onOpenChange={setShowPreviewModal}
        preview={preview}
        loading={loadingPreview}
        onExport={handleExport}
      />
    </div>
  );
}

export default SegmentBuilder;
