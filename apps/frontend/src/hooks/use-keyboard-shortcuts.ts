'use client';

/**
 * Keyboard Shortcuts Infrastructure
 *
 * Provides reusable hooks for keyboard shortcuts across the application.
 * Uses react-hotkeys-hook for consistent cross-platform keyboard handling.
 *
 * Features:
 * - Standard shortcut definitions with mod+key for Cmd/Ctrl
 * - List navigation with J/K keys
 * - Global shortcuts for command palette and help
 * - Automatic disabling when typing in form inputs
 */

import { useState, useCallback, useMemo } from 'react';
import { useHotkeys, Options } from 'react-hotkeys-hook';

/**
 * Standard keyboard shortcut definitions.
 * Uses 'mod' prefix for cross-platform Cmd (Mac) / Ctrl (Windows) support.
 */
export const SHORTCUTS = {
  // Global navigation
  COMMAND_PALETTE: 'mod+k',
  HELP: 'shift+/',
  SEARCH: '/',
  GO_BACK: 'mod+[',

  // List navigation
  NEXT_ITEM: 'j',
  PREV_ITEM: 'k',
  OPEN_ITEM: 'enter',

  // Quick actions
  NEW_CASE: 'mod+shift+c',
  NEW_INVESTIGATION: 'mod+shift+i',
  SAVE: 'mod+s',

  // List operations
  SELECT_ALL: 'mod+a',
  DESELECT_ALL: 'escape',

  // Investigation checklist
  TOGGLE_ITEM: 'space',
  EDIT_ITEM: 'e',

  // Tab navigation (1-9)
  TAB_1: '1',
  TAB_2: '2',
  TAB_3: '3',
  TAB_4: '4',
  TAB_5: '5',
  TAB_6: '6',
} as const;

/**
 * Shortcut category for organizing help display.
 */
export type ShortcutCategory =
  | 'global'
  | 'navigation'
  | 'actions'
  | 'list'
  | 'checklist';

/**
 * Shortcut definition for help display.
 */
export interface ShortcutInfo {
  key: string;
  description: string;
  category: ShortcutCategory;
}

/**
 * All shortcuts organized for the help dialog.
 */
export const SHORTCUT_INFO: ShortcutInfo[] = [
  // Global
  { key: 'Cmd+K', description: 'Open command palette', category: 'global' },
  { key: '?', description: 'Show keyboard shortcuts', category: 'global' },
  { key: '/', description: 'Focus search', category: 'global' },
  { key: 'Cmd+S', description: 'Save', category: 'global' },

  // Navigation
  { key: 'J', description: 'Move down / Next item', category: 'navigation' },
  { key: 'K', description: 'Move up / Previous item', category: 'navigation' },
  { key: 'Enter', description: 'Open selected item', category: 'navigation' },
  { key: 'Cmd+[', description: 'Go back', category: 'navigation' },

  // Actions
  { key: 'Cmd+Shift+C', description: 'Create new case', category: 'actions' },
  {
    key: 'Cmd+Shift+I',
    description: 'Create new investigation',
    category: 'actions',
  },

  // List operations
  { key: 'Cmd+A', description: 'Select all', category: 'list' },
  { key: 'Esc', description: 'Clear selection', category: 'list' },

  // Checklist operations
  { key: 'Space', description: 'Toggle item completion', category: 'checklist' },
  { key: 'E', description: 'Edit item notes', category: 'checklist' },
];

/**
 * Default options for hotkeys - disables shortcuts when typing in form fields.
 */
const defaultOptions: Options = {
  enableOnFormTags: false,
  preventDefault: true,
};

/**
 * Hook for navigating through a list with J/K keys.
 *
 * @param items - Array of items with 'id' property
 * @param onSelect - Callback when an item is focused
 * @param onOpen - Callback when Enter is pressed on focused item
 * @param enabled - Whether the navigation is enabled (default: true)
 *
 * @example
 * const { focusIndex, setFocusIndex } = useListNavigation(
 *   cases,
 *   (id) => setSelectedId(id),
 *   (id) => router.push(`/cases/${id}`)
 * );
 */
