"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Scale,
  Save,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

// Type definition for SLA configuration
interface SlaConfig {
  enabled: boolean;
  defaultDays: number;
  warningThresholdPercent: number;
  criticalThresholdHours: number;
  severityOverrides?: {
    HIGH?: number;
    MEDIUM?: number;
    LOW?: number;
  };
  categoryOverrides?: Record<string, number>;
}

/**
 * SLA Settings Page
 *
 * Configure organization-level case SLA thresholds and escalation settings:
 * - SLA Thresholds: Default days, warning percentage, critical hours
 * - Severity Overrides: Per-severity SLA days (HIGH, MEDIUM, LOW)
 * - Escalation Rules: Link to rules engine for SLA-based escalation rules
 *
 * Route: /settings/sla
 */
export default function SlaSettingsPage() {
  const queryClient = useQueryClient();

  // Fetch SLA configuration
  const {
    data: config,
    isLoading,
    error,
  } = useQuery<SlaConfig>({
    queryKey: ["sla-config"],
    queryFn: async () => {
      const response = await api.get("/sla/config");
      return response.data;
    },
  });

  // Form state
  const [enabled, setEnabled] = useState<boolean>(true);
  const [defaultDays, setDefaultDays] = useState<string>("14");
  const [warningThresholdPercent, setWarningThresholdPercent] =
    useState<string>("80");
  const [criticalThresholdHours, setCriticalThresholdHours] =
    useState<string>("48");
  const [severityHigh, setSeverityHigh] = useState<string>("");
  const [severityMedium, setSeverityMedium] = useState<string>("");
  const [severityLow, setSeverityLow] = useState<string>("");

  // Initialize form state from fetched config
  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setDefaultDays(String(config.defaultDays));
      setWarningThresholdPercent(String(config.warningThresholdPercent));
      setCriticalThresholdHours(String(config.criticalThresholdHours));
      setSeverityHigh(
        config.severityOverrides?.HIGH
          ? String(config.severityOverrides.HIGH)
          : "",
      );
      setSeverityMedium(
        config.severityOverrides?.MEDIUM
          ? String(config.severityOverrides.MEDIUM)
          : "",
      );
      setSeverityLow(
        config.severityOverrides?.LOW
          ? String(config.severityOverrides.LOW)
          : "",
      );
    }
  }, [config]);

  // Mutation for saving config
  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<SlaConfig>) => {
      const response = await api.patch("/sla/config", payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("SLA configuration saved");
      queryClient.invalidateQueries({ queryKey: ["sla-config"] });
    },
    onError: () => {
      toast.error("Failed to save SLA configuration");
    },
  });

  // Mutation for resetting config
  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/sla/config/reset");
      return response.data;
    },
    onSuccess: () => {
      toast.success("SLA configuration reset to defaults");
      queryClient.invalidateQueries({ queryKey: ["sla-config"] });
    },
    onError: () => {
      toast.error("Failed to reset SLA configuration");
    },
  });

  const handleSave = () => {
    const payload: Partial<SlaConfig> = {
      enabled,
      defaultDays: parseInt(defaultDays) || 14,
      warningThresholdPercent: parseInt(warningThresholdPercent) || 80,
      criticalThresholdHours: parseInt(criticalThresholdHours) || 48,
      severityOverrides: {
        ...(severityHigh ? { HIGH: parseInt(severityHigh) } : {}),
        ...(severityMedium ? { MEDIUM: parseInt(severityMedium) } : {}),
        ...(severityLow ? { LOW: parseInt(severityLow) } : {}),
      },
    };
    saveMutation.mutate(payload);
  };

  const handleReset = () => {
    resetMutation.mutate();
  };

  const isSaving = saveMutation.isPending || resetMutation.isPending;

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/settings"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Settings
          </Link>
          <span>/</span>
          <span className="text-foreground">SLA Configuration</span>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Failed to Load SLA Configuration
            </h2>
            <p className="text-muted-foreground mb-4">
              There was an error loading the configuration. Please try again.
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/settings"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </Link>
        <span>/</span>
        <span className="text-foreground">SLA Configuration</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">SLA Configuration</h1>
        <p className="text-muted-foreground">
          Configure case SLA monitoring thresholds and escalation settings
        </p>
      </div>

      <Tabs defaultValue="thresholds" className="space-y-4">
        <TabsList>
          <TabsTrigger value="thresholds">SLA Thresholds</TabsTrigger>
          <TabsTrigger value="escalation">Escalation Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="thresholds">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle>Case SLA Thresholds</CardTitle>
              </div>
              <CardDescription>
                Configure default SLA durations and warning thresholds for
                cases. These can be overridden per severity level.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <SlaFormSkeleton />
              ) : (
                <>
                  {/* Enable SLA Monitoring */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Enable SLA Monitoring</Label>
                      <p className="text-sm text-muted-foreground">
                        Monitor case SLAs and send notifications
                      </p>
                    </div>
                    <Switch checked={enabled} onCheckedChange={setEnabled} />
                  </div>

                  {/* Default Thresholds */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="defaultDays">Default SLA (days)</Label>
                      <Input
                        id="defaultDays"
                        type="number"
                        min="1"
                        max="365"
                        value={defaultDays}
                        onChange={(e) => setDefaultDays(e.target.value)}
                        placeholder="14"
                      />
                      <p className="text-xs text-muted-foreground">
                        Default case resolution time in days
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="warningThreshold">
                        Warning Threshold (%)
                      </Label>
                      <Input
                        id="warningThreshold"
                        type="number"
                        min="50"
                        max="99"
                        value={warningThresholdPercent}
                        onChange={(e) =>
                          setWarningThresholdPercent(e.target.value)
                        }
                        placeholder="80"
                      />
                      <p className="text-xs text-muted-foreground">
                        Send warning when this % of SLA time is used
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="criticalHours">
                        Critical Threshold (hours)
                      </Label>
                      <Input
                        id="criticalHours"
                        type="number"
                        min="1"
                        max="168"
                        value={criticalThresholdHours}
                        onChange={(e) =>
                          setCriticalThresholdHours(e.target.value)
                        }
                        placeholder="48"
                      />
                      <p className="text-xs text-muted-foreground">
                        Escalate to compliance officer after hours past breach
                      </p>
                    </div>
                  </div>

                  {/* Severity Overrides */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Severity Overrides</h4>
                      <p className="text-sm text-muted-foreground">
                        Override default SLA days based on case severity. Leave
                        empty to use default.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label
                          htmlFor="severityHigh"
                          className="text-red-600 dark:text-red-400"
                        >
                          HIGH Severity (days)
                        </Label>
                        <Input
                          id="severityHigh"
                          type="number"
                          min="1"
                          max="365"
                          value={severityHigh}
                          onChange={(e) => setSeverityHigh(e.target.value)}
                          placeholder="7"
                          className="border-red-200 dark:border-red-800"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="severityMedium"
                          className="text-yellow-600 dark:text-yellow-400"
                        >
                          MEDIUM Severity (days)
                        </Label>
                        <Input
                          id="severityMedium"
                          type="number"
                          min="1"
                          max="365"
                          value={severityMedium}
                          onChange={(e) => setSeverityMedium(e.target.value)}
                          placeholder="14"
                          className="border-yellow-200 dark:border-yellow-800"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="severityLow"
                          className="text-blue-600 dark:text-blue-400"
                        >
                          LOW Severity (days)
                        </Label>
                        <Input
                          id="severityLow"
                          type="number"
                          min="1"
                          max="365"
                          value={severityLow}
                          onChange={(e) => setSeverityLow(e.target.value)}
                          placeholder="30"
                          className="border-blue-200 dark:border-blue-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      disabled={isSaving}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to Defaults
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Configuration
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escalation">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                <CardTitle>Escalation Rules</CardTitle>
              </div>
              <CardDescription>
                Configure automatic escalation triggers based on SLA status and
                case properties.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Escalation rules are managed through the Rules Engine. Create
                  rules with triggers like &quot;sla.warning&quot;,
                  &quot;sla.breached&quot;, or &quot;sla.critical&quot;.
                </p>
                <div className="flex gap-4">
                  <Button asChild>
                    <Link href="/settings/rules?filter=escalation">
                      Manage Escalation Rules
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/settings/rules/new">Create New Rule</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Skeleton loader for SLA form
 */
function SlaFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-[150px]" />
          <Skeleton className="h-4 w-[250px]" />
        </div>
        <Skeleton className="h-6 w-11" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-[180px]" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <div>
          <Skeleton className="h-5 w-[140px]" />
          <Skeleton className="h-4 w-[300px] mt-1" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-[140px]" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
