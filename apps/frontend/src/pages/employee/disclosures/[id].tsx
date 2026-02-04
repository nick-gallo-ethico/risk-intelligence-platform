'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toaster';
import {
  DisclosureForm,
  FormTemplate,
  FormSection,
  FormField,
} from '@/components/disclosures/DisclosureForm';

// ===========================================
// Types
// ===========================================

/**
 * Campaign assignment data from API.
 */
interface CampaignAssignment {
  id: string;
  campaignId: string;
  employeeId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'SKIPPED';
  dueDate: string;
  startedAt?: string;
  completedAt?: string;
  campaign: {
    id: string;
    name: string;
    description?: string;
    formTemplateId: string;
    disclosureType: string;
    startDate: string;
    endDate: string;
  };
}

/**
 * Draft data from API.
 */
interface DisclosureDraft {
  id: string;
  formData: Record<string, unknown>;
  completionPercentage: number;
  currentSection?: string;
  updatedAt: string;
}

/**
 * Form template from API.
 */
interface ApiFormTemplate {
  id: string;
  name: string;
  description?: string;
  schema: object;
  uiSchema?: {
    order?: string[];
    fields?: Record<string, {
      widget?: string;
      placeholder?: string;
      helpText?: string;
      label?: string;
      colSpan?: number;
    }>;
    conditionals?: Array<{
      if: { field: string; value: unknown; operator?: string };
      then: { show?: string[]; hide?: string[]; require?: string[]; };
    }>;
  };
  version: number;
  sections?: ApiFormSection[];
}

/**
 * Section from API.
 */
interface ApiFormSection {
  id: string;
  title: string;
  description?: string;
  fields: ApiFormField[];
  isRepeater?: boolean;
  minItems?: number;
  maxItems?: number;
  itemLabel?: string;
}

/**
 * Field from API.
 */
interface ApiFormField {
  id: string;
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  conditionalVisibility?: {
    field: string;
    operator: string;
    value?: unknown;
  };
  colSpan?: number;
}

/**
 * Submission response from API.
 */
interface SubmissionResult {
  disclosure: {
    id: string;
    referenceNumber: string;
    status: string;
  };
  riuId: string;
  riuReferenceNumber: string;
  thresholdEvaluation?: {
    triggered: boolean;
    triggeredRules: Array<{
      ruleName: string;
      action: string;
    }>;
  };
  conflictCheckResult?: {
    conflictCount: number;
    conflicts: Array<{
      summary: string;
      severity: string;
    }>;
  };
  autoCreatedCase?: {
    caseId: string;
    caseReferenceNumber: string;
    reason: string;
  };
}

// ===========================================
// API Functions
// ===========================================

/**
 * Load campaign assignment by ID.
 */
async function loadAssignment(assignmentId: string): Promise<CampaignAssignment> {
  return apiClient.get<CampaignAssignment>(`/campaigns/assignments/${assignmentId}`);
}

/**
 * Load form template by ID.
 */
async function loadFormTemplate(templateId: string): Promise<ApiFormTemplate> {
  return apiClient.get<ApiFormTemplate>(`/forms/templates/${templateId}`);
}

/**
 * Load existing draft for assignment.
 */
async function loadDraft(assignmentId: string): Promise<DisclosureDraft | null> {
  try {
    const drafts = await apiClient.get<DisclosureDraft[]>(
      `/disclosures/drafts?assignmentId=${assignmentId}`
    );
    return drafts.length > 0 ? drafts[0] : null;
  } catch {
    return null;
  }
}

/**
 * Save draft.
 */
async function saveDraft(
  data: Record<string, unknown>,
  currentSection: string,
  assignmentId?: string,
  formTemplateId?: string,
  disclosureType?: string,
): Promise<DisclosureDraft> {
  return apiClient.post<DisclosureDraft>('/disclosures/drafts', {
    assignmentId,
    formTemplateId,
    disclosureType,
    formData: data,
    currentSection,
    completionPercentage: calculateCompletionPercentage(data),
  });
}

/**
 * Submit disclosure.
 */
