"use client";

import { useState, useCallback } from "react";
import { Pencil, Sparkles, Loader2, X, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface EditableSummaryProps {
  /** Current summary text */
  summary: string | null;
  /** Callback when user saves the summary */
  onSave: (newSummary: string) => Promise<void> | void;
  /** Callback to generate AI summary */
  onAiGenerate?: () => Promise<string>;
  /** Whether AI generation is in progress */
  isGenerating?: boolean;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Optional title override */
  title?: string;
  /** Optional className for the card */
  className?: string;
}

/**
 * EditableSummary - Card with editable case summary and AI generation button.
 *
 * Features:
 * - Display mode: renders summary text (or placeholder if empty)
 * - Edit mode: Textarea for editing with Save/Cancel buttons
 * - AI button: Generates summary via onAiGenerate, user can accept/edit/discard
 * - Loading states for both save and AI generation
 *
 * @example
 * ```tsx
 * <EditableSummary
 *   summary={caseData.summary}
 *   onSave={async (text) => await updateCase({ summary: text })}
 *   onAiGenerate={async () => {
 *     const result = await aiSummarize(caseData.details);
 *     return result;
 *   }}
 *   isGenerating={aiLoading}
 * />
 * ```
 */
export function EditableSummary({
  summary,
  onSave,
  onAiGenerate,
  isGenerating = false,
  isSaving = false,
  title = "Case Summary",
  className,
}: EditableSummaryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(summary || "");
  const [aiGeneratedValue, setAiGeneratedValue] = useState<string | null>(null);

  const handleEdit = useCallback(() => {
    setEditValue(summary || "");
    setAiGeneratedValue(null);
    setIsEditing(true);
  }, [summary]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(summary || "");
    setAiGeneratedValue(null);
  }, [summary]);

  const handleSave = useCallback(async () => {
    await onSave(editValue);
    setIsEditing(false);
    setAiGeneratedValue(null);
  }, [editValue, onSave]);

  const handleAiGenerate = useCallback(async () => {
    if (!onAiGenerate) return;

    try {
      const generated = await onAiGenerate();
      setAiGeneratedValue(generated);
      setEditValue(generated);
      // Auto-enter edit mode so user can review/modify
      if (!isEditing) {
        setIsEditing(true);
      }
    } catch (error) {
      console.error("AI generation failed:", error);
      // Don't change edit state on error
    }
  }, [onAiGenerate, isEditing]);

  const handleAcceptAi = useCallback(async () => {
    if (aiGeneratedValue) {
      await onSave(aiGeneratedValue);
      setIsEditing(false);
      setAiGeneratedValue(null);
    }
  }, [aiGeneratedValue, onSave]);

  const handleDiscardAi = useCallback(() => {
    setAiGeneratedValue(null);
    setEditValue(summary || "");
  }, [summary]);

  const displayText = summary || "";
  const isEmpty = !displayText.trim();

  return (
    <Card className={cn("border shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700">
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="h-7 px-2 text-gray-500 hover:text-gray-700"
                aria-label="Edit summary"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              {onAiGenerate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAiGenerate}
                  disabled={isGenerating}
                  className="h-7 gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span className="text-xs font-medium">AI</span>
                </Button>
              )}
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            {/* AI generated notice */}
            {aiGeneratedValue && (
              <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 px-2 py-1.5 rounded-md">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  AI-generated summary. Review and save, or edit below.
                </span>
              </div>
            )}

            {/* Textarea */}
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Enter case summary..."
              rows={4}
              className="resize-none"
              disabled={isSaving}
            />

            {/* Action buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {onAiGenerate && !aiGeneratedValue && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAiGenerate}
                    disabled={isGenerating || isSaving}
                    className="h-8 gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    Generate with AI
                  </Button>
                )}
                {aiGeneratedValue && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDiscardAi}
                    disabled={isSaving}
                    className="h-8 text-gray-500"
                  >
                    Discard AI
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="h-8"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="h-8"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-3">
              No summary yet. Click edit to add one, or use AI to generate.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="h-8"
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Add Summary
              </Button>
              {onAiGenerate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAiGenerate}
                  disabled={isGenerating}
                  className="h-8 gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Generate with AI
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {displayText}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default EditableSummary;
