"use client";

/**
 * Reports Page
 *
 * Main entry point for the report designer.
 * Shows My Reports, Shared Reports, and Templates tabs.
 * Users can search, favorite, duplicate, delete, and navigate to report details.
 */

import React, {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Sparkles,
  Search,
  Star,
  MoreHorizontal,
  Play,
  Pencil,
  Copy,
  Trash2,
  FileText,
  Table as TableIcon,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  TrendingUp,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { reportsApi } from "@/lib/reports-api";
import type { SavedReport, ReportVisibility } from "@/types/reports";

// =========================================================================
// Constants
// =========================================================================

type TabValue = "my-reports" | "shared" | "templates";

/**
 * Visualization type to icon mapping.
 */
const VISUALIZATION_ICONS: Record<string, React.ElementType> = {
  table: TableIcon,
  bar: BarChart3,
  line: LineChart,
  pie: PieChart,
  kpi: Activity,
  funnel: TrendingUp,
  stacked_bar: Layers,
};

/**
 * Template category colors.
 */
const CATEGORY_COLORS: Record<string, string> = {
  compliance: "bg-blue-100 text-blue-700",
  operational: "bg-green-100 text-green-700",
  executive: "bg-purple-100 text-purple-700",
  investigative: "bg-amber-100 text-amber-700",
  default: "bg-gray-100 text-gray-700",
};

// =========================================================================
// Helper Functions
// =========================================================================

/**
 * Format relative time for last run.
 */
function formatLastRun(date: string | undefined): string {
  if (!date) return "Never";
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return "Unknown";
  }
}

/**
 * Get icon for visualization type.
 */
function getVisualizationIcon(type: string): React.ElementType {
  return VISUALIZATION_ICONS[type] || TableIcon;
}

/**
 * Get category badge color.
 */
function getCategoryColor(category?: string): string {
  if (!category) return CATEGORY_COLORS.default;
  return CATEGORY_COLORS[category.toLowerCase()] || CATEGORY_COLORS.default;
}

// =========================================================================
// Loading Skeletons
// =========================================================================

function ReportsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-[200px]" />
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[80px]" />
          <Skeleton className="h-5 w-8" />
        </div>
      ))}
    </div>
  );
}

function TemplateCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-5 w-[150px] mt-2" />
            <Skeleton className="h-4 w-full mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-[100px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =========================================================================
// Empty States
// =========================================================================

function EmptyReports({ tab }: { tab: TabValue }) {
  const messages: Record<TabValue, { title: string; description: string }> = {
    "my-reports": {
      title: "No reports yet",
      description:
        "Create your first report to start analyzing your compliance data.",
    },
    shared: {
      title: "No shared reports",
      description:
        "Reports shared with your team or organization will appear here.",
    },
    templates: {
      title: "No templates available",
      description: "Pre-built report templates will be shown here.",
    },
  };

  const { title, description } = messages[tab];

  return (
    <div className="text-center py-12 border rounded-lg bg-muted/30">
      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <p className="text-lg font-medium mb-2">{title}</p>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {description}
      </p>
    </div>
  );
}

// =========================================================================
// Report Row Component
// =========================================================================

interface ReportRowProps {
  report: SavedReport;
  onSelect: (id: string) => void;
  onRun: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  showOwner?: boolean;
}

