"use client";

import { RouteError } from "@/components/route-error";

/**
 * Catch-all error boundary for authenticated routes.
 * Handles errors that aren't caught by more specific route error boundaries.
 */
export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError error={error} reset={reset} title="Something went wrong" />
  );
}
