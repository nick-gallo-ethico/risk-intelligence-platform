"use client";

/**
 * ChatbotLauncher - Floating action button (FAB) to open the chatbot.
 *
 * Fixed position button in the bottom-right corner that toggles the
 * chatbot panel open/closed.
 *
 * @example
 * ```tsx
 * <ChatbotLauncher
 *   isOpen={isOpen}
 *   onClick={() => setIsOpen(!isOpen)}
 *   hasUnreadMessages={hasUnread}
 * />
 * ```
 */

import { Button } from "@/components/ui/button";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Props for the ChatbotLauncher component.
 */
export interface ChatbotLauncherProps {
  /** Whether the chat panel is currently open */
  isOpen: boolean;
  /** Callback when the launcher is clicked */
  onClick: () => void;
  /** Whether there are unread messages (shows indicator) */
  hasUnreadMessages?: boolean;
  /** Custom CSS class */
  className?: string;
}

/**
 * ChatbotLauncher provides a floating action button (FAB) to toggle
 * the chatbot panel. Shows an indicator when there are unread messages.
 */
export function ChatbotLauncher({
  isOpen,
  onClick,
  hasUnreadMessages = false,
  className,
}: ChatbotLauncherProps) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "h-14 w-14 rounded-full shadow-lg",
        "bg-primary hover:bg-primary/90",
        "transition-all duration-200 hover:scale-105",
        // Rotate icon when open
        isOpen && "rotate-0",
        className,
      )}
      aria-label={isOpen ? "Close chatbot" : "Open chatbot"}
    >
      {isOpen ? (
        <X className="h-6 w-6 transition-transform" />
      ) : (
        <>
          <MessageCircle className="h-6 w-6 transition-transform" />
          {/* Unread indicator */}
          {hasUnreadMessages && (
            <span
              className={cn(
                "absolute top-0 right-0 h-3 w-3 rounded-full",
                "bg-destructive border-2 border-background",
                "animate-pulse",
              )}
              aria-label="Unread messages"
            />
          )}
        </>
      )}
    </Button>
  );
}

export default ChatbotLauncher;
