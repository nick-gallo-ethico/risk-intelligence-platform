"use client";

/**
 * Create Workflow Dialog
 *
 * Dialog for creating a new workflow template.
 * - Name input (required, 3-100 chars)
 * - Entity type selection
 * - Creates minimal template and navigates to builder
 */

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTemplate } from "@/hooks/use-workflows";
import type {
  WorkflowEntityType,
  CreateWorkflowTemplateDto,
} from "@/types/workflow";

// ============================================================================
// Types
// ============================================================================

export interface CreateWorkflowDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// Schema
// ============================================================================

const createWorkflowSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be at most 100 characters"),
  entityType: z.enum([
    "CASE",
    "INVESTIGATION",
    "DISCLOSURE",
    "POLICY",
    "CAMPAIGN",
  ]),
});

type CreateWorkflowFormData = z.infer<typeof createWorkflowSchema>;

// ============================================================================
// Constants
// ============================================================================

const ENTITY_TYPE_OPTIONS: Array<{ value: WorkflowEntityType; label: string }> =
  [
    { value: "CASE", label: "Case" },
    { value: "INVESTIGATION", label: "Investigation" },
    { value: "DISCLOSURE", label: "Disclosure" },
    { value: "POLICY", label: "Policy" },
    { value: "CAMPAIGN", label: "Campaign" },
  ];

// ============================================================================
// Component
// ============================================================================

export function CreateWorkflowDialog({
  open,
  onOpenChange,
}: CreateWorkflowDialogProps) {
  const router = useRouter();
  const createMutation = useCreateTemplate();

  const form = useForm<CreateWorkflowFormData>({
    resolver: zodResolver(createWorkflowSchema),
    defaultValues: {
      name: "",
      entityType: "CASE",
    },
  });

  const handleSubmit = async (data: CreateWorkflowFormData) => {
    try {
      // Create minimal template with one initial stage
      const dto: CreateWorkflowTemplateDto = {
        name: data.name,
        entityType: data.entityType,
        stages: [
          {
            id: "new",
            name: "New",
            steps: [],
            isTerminal: false,
            display: {
              color: "#3b82f6",
              sortOrder: 0,
            },
          },
        ],
        transitions: [],
        initialStage: "new",
      };

      const created = await createMutation.mutateAsync(dto);
      toast.success(`Workflow "${created.name}" created`);
      onOpenChange(false);
      form.reset();
      router.push(`/settings/workflows/${created.id}`);
    } catch (error) {
      console.warn("Failed to create workflow:", error);
      toast.error("Failed to create workflow");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <DialogDescription>
              Create a new workflow template to define how items progress
              through your compliance process.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Standard Case Workflow"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Entity Type */}
            <div className="grid gap-2">
              <Label htmlFor="entityType">Entity Type</Label>
              <Select
                value={form.watch("entityType")}
                onValueChange={(value: WorkflowEntityType) =>
                  form.setValue("entityType", value)
                }
              >
                <SelectTrigger id="entityType">
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.entityType && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.entityType.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create & Edit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
