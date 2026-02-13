"use client";

/**
 * Help Center Landing Page
 *
 * Main help & support page with search, category browsing, and support ticket links.
 * The page shows a search bar for finding articles, and either:
 * - Search results (when searching)
 * - Category grid (when browsing)
 * - Category articles (when ?category=xxx is in URL)
 */

import { useState, Suspense } from "react";
import Link from "next/link";
import { HelpCircle, Ticket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ArticleSearch } from "@/components/help/article-search";
import { CategoryGrid } from "@/components/help/category-grid";

function HelpPageContent() {
  const [isSearchActive, setIsSearchActive] = useState(false);

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="text-center py-8">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
          <HelpCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          How can we help?
        </h1>
        <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
          Search our knowledge base or browse by topic to find answers.
        </p>
      </section>

      {/* Search Section */}
      <section className="max-w-2xl mx-auto">
        <ArticleSearch onSearchActive={setIsSearchActive} />
      </section>

      {/* Category Grid (hidden when search is active) */}
      {!isSearchActive && (
        <section>
          <CategoryGrid />
        </section>
      )}

      {/* Support Ticket Section */}
      <section className="pt-4">
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Can&apos;t find what you need?
            </CardTitle>
            <CardDescription>
              Our support team is here to help. Submit a ticket and we&apos;ll
              get back to you as soon as possible.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Button asChild>
              <Link href="/help/tickets/new">
                Submit a Support Ticket
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/help/tickets">View My Tickets</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

/**
 * Help Center Page with Suspense boundary for useSearchParams
 */
export default function HelpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <HelpPageContent />
    </Suspense>
  );
}
