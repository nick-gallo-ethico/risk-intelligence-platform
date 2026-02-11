"use client";

/**
 * AiCategorySuggest Component
 *
 * A component for AI-powered category suggestions during RIU intake.
 * Calls the 'category-suggest' skill via the skill registry API.
 *
 * Features:
 * - Analyzes content and suggests categories with confidence scores
 * - Shows reasoning for each suggestion
 * - Allows selection from suggestions
 * - Rate limit handling
 *
 * @see category-suggest.skill.ts for backend implementation
 */

import { useState, useCallback, useEffect } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAiSkills, SkillResult } from "@/hooks/useAiSkills";

/**
 * A single category suggestion with confidence and reasoning.
 */
export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reasoning: string;
}

/**
 * Output from category suggestion skill.
 */
export interface CategorySuggestOutput {
  suggestions: CategorySuggestion[];
  indicators: string[];
  topSuggestion?: CategorySuggestion;
}

/**
 * Category definition for the suggestions.
 */
export interface Category {
  id: string;
  name: string;
  description?: string;
}

interface AiCategorySuggestProps {
  /** Content to analyze for category suggestions */
  content: string;
  /** Available categories (optional - uses org defaults if not provided) */
  categories?: Category[];
  /** Callback when a category is selected */
  onCategorySelected: (categoryId: string, categoryName: string) => void;
  /** Auto-trigger on content change (with debounce) */
  autoTrigger?: boolean;
  /** Minimum content length before auto-trigger */
  minContentLength?: number;
  /** Additional class names */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Component for AI-powered category suggestions during intake.
 *
 * @example
 * ```tsx
 * <AiCategorySuggest
 *   content={reportText}
 *   categories={availableCategories}
 *   onCategorySelected={(id, name) => setSelectedCategory(id)}
 *   autoTrigger
 *   minContentLength={50}
 * />
 * ```
 */
export function AiCategorySuggest({
  content,
  categories,
  onCategorySelected,
  autoTrigger = false,
  minContentLength = 50,
  className,
  disabled = false,
}: AiCategorySuggestProps) {
  const { executeSkill, isExecuting, error, rateLimitRetryAfter, reset } =
    useAiSkills<CategorySuggestOutput>();
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [indicators, setIndicators] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  /**
   * Get category suggestions from AI.
   */
  const getSuggestions = useCallback(async () => {
    if (!content || content.length < 10) {
      return;
    }

    const result: SkillResult<CategorySuggestOutput> = await executeSkill(
      "category-suggest",
      {
        content,
        categories: categories?.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
        })),
      },
    );

    if (result.success && result.data) {
      setSuggestions(result.data.suggestions);
      setIndicators(result.data.indicators);
      setIsExpanded(true);
    }
  }, [content, categories, executeSkill]);

  /**
   * Auto-trigger on content change (debounced).
   */
  useEffect(() => {
    if (!autoTrigger || disabled || hasTriggered) {
      return;
    }

    if (content.length < minContentLength) {
      return;
    }

    const timer = setTimeout(() => {
      setHasTriggered(true);
      getSuggestions();
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [
    content,
    autoTrigger,
    disabled,
    minContentLength,
    hasTriggered,
    getSuggestions,
  ]);

  /**
   * Handle category selection.
   */
  const handleSelect = useCallback(
    (suggestion: CategorySuggestion) => {
      setSelectedId(suggestion.categoryId);
      onCategorySelected(suggestion.categoryId, suggestion.categoryName);
    },
    [onCategorySelected],
  );

  /**
   * Get confidence color based on value.
   */
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-orange-600";
  };

  /**
   * Get confidence label based on value.
   */
  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  // Error state
  if (error) {
    return (
      <Card className={cn("border-red-200 bg-red-50", className)}>
        <CardContent className="py-3">
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span>{error.message}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                reset();
                setHasTriggered(false);
              }}
              className="ml-auto"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Rate limited state
  if (rateLimitRetryAfter) {
    const seconds = Math.ceil(rateLimitRetryAfter / 1000);
    return (
      <Card className={cn("border-yellow-200 bg-yellow-50", className)}>
        <CardContent className="py-3">
          <div className="flex items-center gap-2 text-sm text-yellow-700">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Rate limit exceeded. Retry in {seconds}s...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No suggestions yet - show trigger button
  if (suggestions.length === 0 && !isExecuting) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={getSuggestions}
        disabled={disabled || !content || content.length < 10}
        className={className}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Suggest Category
      </Button>
    );
  }

  // Loading state
  if (isExecuting) {
    return (
      <Card className={cn("border-purple-200", className)}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            <div>
              <p className="text-sm font-medium">Analyzing content...</p>
              <p className="text-xs text-gray-500">
                Finding the best category match
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Suggestions list
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className={cn("border-purple-200", className)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 cursor-pointer hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <CardTitle className="text-sm font-medium">
                  AI Category Suggestions
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {suggestions.length} found
                </Badge>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform",
                  isExpanded && "rotate-180",
                )}
              />
            </div>
            {!isExpanded && suggestions[0] && (
              <CardDescription className="text-xs mt-1">
                Top suggestion: {suggestions[0].categoryName} (
                {Math.round(suggestions[0].confidence * 100)}%)
              </CardDescription>
            )}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {/* Key indicators */}
            {indicators.length > 0 && (
              <div className="flex flex-wrap gap-1 pb-2 border-b">
                <span className="text-xs text-gray-500">Key indicators:</span>
                {indicators.slice(0, 5).map((indicator, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {indicator}
                  </Badge>
                ))}
              </div>
            )}

            {/* Suggestions */}
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.categoryId}
                  onClick={() => handleSelect(suggestion)}
                  className={cn(
                    "w-full p-3 rounded-lg border text-left transition-colors",
                    selectedId === suggestion.categoryId
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {suggestion.categoryName}
                        </span>
                        {selectedId === suggestion.categoryId && (
                          <Check className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {suggestion.reasoning}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          getConfidenceColor(suggestion.confidence),
                        )}
                      >
                        {Math.round(suggestion.confidence * 100)}%
                      </span>
                      <span className="text-xs text-gray-400">
                        {getConfidenceLabel(suggestion.confidence)}
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={suggestion.confidence * 100}
                    className="h-1 mt-2"
                  />
                </button>
              ))}
            </div>

            {/* Refresh button */}
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSuggestions([]);
                  setIndicators([]);
                  setHasTriggered(false);
                  getSuggestions();
                }}
                disabled={isExecuting}
                className="w-full"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Re-analyze Content
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
