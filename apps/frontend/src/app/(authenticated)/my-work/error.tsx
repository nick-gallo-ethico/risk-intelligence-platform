"use client";

import { RouteError } from "@/components/route-error";

export default function MyWorkError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError error={error} reset={reset} title="Failed to load My Work" />
  );
}
