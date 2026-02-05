'use client';

import { useState, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Upload, X, ImageIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type {
  OrganizationSettings,
  UpdateBrandingDto,
  BrandingMode,
} from '@/types/organization';
import { BRANDING_MODES } from '@/types/organization';
import { cn } from '@/lib/utils';

/**
 * Props for OrganizationBrandingSettings component.
 */
interface OrganizationBrandingSettingsProps {
  /** Current organization settings */
  settings: OrganizationSettings;
  /** Callback to save branding changes */
  onSave: (data: UpdateBrandingDto) => Promise<void>;
  /** Callback to upload logo */
  onUploadLogo: (file: File) => Promise<{ url: string }>;
  /** Callback to upload favicon */
  onUploadFavicon: (file: File) => Promise<{ url: string }>;
  /** Callback to delete logo */
  onDeleteLogo?: () => Promise<void>;
  /** Callback to delete favicon */
  onDeleteFavicon?: () => Promise<void>;
  /** Whether save operation is in progress */
  isSaving: boolean;
}

interface BrandingFormData {
  brandingMode: BrandingMode;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  customCss: string;
}

/**
 * Organization branding settings form.
 *
 * Allows configuration of:
 * - Logo upload and preview
 * - Favicon upload and preview
 * - Branding mode (Standard, Co-branded, White Label)
 * - Color customization (primary, secondary, accent)
 * - Custom CSS (advanced)
 */
export function OrganizationBrandingSettings({
  settings,
  onSave,
  onUploadLogo,
  onUploadFavicon,
  onDeleteLogo,
  onDeleteFavicon,
  isSaving,
}: OrganizationBrandingSettingsProps) {
  const [hasChanges, setHasChanges] = useState(false);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [faviconUrl, setFaviconUrl] = useState(settings.faviconUrl || '');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const { handleSubmit, control, watch, setValue } = useForm<BrandingFormData>({
    defaultValues: {
      brandingMode: settings.brandingMode,
      primaryColor: settings.primaryColor || '#0070f3',
      secondaryColor: settings.secondaryColor || '#6366f1',
      accentColor: settings.accentColor || '#f59e0b',
      customCss: settings.customCss || '',
    },
  });

  const brandingMode = watch('brandingMode');
  const primaryColor = watch('primaryColor');
  const secondaryColor = watch('secondaryColor');
  const accentColor = watch('accentColor');

  const handleFieldChange = () => {
    setHasChanges(true);
  };

  const handleLogoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo must be less than 2MB');
        return;
      }

      setIsUploadingLogo(true);
      try {
        const result = await onUploadLogo(file);
        setLogoUrl(result.url);
        setHasChanges(true);
      } catch (error) {
        console.error('Failed to upload logo:', error);
        alert('Failed to upload logo. Please try again.');
      } finally {
        setIsUploadingLogo(false);
      }
    },
    [onUploadLogo]
  );

  const handleFaviconUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 500KB)
      if (file.size > 500 * 1024) {
        alert('Favicon must be less than 500KB');
        return;
      }

      setIsUploadingFavicon(true);
      try {
        const result = await onUploadFavicon(file);
        setFaviconUrl(result.url);
        setHasChanges(true);
      } catch (error) {
        console.error('Failed to upload favicon:', error);
        alert('Failed to upload favicon. Please try again.');
      } finally {
        setIsUploadingFavicon(false);
      }
    },
    [onUploadFavicon]
  );

  const handleRemoveLogo = async () => {
    if (onDeleteLogo) {
      try {
        await onDeleteLogo();
        setLogoUrl('');
        setHasChanges(true);
      } catch (error) {
        console.error('Failed to delete logo:', error);
      }
    }
  };

  const handleRemoveFavicon = async () => {
    if (onDeleteFavicon) {
      try {
        await onDeleteFavicon();
        setFaviconUrl('');
        setHasChanges(true);
      } catch (error) {
        console.error('Failed to delete favicon:', error);
      }
    }
  };

  const onSubmit = async (data: BrandingFormData) => {
    await onSave({
      brandingMode: data.brandingMode,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      accentColor: data.accentColor,
      customCss: data.customCss || undefined,
    });
    setHasChanges(false);
  };

  const showColorOptions = brandingMode !== 'STANDARD';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Branding</CardTitle>
        <CardDescription>
          Customize the appearance of your platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              {/* Logo Preview */}
              <div className="relative w-48 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden border">
                {logoUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt="Organization logo"
                      className="max-w-full max-h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-xs mt-1">No logo</span>
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Recommended: PNG or SVG, max 2MB, 200x50px or similar aspect ratio
            </p>
          </div>

          {/* Favicon Upload */}
          <div className="space-y-2">
            <Label>Favicon</Label>
            <div className="flex items-center gap-4">
              {/* Favicon Preview */}
              <div className="relative w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden border">
                {faviconUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={faviconUrl}
                      alt="Favicon"
                      className="max-w-full max-h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveFavicon}
                      className="absolute -top-1 -right-1 bg-background/80 rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>

              {/* Upload Button */}
              <div>
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFaviconUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => faviconInputRef.current?.click()}
                  disabled={isUploadingFavicon}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploadingFavicon ? 'Uploading...' : 'Upload Favicon'}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Recommended: 32x32px PNG or ICO, max 500KB
            </p>
          </div>

          {/* Branding Mode */}
          <div className="space-y-3">
            <Label>Branding Mode</Label>
            <Controller
              control={control}
              name="brandingMode"
              render={({ field }) => (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {BRANDING_MODES.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => {
                        field.onChange(mode.value);
                        handleFieldChange();
                      }}
                      className={cn(
                        'p-4 rounded-lg border text-left transition-colors',
                        field.value === mode.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className="font-medium">{mode.label}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {mode.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Color Pickers - Only show for non-standard branding */}
          {showColorOptions && (
            <div className="space-y-4">
              <Label>Brand Colors</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Primary Color */}
                <div className="space-y-2">
                  <Label htmlFor="primaryColor" className="text-sm font-normal">
                    Primary Color
                  </Label>
                  <div className="flex items-center gap-2">
                    <Controller
                      control={control}
                      name="primaryColor"
                      render={({ field }) => (
                        <>
                          <input
                            type="color"
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              handleFieldChange();
                            }}
                            className="h-10 w-10 rounded cursor-pointer border"
                          />
                          <Input
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              handleFieldChange();
                            }}
                            placeholder="#0070f3"
                            className="flex-1"
                          />
                        </>
                      )}
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor" className="text-sm font-normal">
                    Secondary Color
                  </Label>
                  <div className="flex items-center gap-2">
                    <Controller
                      control={control}
                      name="secondaryColor"
                      render={({ field }) => (
                        <>
                          <input
                            type="color"
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              handleFieldChange();
                            }}
                            className="h-10 w-10 rounded cursor-pointer border"
                          />
                          <Input
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              handleFieldChange();
                            }}
                            placeholder="#6366f1"
                            className="flex-1"
                          />
                        </>
                      )}
                    />
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-2">
                  <Label htmlFor="accentColor" className="text-sm font-normal">
                    Accent Color
                  </Label>
                  <div className="flex items-center gap-2">
                    <Controller
                      control={control}
                      name="accentColor"
                      render={({ field }) => (
                        <>
                          <input
                            type="color"
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              handleFieldChange();
                            }}
                            className="h-10 w-10 rounded cursor-pointer border"
                          />
                          <Input
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              handleFieldChange();
                            }}
                            placeholder="#f59e0b"
                            className="flex-1"
                          />
                        </>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Brand Preview */}
          {showColorOptions && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="border rounded-lg p-4 bg-background">
                <div className="flex items-center gap-4 mb-4">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="h-8 object-contain"
                    />
                  ) : (
                    <div className="h-8 w-24 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                      Logo
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Primary Button
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      style={{ borderColor: secondaryColor, color: secondaryColor }}
                    >
                      Secondary
                    </Button>
                    <span
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded"
                      style={{ backgroundColor: accentColor + '20', color: accentColor }}
                    >
                      Accent Badge
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advanced: Custom CSS */}
          {showColorOptions && (
            <div className="space-y-2">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced Options
              </button>

              {showAdvanced && (
                <div className="space-y-2">
                  <Label htmlFor="customCss">Custom CSS</Label>
                  <Controller
                    control={control}
                    name="customCss"
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          handleFieldChange();
                        }}
                        placeholder=":root {
  --custom-var: value;
}"
                        rows={6}
                        className="font-mono text-sm"
                      />
                    )}
                  />
                  <p className="text-sm text-muted-foreground">
                    Advanced: Add custom CSS variables or overrides. Use with caution.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={isSaving || !hasChanges}>
              {isSaving ? 'Saving...' : 'Save Branding'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
