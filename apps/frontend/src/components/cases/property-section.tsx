'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface PropertySectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Collapsible property section for the case properties panel.
 * Each section can be expanded/collapsed by clicking the header.
 */
export function PropertySection({
  title,
  children,
  defaultOpen = true,
  className,
}: PropertySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader
            className={cn(
              'pb-2 cursor-pointer hover:bg-gray-50 transition-colors select-none',
              isOpen && 'border-b border-gray-100'
            )}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">
                {title}
              </CardTitle>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-gray-500 transition-transform duration-200',
                  isOpen && 'rotate-180'
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-2">{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
