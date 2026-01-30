'use client';

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, X, Check } from 'lucide-react';

export type FieldType = 'text' | 'select' | 'tags';

interface SelectOption {
  value: string;
  label: string;
}

interface EditableFieldProps {
  label: string;
  value: string | string[] | null | undefined;
  fieldType?: FieldType;
  options?: SelectOption[];
  readOnly?: boolean;
  placeholder?: string;
  onSave: (value: string | string[]) => Promise<void>;
  renderValue?: (value: string | string[] | null | undefined) => React.ReactNode;
  className?: string;
}

/**
 * Inline editable field component.
 * Supports text, select, and tags field types.
 * - Click to edit
 * - Save on blur or Enter
 * - Cancel on Escape
 */
export function EditableField({
  label,
  value,
  fieldType = 'text',
  options = [],
  readOnly = false,
  placeholder = '—',
  onSave,
  renderValue,
  className,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert value to display string
  const displayValue = Array.isArray(value) ? value.join(', ') : value;

  // Initialize edit value when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setEditValue(displayValue || '');
      // Focus input after a brief delay to allow render
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isEditing, displayValue]);

  const handleStartEdit = useCallback(() => {
    if (readOnly || isSaving) return;
    setIsEditing(true);
  }, [readOnly, isSaving]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(displayValue || '');
  }, [displayValue]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    const newValue = fieldType === 'tags'
      ? editValue.split(',').map((t) => t.trim()).filter(Boolean)
      : editValue;

    // Don't save if value hasn't changed
    const currentValue = fieldType === 'tags'
      ? (value as string[] || []).join(',')
      : (value || '');
    const newValueString = fieldType === 'tags'
      ? (newValue as string[]).join(',')
      : newValue;

    if (currentValue === newValueString) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(newValue);
      setIsEditing(false);
    } catch {
      // Error handling is done in parent via toast
      // Keep edit mode open on error
    } finally {
      setIsSaving(false);
    }
  }, [editValue, fieldType, value, onSave, isSaving]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const handleSelectChange = useCallback(
    async (newValue: string) => {
      setEditValue(newValue);
      setIsSaving(true);
      try {
        await onSave(newValue);
        setIsEditing(false);
      } catch {
        // Keep edit mode on error
      } finally {
        setIsSaving(false);
      }
    },
    [onSave]
  );

  // Render the display value
  const renderDisplayValue = () => {
    if (renderValue) {
      return renderValue(value);
    }
    return (
      <span className={cn(!displayValue && 'text-gray-400')}>
        {displayValue || placeholder}
      </span>
    );
  };

  return (
    <div
      className={cn(
        'flex justify-between items-start py-2 border-b border-gray-100 last:border-0 group',
        className
      )}
    >
      <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
      <div className="flex-1 flex justify-end items-center gap-1 min-w-0 ml-2">
        {isEditing ? (
          <div className="flex items-center gap-1 w-full max-w-[180px]">
            {fieldType === 'select' ? (
              <Select
                value={editValue}
                onValueChange={handleSelectChange}
                disabled={isSaving}
              >
                <SelectTrigger className="h-7 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <>
                <Input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSave}
                  disabled={isSaving}
                  className="h-7 text-sm py-0"
                  placeholder={fieldType === 'tags' ? 'tag1, tag2, ...' : placeholder}
                />
                <button
                  onClick={handleCancel}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  aria-label="Cancel edit"
                  tabIndex={-1}
                >
                  <X className="h-3 w-3" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="p-1 text-gray-400 hover:text-green-600 disabled:opacity-50"
                  aria-label="Save"
                  tabIndex={-1}
                >
                  <Check className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={handleStartEdit}
            disabled={readOnly}
            className={cn(
              'flex items-center gap-1 text-sm font-medium text-gray-900 text-right max-w-[60%] truncate',
              !readOnly && 'hover:bg-gray-50 rounded px-1 -mx-1 cursor-pointer',
              readOnly && 'cursor-default'
            )}
          >
            {renderDisplayValue()}
            {!readOnly && (
              <Pencil className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 flex-shrink-0" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