function ReportRow({
  report,
  onSelect,
  onRun,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  showOwner = false,
}: ReportRowProps) {
  const VizIcon = getVisualizationIcon(report.visualization);

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50">
      <TableCell className="w-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(report.id);
          }}
        >
          <Star
            className={cn(
              "h-4 w-4",
              report.isFavorite
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground",
            )}
          />
        </Button>
      </TableCell>
      <TableCell onClick={() => onSelect(report.id)}>
        <div className="flex flex-col">
          <span className="font-medium">{report.name}</span>
          {report.description && (
            <span className="text-xs text-muted-foreground truncate max-w-[300px]">
              {report.description}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell onClick={() => onSelect(report.id)}>
        <div className="flex items-center gap-2">
          <VizIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm capitalize">{report.visualization}</span>
        </div>
      </TableCell>
      {showOwner && (
        <TableCell onClick={() => onSelect(report.id)}>
          {report.createdBy
            ? `${report.createdBy.firstName} ${report.createdBy.lastName}`
            : "Unknown"}
        </TableCell>
      )}
      <TableCell
        className="text-muted-foreground text-sm"
        onClick={() => onSelect(report.id)}
      >
        {formatLastRun(report.lastRunAt)}
      </TableCell>
      <TableCell className="w-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRun(report.id)}>
              <Play className="h-4 w-4 mr-2" />
              Run Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(report.id)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(report.id)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(report.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// =========================================================================
// Reports Table Component
// =========================================================================

interface ReportsTableProps {
  reports: SavedReport[];
  isLoading: boolean;
  showOwner?: boolean;
  onSelect: (id: string) => void;
  onRun: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  emptyTab: TabValue;
}

function ReportsTable({
  reports,
  isLoading,
  showOwner = false,
  onSelect,
  onRun,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  emptyTab,
}: ReportsTableProps) {
  if (isLoading) {
    return <ReportsTableSkeleton />;
  }

  if (reports.length === 0) {
    return <EmptyReports tab={emptyTab} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10"></TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          {showOwner && <TableHead>Owner</TableHead>}
          <TableHead>Last Run</TableHead>
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((report) => (
          <ReportRow
            key={report.id}
            report={report}
            showOwner={showOwner}
            onSelect={onSelect}
            onRun={onRun}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </TableBody>
    </Table>
  );
}

// =========================================================================
// Template Card Component
// =========================================================================

interface TemplateCardProps {
  template: SavedReport;
  onUseTemplate: (id: string) => void;
}

function TemplateCard({ template, onUseTemplate }: TemplateCardProps) {
  const VizIcon = getVisualizationIcon(template.visualization);

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-primary/10">
            <VizIcon className="h-5 w-5 text-primary" />
          </div>
          {template.templateCategory && (
            <Badge
              variant="secondary"
              className={getCategoryColor(template.templateCategory)}
            >
              {template.templateCategory}
            </Badge>
          )}
        </div>
        <CardTitle className="text-base mt-3">{template.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {template.description || "No description provided"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUseTemplate(template.id)}
        >
          Use Template
        </Button>
      </CardContent>
    </Card>
  );
}

// =========================================================================
// Templates Grid Component
// =========================================================================

interface TemplatesGridProps {
  templates: SavedReport[];
  isLoading: boolean;
  onUseTemplate: (id: string) => void;
}

function TemplatesGrid({
  templates,
  isLoading,
  onUseTemplate,
}: TemplatesGridProps) {
  if (isLoading) {
    return <TemplateCardsSkeleton />;
  }

  if (templates.length === 0) {
    return <EmptyReports tab="templates" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onUseTemplate={onUseTemplate}
        />
      ))}
    </div>
  );
}

// =========================================================================
// AI Query Dialog
// =========================================================================

interface AiQueryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

function AiQueryDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: AiQueryDialogProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = () => {
    if (query.trim()) {
      onSubmit(query.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Ask AI to Create a Report
          </DialogTitle>
          <DialogDescription>
            Describe the report you want in natural language. For example:
            &quot;Show me cases by category for the last 30 days&quot;
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="Enter your question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!query.trim() || isLoading}>
            {isLoading ? "Generating..." : "Generate Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================================
// Main Reports Content Component
// =========================================================================

function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [activeTab, setActiveTab] = useState<TabValue>("my-reports");
  const [searchQuery, setSearchQuery] = useState("");
  const [myReports, setMyReports] = useState<SavedReport[]>([]);
  const [sharedReports, setSharedReports] = useState<SavedReport[]>([]);
  const [templates, setTemplates] = useState<SavedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Initialize tab from URL
  useEffect(() => {
    const tab = searchParams?.get("tab") as TabValue | null;
    if (tab && ["my-reports", "shared", "templates"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Fetch reports on mount
  useEffect(() => {
    async function fetchReports() {
      setIsLoading(true);
      try {
        // Fetch all reports in parallel
        const [myData, teamData, everyoneData, templatesData] =
          await Promise.all([
            reportsApi.list({ visibility: "PRIVATE" }),
            reportsApi.list({ visibility: "TEAM" }),
            reportsApi.list({ visibility: "EVERYONE" }),
            reportsApi.getTemplates(),
          ]);

        setMyReports(myData.data || []);
        setSharedReports([
          ...(teamData.data || []),
          ...(everyoneData.data || []),
        ]);
        setTemplates(templatesData || []);
      } catch (error) {
        console.warn("Failed to fetch reports:", error);
        toast.error("Failed to load reports");
      } finally {
        setIsLoading(false);
      }
    }

    fetchReports();
  }, []);

  // Filter reports by search query
  const filteredMyReports = useMemo(() => {
    if (!searchQuery) return myReports;
    const query = searchQuery.toLowerCase();
    return myReports.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query),
    );
  }, [myReports, searchQuery]);

  const filteredSharedReports = useMemo(() => {
    if (!searchQuery) return sharedReports;
    const query = searchQuery.toLowerCase();
    return sharedReports.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query),
    );
  }, [sharedReports, searchQuery]);

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query),
    );
  }, [templates, searchQuery]);

  // Handlers
  const handleTabChange = useCallback(
    (value: string) => {
      const newTab = value as TabValue;
      setActiveTab(newTab);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("tab", newTab);
      router.replace(newUrl.pathname + newUrl.search, { scroll: false });
    },
    [router],
  );

  const handleSelectReport = useCallback(
    (id: string) => {
      router.push(`/reports/${id}`);
    },
    [router],
  );

  const handleRunReport = useCallback(
    (id: string) => {
      router.push(`/reports/${id}?run=true`);
    },
    [router],
  );

  const handleEditReport = useCallback(
    (id: string) => {
      router.push(`/reports/${id}/edit`);
    },
    [router],
  );

  const handleDuplicateReport = useCallback(async (id: string) => {
    try {
      const duplicated = await reportsApi.duplicate(id);
      toast.success(`Report duplicated: ${duplicated.name}`);
      // Refresh the appropriate list
      setMyReports((prev) => [duplicated, ...prev]);
    } catch (error) {
      console.warn("Failed to duplicate report:", error);
      toast.error("Failed to duplicate report");
    }
  }, []);

  const handleDeleteReport = useCallback(async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this report?")) {
      return;
    }
    try {
      await reportsApi.delete(id);
      toast.success("Report deleted");
      // Remove from lists
      setMyReports((prev) => prev.filter((r) => r.id !== id));
      setSharedReports((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.warn("Failed to delete report:", error);
      toast.error("Failed to delete report");
    }
  }, []);

  const handleToggleFavorite = useCallback(async (id: string) => {
    try {
      const result = await reportsApi.toggleFavorite(id);
      // Update the report in the appropriate list
      const updateFavorite = (reports: SavedReport[]) =>
        reports.map((r) =>
          r.id === id ? { ...r, isFavorite: result.isFavorite } : r,
        );
      setMyReports(updateFavorite);
      setSharedReports(updateFavorite);
    } catch (error) {
      console.warn("Failed to toggle favorite:", error);
      toast.error("Failed to update favorite status");
    }
  }, []);

  const handleUseTemplate = useCallback(
    (id: string) => {
      router.push(`/reports/new?template=${id}`);
    },
    [router],
  );

  const handleAiGenerate = useCallback(
    async (query: string) => {
      setAiLoading(true);
      try {
        const result = await reportsApi.aiGenerate(query);
        toast.success("Report generated successfully!");
        setAiDialogOpen(false);
        // Navigate to new report page with generated config
        const params = new URLSearchParams();
        params.set("ai", "true");
        params.set("config", JSON.stringify(result.report));
        router.push(`/reports/new?${params.toString()}`);
      } catch (error) {
        console.warn("Failed to generate report:", error);
        toast.error("Failed to generate report from your query");
      } finally {
        setAiLoading(false);
      }
    },
    [router],
  );

  const handleCreateReport = useCallback(() => {
    router.push("/reports/new");
  }, [router]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage custom reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setAiDialogOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Ask AI
          </Button>
          <Button onClick={handleCreateReport}>
            <Plus className="mr-2 h-4 w-4" />
            Create Report
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search reports..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="my-reports">My Reports</TabsTrigger>
          <TabsTrigger value="shared">Shared Reports</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="my-reports" className="mt-6">
          <ReportsTable
            reports={filteredMyReports}
            isLoading={isLoading}
            emptyTab="my-reports"
            onSelect={handleSelectReport}
            onRun={handleRunReport}
            onEdit={handleEditReport}
            onDuplicate={handleDuplicateReport}
            onDelete={handleDeleteReport}
            onToggleFavorite={handleToggleFavorite}
          />
        </TabsContent>

        <TabsContent value="shared" className="mt-6">
          <ReportsTable
            reports={filteredSharedReports}
            isLoading={isLoading}
            showOwner
            emptyTab="shared"
            onSelect={handleSelectReport}
            onRun={handleRunReport}
            onEdit={handleEditReport}
            onDuplicate={handleDuplicateReport}
            onDelete={handleDeleteReport}
            onToggleFavorite={handleToggleFavorite}
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplatesGrid
            templates={filteredTemplates}
            isLoading={isLoading}
            onUseTemplate={handleUseTemplate}
          />
        </TabsContent>
      </Tabs>

      {/* AI Query Dialog */}
      <AiQueryDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onSubmit={handleAiGenerate}
        isLoading={aiLoading}
      />
    </div>
  );
}

// =========================================================================
// Reports Page
// =========================================================================

/**
 * Reports Page
 * Route: /reports
 */
export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading reports...</div>
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
