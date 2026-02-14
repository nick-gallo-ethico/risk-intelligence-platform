import { Skeleton } from "@/components/ui/skeleton";

/**
 * Next.js loading state for the case detail page.
 *
 * Renders skeleton placeholders that match the three-column layout structure:
 * - Left sidebar: header, quick actions, property cards
 * - Center column: pipeline bar, tab bar, tab content
 * - Right sidebar: workflow, people, documents cards
 *
 * On smaller screens (below xl breakpoint), only the center column
 * skeleton is visible, matching the responsive layout behavior.
 */
export default function CaseDetailLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb/header skeleton */}
      <div className="flex-shrink-0 border-b bg-white px-6 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-12" />
          <span className="text-gray-300">/</span>
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>

      {/* Three-column skeleton */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[300px_1fr_300px] min-h-0">
        {/* Left sidebar skeleton - hidden below xl */}
        <div className="hidden xl:block border-r bg-white overflow-y-auto">
          {/* Record header skeleton */}
          <div className="p-4 border-b">
            <Skeleton className="h-6 w-36 mb-3" />
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-3 border-t pt-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions skeleton */}
          <div className="p-4 border-b">
            <Skeleton className="h-9 w-full mb-2" />
            <div className="grid grid-cols-3 gap-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          </div>

          {/* Property cards skeleton */}
          <div className="p-4 space-y-3">
            {/* About card */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-28" />
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex justify-between py-1.5 border-b border-gray-100 last:border-0"
                >
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>

            {/* Intake card (collapsed) */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>

            {/* Classification card */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex justify-between py-1.5 border-b border-gray-100 last:border-0"
                >
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center column skeleton */}
        <div className="bg-gray-50 p-4 space-y-4 overflow-y-auto">
          {/* Pipeline bar skeleton */}
          <Skeleton className="h-12 w-full rounded-lg" />

          {/* Tab bar skeleton */}
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-8 w-24" />
            ))}
          </div>

          {/* Tab content skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        </div>

        {/* Right sidebar skeleton - hidden below xl */}
        <div className="hidden xl:block border-l bg-white p-4 space-y-4 overflow-y-auto">
          {/* Workflow card */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-16 w-full" />
          </div>

          {/* Connected People card */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>

          {/* Linked RIUs card */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            <Skeleton className="h-12 w-full" />
          </div>

          {/* Related Cases card */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* AI button */}
          <Skeleton className="h-10 w-full mt-2" />
        </div>
      </div>
    </div>
  );
}
