'use client';

import { Globe } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LanguageSwitcherProps {
  /** Optional class name for styling */
  className?: string;
  /** Show icon before the language name */
  showIcon?: boolean;
  /** Size variant */
  size?: 'sm' | 'default';
}

/**
 * Language switcher component for the Ethics Portal.
 * Allows users to switch between supported languages.
 * Persists selection to localStorage and updates document.dir for RTL support.
 */
export function LanguageSwitcher({
  className,
  showIcon = true,
  size = 'default',
}: LanguageSwitcherProps) {
  const { currentLanguage, changeLanguage, languages } = useLanguage();

  return (
    <Select value={currentLanguage.code} onValueChange={changeLanguage}>
      <SelectTrigger
        className={`${size === 'sm' ? 'h-8 text-xs' : 'h-10'} w-auto gap-2 ${className || ''}`}
        aria-label="Select language"
      >
        {showIcon && <Globe className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem
            key={lang.code}
            value={lang.code}
            className="cursor-pointer"
          >
            <span className={lang.dir === 'rtl' ? 'font-sans' : ''}>
              {lang.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
