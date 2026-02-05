'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { OrganizationGeneralSettings } from '@/components/settings/organization-general-settings';
import { OrganizationBrandingSettings } from '@/components/settings/organization-branding-settings';
import { OrganizationNotificationSettings } from '@/components/settings/organization-notification-settings';
import { OrganizationSecuritySettings } from '@/components/settings/organization-security-settings';
import { organizationApi } from '@/services/organization';
import { toast } from 'sonner';
import type {
  UpdateOrganizationDto,
  UpdateBrandingDto,
  UpdateNotificationSettingsDto,
  UpdateSecuritySettingsDto,
} from '@/types/organization';

/**
 * Organization Settings Page
 *
 * Provides a tabbed interface for managing organization-wide settings:
 * - General: Organization name, timezone, date format, language
 * - Branding: Logo, colors, branding mode (Standard/Co-branded/White Label)
 * - Notifications: Digest settings, quiet hours, enforced categories
 * - Security: MFA requirements, session timeout, password policy, SSO config
 *
 * Access restricted to SYSTEM_ADMIN role.
 */
export default function OrganizationSettingsPage() {
  const queryClient = useQueryClient();

  // Fetch organization settings
  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: organizationApi.getSettings,
  });

  // Mutations for each settings section
  const updateGeneralMutation = useMutation({
    mutationFn: (dto: UpdateOrganizationDto) =>
      organizationApi.updateGeneral(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
      toast.success('General settings saved');
    },
    onError: (error) => {
      console.error('Failed to save general settings:', error);
      toast.error('Failed to save settings. Please try again.');
    },
  });

  const updateBrandingMutation = useMutation({
    mutationFn: (dto: UpdateBrandingDto) =>
      organizationApi.updateBranding(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
      toast.success('Branding settings saved');
    },
    onError: (error) => {
      console.error('Failed to save branding settings:', error);
      toast.error('Failed to save branding. Please try again.');
    },
  });

  const updateNotificationMutation = useMutation({
    mutationFn: (dto: UpdateNotificationSettingsDto) =>
      organizationApi.updateNotificationSettings(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
      toast.success('Notification settings saved');
    },
    onError: (error) => {
      console.error('Failed to save notification settings:', error);
      toast.error('Failed to save notification settings. Please try again.');
    },
  });

  const updateSecurityMutation = useMutation({
    mutationFn: (dto: UpdateSecuritySettingsDto) =>
      organizationApi.updateSecuritySettings(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
      toast.success('Security settings saved');
    },
    onError: (error) => {
      console.error('Failed to save security settings:', error);
      toast.error('Failed to save security settings. Please try again.');
    },
  });

  // Logo and favicon upload handlers
  const handleUploadLogo = async (file: File) => {
    const result = await organizationApi.uploadLogo(file);
    queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
    toast.success('Logo uploaded');
    return result;
  };

  const handleUploadFavicon = async (file: File) => {
    const result = await organizationApi.uploadFavicon(file);
    queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
    toast.success('Favicon uploaded');
    return result;
  };

  const handleDeleteLogo = async () => {
    await organizationApi.deleteLogo();
    queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
    toast.success('Logo removed');
  };

  const handleDeleteFavicon = async () => {
    await organizationApi.deleteFavicon();
    queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
    toast.success('Favicon removed');
  };

  // Loading state
  if (isLoading) {
    return <OrganizationSettingsSkeleton />;
  }

  // Error state
  if (error || !settings) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Settings className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to Load Settings</h2>
        <p className="text-muted-foreground mb-4">
          There was an error loading organization settings. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/settings"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </Link>
        <span>/</span>
        <span className="text-foreground">Organization</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">Organization Settings</h1>
        <p className="text-muted-foreground">
          Configure your organization&apos;s appearance, notifications, and security
        </p>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <OrganizationGeneralSettings
            settings={settings}
            onSave={async (dto) => {
              await updateGeneralMutation.mutateAsync(dto);
            }}
            isSaving={updateGeneralMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="branding">
          <OrganizationBrandingSettings
            settings={settings}
            onSave={async (dto) => {
              await updateBrandingMutation.mutateAsync(dto);
            }}
            onUploadLogo={handleUploadLogo}
            onUploadFavicon={handleUploadFavicon}
            onDeleteLogo={handleDeleteLogo}
            onDeleteFavicon={handleDeleteFavicon}
            isSaving={updateBrandingMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="notifications">
          <OrganizationNotificationSettings
            settings={settings}
            onSave={async (dto) => {
              await updateNotificationMutation.mutateAsync(dto);
            }}
            isSaving={updateNotificationMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="security">
          <OrganizationSecuritySettings
            settings={settings}
            onSave={async (dto) => {
              await updateSecurityMutation.mutateAsync(dto);
            }}
            isSaving={updateSecurityMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Skeleton loading state for organization settings page.
 */
function OrganizationSettingsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Skeleton className="h-5 w-32" />

      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Tabs */}
      <Skeleton className="h-10 w-[400px]" />

      {/* Content */}
      <div className="border rounded-lg p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}
