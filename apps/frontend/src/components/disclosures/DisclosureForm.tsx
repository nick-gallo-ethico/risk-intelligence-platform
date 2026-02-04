'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useForm, Controller, FieldError } from 'react-hook-form';
import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { DraftIndicator, SaveStatus } from './DraftIndicator';

// ===========================================
// Types
// ===========================================

/**
 * Form field definition from form template.
 */
export interface FormField {
  id: string;
  name: string;
  label: string;
  type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'currency'
    | 'date'
    | 'select'
    | 'radio'
    | 'checkbox'
    | 'email'
    | 'phone'
    | 'file'
    | 'relationship-mapper';
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  conditionalVisibility?: ConditionalRule;
  colSpan?: 1 | 2 | 3;
}

/**
 * Conditional visibility rule for form fields.
 */
export interface ConditionalRule {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in' | 'empty' | 'notEmpty';
  value?: unknown;
}

/**
 * Form section definition.
 */
export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  isRepeater?: boolean;
  minItems?: number;
  maxItems?: number;
  itemLabel?: string; // For repeaters, e.g., "Gift"
}

/**
 * Form template definition.
 */
export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  sections: FormSection[];
  schema?: object; // JSON Schema for validation
  version?: number;
}

/**
 * Props for DisclosureForm component.
 */
export interface DisclosureFormProps {
  /** Form template defining fields and sections */
  formTemplate: FormTemplate;
  /** Campaign assignment ID if from a campaign */
  assignmentId?: string;
  /** Initial data to resume from draft */
  draftData?: Record<string, unknown>;
  /** Draft ID if resuming */
  draftId?: string;
  /** Callback when form is submitted */
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  /** Callback to save draft */
  onSaveDraft: (data: Record<string, unknown>, currentSection: string) => Promise<void>;
  /** Whether the form is in read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ===========================================
// Validation
// ===========================================

/**
 * Initialize Ajv validator with formats.
 */
function createValidator() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv;
}

/**
 * Convert Ajv errors to field-level errors.
 */
function convertAjvErrors(
  errors: ErrorObject[] | null | undefined
): Record<string, string> {
  if (!errors) return {};

  const fieldErrors: Record<string, string> = {};

  for (const error of errors) {
    const path = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
    const field = path || error.params?.missingProperty || 'form';

    if (!fieldErrors[field]) {
      switch (error.keyword) {
        case 'required':
          fieldErrors[field] = 'This field is required';
          break;
        case 'minLength':
          fieldErrors[field] = `Must be at least ${error.params?.limit} characters`;
          break;
        case 'maxLength':
          fieldErrors[field] = `Must be at most ${error.params?.limit} characters`;
          break;
        case 'minimum':
          fieldErrors[field] = `Must be at least ${error.params?.limit}`;
          break;
        case 'maximum':
          fieldErrors[field] = `Must be at most ${error.params?.limit}`;
          break;
        case 'pattern':
          fieldErrors[field] = 'Invalid format';
          break;
        case 'format':
          fieldErrors[field] = `Invalid ${error.params?.format} format`;
          break;
        case 'type':
          fieldErrors[field] = `Expected ${error.params?.type}`;
          break;
        default:
          fieldErrors[field] = error.message || 'Invalid value';
      }
    }
  }

  return fieldErrors;
}

// ===========================================
// Component
// ===========================================

/**
 * Multi-step disclosure form wizard component.
 *
 * Features:
 * - Renders form sections as wizard steps
 * - Supports all compliance field types
 * - Auto-saves drafts every 30 seconds and on navigation
 * - Validates per-step and cross-field on submission
 * - Supports repeater sections with nested fields
 * - Shows review step before final submission
 * - Requires attestation checkbox for submission
 */
