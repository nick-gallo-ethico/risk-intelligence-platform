"use client";

/**
 * ChatbotPanel - The main chat interface panel.
 *
 * Displays message history, input field, and streaming indicators.
 * Used inside ChatbotWidget when the panel is expanded.
 *
 * @example
 * ```tsx
 * <ChatbotPanel
 *   messages={messages}
 *   onSend={send}
 *   isStreaming={isStreaming}
 *   isConnected={isConnected}
 *   onStop={stop}
 * />
 * ```
 */

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Square, Loader2, User, Bot, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/hooks/use-chatbot";

/**
 * Props for the ChatbotPanel component.
 */
export interface ChatbotPanelProps {
  /** List of chat messages */
  messages: ChatMessage[];
  /** Callback to send a message */
  onSend: (message: string) => void;
  /** Callback to stop streaming */
  onStop: () => void;
  /** Whether a response is currently streaming */
  isStreaming: boolean;
  /** Whether connected to WebSocket */
  isConnected: boolean;
  /** Error message to display */
  error?: string | null;
  /** Custom CSS class */
  className?: string;
}

/**
 * Format timestamp for display.
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * ChatbotPanel provides the chat interface with messages and input.
 */
export function ChatbotPanel({
  messages,
  onSend,
  onStop,
  isStreaming,
  isConnected,
  error,
  className,
}: ChatbotPanelProps) {
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (!input.trim() || isStreaming || !isConnected) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {/* Welcome message if no messages */}
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-sm">How can I help you today?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Ask me about policies, compliance, or how to file a report.
              </p>
            </div>
          )}

          {/* Message list */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "flex-row-reverse" : "flex-row",
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted",
                )}
              >
                {message.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>

              {/* Message bubble */}
              <div
                className={cn(
                  "flex flex-col max-w-[80%]",
                  message.role === "user" ? "items-end" : "items-start",
                )}
              >
                <div
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  {/* Message content */}
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                    {message.isStreaming && (
                      <span className="inline-block w-1 h-4 ml-0.5 bg-current animate-pulse" />
                    )}
                  </p>
                </div>

                {/* Timestamp */}
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          ))}

          {/* Streaming indicator when waiting for response */}
          {isStreaming &&
            messages.length > 0 &&
            !messages[messages.length - 1]?.isStreaming && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
        </div>
      </ScrollArea>

      {/* Error display */}
      {error && (
        <div className="mx-4 mb-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? "Type your message..." : "Connecting..."}
            disabled={!isConnected || isStreaming}
            className="flex-1"
          />
          {isStreaming ? (
            <Button
              variant="outline"
              size="icon"
              onClick={onStop}
              aria-label="Stop response"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || !isConnected}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Connection status */}
        {!isConnected && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Connecting to assistant...
          </p>
        )}
      </div>
    </div>
  );
}

export default ChatbotPanel;
