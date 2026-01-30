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
import { CaseCreationFormData, countryOptions } from '@/lib/validations/case-schema';
import { cn } from '@/lib/utils';

interface LocationSectionProps {
  errors: FieldErrors<CaseCreationFormData>;
  register: UseFormRegister<CaseCreationFormData>;
  setValue: UseFormSetValue<CaseCreationFormData>;
  watch: UseFormWatch<CaseCreationFormData>;
}

/**
 * Location section of the case creation form.
 * Contains: Country (select), Region/State (input), City/Location (input)
 */
export function LocationSection({
  errors,
  register,
  setValue,
  watch,
}: LocationSectionProps) {
  const locationCountry = watch('locationCountry');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Incident Location</CardTitle>
        <CardDescription>
          Where did the incident or concern take place? (Optional)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="locationCountry">Country</Label>
            <Select
              value={locationCountry ?? ''}
              onValueChange={(value) => setValue('locationCountry', value)}
            >
              <SelectTrigger id="locationCountry">
                <SelectValue placeholder="Select country..." />
              </SelectTrigger>
              <SelectContent>
                {countryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.locationCountry && (
              <p className="text-sm text-destructive">
                {errors.locationCountry.message}
              </p>
            )}
          </div>

          {/* Region/State */}
          <div className="space-y-2">
            <Label htmlFor="locationState">Region / State</Label>
            <Input
              id="locationState"
              placeholder="e.g., California, Ontario..."
              className={cn(errors.locationState && 'border-destructive')}
              {...register('locationState')}
            />
            {errors.locationState && (
              <p className="text-sm text-destructive">
                {errors.locationState.message}
              </p>
            )}
          </div>

          {/* City/Location */}
          <div className="space-y-2">
            <Label htmlFor="locationCity">City / Location</Label>
            <Input
              id="locationCity"
              placeholder="e.g., San Francisco, Head Office..."
              className={cn(errors.locationCity && 'border-destructive')}
              {...register('locationCity')}
            />
            {errors.locationCity && (
              <p className="text-sm text-destructive">
                {errors.locationCity.message}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
