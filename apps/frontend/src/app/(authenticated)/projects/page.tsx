"use client";

/**
 * Projects Page
 *
 * Main projects list page using the HubSpot-style saved views system.
 * Provides table and board views with filters, search, and bulk actions.
 */

import React, { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  SavedViewProvider,
  ViewTabsBar,
  ViewToolbar,
  QuickFiltersRow,
  ColumnSelectionModal,
  AdvancedFiltersPanel,
  DataTable,
  BoardView,
} from "@/components/views";
import { PROJECTS_VIEW_CONFIG } from "@/lib/views/configs/projects.config";
import { useProjectsView, type Project } from "@/hooks/views/useProjectsView";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, FolderKanban } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import type { ProjectCategory, ProjectTemplate } from "@/types/project";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface CreateProjectFormData {
  name: string;
  description?: string;
  category: ProjectCategory;
  targetDate: string;
  ownerId?: string;
}

// Category display labels
const CATEGORY_OPTIONS: { value: ProjectCategory; label: string }[] = [
  { value: "AUDIT", label: "Audit" },
  { value: "INVESTIGATION", label: "Investigation" },
  { value: "CAMPAIGN", label: "Campaign" },
  { value: "PROJECT", label: "Project" },
  { value: "TRAINING", label: "Training" },
  { value: "REMEDIATION", label: "Remediation" },
  { value: "OTHER", label: "Other" },
];

/**
 * CreateProjectDialog - Dialog for creating new projects
 */
