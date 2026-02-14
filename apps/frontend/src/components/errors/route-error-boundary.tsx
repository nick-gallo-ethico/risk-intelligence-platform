"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home } from "lucide-react";

interface RouteErrorBoundaryProps {
  /** The error that was thrown */
  error: Error;
  /** Function to reset the error state and retry rendering */
  reset: () => void;
}

/**
 * Error boundary component for Next.js route error handling.
 *
 * This component is designed to be used in Next.js error.tsx files.
 * It provides a full-page error UI with options to retry or navigate home.
 *
 * Usage in app/dashboard/error.tsx:
 * ```tsx
 * 'use client';
 * import { RouteErrorBoundary } from '@/components/errors';
 *
 * export default function Error({ error, reset }: { error: Error; reset: () => void }) {
 *   return <RouteErrorBoundary error={error} reset={reset} />;
 * }
 * ```
 */
export function RouteErrorBoundary({ error, reset }: RouteErrorBoundaryProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
      <h1 className="text-2xl font-bold mb-2">Page Error</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        {error.message ||
          "This page encountered an error. Please try again or return home."}
      </p>
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => router.push("/")}>
          <Home className="h-4 w-4 mr-2" />
          Go Home
        </Button>
        <Button onClick={reset}>Try Again</Button>
      </div>
    </div>
  );
}
