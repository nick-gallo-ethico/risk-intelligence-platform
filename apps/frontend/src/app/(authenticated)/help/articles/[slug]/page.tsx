"use client";

/**
 * Article Detail Page
 *
 * Displays a single knowledge base article with full content.
 * Shows breadcrumbs, metadata, tags, and navigation back to help center.
 */

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Loader2,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { helpApi } from "@/services/help.service";

/**
 * Category labels for display
 */
const CATEGORY_LABELS: Record<string, string> = {
  "getting-started": "Getting Started",
  cases: "Cases & Investigations",
  reports: "Reports & Analytics",
  policies: "Policies",
  settings: "Settings",
  faq: "FAQ",
  integrations: "Integrations",
  security: "Security",
};

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export default function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = use(params);

  const {
    data: article,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["help", "article", slug],
    queryFn: () => helpApi.getArticle(slug),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    retry: false, // Don't retry on 404
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-muted-foreground" />
        <span className="text-muted-foreground">Loading article...</span>
      </div>
    );
  }

  // Error state (article not found)
  if (error || !article) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-semibold mb-2">Article Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The article you&apos;re looking for doesn&apos;t exist or has been
          removed.
        </p>
        <Button asChild>
          <Link href="/help">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Help Center
          </Link>
        </Button>
      </div>
    );
  }

  const categoryLabel = CATEGORY_LABELS[article.category] || article.category;
  const updatedDate = new Date(article.updatedAt);
  const relativeTime = formatDistanceToNow(updatedDate, { addSuffix: true });
  const formattedDate = format(updatedDate, "MMMM d, yyyy");

  return (
    <article className="max-w-4xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm text-muted-foreground mb-6">
        <Link href="/help" className="hover:text-foreground transition-colors">
          Help & Support
        </Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <Link
          href={`/help?category=${article.category}`}
          className="hover:text-foreground transition-colors"
        >
          {categoryLabel}
        </Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="text-foreground truncate max-w-[200px]">
          {article.title}
        </span>
      </nav>

      {/* Article Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-4">
          {article.title}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="secondary">{categoryLabel}</Badge>
          <div className="flex items-center text-muted-foreground">
            <Clock className="h-4 w-4 mr-1" />
            <span>Last updated {relativeTime}</span>
            <span className="mx-2">·</span>
            <span>{formattedDate}</span>
          </div>
        </div>
      </header>

      {/* Article Content */}
      <div
        className="prose prose-slate dark:prose-invert max-w-none mb-8"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      {/* Tags */}
      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8 pt-4 border-t">
          <span className="text-sm text-muted-foreground">Tags:</span>
          {article.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Feedback Section */}
      <Card className="mb-8">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Was this article helpful?
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <ThumbsUp className="h-4 w-4 mr-1" />
                Yes
              </Button>
              <Button variant="outline" size="sm">
                <ThumbsDown className="h-4 w-4 mr-1" />
                No
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Button variant="ghost" asChild>
          <Link href="/help">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Help Center
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/help/tickets/new">Submit a Support Ticket</Link>
        </Button>
      </div>
    </article>
  );
}
