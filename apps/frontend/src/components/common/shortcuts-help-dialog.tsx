'use client';

/**
 * ShortcutsHelpDialog Component
 *
 * A modal dialog displaying all available keyboard shortcuts organized by category.
 * Triggered by pressing ? (question mark) anywhere in the application.
 *
 * Features:
 * - Shortcuts organized by category (Global, Navigation, Actions, etc.)
 * - Keyboard key badges with proper styling
 * - Platform-aware key display (Cmd on Mac, Ctrl on Windows)
 * - Can be closed with Escape key
 */

import React, { useMemo } from 'react';
import { Keyboard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SHORTCUT_INFO, ShortcutCategory } from '@/hooks/use-keyboard-shortcuts';

export interface ShortcutsHelpDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog should close */
  onOpenChange: (open: boolean) => void;
}

/**
 * Display name for each category.
 */
const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  global: 'Global',
  navigation: 'Navigation',
  actions: 'Quick Actions',
  list: 'List Operations',
  checklist: 'Checklist',
};

/**
 * Order in which categories should be displayed.
 */
const CATEGORY_ORDER: ShortcutCategory[] = [
  'global',
  'navigation',
  'actions',
  'list',
  'checklist',
];

/**
 * Detects if the user is on a Mac.
 */
function isMac(): boolean {
  if (typeof window === 'undefined') return false;
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

/**
 * Transforms shortcut key display for the current platform.
 * Converts "Cmd" to platform-appropriate key.
 */
function formatKeyForPlatform(key: string): string {
  const mac = isMac();
  return key
    .replace(/Cmd/g, mac ? '\u2318' : 'Ctrl') // Command symbol or Ctrl
    .replace(/Shift/g, mac ? '\u21E7' : 'Shift') // Shift symbol or Shift
    .replace(/\+/g, mac ? '' : '+'); // Remove + on Mac for cleaner look
}

/**
 * Renders a single keyboard key badge.
 */
function KeyBadge({ keyText }: { keyText: string }) {
  // Split combined keys (e.g., "Cmd+K" -> ["Cmd", "K"])
  const keys = keyText.split('+').map((k) => k.trim());

  return (
    <span className="inline-flex items-center gap-0.5">
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <kbd
            className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5
                       text-xs font-medium font-mono text-gray-700
                       bg-gray-100 border border-gray-300 rounded shadow-sm"
          >
            {formatKeyForPlatform(key)}
          </kbd>
          {index < keys.length - 1 && (
            <span className="text-gray-400 text-xs mx-0.5">+</span>
          )}
        </React.Fragment>
      ))}
    </span>
  );
}

/**
 * Renders a section of shortcuts for a category.
 */
function ShortcutSection({
  category,
  shortcuts,
}: {
  category: ShortcutCategory;
  shortcuts: typeof SHORTCUT_INFO;
}) {
  const categoryShortcuts = shortcuts.filter((s) => s.category === category);

  if (categoryShortcuts.length === 0) return null;

  return (
    <div className="mb-6 last:mb-0">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        {CATEGORY_LABELS[category]}
      </h3>
      <div className="space-y-2">
        {categoryShortcuts.map((shortcut, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-1.5"
          >
            <span className="text-sm text-gray-600">{shortcut.description}</span>
            <KeyBadge keyText={shortcut.key} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Dialog showing all available keyboard shortcuts.
 */
export function ShortcutsHelpDialog({
  open,
  onOpenChange,
}: ShortcutsHelpDialogProps) {
  // Group shortcuts by category
  const categorizedShortcuts = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      shortcuts: SHORTCUT_INFO.filter((s) => s.category === category),
    })).filter((group) => group.shortcuts.length > 0);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate quickly through the application.
            Press <KeyBadge keyText="?" /> to show this help at any time.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 divide-y divide-gray-100">
          {categorizedShortcuts.map(({ category, shortcuts }) => (
            <div key={category} className="py-4 first:pt-0 last:pb-0">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {CATEGORY_LABELS[category]}
              </h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-gray-600">
                      {shortcut.description}
                    </span>
                    <KeyBadge keyText={shortcut.key} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-500 text-center">
            {isMac() ? (
              <>
                <KeyBadge keyText="Cmd" /> represents the Command key on your
                keyboard
              </>
            ) : (
              <>
                <KeyBadge keyText="Ctrl" /> represents the Control key on your
                keyboard
              </>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
