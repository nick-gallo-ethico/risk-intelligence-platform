'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Check,
  ChevronDown,
  FileText,
  Building2,
  User,
  Shield,
  Clock,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  getTemplates,
  type InvestigationTemplate,
  type TemplateTier,
} from '@/lib/templates-api';

interface TemplateSelectorProps {
  /** Currently selected template ID */
  selectedTemplateId?: string;
  /** Category ID for filtering recommendations */
  categoryId?: string;
  /** Callback when a template is selected */
  onSelect: (templateId: string) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * Template tier group component showing templates organized by tier.
 */
function TemplateTierGroup({
  tier,
  templates,
  selectedTemplateId,
  onSelect,
  previewTemplate,
}: {
  tier: TemplateTier;
  templates: InvestigationTemplate[];
  selectedTemplateId?: string;
  onSelect: (templateId: string) => void;
  previewTemplate: (template: InvestigationTemplate | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const tierConfig: Record<
    TemplateTier,
    { label: string; icon: React.ReactNode; color: string }
  > = {
    OFFICIAL: {
      label: 'Official Templates',
      icon: <Shield className="h-4 w-4" />,
      color: 'text-blue-600',
    },
    TEAM: {
      label: 'Team Templates',
      icon: <Building2 className="h-4 w-4" />,
      color: 'text-purple-600',
    },
    PERSONAL: {
      label: 'My Templates',
      icon: <User className="h-4 w-4" />,
      color: 'text-green-600',
    },
  };

  const config = tierConfig[tier];

  if (templates.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 hover:bg-gray-50 rounded-md">
        <div className={cn('flex items-center gap-2', config.color)}>
          {config.icon}
          <span className="font-medium text-sm">{config.label}</span>
          <Badge variant="secondary" className="text-xs">
            {templates.length}
          </Badge>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-500 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-6 py-1 space-y-1">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              onMouseEnter={() => previewTemplate(template)}
              onMouseLeave={() => previewTemplate(null)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors',
                selectedTemplateId === template.id
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-gray-100'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm truncate">{template.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {template.estimatedDuration && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {template.estimatedDuration}
                  </span>
                )}
                {selectedTemplateId === template.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Template preview component showing template details.
 */
function TemplatePreview({ template }: { template: InvestigationTemplate }) {
  const totalItems = useMemo(() => {
    return template.sections.reduce(
      (sum, section) => sum + section.items.length,
      0
    );
  }, [template.sections]);

  return (
    <div className="p-4 border-l bg-gray-50 min-w-[300px]">
      <h4 className="font-medium text-gray-900">{template.name}</h4>
      {template.description && (
        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
      )}
      <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
        <span>{template.sections.length} sections</span>
        <span>{totalItems} items</span>
        {template.estimatedDuration && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {template.estimatedDuration}
          </span>
        )}
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-xs font-medium text-gray-700">Sections:</p>
        <ul className="text-sm text-gray-600 space-y-1">
          {template.sections.slice(0, 5).map((section) => (
            <li key={section.id} className="flex items-center gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full" />
              <span className="truncate">{section.name}</span>
              <span className="text-gray-400">({section.items.length})</span>
            </li>
          ))}
          {template.sections.length > 5 && (
            <li className="text-gray-400 text-xs">
              + {template.sections.length - 5} more sections
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

/**
 * Template selector component for choosing investigation templates.
 * Organizes templates by tier (Official, Team, Personal).
 */
export function TemplateSelector({
  selectedTemplateId,
  categoryId,
  onSelect,
  disabled = false,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<InvestigationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewedTemplate, setPreviewedTemplate] =
    useState<InvestigationTemplate | null>(null);

  // Load templates
  useEffect(() => {
    async function loadTemplates() {
      setLoading(true);
      setError(null);
      try {
        const response = await getTemplates({
          status: 'PUBLISHED',
          limit: 100,
        });
        setTemplates(response.data);
      } catch (err) {
        console.error('Failed to load templates:', err);
        setError('Failed to load templates');
      } finally {
        setLoading(false);
      }
    }
    loadTemplates();
  }, [categoryId]);

  // Group templates by tier
  const templatesByTier = useMemo(() => {
    const grouped: Record<TemplateTier, InvestigationTemplate[]> = {
      OFFICIAL: [],
      TEAM: [],
      PERSONAL: [],
    };

    templates.forEach((template) => {
      grouped[template.tier].push(template);
    });

    return grouped;
  }, [templates]);

  // Get selected template for preview
  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId);
  }, [templates, selectedTemplateId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading templates...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-8 w-8 mx-auto text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">No templates available</p>
        <p className="text-xs text-gray-400">
          Create a template to use checklists for investigations
        </p>
      </div>
    );
  }

  const displayedTemplate = previewedTemplate || selectedTemplate;

  return (
    <div className="flex">
      {/* Template list */}
      <div className="flex-1 space-y-2 min-w-0">
        {(['OFFICIAL', 'TEAM', 'PERSONAL'] as TemplateTier[]).map((tier) => (
          <TemplateTierGroup
            key={tier}
            tier={tier}
            templates={templatesByTier[tier]}
            selectedTemplateId={selectedTemplateId}
            onSelect={disabled ? () => {} : onSelect}
            previewTemplate={setPreviewedTemplate}
          />
        ))}
      </div>

      {/* Preview panel */}
      {displayedTemplate && <TemplatePreview template={displayedTemplate} />}
    </div>
  );
}

/**
 * Template selector dialog for choosing and applying a template.
 */
export function TemplateSelectorDialog({
  open,
  onOpenChange,
  categoryId,
  onApply,
  loading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId?: string;
  onApply: (templateId: string) => void;
  loading?: boolean;
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  const handleApply = () => {
    if (selectedTemplateId) {
      onApply(selectedTemplateId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Investigation Template</DialogTitle>
          <DialogDescription>
            Choose a template to guide your investigation with predefined
            checklist items and sections.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 -mx-6 px-6">
          <TemplateSelector
            selectedTemplateId={selectedTemplateId || undefined}
            categoryId={categoryId}
            onSelect={setSelectedTemplateId}
            disabled={loading}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedTemplateId || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              'Apply Template'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
