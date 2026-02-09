'use client';

import { useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCountExtension from '@tiptap/extension-character-count';
import Underline from '@tiptap/extension-underline';
import { EditorToolbar } from './editor-toolbar';
import { CharacterCount } from './character-count';
import { useDraft } from '@/hooks/use-draft';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  /** Initial HTML content */
  content?: string;
  /** Callback when content changes */
  onChange?: (html: string) => void;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Maximum character limit (default: 50000) */
  maxLength?: number;
  /** Warning threshold for character count (default: 45000) */
  warnAt?: number;
  /** Whether editor is read-only */
  readOnly?: boolean;
  /** Key for localStorage draft persistence */
  draftKey?: string;
  /** Callback when save button is clicked (if provided, shows save button) */
  onSave?: (html: string) => void;
  /** Whether content is currently being saved */
  isSaving?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Minimum height for editor content area */
  minHeight?: string;
}

/**
 * Rich text editor component for investigation notes.
 *
 * Features:
 * - Formatting toolbar (bold, italic, underline, lists, quotes, links, code)
 * - Character count with warning and limit indicators
 * - Draft auto-save to localStorage
 * - Read-only mode for viewing content
 * - Accessible keyboard shortcuts
 */
export function RichTextEditor({
  content = '',
  onChange,
  placeholder = 'Add your investigation notes here...',
  maxLength = 50000,
  warnAt = 45000,
  readOnly = false,
  draftKey,
  onSave,
  isSaving = false,
  className,
  minHeight = '200px',
}: RichTextEditorProps) {
  // Draft persistence
  const { draft, saveDraft, clearDraft, hasDraft, isLoaded } = useDraft(
    draftKey
  );

  // Initialize Tiptap editor
  const editor = useEditor({
    immediatelyRender: false, // Required for SSR/Next.js to avoid hydration mismatches
    extensions: [
      StarterKit.configure({
        // Disable features we're replacing with custom extensions
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          'before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:h-0 before:pointer-events-none',
      }),
      CharacterCountExtension.configure({
        limit: maxLength,
      }),
    ],
    content: '',
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
          'prose-p:my-2 prose-ul:my-2 prose-ol:my-2',
          'prose-blockquote:border-l-4 prose-blockquote:border-muted-foreground prose-blockquote:pl-4 prose-blockquote:italic',
          'prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm',
          'prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-md'
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);

      // Auto-save draft
      if (draftKey) {
        saveDraft(html);
      }
    },
  });

  // Set initial content (prioritize draft if available)
  useEffect(() => {
    if (!editor || !isLoaded) return;

    // Use draft if available, otherwise use provided content
    const initialContent = hasDraft && draft ? draft : content;

    if (initialContent && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, isLoaded, hasDraft, draft, content]);

  // Update editable state when readOnly changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  // Handle save
  const handleSave = useCallback(() => {
    if (editor && onSave) {
      const html = editor.getHTML();
      onSave(html);
      clearDraft();
    }
  }, [editor, onSave, clearDraft]);

  // Discard draft and restore original content
  const handleDiscardDraft = useCallback(() => {
    if (editor && hasDraft) {
      clearDraft();
      editor.commands.setContent(content);
    }
  }, [editor, hasDraft, clearDraft, content]);

  // Check if content exceeds limit
  const characterCount = editor?.storage.characterCount?.characters() ?? 0;
  const isOverLimit = characterCount >= maxLength;

  if (!editor) {
    return (
      <div
        className={cn(
          'border rounded-md animate-pulse bg-muted',
          className
        )}
        style={{ minHeight }}
      />
    );
  }

  return (
    <div
      className={cn(
        'border rounded-md overflow-hidden bg-background',
        readOnly && 'bg-muted/30',
        className
      )}
    >
      {/* Draft recovery notice */}
      {!readOnly && hasDraft && content !== draft && (
        <div className="flex items-center justify-between px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b text-sm">
          <span className="text-yellow-800 dark:text-yellow-200">
            Recovered unsaved draft
          </span>
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="text-yellow-600 dark:text-yellow-400 hover:underline"
          >
            Discard draft
          </button>
        </div>
      )}

      {/* Toolbar */}
      {!readOnly && <EditorToolbar editor={editor} />}

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className={cn('px-4 py-3', readOnly && 'cursor-default')}
        style={{ minHeight }}
      />

      {/* Footer with character count and save button */}
      {!readOnly && (
        <div className="flex items-center justify-between border-t">
          <CharacterCount
            current={characterCount}
            limit={maxLength}
            warnAt={warnAt}
            className="border-t-0 flex-1"
          />

          {onSave && (
            <div className="px-3 py-2 border-l">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isOverLimit}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
