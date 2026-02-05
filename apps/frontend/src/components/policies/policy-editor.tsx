'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { FileText, Send, Upload, Clock } from 'lucide-react';
import { RichTextEditor } from '@/components/rich-text/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Policy, UpdatePolicyDto, PolicyType } from '@/types/policy';
import { POLICY_TYPE_LABELS } from '@/types/policy';

interface PolicyEditorProps {
  policy?: Policy;
  onSave: (data: UpdatePolicyDto) => Promise<void>;
  onSubmitForApproval?: () => void;
  onPublish?: () => void;
  isSubmitting?: boolean;
}

const AUTOSAVE_DELAY = 2500; // 2.5 seconds per context doc

const POLICY_TYPES: PolicyType[] = [
  'CODE_OF_CONDUCT',
  'ANTI_HARASSMENT',
  'ANTI_BRIBERY',
  'DATA_PRIVACY',
  'INFORMATION_SECURITY',
  'GIFT_ENTERTAINMENT',
  'CONFLICTS_OF_INTEREST',
  'TRAVEL_EXPENSE',
  'WHISTLEBLOWER',
  'SOCIAL_MEDIA',
  'ACCEPTABLE_USE',
  'OTHER',
];

/**
 * Format relative time for "Last saved X minutes ago" display.
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);

  if (diffSecs < 10) return 'just now';
  if (diffSecs < 60) return `${diffSecs} seconds ago`;
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface FormData {
  title: string;
  policyType: PolicyType;
  category: string;
  effectiveDate: string;
  reviewDate: string;
}

/**
 * Policy editor component with Tiptap rich text and autosave.
 *
 * Features:
 * - Rich text editing with formatting toolbar
 * - Autosave with 2.5 second debounce
 * - Draft banner with "Last saved X minutes ago" (calming design)
 * - Pending approval banner with editing disabled
 * - Submit for Approval action for DRAFT policies
 * - Keyboard shortcut: Mod+S for save
 */
