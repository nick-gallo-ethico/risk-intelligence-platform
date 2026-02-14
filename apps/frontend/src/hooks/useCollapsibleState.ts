import { useState, useCallback } from "react";

/**
 * Persists collapsible card open/closed state in localStorage.
 *
 * Used by the case detail page to remember which property cards
 * (About, Intake, Classification) are expanded or collapsed,
 * so users don't have to re-expand cards every time they navigate back.
 *
 * Key format convention: `collapsible-{entityId}-{cardId}`
 *
 * SSR-safe: reads localStorage only on the client (typeof window check).
 * Falls back to defaultOpen when localStorage has no stored value.
 *
 * @param storageKey - Unique localStorage key for this collapsible
 * @param defaultOpen - Whether the collapsible starts open (default: true)
 * @returns [isOpen, setIsOpen] - Current state and setter (writes to localStorage)
 *
 * @example
 * ```tsx
 * const [aboutOpen, setAboutOpen] = useCollapsibleState(
 *   `collapsible-${caseId}-about`,
 *   true
 * );
 * ```
 */
export function useCollapsibleState(
  storageKey: string,
  defaultOpen: boolean = true,
): [boolean, (open: boolean) => void] {
  const [isOpen, setIsOpenState] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return defaultOpen;
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        return stored === "true";
      }
      return defaultOpen;
    } catch {
      return defaultOpen;
    }
  });

  const setIsOpen = useCallback(
    (open: boolean) => {
      setIsOpenState(open);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(storageKey, String(open));
        } catch {
          // localStorage may be full or unavailable - fail silently
        }
      }
    },
    [storageKey],
  );

  return [isOpen, setIsOpen];
}