function CreateProjectDialog({
  open,
  onOpenChange,
  onProjectCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"blank" | "template">("blank");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ProjectCategory>("PROJECT");
  const [targetDate, setTargetDate] = useState("");
  const [ownerId, setOwnerId] = useState<string>("");

  // Template selection
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Users for owner selection
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch templates when modal opens
  useEffect(() => {
    if (open) {
      setLoadingTemplates(true);
      apiClient
        .get<ProjectTemplate[]>("/project-templates")
        .then((data) => {
          setTemplates(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          console.error("Failed to fetch templates:", err);
          setTemplates([]);
        })
        .finally(() => {
          setLoadingTemplates(false);
        });
    }
  }, [open]);

  // Fetch users when modal opens
  useEffect(() => {
    if (open) {
      setLoadingUsers(true);
      apiClient
        .get<User[]>("/users")
        .then((data) => {
          setUsers(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          console.error("Failed to fetch users:", err);
          setUsers([]);
        })
        .finally(() => {
          setLoadingUsers(false);
        });
    }
  }, [open]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setCategory("PROJECT");
      setTargetDate("");
      setOwnerId("");
      setSelectedTemplateId("");
      setActiveTab("blank");
    }
  }, [open]);

  // Update form when template is selected
  useEffect(() => {
    if (selectedTemplateId && activeTab === "template") {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template) {
        setCategory(template.category);
        if (template.description && !description) {
          setDescription(template.description);
        }
      }
    }
  }, [selectedTemplateId, templates, activeTab, description]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (!targetDate) {
      toast.error("Target date is required");
      return;
    }

    setIsSubmitting(true);

    try {
      if (activeTab === "template" && selectedTemplateId) {
        // Apply template to create project
        await apiClient.post(`/project-templates/${selectedTemplateId}/apply`, {
          name: name.trim(),
          description: description.trim() || undefined,
          targetDate,
          ownerId: ownerId || undefined,
        });
        toast.success("Project created from template");
      } else {
        // Create blank project
        await apiClient.post("/projects", {
          name: name.trim(),
          description: description.trim() || undefined,
          category,
          targetDate,
          ownerId: ownerId || undefined,
        });
        toast.success("Project created");
      }

      onOpenChange(false);
      onProjectCreated();
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error("Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            New Project
          </DialogTitle>
          <DialogDescription>
            Create a new project to track work and milestones.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "blank" | "template")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="blank">Blank Project</TabsTrigger>
            <TabsTrigger value="template">From Template</TabsTrigger>
          </TabsList>

          <TabsContent value="blank" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q1 Compliance Audit"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this project about?"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as ProjectCategory)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetDate">Target Date *</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={loadingUsers ? "Loading..." : "Select owner"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="template" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="template">Select Template</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingTemplates ? "Loading..." : "Choose a template"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex flex-col">
                        <span>{template.name}</span>
                        {template.description && (
                          <span className="text-xs text-muted-foreground">
                            {template.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateName">Project Name *</Label>
              <Input
                id="templateName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q1 Compliance Audit"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateDescription">Description</Label>
              <Textarea
                id="templateDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this project about?"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="templateTargetDate">Target Date *</Label>
                <Input
                  id="templateTargetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateOwner">Owner</Label>
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={loadingUsers ? "Loading..." : "Select owner"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ProjectsPageContent component that uses the view context
 */
function ProjectsPageContent() {
  const router = useRouter();
  const {
    projects,
    totalRecords,
    isLoading,
    handleBulkAction,
    handleStatusChange,
    refetch,
  } = useProjectsView();

  const {
    viewMode,
    filters,
    quickFilters,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useSavedViewContext();

  // UI state for panels and modals
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Count active filters for badge display
  const quickFilterCount = Object.values(quickFilters).filter(
    (v) => v !== undefined && v !== null && v !== "",
  ).length;
  const advancedFilterCount = filters.reduce(
    (sum, g) => sum + g.conditions.length,
    0,
  );
  const totalFilterCount = quickFilterCount + advancedFilterCount;

  /**
   * Navigate to project detail page
   */
  const handleRowClick = useCallback(
    (record: Project) => {
      router.push(`/projects/${record.id}`);
    },
    [router],
  );

  /**
   * Pagination handlers
   */
  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
    },
    [setPage],
  );

  const handlePageSizeChange = useCallback(
    (size: number) => {
      setPageSize(size);
    },
    [setPageSize],
  );

  /**
   * Get row ID for table selection
   */
  const getRowId = useCallback((row: Project) => row.id, []);

  /**
   * Handle project creation
   */
  const handleProjectCreated = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="flex flex-col h-full">
      {/* Zone 1: View Tabs */}
      <ViewTabsBar />

      {/* Zone 2: Toolbar with actions */}
      <ViewToolbar
        onEditColumnsClick={() => setShowColumnModal(true)}
        onFilterClick={() => setShowFilters(!showFilters)}
        filterCount={totalFilterCount}
        showFilters={showFilters}
        actions={
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Project
          </Button>
        }
      />

      {/* Zone 3: Quick Filters (conditional) */}
      {showFilters && (
        <QuickFiltersRow
          onAdvancedFiltersClick={() => setShowAdvancedFilters(true)}
          advancedFilterCount={advancedFilterCount}
        />
      )}

      {/* Zone 4: Data Table or Board View */}
      <div className="flex-1 min-h-0">
        {viewMode === "table" ? (
          <DataTable
            data={projects}
            isLoading={isLoading}
            totalRecords={totalRecords}
            currentPage={page}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onRowClick={handleRowClick}
            onBulkAction={handleBulkAction}
            getRowId={getRowId}
            emptyMessage="No projects match your current filters"
          />
        ) : (
          <BoardView
            data={projects}
            isLoading={isLoading}
            onRecordClick={handleRowClick}
            onStatusChange={handleStatusChange}
            getRecordId={getRowId}
            emptyMessage="No projects match your current filters"
          />
        )}
      </div>

      {/* Column Selection Modal */}
      <ColumnSelectionModal
        open={showColumnModal}
        onOpenChange={setShowColumnModal}
      />

      {/* Advanced Filters Panel (slide-out) */}
      <AdvancedFiltersPanel
        open={showAdvancedFilters}
        onOpenChange={setShowAdvancedFilters}
      />

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
}

/**
 * Projects Page with SavedViewProvider wrapper
 */
export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SavedViewProvider config={PROJECTS_VIEW_CONFIG}>
        <ProjectsPageContent />
      </SavedViewProvider>
    </Suspense>
  );
}
