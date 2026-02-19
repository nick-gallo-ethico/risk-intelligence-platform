"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/auth-context";
import { ShortcutsProvider } from "@/contexts/shortcuts-context";

export function Providers({ children }: { children: ReactNode }) {
  // Create QueryClient in state to avoid recreating on re-renders
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ShortcutsProvider>{children}</ShortcutsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