export function DisclosureForm({
  formTemplate,
  assignmentId,
  draftData,
  draftId,
  onSubmit,
  onSaveDraft,
  readOnly = false,
  className,
}: DisclosureFormProps) {
  // Track current step (0-indexed, last step is review)
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [attestationChecked, setAttestationChecked] = useState(false);

  // Track if form is dirty (has unsaved changes)
  const [isDirty, setIsDirty] = useState(false);
  const lastSavedRef = useRef<string>('');

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Ajv validator
  const validator = useMemo(() => createValidator(), []);

  // Total steps: sections + 1 review step
  const totalSteps = formTemplate.sections.length + 1;
  const isReviewStep = currentStep === formTemplate.sections.length;
  const currentSection = isReviewStep ? null : formTemplate.sections[currentStep];

  // Initialize form with react-hook-form
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = useForm({
    defaultValues: draftData || {},
    mode: 'onBlur',
  });

  // Watch all form values for auto-save and conditional visibility
  const formValues = watch();

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    if (!formTemplate.sections.length) return 0;

    let totalFields = 0;
    let filledFields = 0;

    formTemplate.sections.forEach((section) => {
      if (section.isRepeater) {
        const items = formValues[section.id] as unknown[] | undefined;
        if (items && Array.isArray(items)) {
          items.forEach((item, index) => {
            section.fields.forEach((field) => {
              totalFields++;
              const value = (item as Record<string, unknown>)?.[field.name];
              if (value !== undefined && value !== '' && value !== null) {
                filledFields++;
              }
            });
          });
        }
      } else {
        section.fields.forEach((field) => {
          if (isFieldVisible(field, formValues)) {
            totalFields++;
            const value = formValues[field.name];
            if (value !== undefined && value !== '' && value !== null) {
              filledFields++;
            }
          }
        });
      }
    });

    return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  }, [formTemplate.sections, formValues]);

  // Check if a field should be visible based on conditional rules
  function isFieldVisible(field: FormField, values: Record<string, unknown>): boolean {
    if (!field.conditionalVisibility) return true;

    const { field: condField, operator, value: condValue } = field.conditionalVisibility;
    const fieldValue = values[condField];

    switch (operator) {
      case 'eq':
        return fieldValue === condValue;
      case 'neq':
        return fieldValue !== condValue;
      case 'gt':
        return typeof fieldValue === 'number' && fieldValue > (condValue as number);
      case 'lt':
        return typeof fieldValue === 'number' && fieldValue < (condValue as number);
      case 'gte':
        return typeof fieldValue === 'number' && fieldValue >= (condValue as number);
      case 'lte':
        return typeof fieldValue === 'number' && fieldValue <= (condValue as number);
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(condValue as string);
      case 'in':
        return Array.isArray(condValue) && condValue.includes(fieldValue);
      case 'empty':
        return fieldValue === undefined || fieldValue === '' || fieldValue === null;
      case 'notEmpty':
        return fieldValue !== undefined && fieldValue !== '' && fieldValue !== null;
      default:
        return true;
    }
  }

  // Validate current step
  const validateCurrentStep = useCallback((): boolean => {
    if (!currentSection) return true;

    const stepErrors: Record<string, string> = {};

    currentSection.fields.forEach((field) => {
      if (!isFieldVisible(field, formValues)) return;

      const value = formValues[field.name];

      // Required validation
      if (field.required && (value === undefined || value === '' || value === null)) {
        stepErrors[field.name] = 'This field is required';
        return;
      }

      // Skip further validation if empty and not required
      if (value === undefined || value === '' || value === null) return;

      // Type-specific validation
      switch (field.type) {
        case 'email':
          if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            stepErrors[field.name] = 'Invalid email address';
          }
          break;
        case 'phone':
          if (typeof value === 'string' && !/^[+]?[\d\s()-]{10,}$/.test(value)) {
            stepErrors[field.name] = 'Invalid phone number';
          }
          break;
        case 'number':
        case 'currency':
          if (field.min !== undefined && Number(value) < field.min) {
            stepErrors[field.name] = `Must be at least ${field.min}`;
          }
          if (field.max !== undefined && Number(value) > field.max) {
            stepErrors[field.name] = `Must be at most ${field.max}`;
          }
          break;
        case 'text':
        case 'textarea':
          if (field.minLength !== undefined && String(value).length < field.minLength) {
            stepErrors[field.name] = `Must be at least ${field.minLength} characters`;
          }
          if (field.maxLength !== undefined && String(value).length > field.maxLength) {
            stepErrors[field.name] = `Must be at most ${field.maxLength} characters`;
          }
          if (field.pattern && !new RegExp(field.pattern).test(String(value))) {
            stepErrors[field.name] = 'Invalid format';
          }
          break;
      }
    });

    setValidationErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }, [currentSection, formValues]);

  // Save draft function
  const saveDraft = useCallback(async () => {
    if (readOnly) return;

    const currentData = getValues();
    const dataString = JSON.stringify(currentData);

    // Skip if no changes
    if (dataString === lastSavedRef.current) return;

    setSaveStatus('saving');

    try {
      await onSaveDraft(currentData, currentSection?.id || 'review');
      lastSavedRef.current = dataString;
      setIsDirty(false);
      setSaveStatus('saved');

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Failed to save draft:', error);
      setSaveStatus('error');
    }
  }, [getValues, onSaveDraft, currentSection, readOnly]);

  // Auto-save every 30 seconds if dirty
  useEffect(() => {
    if (readOnly) return;

    if (isDirty) {
      autoSaveTimerRef.current = setTimeout(() => {
        saveDraft();
      }, 30000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [isDirty, saveDraft, readOnly]);

  // Mark form as dirty when values change
  useEffect(() => {
    const dataString = JSON.stringify(formValues);
    if (dataString !== lastSavedRef.current) {
      setIsDirty(true);
      setSaveStatus('unsaved');
    }
  }, [formValues]);

  // Initialize lastSavedRef with draft data
  useEffect(() => {
    if (draftData) {
      lastSavedRef.current = JSON.stringify(draftData);
    }
  }, [draftData]);

  // Navigate to next step
  const goToNextStep = useCallback(async () => {
    // Validate current step before proceeding
    if (!validateCurrentStep()) {
      toast.error('Please fix the errors before continuing');
      return;
    }

    // Save draft on navigation
    await saveDraft();

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      setValidationErrors({});
    }
  }, [currentStep, totalSteps, validateCurrentStep, saveDraft]);

  // Navigate to previous step
  const goToPreviousStep = useCallback(async () => {
    // Save draft on navigation
    await saveDraft();

    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setValidationErrors({});
    }
  }, [currentStep, saveDraft]);

  // Go to specific step
  const goToStep = useCallback(async (step: number) => {
    if (step < 0 || step >= totalSteps) return;

    // Validate all previous steps before jumping ahead
    if (step > currentStep) {
      for (let i = currentStep; i < step; i++) {
        const section = formTemplate.sections[i];
        if (section) {
          // Basic validation check
          const hasRequiredEmpty = section.fields.some((field) => {
            if (!field.required) return false;
            if (!isFieldVisible(field, formValues)) return false;
            const value = formValues[field.name];
            return value === undefined || value === '' || value === null;
          });
          if (hasRequiredEmpty) {
            toast.error(`Please complete step ${i + 1} before continuing`);
            return;
          }
        }
      }
    }

    await saveDraft();
    setCurrentStep(step);
    setValidationErrors({});
  }, [currentStep, totalSteps, formTemplate.sections, formValues, saveDraft]);

  // Handle form submission
  const handleFormSubmit = useCallback(async () => {
    if (!attestationChecked) {
      toast.error('Please confirm the attestation before submitting');
      return;
    }

    const data = getValues();

    // Full validation with JSON Schema if available
    if (formTemplate.schema) {
      const validate = validator.compile(formTemplate.schema);
      const valid = validate(data);
      if (!valid) {
        const ajvErrors = convertAjvErrors(validate.errors);
        setValidationErrors(ajvErrors);
        toast.error('Please fix the validation errors');
        return;
      }
    }

    // Field-level validation across all sections
    const allErrors: Record<string, string> = {};
    formTemplate.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (!isFieldVisible(field, formValues)) return;

        const value = data[field.name];
        if (field.required && (value === undefined || value === '' || value === null)) {
          allErrors[field.name] = 'This field is required';
        }
      });
    });

    if (Object.keys(allErrors).length > 0) {
      setValidationErrors(allErrors);
      toast.error('Please fix the validation errors');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(data);
      toast.success('Disclosure submitted successfully');
    } catch (error) {
      console.error('Submission failed:', error);
      toast.error('Failed to submit disclosure');
    } finally {
      setIsSubmitting(false);
    }
  }, [attestationChecked, getValues, formTemplate, validator, formValues, onSubmit]);

  // Render field based on type
  const renderField = useCallback((field: FormField, sectionId?: string, itemIndex?: number) => {
    const fieldName = sectionId && itemIndex !== undefined
      ? `${sectionId}.${itemIndex}.${field.name}`
      : field.name;

    const fieldError = validationErrors[fieldName] || validationErrors[field.name];
    const hasError = !!fieldError;

    if (!isFieldVisible(field, formValues)) {
      return null;
    }

    const commonProps = {
      id: fieldName,
      disabled: readOnly,
      'aria-invalid': hasError,
      'aria-describedby': hasError ? `${fieldName}-error` : undefined,
    };

    return (
      <div
        key={fieldName}
        className={cn(
          'space-y-2',
          field.colSpan === 2 && 'md:col-span-2',
          field.colSpan === 3 && 'md:col-span-3'
        )}
      >
        <Label htmlFor={fieldName} className="flex items-center gap-1">
          {field.label}
          {field.required && <span className="text-destructive">*</span>}
        </Label>

        <Controller
          name={fieldName}
          control={control}
          rules={{ required: field.required ? 'This field is required' : false }}
          render={({ field: controllerField }) => {
            switch (field.type) {
              case 'text':
              case 'email':
              case 'phone':
                return (
                  <Input
                    {...commonProps}
                    type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                    placeholder={field.placeholder}
                    value={String(controllerField.value ?? '')}
                    onChange={controllerField.onChange}
                    onBlur={controllerField.onBlur}
                    className={cn(hasError && 'border-destructive')}
                  />
                );

              case 'number':
              case 'currency':
                return (
                  <div className="relative">
                    {field.type === 'currency' && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                    )}
                    <Input
                      {...commonProps}
                      type="number"
                      step={field.type === 'currency' ? '0.01' : '1'}
                      min={field.min}
                      max={field.max}
                      placeholder={field.placeholder}
                      value={controllerField.value !== undefined && controllerField.value !== null ? String(controllerField.value) : ''}
                      onChange={(e) => controllerField.onChange(e.target.valueAsNumber || '')}
                      onBlur={controllerField.onBlur}
                      className={cn(
                        field.type === 'currency' && 'pl-7',
                        hasError && 'border-destructive'
                      )}
                    />
                  </div>
                );

              case 'textarea':
                return (
                  <Textarea
                    {...commonProps}
                    placeholder={field.placeholder}
                    value={String(controllerField.value ?? '')}
                    onChange={controllerField.onChange}
                    onBlur={controllerField.onBlur}
                    className={cn(hasError && 'border-destructive')}
                    rows={4}
                  />
                );

              case 'date':
                return (
                  <Input
                    {...commonProps}
                    type="date"
                    value={String(controllerField.value ?? '')}
                    onChange={controllerField.onChange}
                    onBlur={controllerField.onBlur}
                    className={cn(hasError && 'border-destructive')}
                  />
                );

              case 'select':
                return (
                  <Select
                    value={String(controllerField.value ?? '')}
                    onValueChange={controllerField.onChange}
                    disabled={readOnly}
                  >
                    <SelectTrigger className={cn(hasError && 'border-destructive')}>
                      <SelectValue placeholder={field.placeholder || 'Select...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );

              case 'radio':
                return (
                  <div className="space-y-2">
                    {field.options?.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={fieldName}
                          value={option.value}
                          checked={controllerField.value === option.value}
                          onChange={() => controllerField.onChange(option.value)}
                          disabled={readOnly}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                );

              case 'checkbox':
                return (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={fieldName}
                      checked={!!controllerField.value}
                      onCheckedChange={controllerField.onChange}
                      disabled={readOnly}
                    />
                    <Label htmlFor={fieldName} className="text-sm font-normal">
                      {field.placeholder || 'Yes'}
                    </Label>
                  </div>
                );

              case 'relationship-mapper':
                return (
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Person/Company Name</Label>
                      <Input
                        placeholder="Enter name..."
                        value={(controllerField.value as { name?: string })?.name ?? ''}
                        onChange={(e) =>
                          controllerField.onChange({
                            ...(controllerField.value as object || {}),
                            name: e.target.value,
                          })
                        }
                        disabled={readOnly}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Relationship Type</Label>
                      <Select
                        value={(controllerField.value as { type?: string })?.type ?? ''}
                        onValueChange={(value) =>
                          controllerField.onChange({
                            ...(controllerField.value as object || {}),
                            type: value,
                          })
                        }
                        disabled={readOnly}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="family">Family Member</SelectItem>
                          <SelectItem value="friend">Friend</SelectItem>
                          <SelectItem value="former_colleague">Former Colleague</SelectItem>
                          <SelectItem value="investor">Investor</SelectItem>
                          <SelectItem value="board_member">Board Member</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="government">Government Official</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Description</Label>
                      <Textarea
                        placeholder="Describe the nature of the relationship..."
                        value={(controllerField.value as { description?: string })?.description ?? ''}
                        onChange={(e) =>
                          controllerField.onChange({
                            ...(controllerField.value as object || {}),
                            description: e.target.value,
                          })
                        }
                        disabled={readOnly}
                        rows={2}
                      />
                    </div>
                  </div>
                );

              default:
                return (
                  <Input
                    {...commonProps}
                    placeholder={field.placeholder}
                    value={String(controllerField.value ?? '')}
                    onChange={controllerField.onChange}
                    onBlur={controllerField.onBlur}
                    className={cn(hasError && 'border-destructive')}
                  />
                );
            }
          }}
        />

        {field.helpText && (
          <p className="text-xs text-muted-foreground">{field.helpText}</p>
        )}

        {hasError && (
          <p id={`${fieldName}-error`} className="text-sm text-destructive">
            {fieldError}
          </p>
        )}
      </div>
    );
  }, [control, formValues, readOnly, validationErrors]);

  // Render repeater section
  const renderRepeaterSection = useCallback((section: FormSection) => {
    const items = (formValues[section.id] as unknown[] | undefined) || [];

    const addItem = () => {
      const newItems = [...items, {}];
      setValue(section.id, newItems);
    };

    const removeItem = (index: number) => {
      const newItems = items.filter((_, i) => i !== index);
      setValue(section.id, newItems.length > 0 ? newItems : [{}]);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {items.length} {section.itemLabel || 'item'}(s)
          </span>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              disabled={section.maxItems ? items.length >= section.maxItems : false}
            >
              Add {section.itemLabel || 'Item'}
            </Button>
          )}
        </div>

        {items.map((item, index) => (
          <Card key={index} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {section.itemLabel || 'Item'} {index + 1}
                </CardTitle>
                {!readOnly && items.length > (section.minItems || 0) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {section.fields.map((field) => renderField(field, section.id, index))}
              </div>
            </CardContent>
          </Card>
        ))}

        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            <p>No items added yet.</p>
            {!readOnly && (
              <Button
                type="button"
                variant="link"
                onClick={addItem}
                className="mt-2"
              >
                Add your first {section.itemLabel?.toLowerCase() || 'item'}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }, [formValues, setValue, renderField, readOnly]);

  // Render review step
  const renderReviewStep = useCallback(() => {
    return (
      <div className="space-y-6">
        <div className="text-center py-4">
          <h3 className="text-lg font-semibold">Review Your Disclosure</h3>
          <p className="text-muted-foreground">
            Please review all information before submitting.
          </p>
        </div>

        {formTemplate.sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {section.isRepeater ? (
                <div className="space-y-4">
                  {((formValues[section.id] as unknown[]) || []).map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="font-medium text-sm">
                        {section.itemLabel || 'Item'} {index + 1}
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {section.fields.map((field) => {
                          const value = (item as Record<string, unknown>)?.[field.name];
                          return (
                            <div key={field.name} className="space-y-1">
                              <span className="text-xs text-muted-foreground">
                                {field.label}
                              </span>
                              <p className="text-sm">
                                {formatValueForReview(value, field)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {section.fields
                    .filter((field) => isFieldVisible(field, formValues))
                    .map((field) => {
                      const value = formValues[field.name];
                      return (
                        <div key={field.name} className="space-y-1">
                          <span className="text-xs text-muted-foreground">
                            {field.label}
                          </span>
                          <p className="text-sm font-medium">
                            {formatValueForReview(value, field)}
                          </p>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Attestation */}
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Checkbox
                id="attestation"
                checked={attestationChecked}
                onCheckedChange={(checked) => setAttestationChecked(!!checked)}
                disabled={readOnly}
              />
              <Label htmlFor="attestation" className="text-sm leading-relaxed cursor-pointer">
                I certify that all information provided in this disclosure is complete
                and accurate to the best of my knowledge. I understand that providing
                false or misleading information may result in disciplinary action.
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }, [formTemplate.sections, formValues, attestationChecked, readOnly]);

  // Format value for review display
  function formatValueForReview(value: unknown, field: FormField): string {
    if (value === undefined || value === null || value === '') {
      return '-';
    }

    if (field.type === 'checkbox') {
      return value ? 'Yes' : 'No';
    }

    if (field.type === 'select' || field.type === 'radio') {
      const option = field.options?.find((o) => o.value === value);
      return option?.label || String(value);
    }

    if (field.type === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(Number(value));
    }

    if (field.type === 'date') {
      return new Date(String(value)).toLocaleDateString();
    }

    if (field.type === 'relationship-mapper') {
      const rel = value as { name?: string; type?: string; description?: string };
      return `${rel.name || 'Unknown'} (${rel.type || 'Unknown'})`;
    }

    return String(value);
  }

  // Render step content
  const renderStepContent = useCallback(() => {
    if (isReviewStep) {
      return renderReviewStep();
    }

    if (!currentSection) return null;

    return (
      <div className="space-y-4">
        {currentSection.description && (
          <p className="text-muted-foreground">{currentSection.description}</p>
        )}

        {currentSection.isRepeater ? (
          renderRepeaterSection(currentSection)
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {currentSection.fields.map((field) => renderField(field))}
          </div>
        )}
      </div>
    );
  }, [isReviewStep, currentSection, renderReviewStep, renderRepeaterSection, renderField]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              Step {currentStep + 1} of {totalSteps}
            </span>
            <Badge variant="outline">{completionPercentage}% complete</Badge>
          </div>
          <DraftIndicator status={saveStatus} />
        </div>
        <Progress value={(currentStep + 1) / totalSteps * 100} className="h-2" />
      </div>

      {/* Step navigation dots */}
      <div className="flex items-center justify-center gap-2">
        {formTemplate.sections.map((section, index) => (
          <button
            key={section.id}
            type="button"
            onClick={() => goToStep(index)}
            className={cn(
              'w-3 h-3 rounded-full transition-colors',
              index === currentStep
                ? 'bg-primary'
                : index < currentStep
                ? 'bg-primary/50'
                : 'bg-muted'
            )}
            aria-label={`Go to ${section.title}`}
            title={section.title}
          />
        ))}
        <button
          type="button"
          onClick={() => goToStep(formTemplate.sections.length)}
          className={cn(
            'w-3 h-3 rounded-full transition-colors',
            isReviewStep
              ? 'bg-primary'
              : currentStep >= formTemplate.sections.length
              ? 'bg-primary/50'
              : 'bg-muted'
          )}
          aria-label="Go to Review"
          title="Review"
        />
      </div>

      {/* Step title */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isReviewStep ? 'Review & Submit' : currentSection?.title}
          </CardTitle>
          {!isReviewStep && currentSection?.description && (
            <CardDescription>{currentSection.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
        <CardFooter className="flex justify-between gap-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={goToPreviousStep}
            disabled={currentStep === 0 || isSubmitting}
          >
            Previous
          </Button>

          {isReviewStep ? (
            <Button
              type="button"
              onClick={handleFormSubmit}
              disabled={isSubmitting || !attestationChecked || readOnly}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Disclosure'}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={goToNextStep}
              disabled={isSubmitting}
            >
              {currentStep === totalSteps - 2 ? 'Review' : 'Next'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default DisclosureForm;
