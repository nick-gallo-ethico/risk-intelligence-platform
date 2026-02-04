'use client';

/**
 * IntakeForm - Main Hotline Intake Form
 *
 * The primary form operators use during calls to capture report details.
 *
 * Features:
 * - RIU type selection (Report, Request for Info, Wrong Number)
 * - Category selection (for Report type)
 * - Category-specific questions
 * - Content/notes area (always visible per CONTEXT.md)
 * - Caller info (anonymity tier, phone number)
 * - Subject selection (HRIS search or manual entry)
 * - Urgency and attachments
 * - Auto-save via useIntake hook
 *
 * @see useIntake for state management
 * @see RiuTypeSelector for type selection
 * @see CategoryQuestions for category-specific questions
 * @see SubjectSelector for subject search/entry
 */

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  Save,
  Send,
  FileCheck,
  Loader2,
  User,
  Phone,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RiuTypeSelector } from './riu-type-selector';
import { CategoryQuestions } from './category-questions';
import { SubjectSelector } from './subject-selector';
import { AiNoteCleanup } from './ai-note-cleanup';
import { useIntake, type IntakeSubject, type AnonymityTier } from '@/hooks/useIntake';
import type { ClientProfile, CategoryInfo, HrisResult } from '@/types/operator.types';

export interface IntakeFormProps {
  /** Currently loaded client profile */
  clientProfile: ClientProfile;
  /** Called when intake is completed (submitted or closed) */
  onComplete?: () => void;
  /** Whether a call is currently active */
  callActive?: boolean;
}

/**
 * Anonymity tier options with descriptions.
 */
const anonymityOptions: Array<{
  value: AnonymityTier;
  label: string;
  description: string;
}> = [
  {
    value: 'ANONYMOUS',
    label: 'Anonymous',
    description: 'No identifying information collected',
  },
  {
    value: 'CONFIDENTIAL',
    label: 'Confidential',
    description: 'Identity known but protected',
  },
  {
    value: 'IDENTIFIED',
    label: 'Identified',
    description: 'Identity shared for follow-up',
  },
];

/**
 * Main intake form component.
 *
 * @param props - Component props
 * @returns IntakeForm component
 */
