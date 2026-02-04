'use client';

import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Save,
  Rocket,
  AlertTriangle,
  Users,
  Calendar,
  FileText,
  Bell,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import { SegmentBuilder, type SegmentCriteria } from './SegmentBuilder';
import { ScheduleConfig, type ScheduleConfiguration } from './ScheduleConfig';

// Campaign types
export type CampaignType = 'DISCLOSURE' | 'ATTESTATION' | 'SURVEY' | 'ACKNOWLEDGMENT';

// Form template type
export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  type: string;
}

// Campaign draft state
export interface CampaignDraft {
  id?: string;
  name: string;
  description: string;
  type: CampaignType;
  formTemplateId?: string;
  audienceCriteria?: SegmentCriteria | null;
  audienceCount?: number;
  schedule?: ScheduleConfiguration;
  status: 'draft' | 'scheduled' | 'active';
}

// Step configuration
interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  {
    id: 'basic',
    title: 'Basic Info',
    description: 'Name, type, and form',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: 'audience',
    title: 'Audience',
    description: 'Who should receive this',
    icon: <Users className="h-5 w-5" />,
  },
  {
    id: 'schedule',
    title: 'Schedule',
    description: 'When to send',
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Confirm and launch',
    icon: <Check className="h-5 w-5" />,
  },
];

// Campaign type options
const CAMPAIGN_TYPES: { value: CampaignType; label: string; description: string }[] = [
  {
    value: 'DISCLOSURE',
    label: 'Disclosure',
    description: 'Conflict of interest, gifts & entertainment, outside employment',
  },
  {
    value: 'ATTESTATION',
    label: 'Attestation',
    description: 'Policy acknowledgment, code of conduct certification',
  },
  {
    value: 'SURVEY',
    label: 'Survey',
    description: 'Employee feedback, culture assessment',
  },
  {
    value: 'ACKNOWLEDGMENT',
    label: 'Acknowledgment',
    description: 'Training completion, document receipt',
  },
];

// Props
interface CampaignBuilderProps {
  campaignId?: string;
  initialData?: CampaignDraft;
  onSave?: (draft: CampaignDraft) => Promise<void>;
  onLaunch?: (draft: CampaignDraft) => Promise<void>;
  className?: string;
}

/**
 * CampaignBuilder - Multi-step wizard for creating disclosure campaigns.
 *
 * Steps:
 * 1. Basic Info - Name, description, type, form template
 * 2. Audience - SegmentBuilder for targeting
 * 3. Schedule - ScheduleConfig for timing and reminders
 * 4. Review - Summary and launch confirmation
 */
