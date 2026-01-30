'use client';

import { UseFormWatch, UseFormSetValue, UseFormRegister, FieldErrors } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/rich-text/rich-text-editor';
import { CaseCreationFormData } from '@/lib/validations/case-schema';
import { cn } from '@/lib/utils';

interface DetailsSectionProps {
  errors: FieldErrors<CaseCreationFormData>;
  register: UseFormRegister<CaseCreationFormData>;
  setValue: UseFormSetValue<CaseCreationFormData>;
  watch: UseFormWatch<CaseCreationFormData>;
}

/**
 * Details section of the case creation form.
 * Contains: Summary (textarea), Details (rich text editor)
 */
export function DetailsSection({
  errors,
  register,
  setValue,
  watch,
}: DetailsSectionProps) {
  const summary = watch('summary') ?? '';
  const details = watch('details') ?? '';
  const summaryLength = summary.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Case Details</CardTitle>
        <CardDescription>
          Provide a summary and detailed description of the incident or concern.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="summary">Summary</Label>
            <span
              className={cn(
                'text-xs',
                summaryLength > 450 ? 'text-orange-500' : 'text-muted-foreground',
                summaryLength > 500 && 'text-destructive'
              )}
            >
              {summaryLength}/500
            </span>
          </div>
          <Textarea
            id="summary"
            placeholder="Brief summary of the case (optional)..."
            className={cn(
              'resize-none',
              errors.summary && 'border-destructive'
            )}
            rows={3}
            maxLength={500}
            {...register('summary')}
          />
          {errors.summary && (
            <p className="text-sm text-destructive">{errors.summary.message}</p>
          )}
        </div>

        {/* Details (Rich Text) */}
        <div className="space-y-2">
          <Label htmlFor="details">
            Details <span className="text-destructive">*</span>
          </Label>
          <RichTextEditor
            content={details}
            onChange={(html) => setValue('details', html)}
            placeholder="Describe the incident or concern in detail..."
            maxLength={50000}
            warnAt={45000}
            minHeight="200px"
            className={cn(errors.details && 'border-destructive')}
          />
          {errors.details && (
            <p className="text-sm text-destructive">{errors.details.message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
