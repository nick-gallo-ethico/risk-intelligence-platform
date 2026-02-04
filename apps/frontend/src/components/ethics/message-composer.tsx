'use client';

import * as React from 'react';
import { useState, useCallback, useRef } from 'react';
import { Send, Paperclip, Loader2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface MessageComposerProps {
  /** Callback when message is sent */
  onSend: (content: string, attachmentIds?: string[]) => Promise<boolean>;
  /** Whether the composer is disabled (e.g., case closed) */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Maximum character limit (optional) */
  maxLength?: number;
  /** Optional class name */
  className?: string;
}

/**
 * MessageComposer - Input area for sending messages.
 *
 * Features:
 * - Textarea for message content
 * - Attachment button (placeholder for future file upload)
 * - Send button with loading state
 * - Character counter (optional)
 * - Error handling with retry
 * - Disabled state when case is closed
 */
export function MessageComposer({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
  maxLength = 5000,
  className,
}: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle send
  const handleSend = useCallback(async () => {
    if (!content.trim() || isSending || disabled) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // For now, we don't have attachment upload implemented
      // In the future, this would upload files and get attachment IDs
      const success = await onSend(content.trim());

      if (success) {
        setContent('');
        setAttachments([]);
        textareaRef.current?.focus();
      } else {
        setError('Failed to send message. Please try again.');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [content, isSending, disabled, onSend]);

  // Handle Enter to send (Shift+Enter for newline)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Handle file selection (placeholder)
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setAttachments((prev) => [...prev, ...Array.from(files)]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Remove attachment
  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Handle retry
  const handleRetry = useCallback(() => {
    setError(null);
    handleSend();
  }, [handleSend]);

  const charCount = content.length;
  const isOverLimit = maxLength && charCount > maxLength;
  const canSend = content.trim().length > 0 && !isOverLimit && !isSending && !disabled;

  if (disabled) {
    return (
      <div className={cn('p-4 bg-muted rounded-lg text-center', className)}>
        <p className="text-muted-foreground text-sm">
          This report has been closed. Messaging is no longer available.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Error message */}
      {error && (
        <div className="flex items-center justify-between gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-1.5 bg-background px-2 py-1 rounded text-sm"
            >
              <Paperclip className="h-3 w-3 text-muted-foreground" />
              <span className="max-w-[150px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="p-0.5 hover:bg-muted rounded"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="flex items-end gap-2 p-2 border rounded-lg bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {/* Attachment button (hidden file input) */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isSending}
          className={cn(
            'flex-1 min-h-[40px] max-h-[200px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0',
            isOverLimit && 'text-destructive'
          )}
          rows={1}
          aria-label="Message content"
        />

        {/* Send button */}
        <Button
          type="button"
          variant="default"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={handleSend}
          disabled={!canSend}
          aria-label={isSending ? 'Sending...' : 'Send message'}
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Character counter */}
      {maxLength && (
        <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span className={isOverLimit ? 'text-destructive font-medium' : ''}>
            {charCount} / {maxLength}
          </span>
        </div>
      )}
    </div>
  );
}
