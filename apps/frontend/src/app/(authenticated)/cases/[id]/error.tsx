"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CaseDetailErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Next.js error boundary for the case detail page.
 *
 * Displays an error message with an AlertCircle icon and two action buttons:
 * - "Try Again" triggers Next.js error recovery (re-renders the segment)
 * - "Go Back" navigates to the previous page via browser history
 *
 * Must be a client component ('use client') per Next.js requirements.
 */
export default function CaseDetailError({
  error,
  reset,
}: CaseDetailErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Failed to load case</h2>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        {error.message ||
          "An unexpected error occurred while loading the case details."}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try Again</Button>
        <Button variant="outline" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    </div>
  );
}
