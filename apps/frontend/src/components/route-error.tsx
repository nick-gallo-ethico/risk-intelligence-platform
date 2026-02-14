"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}

/**
 * Reusable error boundary component for Next.js route segments.
 * Displays error message with Try Again and Go Back actions.
 *
 * Usage:
 * ```tsx
 * 'use client';
 * import { RouteError } from '@/components/route-error';
 *
 * export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
 *   return <RouteError error={error} reset={reset} title="Failed to load page" />;
 * }
 * ```
 */
export function RouteError({
  error,
  reset,
  title = "Something went wrong",
}: RouteErrorProps) {
  useEffect(() => {
    // Log to error reporting service (e.g., Sentry, LogRocket)
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground mb-4">
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    </div>
  );
}
