'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { ShortcutsProvider } from '@/contexts/shortcuts-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ShortcutsProvider>{children}</ShortcutsProvider>
    </AuthProvider>
  );
}
