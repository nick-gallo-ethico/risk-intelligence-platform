"use client";

/**
 * Rules List Table Component
 *
 * Displays a table of routing rules with actions for each rule.
 * Supports filtering by trigger event and active status.
 */

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  MoreHorizontal,
  Play,
  Pause,
  Trash2,
  Edit,
  TestTube,
} from "lucide-react";
import { rulesApi } from "@/services/rules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { RuleTriggerEvent } from "@/types/rules";
import { TRIGGER_EVENT_LABELS } from "@/types/rules";

// ============================================================================
// Component Props
// ============================================================================

interface RulesListTableProps {
  triggerEvent?: RuleTriggerEvent;
  isActive?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function RulesListTable({
  triggerEvent,
  isActive,
}: RulesListTableProps) {
  const queryClient = useQueryClient();

  // Fetch rules
  const { data: rules, isLoading } = useQuery({
    queryKey: ["rules", { triggerEvent, isActive }],
    queryFn: () => rulesApi.listRules({ triggerEvent, isActive }),
  });

  // Activate mutation
  const activateMutation = useMutation({
    mutationFn: (id: string) => rulesApi.activateRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      toast.success("Rule activated");
    },
    onError: () => toast.error("Failed to activate rule"),
  });

  // Deactivate mutation
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => rulesApi.deactivateRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      toast.success("Rule deactivated");
    },
    onError: () => toast.error("Failed to deactivate rule"),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => rulesApi.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      toast.success("Rule deleted");
    },
    onError: () => toast.error("Failed to delete rule"),
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  // Empty state
  if (!rules?.length) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-muted-foreground">No routing rules configured</p>
        <Button asChild className="mt-4">
          <Link href="/settings/rules/new">Create your first rule</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Tested</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell>
                <Link
                  href={`/settings/rules/${rule.id}`}
                  className="font-medium hover:underline"
                >
                  {rule.name}
                </Link>
                {rule.description && (
                  <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                    {rule.description}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {TRIGGER_EVENT_LABELS[rule.triggerEvent] || rule.triggerEvent}
                </Badge>
              </TableCell>
              <TableCell>{rule.priority}</TableCell>
              <TableCell>
                <Badge variant={rule.isActive ? "default" : "secondary"}>
                  {rule.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                {rule.lastTestedAt
                  ? new Date(rule.lastTestedAt).toLocaleDateString()
                  : "Never"}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Rule actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/settings/rules/${rule.id}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/settings/rules/${rule.id}?tab=test`}>
                        <TestTube className="mr-2 h-4 w-4" />
                        Test Rule
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {rule.isActive ? (
                      <DropdownMenuItem
                        onClick={() => deactivateMutation.mutate(rule.id)}
                        disabled={deactivateMutation.isPending}
                      >
                        <Pause className="mr-2 h-4 w-4" />
                        Deactivate
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => activateMutation.mutate(rule.id)}
                        disabled={activateMutation.isPending}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Activate
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        if (confirm("Delete this rule?")) {
                          deleteMutation.mutate(rule.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
