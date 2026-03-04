"use client";

/**
 * ChatbotWidget - Floating chatbot FAB and panel
 *
 * STUB FILE: This is a placeholder created by 44-09 plan execution.
 * The actual implementation will be provided by 44-08 plan.
 *
 * Props:
 * - tenantSlug: For anonymous/ethics portal mode (no auth required)
 * - token: For authenticated/employee portal mode (JWT token)
 */

import { useState } from "react";
import { MessageCircle, X, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ChatbotWidgetProps {
  /** Tenant slug for anonymous chatbot (Ethics Portal) */
  tenantSlug?: string;
  /** JWT token for authenticated chatbot (Employee Portal) */
  token?: string;
  /** Custom CSS class */
  className?: string;
}

/**
 * ChatbotWidget provides a floating action button (FAB) that opens
 * a chatbot panel for user interaction.
 *
 * Anonymous mode (Ethics Portal): Pass tenantSlug
 * Authenticated mode (Employee Portal): Pass token
 */
export function ChatbotWidget({
  tenantSlug,
  token,
  className,
}: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Determine mode based on props
  const isAnonymous = !!tenantSlug && !token;
  const isAuthenticated = !!token;

  // Don't render if neither mode is configured
  if (!isAnonymous && !isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* FAB Button - Bottom right corner */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
            "bg-primary hover:bg-primary/90",
            "transition-transform hover:scale-105",
            className,
          )}
          aria-label="Open chatbot"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "w-[380px] max-w-[calc(100vw-3rem)]",
            isMinimized ? "h-14" : "h-[600px] max-h-[calc(100vh-3rem)]",
            "bg-background border rounded-lg shadow-xl",
            "flex flex-col overflow-hidden",
            "transition-all duration-200",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-muted/30">
            <span className="font-medium text-sm">
              {isAnonymous ? "Ethics Assistant" : "Employee Assistant"}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsMinimized(!isMinimized)}
                aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
                aria-label="Close chatbot"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat Content (placeholder) */}
          {!isMinimized && (
            <div className="flex-1 flex items-center justify-center p-4 text-muted-foreground text-sm">
              <p>Chatbot implementation pending (44-08)</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default ChatbotWidget;
