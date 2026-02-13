"use client";

/**
 * ArticleCard Component
 *
 * Displays a preview card for a knowledge base article.
 * Used in search results and category article lists.
 */

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ArticleListItem } from "@/services/help.service";

interface ArticleCardProps {
  article: ArticleListItem;
}

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

export function ArticleCard({ article }: ArticleCardProps) {
  const categoryLabel = CATEGORY_LABELS[article.category] || article.category;
  const updatedDate = new Date(article.updatedAt);
  const relativeTime = formatDistanceToNow(updatedDate, { addSuffix: true });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <Link
          href={`/help/articles/${article.slug}`}
          className="text-lg font-semibold hover:text-primary hover:underline transition-colors"
        >
          {article.title}
        </Link>
      </CardHeader>

      <CardContent className="pb-2">
        {article.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {article.excerpt}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="secondary">{categoryLabel}</Badge>
        <span className="text-muted-foreground">Updated {relativeTime}</span>

        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 ml-auto">
            {article.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {article.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{article.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
