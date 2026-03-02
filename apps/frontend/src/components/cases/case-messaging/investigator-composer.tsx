"use client";

import * as React from "react";
import { useState, useCallback, useRef, useEffect } from "react";
import { Send, Loader2, MessageSquare, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PiiWarningDialog } from "./pii-warning-dialog";
import { MessageThread } from "@/components/ethics/message-thread";
import { toast } from "@/components/ui/toaster";
import {
  useCaseMessages,
  useSendMessage,
  useCheckPii,
} from "@/hooks/use-case-messages";
import type { ReporterMessage } from "@/types/ethics-portal.types";

export interface InvestigatorComposerProps {
  /** Case ID */
  caseId: string;
  /** Whether reporter can receive messages (has email/access code) */
  canMessage: boolean;
  /** Callback after successful send */
  onMessageSent?: () => void;
  /** Optional class name */
  className?: string;
}

/**
 * InvestigatorComposer - Compact message composition and thread view for investigators.
 *
 * Features:
 * - Message thread display (reuses MessageThread component)
 * - Message composition with PII detection
 * - PII warning dialog before sending
 * - Real-time sending state
 * - Compact card format for right sidebar
 */
export function InvestigatorComposer({
  caseId,
  canMessage,
  onMessageSent,
  className,
}: InvestigatorComposerProps) {
  const [content, setContent] = useState("");
  const [showPiiDialog, setShowPiiDialog] = useState(false);
  const [piiWarnings, setPiiWarnings] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use existing hooks
  const { data, isLoading } = useCaseMessages(caseId);
  const sendMutation = useSendMessage(caseId);
  const checkPiiMutation = useCheckPii();

  const messages = data?.messages || [];

  // Transform messages to ReporterMessage format for MessageThread
  const transformedMessages: ReporterMessage[] = messages.map((m) => ({
    id: m.id,
    direction: m.direction,
    content: m.content,
    createdAt: m.createdAt,
    readAt: m.readAt,
  }));

  const hasUnreadFromReporter = messages.some(
    (m) => m.direction === "inbound" && !m.isRead,
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSendMessage = useCallback(
    async (acknowledgedWarnings?: string[]) => {
      if (!content.trim() || sendMutation.isPending) return;

      try {
        await sendMutation.mutateAsync({
          content: content.trim(),
          acknowledgedPiiWarnings: acknowledgedWarnings,
        });

        // Success
        setContent("");
        setPiiWarnings([]);
        setShowPiiDialog(false);
        toast.success("Message sent. The reporter will be notified.");
        onMessageSent?.();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to send message",
        );
      }
    },
    [content, sendMutation, onMessageSent],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!content.trim()) return;

      // Check for PII first
      try {
        const piiResult = await checkPiiMutation.mutateAsync(content);

        if (piiResult.hasPii && piiResult.warnings.length > 0) {
          setPiiWarnings(piiResult.warnings);
          setShowPiiDialog(true);
        } else {
          await handleSendMessage();
        }
      } catch {
        // If PII check fails, proceed anyway
        console.warn("PII check failed, proceeding with send");
        await handleSendMessage();
      }
    },
    [content, checkPiiMutation, handleSendMessage],
  );

  const handleProceed = useCallback(
    async (acknowledgedWarnings: string[]) => {
      setShowPiiDialog(false);
      await handleSendMessage(acknowledgedWarnings);
    },
    [handleSendMessage],
  );

  const handleCancelPii = useCallback(() => {
    setShowPiiDialog(false);
    // Keep content for editing
  }, []);

  if (!canMessage) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="h-4 w-4" />
            Reporter Communication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Messaging not available.</p>
            <p className="text-xs mt-1">
              Reporter did not provide contact information or case is closed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isSending = sendMutation.isPending;
  const isCheckingPii = checkPiiMutation.isPending;

  return (
    <>
      <Card className={cn("", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4" />
              Reporter Communication
            </span>
            {hasUnreadFromReporter && (
              <Badge variant="default" className="text-xs">
                New
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Message Thread */}
          {isLoading ? (
            <div className="h-[200px] flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length > 0 ? (
            <div className="border rounded-lg max-h-[200px] overflow-y-auto">
              <MessageThread
                messages={transformedMessages}
                hasUnreadMessages={hasUnreadFromReporter}
              />
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground border rounded-lg">
              <MessageSquare className="h-5 w-5 mx-auto mb-2 opacity-50" />
              <p>No messages yet.</p>
              <p className="text-xs mt-1">
                Start a conversation with the reporter.
              </p>
            </div>
          )}

          {/* Composer */}
          <form onSubmit={handleSubmit} className="space-y-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message to the reporter..."
              rows={2}
              disabled={isSending}
              className="resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Messages are checked for PII.
              </p>
              <Button
                type="submit"
                disabled={!content.trim() || isSending || isCheckingPii}
                size="sm"
              >
                {isSending || isCheckingPii ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Send
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* PII Warning Dialog */}
      <PiiWarningDialog
        open={showPiiDialog}
        onOpenChange={setShowPiiDialog}
        warnings={piiWarnings}
        onProceed={handleProceed}
        onCancel={handleCancelPii}
      />
    </>
  );
}
