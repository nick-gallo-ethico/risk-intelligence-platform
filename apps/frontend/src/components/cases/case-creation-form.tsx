'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { BasicInfoSection } from './form-sections/basic-info-section';
import { DetailsSection } from './form-sections/details-section';
import { ReporterSection } from './form-sections/reporter-section';
import { LocationSection } from './form-sections/location-section';
import {
  caseCreationSchema,
  CaseCreationFormData,
  defaultCaseFormValues,
} from '@/lib/validations/case-schema';
import { casesApi } from '@/lib/cases-api';
import { useCaseFormDraft, formatRelativeTime } from '@/hooks/use-case-form-draft';
import type { CreateCaseInput } from '@/types/case';

/**
 * Case Creation Form component.
 *
 * Multi-section form for creating new cases with:
 * - Client-side validation using react-hook-form + zod
 * - Inline validation errors
 * - Loading state during submission
 * - Success redirect to case detail page
 * - Error toast on failure
 */
export function CaseCreationForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    reset,
    formState: { errors, isValid },
  } = useForm<CaseCreationFormData>({
    resolver: zodResolver(caseCreationSchema),
    defaultValues: defaultCaseFormValues,
    mode: 'onChange', // Validate on change for immediate feedback
  });

  // Get form values for auto-save
  const getFormData = useCallback(() => getValues(), [getValues]);

  // Draft persistence hook
  const {
    loadDraft,
    saveDraft,
    clearDraft,
    hasDraft,
    lastSavedAt,
    justSaved,
  } = useCaseFormDraft(getFormData, !isSubmitting);

  // Restore draft on mount
  useEffect(() => {
    if (draftRestored) return;

    const savedDraft = loadDraft();
    if (savedDraft && Object.keys(savedDraft).length > 0) {
      // Check if draft has meaningful content
      const hasContent = savedDraft.details && savedDraft.details.length > 0;
      if (hasContent) {
        // Show toast asking user to restore
        toast.info('Draft found', {
          description: 'Would you like to restore your previous draft?',
          action: {
            label: 'Restore',
            onClick: () => {
              reset({ ...defaultCaseFormValues, ...savedDraft });
              toast.success('Draft restored');
            },
          },
          cancel: {
            label: 'Discard',
            onClick: () => {
              clearDraft();
              toast.info('Draft discarded');
            },
          },
          duration: 10000, // 10 seconds to decide
        });
      }
    }
    setDraftRestored(true);
  }, [loadDraft, reset, clearDraft, draftRestored]);

  // Manual save draft
  const handleSaveDraft = useCallback(() => {
    saveDraft(getValues());
    toast.success('Draft saved');
  }, [saveDraft, getValues]);

  /**
   * Transform form data to API input format.
   * Removes empty strings and converts to proper types.
   */
  const transformFormData = (data: CaseCreationFormData): CreateCaseInput => {
    // Strip HTML tags for plain text details (API expects plain text for now)
    // If API accepts HTML, remove this transformation
    const stripHtml = (html: string): string => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent || '';
    };

    const input: CreateCaseInput = {
      sourceChannel: data.sourceChannel,
      details: stripHtml(data.details),
    };

    // Only include optional fields if they have values
    if (data.summary) input.summary = data.summary;
    if (data.caseType) input.caseType = data.caseType;
    if (data.severity) input.severity = data.severity;
    if (data.reporterType) input.reporterType = data.reporterType;
    if (data.reporterName) input.reporterName = data.reporterName;
    if (data.reporterEmail) input.reporterEmail = data.reporterEmail;
    if (data.reporterPhone) input.reporterPhone = data.reporterPhone;
    if (data.locationCountry) input.locationCountry = data.locationCountry;
    if (data.locationState) input.locationState = data.locationState;
    if (data.locationCity) input.locationCity = data.locationCity;

    // Handle anonymous reporter
    if (data.reporterType === 'ANONYMOUS') {
      input.reporterAnonymous = true;
    }

    return input;
  };

  const onSubmit = async (data: CaseCreationFormData) => {
    setIsSubmitting(true);

    try {
      const input = transformFormData(data);
      const createdCase = await casesApi.create(input);

      // Clear draft on successful submission
      clearDraft();

      toast.success('Case created successfully', {
        description: `Reference: ${createdCase.referenceNumber}`,
      });

      // Redirect to the new case detail page
      router.push(`/cases/${createdCase.id}`);
    } catch (error) {
      console.error('Failed to create case:', error);

      // Extract error message if available
      let message = 'An unexpected error occurred. Please try again.';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string | string[] } } };
        const apiMessage = axiosError.response?.data?.message;
        if (Array.isArray(apiMessage)) {
          message = apiMessage.join(', ');
        } else if (apiMessage) {
          message = apiMessage;
        }
      }

      toast.error('Failed to create case', {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Section 1: Basic Information */}
      <BasicInfoSection
        errors={errors}
        setValue={setValue}
        watch={watch}
      />

      {/* Section 2: Details */}
      <DetailsSection
        errors={errors}
        register={register}
        setValue={setValue}
        watch={watch}
      />

      {/* Section 3: Reporter Information */}
      <ReporterSection
        errors={errors}
        register={register}
        setValue={setValue}
        watch={watch}
      />

      {/* Section 4: Location */}
      <LocationSection
        errors={errors}
        register={register}
        setValue={setValue}
        watch={watch}
      />

      {/* Submit Button - Sticky at bottom */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 border-t -mx-6 px-6 -mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSubmitting}
              className="text-muted-foreground"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
          </div>

          <div className="flex items-center gap-4">
            {/* Draft saved indicator */}
            {lastSavedAt && (
              <span
                className={`text-xs text-muted-foreground flex items-center gap-1 transition-opacity ${
                  justSaved ? 'opacity-100' : 'opacity-70'
                }`}
              >
                {justSaved ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="text-green-600">Draft saved</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3" />
                    <span>Saved {formatRelativeTime(lastSavedAt)}</span>
                  </>
                )}
              </span>
            )}

            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Case'
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
