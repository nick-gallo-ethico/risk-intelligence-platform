"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Search,
  FileText,
  Users,
  AlertTriangle,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

/**
 * Interface for unified search response.
 * Matches the backend UnifiedSearchResult structure.
 */
interface UnifiedSearchHit {
  id: string;
  entityType: string;
  score: number;
  document: Record<string, unknown>;
  highlight?: Record<string, string[]>;
}

interface EntityTypeResult {
  entityType: string;
  count: number;
  hits: UnifiedSearchHit[];
}

interface UnifiedSearchResult {
  query: string;
  totalHits: number;
  results: EntityTypeResult[];
  took: number;
}

/**
 * Entity type configuration for display.
 */
const entityTypeConfig: Record<
  string,
  {
    label: string;
    pluralLabel: string;
    icon: React.ElementType;
    color: string;
    basePath: string;
  }
> = {
  cases: {
    label: "Case",
    pluralLabel: "Cases",
    icon: FileText,
    color: "bg-blue-100 text-blue-800",
    basePath: "/cases",
  },
  rius: {
    label: "RIU",
    pluralLabel: "RIUs",
    icon: AlertTriangle,
    color: "bg-orange-100 text-orange-800",
    basePath: "/rius",
  },
  investigations: {
    label: "Investigation",
    pluralLabel: "Investigations",
    icon: ClipboardList,
    color: "bg-purple-100 text-purple-800",
    basePath: "/investigations",
  },
  persons: {
    label: "Person",
    pluralLabel: "People",
    icon: Users,
    color: "bg-green-100 text-green-800",
    basePath: "/people",
  },
};

/**
 * Get display title for a search hit based on entity type.
 */
function getHitTitle(hit: UnifiedSearchHit): string {
  const doc = hit.document;
  switch (hit.entityType) {
    case "cases":
      return (
        (doc.referenceNumber as string) ||
        (doc.summary as string)?.slice(0, 50) ||
        "Untitled Case"
      );
    case "rius":
      return (
        (doc.referenceNumber as string) ||
        (doc.summary as string)?.slice(0, 50) ||
        "Untitled RIU"
      );
    case "investigations":
      return (
        (doc.referenceNumber as string) ||
        (doc.title as string) ||
        "Untitled Investigation"
      );
    case "persons":
      const firstName = (doc.firstName as string) || "";
      const lastName = (doc.lastName as string) || "";
      return (
        `${firstName} ${lastName}`.trim() ||
        (doc.email as string) ||
        "Unknown Person"
      );
    default:
      return (
        (doc.referenceNumber as string) ||
        (doc.title as string) ||
        (doc.name as string) ||
        "Untitled"
      );
  }
}

/**
 * Get display subtitle/description for a search hit.
 */
function getHitDescription(hit: UnifiedSearchHit): string {
  const doc = hit.document;

  // Use highlighted snippet if available
  if (hit.highlight) {
    const snippets = Object.values(hit.highlight).flat();
    if (snippets.length > 0) {
      return snippets[0];
    }
  }

  switch (hit.entityType) {
    case "cases":
    case "rius":
      return (
        (doc.aiSummary as string) ||
        (doc.details as string)?.slice(0, 150) ||
        ""
      );
    case "investigations":
      return (
        (doc.description as string)?.slice(0, 150) ||
        (doc.findings as string)?.slice(0, 150) ||
        ""
      );
    case "persons":
      return [doc.jobTitle, doc.department].filter(Boolean).join(" - ") || "";
    default:
      return "";
  }
}

/**
 * Get the detail page URL for a search hit.
 */
function getHitUrl(hit: UnifiedSearchHit): string {
  const config = entityTypeConfig[hit.entityType];
  return config
    ? `${config.basePath}/${hit.id}`
    : `/${hit.entityType}/${hit.id}`;
}

/**
 * Loading skeleton for search results.
 */
function SearchResultsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((section) => (
        <div key={section} className="space-y-3">
          <Skeleton className="h-6 w-32" />
          {[1, 2].map((item) => (
            <Card key={item}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-5 w-16" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Inner search page content that uses useSearchParams.
 */
function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams?.get("q") ?? "";
  const [inputValue, setInputValue] = useState(initialQuery);

  // Update input when URL query changes
  useEffect(() => {
    setInputValue(initialQuery);
  }, [initialQuery]);

  // Fetch search results
  const { data, isLoading, isFetching } = useQuery<UnifiedSearchResult>({
    queryKey: ["search", "unified", initialQuery],
    queryFn: async () => {
      const response = await api.get("/search/unified", {
        params: { q: initialQuery, limit: 50 },
      });
      return response.data;
    },
    enabled: !!initialQuery.trim(),
    staleTime: 30000, // 30 seconds
  });

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`);
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Search</h1>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search cases, investigations, policies, people..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" disabled={!inputValue.trim()}>
            Search
          </Button>
        </form>
      </div>

      {/* No Query State */}
      {!initialQuery.trim() && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>
            Enter a search term above to find cases, people, policies, and more.
          </p>
        </div>
      )}

      {/* Loading State */}
      {initialQuery.trim() && isLoading && <SearchResultsSkeleton />}

      {/* Results Header */}
      {data && (
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {data.totalHits === 0
              ? `No results found for "${data.query}"`
              : `Found ${data.totalHits} result${data.totalHits === 1 ? "" : "s"} for "${data.query}"`}
            {isFetching && (
              <Loader2 className="inline-block ml-2 h-4 w-4 animate-spin" />
            )}
          </p>
          {data.took > 0 && (
            <span className="text-xs text-muted-foreground">{data.took}ms</span>
          )}
        </div>
      )}

      {/* No Results State */}
      {data && data.totalHits === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-2">
            No results found for &ldquo;{data.query}&rdquo;
          </p>
          <p className="text-sm text-muted-foreground">
            Try a different search term or check your spelling.
          </p>
        </div>
      )}

      {/* Grouped Results */}
      {data && data.totalHits > 0 && (
        <div className="space-y-8">
          {data.results
            .filter((group) => group.count > 0)
            .map((group) => {
              const config = entityTypeConfig[group.entityType] || {
                label: group.entityType,
                pluralLabel: group.entityType,
                icon: FileText,
                color: "bg-gray-100 text-gray-800",
                basePath: `/${group.entityType}`,
              };
              const Icon = config.icon;

              return (
                <section key={group.entityType}>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {config.pluralLabel} ({group.count})
                  </h2>
                  <div className="space-y-3">
                    {group.hits.map((hit) => (
                      <Link key={hit.id} href={getHitUrl(hit)}>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Badge
                                variant="secondary"
                                className={config.color}
                              >
                                {config.label}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm truncate">
                                  {getHitTitle(hit)}
                                </h3>
                                {getHitDescription(hit) && (
                                  <p
                                    className="text-sm text-muted-foreground mt-1 line-clamp-2"
                                    dangerouslySetInnerHTML={{
                                      __html: getHitDescription(hit),
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
        </div>
      )}
    </div>
  );
}

/**
 * Search Results Page
 *
 * Displays unified search results from the /api/v1/search/unified endpoint.
 * Results are grouped by entity type (Cases, RIUs, Investigations, People).
 *
 * Features:
 * - Reads ?q= query parameter
 * - Allows refining search without navigating back
 * - Shows results grouped by entity type with counts
 * - Clickable results navigate to entity detail pages
 * - Highlights matched terms in excerpts
 */
export default function SearchPage() {
  return (
    <Suspense fallback={<SearchResultsSkeleton />}>
      <SearchPageContent />
    </Suspense>
  );
}
