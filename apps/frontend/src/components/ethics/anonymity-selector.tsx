'use client';

import * as React from 'react';
import { Shield, Lock, User, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Anonymity tier options.
 */
export type AnonymityTier = 'ANONYMOUS' | 'CONFIDENTIAL' | 'OPEN';

/**
 * Anonymity option configuration.
 */
export interface AnonymityOption {
  value: AnonymityTier;
  enabled: boolean;
}

/**
 * Content for each anonymity tier.
 */
const ANONYMITY_CONTENT: Record<
  AnonymityTier,
  {
    title: string;
    icon: React.ElementType;
    description: string;
    benefits: string[];
    considerations: string[];
  }
> = {
  ANONYMOUS: {
    title: 'Anonymous',
    icon: Shield,
    description: 'Your identity is completely hidden. We cannot follow up with you.',
    benefits: [
      'Maximum privacy protection',
      'No personal information collected',
      'Cannot be identified by anyone',
    ],
    considerations: [
      'We cannot ask follow-up questions',
      'Limited ability to provide updates',
      'You must check status yourself using your access code',
    ],
  },
  CONFIDENTIAL: {
    title: 'Confidential',
    icon: Lock,
    description:
      'Your identity is protected. Only authorized investigators can see it.',
    benefits: [
      'Strong privacy protection',
      'We can follow up with questions',
      'Easier to provide updates on your report',
    ],
    considerations: [
      'Your identity is shared with authorized investigators only',
      'Required for certain sensitive matters',
    ],
  },
  OPEN: {
    title: 'Open',
    icon: User,
    description:
      'Your identity is visible to investigators. This allows for easier follow-up.',
    benefits: [
      'Fastest resolution of your report',
      'Direct communication possible',
      'Easier for investigators to verify details',
    ],
    considerations: [
      'Your identity is visible to all assigned investigators',
      'May be required for some types of reports',
    ],
  },
};

interface AnonymitySelectorProps {
  /** Currently selected tier */
  selected: AnonymityTier | null;
  /** Callback when a tier is selected */
  onSelect: (tier: AnonymityTier) => void;
  /** Available options (from tenant config) */
  options?: AnonymityOption[];
  /** Disable interaction */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Anonymity tier selection card.
 */
function AnonymityCard({
  tier,
  isSelected,
  isDisabled,
  onSelect,
}: {
  tier: AnonymityTier;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: () => void;
}) {
  const content = ANONYMITY_CONTENT[tier];
  const IconComponent = content.icon;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isDisabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="radio"
      tabIndex={isDisabled ? -1 : 0}
      aria-checked={isSelected}
      aria-disabled={isDisabled}
      onClick={isDisabled ? undefined : onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative flex flex-col p-5 rounded-xl border-2 transition-all cursor-pointer',
        'min-h-[180px]', // Ensure consistent height
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isSelected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-border bg-card hover:border-primary/50 hover:bg-accent/50',
        isDisabled && 'opacity-50 cursor-not-allowed hover:border-border hover:bg-card'
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}
        >
          <IconComponent className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold">{content.title}</h3>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4">{content.description}</p>

      {/* Benefits */}
      <div className="space-y-1.5 flex-1">
        {content.benefits.map((benefit, index) => (
          <div key={index} className="flex items-start gap-2 text-sm">
            <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-2.5 h-2.5 text-green-600" />
            </div>
            <span>{benefit}</span>
          </div>
        ))}
      </div>

      {/* Considerations (shown on hover/focus or when selected) */}
      {isSelected && content.considerations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Keep in mind
          </p>
          {content.considerations.map((consideration, index) => (
            <p key={index} className="text-xs text-muted-foreground">
              {consideration}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Anonymity tier selector component.
 * Displays three cards for Anonymous, Confidential, and Open options.
 *
 * Features:
 * - Clear visual distinction between tiers
 * - Benefits and considerations for each tier
 * - Mobile-first vertical stacking
 * - Keyboard navigation
 *
 * @example
 * ```tsx
 * <AnonymitySelector
 *   selected={selectedTier}
 *   onSelect={(tier) => setSelectedTier(tier)}
 *   options={tenantConfig.anonymityOptions}
 * />
 * ```
 */
export function AnonymitySelector({
  selected,
  onSelect,
  options,
  disabled = false,
  className,
}: AnonymitySelectorProps) {
  // Default to all tiers enabled if no options provided
  const availableTiers: AnonymityTier[] = options
    ? options.filter((opt) => opt.enabled).map((opt) => opt.value)
    : ['ANONYMOUS', 'CONFIDENTIAL', 'OPEN'];

  // Order: ANONYMOUS -> CONFIDENTIAL -> OPEN
  const orderedTiers: AnonymityTier[] = ['ANONYMOUS', 'CONFIDENTIAL', 'OPEN'];
  const enabledTiers = orderedTiers.filter((tier) => availableTiers.includes(tier));

  if (enabledTiers.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        No anonymity options available
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-4',
        // Stack vertically on mobile, horizontal on larger screens
        enabledTiers.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2',
        className
      )}
      role="radiogroup"
      aria-label="Select anonymity level"
    >
      {enabledTiers.map((tier) => (
        <AnonymityCard
          key={tier}
          tier={tier}
          isSelected={selected === tier}
          isDisabled={disabled}
          onSelect={() => onSelect(tier)}
        />
      ))}
    </div>
  );
}
