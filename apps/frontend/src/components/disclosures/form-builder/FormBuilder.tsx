'use client';

import { useReducer, useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  GripVertical,
  Trash2,
  Settings,
  Copy,
  ChevronDown,
  ChevronRight,
  X,
  Repeat,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldPalette, FIELD_TYPES, type FieldTypeDefinition } from './FieldPalette';

// ============================================================================
// Types
// ============================================================================

export interface FormField {
  id: string;
  type: string;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    patternMessage?: string;
  };
  conditionalLogic?: {
    enabled: boolean;
    action: 'show' | 'hide';
    conditions: Array<{
      fieldId: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
      value: string;
    }>;
    match: 'all' | 'any';
  };
  config: Record<string, unknown>;
}

export interface FormSection {
  id: string;
  name: string;
  description?: string;
  collapsed?: boolean;
  fields: FormField[];
  repeater?: {
    enabled: boolean;
    minItems?: number;
    maxItems?: number;
    addButtonText?: string;
  };
  nestedRepeater?: {
    enabled: boolean;
    maxItems?: number;
  };
}

export interface FormBuilderState {
  sections: FormSection[];
  selectedFieldId: string | null;
  selectedSectionId: string | null;
  isDirty: boolean;
  lastSaved: Date | null;
}

type FormBuilderAction =
  | { type: 'ADD_SECTION' }
  | { type: 'UPDATE_SECTION'; sectionId: string; updates: Partial<FormSection> }
  | { type: 'DELETE_SECTION'; sectionId: string }
  | { type: 'REORDER_SECTIONS'; fromIndex: number; toIndex: number }
  | { type: 'TOGGLE_SECTION_COLLAPSE'; sectionId: string }
  | { type: 'ADD_FIELD'; sectionId: string; fieldType: FieldTypeDefinition; index?: number }
  | { type: 'UPDATE_FIELD'; sectionId: string; fieldId: string; updates: Partial<FormField> }
  | { type: 'DELETE_FIELD'; sectionId: string; fieldId: string }
  | { type: 'REORDER_FIELDS'; sectionId: string; fromIndex: number; toIndex: number }
  | { type: 'MOVE_FIELD_BETWEEN_SECTIONS'; fromSectionId: string; toSectionId: string; fieldId: string; toIndex: number }
  | { type: 'SELECT_FIELD'; fieldId: string | null; sectionId: string | null }
  | { type: 'MARK_SAVED' }
  | { type: 'LOAD_STATE'; state: FormBuilderState };

// ============================================================================
// Reducer
// ============================================================================

