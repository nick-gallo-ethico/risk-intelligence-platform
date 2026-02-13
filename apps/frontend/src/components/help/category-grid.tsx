"use client";

/**
 * CategoryGrid Component
 *
 * Displays a responsive grid of category cards with article counts.
 * Clicking a category navigates to /help?category=xxx for filtering.
 */

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  FileText,
  BarChart3,
  Settings,
  HelpCircle,
  Link2,
  Shield,
  Briefcase,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { helpApi, type ArticleCategory } from "@/services/help.service";
import { ArticleCard } from "./article-card";

/**
 * Category icons mapping
 */
const CATEGORY_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  "getting-started": BookOpen,
  cases: Briefcase,
  reports: BarChart3,
  policies: FileText,
  settings: Settings,
  faq: HelpCircle,
  integrations: Link2,
  security: Shield,
};

/**
 * Category descriptions for better UX
 */
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "getting-started": "New to the platform? Start here.",
  cases: "Managing cases and investigations.",
  reports: "Analytics, dashboards, and exports.",
  policies: "Policy lifecycle management.",
  settings: "Configuration and preferences.",
  faq: "Frequently asked questions.",
  integrations: "Connect with other systems.",
  security: "Security best practices.",
};

interface CategoryCardProps {
  category: ArticleCategory;
  onClick: () => void;
}

function CategoryCard({ category, onClick }: CategoryCardProps) {
  const Icon = CATEGORY_ICONS[category.key] || HelpCircle;
  const description =
    CATEGORY_DESCRIPTIONS[category.key] || `Browse ${category.label} articles`;

  return (
    <Card
      className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{category.label}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
            <p className="text-xs text-muted-foreground mt-2">
              {category.count} article{category.count !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

export function CategoryGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCategory = searchParams ? searchParams.get("category") : null;

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["help", "categories"],
    queryFn: helpApi.getCategories,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  // Fetch articles when a category is selected
  const { data: articles, isLoading: articlesLoading } = useQuery({
    queryKey: ["help", "articles", "category", selectedCategory],
    queryFn: () => helpApi.searchArticles("", selectedCategory!),
    enabled: !!selectedCategory,
    staleTime: 1000 * 60 * 5,
  });

  const handleCategoryClick = (categoryKey: string) => {
    router.push(`/help?category=${categoryKey}`);
  };

  const handleBackClick = () => {
    router.push("/help");
  };

  // Show selected category articles
  if (selectedCategory) {
    const selectedCategoryData = categories?.find(
      (c) => c.key === selectedCategory,
    );
    const categoryLabel = selectedCategoryData?.label || selectedCategory;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBackClick}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to all categories
          </Button>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">{categoryLabel}</h2>
          <p className="text-muted-foreground mt-1">
            {CATEGORY_DESCRIPTIONS[selectedCategory] ||
              `Browse ${categoryLabel} articles`}
          </p>
        </div>

        {articlesLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Loading articles...</span>
          </div>
        ) : articles && articles.length > 0 ? (
          <div className="space-y-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No articles found in this category yet.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Show category grid
  if (categoriesLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span>Loading categories...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Browse by Topic</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories?.map((category) => (
          <CategoryCard
            key={category.key}
            category={category}
            onClick={() => handleCategoryClick(category.key)}
          />
        ))}
      </div>
    </div>
  );
}
