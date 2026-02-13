"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PolicyEditor } from "@/components/policies/policy-editor";
import { policiesApi } from "@/services/policies";
import type { UpdatePolicyDto } from "@/types/policy";
import { toast } from "sonner";

/**
 * Policy edit page.
 *
 * Loads the policy and renders the PolicyEditor component
 * with autosave and rich text editing.
 */
export default function PolicyEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch policy
  const {
    data: policy,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["policy", id],
    queryFn: () => policiesApi.getById(id),
    enabled: !!id,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (dto: UpdatePolicyDto) => policiesApi.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy", id] });
    },
    onError: () => {
      toast.error("Failed to save policy changes");
    },
  });

  // Save handler for the editor
  const handleSave = async (dto: UpdatePolicyDto) => {
    await updateMutation.mutateAsync(dto);
  };

  // Submit for approval handler
  const handleSubmitForApproval = () => {
    router.push(`/policies/${id}?action=submit-approval`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to Load Policy</h2>
        <p className="text-muted-foreground mb-4">
          There was an error loading this policy for editing.
        </p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold mb-2">Policy Not Found</h2>
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
          href={`/policies/${id}`}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {policy.title}
        </Link>
        <span>/</span>
        <span className="text-foreground">Edit</span>
      </div>

      {/* Policy Editor */}
      <PolicyEditor
        policy={policy}
        onSave={handleSave}
        onSubmitForApproval={handleSubmitForApproval}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}
