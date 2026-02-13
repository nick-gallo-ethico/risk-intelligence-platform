"use client";

/**
 * New Form Page
 *
 * Creates a new form definition using the FormBuilder component.
 * User selects form type, then uses the visual builder to design the form.
 */

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormBuilder,
  type FormBuilderState,
} from "@/components/disclosures/form-builder";
import { useCreateForm } from "@/hooks/use-forms";
import type { FormType } from "@/lib/forms-api";

/**
 * Form type options for selection.
 */
const FORM_TYPE_OPTIONS: { value: FormType; label: string }[] = [
  { value: "DISCLOSURE", label: "Disclosure" },
  { value: "ATTESTATION", label: "Attestation" },
  { value: "SURVEY", label: "Survey" },
  { value: "INTAKE", label: "Intake Form" },
  { value: "WORKFLOW_TASK", label: "Workflow Task" },
  { value: "CUSTOM", label: "Custom" },
];

export default function NewFormPage() {
  const router = useRouter();
  const createForm = useCreateForm();

  // Form metadata state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<FormType | null>(null);
  const [formDescription, setFormDescription] = useState("");

  // Track form builder state
  const [builderState, setBuilderState] = useState<FormBuilderState | null>(
    null,
  );

  // Handle save from builder
  const handleBuilderSave = useCallback(async (state: FormBuilderState) => {
    setBuilderState(state);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!formName.trim()) {
      toast.error("Please enter a form name");
      return;
    }

    if (!formType) {
      toast.error("Please select a form type");
      return;
    }

    try {
      const result = await createForm.mutateAsync({
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        type: formType,
        schema: builderState
          ? { sections: builderState.sections }
          : { sections: [] },
      });

      toast.success("Form created successfully");
      router.push(`/forms/${result.id}`);
    } catch {
      toast.error("Failed to create form");
    }
  }, [formName, formType, formDescription, builderState, createForm, router]);

  // Show type selector if type not chosen yet
  if (!formType) {
    return (
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/forms">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create New Form</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Form Name */}
            <div className="space-y-2">
              <Label htmlFor="form-name">Form Name *</Label>
              <Input
                id="form-name"
                placeholder="Enter form name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            {/* Form Description */}
            <div className="space-y-2">
              <Label htmlFor="form-description">Description</Label>
              <Input
                id="form-description"
                placeholder="Optional description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            {/* Form Type */}
            <div className="space-y-2">
              <Label htmlFor="form-type">Form Type *</Label>
              <Select
                value={formType || ""}
                onValueChange={(value) => setFormType(value as FormType)}
              >
                <SelectTrigger id="form-type">
                  <SelectValue placeholder="Select form type" />
                </SelectTrigger>
                <SelectContent>
                  {FORM_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose the type of form you want to create
              </p>
            </div>

            {/* Continue Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={() => {
                  if (!formName.trim()) {
                    toast.error("Please enter a form name");
                    return;
                  }
                  // Type will be set by Select, so we can proceed
                }}
                disabled={!formName.trim() || !formType}
              >
                Continue to Form Builder
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show form builder after type is selected
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
            <h1 className="text-lg font-semibold">{formName}</h1>
            <p className="text-sm text-muted-foreground">
              {FORM_TYPE_OPTIONS.find((o) => o.value === formType)?.label} Form
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={createForm.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {createForm.isPending ? "Saving..." : "Save Form"}
        </Button>
      </div>

      {/* Form Builder */}
      <div className="flex-1 min-h-0">
        <FormBuilder
          onSave={handleBuilderSave}
          autoSaveInterval={60000}
          className="h-full"
        />
      </div>
    </div>
  );
}
