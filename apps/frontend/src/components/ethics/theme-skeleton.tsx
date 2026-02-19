"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * ThemeSkeleton - Loading state shown while tenant theme CSS loads.
 *
 * Uses neutral colors via semantic tokens to avoid jarring color shifts when the
 * tenant's theme is applied. Minimal layout with logo placeholder,
 * navigation placeholder, and content area.
 *
 * The skeleton should be visually similar to the final layout structure
 * so the transition feels smooth.
 */
export function ThemeSkeleton() {
  return (
    <div className="min-h-screen bg-muted/50 flex flex-col">
      {/* Header skeleton */}
      <header className="h-16 bg-background border-b border-border px-4 flex items-center justify-between">
        {/* Logo placeholder */}
        <Skeleton className="h-10 w-32" />

        {/* Navigation placeholder (desktop) */}
        <div className="hidden md:flex items-center gap-6">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Language switcher placeholder */}
        <Skeleton className="h-9 w-24" />
      </header>

      {/* Main content skeleton */}
      <main className="flex-1 flex flex-col">
        {/* Hero section skeleton */}
        <div className="bg-background py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Welcome text placeholder */}
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-4 w-96 mx-auto mb-2" />
            <Skeleton className="h-4 w-80 mx-auto" />
          </div>
        </div>

        {/* Quick actions skeleton */}
        <div className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Action cards placeholder */}
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-card rounded-lg border border-border p-6"
                >
                  <Skeleton className="h-10 w-10 rounded-lg mb-4" />
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer skeleton */}
      <footer className="bg-background border-t border-border py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-6">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </footer>
    </div>
  );
}
