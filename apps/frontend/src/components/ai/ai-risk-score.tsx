"use client";

/**
 * AiRiskScore Component
 *
 * A component for displaying AI-generated risk scores with visual severity indicators.
 * Calls the 'risk-score' skill via the skill registry API.
 *
 * Features:
 * - Comprehensive risk assessment with factor breakdown
 * - Visual severity indicators (color, icons, progress)
 * - Key concerns and priority recommendations
 * - Confidence score when available
 *
 * @see risk-score.skill.ts for backend implementation
 */

import { useState, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Shield,
  ShieldAlert,
  ChevronDown,
  RefreshCw,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAiSkills, SkillResult } from "@/hooks/useAiSkills";

/**
 * A single risk factor with score and notes.
 */
export interface RiskFactor {
  score: number;
  notes: string;
}

/**
 * Output from risk scoring skill.
 */
export interface RiskScoreOutput {
  overallScore: number;
  factors: {
    severity: RiskFactor;
    scope: RiskFactor;
    legalExposure: RiskFactor;
    reputationRisk: RiskFactor;
    recurrence: RiskFactor;
    evidence: RiskFactor;
    urgency: RiskFactor;
  };
  keyConcerns: string[];
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  summary: string;
  confidence?: number;
}

interface AiRiskScoreProps {
  /** Content to assess for risk */
  content: string;
  /** Entity type (case, investigation, riu) */
  entityType?: string;
  /** Category of the matter */
  category?: string;
  /** Additional context for assessment */
  additionalContext?: string;
  /** Callback when risk score is generated */
  onScoreGenerated?: (result: RiskScoreOutput) => void;
  /** Show compact version (just the score badge) */
  compact?: boolean;
  /** Auto-trigger on mount */
  autoTrigger?: boolean;
  /** Additional class names */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Factor display names and descriptions.
 */
const FACTOR_INFO: Record<
  keyof RiskScoreOutput["factors"],
  { label: string; description: string }
> = {
  severity: {
    label: "Severity",
    description: "Seriousness of alleged behavior",
  },
  scope: {
    label: "Scope",
    description: "Number of affected people/departments",
  },
  legalExposure: {
    label: "Legal Exposure",
    description: "Regulatory and legal consequences",
  },
  reputationRisk: {
    label: "Reputation Risk",
    description: "Organization reputation impact",
  },
  recurrence: {
    label: "Recurrence",
    description: "Pattern vs isolated incident",
  },
  evidence: {
    label: "Evidence",
    description: "Quality and clarity of evidence",
  },
  urgency: {
    label: "Urgency",
    description: "Time sensitivity of response",
  },
};

/**
 * Get priority color based on level.
 */
function getPriorityColor(priority: RiskScoreOutput["priority"]): string {
  switch (priority) {
    case "CRITICAL":
      return "bg-red-600 text-white";
    case "HIGH":
      return "bg-orange-500 text-white";
    case "MEDIUM":
      return "bg-yellow-500 text-black";
    case "LOW":
      return "bg-green-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
}

/**
 * Get priority icon based on level.
 */
function getPriorityIcon(priority: RiskScoreOutput["priority"]) {
  switch (priority) {
    case "CRITICAL":
      return <ShieldAlert className="w-4 h-4" />;
    case "HIGH":
      return <AlertTriangle className="w-4 h-4" />;
    case "MEDIUM":
      return <AlertCircle className="w-4 h-4" />;
    case "LOW":
      return <Shield className="w-4 h-4" />;
    default:
      return <Shield className="w-4 h-4" />;
  }
}

/**
 * Get score color based on value.
 */
function getScoreColor(score: number): string {
  if (score >= 8) return "text-red-600";
  if (score >= 6) return "text-orange-500";
  if (score >= 4) return "text-yellow-600";
  return "text-green-600";
}

/**
 * Get progress color based on score value.
 */
function getProgressColor(score: number): string {
  if (score >= 8) return "bg-red-500";
  if (score >= 6) return "bg-orange-500";
  if (score >= 4) return "bg-yellow-500";
  return "bg-green-500";
}

/**
 * Component for displaying AI-generated risk scores.
 *
 * @example
 * ```tsx
 * <AiRiskScore
 *   content={caseDetails}
 *   entityType="case"
 *   category="Fraud"
 *   onScoreGenerated={(result) => console.log(result.priority)}
 * />
 * ```
 */
export function AiRiskScore({
  content,
  entityType,
  category,
  additionalContext,
  onScoreGenerated,
  compact = false,
  autoTrigger = false,
  className,
  disabled = false,
}: AiRiskScoreProps) {
  const { executeSkill, isExecuting, error, rateLimitRetryAfter, reset } =
    useAiSkills<RiskScoreOutput>();
  const [riskScore, setRiskScore] = useState<RiskScoreOutput | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * Get risk score from AI.
   */
  const getRiskScore = useCallback(async () => {
    if (!content || content.length < 10) {
      return;
    }

    const result: SkillResult<RiskScoreOutput> = await executeSkill(
      "risk-score",
      {
        content,
        entityType,
        category,
        additionalContext,
      },
    );

    if (result.success && result.data) {
      setRiskScore(result.data);
      setIsExpanded(true);
      onScoreGenerated?.(result.data);
    }
  }, [
    content,
    entityType,
    category,
    additionalContext,
    executeSkill,
    onScoreGenerated,
  ]);

  // Auto-trigger on mount
  useState(() => {
    if (autoTrigger && content.length >= 10) {
      getRiskScore();
    }
  });

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

  // No score yet - show trigger button
  if (!riskScore && !isExecuting) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={getRiskScore}
        disabled={disabled || !content || content.length < 10}
        className={className}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Assess Risk
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
              <p className="text-sm font-medium">Assessing risk...</p>
              <p className="text-xs text-gray-500">
                Analyzing content for risk factors
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact view - just the badge
  if (compact && riskScore) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={cn(
              "cursor-pointer",
              getPriorityColor(riskScore.priority),
              className,
            )}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {getPriorityIcon(riskScore.priority)}
            <span className="ml-1">{riskScore.priority}</span>
            <span className="ml-1 opacity-80">
              ({riskScore.overallScore}/10)
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{riskScore.summary}</p>
          {riskScore.confidence && (
            <p className="text-xs opacity-80">
              Confidence: {Math.round(riskScore.confidence * 100)}%
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Full view with factors breakdown
  if (!riskScore) return null;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className={cn("border-purple-200", className)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 cursor-pointer hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <CardTitle className="text-sm font-medium">
                  AI Risk Assessment
                </CardTitle>
                <Badge className={getPriorityColor(riskScore.priority)}>
                  {getPriorityIcon(riskScore.priority)}
                  <span className="ml-1">{riskScore.priority}</span>
                </Badge>
                <span
                  className={cn(
                    "text-lg font-bold",
                    getScoreColor(riskScore.overallScore),
                  )}
                >
                  {riskScore.overallScore}/10
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform",
                  isExpanded && "rotate-180",
                )}
              />
            </div>
            {!isExpanded && (
              <CardDescription className="text-xs mt-1 line-clamp-1">
                {riskScore.summary}
              </CardDescription>
            )}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Summary */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm">{riskScore.summary}</p>
              {riskScore.confidence && (
                <p className="text-xs text-gray-500 mt-1">
                  Assessment confidence:{" "}
                  {Math.round(riskScore.confidence * 100)}%
                </p>
              )}
            </div>

            {/* Key Concerns */}
            {riskScore.keyConcerns.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Key Concerns
                </h4>
                <ul className="space-y-1">
                  {riskScore.keyConcerns.map((concern, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      {concern}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Factor Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Risk Factors
              </h4>
              <div className="space-y-3">
                {Object.entries(riskScore.factors).map(([key, factor]) => {
                  const factorKey = key as keyof RiskScoreOutput["factors"];
                  const info = FACTOR_INFO[factorKey];
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs font-medium cursor-help">
                              {info.label}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{info.description}</p>
                          </TooltipContent>
                        </Tooltip>
                        <span
                          className={cn(
                            "text-xs font-bold",
                            getScoreColor(factor.score),
                          )}
                        >
                          {factor.score}/10
                        </span>
                      </div>
                      <div className="relative">
                        <Progress value={factor.score * 10} className="h-2" />
                        <div
                          className={cn(
                            "absolute inset-0 h-2 rounded-full",
                            getProgressColor(factor.score),
                          )}
                          style={{ width: `${factor.score * 10}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {factor.notes}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Refresh button */}
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRiskScore(null);
                  getRiskScore();
                }}
                disabled={isExecuting}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-assess Risk
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
