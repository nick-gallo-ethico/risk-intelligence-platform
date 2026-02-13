"use client";

/**
 * ArticleSearch Component
 *
 * Search input for knowledge base articles with debounced results.
 * Shows matching articles as ArticleCard list when query is non-empty.
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { helpApi } from "@/services/help.service";
import { ArticleCard } from "./article-card";

interface ArticleSearchProps {
  /** Callback when search results are shown (hides categories) */
  onSearchActive?: (active: boolean) => void;
}

export function ArticleSearch({ onSearchActive }: ArticleSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce the search query with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Notify parent when search is active
  useEffect(() => {
    onSearchActive?.(debouncedQuery.length > 0);
  }, [debouncedQuery, onSearchActive]);

  // Query for search results
  const {
    data: articles,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["help", "search", debouncedQuery],
    queryFn: () => helpApi.searchArticles(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [],
  );

  const showResults = debouncedQuery.length > 0;
  const showLoading = isLoading || isFetching;

  return (
    <div className="w-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search articles..."
          value={searchQuery}
          onChange={handleInputChange}
          className="pl-10 h-12 text-lg"
          aria-label="Search knowledge base articles"
        />
      </div>

      {/* Search Results */}
      {showResults && (
        <div className="mt-6 space-y-4">
          {showLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>Searching...</span>
            </div>
          ) : articles && articles.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Found {articles.length} article
                {articles.length !== 1 ? "s" : ""} for &quot;{debouncedQuery}
                &quot;
              </p>
              <div className="space-y-3">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No articles found for &quot;{debouncedQuery}&quot;
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Try different keywords or browse categories below
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
