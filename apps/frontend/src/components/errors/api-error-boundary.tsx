"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ApiErrorBoundaryProps {
  /** Error from API call (null if no error) */
  error: Error | null;
  /** Whether a retry is in progress */
  isLoading?: boolean;
  /** Callback to retry the failed request */
  onRetry?: () => void;
  /** Content to render when there's no error */
  children: ReactNode;
}

/**
 * Error boundary component for handling API/data loading errors.
 *
 * Unlike the class-based ErrorBoundary, this component handles explicit error states
 * from async operations (e.g., react-query, SWR, or manual fetches).
 *
 * Features:
 * - Shows error UI when error prop is set
 * - Provides retry button with loading state
 * - Renders children when no error
 *
 * Usage with react-query:
 * ```tsx
 * const { data, error, isLoading, refetch } = useQuery(...);
 *
 * return (
 *   <ApiErrorBoundary error={error} isLoading={isLoading} onRetry={refetch}>
 *     <MyComponent data={data} />
 *   </ApiErrorBoundary>
 * );
 * ```
 */
export function ApiErrorBoundary({
  error,
  isLoading,
  onRetry,
  children,
}: ApiErrorBoundaryProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center border rounded-lg bg-muted/50">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h3 className="font-medium mb-1">Failed to load data</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {error.message || "An error occurred while fetching data"}
        </p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Retry
          </Button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
