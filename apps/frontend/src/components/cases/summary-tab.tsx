"use client";

import { Sparkles, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Case } from "@/types/case";

interface SummaryTabProps {
  caseData: Case;
}

/**
 * Summary tab for case detail - shows AI/manual summary and full case details/write-up.
 *
 * Layout:
 * 1. Case Summary section (AI-generated or manual)
 * 2. Full Write-Up / Details section
 */
export function SummaryTab({ caseData }: SummaryTabProps) {
  // Determine which summary to show and if it's AI-generated
  const summaryText = caseData.aiSummary || caseData.summary;
  const isAiGenerated = Boolean(caseData.aiSummary);

  return (
    <div className="p-6 space-y-6">
      {/* Section 1: Case Summary */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-foreground">Summary</h3>
          {summaryText && (
            <Badge
              variant="secondary"
              className={
                isAiGenerated
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40"
                  : "bg-muted text-muted-foreground hover:bg-muted"
              }
            >
              {isAiGenerated ? (
                <>
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Generated
                </>
              ) : (
                <>
                  <User className="w-3 h-3 mr-1" />
                  Manual
                </>
              )}
            </Badge>
          )}
        </div>

        <Card className="bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
          <CardContent className="pt-4">
            {summaryText ? (
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {summaryText}
              </p>
            ) : (
              <div className="text-center py-4">
                <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No summary available. Use the AI panel to generate one.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Show when AI summary was generated */}
        {isAiGenerated && caseData.aiSummaryGeneratedAt && (
          <p className="text-xs text-muted-foreground mt-2">
            Generated{" "}
            {new Date(caseData.aiSummaryGeneratedAt).toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              },
            )}
          </p>
        )}
      </section>

      {/* Section 2: Full Write-Up / Details */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Case Details
        </h3>

        <Card className="bg-card border">
          <CardContent className="pt-4">
            {caseData.details ? (
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {caseData.details}
              </p>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  No case details available.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
