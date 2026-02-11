"use client";

/**
 * AiSummaryButton Component
 *
 * A button that triggers AI-powered summary generation for cases and investigations.
 * Calls the 'summarize' skill via the skill registry API.
 *
 * Features:
 * - Brief or comprehensive summary styles
 * - Loading state with spinner
 * - Error display with retry
 * - Rate limit handling
 *
 * @see summarize.skill.ts for backend implementation
 */

import { useState, useCallback } from "react";
import { Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAiSkills, SkillResult } from "@/hooks/useAiSkills";

/**
 * Summary style options.
 */
export type SummaryStyle = "brief" | "comprehensive";

/**
 * Output from summarize skill.
 */
export interface SummarizeOutput {
  summary: string;
  style: SummaryStyle;
  wordCount: number;
  keyPoints?: string[];
  confidence?: number;
}

interface AiSummaryButtonProps {
  /** Content to summarize */
  content: string;
  /** Entity type (case, investigation, campaign) */
  entityType?: string;
  /** Entity ID for context */
  entityId?: string;
  /** Additional context to inform the summary */
  additionalContext?: string;
  /** Callback when summary is generated */
  onSummaryGenerated: (result: SummarizeOutput) => void;
  /** Optional button variant */
  variant?: "default" | "outline" | "ghost" | "secondary";
  /** Optional size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Whether to show dropdown for style selection */
  showStyleDropdown?: boolean;
  /** Default style if no dropdown */
  defaultStyle?: SummaryStyle;
  /** Additional class names */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Button component for generating AI summaries.
 *
 * @example
 * ```tsx
 * <AiSummaryButton
 *   content={caseDetails}
 *   entityType="case"
 *   entityId={caseId}
 *   onSummaryGenerated={(result) => setSummary(result.summary)}
 *   showStyleDropdown
 * />
 * ```
 */
export function AiSummaryButton({
  content,
  entityType,
  entityId,
  additionalContext,
  onSummaryGenerated,
  variant = "outline",
  size = "default",
  showStyleDropdown = false,
  defaultStyle = "brief",
  className,
  disabled = false,
}: AiSummaryButtonProps) {
  const { executeSkill, isExecuting, error, rateLimitRetryAfter, reset } =
    useAiSkills<SummarizeOutput>();
  const [lastError, setLastError] = useState<string | null>(null);

  /**
   * Generate summary with the specified style.
   */
  const generateSummary = useCallback(
    async (style: SummaryStyle) => {
      setLastError(null);

      if (!content || content.length < 10) {
        setLastError("Content too short for summarization");
        return;
      }

      const result: SkillResult<SummarizeOutput> = await executeSkill(
        "summarize",
        {
          content,
          style,
          entityType,
          additionalContext,
        },
      );

      if (result.success && result.data) {
        onSummaryGenerated(result.data);
      } else if (result.error) {
        setLastError(result.error);
      }
    },
    [content, entityType, additionalContext, executeSkill, onSummaryGenerated],
  );

  /**
   * Handle button click (no dropdown).
   */
  const handleClick = useCallback(() => {
    generateSummary(defaultStyle);
  }, [generateSummary, defaultStyle]);

  /**
   * Retry after error.
   */
  const handleRetry = useCallback(() => {
    setLastError(null);
    reset();
  }, [reset]);

  // Button content based on state
  const buttonContent = (
    <>
      {isExecuting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}
      {size !== "icon" && (
        <span className="ml-2">
          {isExecuting ? "Generating..." : "AI Summary"}
        </span>
      )}
    </>
  );

  // Error state
  if (lastError || error) {
    const errorMessage = lastError || error?.message || "Summary failed";
    return (
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size={size}
              onClick={handleRetry}
              className={className}
            >
              <AlertCircle className="w-4 h-4" />
              {size !== "icon" && <span className="ml-2">Error</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{errorMessage}</p>
            <p className="text-xs mt-1">Click to retry</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Rate limited state
  if (rateLimitRetryAfter) {
    const seconds = Math.ceil(rateLimitRetryAfter / 1000);
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            size={size}
            disabled
            className={className}
          >
            <RefreshCw className="w-4 h-4" />
            {size !== "icon" && <span className="ml-2">Wait {seconds}s</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Rate limit exceeded. Please wait {seconds} seconds.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Dropdown version
  if (showStyleDropdown) {
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant={variant}
                size={size}
                disabled={disabled || isExecuting || !content}
                className={className}
              >
                {buttonContent}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Generate AI summary</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => generateSummary("brief")}
            disabled={isExecuting}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Brief Summary
            <span className="text-xs text-gray-500 ml-2">1-2 paragraphs</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => generateSummary("comprehensive")}
            disabled={isExecuting}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Comprehensive Summary
            <span className="text-xs text-gray-500 ml-2">With sections</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Simple button version
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size={size}
          onClick={handleClick}
          disabled={disabled || isExecuting || !content}
          className={className}
        >
          {buttonContent}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Generate {defaultStyle} AI summary</p>
      </TooltipContent>
    </Tooltip>
  );
}
