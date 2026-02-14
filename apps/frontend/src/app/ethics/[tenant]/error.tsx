"use client";

import { RouteError } from "@/components/route-error";

export default function EthicsPortalError({
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
      title="Failed to load reporting portal"
    />
  );
}
