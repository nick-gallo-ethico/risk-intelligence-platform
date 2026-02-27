"use client";

/**
 * Edit Rule Page
 *
 * Edit an existing routing rule with tabs for configuration, testing, and logs.
 *
 * Route: /settings/rules/[id]
 */

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RuleForm } from "@/components/rules/rule-form";
import { RuleTestPanel } from "@/components/rules/rule-test-panel";
import { rulesApi } from "@/services/rules";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { UpdateRuleRequest } from "@/types/rules";

// ============================================================================
// Page Component
// ============================================================================

export default function EditRulePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const ruleId = params?.id as string;

  const initialTab = searchParams?.get("tab") || "edit";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Fetch rule
  const { data: rule, isLoading } = useQuery({
    queryKey: ["rule", ruleId],
    queryFn: () => rulesApi.getRule(ruleId),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateRuleRequest) => rulesApi.updateRule(ruleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rule", ruleId] });
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      toast.success("Rule updated");
    },
    onError: () => toast.error("Failed to update rule"),
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Not found state
  if (!rule) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-semibold">Rule not found</h1>
        <p className="text-muted-foreground mt-2">
          The rule you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{rule.name}</h1>
            <Badge variant={rule.isActive ? "default" : "secondary"}>
              {rule.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {rule.description || "Configure rule conditions and actions"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="edit">Configuration</TabsTrigger>
          <TabsTrigger value="test">Test Rule</TabsTrigger>
          <TabsTrigger value="logs">Execution Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-6">
          <RuleForm
            initialData={rule}
            onSubmit={(data) => updateMutation.mutate(data)}
            isSubmitting={updateMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="test" className="mt-6">
          <RuleTestPanel ruleId={ruleId} />
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <ExecutionLogsPanel ruleId={ruleId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Execution Logs Panel Component
// ============================================================================

function ExecutionLogsPanel({ ruleId }: { ruleId: string }) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["rule-logs", ruleId],
    queryFn: () => rulesApi.getExecutionLogs(ruleId, 50),
  });

  if (isLoading) {
    return <Skeleton className="h-[200px] w-full" />;
  }

  if (!logs?.length) {
    return (
      <div className="text-center py-8 border rounded-lg">
        <p className="text-muted-foreground">No execution logs yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Logs will appear here once the rule is activated and processes cases.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-center justify-between p-4 border rounded-lg"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{log.entityId}</span>
              <Badge variant={log.matched ? "default" : "secondary"}>
                {log.matched ? "Matched" : "No match"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(log.executedAt).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">
              {log.executionTimeMs}ms
            </div>
            {log.errorMessage && (
              <p className="text-sm text-destructive">{log.errorMessage}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
