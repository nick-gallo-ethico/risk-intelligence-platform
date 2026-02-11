"use client";

/**
 * Workflow List Table
 *
 * Displays workflow templates in a table with:
 * - Columns: Name, Entity Type, Version, Status, Default, Instances, Updated
 * - Row actions: Edit, Clone, View Instances, Set/Unset Default, Delete
 * - Loading skeleton and empty state
 */

import React, { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Star,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  useWorkflowTemplates,
  useCloneTemplate,
  useDeleteTemplate,
  useUpdateTemplate,
} from "@/hooks/use-workflows";
import type {
  WorkflowTemplate,
  WorkflowEntityType,
  WorkflowTemplateQueryParams,
} from "@/types/workflow";

// ============================================================================
// Types
// ============================================================================

export interface WorkflowListTableProps {
  /** Entity type filter (undefined = all) */
  entityType: WorkflowEntityType | undefined;
  /** Active status filter (undefined = all) */
  isActive: boolean | undefined;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Badge colors per entity type.
 */
const ENTITY_TYPE_COLORS: Record<WorkflowEntityType, string> = {
  CASE: "bg-blue-100 text-blue-700",
  INVESTIGATION: "bg-green-100 text-green-700",
  DISCLOSURE: "bg-amber-100 text-amber-700",
  POLICY: "bg-purple-100 text-purple-700",
  CAMPAIGN: "bg-cyan-100 text-cyan-700",
};

/**
 * Display labels per entity type.
 */
const ENTITY_TYPE_LABELS: Record<WorkflowEntityType, string> = {
  CASE: "Case",
  INVESTIGATION: "Investigation",
  DISCLOSURE: "Disclosure",
  POLICY: "Policy",
  CAMPAIGN: "Campaign",
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatUpdatedAt(date: string): string {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return "Unknown";
  }
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function WorkflowTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-5 w-[180px]" />
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[50px]" />
          <Skeleton className="h-5 w-[70px]" />
          <Skeleton className="h-5 w-8" />
          <Skeleton className="h-5 w-[60px]" />
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-8" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyWorkflows() {
  return (
    <div className="text-center py-12 border rounded-lg bg-muted/30">
      <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
        <svg
          className="h-6 w-6 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>
      <p className="text-lg font-medium mb-2">No workflow templates found</p>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Create your first workflow to define how cases, investigations, and
        other items progress through your compliance process.
      </p>
    </div>
  );
}

// ============================================================================
// Table Row Component
// ============================================================================

interface WorkflowRowProps {
  template: WorkflowTemplate;
  onEdit: (id: string) => void;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleDefault: (id: string, currentDefault: boolean) => void;
  onViewInstances: (id: string) => void;
}

function WorkflowRow({
  template,
  onEdit,
  onClone,
  onDelete,
  onToggleDefault,
  onViewInstances,
}: WorkflowRowProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const instanceCount = template._instanceCount ?? 0;
  const canDelete = instanceCount === 0;

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50">
        {/* Name */}
        <TableCell onClick={() => onEdit(template.id)}>
          <div className="flex flex-col">
            <span className="font-medium">{template.name}</span>
            {template.description && (
              <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                {template.description}
              </span>
            )}
          </div>
        </TableCell>

        {/* Entity Type */}
        <TableCell onClick={() => onEdit(template.id)}>
          <Badge
            variant="secondary"
            className={cn(ENTITY_TYPE_COLORS[template.entityType])}
          >
            {ENTITY_TYPE_LABELS[template.entityType]}
          </Badge>
        </TableCell>

        {/* Version */}
        <TableCell
          onClick={() => onEdit(template.id)}
          className="text-muted-foreground"
        >
          v{template.version}
        </TableCell>

        {/* Status */}
        <TableCell onClick={() => onEdit(template.id)}>
          <Badge
            variant={template.isActive ? "default" : "secondary"}
            className={cn(
              template.isActive
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600",
            )}
          >
            {template.isActive ? "Active" : "Inactive"}
          </Badge>
        </TableCell>

        {/* Default */}
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onToggleDefault(template.id, template.isDefault);
            }}
          >
            <Star
              className={cn(
                "h-4 w-4",
                template.isDefault
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground",
              )}
            />
          </Button>
        </TableCell>

        {/* Instances */}
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onViewInstances(template.id);
            }}
          >
            {instanceCount}
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </TableCell>

        {/* Updated */}
        <TableCell
          onClick={() => onEdit(template.id)}
          className="text-muted-foreground text-sm"
        >
          {formatUpdatedAt(template.updatedAt)}
        </TableCell>

        {/* Actions */}
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
              <DropdownMenuItem onClick={() => onEdit(template.id)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onClone(template.id)}>
                <Copy className="h-4 w-4 mr-2" />
                Clone
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewInstances(template.id)}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Instances
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleDefault(template.id, template.isDefault)}
              >
                <Star className="h-4 w-4 mr-2" />
                {template.isDefault ? "Unset Default" : "Set as Default"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <DropdownMenuItem
                        className="text-destructive"
                        disabled={!canDelete}
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </div>
                  </TooltipTrigger>
                  {!canDelete && (
                    <TooltipContent>
                      <p>Cannot delete template with active instances</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{template.name}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete(template.id);
                setDeleteDialogOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function WorkflowListTable({
  entityType,
  isActive,
}: WorkflowListTableProps) {
  const router = useRouter();

  // Build query params
  const queryParams: WorkflowTemplateQueryParams = useMemo(
    () => ({
      entityType,
      isActive,
    }),
    [entityType, isActive],
  );

  // Fetch templates
  const { data: templates, isLoading } = useWorkflowTemplates(queryParams);

  // Mutations
  const cloneMutation = useCloneTemplate();
  const deleteMutation = useDeleteTemplate();
  const updateMutation = useUpdateTemplate();

  // Handlers
  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/settings/workflows/${id}`);
    },
    [router],
  );

  const handleClone = useCallback(
    async (id: string) => {
      try {
        const cloned = await cloneMutation.mutateAsync(id);
        toast.success(`Workflow cloned: ${cloned.name}`);
      } catch (error) {
        console.warn("Failed to clone workflow:", error);
        toast.error("Failed to clone workflow");
      }
    },
    [cloneMutation],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Workflow deleted");
      } catch (error) {
        console.warn("Failed to delete workflow:", error);
        toast.error("Failed to delete workflow");
      }
    },
    [deleteMutation],
  );

  const handleToggleDefault = useCallback(
    async (id: string, currentDefault: boolean) => {
      try {
        await updateMutation.mutateAsync({
          id,
          dto: { isDefault: !currentDefault },
        });
        toast.success(
          currentDefault
            ? "Workflow unset as default"
            : "Workflow set as default",
        );
      } catch (error) {
        console.warn("Failed to update default status:", error);
        toast.error("Failed to update default status");
      }
    },
    [updateMutation],
  );

  const handleViewInstances = useCallback(
    (id: string) => {
      router.push(`/settings/workflows/${id}/instances`);
    },
    [router],
  );

  // Render
  if (isLoading) {
    return <WorkflowTableSkeleton />;
  }

  if (!templates || templates.length === 0) {
    return <EmptyWorkflows />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Entity Type</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-10">Default</TableHead>
          <TableHead>Instances</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {templates.map((template) => (
          <WorkflowRow
            key={template.id}
            template={template}
            onEdit={handleEdit}
            onClone={handleClone}
            onDelete={handleDelete}
            onToggleDefault={handleToggleDefault}
            onViewInstances={handleViewInstances}
          />
        ))}
      </TableBody>
    </Table>
  );
}
