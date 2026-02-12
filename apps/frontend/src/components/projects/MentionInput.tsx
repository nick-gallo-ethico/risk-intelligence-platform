"use client";

/**
 * MentionInput Component
 *
 * Rich text input with @mention autocomplete support.
 * Used for task conversation threads with user mentions.
 *
 * Accessibility features (WCAG 2.1 AA):
 * - Keyboard navigation: Arrow Up/Down to navigate, Enter/Tab to select, Escape to close
 * - ARIA attributes: role, aria-expanded, aria-activedescendant, aria-label
 * - Screen reader announcements for autocomplete results
 * - Focus management with proper tab order
 */

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useId,
  KeyboardEvent,
} from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Send, Loader2 } from "lucide-react";

interface MentionUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
}

interface MentionInputProps {
  users: MentionUser[];
  onSubmit: (content: string, mentionedUserIds: string[]) => void;
  placeholder?: string;
  autoFocus?: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
  minHeight?: number;
}

/**
 * MentionInput - contentEditable div with @mention autocomplete.
 */
export function MentionInput({
  users,
  onSubmit,
  placeholder = "Write an update...",
  autoFocus = false,
  isSubmitting = false,
  submitLabel = "Post",
  minHeight = 80,
}: MentionInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const [showMentionPopover, setShowMentionPopover] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [hasContent, setHasContent] = useState(false);

  // Unique IDs for ARIA attributes
  const instanceId = useId();
  const listboxId = `mention-listbox-${instanceId}`;
  const getOptionId = (index: number) =>
    `mention-option-${instanceId}-${index}`;

  // Live region for screen reader announcements
  const [announcement, setAnnouncement] = useState("");

  // Debounce timer for mention search
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Filter users based on mention query
  const filteredUsers = users.filter((user) => {
    if (!mentionQuery) return true;
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const query = mentionQuery.toLowerCase();
    return fullName.includes(query) || user.email.toLowerCase().includes(query);
  });

  // Focus editor on mount if autoFocus
  useEffect(() => {
    if (autoFocus && editorRef.current) {
      editorRef.current.focus();
    }
  }, [autoFocus]);

  // Handle input changes to detect @ mentions
  const handleInput = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Check if there's content
    const text = editor.textContent || "";
    setHasContent(text.trim().length > 0);

    // Get current selection position
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textBeforeCursor = getTextBeforeCursor(editor, range);

    // Check for @ trigger
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      // Debounce the popover opening
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        setMentionQuery(mentionMatch[1]);
        setMentionIndex(0);

        // Calculate position for popover
        const rect = range.getBoundingClientRect();
        const editorRect = editor.getBoundingClientRect();
        setMentionPosition({
          top: rect.bottom - editorRect.top,
          left: rect.left - editorRect.left,
        });

        setShowMentionPopover(true);

        // Announce results to screen readers
        const matchCount = users.filter((u) => {
          const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
          const query = mentionMatch[1].toLowerCase();
          return (
            !query ||
            fullName.includes(query) ||
            u.email.toLowerCase().includes(query)
          );
        }).length;
        setAnnouncement(
          matchCount === 0
            ? "No matching users found"
            : `${Math.min(matchCount, 10)} user${matchCount === 1 ? "" : "s"} found. Use arrow keys to navigate.`,
        );
      }, 150);
    } else {
      setShowMentionPopover(false);
      setMentionQuery("");
    }
  }, []);

  // Get text content before cursor
  const getTextBeforeCursor = (
    container: HTMLElement,
    range: Range,
  ): string => {
    const preRange = document.createRange();
    preRange.selectNodeContents(container);
    preRange.setEnd(range.startContainer, range.startOffset);

    const tempDiv = document.createElement("div");
    tempDiv.appendChild(preRange.cloneContents());
    return tempDiv.textContent || "";
  };

  // Handle keyboard navigation in mention popover
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (showMentionPopover) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionIndex((prev) =>
            prev < filteredUsers.length - 1 ? prev + 1 : prev,
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          if (filteredUsers[mentionIndex]) {
            insertMention(filteredUsers[mentionIndex]);
          }
        } else if (e.key === "Escape") {
          e.preventDefault();
          setShowMentionPopover(false);
        }
      } else {
        // Handle Ctrl+Enter to submit
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          handleSubmit();
        }
      }
    },
    [showMentionPopover, filteredUsers, mentionIndex],
  );

  // Insert mention into editor
  const insertMention = useCallback((user: MentionUser) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Find and remove the @query text
    const textBeforeCursor = getTextBeforeCursor(editor, range);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      // Delete the @query text
      const deleteLength = mentionMatch[0].length;
      range.setStart(range.startContainer, range.startOffset - deleteLength);
      range.deleteContents();

      // Create mention span
      const mentionSpan = document.createElement("span");
      mentionSpan.className =
        "inline-flex items-center px-1 py-0.5 rounded bg-blue-100 text-blue-800 text-sm font-medium";
      mentionSpan.contentEditable = "false";
      mentionSpan.setAttribute("data-mention-id", user.id);
      mentionSpan.textContent = `@${user.firstName} ${user.lastName}`;

      // Insert mention
      range.insertNode(mentionSpan);

      // Add space after mention
      const space = document.createTextNode("\u00A0");
      mentionSpan.parentNode?.insertBefore(space, mentionSpan.nextSibling);

      // Move cursor after the space
      range.setStartAfter(space);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    setShowMentionPopover(false);
    setMentionQuery("");
    setHasContent(true);

    // Announce selection to screen readers
    setAnnouncement(`Selected @${user.firstName} ${user.lastName}`);
  }, []);

  // Extract mentioned user IDs from content
  const extractMentionedUserIds = (container: HTMLElement): string[] => {
    const mentionSpans = container.querySelectorAll("[data-mention-id]");
    const ids: string[] = [];
    mentionSpans.forEach((span) => {
      const id = span.getAttribute("data-mention-id");
      if (id && !ids.includes(id)) {
        ids.push(id);
      }
    });
    return ids;
  };

  // Convert content to plain text with mentions preserved
  const getContentAsText = (container: HTMLElement): string => {
    let text = "";
    container.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (element.hasAttribute("data-mention-id")) {
          text += element.textContent;
        } else if (element.tagName === "BR") {
          text += "\n";
        } else {
          text += getContentAsText(element);
        }
      }
    });
    return text;
  };

  // Handle submit
  const handleSubmit = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || isSubmitting) return;

    const content = getContentAsText(editor).trim();
    if (!content) return;

    const mentionedUserIds = extractMentionedUserIds(editor);

    onSubmit(content, mentionedUserIds);

    // Clear editor
    editor.innerHTML = "";
    setHasContent(false);
  }, [onSubmit, isSubmitting]);

  // Handle paste to strip formatting
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  // Scroll selected option into view when index changes
  useEffect(() => {
    if (showMentionPopover && listboxRef.current) {
      const selectedOption = listboxRef.current.querySelector(
        `[id="${getOptionId(mentionIndex)}"]`,
      );
      selectedOption?.scrollIntoView({ block: "nearest" });
    }
  }, [mentionIndex, showMentionPopover, getOptionId]);

  return (
    <div className="relative border rounded-lg bg-white">
      {/* Screen reader live region for announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={cn(
          "px-3 py-2 outline-none text-sm",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground",
        )}
        style={{ minHeight }}
        data-placeholder={placeholder}
        role="textbox"
        aria-multiline="true"
        aria-label="Write an update. Type @ to mention someone."
        aria-haspopup="listbox"
        aria-expanded={showMentionPopover && filteredUsers.length > 0}
        aria-controls={showMentionPopover ? listboxId : undefined}
        aria-activedescendant={
          showMentionPopover && filteredUsers.length > 0
            ? getOptionId(mentionIndex)
            : undefined
        }
        aria-describedby={`${instanceId}-hint`}
      />

      {/* Hidden hint for screen readers */}
      <span id={`${instanceId}-hint`} className="sr-only">
        Type @ to mention a team member. Press Ctrl+Enter to submit.
      </span>

      {/* Mention autocomplete popover */}
      {showMentionPopover && filteredUsers.length > 0 && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label="User suggestions"
          className="absolute z-50 w-64 rounded-md border bg-popover shadow-md"
          style={{
            top: mentionPosition.top + 4,
            left: mentionPosition.left,
          }}
        >
          <ScrollArea className="max-h-48">
            <div className="p-1">
              {filteredUsers.slice(0, 10).map((user, index) => (
                <div
                  key={user.id}
                  id={getOptionId(index)}
                  role="option"
                  aria-selected={index === mentionIndex}
                  onClick={() => insertMention(user)}
                  onMouseEnter={() => setMentionIndex(index)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors text-left cursor-pointer",
                    index === mentionIndex
                      ? "bg-blue-100 text-blue-900"
                      : "hover:bg-muted",
                  )}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px]">
                      {user.firstName.charAt(0)}
                      {user.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {user.firstName} {user.lastName}
                    </div>
                    {user.role && (
                      <div className="text-xs text-muted-foreground truncate">
                        {user.role}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Footer with submit button */}
      <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50/50">
        <div className="text-xs text-muted-foreground">
          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">@</kbd>{" "}
          to mention
        </div>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!hasContent || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Posting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              {submitLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default MentionInput;
