'use client';

/**
 * DirectivesPanel - Script/Guide Tab Content
 *
 * Displays client-specific directives grouped by stage:
 * - Opening: Scripts to read at call start
 * - Intake: Guidance during intake process
 * - Category-Specific: Loaded when category is selected
 * - Closing: Scripts to read at call end
 *
 * Features:
 * - Highlights current stage based on intake progress
 * - Read-aloud prompts styled with speaker icon
 * - Expand/collapse for long scripts
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Volume2, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { apiClient } from '@/lib/api';
import type { ClientProfile, CallDirectives, Directive } from '@/types/operator.types';

export interface DirectivesPanelProps {
  /** Currently loaded client profile */
  clientProfile: ClientProfile | null;
  /** Current intake stage for highlighting */
  currentStage?: 'opening' | 'intake' | 'closing';
  /** Selected category ID for category-specific directives */
  selectedCategoryId?: string;
}

export function DirectivesPanel({
  clientProfile,
  currentStage = 'opening',
  selectedCategoryId,
}: DirectivesPanelProps) {
  // Fetch directives for the client
  const {
    data: directives,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['operator', 'directives', clientProfile?.id, selectedCategoryId],
    queryFn: async () => {
      if (!clientProfile?.id) return null;
      const params = selectedCategoryId
        ? `?categoryId=${selectedCategoryId}`
        : '';
      return apiClient.get<CallDirectives>(
        `/operator/clients/${clientProfile.id}/directives/call${params}`
      );
    },
    enabled: !!clientProfile?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (!clientProfile) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Look up a client to load scripts</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {['Opening', 'Intake', 'Closing'].map((stage) => (
          <div key={stage} className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !directives) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm text-destructive">Failed to load directives</p>
          <p className="text-xs mt-1">Please try refreshing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Opening Stage */}
      <DirectiveStageSection
        title="Opening"
        stage="opening"
        directives={directives.opening}
        isCurrentStage={currentStage === 'opening'}
      />

      {/* Intake Stage */}
      <DirectiveStageSection
        title="Intake Guidance"
        stage="intake"
        directives={directives.intake}
        isCurrentStage={currentStage === 'intake'}
      />

      {/* Category-Specific (only show if category selected and directives exist) */}
      {directives.categorySpecific.length > 0 && (
        <DirectiveStageSection
          title="Category-Specific"
          stage="category"
          directives={directives.categorySpecific}
          isCurrentStage={currentStage === 'intake'}
        />
      )}

      {/* Closing Stage */}
      <DirectiveStageSection
        title="Closing"
        stage="closing"
        directives={directives.closing}
        isCurrentStage={currentStage === 'closing'}
      />
    </div>
  );
}

/**
 * Section for a single directive stage.
 */
interface DirectiveStageSectionProps {
  title: string;
  stage: string;
  directives: Directive[];
  isCurrentStage: boolean;
}

function DirectiveStageSection({
  title,
  stage,
  directives,
  isCurrentStage,
}: DirectiveStageSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Auto-expand current stage
  useEffect(() => {
    if (isCurrentStage) {
      setIsOpen(true);
    }
  }, [isCurrentStage]);

  if (directives.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-between py-2 px-3 h-auto',
            isCurrentStage && 'bg-primary/10 hover:bg-primary/15'
          )}
        >
          <div className="flex items-center gap-2">
            {isCurrentStage && (
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
            <span className="font-medium">{title}</span>
            <Badge variant="secondary" className="text-xs">
              {directives.length}
            </Badge>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 mt-2">
        {directives.map((directive) => (
          <DirectiveCard key={directive.id} directive={directive} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Card for a single directive.
 */
function DirectiveCard({ directive }: { directive: Directive }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = directive.content.length > 300;

  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        directive.isReadAloud
          ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
          : 'bg-card'
      )}
    >
      <div className="flex items-start gap-2">
        {directive.isReadAloud && (
          <Volume2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{directive.title}</span>
            {directive.isReadAloud && (
              <Badge
                variant="outline"
                className="text-xs text-blue-600 border-blue-300"
              >
                Read Aloud
              </Badge>
            )}
          </div>
          <p
            className={cn(
              'text-sm text-muted-foreground whitespace-pre-wrap',
              !isExpanded && isLong && 'line-clamp-3'
            )}
          >
            {directive.content}
          </p>
          {isLong && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-auto p-0 text-xs"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
