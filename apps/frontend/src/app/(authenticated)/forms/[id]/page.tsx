"use client";

/**
 * Form Edit Page
 *
 * Loads an existing form definition and allows editing using the FormBuilder.
 * Provides publish and clone actions.
 */

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Copy, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FormBuilder,
  type FormBuilderState,
} from "@/components/disclosures/form-builder";
import {
  useForm,
  useUpdateForm,
  usePublishForm,
  useCloneForm,
} from "@/hooks/use-forms";
import type { FormStatus, FormType } from "@/lib/forms-api";

/**
 * Status badge configuration.
 */
const STATUS_CONFIG: Record<
  FormStatus,
  { label: string; variant: "default" | "secondary" | "outline" }
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
  WORKFLOW_TASK: "Workflow Task",
  CUSTOM: "Custom",
};

export default function FormEditPage() {
  const router = useRouter();
  const params = useParams();
  const formId = params?.id as string;

  // Fetch form data
  const { data: form, isLoading, error } = useForm(formId);

  // Mutations
  const updateForm = useUpdateForm();
  const publishForm = usePublishForm();
  const cloneForm = useCloneForm();

  // Track builder state
  const [builderState, setBuilderState] = useState<FormBuilderState | null>(
    null,
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Build initial state from form schema
  const initialState: FormBuilderState | undefined = form?.schema
    ? {
        sections:
          (form.schema as { sections?: FormBuilderState["sections"] })
            .sections || [],
        selectedFieldId: null,
        selectedSectionId: null,
        isDirty: false,
        lastSaved: null,
      }
    : undefined;

  // Handle save from builder
  const handleBuilderSave = useCallback(
    async (state: FormBuilderState) => {
      setBuilderState(state);
      setHasUnsavedChanges(true);

      try {
        await updateForm.mutateAsync({
          id: formId,
          dto: {
            schema: { sections: state.sections },
          },
        });
        setHasUnsavedChanges(false);
        toast.success("Form saved");
      } catch {
        toast.error("Failed to save form");
      }
    },
    [formId, updateForm],
  );

  // Handle manual save button
  const handleSave = useCallback(async () => {
    if (!builderState) return;

    try {
      await updateForm.mutateAsync({
        id: formId,
        dto: {
          schema: { sections: builderState.sections },
        },
      });
      setHasUnsavedChanges(false);
      toast.success("Form saved");
    } catch {
      toast.error("Failed to save form");
    }
  }, [formId, builderState, updateForm]);

  // Handle publish
  const handlePublish = useCallback(async () => {
    // Save first if there are unsaved changes
    if (hasUnsavedChanges && builderState) {
      try {
        await updateForm.mutateAsync({
          id: formId,
          dto: {
            schema: { sections: builderState.sections },
          },
        });
      } catch {
        toast.error("Failed to save before publishing");
        return;
      }
    }

    try {
      await publishForm.mutateAsync(formId);
      setHasUnsavedChanges(false);
      toast.success("Form published successfully");
    } catch {
      toast.error("Failed to publish form");
    }
  }, [formId, hasUnsavedChanges, builderState, updateForm, publishForm]);

  // Handle clone
  const handleClone = useCallback(async () => {
    try {
      const cloned = await cloneForm.mutateAsync(formId);
      toast.success("Form cloned successfully");
      router.push(`/forms/${cloned.id}`);
    } catch {
      toast.error("Failed to clone form");
    }
  }, [formId, cloneForm, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/forms">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !form) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 p-4 border-b">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/forms">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Form not found</h2>
            <p className="text-muted-foreground mt-1">
              The form you are looking for does not exist or you do not have
              access.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/forms">Return to Forms</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/forms">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{form.name}</h1>
              <Badge variant={STATUS_CONFIG[form.status].variant}>
                {STATUS_CONFIG[form.status].label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                v{form.version}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {TYPE_LABELS[form.type]} Form
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Clone Button */}
          <Button
            variant="outline"
            onClick={handleClone}
            disabled={cloneForm.isPending}
          >
            <Copy className="h-4 w-4 mr-2" />
            {cloneForm.isPending ? "Cloning..." : "Clone"}
          </Button>

          {/* Publish Button (only for drafts) */}
          {form.status === "DRAFT" && (
            <Button
              variant="outline"
              onClick={handlePublish}
              disabled={publishForm.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              {publishForm.isPending ? "Publishing..." : "Publish"}
            </Button>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={updateForm.isPending || !hasUnsavedChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateForm.isPending
              ? "Saving..."
              : hasUnsavedChanges
                ? "Save Changes"
                : "Saved"}
          </Button>
        </div>
      </div>

      {/* Form Builder */}
      <div className="flex-1 min-h-0">
        <FormBuilder
          initialState={initialState}
          onSave={handleBuilderSave}
          autoSaveInterval={30000}
          className="h-full"
        />
      </div>
    </div>
  );
}