async function submitDisclosure(
  data: Record<string, unknown>,
  assignmentId: string,
  formTemplateId: string,
  disclosureType: string,
  draftId?: string,
): Promise<SubmissionResult> {
  return apiClient.post<SubmissionResult>('/disclosures/submit', {
    assignmentId,
    formTemplateId,
    disclosureType,
    formData: data,
    draftId,
  });
}

/**
 * Calculate completion percentage based on filled fields.
 */
function calculateCompletionPercentage(data: Record<string, unknown>): number {
  const values = Object.values(data);
  if (values.length === 0) return 0;

  const filledCount = values.filter(
    (v) => v !== undefined && v !== null && v !== ''
  ).length;

  return Math.round((filledCount / values.length) * 100);
}

// ===========================================
// Conversion Functions
// ===========================================

/**
 * Convert API form template to component format.
 */
function convertApiTemplate(apiTemplate: ApiFormTemplate): FormTemplate {
  // If sections are provided directly, use them
  if (apiTemplate.sections && apiTemplate.sections.length > 0) {
    return {
      id: apiTemplate.id,
      name: apiTemplate.name,
      description: apiTemplate.description,
      sections: apiTemplate.sections.map(convertApiSection),
      schema: apiTemplate.schema,
      version: apiTemplate.version,
    };
  }

  // Otherwise, build sections from JSON Schema
  return buildSectionsFromSchema(apiTemplate);
}

/**
 * Convert API section to component format.
 */
function convertApiSection(apiSection: ApiFormSection): FormSection {
  return {
    id: apiSection.id,
    title: apiSection.title,
    description: apiSection.description,
    fields: apiSection.fields.map(convertApiField),
    isRepeater: apiSection.isRepeater,
    minItems: apiSection.minItems,
    maxItems: apiSection.maxItems,
    itemLabel: apiSection.itemLabel,
  };
}

/**
 * Convert API field to component format.
 */
function convertApiField(apiField: ApiFormField): FormField {
  return {
    id: apiField.id,
    name: apiField.name,
    label: apiField.label,
    type: apiField.type as FormField['type'],
    required: apiField.required,
    placeholder: apiField.placeholder,
    helpText: apiField.helpText,
    options: apiField.options,
    minLength: apiField.minLength,
    maxLength: apiField.maxLength,
    min: apiField.min,
    max: apiField.max,
    pattern: apiField.pattern,
    conditionalVisibility: apiField.conditionalVisibility ? {
      field: apiField.conditionalVisibility.field,
      operator: apiField.conditionalVisibility.operator as 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in' | 'empty' | 'notEmpty',
      value: apiField.conditionalVisibility.value,
    } : undefined,
    colSpan: apiField.colSpan as FormField['colSpan'],
  };
}

/**
 * Build sections from JSON Schema if sections not provided.
 */
