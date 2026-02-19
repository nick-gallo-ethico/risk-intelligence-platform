'use client';

/**
 * QaEditForm - Edit Form for QA Items
 *
 * Allows QA reviewers to edit RIU fields before release:
 * - Summary (rich text / textarea)
 * - Category (dropdown selector)
 * - Severity (slider or select)
 * - Edit notes (required when changes made)
 *
 * Shows original values alongside edited values.
 * Tracks what changed and highlights modified fields.
 */

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { QaItemDetail, QaEditsDto } from '@/types/operator.types';
import {
  Check,
  Loader2,
  RotateCcw,
  X,
} from 'lucide-react';

/**
 * Severity options - using centralized theme-colors utility.
 */
import { getSeverityColor } from '@/lib/theme-colors';

const SEVERITY_OPTIONS = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

/**
 * Mock categories - in production this would come from the client profile.
 */
const MOCK_CATEGORIES = [
  { id: 'cat-1', name: 'Harassment', code: 'HAR' },
  { id: 'cat-2', name: 'Discrimination', code: 'DIS' },
  { id: 'cat-3', name: 'Fraud', code: 'FRD' },
  { id: 'cat-4', name: 'Safety', code: 'SAF' },
  { id: 'cat-5', name: 'Conflict of Interest', code: 'COI' },
  { id: 'cat-6', name: 'Policy Violation', code: 'POL' },
  { id: 'cat-7', name: 'Other', code: 'OTH' },
];

export interface QaEditFormProps {
  /** The QA item to edit */
  item: QaItemDetail;
  /** Called when save is clicked with edits */
  onSave: (edits: QaEditsDto) => Promise<void>;
  /** Called when cancel is clicked */
  onCancel: () => void;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Available categories (optional, falls back to mock) */
  categories?: Array<{ id: string; name: string; code: string | null }>;
}

