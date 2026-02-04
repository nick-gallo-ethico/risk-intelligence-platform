'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Upload,
  Clock,
  Check,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormBuilder, type FormBuilderState } from '@/components/disclosures/form-builder/FormBuilder';
import { FormPreview } from '@/components/disclosures/form-builder/FormPreview';

// ============================================================================
// Types
// ============================================================================

interface DisclosureFormTemplate {
  id: string;
  name: string;
  description?: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  schema: FormBuilderState;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  parentTemplateId?: string;
  parentVersionAtCreation?: number;
}

// ============================================================================
// Form Builder Page Content
// ============================================================================

function FormBuilderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const templateId = searchParams.get('id');
  const isNewForm = !templateId;

  const [template, setTemplate] = useState<DisclosureFormTemplate | null>(null);
  const [formName, setFormName] = useState('Untitled Form');
  const [formState, setFormState] = useState<FormBuilderState | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(!isNewForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load existing template if editing
  useEffect(() => {
    if (isNewForm || !templateId) {
      setFormState({
        sections: [
          {
            id: 'default-section',
            name: 'Section 1',
            fields: [],
          },
        ],
        selectedFieldId: null,
        selectedSectionId: null,
        isDirty: false,
        lastSaved: null,
      });
      return;
    }

    const loadTemplate = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await apiClient.get<DisclosureFormTemplate>(
          `/disclosure-forms/${templateId}`
        );
        setTemplate(data);
        setFormName(data.name);
        setFormState(data.schema);
      } catch (err) {
        console.error('Failed to load template:', err);
        setError('Failed to load form template. It may have been deleted.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplate();
  }, [templateId, isNewForm]);

  // Save handler
  const handleSave = useCallback(
    async (state: FormBuilderState) => {
      if (!state) return;

      setIsSaving(true);
      setSaveStatus('saving');

      try {
        const payload = {
          name: formName,
          schema: state,
        };

        if (template) {
          // Update existing template
          await apiClient.put(`/disclosure-forms/${template.id}`, payload);
        } else {
          // Create new template
          const newTemplate = await apiClient.post<DisclosureFormTemplate>(
            '/disclosure-forms',
            payload
          );
          setTemplate(newTemplate);
          // Update URL with new template ID
          router.replace(`/disclosures/forms/builder?id=${newTemplate.id}`);
        }

        setSaveStatus('saved');
        setFormState({ ...state, isDirty: false, lastSaved: new Date() });

        // Reset status after 3 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      } catch (err) {
        console.error('Failed to save template:', err);
        setSaveStatus('error');
        setError('Failed to save. Please try again.');
      } finally {
        setIsSaving(false);
      }
    },
    [formName, template, router]
  );

  // Manual save
  const handleManualSave = useCallback(() => {
    if (formState) {
      handleSave(formState);
    }
  }, [formState, handleSave]);

  // Publish handler
  const handlePublish = useCallback(async () => {
    if (!template) {
      // Need to save first
      if (formState) {
        await handleSave(formState);
      }
    }

    if (!template?.id) {
      setError('Please save the form before publishing.');
      setShowPublishDialog(false);
      return;
    }

    setIsPublishing(true);

    try {
      await apiClient.post(`/disclosure-forms/${template.id}/publish`);
      setTemplate((prev) =>
        prev ? { ...prev, status: 'PUBLISHED', publishedAt: new Date().toISOString() } : null
      );
      setShowPublishDialog(false);

      // Redirect to forms list after publish
      router.push('/disclosures/forms');
    } catch (err) {
      console.error('Failed to publish template:', err);
      setError('Failed to publish. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  }, [template, formState, handleSave, router]);

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading form builder...</span>
        </div>
      </div>
    );
  }

  // Auth guard
  if (!isAuthenticated) {
    return null;
  }

  // Error state
  if (error && !formState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button asChild>
            <Link href="/disclosures/forms">Back to Forms</Link>
          </Button>
        </div>
      </div>
    );
  }

  // No form state yet
  if (!formState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Back and Title */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/disclosures/forms">
                  <ArrowLeft className="h-5 w-5" />
                  <span className="sr-only">Back to forms</span>
                </Link>
              </Button>

              <div className="flex items-center gap-2">
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="text-lg font-semibold h-9 w-64 border-transparent hover:border-gray-200 focus:border-blue-500"
                  placeholder="Form name"
                />
                {template && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    v{template.version}
                  </span>
                )}
                {template?.status === 'PUBLISHED' && (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    Published
                  </span>
                )}
                {template?.status === 'DRAFT' && (
                  <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                    Draft
                  </span>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {/* Save Status */}
              {saveStatus !== 'idle' && (
                <span
                  className={`text-xs flex items-center gap-1 ${
                    saveStatus === 'saving'
                      ? 'text-gray-500'
                      : saveStatus === 'saved'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {saveStatus === 'saving' && (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving...
                    </>
                  )}
                  {saveStatus === 'saved' && (
                    <>
                      <Check className="h-3 w-3" />
                      Saved
                    </>
                  )}
                  {saveStatus === 'error' && 'Save failed'}
                </span>
              )}

              {/* Last saved indicator */}
              {formState.lastSaved && saveStatus === 'idle' && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last saved {formState.lastSaved.toLocaleTimeString()}
                </span>
              )}

              {/* Preview Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
              >
                {isPreviewMode ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Edit
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </>
                )}
              </Button>

              {/* Save Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSave}
                disabled={isSaving || !formState.isDirty}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Draft
              </Button>

              {/* Publish Button */}
              <Button
                size="sm"
                onClick={() => setShowPublishDialog(true)}
                disabled={isPublishing || template?.status === 'PUBLISHED'}
              >
                {isPublishing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Publish
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {isPreviewMode ? (
          <FormPreview
            state={formState}
            onTogglePreview={() => setIsPreviewMode(false)}
            isPreviewMode
            className="w-full"
          />
        ) : (
          <FormBuilder
            initialState={formState}
            onSave={handleSave}
            autoSaveInterval={30000}
            className="w-full h-full"
          />
        )}
      </main>

      {/* Publish Confirmation Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Form Template</DialogTitle>
            <DialogDescription>
              Publishing will make this form available for campaigns. Once published,
              the form structure cannot be changed. You can create a new version if
              updates are needed.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-gray-700">
              <strong>Form Name:</strong> {formName}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <strong>Sections:</strong> {formState.sections.length}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <strong>Fields:</strong>{' '}
              {formState.sections.reduce((acc, s) => acc + s.fields.length, 0)}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPublishDialog(false)}
              disabled={isPublishing}
            >
              Cancel
            </Button>
            <Button onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Page Component with Suspense
// ============================================================================

export default function FormBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      }
    >
      <FormBuilderPageContent />
    </Suspense>
  );
}
