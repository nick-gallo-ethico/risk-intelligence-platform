'use client';

import { cn } from '@/lib/utils';

interface RichTextDisplayProps {
  /** HTML content to display */
  content?: string | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Rich text display component for viewing HTML content.
 *
 * Renders sanitized HTML with consistent prose styling.
 * For editing, use RichTextEditor instead.
 */
export function RichTextDisplay({ content, className }: RichTextDisplayProps) {
  if (!content) {
    return (
      <div className={cn('text-muted-foreground italic', className)}>
        No content available.
      </div>
    );
  }

  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none',
        'prose-p:my-2 prose-ul:my-2 prose-ol:my-2',
        'prose-headings:font-semibold prose-headings:text-foreground',
        'prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg',
        'prose-blockquote:border-l-4 prose-blockquote:border-muted-foreground prose-blockquote:pl-4 prose-blockquote:italic',
        'prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm',
        'prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-md',
        'prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80',
        'prose-table:border prose-table:border-border',
        'prose-th:border prose-th:border-border prose-th:p-2 prose-th:bg-muted',
        'prose-td:border prose-td:border-border prose-td:p-2',
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
