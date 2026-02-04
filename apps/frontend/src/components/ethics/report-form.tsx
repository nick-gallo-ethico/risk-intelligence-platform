'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Save,
  Send,
  AlertTriangle,
  Clock,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CategorySelector,
} from '@/components/ethics/category-selector';
import {
  AnonymitySelector,
  type AnonymityTier,
} from '@/components/ethics/anonymity-selector';
import {
  AttachmentUpload,
  createAttachmentFromFile,
  type Attachment,
} from '@/components/ethics/attachment-upload';
import {
  SmartPrompts,
  generateSmartPrompts,
  type SmartPrompt,
} from '@/components/ethics/smart-prompts';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import type { Category } from '@/hooks/useTenantCategories';

/**
 * Form steps.
 */
const STEPS = [
  { id: 'category', label: 'Category', description: 'What is this about?' },
  { id: 'details', label: 'Details', description: 'Tell us what happened' },
  { id: 'attachments', label: 'Attachments', description: 'Add supporting files (optional)' },
  { id: 'review', label: 'Review', description: 'Review and submit' },
];

/**
 * Form data type.
 */
export interface ReportFormData {
  categoryId: string;
  categoryName?: string;
  anonymityTier: AnonymityTier;
  description: string;
  isUrgent: boolean;
  // Contact info (for non-anonymous)
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  // Category-specific fields
  categoryFields: Record<string, unknown>;
}

/**
 * Submission result from API.
 */
export interface SubmissionResult {
  /** Reference number like RPT-12345 */
  referenceNumber: string;
  /** Access PIN for status checks */
  accessCode: string;
  /** Confirmation number */
  confirmationNumber: string;
}

interface ReportFormProps {
  /** Tenant slug for API calls */
  tenantSlug: string;
  /** Available categories */
  categories: Category[];
  /** Callback on successful submission */
  onSubmit: (result: SubmissionResult) => void;
  /** Optional initial data (e.g., from draft) */
  initialData?: Partial<ReportFormData>;
  /** Additional class name */
  className?: string;
}

/**
 * Multi-step report submission form.
 *
 * Features:
 * - Category selection with category-specific fields
 * - Anonymity tier selection
 * - Auto-save to encrypted IndexedDB
 * - Smart prompts for better reporting
 * - Attachment upload with sensitivity tagging
 * - Urgency flag
 * - Mobile-first design
 *
 * @example
 * ```tsx
 * <ReportForm
 *   tenantSlug="acme-corp"
 *   categories={categories}
 *   onSubmit={(result) => router.push(`/confirmation?code=${result.accessCode}`)}
 * />
 * ```
 */
