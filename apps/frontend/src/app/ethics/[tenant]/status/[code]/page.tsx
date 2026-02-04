'use client';

import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertTriangle, Bell, Home, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusView } from '@/components/ethics/status-view';
import { MessageThread } from '@/components/ethics/message-thread';
import { MessageComposer } from '@/components/ethics/message-composer';
import { useReportStatus } from '@/hooks/useReportStatus';
import Link from 'next/link';

interface StatusDetailPageProps {
  params: {
    tenant: string;
    code: string;
  };
}

/**
 * StatusDetailPage - Status detail page showing report status and message thread.
 *
 * Route: /ethics/[tenant]/status/[code]
 *
 * Features:
 * - Load status via useReportStatus hook
 * - StatusView component for report status
 * - MessageThread component for two-way communication
 * - MessageComposer for sending messages (if case not closed)
 * - Poll for new messages every 30 seconds
 * - Show notification if new message arrives while viewing
 * - "Report a new issue" link in footer
 * - Handle invalid code: redirect back to entry page
 */
export default function StatusDetailPage({ params }: StatusDetailPageProps) {
  const tenantSlug = params.tenant;
  const accessCode = params.code;
  const router = useRouter();
  const { t } = useTranslation('status');

  const {
    status,
    messages,
    isLoading,
    error,
    checkStatus,
    sendMessage,
    markMessagesRead,
    refreshMessages,
  } = useReportStatus();

  const [initialLoad, setInitialLoad] = useState(true);
  const [newMessageNotification, setNewMessageNotification] = useState(false);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);

  // Load status on mount
  useEffect(() => {
    async function loadStatus() {
      const success = await checkStatus(accessCode);
      setInitialLoad(false);

      if (!success) {
        // Invalid code - redirect back to entry page
        router.push(`/ethics/${tenantSlug}/status`);
      }
    }

    loadStatus();
  }, [accessCode, checkStatus, router, tenantSlug]);

  // Track message count for notification
  useEffect(() => {
    if (messages.length > previousMessageCount && previousMessageCount > 0) {
      // New message arrived
      const newInboundMessages = messages.filter(
        (m) => m.direction === 'inbound' && !m.readAt
      );
      if (newInboundMessages.length > 0) {
        setNewMessageNotification(true);
        // Auto-dismiss after 5 seconds
        setTimeout(() => setNewMessageNotification(false), 5000);
      }
    }
    setPreviousMessageCount(messages.length);
  }, [messages, previousMessageCount]);

  // Handle mark messages as read
  const handleMarkRead = useCallback(() => {
    markMessagesRead();
    setNewMessageNotification(false);
  }, [markMessagesRead]);

  // Handle send message
  const handleSendMessage = useCallback(
    async (content: string, attachmentIds?: string[]) => {
      return await sendMessage(content, attachmentIds);
    },
    [sendMessage]
  );

  // Initial loading state
  if (initialLoad) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Loading your report status...</p>
      </div>
    );
  }

  // Error state
  if (error && !status) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to Load Report</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex flex-col gap-2">
            <Link href={`/ethics/${tenantSlug}/status`}>
              <Button variant="outline" className="w-full">
                Try Different Code
              </Button>
            </Link>
            <Link href={`/ethics/${tenantSlug}`}>
              <Button variant="ghost" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // No status loaded (should redirect)
  if (!status) {
    return null;
  }

  return (
    <div className="min-h-[70vh] p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* New Message Notification */}
      {newMessageNotification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in">
          <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
            <Bell className="h-4 w-4" />
            <span>New message received</span>
            <button
              onClick={() => setNewMessageNotification(false)}
              className="ml-2 opacity-70 hover:opacity-100"
              aria-label="Dismiss notification"
            >
              x
            </button>
          </div>
        </div>
      )}

      {/* Page Title */}
      <div className="text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Report Status</h1>
        <p className="text-muted-foreground mt-1">
          Track your report and communicate with the investigator
        </p>
      </div>

      {/* Status View */}
      <StatusView reportStatus={status} />

      {/* Message Thread */}
      <Card className="overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b">
          <h2 className="font-semibold">Messages</h2>
          <p className="text-sm text-muted-foreground">
            Communicate securely with the investigator
          </p>
        </div>
        <MessageThread
          messages={messages}
          hasUnreadMessages={status.hasUnreadMessages}
          onMarkRead={handleMarkRead}
          className="max-h-[400px]"
        />
        {/* Message Composer */}
        <div className="border-t p-4">
          <MessageComposer
            onSend={handleSendMessage}
            disabled={!status.canMessage}
            placeholder={
              status.canMessage
                ? 'Type your message...'
                : 'Case is closed - messaging disabled'
            }
          />
        </div>
      </Card>

      {/* Footer Links */}
      <div className="flex flex-col sm:flex-row gap-2 justify-center pt-4">
        <Link href={`/ethics/${tenantSlug}`}>
          <Button variant="outline" className="w-full sm:w-auto">
            <Home className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        <Link href={`/ethics/${tenantSlug}/report`}>
          <Button variant="ghost" className="w-full sm:w-auto text-primary">
            <Plus className="h-4 w-4 mr-2" />
            Report a New Issue
          </Button>
        </Link>
      </div>

      {/* Privacy Notice */}
      <p className="text-xs text-center text-muted-foreground pt-4">
        All communications are encrypted and confidential.
        Your identity remains protected according to your selected anonymity preference.
      </p>
    </div>
  );
}