function generateId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formBuilderReducer(state: FormBuilderState, action: FormBuilderAction): FormBuilderState {
  switch (action.type) {
    case 'ADD_SECTION': {
      const newSection: FormSection = {
        id: generateId(),
        name: `Section ${state.sections.length + 1}`,
        fields: [],
      };
      return {
        ...state,
        sections: [...state.sections, newSection],
        isDirty: true,
      };
    }

    case 'UPDATE_SECTION': {
      return {
        ...state,
        sections: state.sections.map((section) =>
          section.id === action.sectionId
            ? { ...section, ...action.updates }
            : section
        ),
        isDirty: true,
      };
    }

    case 'DELETE_SECTION': {
      return {
        ...state,
        sections: state.sections.filter((s) => s.id !== action.sectionId),
        selectedSectionId:
          state.selectedSectionId === action.sectionId ? null : state.selectedSectionId,
        selectedFieldId:
          state.sections.find((s) => s.id === action.sectionId)?.fields.some(
            (f) => f.id === state.selectedFieldId
          )
            ? null
            : state.selectedFieldId,
        isDirty: true,
      };
    }

    case 'REORDER_SECTIONS': {
      const newSections = arrayMove(state.sections, action.fromIndex, action.toIndex);
      return {
        ...state,
        sections: newSections,
        isDirty: true,
      };
    }

    case 'TOGGLE_SECTION_COLLAPSE': {
      return {
        ...state,
        sections: state.sections.map((section) =>
          section.id === action.sectionId
            ? { ...section, collapsed: !section.collapsed }
            : section
        ),
      };
    }

    case 'ADD_FIELD': {
      const newField: FormField = {
        id: generateId(),
        type: action.fieldType.type,
        label: action.fieldType.name,
        required: false,
        config: { ...action.fieldType.defaultConfig },
      };
      return {
        ...state,
        sections: state.sections.map((section) => {
          if (section.id !== action.sectionId) return section;
          const fields = [...section.fields];
          const index = action.index ?? fields.length;
          fields.splice(index, 0, newField);
          return { ...section, fields };
        }),
        selectedFieldId: newField.id,
        selectedSectionId: action.sectionId,
        isDirty: true,
      };
    }

    case 'UPDATE_FIELD': {
      return {
        ...state,
        sections: state.sections.map((section) => {
          if (section.id !== action.sectionId) return section;
          return {
            ...section,
            fields: section.fields.map((field) =>
              field.id === action.fieldId ? { ...field, ...action.updates } : field
            ),
          };
        }),
        isDirty: true,
      };
    }

    case 'DELETE_FIELD': {
      return {
        ...state,
        sections: state.sections.map((section) => {
          if (section.id !== action.sectionId) return section;
          return {
            ...section,
            fields: section.fields.filter((f) => f.id !== action.fieldId),
          };
        }),
        selectedFieldId:
          state.selectedFieldId === action.fieldId ? null : state.selectedFieldId,
        isDirty: true,
      };
    }

    case 'REORDER_FIELDS': {
      return {
        ...state,
        sections: state.sections.map((section) => {
          if (section.id !== action.sectionId) return section;
          return {
            ...section,
            fields: arrayMove(section.fields, action.fromIndex, action.toIndex),
          };
        }),
        isDirty: true,
      };
    }

    case 'MOVE_FIELD_BETWEEN_SECTIONS': {
      const fromSection = state.sections.find((s) => s.id === action.fromSectionId);
      const field = fromSection?.fields.find((f) => f.id === action.fieldId);
      if (!field) return state;

      return {
        ...state,
        sections: state.sections.map((section) => {
          if (section.id === action.fromSectionId) {
            return {
              ...section,
              fields: section.fields.filter((f) => f.id !== action.fieldId),
            };
          }
          if (section.id === action.toSectionId) {
            const fields = [...section.fields];
            fields.splice(action.toIndex, 0, field);
            return { ...section, fields };
          }
          return section;
        }),
        selectedSectionId: action.toSectionId,
        isDirty: true,
      };
    }

    case 'SELECT_FIELD': {
      return {
        ...state,
        selectedFieldId: action.fieldId,
        selectedSectionId: action.sectionId,
      };
    }

    case 'MARK_SAVED': {
      return {
        ...state,
        isDirty: false,
        lastSaved: new Date(),
      };
    }

    case 'LOAD_STATE': {
      return action.state;
    }

    default:
      return state;
  }
}

const initialBuilderState: FormBuilderState = {
  sections: [
    {
      id: 'default-section',
      name: 'Section 1',
      fields: [],
    },
  ],
  selectedFieldId: null,
  selectedSectionId: null,
  isDirty: false,
  lastSaved: null,
};

// ============================================================================
// Sortable Field Component
// ============================================================================