export function PolicyEditor({
  policy,
  onSave,
  onSubmitForApproval,
  onPublish,
  isSubmitting = false,
}: PolicyEditorProps) {
  const [content, setContent] = useState(policy?.draftContent || '');
  const [lastSaved, setLastSaved] = useState<Date | null>(
    policy?.draftUpdatedAt ? new Date(policy.draftUpdatedAt) : null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [displayTime, setDisplayTime] = useState<string | null>(null);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef(policy?.draftContent || '');

  const { control, watch, getValues } = useForm<FormData>({
    defaultValues: {
      title: policy?.title || '',
      policyType: policy?.policyType || 'OTHER',
      category: policy?.category || '',
      effectiveDate: policy?.effectiveDate?.split('T')[0] || '',
      reviewDate: policy?.reviewDate?.split('T')[0] || '',
    },
  });

  const title = watch('title');
  const policyType = watch('policyType');
  const category = watch('category');
  const effectiveDate = watch('effectiveDate');
  const reviewDate = watch('reviewDate');

  const isEditable = policy?.status !== 'PENDING_APPROVAL';
  const isDraft = !policy || policy.status === 'DRAFT';
  const hasContent = !!content?.trim();

  // Update display time every 30 seconds
  useEffect(() => {
    if (!lastSaved) return;

    const updateDisplayTime = () => {
      setDisplayTime(formatRelativeTime(lastSaved));
    };

    updateDisplayTime();
    const interval = setInterval(updateDisplayTime, 30000);

    return () => clearInterval(interval);
  }, [lastSaved]);

  // Save function
  const savePolicy = useCallback(async () => {
    if (!isEditable || content === lastSavedContentRef.current) return;

    setIsSaving(true);
    try {
      const formData = getValues();
      await onSave({
        title: formData.title || undefined,
        policyType: formData.policyType,
        category: formData.category || undefined,
        content,
        effectiveDate: formData.effectiveDate || undefined,
        reviewDate: formData.reviewDate || undefined,
      });
      lastSavedContentRef.current = content;
      setLastSaved(new Date());
    } finally {
      setIsSaving(false);
    }
  }, [content, isEditable, onSave, getValues]);

  // Trigger autosave on content change
  const triggerAutosave = useCallback(() => {
    if (!isEditable) return;

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      savePolicy();
    }, AUTOSAVE_DELAY);
  }, [isEditable, savePolicy]);

  // Watch for content changes and trigger autosave
  useEffect(() => {
    if (content !== lastSavedContentRef.current) {
      triggerAutosave();
    }

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [content, triggerAutosave]);

  // Keyboard shortcut: Mod+S for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        savePolicy();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [savePolicy]);

  // Handle content change from editor
  const handleContentChange = (html: string) => {
    setContent(html);
  };

  return (
    <div className="space-y-6">
      {/* Draft Banner - Calming design per context doc */}
      {isDraft && (
        <div
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg',
            'bg-gray-50 border border-gray-200 text-gray-700'
          )}
        >
          <FileText className="h-5 w-5 text-gray-500" />
          <div className="flex-1">
            <span className="font-medium">DRAFT</span>
            {displayTime && (
              <span className="ml-2 text-gray-500">
                Last saved {displayTime}
              </span>
            )}
            {isSaving && (
              <span className="ml-2 text-gray-500">Saving...</span>
            )}
          </div>
          <div className="text-xs text-gray-400">
            <Clock className="inline h-3 w-3 mr-1" />
            Autosave enabled
          </div>
        </div>
      )}

      {/* Pending Approval Banner */}
      {policy?.status === 'PENDING_APPROVAL' && (
        <div
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg',
            'bg-yellow-50 border border-yellow-200 text-yellow-800'
          )}
        >
          <Send className="h-5 w-5 text-yellow-600" />
          <div className="flex-1">
            <span className="font-medium">In Approval Workflow</span>
            <span className="ml-2 text-yellow-700">
              Editing disabled during review
            </span>
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div className="md:col-span-2">
          <Label htmlFor="title">Policy Title</Label>
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="title"
                placeholder="Enter policy title"
                disabled={!isEditable}
                className="mt-1"
              />
            )}
          />
        </div>

        {/* Policy Type */}
        <div>
          <Label htmlFor="policyType">Policy Type</Label>
          <Controller
            name="policyType"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={!isEditable}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {POLICY_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Category */}
        <div>
          <Label htmlFor="category">Category (optional)</Label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="category"
                placeholder="e.g., HR, Finance, IT"
                disabled={!isEditable}
                className="mt-1"
              />
            )}
          />
        </div>

        {/* Effective Date */}
        <div>
          <Label htmlFor="effectiveDate">Effective Date (optional)</Label>
          <Controller
            name="effectiveDate"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="effectiveDate"
                type="date"
                disabled={!isEditable}
                className="mt-1"
              />
            )}
          />
        </div>

        {/* Review Date */}
        <div>
          <Label htmlFor="reviewDate">Review Date (optional)</Label>
          <Controller
            name="reviewDate"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="reviewDate"
                type="date"
                disabled={!isEditable}
                className="mt-1"
              />
            )}
          />
        </div>
      </div>

      {/* Rich Text Editor */}
      <div>
        <Label>Policy Content</Label>
        <div className="mt-1 min-h-[500px]">
          <RichTextEditor
            content={content}
            onChange={handleContentChange}
            readOnly={!isEditable}
            placeholder="Start writing your policy content here..."
            minHeight="500px"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {/* Save Draft - always visible for draft */}
        {isDraft && (
          <Button
            variant="outline"
            onClick={savePolicy}
            disabled={isSubmitting || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
        )}

        {/* Submit for Approval - only for DRAFT with content */}
        {isDraft && onSubmitForApproval && (
          <Button
            onClick={onSubmitForApproval}
            disabled={isSubmitting || !hasContent}
          >
            <Send className="mr-2 h-4 w-4" />
            Submit for Approval
          </Button>
        )}

        {/* Publish - for APPROVED or DRAFT without workflow */}
        {(policy?.status === 'APPROVED' ||
          (isDraft && onPublish && !onSubmitForApproval)) && (
          <Button
            onClick={onPublish}
            disabled={isSubmitting || !hasContent}
          >
            <Upload className="mr-2 h-4 w-4" />
            Publish
          </Button>
        )}
      </div>
    </div>
  );
}