function buildSectionsFromSchema(apiTemplate: ApiFormTemplate): FormTemplate {
  const schema = apiTemplate.schema as {
    properties?: Record<string, {
      type?: string;
      title?: string;
      description?: string;
      enum?: string[];
      items?: { type?: string };
      format?: string;
      minLength?: number;
      maxLength?: number;
      minimum?: number;
      maximum?: number;
      pattern?: string;
    }>;
    required?: string[];
  };

  if (!schema.properties) {
    return {
      id: apiTemplate.id,
      name: apiTemplate.name,
      description: apiTemplate.description,
      sections: [{
        id: 'default',
        title: 'Information',
        fields: [],
      }],
      schema: apiTemplate.schema,
      version: apiTemplate.version,
    };
  }

  // Get UI schema for field configuration
  const uiSchema = apiTemplate.uiSchema;
  const fieldOrder = uiSchema?.order || Object.keys(schema.properties);
  const requiredFields = schema.required || [];

  // Convert properties to fields
  const fields: FormField[] = fieldOrder
    .filter((name) => schema.properties?.[name])
    .map((name) => {
      const prop = schema.properties![name];
      const uiField = uiSchema?.fields?.[name];

      // Determine field type from schema
      let fieldType: FormField['type'] = 'text';
      if (prop.enum) {
        fieldType = 'select';
      } else if (prop.type === 'number' || prop.type === 'integer') {
        fieldType = 'number';
      } else if (prop.type === 'boolean') {
        fieldType = 'checkbox';
      } else if (prop.type === 'array') {
        fieldType = 'text'; // Simple arrays treated as text for now
      } else if (prop.format === 'date') {
        fieldType = 'date';
      } else if (prop.format === 'email') {
        fieldType = 'email';
      } else if (uiField?.widget) {
        fieldType = uiField.widget as FormField['type'];
      }

      return {
        id: name,
        name,
        label: uiField?.label || prop.title || name,
        type: fieldType,
        required: requiredFields.includes(name),
        placeholder: uiField?.placeholder,
        helpText: uiField?.helpText || prop.description,
        options: prop.enum?.map((value) => ({ value, label: value })),
        minLength: prop.minLength,
        maxLength: prop.maxLength,
        min: prop.minimum,
        max: prop.maximum,
        pattern: prop.pattern,
        colSpan: uiField?.colSpan as FormField['colSpan'],
      };
    });

  // Group fields into reasonable sections (max 6 fields per section)
  const sections: FormSection[] = [];
  const FIELDS_PER_SECTION = 6;

  for (let i = 0; i < fields.length; i += FIELDS_PER_SECTION) {
    const sectionFields = fields.slice(i, i + FIELDS_PER_SECTION);
    const sectionNumber = Math.floor(i / FIELDS_PER_SECTION) + 1;

    sections.push({
      id: `section-${sectionNumber}`,
      title: sectionNumber === 1 ? 'Basic Information' : `Section ${sectionNumber}`,
      fields: sectionFields,
    });
  }

  // Ensure at least one section
  if (sections.length === 0) {
    sections.push({
      id: 'default',
      title: 'Information',
      fields: [],
    });
  }

  return {
    id: apiTemplate.id,
    name: apiTemplate.name,
    description: apiTemplate.description,
    sections,
    schema: apiTemplate.schema,
    version: apiTemplate.version,
  };
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Calculate days until deadline.
 */
function getDaysUntilDeadline(dueDate: string): { days: number; isOverdue: boolean } {
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    days: Math.abs(diffDays),
    isOverdue: diffDays < 0,
  };
}

/**
 * Format date for display.
 */
function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date(dateStr));
}

// ===========================================
// Component
// ===========================================

/**
 * Employee disclosure submission page.
 *
 * Route: /employee/disclosures/[assignmentId]
 *
 * Features:
 * - Loads assignment and form template
 * - Checks for existing draft and resumes
 * - Shows campaign info and deadline
 * - Renders DisclosureForm component
 * - Handles submission with success/error feedback
 * - Redirects to dashboard after successful submission
 */
