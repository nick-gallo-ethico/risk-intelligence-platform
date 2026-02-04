'use client';

/**
 * ShortcutsContext
 *
 * Provides global state management for keyboard shortcuts infrastructure.
 * Manages command palette visibility, shortcuts help dialog, and recent items.
 *
 * Features:
 * - Command palette open/close state
 * - Shortcuts help dialog open/close state
 * - Recent items tracking for quick navigation
 * - Global shortcut registration (Cmd+K, ?)
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { CommandPalette } from '@/components/common/command-palette';
import { ShortcutsHelpDialog } from '@/components/common/shortcuts-help-dialog';

/**
 * Recent item for command palette navigation.
 */
export interface RecentItem {
  id: string;
  label: string;
  type: 'case' | 'investigation' | 'page';
  href: string;
  timestamp: number;
}

/**
 * Context value interface.
 */
interface ShortcutsContextValue {
  /** Open the command palette */
  openCommandPalette: () => void;
  /** Close the command palette */
  closeCommandPalette: () => void;
  /** Toggle the command palette */
  toggleCommandPalette: () => void;
  /** Open the shortcuts help dialog */
  openShortcutsHelp: () => void;
  /** Close the shortcuts help dialog */
  closeShortcutsHelp: () => void;
  /** Add a recent item */
  addRecentItem: (item: Omit<RecentItem, 'timestamp'>) => void;
  /** Get recent items */
  recentItems: RecentItem[];
  /** Whether shortcuts are currently enabled */
  shortcutsEnabled: boolean;
  /** Enable/disable shortcuts (useful when modals are open) */
  setShortcutsEnabled: (enabled: boolean) => void;
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

/**
 * Maximum number of recent items to keep.
 */
const MAX_RECENT_ITEMS = 10;

/**
 * Local storage key for recent items.
 */
const RECENT_ITEMS_KEY = 'ethico_recent_items';

/**
 * Provider component for shortcuts functionality.
 */
export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // State
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  // Load recent items from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_ITEMS_KEY);
      if (stored) {
        const items = JSON.parse(stored) as RecentItem[];
        setRecentItems(items);
      }
    } catch (e) {
      console.error('Failed to load recent items:', e);
    }
  }, []);

  // Save recent items to local storage when they change
  useEffect(() => {
    try {
      localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(recentItems));
    } catch (e) {
      console.error('Failed to save recent items:', e);
    }
  }, [recentItems]);

  // Command palette handlers
  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setCommandPaletteOpen(false);
  }, []);

  const toggleCommandPalette = useCallback(() => {
    setCommandPaletteOpen((prev) => !prev);
  }, []);

  // Help dialog handlers
  const openShortcutsHelp = useCallback(() => {
    setHelpDialogOpen(true);
  }, []);

  const closeShortcutsHelp = useCallback(() => {
    setHelpDialogOpen(false);
  }, []);

  // Add recent item
  const addRecentItem = useCallback(
    (item: Omit<RecentItem, 'timestamp'>) => {
      setRecentItems((prev) => {
        // Remove existing item with same id
        const filtered = prev.filter((i) => i.id !== item.id);

        // Add new item at start
        const newItem: RecentItem = {
          ...item,
          timestamp: Date.now(),
        };

        // Keep only MAX_RECENT_ITEMS
        return [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
      });
    },
    []
  );

  // Register global shortcuts
  useGlobalShortcuts({
    onCommandPalette: openCommandPalette,
    onHelp: openShortcutsHelp,
    onNewCase: () => router.push('/cases/new'),
    enabled: shortcutsEnabled,
  });

  const value: ShortcutsContextValue = {
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
    openShortcutsHelp,
    closeShortcutsHelp,
    addRecentItem,
    recentItems,
    shortcutsEnabled,
    setShortcutsEnabled,
  };

  return (
    <ShortcutsContext.Provider value={value}>
      {children}

      {/* Command Palette - rendered at provider level */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        recentItems={recentItems}
      />

      {/* Shortcuts Help Dialog - rendered at provider level */}
      <ShortcutsHelpDialog
        open={helpDialogOpen}
        onOpenChange={setHelpDialogOpen}
      />
    </ShortcutsContext.Provider>
  );
}

/**
 * Hook to access shortcuts context.
 */
export function useShortcuts(): ShortcutsContextValue {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcuts must be used within a ShortcutsProvider');
  }
  return context;
}

/**
 * Hook to add item to recent when visiting a page.
 * Automatically tracks navigation for command palette recent items.
 */
export function useTrackRecentItem(item: Omit<RecentItem, 'timestamp'> | null) {
  const { addRecentItem } = useShortcuts();

  useEffect(() => {
    if (item) {
      addRecentItem(item);
    }
  }, [item, addRecentItem]);
}
