'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type {
  OrganizationSettings,
  UpdateNotificationSettingsDto,
} from '@/types/organization';
import { NOTIFICATION_CATEGORIES } from '@/types/organization';

/**
 * Props for OrganizationNotificationSettings component.
 */
interface OrganizationNotificationSettingsProps {
  /** Current organization settings */
  settings: OrganizationSettings;
  /** Callback to save changes */
  onSave: (data: UpdateNotificationSettingsDto) => Promise<void>;
  /** Whether save operation is in progress */
  isSaving: boolean;
}

interface NotificationFormData {
  digestEnabled: boolean;
  defaultDigestTime: string;
  enforcedNotificationCategories: string[];
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

/**
 * Organization notification settings form.
 *
 * Allows configuration of:
 * - Daily digest settings (enabled/disabled, default time)
 * - Enforced notification categories (users cannot disable)
 * - Quiet hours (organization-wide notification suppression)
 */
export function OrganizationNotificationSettings({
  settings,
  onSave,
  isSaving,
}: OrganizationNotificationSettingsProps) {
  const [hasChanges, setHasChanges] = useState(false);

  const { handleSubmit, control, watch, setValue } =
    useForm<NotificationFormData>({
      defaultValues: {
        digestEnabled: settings.digestEnabled,
        defaultDigestTime: settings.defaultDigestTime || '08:00',
        enforcedNotificationCategories:
          settings.enforcedNotificationCategories || [],
        quietHoursEnabled: settings.quietHoursEnabled,
        quietHoursStart: settings.quietHoursStart || '22:00',
        quietHoursEnd: settings.quietHoursEnd || '07:00',
      },
    });

  const digestEnabled = watch('digestEnabled');
  const quietHoursEnabled = watch('quietHoursEnabled');
  const enforcedCategories = watch('enforcedNotificationCategories');

  const handleFieldChange = () => {
    setHasChanges(true);
  };

  const toggleCategory = (categoryValue: string) => {
    const current = enforcedCategories || [];
    const updated = current.includes(categoryValue)
      ? current.filter((c) => c !== categoryValue)
      : [...current, categoryValue];
    setValue('enforcedNotificationCategories', updated);
    handleFieldChange();
  };

  const onSubmit = async (data: NotificationFormData) => {
    await onSave({
      digestEnabled: data.digestEnabled,
      defaultDigestTime: data.digestEnabled ? data.defaultDigestTime : undefined,
      enforcedNotificationCategories: data.enforcedNotificationCategories,
      quietHoursEnabled: data.quietHoursEnabled,
      quietHoursStart: data.quietHoursEnabled
        ? data.quietHoursStart
        : undefined,
      quietHoursEnd: data.quietHoursEnabled ? data.quietHoursEnd : undefined,
    });
    setHasChanges(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Notification Settings</CardTitle>
        <CardDescription>
          Configure organization-wide notification defaults and policies
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Daily Digest Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Daily Digest</h4>
            <p className="text-sm text-muted-foreground">
              Consolidate notifications into a daily summary email
            </p>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="digestEnabled">Enable daily digest emails</Label>
                <p className="text-sm text-muted-foreground">
                  Users will receive a summary of their notifications once per day
                </p>
              </div>
              <Controller
                control={control}
                name="digestEnabled"
                render={({ field }) => (
                  <Switch
                    id="digestEnabled"
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      handleFieldChange();
                    }}
                  />
                )}
              />
            </div>

            {digestEnabled && (
              <div className="ml-0 md:ml-4 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="defaultDigestTime">Default digest time</Label>
                  <Controller
                    control={control}
                    name="defaultDigestTime"
                    render={({ field }) => (
                      <Input
                        id="defaultDigestTime"
                        type="time"
                        value={field.value}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          handleFieldChange();
                        }}
                        className="w-32"
                      />
                    )}
                  />
                  <p className="text-sm text-muted-foreground">
                    Users receive their digest at this time in their local timezone
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Enforced Notification Categories */}
          <div className="space-y-4">
            <h4 className="font-medium">Enforced Notifications</h4>
            <p className="text-sm text-muted-foreground">
              Select notification categories that users cannot disable. These
              notifications are required for compliance and operational purposes.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {NOTIFICATION_CATEGORIES.map((category) => (
                <div
                  key={category.value}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <Checkbox
                    id={`category-${category.value}`}
                    checked={enforcedCategories?.includes(category.value)}
                    onCheckedChange={() => toggleCategory(category.value)}
                  />
                  <Label
                    htmlFor={`category-${category.value}`}
                    className="flex-1 cursor-pointer font-normal"
                  >
                    {category.label}
                  </Label>
                </div>
              ))}
            </div>

            {enforcedCategories && enforcedCategories.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {enforcedCategories.length} category
                {enforcedCategories.length === 1 ? '' : 'ies'} enforced
              </p>
            )}
          </div>

          <Separator />

          {/* Quiet Hours */}
          <div className="space-y-4">
            <h4 className="font-medium">Quiet Hours</h4>
            <p className="text-sm text-muted-foreground">
              Suppress non-urgent notifications during specified hours
            </p>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="quietHoursEnabled">
                  Enable organization-wide quiet hours
                </Label>
                <p className="text-sm text-muted-foreground">
                  Non-critical notifications will be held until quiet hours end
                </p>
              </div>
              <Controller
                control={control}
                name="quietHoursEnabled"
                render={({ field }) => (
                  <Switch
                    id="quietHoursEnabled"
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      handleFieldChange();
                    }}
                  />
                )}
              />
            </div>

            {quietHoursEnabled && (
              <div className="ml-0 md:ml-4 p-4 border rounded-lg bg-muted/30">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quietHoursStart">Start time</Label>
                    <Controller
                      control={control}
                      name="quietHoursStart"
                      render={({ field }) => (
                        <Input
                          id="quietHoursStart"
                          type="time"
                          value={field.value}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            handleFieldChange();
                          }}
                        />
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quietHoursEnd">End time</Label>
                    <Controller
                      control={control}
                      name="quietHoursEnd"
                      render={({ field }) => (
                        <Input
                          id="quietHoursEnd"
                          type="time"
                          value={field.value}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            handleFieldChange();
                          }}
                        />
                      )}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Times are in the organization&apos;s default timezone
                </p>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h5 className="font-medium text-sm mb-2">How notification settings work</h5>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Enforced categories are always delivered to users</li>
              <li>Users can customize other notification preferences</li>
              <li>Quiet hours affect in-app and email notifications</li>
              <li>Critical security alerts bypass quiet hours</li>
            </ul>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={isSaving || !hasChanges}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
