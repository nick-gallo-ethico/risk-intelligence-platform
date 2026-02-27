"use client";

/**
 * Rule Test Panel Component
 *
 * Tests a rule against historical cases and displays results.
 * Shows match rate, samples, and allows filtering.
 */

import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PlayCircle, RefreshCw, Check, X } from "lucide-react";
import { rulesApi } from "@/services/rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { TestRuleRequest, RuleTestResult } from "@/types/rules";

// ============================================================================
// Component Props
// ============================================================================

interface RuleTestPanelProps {
  ruleId: string;
}

// ============================================================================
// Component
// ============================================================================

export function RuleTestPanel({ ruleId }: RuleTestPanelProps) {
  // Test options state
  const [limit, setLimit] = useState("100");

  // Fetch existing test results
  const {
    data: existingResults,
    isLoading: isLoadingResults,
    refetch,
  } = useQuery({
    queryKey: ["rule-test-results", ruleId],
    queryFn: () => rulesApi.getTestResults(ruleId),
  });

  // Test mutation
  const testMutation = useMutation({
    mutationFn: (options: TestRuleRequest) =>
      rulesApi.testRule(ruleId, options),
    onSuccess: () => {
      toast.success("Test complete");
      refetch();
    },
    onError: () => toast.error("Test failed"),
  });

  // Run test
  const handleRunTest = () => {
    testMutation.mutate({
      limit: parseInt(limit, 10) || 100,
    });
  };

  // Loading state
  if (isLoadingResults) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  const results = testMutation.data || existingResults?.testResults;

  return (
    <div className="space-y-6">
      {/* Test controls */}
      <Card>
        <CardHeader>
          <CardTitle>Test Rule</CardTitle>
          <CardDescription>
            Test this rule against historical cases to see how many would match.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="limit">Number of cases to test</Label>
              <Input
                id="limit"
                type="number"
                min={10}
                max={1000}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <Button onClick={handleRunTest} disabled={testMutation.isPending}>
              {testMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Run Test
                </>
              )}
            </Button>
          </div>

          {existingResults?.lastTestedAt && (
            <p className="text-sm text-muted-foreground">
              Last tested:{" "}
              {new Date(existingResults.lastTestedAt).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results && <TestResults results={results} />}

      {/* No results state */}
      {!results && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Click &quot;Run Test&quot; to test this rule against historical
              cases.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Test Results Component
// ============================================================================

interface TestResultsProps {
  results: RuleTestResult;
}

function TestResults({ results }: TestResultsProps) {
  const matchPercentage = (results.matchRate * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cases Tested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.totalCases}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cases Matched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {results.matchedCases}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Match Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{matchPercentage}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Samples */}
      {results.samples.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sample Results</CardTitle>
            <CardDescription>
              Showing {results.samples.length} sample cases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Predicted Assignment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.samples.map((sample) => (
                    <TableRow key={sample.caseId}>
                      <TableCell className="font-mono text-sm">
                        {sample.referenceNumber}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {sample.caseDetails?.severity || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sample.caseDetails?.categoryName || "-"}
                      </TableCell>
                      <TableCell>
                        {sample.wouldMatch ? (
                          <Badge variant="default" className="bg-green-600">
                            <Check className="mr-1 h-3 w-3" />
                            Match
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <X className="mr-1 h-3 w-3" />
                            No match
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sample.predictedAssignee || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
