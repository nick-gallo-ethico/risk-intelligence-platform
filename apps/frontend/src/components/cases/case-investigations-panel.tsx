"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Link2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  User,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/common/empty-state";
import { InvestigationCard } from "./investigation-card";
import { CreateInvestigationDialog } from "./create-investigation-dialog";
import { InvestigationDetailPanel } from "@/components/investigations";
import { getInvestigationsForCase } from "@/lib/investigation-api";
import type { Case } from "@/types/case";
import type { Investigation } from "@/types/investigation";

interface CaseInvestigationsPanelProps {
  caseData: Case | null;
  isLoading: boolean;
}

/**
 * Get status icon based on investigation status
 */
function getStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case "completed":
    case "closed":
      return CheckCircle;
    case "in_progress":
    case "active":
      return Clock;
    case "pending":
    case "new":
      return AlertCircle;
    default:
      return FileText;
  }
}

/**
 * Get status color based on investigation status
 */
function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "completed":
    case "closed":
      return "bg-green-100 text-green-700 border-green-200";
    case "in_progress":
    case "active":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "pending":
    case "new":
      return "bg-amber-100 text-amber-700 border-amber-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Expandable investigation card component
 */
interface ExpandableInvestigationCardProps {
  investigation: Investigation;
  onOpenFull: (investigation: Investigation) => void;
  onViewDetails: (investigation: Investigation) => void;
}

function ExpandableInvestigationCard({
  investigation,
  onOpenFull,
  onViewDetails,
}: ExpandableInvestigationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const StatusIcon = getStatusIcon(investigation.status);

  return (
    <Card
      className={cn("transition-shadow", isExpanded && "ring-1 ring-blue-200")}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-gray-50 rounded-t-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs shrink-0",
                      getStatusColor(investigation.status),
                    )}
                  >
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {investigation.status.replace("_", " ")}
                  </Badge>
                  {investigation.slaStatus && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs shrink-0",
                        investigation.slaStatus === "OVERDUE"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : investigation.slaStatus === "WARNING"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-gray-50 text-gray-700 border-gray-200",
                      )}
                    >
                      {investigation.slaStatus.replace("_", " ")}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900 mt-1 truncate">
                  {`Investigation #${investigation.investigationNumber}`}
                </p>
                {investigation.type && (
                  <p className="text-xs text-muted-foreground truncate">
                    {investigation.type}
                  </p>
                )}
              </div>
              <div className="shrink-0">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="border-t pt-3 mt-1 space-y-3">
              {/* Investigation details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {investigation.primaryInvestigator && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Assigned to
                      </p>
                      <p className="font-medium">
                        {investigation.primaryInvestigator.firstName}{" "}
                        {investigation.primaryInvestigator.lastName}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {formatDate(investigation.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Findings summary if available */}
              {investigation.findingsSummary && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Findings Summary
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {investigation.findingsSummary}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onOpenFull(investigation)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Open Full Investigation
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(investigation)}
                >
                  Quick View
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/**
 * Link Existing Investigation Dialog (placeholder)
 */
interface LinkExistingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onSuccess: () => void;
}

function LinkExistingDialog({
  open,
  onOpenChange,
  caseId,
  onSuccess,
}: LinkExistingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link Existing Investigation</DialogTitle>
          <DialogDescription>
            Search for an existing investigation to link to this case.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6">
          <EmptyState
            icon={Link2}
            title="Coming soon"
            description="The ability to link existing investigations will be available soon."
          />
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Investigations tab component for case detail page.
 *
 * Features:
 * - Count badge showing number of investigations
 * - Create Investigation button
 * - Link Existing Investigation button
 * - Expandable investigation cards with details
 * - Open Full Investigation link to navigate to investigation page
 * - Empty state
 */
export function CaseInvestigationsPanel({
  caseData,
  isLoading,
}: CaseInvestigationsPanelProps) {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [investigationsLoading, setInvestigationsLoading] = useState(false);
  const [investigationsError, setInvestigationsError] = useState<string | null>(
    null,
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<
    string | null
  >(null);

  // Fetch investigations when case data is available
  const fetchInvestigations = useCallback(async () => {
    if (!caseData?.id) {
      setInvestigations([]);
      return;
    }

    setInvestigationsLoading(true);
    setInvestigationsError(null);

    try {
      const response = await getInvestigationsForCase(caseData.id);
      setInvestigations(response.data);
    } catch (error) {
      console.error("Failed to fetch investigations:", error);
      setInvestigationsError("Failed to load investigations");
      setInvestigations([]);
    } finally {
      setInvestigationsLoading(false);
    }
  }, [caseData?.id]);

  useEffect(() => {
    fetchInvestigations();
  }, [fetchInvestigations]);

  const handleInvestigationCreated = useCallback(
    (investigation: Investigation) => {
      setInvestigations((prev) => [...prev, investigation]);
    },
    [],
  );

  const handleOpenFullInvestigation = useCallback(
    (investigation: Investigation) => {
      // Navigate to the investigation detail page
      window.open(`/investigations/${investigation.id}`, "_blank");
    },
    [],
  );

  const handleViewDetails = useCallback((investigation: Investigation) => {
    setSelectedInvestigationId(investigation.id);
  }, []);

  const handleDetailPanelClose = useCallback(() => {
    setSelectedInvestigationId(null);
  }, []);

  const handleLinkSuccess = useCallback(() => {
    fetchInvestigations();
    setLinkDialogOpen(false);
    toast.success("Investigation linked");
  }, [fetchInvestigations]);

  if (isLoading) {
    return <CaseInvestigationsPanelSkeleton />;
  }

  if (!caseData) {
    return null;
  }

  const hasInvestigations = investigations.length > 0;

  return (
    <div className="p-4 space-y-4">
      {/* Header with count and action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">
            Investigations
          </h3>
          {investigations.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {investigations.length}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLinkDialogOpen(true)}
            data-testid="link-investigation-button"
          >
            <Link2 className="w-4 h-4 mr-1" />
            Link Existing
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            data-testid="create-investigation-button"
          >
            <Plus className="w-4 h-4 mr-1" />
            Create Investigation
          </Button>
        </div>
      </div>

      {/* Investigations list */}
      {investigationsLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : investigationsError ? (
        <Card>
          <CardContent className="py-6">
            <div className="text-center text-red-500">
              <p className="text-sm">{investigationsError}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchInvestigations}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : hasInvestigations ? (
        <div className="space-y-3" data-testid="investigations-list">
          {investigations.map((investigation) => (
            <ExpandableInvestigationCard
              key={investigation.id}
              investigation={investigation}
              onOpenFull={handleOpenFullInvestigation}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={Search}
              title="No investigations yet"
              description="Create a new investigation or link an existing one to this case."
            />
          </CardContent>
        </Card>
      )}

      {/* Create Investigation Dialog */}
      <CreateInvestigationDialog
        caseId={caseData.id}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleInvestigationCreated}
      />

      {/* Link Existing Dialog */}
      <LinkExistingDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        caseId={caseData.id}
        onSuccess={handleLinkSuccess}
      />

      {/* Investigation Detail Panel */}
      <InvestigationDetailPanel
        investigationId={selectedInvestigationId}
        onClose={handleDetailPanelClose}
      />
    </div>
  );
}

export function CaseInvestigationsPanelSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-6" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-36" />
        </div>
      </div>

      {/* Cards skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
