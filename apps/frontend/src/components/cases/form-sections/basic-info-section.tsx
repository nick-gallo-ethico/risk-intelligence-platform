'use client';

import { UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CaseCreationFormData,
  sourceChannelOptions,
  caseTypeOptions,
  severityOptions,
} from '@/lib/validations/case-schema';
import { cn } from '@/lib/utils';

interface BasicInfoSectionProps {
  errors: FieldErrors<CaseCreationFormData>;
  setValue: UseFormSetValue<CaseCreationFormData>;
  watch: UseFormWatch<CaseCreationFormData>;
}

/**
 * Basic Information section of the case creation form.
 * Contains: Source Channel, Case Type, Severity
 */
export function BasicInfoSection({
  errors,
  setValue,
  watch,
}: BasicInfoSectionProps) {
  const sourceChannel = watch('sourceChannel');
  const caseType = watch('caseType');
  const severity = watch('severity');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {/* Source Channel */}
          <div className="space-y-2">
            <Label htmlFor="sourceChannel">
              Source Channel <span className="text-destructive">*</span>
            </Label>
            <Select
              value={sourceChannel}
              onValueChange={(value) =>
                setValue('sourceChannel', value as CaseCreationFormData['sourceChannel'])
              }
            >
              <SelectTrigger
                id="sourceChannel"
                className={cn(errors.sourceChannel && 'border-destructive')}
              >
                <SelectValue placeholder="Select source..." />
              </SelectTrigger>
              <SelectContent>
                {sourceChannelOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.sourceChannel && (
              <p className="text-sm text-destructive">
                {errors.sourceChannel.message}
              </p>
            )}
          </div>

          {/* Case Type */}
          <div className="space-y-2">
            <Label htmlFor="caseType">Case Type</Label>
            <Select
              value={caseType || undefined}
              onValueChange={(value) =>
                setValue('caseType', value as CaseCreationFormData['caseType'])
              }
            >
              <SelectTrigger id="caseType">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {caseTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.caseType && (
              <p className="text-sm text-destructive">
                {errors.caseType.message}
              </p>
            )}
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <Label htmlFor="severity">Severity</Label>
            <Select
              value={severity || undefined}
              onValueChange={(value) =>
                setValue('severity', value as CaseCreationFormData['severity'])
              }
            >
              <SelectTrigger id="severity">
                <SelectValue placeholder="Select severity..." />
              </SelectTrigger>
              <SelectContent>
                {severityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-block w-2 h-2 rounded-full',
                          option.value === 'LOW' && 'bg-green-500',
                          option.value === 'MEDIUM' && 'bg-yellow-500',
                          option.value === 'HIGH' && 'bg-orange-500',
                          option.value === 'CRITICAL' && 'bg-red-500'
                        )}
                      />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.severity && (
              <p className="text-sm text-destructive">
                {errors.severity.message}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
