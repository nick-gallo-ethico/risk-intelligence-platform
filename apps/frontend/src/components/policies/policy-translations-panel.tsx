"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Edit, RefreshCw, Globe, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { policiesApi } from "@/services/policies";
import type { PolicyTranslation } from "@/types/policy";
import { SUPPORTED_LANGUAGES } from "@/types/policy";

interface PolicyTranslationsPanelProps {
  policyId: string;
  latestVersionId?: string;
}

// Translation status colors
const STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800 border-yellow-200",
  APPROVED: "bg-blue-100 text-blue-800 border-blue-200",
  PUBLISHED: "bg-green-100 text-green-800 border-green-200",
  NEEDS_REVISION: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Pending Review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  NEEDS_REVISION: "Needs Revision",
};

/**
 * Policy translations panel component.
 *
 * Displays all translations for the latest policy version with:
 * - Language flag/name
 * - Status badge
 * - Stale indicator with refresh button
 * - View and Edit buttons
 * - Add Translation button with language selector
 */
export function PolicyTranslationsPanel({
  policyId,
  latestVersionId,
}: PolicyTranslationsPanelProps) {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");

  // Fetch translations for the latest version
  const { data: translations, isLoading } = useQuery({
    queryKey: ["policy-translations", latestVersionId],
    queryFn: () => policiesApi.getTranslations(latestVersionId!),
    enabled: !!latestVersionId,
  });

  // Create translation mutation
  const createMutation = useMutation({
    mutationFn: ({
      versionId,
      languageCode,
    }: {
      versionId: string;
      languageCode: string;
    }) => policiesApi.createTranslation(versionId, languageCode, true),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["policy-translations", latestVersionId],
      });
      setIsAddDialogOpen(false);
      setSelectedLanguage("");
    },
  });

  // Refresh stale translation mutation
  const refreshMutation = useMutation({
    mutationFn: (translationId: string) =>
      policiesApi.refreshTranslation(translationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["policy-translations", latestVersionId],
      });
    },
  });

  // Get available languages (not yet translated)
  const existingLanguages = new Set(
    translations?.map((t) => t.languageCode) || [],
  );
  const availableLanguages = Object.entries(SUPPORTED_LANGUAGES).filter(
    ([code]) => !existingLanguages.has(code),
  );

  const handleAddTranslation = () => {
    if (latestVersionId && selectedLanguage) {
      createMutation.mutate({
        versionId: latestVersionId,
        languageCode: selectedLanguage,
      });
    }
  };

  if (!latestVersionId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Globe className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No Published Version</h3>
        <p className="text-muted-foreground mt-1">
          Publish this policy first to add translations.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Translations</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Translation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Translation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Language</label>
                <Select
                  value={selectedLanguage}
                  onValueChange={setSelectedLanguage}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a language..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLanguages.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        All languages translated
                      </SelectItem>
                    ) : (
                      availableLanguages.map(([code, name]) => (
                        <SelectItem key={code} value={code}>
                          {name} ({code.toUpperCase()})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                AI will generate an initial translation that you can review and
                edit.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddTranslation}
                  disabled={!selectedLanguage || createMutation.isPending}
                >
                  {createMutation.isPending
                    ? "Creating..."
                    : "Create Translation"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Translations Grid */}
      {translations && translations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {translations.map((translation) => (
            <TranslationCard
              key={translation.id}
              translation={translation}
              onRefresh={() => refreshMutation.mutate(translation.id)}
              isRefreshing={refreshMutation.isPending}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/30">
          <Globe className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Translations Yet</h3>
          <p className="text-muted-foreground mt-1">
            Add translations to make this policy available in other languages.
          </p>
        </div>
      )}
    </div>
  );
}

interface TranslationCardProps {
  translation: PolicyTranslation;
  onRefresh: () => void;
  isRefreshing: boolean;
}

function TranslationCard({
  translation,
  onRefresh,
  isRefreshing,
}: TranslationCardProps) {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const languageName =
    SUPPORTED_LANGUAGES[translation.languageCode] || translation.languageName;

  return (
    <>
      <Card className={cn(translation.isStale && "border-yellow-400")}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-medium">{languageName}</h4>
              <p className="text-sm text-muted-foreground uppercase">
                {translation.languageCode}
              </p>
            </div>
            <Badge
              className={cn("border", STATUS_COLORS[translation.reviewStatus])}
            >
              {STATUS_LABELS[translation.reviewStatus] ||
                translation.reviewStatus}
            </Badge>
          </div>

          {/* Stale indicator */}
          {translation.isStale && (
            <div className="flex items-center gap-1 text-sm text-yellow-700 bg-yellow-50 px-2 py-1 rounded mb-3">
              <AlertTriangle className="h-4 w-4" />
              <span>Translation is stale</span>
            </div>
          )}

          {/* Translator info */}
          <p className="text-xs text-muted-foreground mb-3">
            Translated by: {translation.translatedBy}
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setIsViewOpen(true)}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            {translation.isStale && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={cn("h-4 w-4", isRefreshing && "animate-spin")}
                />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Translation Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle>{translation.title}</DialogTitle>
              <Badge
                className={cn(
                  "border",
                  STATUS_COLORS[translation.reviewStatus],
                )}
              >
                {STATUS_LABELS[translation.reviewStatus] ||
                  translation.reviewStatus}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {languageName} ({translation.languageCode.toUpperCase()}) &middot;
              Translated by {translation.translatedBy}
            </p>
          </DialogHeader>
          <div
            className="prose prose-sm max-w-none mt-4"
            dangerouslySetInnerHTML={{ __html: translation.content }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
