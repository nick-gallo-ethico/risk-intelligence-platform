"use client";

/**
 * ChatbotWidget - Floating chatbot FAB and panel with WebSocket integration.
 *
 * Main container component that orchestrates the chatbot experience:
 * - ChatbotLauncher FAB in bottom-right corner
 * - ChatbotPanel with message history and input
 * - ConsentDialog for anonymous users (GDPR compliance)
 * - WebSocket connection via useChatbot hook
 *
 * @example
 * ```tsx
 * // Anonymous mode (Ethics Portal)
 * <ChatbotWidget tenantSlug="acme-corp" />
 *
 * // Authenticated mode (Employee Portal)
 * <ChatbotWidget token={accessToken} />
 * ```
 */

import { useState, useCallback } from "react";
import { X, Minimize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatbot } from "@/hooks/use-chatbot";
import { ChatbotPanel } from "./chatbot-panel";
import { ChatbotLauncher } from "./chatbot-launcher";
import { ConsentDialog } from "./consent-dialog";

/**
 * Props for the ChatbotWidget component.
 */
export interface ChatbotWidgetProps {
  /** Tenant slug for anonymous chatbot (Ethics Portal) */
  tenantSlug?: string;
  /** JWT token for authenticated chatbot (Employee Portal) */
  token?: string;
  /** Organization name for consent dialog */
  organizationName?: string;
  /** Callback when user declines consent */
  onDeclineConsent?: () => void;
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
  organizationName,
  onDeclineConsent,
  className,
}: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Determine mode based on props
  const isAnonymous = !!tenantSlug && !token;
  const isAuthenticated = !!token;

  // Connect to chatbot WebSocket
  const {
    messages,
    send,
    acceptConsent,
    stop,
    reset,
    isConnected,
    isStreaming,
    consentRequired,
    error,
  } = useChatbot({
    mode: isAuthenticated ? "authenticated" : "anonymous",
    tenantSlug: isAnonymous ? tenantSlug : undefined,
    enabled: isOpen, // Only connect when panel is open
  });

  // Handle consent decline
  const handleDeclineConsent = useCallback(() => {
    setIsOpen(false);
    onDeclineConsent?.();
  }, [onDeclineConsent]);

  // Handle launcher click
  const handleLauncherClick = useCallback(() => {
    setIsOpen((prev) => !prev);
    setIsMinimized(false);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Handle minimize/expand
  const handleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  // Handle reset conversation
  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  // Don't render if neither mode is configured
  if (!isAnonymous && !isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Consent Dialog (anonymous users only) */}
      {isAnonymous && consentRequired && isOpen && (
        <ConsentDialog
          open={consentRequired}
          onAccept={acceptConsent}
          onDecline={handleDeclineConsent}
          organizationName={organizationName}
        />
      )}

      {/* FAB Launcher (when panel is closed) */}
      {!isOpen && (
        <ChatbotLauncher
          isOpen={isOpen}
          onClick={handleLauncherClick}
          className={className}
        />
      )}

      {/* Chat Panel (when open) */}
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
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {isAnonymous ? "Ethics Assistant" : "Employee Assistant"}
              </span>
              {/* Connection indicator */}
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  isConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse",
                )}
                title={isConnected ? "Connected" : "Connecting..."}
              />
            </div>
            <div className="flex items-center gap-1">
              {/* Reset button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleReset}
                disabled={messages.length === 0 || isStreaming}
                aria-label="Reset conversation"
                title="Reset conversation"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              {/* Minimize button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleMinimize}
                aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClose}
                aria-label="Close chatbot"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <ChatbotPanel
              messages={messages}
              onSend={send}
              onStop={stop}
              isStreaming={isStreaming}
              isConnected={isConnected}
              error={error}
              className="flex-1"
            />
          )}
        </div>
      )}
    </>
  );
}

export default ChatbotWidget;