export function useListNavigation<T extends { id: string }>(
  items: T[],
  onSelect?: (id: string) => void,
  onOpen?: (id: string) => void,
  enabled = true
) {
  const [focusIndex, setFocusIndex] = useState(0);

  // Move focus to next item
  const focusNext = useCallback(() => {
    setFocusIndex((prev) => {
      const next = Math.min(prev + 1, items.length - 1);
      if (items[next] && onSelect) {
        onSelect(items[next].id);
      }
      return next;
    });
  }, [items, onSelect]);

  // Move focus to previous item
  const focusPrev = useCallback(() => {
    setFocusIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      if (items[next] && onSelect) {
        onSelect(items[next].id);
      }
      return next;
    });
  }, [items, onSelect]);

  // Open the currently focused item
  const openCurrent = useCallback(() => {
    if (items[focusIndex] && onOpen) {
      onOpen(items[focusIndex].id);
    }
  }, [focusIndex, items, onOpen]);

  // Register hotkeys
  useHotkeys(
    SHORTCUTS.NEXT_ITEM,
    (e) => {
      e.preventDefault();
      focusNext();
    },
    { ...defaultOptions, enabled }
  );

  useHotkeys(
    SHORTCUTS.PREV_ITEM,
    (e) => {
      e.preventDefault();
      focusPrev();
    },
    { ...defaultOptions, enabled }
  );

  useHotkeys(
    SHORTCUTS.OPEN_ITEM,
    (e) => {
      e.preventDefault();
      openCurrent();
    },
    { ...defaultOptions, enabled }
  );

  return {
    focusIndex,
    setFocusIndex,
    focusNext,
    focusPrev,
    openCurrent,
  };
}

/**
 * Options for useGlobalShortcuts hook.
 */
