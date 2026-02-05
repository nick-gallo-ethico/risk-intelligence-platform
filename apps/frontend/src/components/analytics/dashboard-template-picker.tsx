'use client';

/**
 * DashboardTemplatePicker Component
 *
 * Dialog for selecting a dashboard template when creating a new dashboard.
 */

import { LayoutDashboard, PieChart, Briefcase, Target, FileSearch, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { DashboardTemplate, DashboardType } from '@/types/analytics';

export interface DashboardTemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: DashboardTemplate[];
  isLoading?: boolean;
  onSelect: (template: DashboardTemplate) => void;
}

/**
 * Get icon for dashboard type
 */
function getTemplateIcon(dashboardType: DashboardType) {
  switch (dashboardType) {
    case 'COMPLIANCE_OVERVIEW':
      return PieChart;
    case 'CASE_METRICS':
      return Briefcase;
    case 'CAMPAIGN_PERFORMANCE':
      return Target;
    case 'INVESTIGATION_METRICS':
      return FileSearch;
    default:
      return LayoutDashboard;
  }
}

/**
 * Get color class for dashboard type
 */
function getTemplateColor(dashboardType: DashboardType): string {
  switch (dashboardType) {
    case 'COMPLIANCE_OVERVIEW':
      return 'bg-blue-50 text-blue-600 border-blue-200';
    case 'CASE_METRICS':
      return 'bg-purple-50 text-purple-600 border-purple-200';
    case 'CAMPAIGN_PERFORMANCE':
      return 'bg-green-50 text-green-600 border-green-200';
    case 'INVESTIGATION_METRICS':
      return 'bg-orange-50 text-orange-600 border-orange-200';
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

/**
 * Template card component
 */
function TemplateCard({
  template,
  onSelect,
}: {
  template: DashboardTemplate;
  onSelect: (template: DashboardTemplate) => void;
}) {
  const Icon = getTemplateIcon(template.dashboardType);
  const colorClass = getTemplateColor(template.dashboardType);

  return (
    <button
      onClick={() => onSelect(template)}
      className={cn(
        'flex flex-col items-start p-4 rounded-lg border-2 transition-all',
        'hover:border-primary hover:shadow-md',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'text-left w-full'
      )}
    >
      <div
        className={cn(
          'h-10 w-10 rounded-lg flex items-center justify-center mb-3',
          colorClass
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h4 className="font-medium text-sm mb-1">{template.name}</h4>
      <p className="text-xs text-muted-foreground line-clamp-2">
        {template.description}
      </p>
      <span className="text-xs text-muted-foreground mt-2">
        {template.category}
      </span>
    </button>
  );
}

/**
 * Loading skeleton for template picker
 */
function TemplatesSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-[140px] rounded-lg border-2 border-dashed border-muted animate-pulse bg-muted/30"
        />
      ))}
    </div>
  );
}

export function DashboardTemplatePicker({
  open,
  onOpenChange,
  templates,
  isLoading,
  onSelect,
}: DashboardTemplatePickerProps) {
  const handleSelect = (template: DashboardTemplate) => {
    onSelect(template);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Dashboard</DialogTitle>
          <DialogDescription>
            Choose a template to get started. You can customize it after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
