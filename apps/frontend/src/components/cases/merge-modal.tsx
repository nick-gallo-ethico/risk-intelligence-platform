"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Search,
  AlertTriangle,
  ArrowRight,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { casesApi } from "@/lib/cases-api";
import { apiClient } from "@/lib/api";
import type { Case, CaseStatus } from "@/types/case";

interface MergeModalProps {
  caseId: string;
  caseReferenceNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMerged: (targetCaseId: string) => void;
}

type Step = "search" | "confirm";

/**
 * MergeModal - Two-step modal for merging cases
 *
 * Step 1: Search for target case
 * Step 2: Confirm merge with reason
 *
 * After merge, the source case becomes a tombstone and user is redirected
 * to the target case.
 */
export function MergeModal({
  caseId,
  caseReferenceNumber,
  open,
  onOpenChange,
  onMerged,
}: MergeModalProps) {
  const [step, setStep] = useState<Step>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Case[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setStep("search");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedCase(null);
      setReason("");
      setError(null);
    }
  }, [open]);

  // Debounced search
  const searchCases = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const response = await casesApi.list({ search: query, limit: 10 });
        // Filter out the current case from results
        const filtered = response.data.filter((c) => c.id !== caseId);
        setSearchResults(filtered);
      } catch (err) {
        console.error("Failed to search cases:", err);
        setError("Failed to search cases. Please try again.");
      } finally {
        setIsSearching(false);
      }
    },
    [caseId],
  );

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchCases(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchCases]);

  const handleSelectCase = (targetCase: Case) => {
    setSelectedCase(targetCase);
    setStep("confirm");
  };

  const handleBack = () => {
    setStep("search");
    setReason("");
    setError(null);
  };

  const isValidReason = reason.trim().length >= 10;

  const handleSubmit = async () => {
    if (!selectedCase || !isValidReason) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // POST to target case with source in body
      await apiClient.post(`/cases/${selectedCase.id}/merge`, {
        sourceCaseId: caseId,
        reason: reason.trim(),
      });

      onMerged(selectedCase.id);
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to merge cases:", err);
      setError("Failed to merge cases. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: CaseStatus) => {
    switch (status) {
      case "NEW":
        return "bg-blue-100 text-blue-800";
      case "OPEN":
        return "bg-green-100 text-green-800";
      case "CLOSED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {step === "search" ? "Merge Cases" : "Confirm Merge"}
          </DialogTitle>
          <DialogDescription>
            {step === "search"
              ? "Search for the target case to merge this case into."
              : "Review the merge details and provide a reason."}
          </DialogDescription>
        </DialogHeader>

        {step === "search" ? (
          <div className="py-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by case reference number or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {/* Search Results */}
            <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">
                    Searching...
                  </span>
                </div>
              ) : searchQuery.length < 2 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  Type at least 2 characters to search
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  No matching cases found
                </div>
              ) : (
                searchResults.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleSelectCase(c)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {c.referenceNumber}
                        </span>
                        <Badge className={getStatusColor(c.status)}>
                          {c.status}
                        </Badge>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                    {c.summary && (
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {c.summary}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {/* Merge Preview */}
            <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="font-medium text-sm">{caseReferenceNumber}</div>
                <div className="text-xs text-gray-500">
                  Source (will be merged)
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="text-center">
                <div className="font-medium text-sm">
                  {selectedCase?.referenceNumber}
                </div>
                <div className="text-xs text-gray-500">
                  Target (will remain)
                </div>
              </div>
            </div>

            {/* Warning */}
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This action cannot be undone. The source case (
                {caseReferenceNumber}) will be marked as merged and all its data
                will be associated with the target case.
              </AlertDescription>
            </Alert>

            {/* Reason Textarea */}
            <div className="grid gap-2">
              <Label htmlFor="reason">
                Reason for Merge <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Explain why these cases are being merged (min 10 characters)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
              {reason.length > 0 && !isValidReason && (
                <p className="text-xs text-gray-500">
                  {10 - reason.trim().length} more characters required
                </p>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {step === "confirm" && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={isSubmitting}
              className="mr-auto"
            >
              Back
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {step === "confirm" && (
            <Button
              onClick={handleSubmit}
              disabled={!isValidReason || isSubmitting}
              variant="destructive"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Check className="mr-2 h-4 w-4" />
              Confirm Merge
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
