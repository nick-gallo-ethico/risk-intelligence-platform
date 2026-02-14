"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight, Settings2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EditableField } from "@/components/cases/editable-field";
import { cn } from "@/lib/utils";

/**
 * Property field configuration for CollapsiblePropertyCard
 */
export interface PropertyField {
  /** Unique key for the field */
  key: string;
  /** Display label */
  label: string;
  /** Current value */
  value: string | string[] | null | undefined;
  /** Field type determines the edit control */
  type: "text" | "select" | "date" | "tags" | "user" | "readonly";
  /** Options for select fields */
  options?: Array<{ value: string; label: string }>;
  /** Whether this field is editable (defaults to type !== 'readonly') */
  editable?: boolean;
  /** Callback when value changes */
  onChange?: (value: string | string[]) => Promise<void>;
  /** Custom render function for the value display */
  renderValue?: (value: string | string[] | null | undefined) => ReactNode;
  /** Placeholder text when value is empty */
  placeholder?: string;
}

interface CollapsiblePropertyCardProps {
  /** Card title */
  title: string;
  /** Array of property fields to display */
  fields: PropertyField[];
  /** Whether the card starts collapsed (used for uncontrolled mode) */
  defaultCollapsed?: boolean;
  /** Controlled open state - when provided, overrides internal state */
  isOpen?: boolean;
  /** Callback when open state changes - used with isOpen for controlled mode */
  onOpenChange?: (open: boolean) => void;
  /** Show the settings gear icon (admin only) */
  showSettingsGear?: boolean;
  /** Callback when settings gear is clicked */
  onSettingsClick?: () => void;
  /** Additional CSS class names */
  className?: string;
  /** Optional custom content rendered after fields */
  children?: ReactNode;
}

/**
 * CollapsiblePropertyCard - A reusable collapsible card with inline-editable fields.
 *
 * Used for property sections in the left sidebar of record detail pages:
 * - About This Case
 * - Intake Information
 * - Classification
 *
 * Features:
 * - Collapsible with animated chevron
 * - Optional settings gear (admin only)
 * - Inline editing via EditableField component
 * - Supports text, select, date, tags, user, and readonly field types
 * - Long text values truncated to 3 lines with "Show more" link
 *
 * Per spec Sections 14.4-14.6.
 */
export function CollapsiblePropertyCard({
  title,
  fields,
  defaultCollapsed = false,
  isOpen: controlledIsOpen,
  onOpenChange,
  showSettingsGear = false,
  onSettingsClick,
  className,
  children,
}: CollapsiblePropertyCardProps) {
  // Support both controlled and uncontrolled modes
  const [internalIsOpen, setInternalIsOpen] = useState(!defaultCollapsed);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  const setIsOpen = isControlled
    ? (open: boolean) => onOpenChange?.(open)
    : setInternalIsOpen;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader
          className={cn(
            "pb-2 cursor-pointer hover:bg-gray-50 transition-colors select-none py-3 px-4",
            isOpen && "border-b border-gray-100",
          )}
        >
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2 flex-1">
                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-gray-500 transition-transform duration-200 flex-shrink-0",
                    isOpen && "rotate-90",
                  )}
                />
                <CardTitle className="text-sm font-semibold text-gray-700">
                  {title}
                </CardTitle>
              </div>
            </CollapsibleTrigger>
            {showSettingsGear && (
              <Settings2
                className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onSettingsClick?.();
                }}
              />
            )}
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-2 px-4 pb-3">
            {fields.length === 0 && !children ? (
              <p className="text-sm text-gray-400 py-2">No fields configured</p>
            ) : (
              <>
                {children}
                {fields.length > 0 && (
                  <div className="space-y-0">
                    {fields.map((field) => (
                      <PropertyFieldRow key={field.key} field={field} />
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/**
 * Individual property field row within the card
 */
function PropertyFieldRow({ field }: { field: PropertyField }) {
  const isEditable =
    field.editable !== undefined ? field.editable : field.type !== "readonly";

  // Map our field types to EditableField types
  const getFieldType = () => {
    switch (field.type) {
      case "select":
        return "select";
      case "tags":
        return "tags";
      case "text":
      case "date":
      case "user":
      case "readonly":
      default:
        return "text";
    }
  };

  return (
    <EditableField
      label={field.label}
      value={field.value}
      fieldType={getFieldType()}
      options={field.options}
      readOnly={!isEditable}
      placeholder={field.placeholder ?? "Not specified"}
      onSave={async (value) => {
        if (field.onChange) {
          await field.onChange(value);
        }
      }}
      renderValue={field.renderValue}
    />
  );
}
