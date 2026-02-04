'use client';

/**
 * ProxyReportForm Component
 *
 * Multi-step form for managers to submit reports on behalf of team members.
 *
 * Features:
 * - Step 1: Select team member
 * - Step 2: Select proxy reason
 * - Step 3: Report details (category, description, attachments)
 * - Step 4: Review and confirm
 *
 * Employee contact info is auto-filled from the selected team member.
 * Access code is sent to the employee, not the manager.
 */

import * as React from 'react';
import { useState, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  Loader2,
  User,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TeamMemberSelector } from '@/components/employee/team-member-selector';
import { ProxyReasonSelector } from '@/components/employee/proxy-reason-selector';
import {
  CategorySelector,
} from '@/components/ethics/category-selector';
import {
  AttachmentUpload,
  createAttachmentFromFile,
  type Attachment,
} from '@/components/ethics/attachment-upload';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuthenticatedCategories, type Category } from '@/hooks/useAuthenticatedCategories';
import { apiClient } from '@/lib/api';
import type {
  TeamMember,
  ProxyReason,
  ProxySubmissionResult,
  PROXY_REASON_OPTIONS,
} from '@/types/employee-portal.types';

/**
 * Form steps.
 */
const STEPS = [
  { id: 'team-member', label: 'Team Member', description: 'Select who you are reporting for' },
  { id: 'reason', label: 'Reason', description: 'Why are you submitting on their behalf?' },
  { id: 'details', label: 'Report Details', description: 'Describe the concern' },
  { id: 'review', label: 'Review', description: 'Review and submit' },
];

/**
 * Form data type.
 */
interface ProxyReportFormData {
  teamMemberId: string;
  proxyReason: ProxyReason | '';
  customReason: string;
  categoryId: string;
  description: string;
  isUrgent: boolean;
  categoryFields: Record<string, unknown>;
}

interface ProxyReportFormProps {
  /** Callback on successful submission */
  onSubmit: (result: ProxySubmissionResult) => void;
  /** Callback when user cancels */
  onCancel?: () => void;
  /** Additional class name */
  className?: string;
}

/**
 * Get initials from a name.
 */
function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Get display label for proxy reason.
 */
function getProxyReasonLabel(reason: ProxyReason): string {
  const reasonLabels: Record<ProxyReason, string> = {
    REQUESTED_BY_EMPLOYEE: 'Employee requested I submit on their behalf',
    LANGUAGE_BARRIER: 'Employee has language barriers',
    TECHNICAL_DIFFICULTY: 'Employee has technical difficulties',
    OTHER: 'Other reason',
  };
  return reasonLabels[reason] || reason;
}

/**
 * ProxyReportForm - Multi-step form for proxy report submission.
 */
