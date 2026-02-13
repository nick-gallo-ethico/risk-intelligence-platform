"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, AlertCircle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PolicyDetailHeader } from "@/components/policies/policy-detail-header";
import { PolicyVersionHistory } from "@/components/policies/policy-version-history";
import { PolicyTranslationsPanel } from "@/components/policies/policy-translations-panel";
import { PolicyAttestationsPanel } from "@/components/policies/policy-attestations-panel";
import { PolicyCasesPanel } from "@/components/policies/policy-cases-panel";
import { PolicyWorkflowPanel } from "@/components/policies/policy-workflow-panel";
import { RichTextDisplay } from "@/components/rich-text/rich-text-display";
import { policiesApi } from "@/services/policies";

/**
 * Policy detail page.
 *
 * Displays full policy information with tabbed interface:
 * - Content: Rich text policy content
 * - Versions: Version history with diff comparison
 * - Translations: Available translations with status
 * - Attestations: Attestation campaigns for this policy
 * - Linked Cases: Cases associated with this policy
 *
 * Tab selection syncs with URL query parameter (?tab=versions)
 */
export default function PolicyDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab") || "content";

  // Dialog states
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isRetireDialogOpen, setIsRetireDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isCancelApprovalDialogOpen, setIsCancelApprovalDialogOpen] =
    useState(false);

  // Fetch policy
  const {
    data: policy,
    isLoading: isLoadingPolicy,
    error: policyError,
  } = useQuery({
    queryKey: ["policy", id],
    queryFn: () => policiesApi.getById(id),
    enabled: !!id,
  });

  // Fetch versions (always load for version count badge)
  const { data: versions } = useQuery({
    queryKey: ["policy-versions", id],
    queryFn: () => policiesApi.getVersions(id),
    enabled: !!id,
  });

  // Handle tab changes - sync with URL
  const handleTabChange = (tab: string) => {
    const currentParams = searchParams?.toString() || "";
    const params = new URLSearchParams(currentParams);
    if (tab === "content") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const queryString = params.toString();
    router.push(`/policies/${id}${queryString ? `?${queryString}` : ""}`);
  };

  // Get the latest published version for display
  const latestVersion = versions?.find((v) => v.isLatest);
  const displayContent =
    policy?.currentVersion && policy.currentVersion > 0
      ? latestVersion?.content
      : policy?.draftContent;

  // Loading state
  if (isLoadingPolicy) {
    return <PolicyDetailSkeleton />;
  }

  // Error state
  if (policyError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to Load Policy</h2>
        <p className="text-muted-foreground mb-4">
          There was an error loading this policy. Please try again.
        </p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  // Not found state
  if (!policy) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Policy Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The policy you&apos;re looking for doesn&apos;t exist or has been
          deleted.
        </p>
        <Button asChild>
          <Link href="/policies">View All Policies</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/policies"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Policies
        </Link>
        <span>/</span>
        <span className="text-foreground">{policy.title}</span>
      </div>

      {/* Header with optional workflow panel */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <PolicyDetailHeader
            policy={policy}
            onEdit={() => router.push(`/policies/${id}/edit`)}
            onPublish={() => setIsPublishDialogOpen(true)}
            onRetire={() => setIsRetireDialogOpen(true)}
            onSubmitForApproval={() => setIsApprovalDialogOpen(true)}
            onCreateAttestation={() =>
              router.push(`/campaigns/new?type=attestation&policyId=${id}`)
            }
            onCancelApproval={() => setIsCancelApprovalDialogOpen(true)}
          />
        </div>
        {/* Workflow panel - shows when policy is in approval workflow */}
        <div className="w-full lg:w-80 shrink-0">
          <PolicyWorkflowPanel policyId={id} />
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="versions">
            Versions ({policy.currentVersion || 0})
          </TabsTrigger>
          <TabsTrigger value="translations">Translations</TabsTrigger>
          <TabsTrigger value="attestations">Attestations</TabsTrigger>
          <TabsTrigger value="cases">Linked Cases</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-6">
          <div className="bg-background border rounded-lg p-6">
            <RichTextDisplay content={displayContent} />
          </div>
        </TabsContent>

        <TabsContent value="versions" className="mt-6">
          <PolicyVersionHistory policyId={id} versions={versions} />
        </TabsContent>

        <TabsContent value="translations" className="mt-6">
          <PolicyTranslationsPanel
            policyId={id}
            latestVersionId={latestVersion?.id}
          />
        </TabsContent>

        <TabsContent value="attestations" className="mt-6">
          <PolicyAttestationsPanel policyId={id} />
        </TabsContent>

        <TabsContent value="cases" className="mt-6">
          <PolicyCasesPanel policyId={id} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <PublishDialog
        open={isPublishDialogOpen}
        onOpenChange={setIsPublishDialogOpen}
        policyId={id}
      />
      <RetireDialog
        open={isRetireDialogOpen}
        onOpenChange={setIsRetireDialogOpen}
        policyId={id}
      />
      <ApprovalDialog
        open={isApprovalDialogOpen}
        onOpenChange={setIsApprovalDialogOpen}
        policyId={id}
      />
      <CancelApprovalDialog
        open={isCancelApprovalDialogOpen}
        onOpenChange={setIsCancelApprovalDialogOpen}
        policyId={id}
      />
    </div>
  );
}

/**
 * Skeleton loading state for policy detail page
 */
function PolicyDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Skeleton className="h-5 w-32" />

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Tabs */}
      <Skeleton className="h-10 w-[500px]" />

      {/* Content */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

// Dialog components (placeholders for now)

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string;
}

function PublishDialog({ open, onOpenChange, policyId }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish Policy</DialogTitle>
          <DialogDescription>
            This will create a new published version of the policy.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Publishing dialog would include version label, change notes, and
            effective date.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button>Publish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RetireDialog({ open, onOpenChange, policyId }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retire Policy</DialogTitle>
          <DialogDescription>
            Retiring this policy will mark it as no longer active.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive">Retire Policy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApprovalDialog({ open, onOpenChange, policyId }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit for Approval</DialogTitle>
          <DialogDescription>
            Submit this policy for review and approval.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Approval dialog would include workflow selection and submission
            notes.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button>Submit for Approval</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelApprovalDialog({ open, onOpenChange, policyId }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Approval</DialogTitle>
          <DialogDescription>
            This will cancel the current approval workflow and return the policy
            to draft.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep Approval
          </Button>
          <Button variant="destructive">Cancel Approval</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
