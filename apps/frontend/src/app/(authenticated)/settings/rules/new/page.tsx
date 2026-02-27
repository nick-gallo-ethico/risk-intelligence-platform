"use client";

/**
 * New Rule Page
 *
 * Creates a new routing rule.
 *
 * Route: /settings/rules/new
 */

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { RuleForm } from "@/components/rules/rule-form";
import { rulesApi } from "@/services/rules";
import { toast } from "sonner";
import type { CreateRuleRequest } from "@/types/rules";

export default function NewRulePage() {
  const router = useRouter();

  const createMutation = useMutation({
    mutationFn: (data: CreateRuleRequest) => rulesApi.createRule(data),
    onSuccess: (rule) => {
      toast.success("Rule created");
      router.push(`/settings/rules/${rule.id}`);
    },
    onError: () => toast.error("Failed to create rule"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Routing Rule</h1>
        <p className="text-muted-foreground mt-1">
          Configure conditions and actions for automatic case routing
        </p>
      </div>

      <RuleForm
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}
