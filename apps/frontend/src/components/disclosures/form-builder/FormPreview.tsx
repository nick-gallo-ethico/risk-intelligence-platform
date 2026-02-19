"use client";

import { useState } from "react";
import { Monitor, Tablet, Smartphone, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FIELD_TYPES } from "./FieldPalette";
import type { FormBuilderState, FormSection, FormField } from "./FormBuilder";

// ============================================================================
// Types
// ============================================================================

export type PreviewMode = "desktop" | "tablet" | "mobile";

export interface FormPreviewProps {
  state: FormBuilderState;
  className?: string;
  onTogglePreview?: () => void;
  isPreviewMode?: boolean;
}

// ============================================================================
// Field Renderer
// ============================================================================

interface FieldRendererProps {
  field: FormField;
  disabled?: boolean;
}

function FieldRenderer({ field, disabled = false }: FieldRendererProps) {
  const fieldType = FIELD_TYPES.find((ft) => ft.type === field.type);

  const renderField = () => {
    switch (field.type) {
      case "text":
        return (
          <Input
            placeholder={
              field.placeholder || `Enter ${field.label.toLowerCase()}`
            }
            disabled={disabled}
            className="bg-background"
          />
        );

      case "textarea":
        return (
          <Textarea
            placeholder={
              field.placeholder || `Enter ${field.label.toLowerCase()}`
            }
            disabled={disabled}
            rows={(field.config?.rows as number) || 4}
            className="bg-background"
          />
        );

      case "number":
        return (
          <Input
            type="number"
            placeholder={field.placeholder || "0"}
            disabled={disabled}
            min={field.validation?.min}
            max={field.validation?.max}
            className="bg-background"
          />
        );

      case "date":
        return (
          <Input type="date" disabled={disabled} className="bg-background" />
        );

      case "dropdown":
        return (
          <select
            disabled={disabled}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">
              {(field.config?.placeholder as string) || "Select an option"}
            </option>
            {((field.config?.options as string[]) || []).map(
              (option: string, idx: number) => (
                <option key={idx} value={option}>
                  {option}
                </option>
              ),
            )}
          </select>
        );

      case "multi-select":
        return (
          <div className="space-y-2 p-3 border rounded-md bg-background">
            {(
              (field.config?.options as string[]) || ["Option 1", "Option 2"]
            ).map((option: string, idx: number) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox id={`${field.id}-${idx}`} disabled={disabled} />
                <Label
                  htmlFor={`${field.id}-${idx}`}
                  className="cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox id={field.id} disabled={disabled} />
            <Label htmlFor={field.id} className="cursor-pointer">
              {field.label}
            </Label>
          </div>
        );

      case "radio":
        return (
          <div
            className={cn(
              "space-y-2",
              field.config?.layout === "horizontal" &&
                "flex flex-wrap gap-4 space-y-0",
            )}
          >
            {(
              (field.config?.options as string[]) || ["Option 1", "Option 2"]
            ).map((option: string, idx: number) => (
              <div key={idx} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${field.id}-${idx}`}
                  name={field.id}
                  disabled={disabled}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-border dark:border-border"
                />
                <Label
                  htmlFor={`${field.id}-${idx}`}
                  className="cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case "relationship-mapper":
        return (
          <div className="space-y-3 p-4 border rounded-md bg-background">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Person/Organization Name
                </Label>
                <Input
                  placeholder="Enter name"
                  disabled={disabled}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Relationship Type
                </Label>
                <select
                  disabled={disabled}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select type</option>
                  {((field.config?.relationshipTypes as string[]) || []).map(
                    (type) => (
                      <option key={type} value={type}>
                        {type.replace(/_/g, " ")}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Nature of Relationship
              </Label>
              <Textarea
                placeholder="Describe the relationship..."
                disabled={disabled}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
        );

      case "dollar-threshold":
        return (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">$</span>
            <Input
              type="number"
              placeholder="0.00"
              disabled={disabled}
              step="0.01"
              min={0}
              className="bg-background"
            />
            <span className="text-sm text-muted-foreground">
              {(field.config?.currency as string) || "USD"}
            </span>
          </div>
        );

      case "recurring-date":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Start Date
                </Label>
                <Input type="date" disabled={disabled} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  End Date
                </Label>
                <Input type="date" disabled={disabled} className="mt-1" />
              </div>
            </div>
            {Boolean(field.config?.allowOngoing) && (
              <div className="flex items-center space-x-2">
                <Checkbox id={`${field.id}-ongoing`} disabled={disabled} />
                <Label
                  htmlFor={`${field.id}-ongoing`}
                  className="cursor-pointer text-sm"
                >
                  This is an ongoing relationship
                </Label>
              </div>
            )}
          </div>
        );

      case "entity-lookup":
        return (
          <div className="space-y-2">
            <div className="relative">
              <Input
                placeholder="Search for an entity..."
                disabled={disabled}
                className="bg-background"
              />
            </div>
            {Boolean(field.config?.allowCreate) && (
              <p className="text-xs text-muted-foreground">
                Start typing to search. If not found, you can create a new
                entry.
              </p>
            )}
          </div>
        );

      case "signature":
        return (
          <div className="space-y-4 p-4 border rounded-md bg-background">
            {typeof field.config?.legalText === "string" &&
              field.config.legalText && (
                <p className="text-sm text-muted-foreground italic">
                  {field.config.legalText}
                </p>
              )}
            <div className="border-2 border-dashed border-border rounded-lg h-24 flex items-center justify-center text-muted-foreground">
              Click to sign or draw signature
            </div>
            {Boolean(field.config?.requireTypedName) && (
              <div>
                <Label className="text-xs text-muted-foreground">
                  Typed Name
                </Label>
                <Input
                  placeholder="Type your full name"
                  disabled={disabled}
                  className="mt-1"
                />
              </div>
            )}
            {Boolean(field.config?.requireDate) && (
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input type="date" disabled={disabled} className="mt-1" />
              </div>
            )}
          </div>
        );

      case "file-upload":
        return (
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-background">
            <div className="text-muted-foreground mb-2">
              <svg
                className="mx-auto h-12 w-12"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Max {(field.config?.maxFiles as number) || 5} files,{" "}
              {(field.config?.maxSizeMB as number) || 10}MB each
            </p>
          </div>
        );

      case "calculated":
        return (
          <div className="p-3 bg-muted/50 border rounded-md">
            <p className="text-sm text-muted-foreground italic">
              This field will be calculated automatically
            </p>
            <p className="text-lg font-mono mt-1">--</p>
          </div>
        );

      default:
        return (
          <div className="p-3 bg-muted/50 border rounded-md text-muted-foreground text-sm">
            Unknown field type: {field.type}
          </div>
        );
    }
  };

  // For checkbox, the label is rendered inline with the control
  if (field.type === "checkbox") {
    return (
      <div className="space-y-1">
        {renderField()}
        {field.description && (
          <p className="text-xs text-muted-foreground ml-6">
            {field.description}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </Label>
      {field.description && (
        <p className="text-sm text-muted-foreground">{field.description}</p>
      )}
      {renderField()}
    </div>
  );
}

// ============================================================================
// Section Renderer
// ============================================================================

interface SectionRendererProps {
  section: FormSection;
  disabled?: boolean;
}

function SectionRenderer({ section, disabled = false }: SectionRendererProps) {
  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
      {/* Section Header */}
      <div className="px-6 py-4 bg-muted/50 border-b">
        <h3 className="text-lg font-semibold text-foreground">
          {section.name}
        </h3>
        {section.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {section.description}
          </p>
        )}
        {section.repeater?.enabled && (
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
            You can add multiple entries for this section.
          </p>
        )}
      </div>

      {/* Section Fields */}
      <div className="p-6 space-y-6">
        {section.fields.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No fields in this section
          </p>
        ) : (
          section.fields.map((field) => (
            <FieldRenderer key={field.id} field={field} disabled={disabled} />
          ))
        )}

        {/* Add more button for repeaters */}
        {section.repeater?.enabled && section.fields.length > 0 && (
          <Button variant="outline" className="w-full" disabled={disabled}>
            + {section.repeater.addButtonText || "Add Another"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Preview Viewport
// ============================================================================

const VIEWPORT_SIZES: Record<PreviewMode, { width: string; label: string }> = {
  desktop: { width: "100%", label: "Desktop" },
  tablet: { width: "768px", label: "Tablet" },
  mobile: { width: "375px", label: "Mobile" },
};

// ============================================================================
// Main FormPreview Component
// ============================================================================

export function FormPreview({
  state,
  className,
  onTogglePreview,
  isPreviewMode = false,
}: FormPreviewProps) {
  const [viewportMode, setViewportMode] = useState<PreviewMode>("desktop");

  return (
    <div className={cn("flex flex-col h-full bg-muted/50", className)}>
      {/* Toolbar */}
      <div className="bg-card border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Preview Mode
          </span>
          <div className="flex items-center border rounded-lg overflow-hidden">
            {(["desktop", "tablet", "mobile"] as PreviewMode[]).map((mode) => {
              const Icon =
                mode === "desktop"
                  ? Monitor
                  : mode === "tablet"
                    ? Tablet
                    : Smartphone;
              return (
                <button
                  key={mode}
                  onClick={() => setViewportMode(mode)}
                  className={cn(
                    "p-2 transition-colors",
                    viewportMode === mode
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                  title={VIEWPORT_SIZES[mode].label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>

        {onTogglePreview && (
          <Button variant="outline" size="sm" onClick={onTogglePreview}>
            {isPreviewMode ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Exit Preview
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </>
            )}
          </Button>
        )}
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto p-6 flex justify-center">
        <div
          className={cn(
            "transition-all duration-300",
            viewportMode !== "desktop" && "shadow-lg border rounded-lg bg-card",
          )}
          style={{
            width: VIEWPORT_SIZES[viewportMode].width,
            maxWidth: "100%",
          }}
        >
          {/* Form Header */}
          <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <h1 className="text-2xl font-bold">Disclosure Form</h1>
            <p className="text-blue-100 mt-1">
              Please complete all required fields marked with an asterisk (*).
            </p>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-6 bg-muted/50">
            {state.sections.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">No sections added yet</p>
                <p className="text-sm mt-2">
                  Add sections and fields to see your form preview
                </p>
              </div>
            ) : (
              state.sections.map((section) => (
                <SectionRenderer key={section.id} section={section} disabled />
              ))
            )}
          </div>

          {/* Form Footer */}
          {state.sections.length > 0 && (
            <div className="p-6 bg-card border-t flex justify-end gap-3 rounded-b-lg">
              <Button variant="outline" disabled>
                Save Draft
              </Button>
              <Button disabled>Submit Disclosure</Button>
            </div>
          )}
        </div>
      </div>

      {/* Viewport indicator */}
      <div className="bg-card border-t px-4 py-2 text-center">
        <span className="text-xs text-muted-foreground">
          Viewing as {VIEWPORT_SIZES[viewportMode].label} (
          {VIEWPORT_SIZES[viewportMode].width})
        </span>
      </div>
    </div>
  );
}

export default FormPreview;
