'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { ExternalLink, ShieldCheck, Key, Clock, Lock } from 'lucide-react';
import Link from 'next/link';

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
  UpdateSecuritySettingsDto,
  PasswordPolicy,
} from '@/types/organization';
import {
  MFA_ELIGIBLE_ROLES,
  ROLE_DISPLAY_NAMES,
} from '@/types/organization';
import type { UserRole } from '@/types/auth';

/**
 * Props for OrganizationSecuritySettings component.
 */
interface OrganizationSecuritySettingsProps {
  /** Current organization settings */
  settings: OrganizationSettings;
  /** Callback to save changes */
  onSave: (data: UpdateSecuritySettingsDto) => Promise<void>;
  /** Whether save operation is in progress */
  isSaving: boolean;
}

interface SecurityFormData {
  mfaRequired: boolean;
  mfaRequiredRoles: UserRole[];
  sessionTimeoutMinutes: number;
  passwordPolicy: PasswordPolicy;
}

/**
 * Organization security settings form.
 *
 * Allows configuration of:
 * - MFA requirements (all users or specific roles)
 * - Session timeout
 * - Password policy (length, complexity requirements)
 * - SSO configuration link
 */
export function OrganizationSecuritySettings({
  settings,
  onSave,
  isSaving,
}: OrganizationSecuritySettingsProps) {
  const [hasChanges, setHasChanges] = useState(false);

  const { register, handleSubmit, control, watch, setValue } =
    useForm<SecurityFormData>({
      defaultValues: {
        mfaRequired: settings.mfaRequired,
        mfaRequiredRoles: settings.mfaRequiredRoles || [],
        sessionTimeoutMinutes: settings.sessionTimeoutMinutes || 60,
        passwordPolicy: settings.passwordPolicy || {
          minLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
        },
      },
    });

  const mfaRequired = watch('mfaRequired');
  const mfaRequiredRoles = watch('mfaRequiredRoles');
  const passwordPolicy = watch('passwordPolicy');

  const handleFieldChange = () => {
    setHasChanges(true);
  };

  const toggleMfaRole = (role: UserRole) => {
    const current = mfaRequiredRoles || [];
    const updated = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role];
    setValue('mfaRequiredRoles', updated);
    handleFieldChange();
  };

  const onSubmit = async (data: SecurityFormData) => {
    await onSave({
      mfaRequired: data.mfaRequired,
      mfaRequiredRoles: data.mfaRequired ? [] : data.mfaRequiredRoles,
      sessionTimeoutMinutes: data.sessionTimeoutMinutes,
      passwordPolicy: data.passwordPolicy,
    });
    setHasChanges(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Security Settings</CardTitle>
        <CardDescription>
          Configure authentication and security policies for your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* MFA Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              <h4 className="font-medium">Multi-Factor Authentication</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Require users to verify their identity with a second factor
            </p>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="mfaRequired" className="font-medium">
                  Require MFA for all users
                </Label>
                <p className="text-sm text-muted-foreground">
                  All users must set up MFA on their next login
                </p>
              </div>
              <Controller
                control={control}
                name="mfaRequired"
                render={({ field }) => (
                  <Switch
                    id="mfaRequired"
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      handleFieldChange();
                    }}
                  />
                )}
              />
            </div>

            {!mfaRequired && (
              <div className="space-y-3">
                <Label>Require MFA for specific roles</Label>
                <p className="text-sm text-muted-foreground">
                  Select roles that must use MFA. Other users can optionally enable it.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {MFA_ELIGIBLE_ROLES.map((role) => (
                    <div
                      key={role}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <Checkbox
                        id={`mfa-role-${role}`}
                        checked={mfaRequiredRoles?.includes(role)}
                        onCheckedChange={() => toggleMfaRole(role)}
                      />
                      <Label
                        htmlFor={`mfa-role-${role}`}
                        className="flex-1 cursor-pointer font-normal text-sm"
                      >
                        {ROLE_DISPLAY_NAMES[role]}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Session Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h4 className="font-medium">Session Settings</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure how long users can remain logged in
            </p>

            <div className="space-y-2">
              <Label htmlFor="sessionTimeoutMinutes">
                Session timeout (minutes)
              </Label>
              <Controller
                control={control}
                name="sessionTimeoutMinutes"
                render={({ field }) => (
                  <Input
                    id="sessionTimeoutMinutes"
                    type="number"
                    value={field.value}
                    onChange={(e) => {
                      field.onChange(parseInt(e.target.value) || 60);
                      handleFieldChange();
                    }}
                    min={5}
                    max={1440}
                    className="w-32"
                  />
                )}
              />
              <p className="text-sm text-muted-foreground">
                Users will be logged out after this period of inactivity (5-1440
                minutes)
              </p>
            </div>
          </div>

          <Separator />

          {/* Password Policy */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-muted-foreground" />
              <h4 className="font-medium">Password Policy</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Set minimum requirements for user passwords
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minLength">Minimum length</Label>
                <Controller
                  control={control}
                  name="passwordPolicy.minLength"
                  render={({ field }) => (
                    <Input
                      id="minLength"
                      type="number"
                      value={field.value}
                      onChange={(e) => {
                        field.onChange(parseInt(e.target.value) || 8);
                        handleFieldChange();
                      }}
                      min={8}
                      max={32}
                      className="w-24"
                    />
                  )}
                />
                <p className="text-sm text-muted-foreground">8-32 characters</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Controller
                  control={control}
                  name="passwordPolicy.requireUppercase"
                  render={({ field }) => (
                    <Checkbox
                      id="requireUppercase"
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        handleFieldChange();
                      }}
                    />
                  )}
                />
                <Label
                  htmlFor="requireUppercase"
                  className="flex-1 cursor-pointer font-normal"
                >
                  Require uppercase letter (A-Z)
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Controller
                  control={control}
                  name="passwordPolicy.requireLowercase"
                  render={({ field }) => (
                    <Checkbox
                      id="requireLowercase"
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        handleFieldChange();
                      }}
                    />
                  )}
                />
                <Label
                  htmlFor="requireLowercase"
                  className="flex-1 cursor-pointer font-normal"
                >
                  Require lowercase letter (a-z)
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Controller
                  control={control}
                  name="passwordPolicy.requireNumbers"
                  render={({ field }) => (
                    <Checkbox
                      id="requireNumbers"
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        handleFieldChange();
                      }}
                    />
                  )}
                />
                <Label
                  htmlFor="requireNumbers"
                  className="flex-1 cursor-pointer font-normal"
                >
                  Require number (0-9)
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Controller
                  control={control}
                  name="passwordPolicy.requireSpecialChars"
                  render={({ field }) => (
                    <Checkbox
                      id="requireSpecialChars"
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        handleFieldChange();
                      }}
                    />
                  )}
                />
                <Label
                  htmlFor="requireSpecialChars"
                  className="flex-1 cursor-pointer font-normal"
                >
                  Require special character (!@#$%...)
                </Label>
              </div>
            </div>

            {/* Password strength preview */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <h5 className="text-sm font-medium mb-2">Password requirements summary</h5>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Minimum {passwordPolicy.minLength} characters</li>
                {passwordPolicy.requireUppercase && (
                  <li>At least one uppercase letter</li>
                )}
                {passwordPolicy.requireLowercase && (
                  <li>At least one lowercase letter</li>
                )}
                {passwordPolicy.requireNumbers && <li>At least one number</li>}
                {passwordPolicy.requireSpecialChars && (
                  <li>At least one special character</li>
                )}
              </ul>
            </div>
          </div>

          <Separator />

          {/* SSO Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <h4 className="font-medium">Single Sign-On (SSO)</h4>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">
                  {settings.ssoEnabled
                    ? `Connected via ${settings.ssoProvider}`
                    : 'Not configured'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {settings.ssoEnabled
                    ? 'Users can sign in with your identity provider'
                    : 'Connect your identity provider for enterprise SSO'}
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/settings/organization/sso">
                  Configure SSO
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Security recommendations */}
          <div className="bg-primary/5 border-l-4 border-primary rounded-lg p-4">
            <h5 className="font-medium text-sm mb-2">Security Recommendations</h5>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              {!mfaRequired && mfaRequiredRoles.length === 0 && (
                <li>Consider requiring MFA for admin roles at minimum</li>
              )}
              {settings.sessionTimeoutMinutes > 120 && (
                <li>
                  Consider a shorter session timeout for sensitive environments
                </li>
              )}
              {passwordPolicy.minLength < 12 && (
                <li>Consider increasing minimum password length to 12+ characters</li>
              )}
              {!settings.ssoEnabled && (
                <li>Configure SSO for centralized identity management</li>
              )}
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