export function ReportForm({
  tenantSlug,
  categories,
  onSubmit,
  initialData,
  className,
}: ReportFormProps) {
  // Current step (0-indexed)
  const [currentStep, setCurrentStep] = React.useState(0);
  // Selected category
  const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null);
  // Attachments
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  // Dismissed prompts
  const [dismissedPrompts, setDismissedPrompts] = React.useState<Set<string>>(new Set());
  // Submission state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  // Save for later code
  const [saveCode, setSaveCode] = React.useState<string | null>(null);
  // Category-specific form schema
  const [categorySchema, setCategorySchema] = React.useState<Record<string, { type: string; label: string; required?: boolean }> | null>(null);

  // Auto-save hook
  const {
    saveDraft,
    loadDraft,
    deleteDraft,
    markPending,
    markSynced,
    markFailed,
    lastSaved,
    isSaving,
    draftLocalId,
    isReady: isDbReady,
  } = useAutoSaveDraft(tenantSlug);

  // Form setup
  const {
    control,
    watch,
    handleSubmit,
    setValue,
    getValues,
    formState: { isDirty },
  } = useForm<ReportFormData>({
    defaultValues: {
      categoryId: initialData?.categoryId || '',
      categoryName: initialData?.categoryName || '',
      anonymityTier: initialData?.anonymityTier || 'ANONYMOUS',
      description: initialData?.description || '',
      isUrgent: initialData?.isUrgent || false,
      contactName: initialData?.contactName || '',
      contactEmail: initialData?.contactEmail || '',
      contactPhone: initialData?.contactPhone || '',
      categoryFields: initialData?.categoryFields || {},
    },
  });

  // Watch form values for auto-save
  const formValues = watch();
  const description = watch('description');
  const anonymityTier = watch('anonymityTier');

  // Load existing draft on mount
  React.useEffect(() => {
    if (!isDbReady) return;

    async function loadExistingDraft() {
      const draft = await loadDraft();
      if (draft && draft.content) {
        const content = draft.content as Partial<ReportFormData>;
        if (content.categoryId) {
          setValue('categoryId', content.categoryId);
          const cat = categories.find((c) => c.id === content.categoryId);
          if (cat) setSelectedCategory(cat);
        }
        if (content.anonymityTier) setValue('anonymityTier', content.anonymityTier);
        if (content.description) setValue('description', content.description);
        if (content.isUrgent) setValue('isUrgent', content.isUrgent);
        if (content.contactName) setValue('contactName', content.contactName);
        if (content.contactEmail) setValue('contactEmail', content.contactEmail);
        if (content.contactPhone) setValue('contactPhone', content.contactPhone);
        if (content.categoryFields) setValue('categoryFields', content.categoryFields);
      }
    }

    loadExistingDraft();
  }, [isDbReady, loadDraft, setValue, categories]);

  // Auto-save when form changes
  React.useEffect(() => {
    if (!isDbReady || !isDirty) return;

    const timer = setTimeout(() => {
      saveDraft(
        formValues as unknown as Record<string, unknown>,
        selectedCategory?.id,
        attachments.map((a) => ({
          id: a.id,
          name: a.name,
          size: a.size,
          type: a.type,
          localPath: a.previewUrl || '',
          sensitive: a.isSensitive,
        }))
      );
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, [formValues, selectedCategory, attachments, isDirty, isDbReady, saveDraft]);

  // Load category-specific schema when category changes
  React.useEffect(() => {
    if (!selectedCategory) {
      setCategorySchema(null);
      return;
    }

    async function loadCategorySchema() {
      try {
        const response = await fetch(
          `/api/v1/public/ethics/${tenantSlug}/categories/${selectedCategory!.id}/form`
        );
        if (response.ok) {
          const data = await response.json();
          setCategorySchema(data.fields || null);
        }
      } catch {
        // Silently fail - category fields are optional
        setCategorySchema(null);
      }
    }

    loadCategorySchema();
  }, [selectedCategory, tenantSlug]);

  // Generate smart prompts
  const smartPrompts = React.useMemo(() => {
    const prompts = generateSmartPrompts({
      description,
      categoryId: selectedCategory?.id,
      categoryName: selectedCategory?.name,
      filledFields: Object.keys(formValues.categoryFields || {}),
    });

    // Filter out dismissed prompts
    return prompts.filter((p) => !dismissedPrompts.has(p.id));
  }, [description, selectedCategory, formValues.categoryFields, dismissedPrompts]);

  /**
   * Handle category selection.
   */
  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setValue('categoryId', category.id);
    setValue('categoryName', category.name);
  };

  /**
   * Handle attachment add.
   */
  const handleAttachmentAdd = (files: File[]) => {
    const newAttachments = files.map(createAttachmentFromFile);
    setAttachments((prev) => [...prev, ...newAttachments]);

    // TODO: Upload files to server and update status
  };

  /**
   * Handle attachment remove.
   */
  const handleAttachmentRemove = (attachmentId: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === attachmentId);
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      return prev.filter((a) => a.id !== attachmentId);
    });
  };

  /**
   * Handle sensitivity toggle.
   */
  const handleSensitivityToggle = (attachmentId: string, sensitive: boolean) => {
    setAttachments((prev) =>
      prev.map((a) => (a.id === attachmentId ? { ...a, isSensitive: sensitive } : a))
    );
  };

  /**
   * Handle "Save for Later".
   */
  const handleSaveForLater = async () => {
    const localId = await saveDraft(
      formValues as unknown as Record<string, unknown>,
      selectedCategory?.id,
      attachments.map((a) => ({
        id: a.id,
        name: a.name,
        size: a.size,
        type: a.type,
        localPath: a.previewUrl || '',
        sensitive: a.isSensitive,
      }))
    );
    setSaveCode(localId);
  };

  /**
   * Handle form submission.
   */
  const handleFormSubmit = async (data: ReportFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await markPending();

      const response = await fetch(`/api/v1/public/ethics/${tenantSlug}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryId: data.categoryId,
          anonymityTier: data.anonymityTier,
          description: data.description,
          isUrgent: data.isUrgent,
          contactName: data.anonymityTier !== 'ANONYMOUS' ? data.contactName : undefined,
          contactEmail: data.anonymityTier !== 'ANONYMOUS' ? data.contactEmail : undefined,
          contactPhone: data.anonymityTier !== 'ANONYMOUS' ? data.contactPhone : undefined,
          categoryFields: data.categoryFields,
          attachments: attachments.map((a) => ({
            id: a.id,
            name: a.name,
            isSensitive: a.isSensitive,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      const result: SubmissionResult = await response.json();

      await markSynced();
      await deleteDraft();

      onSubmit(result);
    } catch (error) {
      await markFailed();
      setSubmitError(
        error instanceof Error ? error.message : 'An error occurred while submitting your report'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Navigate to next step.
   */
  const goToNextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  /**
   * Navigate to previous step.
   */
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  /**
   * Check if current step is valid.
   */
  const isStepValid = (): boolean => {
    switch (currentStep) {
      case 0: // Category
        return !!selectedCategory;
      case 1: // Details
        return description.length > 0;
      case 2: // Attachments (optional)
        return true;
      case 3: // Review
        return true;
      default:
        return false;
    }
  };

  /**
   * Render step content.
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Category
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">
                What would you like to report?
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Select the category that best describes your concern.
              </p>
            </div>

            <CategorySelector
              categories={categories}
              selectedId={selectedCategory?.id}
              onSelect={handleCategorySelect}
            />

            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-medium">
                How would you like to report?
              </Label>
              <Controller
                name="anonymityTier"
                control={control}
                render={({ field }) => (
                  <AnonymitySelector
                    selected={field.value}
                    onSelect={field.onChange}
                  />
                )}
              />
            </div>
          </div>
        );

      case 1: // Details
        return (
          <div className="space-y-6">
            {/* Category display */}
            {selectedCategory && (
              <Card className="bg-muted/50">
                <CardContent className="py-3">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Category:</span>{' '}
                    <span className="font-medium">{selectedCategory.name}</span>
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-medium">
                Describe what happened
              </Label>
              <p className="text-sm text-muted-foreground">
                Please provide as much detail as you can. The more information you share,
                the better we can address your concern.
              </p>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="description"
                    placeholder="What happened? Include dates, locations, and people involved if known..."
                    className="min-h-[200px] resize-y"
                    {...field}
                  />
                )}
              />
            </div>

            {/* Smart prompts */}
            {smartPrompts.length > 0 && (
              <SmartPrompts
                prompts={smartPrompts}
                onDismiss={(id) => setDismissedPrompts((prev) => new Set([...prev, id]))}
              />
            )}

            {/* Category-specific fields */}
            {categorySchema && Object.keys(categorySchema).length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-base font-medium">Additional Information</Label>
                {Object.entries(categorySchema).map(([fieldKey, field]) => (
                  <div key={fieldKey} className="space-y-2">
                    <Label htmlFor={fieldKey}>
                      {field.label}
                      {field.required && <span className="text-destructive">*</span>}
                    </Label>
                    <Controller
                      name={`categoryFields.${fieldKey}`}
                      control={control}
                      render={({ field: formField }) => {
                        if (field.type === 'textarea') {
                          return (
                            <Textarea
                              id={fieldKey}
                              {...formField}
                              value={formField.value as string || ''}
                            />
                          );
                        }
                        return (
                          <Input
                            id={fieldKey}
                            type={field.type || 'text'}
                            {...formField}
                            value={formField.value as string || ''}
                          />
                        );
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Contact info for non-anonymous */}
            {anonymityTier !== 'ANONYMOUS' && (
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-base font-medium">Contact Information</Label>
                <p className="text-sm text-muted-foreground">
                  This information will only be shared with authorized investigators.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Name</Label>
                    <Controller
                      name="contactName"
                      control={control}
                      render={({ field }) => (
                        <Input id="contactName" placeholder="Your name" {...field} />
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Email</Label>
                    <Controller
                      name="contactEmail"
                      control={control}
                      render={({ field }) => (
                        <Input id="contactEmail" type="email" placeholder="your@email.com" {...field} />
                      )}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="contactPhone">Phone (optional)</Label>
                    <Controller
                      name="contactPhone"
                      control={control}
                      render={({ field }) => (
                        <Input id="contactPhone" type="tel" placeholder="+1 (555) 123-4567" {...field} />
                      )}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 2: // Attachments
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Supporting Documents</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Upload any files that support your report. This is optional.
              </p>
            </div>

            <AttachmentUpload
              attachments={attachments}
              onAdd={handleAttachmentAdd}
              onRemove={handleAttachmentRemove}
              onToggleSensitive={handleSensitivityToggle}
              tenantSlug={tenantSlug}
            />
          </div>
        );

      case 3: // Review
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Review Your Report</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Please review your report before submitting.
              </p>
            </div>

            {/* Summary cards */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Category</CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-4">
                  <p className="font-medium">{selectedCategory?.name || 'Not selected'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Privacy Level</CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-4">
                  <p className="font-medium">
                    {anonymityTier === 'ANONYMOUS' && 'Anonymous'}
                    {anonymityTier === 'CONFIDENTIAL' && 'Confidential'}
                    {anonymityTier === 'OPEN' && 'Open'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Description</CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-4">
                  <p className="whitespace-pre-wrap text-sm">{description || 'No description provided'}</p>
                </CardContent>
              </Card>

              {attachments.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Attachments ({attachments.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0 pb-4">
                    <ul className="text-sm space-y-1">
                      {attachments.map((a) => (
                        <li key={a.id}>
                          {a.name}
                          {a.isSensitive && (
                            <span className="text-muted-foreground ml-2">(sensitive)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Urgency flag */}
              <Card className="border-amber-200 dark:border-amber-800">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <Controller
                      name="isUrgent"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="isUrgent"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <div className="flex-1">
                      <Label htmlFor="isUrgent" className="flex items-center gap-2 cursor-pointer">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="font-medium">This is urgent</span>
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Check this if there is an immediate risk to safety, health, or property.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Submit error */}
            {submitError && (
              <div
                className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive"
                role="alert"
              >
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={cn('space-y-6', className)}>
      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStep + 1} of {STEPS.length}</span>
          <span>{STEPS[currentStep].label}</span>
        </div>
        <Progress value={((currentStep + 1) / STEPS.length) * 100} />
      </div>

      {/* Step title */}
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{STEPS[currentStep].label}</h2>
        <p className="text-muted-foreground">{STEPS[currentStep].description}</p>
      </div>

      {/* Step content */}
      <div className="min-h-[300px]">{renderStepContent()}</div>

      {/* Auto-save indicator */}
      {isDbReady && (lastSaved || isSaving) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isSaving ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving draft...</span>
            </>
          ) : lastSaved ? (
            <>
              <Clock className="w-3 h-3" />
              <span>Draft saved at {lastSaved.toLocaleTimeString()}</span>
            </>
          ) : null}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        <div className="flex gap-3 flex-1">
          {currentStep > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={goToPreviousStep}
              className="flex-1 sm:flex-none"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}

          {currentStep < STEPS.length - 1 && (
            <Button
              type="button"
              onClick={goToNextStep}
              disabled={!isStepValid()}
              className="flex-1 sm:flex-none"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {currentStep === STEPS.length - 1 && (
            <Button
              type="submit"
              disabled={isSubmitting || !isStepValid()}
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
          )}
        </div>

        {/* Save for later button */}
        <Button
          type="button"
          variant="ghost"
          onClick={handleSaveForLater}
          disabled={isSaving}
          className="sm:ml-auto"
        >
          <Save className="w-4 h-4 mr-2" />
          Save for Later
        </Button>
      </div>

      {/* Save code display */}
      {saveCode && (
        <Card className="bg-primary/5 border-primary">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium">Draft Saved</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Use this code to resume your report on any device:
                </p>
                <p className="font-mono text-lg mt-2 select-all">{saveCode}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </form>
  );
}