interface SortableFieldProps {
  field: FormField;
  sectionId: string;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SortableField({ field, sectionId, isSelected, onSelect, onDelete }: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.id,
    data: { type: 'field', sectionId, field },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const fieldType = FIELD_TYPES.find((ft) => ft.type === field.type);
  const Icon = fieldType?.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 bg-white rounded-lg border transition-all',
        isSelected && 'ring-2 ring-blue-500 border-blue-500',
        isDragging && 'opacity-50 shadow-lg',
        !isSelected && 'hover:border-gray-300'
      )}
      onClick={onSelect}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Icon className="h-3 w-3 text-gray-600" />
            </div>
          )}
          <span className="font-medium text-sm truncate">{field.label}</span>
          {field.required && (
            <span className="text-red-500 text-xs">*</span>
          )}
        </div>
        {field.description && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{field.description}</p>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ============================================================================
// Section Component
// ============================================================================

interface FormSectionComponentProps {
  section: FormSection;
  selectedFieldId: string | null;
  onUpdateSection: (updates: Partial<FormSection>) => void;
  onDeleteSection: () => void;
  onToggleCollapse: () => void;
  onSelectField: (fieldId: string) => void;
  onDeleteField: (fieldId: string) => void;
  onDropField: (fieldType: FieldTypeDefinition, index?: number) => void;
}

function FormSectionComponent({
  section,
  selectedFieldId,
  onUpdateSection,
  onDeleteSection,
  onToggleCollapse,
  onSelectField,
  onDeleteField,
  onDropField,
}: FormSectionComponentProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
    data: { type: 'section', section },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [isEditing, setIsEditing] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white rounded-xl border shadow-sm',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      {/* Section Header */}
      <div className="flex items-center gap-2 p-4 border-b bg-gray-50 rounded-t-xl">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </button>

        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-gray-200 rounded"
        >
          {section.collapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </button>

        {isEditing ? (
          <Input
            value={section.name}
            onChange={(e) => onUpdateSection({ name: e.target.value })}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
            className="h-7 text-sm font-semibold"
            autoFocus
          />
        ) : (
          <span
            className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
            onClick={() => setIsEditing(true)}
          >
            {section.name}
          </span>
        )}

        {section.repeater?.enabled && (
          <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
            <Repeat className="h-3 w-3" />
            Repeater
          </span>
        )}

        <span className="text-xs text-gray-500 ml-auto">
          {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
        </span>

        <button
          onClick={onDeleteSection}
          className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Section Content */}
      {!section.collapsed && (
        <div className="p-4 space-y-2 min-h-[100px]">
          {section.fields.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400">
              <p className="text-sm">Drag fields here from the palette</p>
            </div>
          ) : (
            <SortableContext
              items={section.fields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              {section.fields.map((field) => (
                <SortableField
                  key={field.id}
                  field={field}
                  sectionId={section.id}
                  isSelected={selectedFieldId === field.id}
                  onSelect={() => onSelectField(field.id)}
                  onDelete={() => onDeleteField(field.id)}
                />
              ))}
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Field Configuration Panel
// ============================================================================

interface FieldConfigPanelProps {
  field: FormField;
  sectionId: string;
  allFields: FormField[];
  onUpdate: (updates: Partial<FormField>) => void;
  onClose: () => void;
}

function FieldConfigPanel({ field, sectionId, allFields, onUpdate, onClose }: FieldConfigPanelProps) {
  const fieldType = FIELD_TYPES.find((ft) => ft.type === field.type);

  return (
    <div className="w-80 bg-white border-l flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Field Settings</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Basic</h4>

          <div className="space-y-2">
            <Label htmlFor="field-label">Label</Label>
            <Input
              id="field-label"
              value={field.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-description">Description</Label>
            <Textarea
              id="field-description"
              value={field.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={2}
              placeholder="Help text shown below the field"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-placeholder">Placeholder</Label>
            <Input
              id="field-placeholder"
              value={field.placeholder || ''}
              onChange={(e) => onUpdate({ placeholder: e.target.value })}
              placeholder="Placeholder text"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="field-required"
              checked={field.required}
              onCheckedChange={(checked) => onUpdate({ required: checked === true })}
            />
            <Label htmlFor="field-required" className="cursor-pointer">
              Required field
            </Label>
          </div>
        </div>

        {/* Validation */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Validation</h4>

          {(field.type === 'text' || field.type === 'textarea') && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="validation-minLength">Min Length</Label>
                <Input
                  id="validation-minLength"
                  type="number"
                  min={0}
                  value={field.validation?.minLength ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      validation: {
                        ...field.validation,
                        minLength: e.target.value ? parseInt(e.target.value) : undefined,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validation-maxLength">Max Length</Label>
                <Input
                  id="validation-maxLength"
                  type="number"
                  min={0}
                  value={field.validation?.maxLength ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      validation: {
                        ...field.validation,
                        maxLength: e.target.value ? parseInt(e.target.value) : undefined,
                      },
                    })
                  }
                />
              </div>
            </div>
          )}

          {(field.type === 'number' || field.type === 'dollar-threshold') && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="validation-min">Min Value</Label>
                <Input
                  id="validation-min"
                  type="number"
                  value={field.validation?.min ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      validation: {
                        ...field.validation,
                        min: e.target.value ? parseFloat(e.target.value) : undefined,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validation-max">Max Value</Label>
                <Input
                  id="validation-max"
                  type="number"
                  value={field.validation?.max ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      validation: {
                        ...field.validation,
                        max: e.target.value ? parseFloat(e.target.value) : undefined,
                      },
                    })
                  }
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="validation-pattern">Regex Pattern</Label>
            <Input
              id="validation-pattern"
              value={field.validation?.pattern || ''}
              onChange={(e) =>
                onUpdate({
                  validation: {
                    ...field.validation,
                    pattern: e.target.value || undefined,
                  },
                })
              }
              placeholder="e.g., ^[a-zA-Z]+$"
            />
          </div>
        </div>

        {/* Conditional Logic */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Conditional Logic</h4>
            <Checkbox
              checked={field.conditionalLogic?.enabled ?? false}
              onCheckedChange={(checked) =>
                onUpdate({
                  conditionalLogic: {
                    enabled: checked === true,
                    action: field.conditionalLogic?.action ?? 'show',
                    conditions: field.conditionalLogic?.conditions ?? [],
                    match: field.conditionalLogic?.match ?? 'all',
                  },
                })
              }
            />
          </div>
          {field.conditionalLogic?.enabled && (
            <p className="text-xs text-gray-500">
              Configure when this field should be shown/hidden based on other field values.
            </p>
          )}
        </div>

        {/* Type-specific Settings */}
        {fieldType && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Type Settings</h4>
            <p className="text-xs text-gray-500">
              Configure {fieldType.name.toLowerCase()}-specific options.
            </p>
            {/* Type-specific config would be rendered here based on field.type */}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Section Configuration Panel
// ============================================================================

interface SectionConfigPanelProps {
  section: FormSection;
  onUpdate: (updates: Partial<FormSection>) => void;
  onClose: () => void;
}

function SectionConfigPanel({ section, onUpdate, onClose }: SectionConfigPanelProps) {
  return (
    <div className="w-80 bg-white border-l flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Section Settings</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Basic</h4>

          <div className="space-y-2">
            <Label htmlFor="section-name">Name</Label>
            <Input
              id="section-name"
              value={section.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="section-description">Description</Label>
            <Textarea
              id="section-description"
              value={section.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={2}
              placeholder="Optional section description"
            />
          </div>
        </div>

        {/* Repeater Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Repeater</h4>
            <Checkbox
              checked={section.repeater?.enabled ?? false}
              onCheckedChange={(checked) =>
                onUpdate({
                  repeater: {
                    enabled: checked === true,
                    minItems: section.repeater?.minItems,
                    maxItems: section.repeater?.maxItems,
                    addButtonText: section.repeater?.addButtonText ?? 'Add Another',
                  },
                })
              }
            />
          </div>
          <p className="text-xs text-gray-500">
            Allow users to add multiple entries for this section.
          </p>

          {section.repeater?.enabled && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="repeater-min">Min Items</Label>
                  <Input
                    id="repeater-min"
                    type="number"
                    min={0}
                    value={section.repeater.minItems ?? ''}
                    onChange={(e) =>
                      onUpdate({
                        repeater: {
                          ...section.repeater!,
                          minItems: e.target.value ? parseInt(e.target.value) : undefined,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repeater-max">Max Items</Label>
                  <Input
                    id="repeater-max"
                    type="number"
                    min={1}
                    value={section.repeater.maxItems ?? ''}
                    onChange={(e) =>
                      onUpdate({
                        repeater: {
                          ...section.repeater!,
                          maxItems: e.target.value ? parseInt(e.target.value) : undefined,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="repeater-button">Add Button Text</Label>
                <Input
                  id="repeater-button"
                  value={section.repeater.addButtonText ?? 'Add Another'}
                  onChange={(e) =>
                    onUpdate({
                      repeater: {
                        ...section.repeater!,
                        addButtonText: e.target.value,
                      },
                    })
                  }
                />
              </div>

              {/* Nested Repeater (max 2 levels per RS.23) */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium text-gray-600">Nested Repeater</h5>
                  <Checkbox
                    checked={section.nestedRepeater?.enabled ?? false}
                    onCheckedChange={(checked) =>
                      onUpdate({
                        nestedRepeater: {
                          enabled: checked === true,
                          maxItems: section.nestedRepeater?.maxItems ?? 5,
                        },
                      })
                    }
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Allow nested items within each repeater entry (max 2 levels).
                </p>

                {section.nestedRepeater?.enabled && (
                  <div className="mt-2 space-y-2">
                    <Label htmlFor="nested-max">Max Nested Items</Label>
                    <Input
                      id="nested-max"
                      type="number"
                      min={1}
                      max={10}
                      value={section.nestedRepeater.maxItems ?? 5}
                      onChange={(e) =>
                        onUpdate({
                          nestedRepeater: {
                            ...section.nestedRepeater!,
                            maxItems: parseInt(e.target.value) || 5,
                          },
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main FormBuilder Component
// ============================================================================

export interface FormBuilderProps {
  initialState?: FormBuilderState;
  onSave?: (state: FormBuilderState) => Promise<void>;
  autoSaveInterval?: number; // in milliseconds, default 30000 (30 seconds)
  className?: string;
}

export function FormBuilder({
  initialState,
  onSave,
  autoSaveInterval = 30000,
  className,
}: FormBuilderProps) {
  const [state, dispatch] = useReducer(
    formBuilderReducer,
    initialState ?? { ...initialBuilderState }
  );
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeType, setActiveType] = useState<'section' | 'field' | 'palette-field' | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize from state if provided
  useEffect(() => {
    if (initialState) {
      dispatch({ type: 'LOAD_STATE', state: initialState });
    }
  }, [initialState]);

  // Auto-save functionality
  useEffect(() => {
    if (!onSave || !state.isDirty) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await onSave(state);
        dispatch({ type: 'MARK_SAVED' });
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [state, onSave, autoSaveInterval]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);

    const data = active.data.current;
    if (data?.type === 'section') {
      setActiveType('section');
    } else if (data?.type === 'field') {
      setActiveType('field');
    } else if (data?.type === 'palette-field') {
      setActiveType('palette-field');
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setActiveType(null);

      if (!over) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      // Handle palette field dropped onto canvas
      if (activeData?.type === 'palette-field') {
        const fieldType = activeData.fieldType as FieldTypeDefinition;

        // Find target section
        let targetSectionId: string | null = null;
        let targetIndex: number | undefined;

        if (overData?.type === 'section') {
          targetSectionId = overData.section.id;
        } else if (overData?.type === 'field') {
          targetSectionId = overData.sectionId;
          const section = state.sections.find((s) => s.id === targetSectionId);
          if (section) {
            targetIndex = section.fields.findIndex((f) => f.id === over.id) + 1;
          }
        }

        // Default to first section if no target found
        if (!targetSectionId && state.sections.length > 0) {
          targetSectionId = state.sections[0].id;
        }

        if (targetSectionId) {
          dispatch({
            type: 'ADD_FIELD',
            sectionId: targetSectionId,
            fieldType,
            index: targetIndex,
          });
        }
        return;
      }

      // Handle section reordering
      if (activeData?.type === 'section' && overData?.type === 'section') {
        const fromIndex = state.sections.findIndex((s) => s.id === active.id);
        const toIndex = state.sections.findIndex((s) => s.id === over.id);
        if (fromIndex !== toIndex) {
          dispatch({ type: 'REORDER_SECTIONS', fromIndex, toIndex });
        }
        return;
      }

      // Handle field reordering within same section
      if (activeData?.type === 'field' && overData?.type === 'field') {
        const fromSectionId = activeData.sectionId;
        const toSectionId = overData.sectionId;

        if (fromSectionId === toSectionId) {
          const section = state.sections.find((s) => s.id === fromSectionId);
          if (section) {
            const fromIndex = section.fields.findIndex((f) => f.id === active.id);
            const toIndex = section.fields.findIndex((f) => f.id === over.id);
            if (fromIndex !== toIndex) {
              dispatch({
                type: 'REORDER_FIELDS',
                sectionId: fromSectionId,
                fromIndex,
                toIndex,
              });
            }
          }
        } else {
          // Move field between sections
          const toSection = state.sections.find((s) => s.id === toSectionId);
          if (toSection) {
            const toIndex = toSection.fields.findIndex((f) => f.id === over.id);
            dispatch({
              type: 'MOVE_FIELD_BETWEEN_SECTIONS',
              fromSectionId,
              toSectionId,
              fieldId: active.id as string,
              toIndex,
            });
          }
        }
      }
    },
    [state.sections]
  );

  // Get selected field and section
  const selectedSection = state.sections.find((s) => s.id === state.selectedSectionId);
  const selectedField = selectedSection?.fields.find((f) => f.id === state.selectedFieldId);
  const allFields = state.sections.flatMap((s) => s.fields);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('flex h-full', className)}>
        {/* Left: Field Palette */}
        <FieldPalette
          collapsed={paletteCollapsed}
          onCollapseChange={setPaletteCollapsed}
        />

        {/* Center: Form Canvas */}
        <div className="flex-1 bg-gray-100 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Auto-save indicator */}
            {state.isDirty && (
              <div className="text-xs text-gray-500 text-right">
                {isSaving ? 'Saving...' : 'Unsaved changes'}
              </div>
            )}
            {state.lastSaved && !state.isDirty && (
              <div className="text-xs text-green-600 text-right">
                Last saved: {state.lastSaved.toLocaleTimeString()}
              </div>
            )}

            {/* Sections */}
            <SortableContext
              items={state.sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {state.sections.map((section) => (
                <FormSectionComponent
                  key={section.id}
                  section={section}
                  selectedFieldId={state.selectedFieldId}
                  onUpdateSection={(updates) =>
                    dispatch({
                      type: 'UPDATE_SECTION',
                      sectionId: section.id,
                      updates,
                    })
                  }
                  onDeleteSection={() =>
                    dispatch({ type: 'DELETE_SECTION', sectionId: section.id })
                  }
                  onToggleCollapse={() =>
                    dispatch({ type: 'TOGGLE_SECTION_COLLAPSE', sectionId: section.id })
                  }
                  onSelectField={(fieldId) =>
                    dispatch({
                      type: 'SELECT_FIELD',
                      fieldId,
                      sectionId: section.id,
                    })
                  }
                  onDeleteField={(fieldId) =>
                    dispatch({
                      type: 'DELETE_FIELD',
                      sectionId: section.id,
                      fieldId,
                    })
                  }
                  onDropField={(fieldType, index) =>
                    dispatch({
                      type: 'ADD_FIELD',
                      sectionId: section.id,
                      fieldType,
                      index,
                    })
                  }
                />
              ))}
            </SortableContext>

            {/* Add Section Button */}
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => dispatch({ type: 'ADD_SECTION' })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>
        </div>

        {/* Right: Configuration Panel */}
        {selectedField && selectedSection && (
          <FieldConfigPanel
            field={selectedField}
            sectionId={selectedSection.id}
            allFields={allFields}
            onUpdate={(updates) =>
              dispatch({
                type: 'UPDATE_FIELD',
                sectionId: selectedSection.id,
                fieldId: selectedField.id,
                updates,
              })
            }
            onClose={() =>
              dispatch({ type: 'SELECT_FIELD', fieldId: null, sectionId: null })
            }
          />
        )}

        {/* Section config when no field selected but section is */}
        {!selectedField && selectedSection && state.selectedSectionId && (
          <SectionConfigPanel
            section={selectedSection}
            onUpdate={(updates) =>
              dispatch({
                type: 'UPDATE_SECTION',
                sectionId: selectedSection.id,
                updates,
              })
            }
            onClose={() =>
              dispatch({ type: 'SELECT_FIELD', fieldId: null, sectionId: null })
            }
          />
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && activeType === 'palette-field' && (
          <div className="bg-white rounded-lg border shadow-lg p-3 opacity-80">
            Dropping field...
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

export default FormBuilder;
