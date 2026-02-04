'use client';

/**
 * CommandPalette Component
 *
 * A VS Code/Linear-style command palette for quick navigation and actions.
 * Triggered by pressing Cmd+K (or Ctrl+K on Windows).
 *
 * Features:
 * - Quick fuzzy search across all commands
 * - Commands grouped by category (Navigation, Actions, Recent)
 * - Keyboard navigation within palette (arrow keys, Enter)
 * - Shows keyboard shortcuts for each command
 * - Remembers recent items
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useHotkeys } from 'react-hotkeys-hook';
import {
  ArrowRight,
  Briefcase,
  FileSearch,
  Home,
  ListTodo,
  Plus,
  Search,
  Settings,
  User,
  Clock,
  Command,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

/**
 * Command definition for the palette.
 */
export interface PaletteCommand {
  id: string;
  label: string;
  category: 'navigation' | 'action' | 'recent' | 'search';
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
  keywords?: string[]; // Additional search terms
}

export interface CommandPaletteProps {
  /** Whether the palette is open */
  open: boolean;
  /** Callback when the palette should close */
  onOpenChange: (open: boolean) => void;
  /** Optional additional commands to include */
  additionalCommands?: PaletteCommand[];
  /** Optional recent items to show */
  recentItems?: Array<{
    id: string;
    label: string;
    type: 'case' | 'investigation' | 'page';
    href: string;
  }>;
}

/**
 * Category display configuration.
 */
const CATEGORY_CONFIG: Record<
  PaletteCommand['category'],
  { label: string; icon: React.ReactNode }
> = {
  navigation: { label: 'Go to', icon: <ArrowRight className="h-3 w-3" /> },
  action: { label: 'Actions', icon: <Plus className="h-3 w-3" /> },
  recent: { label: 'Recent', icon: <Clock className="h-3 w-3" /> },
  search: { label: 'Search', icon: <Search className="h-3 w-3" /> },
};

/**
 * Category display order.
 */
const CATEGORY_ORDER: PaletteCommand['category'][] = [
  'recent',
  'navigation',
  'action',
  'search',
];

/**
 * Formats a keyboard shortcut for display.
 */
function formatShortcut(shortcut: string): string {
  if (typeof window !== 'undefined') {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    return shortcut.replace(/mod/g, isMac ? '\u2318' : 'Ctrl');
  }
  return shortcut;
}

/**
 * Simple fuzzy match for searching.
 */
