'use client';

import { useMemo } from 'react';
import { diffWords, type Change } from 'diff';

import { cn } from '@/lib/utils';
import { RichTextDisplay } from '@/components/rich-text/rich-text-display';

interface PolicyVersionDiffProps {
  /** Content from the older version */
  oldContent: string;
  /** Content from the newer version */
  newContent: string;
  /** Display mode: inline (default) or side-by-side */
  mode?: 'inline' | 'side-by-side';
}

/**
 * Policy version diff component.
 *
 * Compares two policy versions and highlights changes:
 * - Inline mode: additions green, deletions red strikethrough
 * - Side-by-side mode: full content in two columns
 *
 * Uses the 'diff' library for text comparison.
 */
export function PolicyVersionDiff({
  oldContent,
  newContent,
  mode = 'inline',
}: PolicyVersionDiffProps) {
  // Compute diff between stripped HTML content
  const differences = useMemo(() => {
    const oldText = stripHtml(oldContent);
    const newText = stripHtml(newContent);
    return diffWords(oldText, newText);
  }, [oldContent, newContent]);

  if (mode === 'side-by-side') {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-medium text-muted-foreground mb-3 text-sm uppercase tracking-wider">
            Previous Version
          </h4>
          <RichTextDisplay content={oldContent} />
        </div>
        <div className="border rounded-lg p-4">
          <h4 className="font-medium text-muted-foreground mb-3 text-sm uppercase tracking-wider">
            Current Version
          </h4>
          <RichTextDisplay content={newContent} />
        </div>
      </div>
    );
  }

  // Inline mode with diff highlighting
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {differences.map((part, index) => (
        <DiffSegment key={index} part={part} />
      ))}
    </div>
  );
}

interface DiffSegmentProps {
  part: Change;
}

function DiffSegment({ part }: DiffSegmentProps) {
  if (part.added) {
    return (
      <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-sm px-0.5">
        {part.value}
      </span>
    );
  }

  if (part.removed) {
    return (
      <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 line-through rounded-sm px-0.5">
        {part.value}
      </span>
    );
  }

  return <span>{part.value}</span>;
}

/**
 * Strip HTML tags from content for text comparison.
 * Preserves text content and structure (newlines for block elements).
 */
function stripHtml(html: string): string {
  if (!html) return '';

  // Replace block elements with newlines to preserve structure
  let text = html
    .replace(/<\/?(p|div|h[1-6]|li|br|tr)[^>]*>/gi, '\n')
    .replace(/<\/?(ul|ol|table|thead|tbody)[^>]*>/gi, '\n\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Normalize whitespace (but preserve paragraph breaks)
  text = text
    .split('\n\n')
    .map((para) => para.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');

  return text.trim();
}

/**
 * Decode common HTML entities.
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&mdash;': '\u2014',
    '&ndash;': '\u2013',
    '&hellip;': '\u2026',
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'g'), char);
  }

  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  );

  return result;
}

export { stripHtml };
