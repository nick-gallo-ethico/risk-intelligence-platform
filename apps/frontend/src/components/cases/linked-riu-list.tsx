"use client";

import { useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Phone,
  Globe,
  Bot,
  FileText,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type {
  RiuAssociation,
  RiuAssociationType,
  RiuType,
  Severity,
  SourceChannel,
} from "@/types/case";

/**
 * Association type display configuration
 */
const ASSOCIATION_CONFIG: Record<
  RiuAssociationType,
  { label: string; color: string }
> = {
  PRIMARY: {
    label: "Primary",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  RELATED: {
    label: "Related",
    color: "bg-gray-100 text-gray-800 border-gray-200",
  },
  MERGED_FROM: {
    label: "Merged",
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
};

/**
 * RIU type display configuration with icons
 */
const RIU_TYPE_CONFIG: Record<RiuType, { label: string; icon: typeof Phone }> =
  {
    HOTLINE_REPORT: { label: "Hotline", icon: Phone },
    WEB_FORM_SUBMISSION: { label: "Web Form", icon: Globe },
    DISCLOSURE_RESPONSE: { label: "Disclosure", icon: FileText },
    CHATBOT_TRANSCRIPT: { label: "Chatbot", icon: Bot },
  };

/**
 * Source channel display labels
 */
const SOURCE_LABELS: Record<SourceChannel, string> = {
  HOTLINE: "Phone",
  WEB_FORM: "Web",
  PROXY: "Proxy",
  DIRECT_ENTRY: "Direct",
  CHATBOT: "Chat",
};

/**
 * Severity color configuration - matches backend Prisma enum
 */
const SEVERITY_COLORS: Record<Severity, string> = {
  LOW: "bg-green-100 text-green-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
};

interface LinkedRiuListProps {
  /** Array of RIU associations */
  associations: RiuAssociation[];
  /** Loading state */
  isLoading?: boolean;
  /** Callback when clicking to view full RIU */
  onRiuClick?: (riuId: string) => void;
}

/**
 * Displays linked RIUs (Risk Intelligence Units) for a case.
 *
 * Features:
 * - Primary RIU highlighted with distinct border
 * - Expandable details without navigation
 * - Association type badges (Primary, Related, Merged)
 * - RIU type icons and source channel labels
 * - Severity badges
 */
export function LinkedRiuList({
  associations,
  isLoading = false,
  onRiuClick,
}: LinkedRiuListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  if (isLoading) {
    return <LinkedRiuListSkeleton />;
  }

  if (!associations || associations.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 border border-dashed rounded-md">
        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No linked reports</p>
        <p className="text-xs mt-1">RIUs will appear here when linked</p>
      </div>
    );
  }

  // Separate primary from other associations
  const primaryAssociation = associations.find(
    (a) => a.associationType === "PRIMARY",
  );
  const otherAssociations = associations.filter(
    (a) => a.associationType !== "PRIMARY",
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">
          Linked Reports
          <span className="ml-2 text-xs font-normal text-gray-500">
            ({associations.length})
          </span>
        </h3>
      </div>

      {/* Primary RIU - always shown first with distinct styling */}
      {primaryAssociation && (
        <RiuCard
          association={primaryAssociation}
          isPrimary
          isExpanded={expandedId === primaryAssociation.id}
          onToggle={() => handleToggleExpand(primaryAssociation.id)}
          onViewClick={onRiuClick}
        />
      )}

      {/* Related/Merged RIUs */}
      {otherAssociations.length > 0 && (
        <div className="space-y-2">
          {primaryAssociation && (
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-400 uppercase tracking-wide">
                Related Reports
              </span>
              <div className="flex-1 border-t border-gray-200" />
            </div>
          )}
          {otherAssociations.map((assoc) => (
            <RiuCard
              key={assoc.id}
              association={assoc}
              isPrimary={false}
              isExpanded={expandedId === assoc.id}
              onToggle={() => handleToggleExpand(assoc.id)}
              onViewClick={onRiuClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RiuCardProps {
  association: RiuAssociation;
  isPrimary: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onViewClick?: (riuId: string) => void;
}

/**
 * Individual RIU card with expandable details
 */
function RiuCard({
  association,
  isPrimary,
  isExpanded,
  onToggle,
  onViewClick,
}: RiuCardProps) {
  const { riu, associationType } = association;
  const typeConfig = RIU_TYPE_CONFIG[riu.type] || {
    label: riu.type,
    icon: FileText,
  };
  const TypeIcon = typeConfig.icon;
  const assocConfig = ASSOCIATION_CONFIG[associationType];

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        isPrimary
          ? "border-2 border-blue-300 shadow-sm bg-blue-50/30"
          : "border border-gray-200 hover:border-gray-300",
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        {/* Header - always visible */}
        <CollapsibleTrigger asChild>
          <button
            className="w-full text-left p-3 flex items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-t-md"
            aria-expanded={isExpanded}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Primary indicator */}
              {isPrimary && (
                <div className="flex-shrink-0">
                  <Star className="w-4 h-4 text-blue-500 fill-blue-500" />
                </div>
              )}

              {/* RIU type icon */}
              <div
                className={cn(
                  "flex-shrink-0 p-1.5 rounded",
                  isPrimary ? "bg-blue-100" : "bg-gray-100",
                )}
              >
                <TypeIcon className="w-4 h-4 text-gray-600" />
              </div>

              {/* Reference number and metadata */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-medium text-gray-900">
                    {riu.referenceNumber}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", assocConfig.color)}
                  >
                    {assocConfig.label}
                  </Badge>
                  {riu.severity && (
                    <Badge
                      variant="outline"
                      className={cn("text-xs", SEVERITY_COLORS[riu.severity])}
                    >
                      {riu.severity}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">
                  {typeConfig.label} via {SOURCE_LABELS[riu.sourceChannel]} |{" "}
                  {new Date(riu.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>

            {/* Expand/collapse indicator */}
            <div className="flex-shrink-0 text-gray-400">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Expandable content */}
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 px-3">
            <div
              className={cn(
                "rounded-md p-3 mt-1",
                isPrimary ? "bg-white border border-blue-100" : "bg-gray-50",
              )}
            >
              {/* Summary */}
              {riu.summary && (
                <div className="mb-3">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Summary
                  </h4>
                  <p className="text-sm text-gray-700">{riu.summary}</p>
                </div>
              )}

              {/* Details - truncated with scroll */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Details
                </h4>
                <div className="max-h-40 overflow-y-auto">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {riu.details}
                  </p>
                </div>
              </div>

              {/* View full RIU link */}
              {onViewClick && (
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewClick(association.riuId);
                    }}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-0 h-auto text-xs"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View full report
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/**
 * Skeleton loader for LinkedRiuList
 */
export function LinkedRiuListSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-32" />
      </div>
      {[1, 2].map((i) => (
        <Card key={i} className="p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-5 w-5" />
          </div>
        </Card>
      ))}
    </div>
  );
}
