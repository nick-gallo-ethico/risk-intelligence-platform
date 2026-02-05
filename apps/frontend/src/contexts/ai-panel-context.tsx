'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

/**
 * AI Panel context state
 */
interface AiPanelContextType {
  /** Whether the AI panel is currently open */
  isOpen: boolean;
  /** Open the AI panel */
  openPanel: () => void;
  /** Close the AI panel */
  closePanel: () => void;
  /** Toggle the AI panel open/closed */
  togglePanel: () => void;
  /** Set panel open state directly */
  setIsOpen: (open: boolean) => void;
}

const AiPanelContext = createContext<AiPanelContextType | undefined>(undefined);

interface AiPanelProviderProps {
  children: ReactNode;
}

/**
 * AiPanelProvider
 *
 * Provides AI panel open/close state to the component tree.
 * Wrap your layout with this provider to enable AI panel functionality.
 */
export function AiPanelProvider({ children }: AiPanelProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);
  const togglePanel = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <AiPanelContext.Provider
      value={{
        isOpen,
        openPanel,
        closePanel,
        togglePanel,
        setIsOpen,
      }}
    >
      {children}
    </AiPanelContext.Provider>
  );
}

/**
 * useAiPanel
 *
 * Hook to access AI panel state and controls.
 * Must be used within an AiPanelProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isOpen, openPanel, closePanel, togglePanel } = useAiPanel();
 *
 *   return (
 *     <button onClick={openPanel}>Open AI Assistant</button>
 *   );
 * }
 * ```
 */
export function useAiPanel() {
  const context = useContext(AiPanelContext);
  if (context === undefined) {
    throw new Error('useAiPanel must be used within an AiPanelProvider');
  }
  return context;
}
