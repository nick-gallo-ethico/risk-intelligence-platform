'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Directive {
  id?: string;
  organizationId: string;
  stage: string;
  categoryId?: string;
  title: string;
  content: string;
  isReadAloud: boolean;
  isActive: boolean;
  version?: number;
}

interface DirectiveEditorProps {
  directive: Directive | null;
  onSave: (data: Partial<Directive> & { approveAndPublish?: boolean }) => void;
  onClose: () => void;
  isLoading: boolean;
}

const STAGES = [
  { value: 'OPENING', label: 'Opening', description: 'Initial greeting and identification' },
  { value: 'INTAKE', label: 'Intake', description: 'Gathering report details' },
  { value: 'CATEGORY_SPECIFIC', label: 'Category Specific', description: 'Questions specific to incident type' },
  { value: 'CLOSING', label: 'Closing', description: 'Wrap-up and next steps' },
];

export function DirectiveEditor({ directive, onSave, onClose, isLoading }: DirectiveEditorProps) {
  const [formData, setFormData] = useState({
    organizationId: '',
    stage: 'OPENING',
    categoryId: '',
    title: '',
    content: '',
    isReadAloud: false,
    approveAndPublish: false,
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (directive) {
      setFormData({
        organizationId: directive.organizationId || '',
        stage: directive.stage || 'OPENING',
        categoryId: directive.categoryId || '',
        title: directive.title || '',
        content: directive.content || '',
        isReadAloud: directive.isReadAloud || false,
        approveAndPublish: false,
      });
    }
  }, [directive]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: directive?.id,
    });
  };

  const isNewDirective = !directive?.id;
  const isDraft = directive && !directive.isActive;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-lg font-semibold">
              {isNewDirective ? 'Create New Directive' : 'Edit Directive'}
            </h2>
            {directive?.version && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <History className="h-3 w-3" />
                Version {directive.version}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Organization ID (only for new directives) */}
          {isNewDirective && (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Organization ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.organizationId}
                onChange={(e) => handleChange('organizationId', e.target.value)}
                placeholder="Enter organization UUID"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                The client organization this directive belongs to
              </p>
            </div>
          )}

          {/* Stage */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Stage <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.stage}
              onChange={(e) => handleChange('stage', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label} - {stage.description}
                </option>
              ))}
            </select>
          </div>

          {/* Category (optional) */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Category ID (optional)</label>
            <input
              type="text"
              value={formData.categoryId}
              onChange={(e) => handleChange('categoryId', e.target.value)}
              placeholder="For category-specific directives"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty for directives that apply to all categories
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g., 'Welcome Script' or 'Harassment Intake Questions'"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="Enter the directive script or instructions for operators..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
              rows={8}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.content.length} characters
            </p>
          </div>

          {/* Read Aloud toggle */}
          <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <input
              type="checkbox"
              id="isReadAloud"
              checked={formData.isReadAloud}
              onChange={(e) => handleChange('isReadAloud', e.target.checked)}
              className="mt-1 rounded border-gray-300"
            />
            <label htmlFor="isReadAloud" className="text-sm">
              <span className="font-medium text-orange-800">Read Aloud Directive</span>
              <p className="text-orange-700 mt-0.5">
                Operator must read this content verbatim to the caller. Used for legal disclaimers
                or required disclosures.
              </p>
            </label>
          </div>

          {/* Approve and Publish (only for drafts) */}
          {isDraft && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.approveAndPublish}
                  onChange={(e) => handleChange('approveAndPublish', e.target.checked)}
                  className="mt-1 rounded border-gray-300"
                />
                <div className="text-sm">
                  <span className="font-medium text-yellow-800">Approve and Publish</span>
                  <p className="text-yellow-700 mt-0.5">
                    Mark this directive as active. Operators will immediately see the new version.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Version tracking notice */}
          {!isNewDirective && (
            <div className="flex items-start gap-2 text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>
                Saving changes will create a new version. The previous version will be preserved
                in the version history for audit purposes.
              </p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {hasChanges && <span className="text-primary">Unsaved changes</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="directive-form"
              onClick={handleSubmit}
              disabled={isLoading}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                'bg-primary text-white hover:bg-primary/90',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Saving...' : isNewDirective ? 'Create Directive' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
