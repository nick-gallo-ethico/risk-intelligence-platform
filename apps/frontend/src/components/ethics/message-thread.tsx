'use client';

import * as React from 'react';
import { useEffect, useRef } from 'react';
import { Check, CheckCheck, Download, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime, formatTime } from '@/lib/date-utils';
import { Badge } from '@/components/ui/badge';
import type { ReporterMessage, MessageAttachment, StructuredQuestionField } from '@/types/ethics-portal.types';

export interface MessageThreadProps {
  /** Messages to display */
  messages: ReporterMessage[];
  /** Whether there are unread messages */
  hasUnreadMessages?: boolean;
  /** Callback when messages should be marked as read */
  onMarkRead?: () => void;
  /** Optional class name for styling */
  className?: string;
}

/**
 * MessageThread - Two-way message display for reporter/investigator communication.
 *
 * Features:
 * - Chronological message list (oldest first, newest at bottom)
 * - Message bubbles: inbound (investigator) left-aligned, outbound (reporter) right-aligned
 * - Read receipts for outbound messages
 * - Unread message indicators
 * - Auto-scroll to newest message
 * - Rich text (markdown) support
 * - Attachment previews
 * - Structured question form styling
 */
export function MessageThread({
  messages,
  hasUnreadMessages,
  onMarkRead,
  className,
}: MessageThreadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on mount and when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark messages as read when visible
  useEffect(() => {
    if (hasUnreadMessages && onMarkRead) {
      const timer = setTimeout(() => {
        onMarkRead();
      }, 1000); // Wait 1 second before marking read
      return () => clearTimeout(timer);
    }
  }, [hasUnreadMessages, onMarkRead]);

  if (messages.length === 0) {
    return (
      <div className={cn('p-8 text-center text-muted-foreground', className)}>
        <p>No messages yet.</p>
        <p className="text-sm mt-2">
          Messages from the investigator will appear here.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('flex flex-col gap-4 p-4 overflow-y-auto', className)}
      role="log"
      aria-label="Message thread"
      aria-live="polite"
    >
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          isUnread={
            message.direction === 'inbound' && !message.readAt && hasUnreadMessages
          }
          showDateSeparator={
            index === 0 ||
            !isSameDay(messages[index - 1].createdAt, message.createdAt)
          }
        />
      ))}
      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}

interface MessageBubbleProps {
  message: ReporterMessage;
  isUnread?: boolean;
  showDateSeparator?: boolean;
}

/**
 * Individual message bubble component.
 */
function MessageBubble({ message, isUnread, showDateSeparator }: MessageBubbleProps) {
  const isInbound = message.direction === 'inbound';

  return (
    <>
      {/* Date separator */}
      {showDateSeparator && (
        <div className="flex items-center justify-center my-2">
          <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {formatDateLabel(message.createdAt)}
          </div>
        </div>
      )}

      <div
        className={cn(
          'flex flex-col max-w-[85%] sm:max-w-[70%]',
          isInbound ? 'self-start' : 'self-end'
        )}
      >
        {/* Unread badge */}
        {isUnread && (
          <Badge
            variant="default"
            className="self-start mb-1 text-xs px-2 py-0.5"
          >
            New
          </Badge>
        )}

        {/* Message content */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5',
            isInbound
              ? 'bg-muted text-foreground rounded-tl-sm'
              : 'bg-primary text-primary-foreground rounded-tr-sm'
          )}
        >
          {/* Structured question form */}
          {message.isStructuredQuestion && message.structuredFields ? (
            <StructuredQuestionDisplay fields={message.structuredFields} />
          ) : (
            <MessageContent content={message.content} />
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <AttachmentsDisplay
              attachments={message.attachments}
              isOutbound={!isInbound}
            />
          )}
        </div>

        {/* Timestamp and read receipt */}
        <div
          className={cn(
            'flex items-center gap-1 mt-1 text-xs text-muted-foreground',
            isInbound ? 'justify-start' : 'justify-end'
          )}
        >
          <span>{formatTime(message.createdAt)}</span>
          {/* Read receipt for outbound messages */}
          {!isInbound && (
            <span className="ml-1">
              {message.readAt ? (
                <CheckCheck className="h-3.5 w-3.5 text-primary" aria-label="Read" />
              ) : (
                <Check className="h-3.5 w-3.5" aria-label="Sent" />
              )}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

interface MessageContentProps {
  content: string;
}

/**
 * Render message content with basic markdown support.
 */
function MessageContent({ content }: MessageContentProps) {
  // Simple markdown rendering - supports bold, italic, links, line breaks
  const formatted = content
    // Escape HTML
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Links
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline hover:no-underline">$1</a>'
    )
    // Line breaks
    .replace(/\n/g, '<br />');

  return (
    <div
      className="whitespace-pre-wrap break-words"
      dangerouslySetInnerHTML={{ __html: formatted }}
    />
  );
}

interface StructuredQuestionDisplayProps {
  fields: StructuredQuestionField[];
}

/**
 * Display structured questions from the investigator.
 */
function StructuredQuestionDisplay({ fields }: StructuredQuestionDisplayProps) {
  return (
    <div className="space-y-3">
      <div className="font-medium border-b pb-2 mb-2">
        Please answer the following questions:
      </div>
      {fields.map((field) => (
        <div key={field.id} className="space-y-1">
          <label className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </label>
          {field.type === 'text' && (
            <div className="text-sm opacity-70">{field.placeholder || 'Text answer'}</div>
          )}
          {field.type === 'textarea' && (
            <div className="text-sm opacity-70">{field.placeholder || 'Detailed answer'}</div>
          )}
          {field.type === 'select' && field.options && (
            <div className="text-sm opacity-70">
              Options: {field.options.join(', ')}
            </div>
          )}
          {field.type === 'boolean' && (
            <div className="text-sm opacity-70">Yes / No</div>
          )}
          {field.type === 'date' && (
            <div className="text-sm opacity-70">Date selection</div>
          )}
        </div>
      ))}
    </div>
  );
}

interface AttachmentsDisplayProps {
  attachments: MessageAttachment[];
  isOutbound: boolean;
}

/**
 * Display message attachments.
 */
function AttachmentsDisplay({ attachments, isOutbound }: AttachmentsDisplayProps) {
  return (
    <div className="mt-2 pt-2 border-t border-current/10 space-y-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className={cn(
            'flex items-center gap-2 text-sm',
            isOutbound ? 'text-primary-foreground/80' : 'text-foreground/80'
          )}
        >
          {/* Thumbnail for images */}
          {attachment.thumbnailUrl ? (
            <img
              src={attachment.thumbnailUrl}
              alt={attachment.filename}
              className="w-12 h-12 rounded object-cover"
            />
          ) : (
            <Paperclip className="h-4 w-4 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="truncate font-medium">{attachment.filename}</div>
            <div className="text-xs opacity-70">
              {formatFileSize(attachment.size)}
            </div>
          </div>
          {attachment.downloadUrl && (
            <a
              href={attachment.downloadUrl}
              download={attachment.filename}
              className={cn(
                'p-1.5 rounded hover:bg-current/10 transition-colors',
                isOutbound ? 'text-primary-foreground' : 'text-foreground'
              )}
              aria-label={`Download ${attachment.filename}`}
            >
              <Download className="h-4 w-4" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Check if two ISO date strings are on the same day.
 */
function isSameDay(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Format date label for date separators.
 */
function formatDateLabel(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(dateString, today.toISOString())) {
    return 'Today';
  }
  if (isSameDay(dateString, yesterday.toISOString())) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format file size in human-readable format.
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