export interface GlobalShortcutsOptions {
  /** Called when Cmd+K is pressed */
  onCommandPalette?: () => void;
  /** Called when ? is pressed */
  onHelp?: () => void;
  /** Called when / is pressed */
  onSearch?: () => void;
  /** Called when Cmd+[ is pressed */
  onGoBack?: () => void;
  /** Called when Cmd+S is pressed */
  onSave?: () => void;
  /** Called when Cmd+Shift+C is pressed */
  onNewCase?: () => void;
  /** Called when Cmd+Shift+I is pressed */
  onNewInvestigation?: () => void;
  /** Whether shortcuts are enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook for registering global keyboard shortcuts.
 *
 * @param options - Callback handlers for various shortcuts
 *
 * @example
 * useGlobalShortcuts({
 *   onCommandPalette: () => setCommandPaletteOpen(true),
 *   onHelp: () => setHelpOpen(true),
 *   onSearch: () => searchInputRef.current?.focus(),
 * });
 */
export function useGlobalShortcuts(options: GlobalShortcutsOptions) {
  const {
    onCommandPalette,
    onHelp,
    onSearch,
    onGoBack,
    onSave,
    onNewCase,
    onNewInvestigation,
    enabled = true,
  } = options;

  // Command palette (Cmd+K)
  useHotkeys(
    SHORTCUTS.COMMAND_PALETTE,
    (e) => {
      e.preventDefault();
      onCommandPalette?.();
    },
    { ...defaultOptions, enabled: enabled && !!onCommandPalette }
  );

  // Help (?)
  useHotkeys(
    SHORTCUTS.HELP,
    (e) => {
      e.preventDefault();
      onHelp?.();
    },
    { ...defaultOptions, enabled: enabled && !!onHelp }
  );

  // Search (/)
  useHotkeys(
    SHORTCUTS.SEARCH,
    (e) => {
      e.preventDefault();
      onSearch?.();
    },
    { ...defaultOptions, enabled: enabled && !!onSearch }
  );

  // Go back (Cmd+[)
  useHotkeys(
    SHORTCUTS.GO_BACK,
    (e) => {
      e.preventDefault();
      onGoBack?.();
    },
    { ...defaultOptions, enabled: enabled && !!onGoBack }
  );

  // Save (Cmd+S)
  useHotkeys(
    SHORTCUTS.SAVE,
    (e) => {
      e.preventDefault();
      onSave?.();
    },
    { ...defaultOptions, enabled: enabled && !!onSave }
  );

  // New case (Cmd+Shift+C)
  useHotkeys(
    SHORTCUTS.NEW_CASE,
    (e) => {
      e.preventDefault();
      onNewCase?.();
    },
    { ...defaultOptions, enabled: enabled && !!onNewCase }
  );

  // New investigation (Cmd+Shift+I)
  useHotkeys(
    SHORTCUTS.NEW_INVESTIGATION,
    (e) => {
      e.preventDefault();
      onNewInvestigation?.();
    },
    { ...defaultOptions, enabled: enabled && !!onNewInvestigation }
  );
}

/**
 * Options for useChecklistShortcuts hook.
 */
export interface ChecklistShortcutsOptions {
  /** Called when Space is pressed */
  onToggle?: () => void;
  /** Called when E is pressed */
  onEdit?: () => void;
  /** Whether shortcuts are enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook for checklist-specific keyboard shortcuts.
 *
 * @param options - Callback handlers for checklist shortcuts
 *
 * @example
 * useChecklistShortcuts({
 *   onToggle: () => handleToggleItem(focusedItemId),
 *   onEdit: () => handleEditItem(focusedItemId),
 * });
 */
export function useChecklistShortcuts(options: ChecklistShortcutsOptions) {
  const { onToggle, onEdit, enabled = true } = options;

  // Toggle item (Space)
  useHotkeys(
    SHORTCUTS.TOGGLE_ITEM,
    (e) => {
      e.preventDefault();
      onToggle?.();
    },
    { ...defaultOptions, enabled: enabled && !!onToggle }
  );

  // Edit item (E)
  useHotkeys(
    SHORTCUTS.EDIT_ITEM,
    (e) => {
      e.preventDefault();
      onEdit?.();
    },
    { ...defaultOptions, enabled: enabled && !!onEdit }
  );
}

/**
 * Options for useTabNavigation hook.
 */
export interface TabNavigationOptions {
  /** Callback when a tab number key is pressed (1-6) */
  onTabChange?: (index: number) => void;
  /** Maximum number of tabs (default: 6) */
  maxTabs?: number;
  /** Whether shortcuts are enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook for navigating tabs with number keys 1-6.
 *
 * @param options - Tab navigation options
 *
 * @example
 * useTabNavigation({
 *   onTabChange: (index) => setActiveTab(tabs[index]),
 *   maxTabs: 4,
 * });
 */
export function useTabNavigation(options: TabNavigationOptions) {
  const { onTabChange, maxTabs = 6, enabled = true } = options;

  // Register number key handlers (1-6)
  const tabKeys = useMemo(
    () => ['1', '2', '3', '4', '5', '6'].slice(0, maxTabs),
    [maxTabs]
  );

  // Tab 1
  useHotkeys(
    '1',
    (e) => {
      e.preventDefault();
      onTabChange?.(0);
    },
    { ...defaultOptions, enabled: enabled && maxTabs >= 1 && !!onTabChange }
  );

  // Tab 2
  useHotkeys(
    '2',
    (e) => {
      e.preventDefault();
      onTabChange?.(1);
    },
    { ...defaultOptions, enabled: enabled && maxTabs >= 2 && !!onTabChange }
  );

  // Tab 3
  useHotkeys(
    '3',
    (e) => {
      e.preventDefault();
      onTabChange?.(2);
    },
    { ...defaultOptions, enabled: enabled && maxTabs >= 3 && !!onTabChange }
  );

  // Tab 4
  useHotkeys(
    '4',
    (e) => {
      e.preventDefault();
      onTabChange?.(3);
    },
    { ...defaultOptions, enabled: enabled && maxTabs >= 4 && !!onTabChange }
  );

  // Tab 5
  useHotkeys(
    '5',
    (e) => {
      e.preventDefault();
      onTabChange?.(4);
    },
    { ...defaultOptions, enabled: enabled && maxTabs >= 5 && !!onTabChange }
  );

  // Tab 6
  useHotkeys(
    '6',
    (e) => {
      e.preventDefault();
      onTabChange?.(5);
    },
    { ...defaultOptions, enabled: enabled && maxTabs >= 6 && !!onTabChange }
  );
}
