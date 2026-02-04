'use client';

/**
 * RiuTypeSelector - RIU Type Selection Component
 *
 * Three large buttons for selecting intake type:
 * - REPORT: Creates case for investigation
 * - REQUEST_FOR_INFO: Non-issue inquiry
 * - WRONG_NUMBER: Log and end call
 *
 * Selection changes subsequent form fields in the intake form.
 */

import { FileText, HelpCircle, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RiuType } from '@/hooks/useIntake';

export interface RiuTypeSelectorProps {
  /** Currently selected RIU type */
  selected: RiuType | null;
  /** Called when type is selected */
  onSelect: (type: RiuType) => void;
  /** Whether selection is disabled */
  disabled?: boolean;
}

/**
 * RIU type configuration.
 */
interface RiuTypeConfig {
  type: RiuType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

const riuTypes: RiuTypeConfig[] = [
  {
    type: 'REPORT',
    label: 'Report',
    description: 'Creates case for investigation',
    icon: FileText,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200 hover:border-blue-400',
  },
  {
    type: 'REQUEST_FOR_INFO',
    label: 'Request for Information',
    description: 'Non-issue inquiry',
    icon: HelpCircle,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200 hover:border-amber-400',
  },
  {
    type: 'WRONG_NUMBER',
    label: 'Wrong Number',
    description: 'Log and end call',
    icon: PhoneOff,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200 hover:border-gray-400',
  },
];

/**
 * RIU type selection component with large buttons.
 *
 * @param props - Component props
 * @returns RiuTypeSelector component
 */
export function RiuTypeSelector({
  selected,
  onSelect,
  disabled = false,
}: RiuTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        Call Type <span className="text-destructive">*</span>
      </label>
      <div className="grid grid-cols-3 gap-3">
        {riuTypes.map((config) => {
          const isSelected = selected === config.type;
          const Icon = config.icon;

          return (
            <button
              key={config.type}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(config.type)}
              className={cn(
                'relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                isSelected
                  ? cn(config.bgColor, 'border-primary ring-2 ring-primary/20')
                  : cn('bg-background', config.borderColor)
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center mb-2',
                  isSelected ? config.bgColor : 'bg-muted'
                )}
              >
                <Icon
                  className={cn('h-5 w-5', isSelected ? config.color : 'text-muted-foreground')}
                />
              </div>
              <span
                className={cn(
                  'text-sm font-medium text-center',
                  isSelected ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {config.label}
              </span>
              <span className="text-xs text-muted-foreground text-center mt-1">
                {config.description}
              </span>

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
