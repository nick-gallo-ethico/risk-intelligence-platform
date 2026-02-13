'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  AlertTriangle,
  ShieldAlert,
  Mail,
  ChevronDown,
  ChevronUp,
  Paperclip,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/common/empty-state';
import {
  useCaseMessages,
  useSendMessage,
  useCheckPii,
} from '@/hooks/use-case-messages';
import type { CaseMessage } from '@/types/message';

interface MessagesTabProps {
  caseId: string;
  reporterAnonymous?: boolean;
}

// Mock email correspondence data (will be replaced with API when available)
interface EmailCorrespondence {
  id: string;
  from: string;
  to: string[];
  subject: string;
  preview: string;
  timestamp: string;
  hasAttachments: boolean;
  isInbound: boolean;
}

/**
 * Format date for message timestamp display
 */
function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Individual message bubble component
 */
function MessageBubble({ message }: { message: CaseMessage }) {
  const isOutbound = message.direction === 'outbound';

  return (
    <div
      className={cn(
        'flex flex-col max-w-[80%] mb-4',
        isOutbound ? 'ml-auto items-end' : 'mr-auto items-start'
      )}
    >
      {message.subject && (
        <span className="text-xs text-muted-foreground mb-1 px-1">
          Re: {message.subject}
        </span>
      )}
      <div
        className={cn(
          'rounded-lg px-4 py-2',
          isOutbound
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
      <div className="flex items-center gap-2 mt-1 px-1">
        <span className="text-xs text-muted-foreground">
          {formatMessageTime(message.createdAt)}
        </span>
        {isOutbound && message.isRead && (
          <span className="text-xs text-muted-foreground">Read</span>
        )}
        {isOutbound && !message.isRead && (
          <span className="text-xs text-muted-foreground">Sent</span>
        )}
      </div>
    </div>
  );
}

/**
 * Email correspondence card component
 */
function EmailCard({ email }: { email: EmailCorrespondence }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className={cn('transition-shadow', isExpanded && 'ring-1 ring-blue-200')}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-gray-50 rounded-t-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs shrink-0',
                      email.isInbound
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    )}
                  >
                    {email.isInbound ? 'Received' : 'Sent'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatMessageTime(email.timestamp)}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 mt-1 truncate">
                  {email.subject}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {email.isInbound ? `From: ${email.from}` : `To: ${email.to.join(', ')}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {email.hasAttachments && (
                  <Paperclip className="h-4 w-4 text-gray-400" />
                )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="border-t pt-3 mt-1">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {email.preview}
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Full Email
                </Button>
                {email.isInbound && (
                  <Button variant="outline" size="sm">
                    Reply
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/**
 * Skeleton loader for messages
 */
function MessagesSkeleton() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Reporter Communication Section Skeleton */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-6" />
          </div>
          <div className="space-y-4">
            <div className="flex flex-col max-w-[80%] mr-auto">
              <Skeleton className="h-16 w-64 rounded-lg" />
              <Skeleton className="h-3 w-20 mt-1" />
            </div>
            <div className="flex flex-col max-w-[80%] ml-auto items-end">
              <Skeleton className="h-12 w-48 rounded-lg" />
              <Skeleton className="h-3 w-16 mt-1" />
            </div>
          </div>
        </div>

        {/* Email Correspondence Section Skeleton */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-6" />
          </div>
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Messages tab component for case detail page.
 *
 * Two sections:
 * 1. Reporter Communication - Anonymous chat thread with the reporter
 * 2. Email Correspondence - Email threads with stakeholders
 *
 * Features:
 * - Section count badges
 * - Chronological message thread
 * - Send message form with PII warning
 * - Loading and empty states
 * - Anonymous reporter indicator
 */
export function MessagesTab({ caseId, reporterAnonymous }: MessagesTabProps) {
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');
  const [showSubject, setShowSubject] = useState(false);
  const [piiWarnings, setPiiWarnings] = useState<string[]>([]);
  const [acknowledgedPii, setAcknowledgedPii] = useState(false);
  const [activeSection, setActiveSection] = useState<'reporter' | 'email'>('reporter');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useCaseMessages(caseId);
  const sendMutation = useSendMessage(caseId);
  const checkPiiMutation = useCheckPii();

  // Mock email correspondence (will be replaced with API)
  const emailCorrespondence: EmailCorrespondence[] = [
    // Placeholder - will be populated by API
  ];

  // Scroll to bottom when messages load or new message added
  useEffect(() => {
    if (data?.messages?.length && activeSection === 'reporter') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data?.messages?.length, activeSection]);

  const handleSend = useCallback(async () => {
    if (!content.trim()) return;

    // Check for PII if not already acknowledged
    if (!acknowledgedPii && !piiWarnings.length) {
      try {
        const result = await checkPiiMutation.mutateAsync(content);
        if (result.hasPii && result.warnings.length > 0) {
          setPiiWarnings(result.warnings);
          return;
        }
      } catch {
        // If PII check fails, proceed anyway but warn
        console.warn('PII check failed, proceeding with send');
      }
    }

    try {
      await sendMutation.mutateAsync({
        content: content.trim(),
        subject: subject.trim() || undefined,
        acknowledgedPiiWarnings: acknowledgedPii ? piiWarnings : undefined,
      });

      // Reset form
      setContent('');
      setSubject('');
      setShowSubject(false);
      setPiiWarnings([]);
      setAcknowledgedPii(false);
      toast.success('Message sent');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      toast.error(message);
    }
  }, [content, subject, acknowledgedPii, piiWarnings, checkPiiMutation, sendMutation]);

  const handleAcknowledgePii = useCallback(() => {
    setAcknowledgedPii(true);
  }, []);

  const handleDismissPii = useCallback(() => {
    setPiiWarnings([]);
    setAcknowledgedPii(false);
  }, []);

  if (isLoading) {
    return <MessagesSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load messages. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const messages = data?.messages || [];
  const reporterMessageCount = messages.length;
  const emailCount = emailCorrespondence.length;

  return (
    <div className="h-full flex flex-col">
      {/* Section tabs */}
      <div className="px-4 py-2 bg-gray-50 border-b flex gap-4">
        <button
          onClick={() => setActiveSection('reporter')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            activeSection === 'reporter'
              ? 'bg-white shadow-sm text-blue-600'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Reporter Communication
          {reporterMessageCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {reporterMessageCount}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setActiveSection('email')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            activeSection === 'email'
              ? 'bg-white shadow-sm text-blue-600'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          <Mail className="h-4 w-4" />
          Email Correspondence
          {emailCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {emailCount}
            </Badge>
          )}
        </button>
      </div>

      {/* Anonymous reporter badge */}
      {reporterAnonymous && activeSection === 'reporter' && (
        <div className="px-4 py-2 bg-amber-50 border-b flex items-center justify-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Anonymous Reporter
          </Badge>
          <span className="text-xs text-muted-foreground">
            Messages are relayed anonymously
          </span>
        </div>
      )}

      {/* Content area */}
      {activeSection === 'reporter' ? (
        <>
          {/* Reporter messages list */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No messages yet"
                description="Start a conversation with the reporter. Messages are securely relayed through an encrypted channel."
              />
            ) : (
              <div>
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* PII Warning */}
          {piiWarnings.length > 0 && !acknowledgedPii && (
            <div className="px-4 py-2 border-t bg-amber-50">
              <Alert variant="default" className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">PII Detected</AlertTitle>
                <AlertDescription className="text-amber-700">
                  <p className="mb-2">
                    Your message may contain personally identifying information:
                  </p>
                  <ul className="list-disc list-inside text-sm mb-3">
                    {piiWarnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDismissPii}
                      className="border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                      Edit Message
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAcknowledgePii}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      Send Anyway
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Send message form */}
          <div className="p-4 border-t bg-white">
            {showSubject && (
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject (optional)"
                className="mb-2"
              />
            )}
            <div className="flex gap-2">
              <div className="flex-1">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Type your message..."
                  className="min-h-[80px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handleSend();
                    }
                  }}
                />
                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={() => setShowSubject(!showSubject)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {showSubject ? 'Hide subject' : 'Add subject'}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    Ctrl+Enter to send
                  </span>
                </div>
              </div>
              <Button
                onClick={handleSend}
                disabled={!content.trim() || sendMutation.isPending}
                size="icon"
                className="h-20 w-12"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        /* Email correspondence section */
        <div className="flex-1 overflow-y-auto p-4">
          {emailCorrespondence.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No email correspondence"
              description="Email threads with stakeholders will appear here."
              actionLabel="Compose Email"
              onAction={() => toast.info('Email composition coming soon')}
            />
          ) : (
            <div className="space-y-3">
              {emailCorrespondence.map((email) => (
                <EmailCard key={email.id} email={email} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
