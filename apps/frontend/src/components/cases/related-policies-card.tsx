"use client";

import { useState, useEffect } from "react";
import { FileText, BookOpen } from "lucide-react";
import { AssociationCard } from "@/components/ui/association-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";
import { handleApiError } from "@/lib/api-error-handler";
import Link from "next/link";

interface PolicyCaseLink {
  id: string;
  policyId: string;
  caseId: string;
  linkType: "VIOLATION" | "REFERENCE" | "GOVERNING";
  policy: {
    id: string;
    title: string;
    version: string;
    status: string;
    department: string | null;
  };
}

interface RelatedPoliciesCardProps {
  caseId: string;
}

export function RelatedPoliciesCard({ caseId }: RelatedPoliciesCardProps) {
  const [policies, setPolicies] = useState<PolicyCaseLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const response = await apiClient.get<PolicyCaseLink[]>(
          `/cases/${caseId}/policies`,
        );
        setPolicies(response || []);
      } catch (error) {
        handleApiError(error, "Failed to load related policies");
        setPolicies([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicies();
  }, [caseId]);

  if (loading) {
    return (
      <AssociationCard
        title="Related Policies"
        count={0}
        icon={BookOpen}
        collapsible={false}
      >
        <Skeleton className="h-16 w-full" />
      </AssociationCard>
    );
  }

  return (
    <AssociationCard
      title="Related Policies"
      count={policies.length}
      icon={BookOpen}
      onAdd={() => {
        /* TODO: Open link policy modal */
      }}
      onSettings={() => {}}
      viewAllHref={`/policies?caseId=${caseId}`}
      viewAllLabel="View all associated Policies"
    >
      {policies.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No related policies
        </p>
      ) : (
        <div className="space-y-2">
          {policies.slice(0, 5).map((pl) => (
            <Link
              key={pl.id}
              href={`/policies/${pl.policy.id}`}
              className="block p-2 rounded-md hover:bg-muted border"
            >
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {pl.policy.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    v{pl.policy.version} · {pl.policy.status} ·{" "}
                    {pl.policy.department || "General"}
                  </p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {pl.linkType}
                  </Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AssociationCard>
  );
}
