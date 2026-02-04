'use client';

/**
 * ProxyReasonSelector Component
 *
 * A selector for proxy report reasons.
 *
 * Features:
 * - Radio button group for predefined reasons
 * - Custom reason text input when "Other" is selected
 * - Required field validation
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle } from 'lucide-react';
import {
  ProxyReason,
  PROXY_REASON_OPTIONS,
} from '@/types/employee-portal.types';

interface ProxyReasonSelectorProps {
  /** Currently selected reason */
  selected?: ProxyReason;
  /** Callback when reason is selected */
  onSelect: (reason: ProxyReason) => void;
  /** Custom reason text (when OTHER is selected) */
  customReason?: string;
  /** Callback when custom reason changes */
  onCustomReasonChange: (reason: string) => void;
  /** Error message to display */
  error?: string;
  /** Additional class name */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * ProxyReasonSelector - Radio button selector for proxy submission reasons.
 */
export function ProxyReasonSelector({
  selected,
  onSelect,
  customReason = '',
  onCustomReasonChange,
  error,
  className,
  disabled = false,
}: ProxyReasonSelectorProps) {
  const isOtherSelected = selected === ProxyReason.OTHER;

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <Label className="text-base font-medium">
          Why are you submitting on behalf of this employee?
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          This information will be recorded for audit purposes.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Radio button group */}
      <div className="space-y-3" role="radiogroup" aria-label="Proxy reason">
        {PROXY_REASON_OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          const inputId = `proxy-reason-${option.value}`;

          return (
            <div key={option.value}>
              <label
                htmlFor={inputId}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                  'hover:bg-accent',
                  isSelected && 'border-primary bg-primary/5',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <input
                  type="radio"
                  id={inputId}
                  name="proxyReason"
                  value={option.value}
                  checked={isSelected}
                  onChange={() => onSelect(option.value)}
                  disabled={disabled}
                  className="mt-1 h-4 w-4 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <span className="font-medium block">{option.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {option.description}
                  </span>
                </div>
              </label>

              {/* Custom reason input - only show when OTHER is selected */}
              {option.requiresCustomReason && isSelected && (
                <div className="mt-3 ml-7">
                  <Label htmlFor="customReason" className="sr-only">
                    Please specify the reason
                  </Label>
                  <Textarea
                    id="customReason"
                    placeholder="Please specify the reason..."
                    value={customReason}
                    onChange={(e) => onCustomReasonChange(e.target.value)}
                    disabled={disabled}
                    className="min-h-[80px]"
                    aria-required={isOtherSelected}
                  />
                  {isOtherSelected && !customReason && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Required when selecting &quot;Other reason&quot;
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