function fuzzyMatch(text: string, query: string): boolean {
  const searchText = text.toLowerCase();
  const searchQuery = query.toLowerCase().trim();

  if (!searchQuery) return true;

  // Simple substring match
  if (searchText.includes(searchQuery)) return true;

  // Fuzzy match - all characters in order
  let queryIndex = 0;
  for (let i = 0; i < searchText.length && queryIndex < searchQuery.length; i++) {
    if (searchText[i] === searchQuery[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === searchQuery.length;
}

/**
 * Keyboard shortcut badge component.
 */
function ShortcutBadge({ shortcut }: { shortcut: string }) {
  const formatted = formatShortcut(shortcut);
  const keys = formatted.split('+').map((k) => k.trim());

  return (
    <span className="flex items-center gap-0.5 text-xs text-gray-400">
      {keys.map((key, index) => (
        <kbd
          key={index}
          className="inline-flex items-center justify-center min-w-[20px] h-5 px-1
                     text-[10px] font-medium font-mono text-gray-500
                     bg-gray-100 border border-gray-200 rounded"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}

/**
 * Single command item in the palette.
 */
function CommandItem({
  command,
  isSelected,
  onSelect,
  onHover,
}: {
  command: PaletteCommand;
  isSelected: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex items-center justify-between w-full px-3 py-2 text-left rounded-md',
        'hover:bg-gray-100 transition-colors',
        isSelected && 'bg-gray-100'
      )}
      onClick={onSelect}
      onMouseEnter={onHover}
    >
      <div className="flex items-center gap-3">
        <span className="text-gray-400">{command.icon}</span>
        <span className="text-sm text-gray-900">{command.label}</span>
      </div>
      {command.shortcut && <ShortcutBadge shortcut={command.shortcut} />}
    </button>
  );
}

/**
 * Command palette component.
 */
export function CommandPalette({
  open,
  onOpenChange,
  additionalCommands = [],
  recentItems = [],
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build default commands
  const defaultCommands = useMemo<PaletteCommand[]>(
    () => [
      // Navigation
      {
        id: 'nav-dashboard',
        label: 'Dashboard',
        category: 'navigation',
        icon: <Home className="h-4 w-4" />,
        action: () => router.push('/dashboard'),
        keywords: ['home', 'overview'],
      },
      {
        id: 'nav-cases',
        label: 'Cases',
        category: 'navigation',
        icon: <Briefcase className="h-4 w-4" />,
        action: () => router.push('/cases'),
        keywords: ['list', 'all'],
      },
      {
        id: 'nav-investigations',
        label: 'Investigations',
        category: 'navigation',
        icon: <FileSearch className="h-4 w-4" />,
        action: () => router.push('/investigations'),
        keywords: ['list', 'all'],
      },
      {
        id: 'nav-settings',
        label: 'Settings',
        category: 'navigation',
        icon: <Settings className="h-4 w-4" />,
        action: () => router.push('/settings'),
        keywords: ['preferences', 'config'],
      },
      {
        id: 'nav-profile',
        label: 'My Profile',
        category: 'navigation',
        icon: <User className="h-4 w-4" />,
        action: () => router.push('/profile'),
        keywords: ['account', 'user'],
      },

      // Actions
      {
        id: 'action-new-case',
        label: 'Create New Case',
        category: 'action',
        icon: <Plus className="h-4 w-4" />,
        shortcut: 'mod+shift+c',
        action: () => router.push('/cases/new'),
        keywords: ['add', 'create'],
      },
      {
        id: 'action-new-investigation',
        label: 'Create New Investigation',
        category: 'action',
        icon: <Plus className="h-4 w-4" />,
        shortcut: 'mod+shift+i',
        action: () => {
          // Would typically open a modal or navigate to case selection
          console.log('New investigation');
        },
        keywords: ['add', 'create'],
      },

      // Search
      {
        id: 'search-cases',
        label: 'Search Cases...',
        category: 'search',
        icon: <Search className="h-4 w-4" />,
        action: () => router.push('/cases?focus=search'),
        keywords: ['find'],
      },
      {
        id: 'search-all',
        label: 'Search Everything...',
        category: 'search',
        icon: <Search className="h-4 w-4" />,
        shortcut: '/',
        action: () => router.push('/search'),
        keywords: ['global', 'find'],
      },
    ],
    [router]
  );

  // Build recent commands from recent items
  const recentCommands = useMemo<PaletteCommand[]>(
    () =>
      recentItems.slice(0, 5).map((item) => ({
        id: `recent-${item.id}`,
        label: item.label,
        category: 'recent' as const,
        icon:
          item.type === 'case' ? (
            <Briefcase className="h-4 w-4" />
          ) : item.type === 'investigation' ? (
            <FileSearch className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          ),
        action: () => router.push(item.href),
      })),
    [recentItems, router]
  );

  // Combine all commands
  const allCommands = useMemo(
    () => [...recentCommands, ...defaultCommands, ...additionalCommands],
    [recentCommands, defaultCommands, additionalCommands]
  );

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return allCommands;
    }

    return allCommands.filter((cmd) => {
      // Match against label
      if (fuzzyMatch(cmd.label, query)) return true;

      // Match against keywords
      if (cmd.keywords?.some((kw) => fuzzyMatch(kw, query))) return true;

      return false;
    });
  }, [allCommands, query]);

  // Group filtered commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<PaletteCommand['category'], PaletteCommand[]> = {
      recent: [],
      navigation: [],
      action: [],
      search: [],
    };

    filteredCommands.forEach((cmd) => {
      groups[cmd.category].push(cmd);
    });

    // Return in category order, excluding empty categories
    return CATEGORY_ORDER.map((category) => ({
      category,
      commands: groups[category],
    })).filter((group) => group.commands.length > 0);
  }, [filteredCommands]);

  // Flatten for keyboard navigation
  const flatCommands = useMemo(
    () => groupedCommands.flatMap((group) => group.commands),
    [groupedCommands]
  );

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Reset query when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      // Focus input after dialog animation
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Execute selected command
  const executeSelected = useCallback(() => {
    const command = flatCommands[selectedIndex];
    if (command) {
      onOpenChange(false);
      command.action();
    }
  }, [flatCommands, selectedIndex, onOpenChange]);

  // Keyboard navigation within palette
  useHotkeys(
    'up',
    (e) => {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    },
    { enableOnFormTags: true, enabled: open }
  );

  useHotkeys(
    'down',
    (e) => {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(flatCommands.length - 1, prev + 1));
    },
    { enableOnFormTags: true, enabled: open }
  );

  useHotkeys(
    'enter',
    (e) => {
      e.preventDefault();
      executeSelected();
    },
    { enableOnFormTags: true, enabled: open }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px] p-0 overflow-hidden"
        // Don't show the close button - Escape closes instead
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle>Command Palette</DialogTitle>
        </VisuallyHidden>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Command className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 border-0 shadow-none focus-visible:ring-0 px-0 text-sm"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          <kbd className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border">
            esc
          </kbd>
        </div>

        {/* Command list */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {groupedCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No commands found for "{query}"
            </div>
          ) : (
            groupedCommands.map(({ category, commands }) => (
              <div key={category} className="mb-2 last:mb-0">
                <div className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {CATEGORY_CONFIG[category].icon}
                  {CATEGORY_CONFIG[category].label}
                </div>
                <div className="px-2">
                  {commands.map((command) => {
                    const globalIndex = flatCommands.indexOf(command);
                    return (
                      <CommandItem
                        key={command.id}
                        command={command}
                        isSelected={selectedIndex === globalIndex}
                        onSelect={() => {
                          onOpenChange(false);
                          command.action();
                        }}
                        onHover={() => setSelectedIndex(globalIndex)}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t bg-gray-50 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white border rounded text-[10px]">
                ↑
              </kbd>
              <kbd className="px-1 py-0.5 bg-white border rounded text-[10px]">
                ↓
              </kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px]">
                ↵
              </kbd>
              to select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px]">
              esc
            </kbd>
            to close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for managing command palette state.
 * Provides open/close state and integrates with global shortcuts.
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  return {
    open,
    setOpen,
    toggle: useCallback(() => setOpen((prev) => !prev), []),
    close: useCallback(() => setOpen(false), []),
  };
}
