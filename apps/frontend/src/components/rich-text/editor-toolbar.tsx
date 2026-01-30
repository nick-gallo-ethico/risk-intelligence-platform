'use client';

import { useCallback, useState } from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Link,
  Code,
  Unlink,
} from 'lucide-react';

interface EditorToolbarProps {
  /** Tiptap editor instance */
  editor: Editor;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Toolbar component for the rich text editor.
 * Provides formatting buttons for text styling, lists, quotes, links, and code.
 */
export function EditorToolbar({ editor, className }: EditorToolbarProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  // Handle link insertion
  const handleSetLink = useCallback(() => {
    if (!linkUrl) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setShowLinkInput(false);
      return;
    }

    // Add https:// if no protocol specified
    const url = linkUrl.match(/^https?:\/\//) ? linkUrl : `https://${linkUrl}`;

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run();

    setLinkUrl('');
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  // Handle link button click
  const handleLinkClick = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    if (previousUrl) {
      setLinkUrl(previousUrl);
    }
    setShowLinkInput(true);
  }, [editor]);

  // Cancel link input
  const handleCancelLink = useCallback(() => {
    setLinkUrl('');
    setShowLinkInput(false);
  }, []);

  return (
    <div className={cn('border-b bg-muted/30', className)}>
      <div className="flex flex-wrap items-center gap-0.5 p-1">
        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          tooltip="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          tooltip="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          tooltip="Underline (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          tooltip="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          tooltip="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Quote */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          tooltip="Quote Block"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        {/* Code block */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          tooltip="Code Block"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Link */}
        {!showLinkInput ? (
          <>
            <ToolbarButton
              onClick={handleLinkClick}
              isActive={editor.isActive('link')}
              tooltip="Insert Link"
            >
              <Link className="h-4 w-4" />
            </ToolbarButton>

            {editor.isActive('link') && (
              <ToolbarButton
                onClick={() => editor.chain().focus().unsetLink().run()}
                tooltip="Remove Link"
              >
                <Unlink className="h-4 w-4" />
              </ToolbarButton>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1 px-1">
            <input
              type="url"
              placeholder="Enter URL..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSetLink();
                }
                if (e.key === 'Escape') {
                  handleCancelLink();
                }
              }}
              className="h-7 px-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-ring w-48"
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSetLink}
              className="h-7 px-2"
            >
              Set
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelLink}
              className="h-7 px-2"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual toolbar button with active state styling.
 */
interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  tooltip?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function ToolbarButton({
  onClick,
  isActive = false,
  tooltip,
  children,
  disabled = false,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cn(
        'h-8 w-8 p-0',
        isActive && 'bg-muted text-foreground'
      )}
    >
      {children}
    </Button>
  );
}

/**
 * Visual separator between button groups.
 */
function ToolbarDivider() {
  return <div className="w-px h-6 bg-border mx-1" />;
}
