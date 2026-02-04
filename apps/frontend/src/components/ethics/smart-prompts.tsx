'use client';

import * as React from 'react';
import { Lightbulb, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Prompt suggestion type.
 */
export interface SmartPrompt {
  /** Unique ID for this prompt */
  id: string;
  /** The suggestion text to display */
  text: string;
  /** Priority for ordering (higher = more important) */
  priority?: number;
}

/**
 * Generate smart prompts based on form content.
 */
export function generateSmartPrompts(options: {
  /** Current description text */
  description: string;
  /** Selected category ID */
  categoryId?: string;
  /** Category name for context */
  categoryName?: string;
  /** Fields that have been filled */
  filledFields: string[];
}): SmartPrompt[] {
  const { description, categoryId, categoryName, filledFields } = options;
  const prompts: SmartPrompt[] = [];

  // Check description length
  if (description && description.length < 50 && description.length > 0) {
    prompts.push({
      id: 'description-length',
      text: 'You might want to provide more detail about what happened. This helps investigators understand your report better.',
      priority: 10,
    });
  }

  // Check for time-related content
  if (description && !description.match(/when|date|time|yesterday|today|last week|ago/i)) {
    prompts.push({
      id: 'when-happened',
      text: 'When did this happen? Including the date or approximate timeframe can be helpful.',
      priority: 8,
    });
  }

  // Check for location-related content
  if (description && !description.match(/where|location|office|building|department|site/i)) {
    prompts.push({
      id: 'where-happened',
      text: 'Where did this occur? This helps determine the right team to investigate.',
      priority: 7,
    });
  }

  // Category-specific prompts
  if (categoryId || categoryName) {
    const categoryLower = (categoryName || categoryId || '').toLowerCase();

    if (categoryLower.includes('harassment') || categoryLower.includes('discrimination')) {
      if (!filledFields.includes('protectedClass')) {
        prompts.push({
          id: 'protected-class',
          text: 'If relevant, you may want to indicate what protected characteristic (race, gender, age, etc.) is involved.',
          priority: 9,
        });
      }
    }

    if (categoryLower.includes('fraud') || categoryLower.includes('financial')) {
      if (!description.match(/\$|dollar|amount|money/i)) {
        prompts.push({
          id: 'financial-amount',
          text: 'If you know the approximate dollar amount involved, that information can be valuable.',
          priority: 7,
        });
      }
    }

    if (categoryLower.includes('safety') || categoryLower.includes('health')) {
      prompts.push({
        id: 'safety-urgent',
        text: 'If this is an immediate safety concern, please also contact emergency services.',
        priority: 10,
      });
    }

    if (categoryLower.includes('conflict') || categoryLower.includes('coi')) {
      prompts.push({
        id: 'coi-relationship',
        text: 'If applicable, describe the nature of the relationship and how it might affect business decisions.',
        priority: 8,
      });
    }
  }

  // Check for witnesses
  if (description && description.length > 100 && !description.match(/witness|saw|observed|someone else/i)) {
    prompts.push({
      id: 'witnesses',
      text: 'Were there any witnesses who can corroborate what happened?',
      priority: 6,
    });
  }

  // Sort by priority (highest first) and return top 3
  return prompts.sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 3);
}

interface SmartPromptsProps {
  /** Prompts to display */
  prompts: SmartPrompt[];
  /** Callback when a prompt is dismissed */
  onDismiss: (promptId: string) => void;
  /** Additional class name */
  className?: string;
}

/**
 * Smart prompts component for report submission.
 * Displays non-blocking hints to help reporters provide better information.
 *
 * Features:
 * - Non-intrusive suggestions
 * - Category-aware prompts
 * - Dismissible with memory
 * - Gentle, encouraging language
 *
 * @example
 * ```tsx
 * const prompts = generateSmartPrompts({
 *   description: formData.description,
 *   categoryId: selectedCategory?.id,
 *   categoryName: selectedCategory?.name,
 *   filledFields: Object.keys(formData),
 * });
 *
 * <SmartPrompts
 *   prompts={prompts}
 *   onDismiss={(id) => dismissedPrompts.add(id)}
 * />
 * ```
 */
export function SmartPrompts({
  prompts,
  onDismiss,
  className,
}: SmartPromptsProps) {
  if (prompts.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)} role="status" aria-live="polite">
      {prompts.map((prompt) => (
        <div
          key={prompt.id}
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg',
            'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800'
          )}
        >
          {/* Icon */}
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
            <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>

          {/* Text */}
          <p className="flex-1 text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
            {prompt.text}
          </p>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={() => onDismiss(prompt.id)}
            className={cn(
              'flex-shrink-0 p-1 rounded-full',
              'text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800',
              'focus:outline-none focus:ring-2 focus:ring-amber-500'
            )}
            aria-label="Dismiss suggestion"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
