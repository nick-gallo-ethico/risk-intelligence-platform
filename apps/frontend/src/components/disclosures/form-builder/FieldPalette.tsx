'use client';

import { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Type,
  AlignLeft,
  Hash,
  Calendar,
  ChevronDown,
  ListChecks,
  CheckSquare,
  CircleDot,
  Users,
  DollarSign,
  CalendarClock,
  Building2,
  PenTool,
  Upload,
  Calculator,
  Search,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

/**
 * Field type definition for the form builder palette.
 */
export interface FieldTypeDefinition {
  type: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'basic' | 'compliance' | 'advanced';
  defaultConfig: Record<string, unknown>;
}

/**
 * All available field types organized by category.
 * These are the compliance field types per RS.22.
 */
export const FIELD_TYPES: FieldTypeDefinition[] = [
  // Basic Fields
  {
    type: 'text',
    name: 'Text',
    description: 'Single-line text input',
    icon: Type,
    group: 'basic',
    defaultConfig: { maxLength: 255 },
  },
  {
    type: 'textarea',
    name: 'Textarea',
    description: 'Multi-line text input',
    icon: AlignLeft,
    group: 'basic',
    defaultConfig: { maxLength: 2000, rows: 4 },
  },
  {
    type: 'number',
    name: 'Number',
    description: 'Numeric input with optional min/max',
    icon: Hash,
    group: 'basic',
    defaultConfig: { min: null, max: null, step: 1 },
  },
  {
    type: 'date',
    name: 'Date',
    description: 'Date picker',
    icon: Calendar,
    group: 'basic',
    defaultConfig: { minDate: null, maxDate: null },
  },
  {
    type: 'dropdown',
    name: 'Dropdown',
    description: 'Single-select dropdown',
    icon: ChevronDown,
    group: 'basic',
    defaultConfig: { options: [], placeholder: 'Select an option' },
  },
  {
    type: 'multi-select',
    name: 'Multi-select',
    description: 'Select multiple options',
    icon: ListChecks,
    group: 'basic',
    defaultConfig: { options: [], minSelections: null, maxSelections: null },
  },
  {
    type: 'checkbox',
    name: 'Checkbox',
    description: 'Single checkbox for yes/no',
    icon: CheckSquare,
    group: 'basic',
    defaultConfig: { defaultChecked: false },
  },
  {
    type: 'radio',
    name: 'Radio',
    description: 'Single selection from options',
    icon: CircleDot,
    group: 'basic',
    defaultConfig: { options: [], layout: 'vertical' },
  },

  // Compliance Fields (per RS.22)
  {
    type: 'relationship-mapper',
    name: 'Relationship Mapper',
    description: 'Map relationships between parties (family, business, etc.)',
    icon: Users,
    group: 'compliance',
    defaultConfig: {
      relationshipTypes: [
        'family',
        'friend',
        'former_colleague',
        'investor',
        'board_member',
        'vendor',
        'customer',
        'government',
      ],
      requireOrganization: true,
      requireTitle: false,
    },
  },
  {
    type: 'dollar-threshold',
    name: 'Dollar Threshold',
    description: 'Currency amount with threshold alerting',
    icon: DollarSign,
    group: 'compliance',
    defaultConfig: {
      currency: 'USD',
      minValue: 0,
      maxValue: null,
      warningThreshold: null,
      criticalThreshold: null,
    },
  },
  {
    type: 'recurring-date',
    name: 'Recurring Date',
    description: 'Date with ongoing/recurring options',
    icon: CalendarClock,
    group: 'compliance',
    defaultConfig: {
      allowOngoing: true,
      requireEndDate: false,
      showFrequency: false,
    },
  },
  {
    type: 'entity-lookup',
    name: 'Entity Lookup',
    description: 'Search and link to existing entities',
    icon: Building2,
    group: 'compliance',
    defaultConfig: {
      entityTypes: ['vendor', 'customer', 'organization'],
      allowCreate: true,
      fuzzyMatch: true,
    },
  },
  {
    type: 'signature',
    name: 'Signature',
    description: 'Digital signature capture',
    icon: PenTool,
    group: 'compliance',
    defaultConfig: {
      requireTypedName: true,
      requireDate: true,
      legalText: 'I certify that the information provided is true and accurate.',
    },
  },

  // Advanced Fields
  {
    type: 'file-upload',
    name: 'File Upload',
    description: 'Upload documents and attachments',
    icon: Upload,
    group: 'advanced',
    defaultConfig: {
      maxFiles: 5,
      maxSizeMB: 10,
      allowedTypes: ['.pdf', '.doc', '.docx', '.jpg', '.png'],
      requireDescription: false,
    },
  },
  {
    type: 'calculated',
    name: 'Calculated Field',
    description: 'Auto-calculated based on other fields',
    icon: Calculator,
    group: 'advanced',
    defaultConfig: {
      formula: '',
      dependsOn: [],
      outputType: 'number',
    },
  },
];

/**
 * Group labels for organizing field types.
 */
const GROUP_LABELS: Record<string, string> = {
  basic: 'Basic Fields',
  compliance: 'Compliance Fields',
  advanced: 'Advanced Fields',
};

/**
 * Props for a draggable field item in the palette.
 */
interface DraggableFieldProps {
  fieldType: FieldTypeDefinition;
  id: string;
}

/**
 * A draggable field item in the palette.
 * Uses @dnd-kit for drag functionality.
 */
function DraggableField({ fieldType, id }: DraggableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: {
      type: 'palette-field',
      fieldType,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const Icon = fieldType.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-3 p-3 bg-white rounded-lg border cursor-grab',
        'hover:border-blue-300 hover:bg-blue-50/50 transition-colors',
        'active:cursor-grabbing',
        isDragging && 'opacity-50 ring-2 ring-blue-500'
      )}
    >
      <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-gray-600" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {fieldType.name}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {fieldType.description}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Props for the FieldPalette component.
 */
export interface FieldPaletteProps {
  className?: string;
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}

/**
 * Draggable field palette with all compliance field types.
 * Organized into groups: Basic, Compliance, and Advanced.
 * Includes search/filter functionality.
 */
export function FieldPalette({
  className,
  collapsed = false,
  onCollapseChange,
}: FieldPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    basic: true,
    compliance: true,
    advanced: true,
  });

  // Filter fields based on search query
  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) {
      return FIELD_TYPES;
    }
    const query = searchQuery.toLowerCase();
    return FIELD_TYPES.filter(
      (field) =>
        field.name.toLowerCase().includes(query) ||
        field.description.toLowerCase().includes(query) ||
        field.type.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group filtered fields by category
  const groupedFields = useMemo(() => {
    const groups: Record<string, FieldTypeDefinition[]> = {
      basic: [],
      compliance: [],
      advanced: [],
    };

    for (const field of filteredFields) {
      groups[field.group].push(field);
    }

    return groups;
  }, [filteredFields]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  if (collapsed) {
    return (
      <div
        className={cn(
          'w-12 bg-gray-50 border-r flex flex-col items-center py-4 cursor-pointer',
          className
        )}
        onClick={() => onCollapseChange?.(false)}
        title="Expand field palette"
      >
        <ChevronRight className="h-5 w-5 text-gray-500" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-72 bg-gray-50 border-r flex flex-col overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Field Types</h3>
          <button
            onClick={() => onCollapseChange?.(true)}
            className="p-1 hover:bg-gray-100 rounded"
            title="Collapse palette"
          >
            <ChevronRight className="h-4 w-4 text-gray-500 rotate-180" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Field Groups */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(['basic', 'compliance', 'advanced'] as const).map((group) => {
          const fields = groupedFields[group];
          if (fields.length === 0) return null;

          return (
            <Collapsible
              key={group}
              open={expandedGroups[group]}
              onOpenChange={() => toggleGroup(group)}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                <span>{GROUP_LABELS[group]}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    !expandedGroups[group] && '-rotate-90'
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {fields.map((field) => (
                  <DraggableField
                    key={field.type}
                    id={`palette-${field.type}`}
                    fieldType={field}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {filteredFields.length === 0 && (
          <div className="text-center text-sm text-gray-500 py-8">
            No fields match "{searchQuery}"
          </div>
        )}
      </div>

      {/* Footer with count */}
      <div className="p-3 border-t bg-white text-xs text-gray-500 text-center">
        {filteredFields.length} field type{filteredFields.length !== 1 ? 's' : ''} available
      </div>
    </div>
  );
}

export default FieldPalette;
