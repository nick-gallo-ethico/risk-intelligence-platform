'use client';

import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * EmptyState component props
 */
export interface EmptyStateProps {
  /** Icon to display */
  icon: LucideIcon;
  /** Title text */
  title: string;
  /** Description text */
  description: string;
  /** Optional action button label */
  actionLabel?: string;
  /** Optional action callback */
  onAction?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * HubSpot-style empty state component.
 *
 * Displays a centered icon, title, description, and optional action button.
 * Used when lists or tabs have no data to display.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4',
        className
      )}
    >
      <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h4 className="text-sm font-medium text-foreground mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button size="sm" variant="outline" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
