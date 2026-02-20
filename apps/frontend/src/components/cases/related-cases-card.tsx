"use client";

import { useState, useEffect } from "react";
import { FileText, Link2 } from "lucide-react";
import { AssociationCard } from "@/components/ui/association-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";
import { handleApiError } from "@/lib/api-error-handler";
import Link from "next/link";

interface RelatedCase {
  id: string;
  caseId: string;
  relatedCaseId: string;
  relationshipType:
    | "RELATED"
    | "MERGED_FROM"
    | "DUPLICATE"
    | "PARENT"
    | "CHILD";
  relatedCase: {
    id: string;
    referenceNumber: string;
    status: string;
    summary: string | null;
  };
}

interface RelatedCasesCardProps {
  caseId: string;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  OPEN: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  CLOSED: "bg-muted text-muted-foreground",
};

export function RelatedCasesCard({ caseId }: RelatedCasesCardProps) {
  const [relatedCases, setRelatedCases] = useState<RelatedCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedCases = async () => {
      try {
        // Try to fetch related cases (endpoint may not exist yet)
        const response = await apiClient.get<RelatedCase[]>(
          `/cases/${caseId}/related-cases`,
        );
        setRelatedCases(response || []);
      } catch (error) {
        handleApiError(error, "Failed to load related cases");
        setRelatedCases([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRelatedCases();
  }, [caseId]);

  if (loading) {
    return (
      <AssociationCard
        title="Related Cases"
        count={0}
        icon={Link2}
        collapsible={false}
      >
        <Skeleton className="h-16 w-full" />
      </AssociationCard>
    );
  }

  return (
    <AssociationCard
      title="Related Cases"
      count={relatedCases.length}
      icon={Link2}
      onAdd={() => {
        /* TODO: Open link case modal */
      }}
      onSettings={() => {}}
      viewAllHref={`/cases?relatedTo=${caseId}`}
      viewAllLabel="View all associated Cases"
    >
      {relatedCases.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No related cases</p>
      ) : (
        <div className="space-y-2">
          {relatedCases.slice(0, 5).map((rc) => (
            <Link
              key={rc.id}
              href={`/cases/${rc.relatedCase.id}`}
              className="block p-2 rounded-md hover:bg-muted border"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {rc.relatedCase.referenceNumber}
                  </span>
                </div>
                <Badge
                  className={
                    STATUS_COLORS[rc.relatedCase.status] ||
                    "bg-muted text-muted-foreground"
                  }
                >
                  {rc.relatedCase.status}
                </Badge>
              </div>
              {rc.relatedCase.summary && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {rc.relatedCase.summary}
                </p>
              )}
              <p className="text-xs text-muted-foreground/70 mt-1">
                Association: {rc.relationshipType.replace("_", " ")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </AssociationCard>
  );
}