export default function EmployeeDisclosurePage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params?.id as string;

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<CampaignAssignment | null>(null);
  const [formTemplate, setFormTemplate] = useState<FormTemplate | null>(null);
  const [draft, setDraft] = useState<DisclosureDraft | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      if (!assignmentId) {
        setError('Assignment ID is required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Load assignment
        const assignmentData = await loadAssignment(assignmentId);
        setAssignment(assignmentData);

        // Check if already completed
        if (assignmentData.status === 'COMPLETED') {
          setIsSubmitted(true);
          setIsLoading(false);
          return;
        }

        // Load form template
        const templateData = await loadFormTemplate(assignmentData.campaign.formTemplateId);
        const convertedTemplate = convertApiTemplate(templateData);
        setFormTemplate(convertedTemplate);

        // Load existing draft
        const existingDraft = await loadDraft(assignmentId);
        setDraft(existingDraft);

      } catch (err) {
        console.error('Failed to load disclosure data:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load disclosure. Please try again.'
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [assignmentId]);

  // Handle draft save
  const handleSaveDraft = useCallback(async (
    data: Record<string, unknown>,
    currentSection: string,
  ) => {
    if (!assignment || !formTemplate) return;

    try {
      const savedDraft = await saveDraft(
        data,
        currentSection,
        assignment.id,
        formTemplate.id,
        assignment.campaign.disclosureType,
      );
      setDraft(savedDraft);
    } catch (err) {
      console.error('Failed to save draft:', err);
      throw err; // Let the form handle the error
    }
  }, [assignment, formTemplate]);

  // Handle form submission
  const handleSubmit = useCallback(async (data: Record<string, unknown>) => {
    if (!assignment || !formTemplate) return;

    try {
      const result = await submitDisclosure(
        data,
        assignment.id,
        formTemplate.id,
        assignment.campaign.disclosureType,
        draft?.id,
      );

      setSubmissionResult(result);
      setIsSubmitted(true);

      // Show success message
      toast.success('Disclosure submitted successfully!');

      // Redirect after delay
      setTimeout(() => {
        router.push('/employee/dashboard');
      }, 3000);

    } catch (err) {
      console.error('Submission failed:', err);
      throw err; // Let the form handle the error
    }
  }, [assignment, formTemplate, draft, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container max-w-4xl py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{error}</p>
            <Button onClick={() => router.push('/employee/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Submission success state
  if (isSubmitted) {
    return (
      <div className="container max-w-4xl py-8">
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="text-green-600 flex items-center gap-2">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Disclosure Submitted
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submissionResult && (
              <>
                <p>
                  Your disclosure has been submitted successfully.
                  Reference: <strong>{submissionResult.riuReferenceNumber}</strong>
                </p>

                {/* Conflict alerts */}
                {submissionResult.conflictCheckResult &&
                  submissionResult.conflictCheckResult.conflictCount > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 text-amber-600 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <div>
                          <p className="font-medium text-amber-800">
                            {submissionResult.conflictCheckResult.conflictCount} potential
                            conflict(s) detected
                          </p>
                          <p className="text-sm text-amber-700 mt-1">
                            Your disclosure will be reviewed by the compliance team.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Case created alert */}
                {submissionResult.autoCreatedCase && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-5 h-5 text-blue-600 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <p className="font-medium text-blue-800">
                          Review case created
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          {submissionResult.autoCreatedCase.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard in a few seconds...
            </p>

            <Button onClick={() => router.push('/employee/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No assignment loaded
  if (!assignment || !formTemplate) {
    return null;
  }

  // Calculate deadline info
  const deadlineInfo = getDaysUntilDeadline(assignment.dueDate);

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/employee/dashboard')}
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </Button>
        </div>

        <h1 className="text-2xl font-bold">{assignment.campaign.name}</h1>

        {assignment.campaign.description && (
          <p className="text-muted-foreground">{assignment.campaign.description}</p>
        )}
      </div>

      {/* Campaign info bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Deadline */}
              <div className="flex items-center gap-2">
                <svg
                  className={cn(
                    'w-5 h-5',
                    deadlineInfo.isOverdue ? 'text-destructive' : 'text-muted-foreground'
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <div>
                  <span className="text-sm font-medium">
                    Due: {formatDate(assignment.dueDate)}
                  </span>
                  {deadlineInfo.isOverdue ? (
                    <Badge variant="destructive" className="ml-2">
                      {deadlineInfo.days} day(s) overdue
                    </Badge>
                  ) : deadlineInfo.days <= 3 ? (
                    <Badge variant="outline" className="ml-2 text-amber-600 border-amber-300">
                      {deadlineInfo.days} day(s) left
                    </Badge>
                  ) : null}
                </div>
              </div>

              {/* Status */}
              <Badge
                variant={
                  assignment.status === 'IN_PROGRESS'
                    ? 'secondary'
                    : assignment.status === 'OVERDUE'
                    ? 'destructive'
                    : 'outline'
                }
              >
                {assignment.status.replace('_', ' ')}
              </Badge>
            </div>

            {/* Draft indicator */}
            {draft && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  Draft saved ({draft.completionPercentage}% complete)
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Disclosure Form */}
      <DisclosureForm
        formTemplate={formTemplate}
        assignmentId={assignment.id}
        draftData={draft?.formData}
        draftId={draft?.id}
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
      />
    </div>
  );
}