export function CampaignBuilder({
  campaignId,
  initialData,
  onSave,
  onLaunch,
  className,
}: CampaignBuilderProps) {
  const router = useRouter();

  // Step state
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Draft state
  const [draft, setDraft] = useState<CampaignDraft>(() => initialData || {
    name: '',
    description: '',
    type: 'DISCLOSURE',
    status: 'draft',
  });

  // Form templates
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // UI state
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [showLaunchConfirm, setShowLaunchConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load form templates
  React.useEffect(() => {
    const loadTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const response = await apiClient.get<{ forms: FormTemplate[] }>('/forms/definitions', {
          params: { type: draft.type },
        });
        setTemplates(response.forms || []);
      } catch (err) {
        console.error('Failed to load form templates:', err);
        // Demo templates for development
        setTemplates([
          {
            id: 'form-1',
            name: 'Annual COI Disclosure',
            description: 'Standard conflict of interest disclosure form',
            type: 'DISCLOSURE',
          },
          {
            id: 'form-2',
            name: 'Gift & Entertainment Report',
            description: 'Report gifts and entertainment received or given',
            type: 'DISCLOSURE',
          },
          {
            id: 'form-3',
            name: 'Outside Employment Declaration',
            description: 'Declare outside business activities',
            type: 'DISCLOSURE',
          },
          {
            id: 'form-4',
            name: 'Code of Conduct Attestation',
            description: 'Annual code of conduct certification',
            type: 'ATTESTATION',
          },
        ]);
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, [draft.type]);

  // Update draft helper
  const updateDraft = useCallback((updates: Partial<CampaignDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  // Step validation
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Basic Info
        return Boolean(draft.name && draft.type);
      case 1: // Audience
        return draft.audienceCount !== undefined && draft.audienceCount > 0;
      case 2: // Schedule
        return draft.schedule !== undefined;
      case 3: // Review
        return true;
      default:
        return false;
    }
  };

  // Check if step can be accessed
  const canAccessStep = (step: number): boolean => {
    if (step === 0) return true;
    // Can access if previous step is complete
    return validateStep(step - 1);
  };

  // Navigate to step
  const goToStep = (step: number) => {
    if (canAccessStep(step)) {
      // Mark current step as completed if valid
      if (validateStep(currentStep)) {
        setCompletedSteps((prev) => new Set([...prev, currentStep]));
      }
      setCurrentStep(step);
    }
  };

  // Navigate to next step
  const nextStep = () => {
    if (currentStep < STEPS.length - 1 && validateStep(currentStep)) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep((prev) => prev + 1);
    }
  };

  // Navigate to previous step
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Save draft
  const handleSaveDraft = async () => {
    setSaving(true);
    setError(null);

    try {
      if (onSave) {
        await onSave(draft);
      } else {
        // Default save implementation
        const response = await apiClient.post<{ id: string }>('/campaigns/draft', {
          ...draft,
          audienceMode: draft.audienceCriteria ? 'SEGMENT' : 'ALL',
          criteria: draft.audienceCriteria,
          dueDate: draft.schedule?.deadlineDate?.toISOString(),
          launchAt: draft.schedule?.launchDate?.toISOString(),
          reminderDays: draft.schedule?.reminders.map((r) => r.daysBeforeDeadline),
        });
        updateDraft({ id: response.id });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  // Launch campaign
  const handleLaunch = async () => {
    setLaunching(true);
    setError(null);

    try {
      if (onLaunch) {
        await onLaunch(draft);
      } else {
        // Save draft first if not saved
        if (!draft.id) {
          const saveResponse = await apiClient.post<{ id: string }>('/campaigns', {
            name: draft.name,
            description: draft.description,
            type: draft.type,
            formDefinitionId: draft.formTemplateId,
            audienceMode: draft.audienceCriteria ? 'SEGMENT' : 'ALL',
            criteria: draft.audienceCriteria,
            dueDate: draft.schedule?.deadlineDate?.toISOString(),
            launchAt: draft.schedule?.launchDate?.toISOString(),
            reminderDays: draft.schedule?.reminders.map((r) => r.daysBeforeDeadline),
          });
          draft.id = saveResponse.id;
        }

        // Launch the campaign
        await apiClient.post(`/campaigns/${draft.id}/launch`, {
          launchAt: draft.schedule?.launchType === 'immediate'
            ? undefined
            : draft.schedule?.launchDate?.toISOString(),
        });
      }

      // Redirect to campaign list or detail
      router.push('/campaigns');
    } catch (err: any) {
      setError(err.message || 'Failed to launch campaign');
      setShowLaunchConfirm(false);
    } finally {
      setLaunching(false);
    }
  };

  // Cancel and go back
  const handleCancel = () => {
    router.push('/campaigns');
  };

  // Filtered templates by campaign type
  const filteredTemplates = useMemo(
    () => templates.filter((t) => t.type === draft.type || !t.type),
    [templates, draft.type]
  );

  // Can launch?
  const canLaunch = useMemo(() => {
    return (
      validateStep(0) &&
      validateStep(1) &&
      validateStep(2) &&
      !saving &&
      !launching
    );
  }, [draft, saving, launching]);

  // Get deadline summary text
  const getDeadlineSummary = () => {
    if (!draft.schedule) return 'Not configured';
    if (draft.schedule.deadlineType === 'absolute' && draft.schedule.deadlineDate) {
      return format(draft.schedule.deadlineDate, 'PPP');
    }
    if (draft.schedule.deadlineType === 'relative' && draft.schedule.relativeDays) {
      return `${draft.schedule.relativeDays} days after assignment`;
    }
    return 'Not configured';
  };

  // Get launch summary text
  const getLaunchSummary = () => {
    if (!draft.schedule) return 'Not configured';
    switch (draft.schedule.launchType) {
      case 'immediate':
        return 'Immediately upon creation';
      case 'scheduled':
        if (draft.schedule.launchDate) {
          return `${format(draft.schedule.launchDate, 'PPP')} at ${draft.schedule.launchTime || '09:00'}`;
        }
        return 'Date not set';
      case 'staggered':
        return `${draft.schedule.waves?.length || 0} waves`;
      default:
        return 'Not configured';
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => goToStep(index)}
                disabled={!canAccessStep(index)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors',
                  index === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : completedSteps.has(index)
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : canAccessStep(index)
                        ? 'bg-muted hover:bg-muted/80'
                        : 'cursor-not-allowed bg-muted/50 text-muted-foreground'
                )}
              >
                {completedSteps.has(index) && index !== currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.icon
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </button>
              {index < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Draft
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-4 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Step content */}
      <div className="min-h-[400px]">
        {/* Step 1: Basic Info */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>
                Give your campaign a name and select its type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Q1 2026 Annual COI Disclosure"
                  value={draft.name}
                  onChange={(e) => updateDraft({ name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the purpose of this campaign..."
                  value={draft.description}
                  onChange={(e) => updateDraft({ description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Campaign Type *</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {CAMPAIGN_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => updateDraft({ type: type.value, formTemplateId: undefined })}
                      className={cn(
                        'flex flex-col items-start rounded-lg border p-4 text-left transition-colors',
                        draft.type === type.value
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/50'
                      )}
                    >
                      <span className="font-medium">{type.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {type.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template">Form Template</Label>
                <Select
                  value={draft.formTemplateId}
                  onValueChange={(value) => updateDraft({ formTemplateId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a form template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingTemplates ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : filteredTemplates.length > 0 ? (
                      filteredTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex flex-col">
                            <span>{template.name}</span>
                            {template.description && (
                              <span className="text-xs text-muted-foreground">
                                {template.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        No templates available for this type
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Audience */}
        {currentStep === 1 && (
          <SegmentBuilder
            value={draft.audienceCriteria || undefined}
            onChange={(criteria) => {
              updateDraft({ audienceCriteria: criteria });
            }}
          />
        )}

        {/* Step 3: Schedule */}
        {currentStep === 2 && (
          <ScheduleConfig
            value={draft.schedule}
            onChange={(schedule) => updateDraft({ schedule })}
            audienceCount={draft.audienceCount || 0}
          />
        )}

        {/* Step 4: Review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Summary</CardTitle>
                <CardDescription>
                  Review your campaign settings before launching
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2">
                  {/* Basic Info Summary */}
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 font-medium">
                      <FileText className="h-4 w-4" />
                      Campaign Details
                    </h4>
                    <div className="space-y-2 rounded-lg border p-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Name</span>
                        <span className="text-sm font-medium">{draft.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Type</span>
                        <Badge variant="secondary">{draft.type}</Badge>
                      </div>
                      {draft.formTemplateId && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Form</span>
                          <span className="text-sm">
                            {templates.find((t) => t.id === draft.formTemplateId)?.name || 'Selected'}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => goToStep(0)}
                    >
                      Edit
                    </Button>
                  </div>

                  {/* Audience Summary */}
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 font-medium">
                      <Users className="h-4 w-4" />
                      Target Audience
                    </h4>
                    <div className="space-y-2 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Recipients</span>
                        <span className="text-lg font-semibold">
                          {(draft.audienceCount || 0).toLocaleString()}
                        </span>
                      </div>
                      {draft.audienceCriteria && (
                        <p className="text-xs text-muted-foreground">
                          Targeted by segment criteria
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => goToStep(1)}
                    >
                      Edit
                    </Button>
                  </div>

                  {/* Schedule Summary */}
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 font-medium">
                      <Calendar className="h-4 w-4" />
                      Schedule
                    </h4>
                    <div className="space-y-2 rounded-lg border p-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Launch</span>
                        <span className="text-sm">{getLaunchSummary()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Deadline</span>
                        <span className="text-sm">{getDeadlineSummary()}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => goToStep(2)}
                    >
                      Edit
                    </Button>
                  </div>

                  {/* Reminders Summary */}
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 font-medium">
                      <Bell className="h-4 w-4" />
                      Reminders
                    </h4>
                    <div className="space-y-2 rounded-lg border p-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Reminders</span>
                        <span className="text-sm">
                          {draft.schedule?.reminders.length || 0} configured
                        </span>
                      </div>
                      {draft.schedule?.reminders && draft.schedule.reminders.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {draft.schedule.reminders
                            .map((r) => `${r.daysBeforeDeadline}d`)
                            .join(', ')}{' '}
                          before deadline
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => goToStep(2)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>

                {/* Estimated completion */}
                {draft.schedule?.deadlineDate && (
                  <div className="mt-6 rounded-lg bg-muted/50 p-4">
                    <p className="text-sm">
                      <strong>Estimated completion:</strong>{' '}
                      {format(draft.schedule.deadlineDate, 'PPPP')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Launch warning */}
            {!canLaunch && (
              <div className="flex items-center gap-2 rounded-md bg-amber-50 p-4 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm">
                  Please complete all required fields before launching.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between border-t pt-4">
        <div>
          {currentStep > 0 && (
            <Button variant="outline" onClick={prevStep}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button onClick={nextStep} disabled={!validateStep(currentStep)}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => setShowLaunchConfirm(true)}
              disabled={!canLaunch}
            >
              <Rocket className="mr-2 h-4 w-4" />
              Launch Campaign
            </Button>
          )}
        </div>
      </div>

      {/* Launch confirmation dialog */}
      <Dialog open={showLaunchConfirm} onOpenChange={setShowLaunchConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Launch Campaign?</DialogTitle>
            <DialogDescription>
              This will send notifications to {(draft.audienceCount || 0).toLocaleString()}{' '}
              employees. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <h4 className="mb-2 font-medium">{draft.name}</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Type: {CAMPAIGN_TYPES.find((t) => t.value === draft.type)?.label}</p>
                <p>Recipients: {(draft.audienceCount || 0).toLocaleString()}</p>
                <p>Launch: {getLaunchSummary()}</p>
                <p>Deadline: {getDeadlineSummary()}</p>
              </div>
            </div>

            {draft.schedule?.launchType === 'immediate' && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">
                  This campaign will launch immediately after confirmation.
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLaunchConfirm(false)}
              disabled={launching}
            >
              Cancel
            </Button>
            <Button onClick={handleLaunch} disabled={launching}>
              {launching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="mr-2 h-4 w-4" />
              )}
              {launching ? 'Launching...' : 'Confirm Launch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CampaignBuilder;
