'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  OrganizationSettings,
  UpdateOrganizationDto,
} from '@/types/organization';
import { TIMEZONES, DATE_FORMATS, LANGUAGES } from '@/types/organization';

/**
 * Props for OrganizationGeneralSettings component.
 */
interface OrganizationGeneralSettingsProps {
  /** Current organization settings */
  settings: OrganizationSettings;
  /** Callback to save changes */
  onSave: (data: UpdateOrganizationDto) => Promise<void>;
  /** Whether save operation is in progress */
  isSaving: boolean;
}

/**
 * General organization settings form.
 *
 * Allows configuration of:
 * - Organization name
 * - Timezone
 * - Date format
 * - Default language
 */
export function OrganizationGeneralSettings({
  settings,
  onSave,
  isSaving,
}: OrganizationGeneralSettingsProps) {
  const [hasChanges, setHasChanges] = useState(false);

  const { register, handleSubmit, control, formState } =
    useForm<UpdateOrganizationDto>({
      defaultValues: {
        name: settings.name,
        timezone: settings.timezone,
        dateFormat: settings.dateFormat,
        defaultLanguage: settings.defaultLanguage,
      },
    });

  const onSubmit = async (data: UpdateOrganizationDto) => {
    await onSave(data);
    setHasChanges(false);
  };

  const handleFieldChange = () => {
    setHasChanges(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">General Settings</CardTitle>
        <CardDescription>
          Basic organization information and regional preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              {...register('name', { required: 'Organization name is required' })}
              onChange={(e) => {
                register('name').onChange(e);
                handleFieldChange();
              }}
              placeholder="Enter organization name"
            />
            {formState.errors.name && (
              <p className="text-sm text-destructive">
                {formState.errors.name.message}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              This name appears throughout the platform and in communications
            </p>
          </div>

          {/* Timezone and Date Format - Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Controller
                control={control}
                name="timezone"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleFieldChange();
                    }}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-sm text-muted-foreground">
                Default timezone for the organization
              </p>
            </div>

            {/* Date Format */}
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Controller
                control={control}
                name="dateFormat"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleFieldChange();
                    }}
                  >
                    <SelectTrigger id="dateFormat">
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FORMATS.map((df) => (
                        <SelectItem key={df.value} value={df.value}>
                          {df.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-sm text-muted-foreground">
                How dates are displayed throughout the platform
              </p>
            </div>
          </div>

          {/* Default Language */}
          <div className="space-y-2">
            <Label htmlFor="defaultLanguage">Default Language</Label>
            <Controller
              control={control}
              name="defaultLanguage"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleFieldChange();
                  }}
                >
                  <SelectTrigger id="defaultLanguage" className="w-full md:w-1/2">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-sm text-muted-foreground">
              Default language for new users and communications
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              type="submit"
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
