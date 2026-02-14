"use client";

import { RouteError } from "@/components/route-error";

export default function DisclosuresError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Failed to load disclosures"
    />
  );
}