export function QaEditForm({
  item,
  onSave,
  onCancel,
  isSaving = false,
  categories = MOCK_CATEGORIES,
}: QaEditFormProps) {
  // Form state - initialize from item
  const [summary, setSummary] = useState(item.summary || '');
  const [categoryId, setCategoryId] = useState(item.category?.id || '');
  const [severity, setSeverity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | ''>(
    item.severity || ''
  );
  const [editNotes, setEditNotes] = useState('');

  // Track which fields have changed
  const changes = useMemo(() => {
    const changed: string[] = [];
    if (summary !== (item.summary || '')) changed.push('summary');
    if (categoryId !== (item.category?.id || '')) changed.push('category');
    if (severity !== (item.severity || '')) changed.push('severity');
    return changed;
  }, [summary, categoryId, severity, item]);

  const hasChanges = changes.length > 0;

  // Validation: edit notes required if changes made
  const canSave = !hasChanges || editNotes.trim().length > 0;
  const validationError = hasChanges && !editNotes.trim()
    ? 'Edit notes are required when making changes'
    : null;

  // Handle save
  const handleSave = useCallback(async () => {
    if (!canSave) return;

    const edits: QaEditsDto = {};

    if (changes.includes('summary')) {
      edits.summary = summary;
    }
    if (changes.includes('category')) {
      edits.categoryId = categoryId;
    }
    if (changes.includes('severity') && severity) {
      edits.severityScore = severity;
    }
    if (editNotes.trim()) {
      edits.editNotes = editNotes.trim();
    }

    await onSave(edits);
  }, [canSave, changes, summary, categoryId, severity, editNotes, onSave]);

  // Handle reset field to original
  const resetSummary = () => setSummary(item.summary || '');
  const resetCategory = () => setCategoryId(item.category?.id || '');
  const resetSeverity = () => setSeverity(item.severity || '');

  // Get original values for comparison
  const originalCategory = categories.find((c) => c.id === item.category?.id);
  const newCategory = categories.find((c) => c.id === categoryId);

  return (
    <div className="space-y-6">
      {/* Summary Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="edit-summary" className="flex items-center gap-2">
            Summary
            {changes.includes('summary') && (
              <Badge variant="secondary" className="text-xs">Modified</Badge>
            )}
          </Label>
          {changes.includes('summary') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetSummary}
              className="h-6 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
        <Textarea
          id="edit-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Enter or update the summary..."
          rows={4}
          className={cn(
            changes.includes('summary') && 'border-blue-400 bg-blue-50/30 dark:border-blue-600 dark:bg-blue-900/20'
          )}
        />
        {item.summary && changes.includes('summary') && (
          <Card className="p-3 bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Original:</p>
            <p className="text-sm">{item.summary}</p>
          </Card>
        )}
      </div>

      {/* Category Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="edit-category" className="flex items-center gap-2">
            Category
            {changes.includes('category') && (
              <Badge variant="secondary" className="text-xs">Modified</Badge>
            )}
          </Label>
          {changes.includes('category') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetCategory}
              className="h-6 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger
            id="edit-category"
            className={cn(
              changes.includes('category') && 'border-blue-400 bg-blue-50/30 dark:border-blue-600 dark:bg-blue-900/20'
            )}
          >
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
                {cat.code && (
                  <span className="text-muted-foreground ml-1">
                    ({cat.code})
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {changes.includes('category') && originalCategory && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Changed from:</span>
            <Badge variant="outline">{originalCategory.name}</Badge>
            <span className="text-muted-foreground">to</span>
            <Badge variant="outline">{newCategory?.name || 'None'}</Badge>
          </div>
        )}
      </div>

      {/* Severity Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="edit-severity" className="flex items-center gap-2">
            Severity
            {changes.includes('severity') && (
              <Badge variant="secondary" className="text-xs">Modified</Badge>
            )}
          </Label>
          {changes.includes('severity') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetSeverity}
              className="h-6 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
        <Select value={severity} onValueChange={(v) => setSeverity(v as typeof severity)}>
          <SelectTrigger
            id="edit-severity"
            className={cn(
              changes.includes('severity') && 'border-blue-400 bg-blue-50/30 dark:border-blue-600 dark:bg-blue-900/20'
            )}
          >
            <SelectValue placeholder="Select severity" />
          </SelectTrigger>
          <SelectContent>
            {SEVERITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex items-center gap-2">
                  <span className={cn('px-2 py-0.5 rounded text-xs', getSeverityColor(opt.value))}>
                    {opt.label}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {changes.includes('severity') && item.severity && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Changed from:</span>
            <Badge
              className={getSeverityColor(item.severity)}
            >
              {item.severity}
            </Badge>
            <span className="text-muted-foreground">to</span>
            <Badge
              className={severity ? getSeverityColor(severity) : ''}
            >
              {severity || 'None'}
            </Badge>
          </div>
        )}
      </div>

      {/* Edit Notes Field */}
      <div className="space-y-2">
        <Label htmlFor="edit-notes" className="flex items-center gap-2">
          Edit Notes
          {hasChanges && (
            <span className="text-red-600 text-xs">* Required</span>
          )}
        </Label>
        <Textarea
          id="edit-notes"
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          placeholder={
            hasChanges
              ? 'Explain why these changes were made...'
              : 'Optional notes (no changes detected)'
          }
          rows={3}
          className={cn(
            validationError && 'border-red-400 focus:ring-red-400'
          )}
        />
        {validationError && (
          <p className="text-sm text-red-600">{validationError}</p>
        )}
      </div>

      {/* Changes Summary */}
      {hasChanges && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
            {changes.length} field{changes.length > 1 ? 's' : ''} will be updated:
          </p>
          <ul className="text-sm text-blue-700 dark:text-blue-400 mt-1 list-disc list-inside">
            {changes.includes('summary') && <li>Summary</li>}
            {changes.includes('category') && <li>Category</li>}
            {changes.includes('severity') && <li>Severity</li>}
          </ul>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !canSave}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              {hasChanges ? 'Save & Release' : 'Release (No Changes)'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