export function ProxyReportForm({
  onSubmit,
  onCancel,
  className,
}: ProxyReportFormProps) {
  // Current step (0-indexed)
  const [currentStep, setCurrentStep] = useState(0);
  // Selected team member
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  // Selected category
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Step validation errors
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  // Fetch team members
  const {
    teamMembers,
    isLoading: isLoadingTeam,
    isManager,
  } = useTeamMembers();

  // Fetch categories (authenticated endpoint)
  const { categories, isLoading: isLoadingCategories } = useAuthenticatedCategories();

  // Form setup
  const {
    control,
    watch,
    handleSubmit,
    setValue,
    getValues,
  } = useForm<ProxyReportFormData>({
    defaultValues: {
      teamMemberId: '',
      proxyReason: '',
      customReason: '',
      categoryId: '',
      description: '',
      isUrgent: false,
      categoryFields: {},
    },
  });

  // Watch form values
  const formValues = watch();
  const description = watch('description');
  const proxyReason = watch('proxyReason');
  const customReason = watch('customReason');

  /**
   * Handle team member selection.
   */
  const handleMemberSelect = useCallback((member: TeamMember) => {
    setSelectedMember(member);
    setValue('teamMemberId', member.id);
    setStepErrors((prev) => ({ ...prev, teamMember: '' }));
  }, [setValue]);

  /**
   * Handle category selection.
   */
  const handleCategorySelect = useCallback((category: Category) => {
    setSelectedCategory(category);
    setValue('categoryId', category.id);
    setStepErrors((prev) => ({ ...prev, category: '' }));
  }, [setValue]);

  /**
   * Handle proxy reason selection.
   */
  const handleReasonSelect = useCallback((reason: ProxyReason) => {
    setValue('proxyReason', reason);
    setStepErrors((prev) => ({ ...prev, reason: '' }));
  }, [setValue]);

  /**
   * Handle attachment add.
   */
  const handleAttachmentAdd = useCallback((files: File[]) => {
    const newAttachments = files.map(createAttachmentFromFile);
    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  /**
   * Handle attachment remove.
   */
  const handleAttachmentRemove = useCallback((attachmentId: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === attachmentId);
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      return prev.filter((a) => a.id !== attachmentId);
    });
  }, []);

  /**
   * Handle sensitivity toggle.
   */
  const handleSensitivityToggle = useCallback((attachmentId: string, sensitive: boolean) => {
    setAttachments((prev) =>
      prev.map((a) => (a.id === attachmentId ? { ...a, isSensitive: sensitive } : a))
    );
  }, []);

  /**
   * Validate current step.
   */
  const validateStep = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    switch (currentStep) {
      case 0: // Team member
        if (!selectedMember) {
          errors.teamMember = 'Please select a team member';
        }
        break;
      case 1: // Reason
        if (!proxyReason) {
          errors.reason = 'Please select a reason';
        } else if (proxyReason === 'OTHER' && !customReason.trim()) {
          errors.customReason = 'Please provide a reason';
        }
        break;
      case 2: // Details
        if (!selectedCategory) {
          errors.category = 'Please select a category';
        }
        if (!description.trim()) {
          errors.description = 'Please describe the concern';
        }
        break;
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  }, [currentStep, selectedMember, proxyReason, customReason, selectedCategory, description]);

  /**
   * Navigate to next step.
   */
  const goToNextStep = useCallback(() => {
    if (validateStep() && currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [validateStep, currentStep]);

  /**
   * Navigate to previous step.
   */
  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  /**
   * Handle form submission.
   */
  const handleFormSubmit = useCallback(async (data: ProxyReportFormData) => {
    if (!selectedMember || !selectedCategory) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await apiClient.post<ProxySubmissionResult>(
        '/employee/proxy-report',
        {
          employeeId: selectedMember.id,
          proxyReason: data.proxyReason,
          customReason: data.proxyReason === 'OTHER' ? data.customReason : undefined,
          categoryId: data.categoryId,
          description: data.description,
          isUrgent: data.isUrgent,
          categoryFields: data.categoryFields,
          attachmentIds: attachments.map((a) => a.id),
        }
      );

      onSubmit(response);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'An error occurred while submitting the report'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedMember, selectedCategory, attachments, onSubmit]);

  /**
   * Render step content.
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Team member selection
        return (
          <div className="space-y-6">
            <TeamMemberSelector
              selectedId={selectedMember?.id}
              onSelect={handleMemberSelect}
              teamMembers={teamMembers}
              isLoading={isLoadingTeam}
              error={stepErrors.teamMember}
            />

            {/* Selected member preview */}
            {selectedMember && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={selectedMember.avatarUrl || undefined} />
                      <AvatarFallback>
                        {getInitials(selectedMember.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{selectedMember.displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedMember.jobTitle}
                        {selectedMember.department && ` - ${selectedMember.department}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedMember.email}
                      </p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 1: // Proxy reason
        return (
          <ProxyReasonSelector
            selected={proxyReason as ProxyReason | undefined}
            onSelect={handleReasonSelect}
            customReason={customReason}
            onCustomReasonChange={(val) => setValue('customReason', val)}
            error={stepErrors.reason || stepErrors.customReason}
          />
        );

      case 2: // Report details
        return (
          <div className="space-y-6">
            {/* Selected employee reminder */}
            {selectedMember && (
              <Card className="bg-muted/50">
                <CardContent className="py-3">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Reporting for:</span>{' '}
                    <span className="font-medium">{selectedMember.displayName}</span>
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Category selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                What is this about?
              </Label>
              <CategorySelector
                categories={categories}
                selectedId={selectedCategory?.id}
                onSelect={handleCategorySelect}
                disabled={isLoadingCategories}
              />
              {stepErrors.category && (
                <p className="text-sm text-destructive">{stepErrors.category}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-medium">
                Describe what happened
              </Label>
              <p className="text-sm text-muted-foreground">
                Please provide as much detail as you can about the employee&apos;s concern.
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
              {stepErrors.description && (
                <p className="text-sm text-destructive">{stepErrors.description}</p>
              )}
            </div>

            {/* Attachments */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Supporting Documents (Optional)
              </Label>
              <AttachmentUpload
                attachments={attachments}
                onAdd={handleAttachmentAdd}
                onRemove={handleAttachmentRemove}
                onToggleSensitive={handleSensitivityToggle}
                tenantSlug=""
              />
            </div>
          </div>
        );

      case 3: // Review
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Review Your Proxy Report</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Please review the information before submitting.
              </p>
            </div>

            {/* Summary cards */}
            <div className="space-y-4">
              {/* Employee */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Employee (Reporter)
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-4">
                  {selectedMember && (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedMember.avatarUrl || undefined} />
                        <AvatarFallback>
                          {getInitials(selectedMember.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedMember.displayName}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedMember.email}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Proxy submitter (manager) */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Proxy Submitter (You)
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">You (Manager)</p>
                      <p className="text-sm text-muted-foreground">
                        Submitting on behalf of {selectedMember?.displayName}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Proxy reason */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Reason for Proxy Submission
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-4">
                  <p className="font-medium">
                    {proxyReason && getProxyReasonLabel(proxyReason as ProxyReason)}
                  </p>
                  {proxyReason === 'OTHER' && customReason && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {customReason}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Category */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Category
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-4">
                  <p className="font-medium">{selectedCategory?.name || 'Not selected'}</p>
                </CardContent>
              </Card>

              {/* Description */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-4">
                  <p className="whitespace-pre-wrap text-sm">
                    {description || 'No description provided'}
                  </p>
                </CardContent>
              </Card>

              {/* Attachments */}
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

              {/* Access code notice */}
              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        Access Code Delivery
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        The access code will be provided to{' '}
                        <strong>{selectedMember?.displayName}</strong> at{' '}
                        <strong>{selectedMember?.email}</strong> so they can check the
                        status of their report.
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        As the proxy submitter, you will not receive the access code.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

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

              {/* Audit acknowledgment */}
              <Card className="bg-muted/30">
                <CardContent className="py-4">
                  <p className="text-sm text-muted-foreground">
                    This proxy submission has been logged for compliance purposes.
                    Your identity as the proxy submitter will be recorded alongside
                    the employee&apos;s report.
                  </p>
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

  // Check if user is a manager
  if (!isLoadingTeam && !isManager) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="py-8 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
          <h3 className="mt-4 font-medium">Manager Access Required</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Proxy reporting is only available for managers with direct or indirect reports.
          </p>
          {onCancel && (
            <Button variant="outline" className="mt-4" onClick={onCancel}>
              Go Back
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className={cn('space-y-6', className)}
    >
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

          {currentStep === 0 && onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
          )}

          {currentStep < STEPS.length - 1 && (
            <Button
              type="button"
              onClick={goToNextStep}
              className="flex-1 sm:flex-none ml-auto"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {currentStep === STEPS.length - 1 && (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none ml-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Proxy Report
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