export function IntakeForm({
  clientProfile,
  onComplete,
  callActive = false,
}: IntakeFormProps) {
  const {
    intakeData,
    isDirty,
    isSaving,
    isSubmitting,
    saveError,
    updateField,
    updateContent,
    updateCategoryAnswers,
    save,
    submit,
    reset,
    setSubject,
  } = useIntake(clientProfile.id);

  // Get current category info
  const selectedCategory = clientProfile.categories.find(
    (c) => c.id === intakeData.categoryId
  );

  /**
   * Handle category selection.
   */
  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      updateField('categoryId', categoryId);
      // Reset category answers when category changes
      updateCategoryAnswers({});
    },
    [updateField, updateCategoryAnswers]
  );

  /**
   * Handle subject selection from HRIS.
   */
  const handleSubjectSelect = useCallback(
    (employee: HrisResult) => {
      setSubject({
        type: 'hris',
        hrisEmployeeId: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        jobTitle: employee.jobTitle || undefined,
        department: employee.department || undefined,
      });
    },
    [setSubject]
  );

  /**
   * Handle manual subject entry.
   */
  const handleManualSubject = useCallback(
    (subject: Omit<IntakeSubject, 'type'>) => {
      setSubject({
        type: 'manual',
        ...subject,
      });
    },
    [setSubject]
  );

  /**
   * Handle AI note cleanup application.
   */
  const handleApplyCleanup = useCallback(
    (cleanedContent: string) => {
      updateContent(cleanedContent);
      updateField('aiCleanupApplied', true);
    },
    [updateContent, updateField]
  );

  /**
   * Handle form submission.
   */
  const handleSubmit = async () => {
    try {
      await submit();
      onComplete?.();
    } catch {
      // Error is captured in saveError state
    }
  };

  /**
   * Handle save and close (for WRONG_NUMBER type).
   */
  const handleSaveAndClose = async () => {
    try {
      await save();
      reset();
      onComplete?.();
    } catch {
      // Error is captured in saveError state
    }
  };

  // Determine if form is for a Report type (shows additional fields)
  const isReport = intakeData.riuType === 'REPORT';
  const isWrongNumber = intakeData.riuType === 'WRONG_NUMBER';
  const isRequestForInfo = intakeData.riuType === 'REQUEST_FOR_INFO';

  // Form validation
  const canSubmit =
    intakeData.riuType &&
    intakeData.content.trim().length > 0 &&
    (!isReport || intakeData.categoryId) &&
    !isSaving &&
    !isSubmitting;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            New Intake - {clientProfile.name}
          </h2>
          {intakeData.id && (
            <p className="text-sm text-muted-foreground">
              Draft saved {isDirty && '(unsaved changes)'}
            </p>
          )}
        </div>
        {isDirty && (
          <Badge variant="outline" className="text-amber-600">
            Unsaved
          </Badge>
        )}
      </div>

      {/* Error Display */}
      {saveError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Save Error</p>
            <p className="text-sm text-destructive/80">{saveError.message}</p>
          </div>
        </div>
      )}

      {/* Section 1: RIU Type Selection */}
      <RiuTypeSelector
        selected={intakeData.riuType}
        onSelect={(type) => {
          updateField('riuType', type);
          // Reset category when type changes
          if (type !== 'REPORT') {
            updateField('categoryId', null);
          }
        }}
        disabled={isSaving || isSubmitting}
      />

      {/* Section 2: Category Selection (Report type only) */}
      {isReport && (
        <div className="space-y-2">
          <Label>
            Category <span className="text-destructive">*</span>
          </Label>
          <Select
            value={intakeData.categoryId || ''}
            onValueChange={handleCategoryChange}
            disabled={isSaving || isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category..." />
            </SelectTrigger>
            <SelectContent>
              {clientProfile.categories
                .filter((c) => !c.parentId) // Top-level categories only
                .map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                    {category.isHighRiskForQa && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        High Risk
                      </Badge>
                    )}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Section 2b: Category-specific Questions */}
      {isReport && intakeData.categoryId && (
        <CategoryQuestions
          categoryId={intakeData.categoryId}
          clientId={clientProfile.id}
          values={intakeData.categoryAnswers}
          onChange={updateCategoryAnswers}
          disabled={isSaving || isSubmitting}
        />
      )}

      {/* Section 3: Content/Notes - ALWAYS VISIBLE per CONTEXT.md */}
      <div className="space-y-2">
        <Label htmlFor="content">
          Notes <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="content"
          placeholder={
            isWrongNumber
              ? 'Brief note about the call...'
              : isRequestForInfo
                ? "Caller's question or request..."
                : "Capture the caller's report details..."
          }
          value={intakeData.content}
          onChange={(e) => updateContent(e.target.value)}
          disabled={isSaving || isSubmitting}
          className="min-h-[200px] resize-y"
        />
        {intakeData.aiCleanupApplied && (
          <p className="text-xs text-muted-foreground">
            AI cleanup has been applied to these notes
          </p>
        )}
      </div>

      {/* AI Note Cleanup (below notes area) */}
      {!isWrongNumber && intakeData.content.length > 50 && (
        <AiNoteCleanup
          originalContent={intakeData.content}
          onApply={handleApplyCleanup}
        />
      )}

      {/* Section 4: Caller Info */}
      <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Caller Information</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Anonymity Tier */}
          <div className="space-y-2">
            <Label>Anonymity Level</Label>
            <Select
              value={intakeData.anonymityTier}
              onValueChange={(value: AnonymityTier) =>
                updateField('anonymityTier', value)
              }
              disabled={isSaving || isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anonymityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        - {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Phone Number (optional) */}
          <div className="space-y-2">
            <Label htmlFor="callerPhone">Phone Number (optional)</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="callerPhone"
                type="tel"
                placeholder="(555) 555-5555"
                value={intakeData.callerPhoneNumber || ''}
                onChange={(e) =>
                  updateField('callerPhoneNumber', e.target.value || undefined)
                }
                disabled={isSaving || isSubmitting}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Caller Name (for non-anonymous) */}
        {intakeData.anonymityTier !== 'ANONYMOUS' && (
          <div className="space-y-2">
            <Label htmlFor="callerName">Caller Name</Label>
            <Input
              id="callerName"
              placeholder="Caller's name..."
              value={intakeData.callerName || ''}
              onChange={(e) =>
                updateField('callerName', e.target.value || undefined)
              }
              disabled={isSaving || isSubmitting}
            />
          </div>
        )}
      </div>

      {/* Section 5: Subject (Report type only) */}
      {isReport && (
        <SubjectSelector
          clientId={clientProfile.id}
          selectedSubject={intakeData.subject}
          onSelect={handleSubjectSelect}
          onManualEntry={handleManualSubject}
          disabled={isSaving || isSubmitting}
        />
      )}

      {/* Section 6: Urgency and Attachments */}
      {!isWrongNumber && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            {/* Urgency Checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="isUrgent"
                checked={intakeData.isUrgent}
                onCheckedChange={(checked) =>
                  updateField('isUrgent', checked === true)
                }
                disabled={isSaving || isSubmitting}
              />
              <Label
                htmlFor="isUrgent"
                className="flex items-center gap-1 cursor-pointer"
              >
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                Mark as Urgent
              </Label>
            </div>

            {/* High-risk category indicator */}
            {selectedCategory?.isHighRiskForQa && (
              <Badge variant="destructive" className="text-xs">
                High-Risk Category (auto-routes to QA)
              </Badge>
            )}
          </div>

          {/* Attachment count (if any) */}
          {intakeData.attachmentIds.length > 0 && (
            <Badge variant="secondary">
              {intakeData.attachmentIds.length} attachment(s)
            </Badge>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2">
          {/* Save Draft (not for wrong number) */}
          {!isWrongNumber && (
            <Button
              variant="outline"
              onClick={() => save()}
              disabled={!isDirty || isSaving || isSubmitting}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Draft
            </Button>
          )}

          {/* Reset button */}
          <Button
            variant="ghost"
            onClick={reset}
            disabled={isSaving || isSubmitting || (!intakeData.id && !isDirty)}
          >
            Clear Form
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Wrong Number: Save & Close */}
          {isWrongNumber && (
            <Button
              onClick={handleSaveAndClose}
              disabled={!canSubmit}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileCheck className="h-4 w-4 mr-2" />
              )}
              Save & Close
            </Button>
          )}

          {/* Report/Request: Submit to QA */}
          {!isWrongNumber && (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                isReport && 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit to QA
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
