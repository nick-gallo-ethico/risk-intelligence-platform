'use client';

import { UseFormWatch, UseFormSetValue, UseFormRegister, FieldErrors } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CaseCreationFormData, reporterTypeOptions } from '@/lib/validations/case-schema';
import { cn } from '@/lib/utils';

interface ReporterSectionProps {
  errors: FieldErrors<CaseCreationFormData>;
  register: UseFormRegister<CaseCreationFormData>;
  setValue: UseFormSetValue<CaseCreationFormData>;
  watch: UseFormWatch<CaseCreationFormData>;
}

/**
 * Reporter Information section of the case creation form.
 * Contains: Reporter Type, Name, Email, Phone (all optional)
 */
export function ReporterSection({
  errors,
  register,
  setValue,
  watch,
}: ReporterSectionProps) {
  const reporterType = watch('reporterType');
  const isAnonymous = reporterType === 'ANONYMOUS';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Reporter Information</CardTitle>
        <CardDescription>
          Optional contact details for the person reporting this case.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reporter Type */}
        <div className="space-y-2">
          <Label htmlFor="reporterType">Reporter Type</Label>
          <Select
            value={reporterType ?? ''}
            onValueChange={(value) =>
              setValue('reporterType', value as CaseCreationFormData['reporterType'])
            }
          >
            <SelectTrigger id="reporterType">
              <SelectValue placeholder="Select reporter type..." />
            </SelectTrigger>
            <SelectContent>
              {reporterTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.reporterType && (
            <p className="text-sm text-destructive">
              {errors.reporterType.message}
            </p>
          )}
        </div>

        {/* Contact fields - disabled if anonymous */}
        <div
          className={cn(
            'grid gap-4 md:grid-cols-3 transition-opacity',
            isAnonymous && 'opacity-50 pointer-events-none'
          )}
        >
          {/* Reporter Name */}
          <div className="space-y-2">
            <Label htmlFor="reporterName">Name</Label>
            <Input
              id="reporterName"
              placeholder="Reporter's name..."
              disabled={isAnonymous}
              className={cn(errors.reporterName && 'border-destructive')}
              {...register('reporterName')}
            />
            {errors.reporterName && (
              <p className="text-sm text-destructive">
                {errors.reporterName.message}
              </p>
            )}
          </div>

          {/* Reporter Email */}
          <div className="space-y-2">
            <Label htmlFor="reporterEmail">Email</Label>
            <Input
              id="reporterEmail"
              type="email"
              placeholder="reporter@example.com"
              disabled={isAnonymous}
              className={cn(errors.reporterEmail && 'border-destructive')}
              {...register('reporterEmail')}
            />
            {errors.reporterEmail && (
              <p className="text-sm text-destructive">
                {errors.reporterEmail.message}
              </p>
            )}
          </div>

          {/* Reporter Phone */}
          <div className="space-y-2">
            <Label htmlFor="reporterPhone">Phone</Label>
            <Input
              id="reporterPhone"
              type="tel"
              placeholder="+1-555-123-4567"
              disabled={isAnonymous}
              className={cn(errors.reporterPhone && 'border-destructive')}
              {...register('reporterPhone')}
            />
            {errors.reporterPhone && (
              <p className="text-sm text-destructive">
                {errors.reporterPhone.message}
              </p>
            )}
          </div>
        </div>

        {isAnonymous && (
          <p className="text-sm text-muted-foreground">
            Contact information is not collected for anonymous reporters.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
