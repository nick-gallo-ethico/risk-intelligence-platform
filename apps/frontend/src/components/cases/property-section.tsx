"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, Settings2 } from "lucide-react";

interface PropertySectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  /** Show gear icon for section customization (future feature) */
  showSettings?: boolean;
  /** Callback when settings gear is clicked */
  onSettingsClick?: () => void;
}

/**
 * Collapsible property section for the case properties panel.
 *
 * Features:
 * - Click header to expand/collapse
 * - Animated chevron that rotates 90 degrees on expand
 * - Optional gear icon for future customization (non-functional by default)
 */
export function PropertySection({
  title,
  children,
  defaultOpen = true,
  className,
  showSettings = true,
  onSettingsClick,
}: PropertySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader
          className={cn(
            "pb-2 cursor-pointer hover:bg-muted/50 transition-colors select-none py-3 px-4",
            isOpen && "border-b border-border"
          )}
        >
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2 flex-1">
                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0",
                    isOpen && "rotate-90"
                  )}
                />
                <CardTitle className="text-sm font-semibold text-foreground">
                  {title}
                </CardTitle>
              </div>
            </CollapsibleTrigger>
            {showSettings && (
              <Settings2
                className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onSettingsClick?.();
                }}
              />
            )}
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-2">{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
