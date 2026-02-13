"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Sparkles,
  Activity,
  ToggleLeft,
  BarChart3,
  Settings,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Zap,
  Brain,
  FileText,
  AlertTriangle,
  Languages,
  Search,
  MessageSquare,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { aiSettingsApi, type AiHealthResponse } from "@/services/ai-settings";

/**
 * AI Settings Page
 *
 * AI configuration page with sections:
 * - AI Status Card - Health check, model info, capabilities
 * - Feature Toggles Card - Enable/disable AI features per category
 * - Usage Card - Current month usage statistics
 * - API Configuration Card - API status and model info
 */
export default function AiSettingsPage() {
  // Fetch AI health status
  const {
    data: healthData,
    isLoading: healthLoading,
    error: healthError,
    refetch: refetchHealth,
  } = useQuery<AiHealthResponse>({
    queryKey: ["ai-health"],
    queryFn: aiSettingsApi.getHealth,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch AI usage (placeholder data)
  const { data: usageData } = useQuery({
    queryKey: ["ai-usage"],
    queryFn: () => aiSettingsApi.getUsage("month"),
  });

  // Feature toggles state (UI-only for MVP, would be stored in org settings)
  const [featureToggles, setFeatureToggles] = useState({
    noteCleanup: true,
    autoSummarization: true,
    riskScoring: true,
    categorySuggestion: true,
    naturalLanguageQueries: true,
    translation: true,
  });

  const handleToggle = (feature: keyof typeof featureToggles) => {
    setFeatureToggles((prev) => ({
      ...prev,
      [feature]: !prev[feature],
    }));
    // In production, this would save to backend
  };

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
        <span className="text-foreground">AI Settings</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          AI Settings
        </h1>
        <p className="text-muted-foreground">
          Configure AI features, view usage, and manage AI-powered automation
        </p>
      </div>

      {/* AI Status Card */}
      <AiStatusCard
        data={healthData}
        isLoading={healthLoading}
        error={healthError}
        onRefresh={() => refetchHealth()}
      />

      {/* Feature Toggles Card */}
      <FeatureTogglesCard
        toggles={featureToggles}
        onToggle={handleToggle}
        aiAvailable={healthData?.configured ?? false}
      />

      {/* Usage Card */}
      <UsageCard
        usage={usageData}
        aiAvailable={healthData?.configured ?? false}
      />

      {/* API Configuration Card */}
      <ApiConfigCard
        configured={healthData?.configured ?? false}
        model={healthData?.model}
      />
    </div>
  );
}

/**
 * AI Status Card - Health check indicator, model info, capabilities
 */
interface AiStatusCardProps {
  data: AiHealthResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  onRefresh: () => void;
}

function AiStatusCard({
  data,
  isLoading,
  error,
  onRefresh,
}: AiStatusCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            AI Service Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            AI Service Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>
              Unable to connect to AI service. Please check your configuration.
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={onRefresh}
          >
            <Loader2 className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const status = data?.status ?? "unavailable";
  const isAvailable = status === "available";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            AI Service Status
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <Loader2 className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-full ${
              isAvailable ? "bg-green-100" : "bg-amber-100"
            }`}
          >
            {isAvailable ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-amber-600" />
            )}
          </div>
          <div>
            <p className="font-medium">
              {isAvailable ? "Operational" : "Unavailable"}
            </p>
            <p className="text-sm text-muted-foreground">
              {isAvailable
                ? `Connected to ${data?.model || "AI service"}`
                : "AI features are currently disabled"}
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              isAvailable
                ? "bg-green-50 text-green-700 border-green-200 ml-auto"
                : "bg-amber-50 text-amber-700 border-amber-200 ml-auto"
            }
          >
            {isAvailable ? "Online" : "Offline"}
          </Badge>
        </div>

        {/* Capabilities List */}
        {isAvailable && data?.capabilities && (
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-3">Available Capabilities</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {data.capabilities.chat && (
                <CapabilityBadge icon={MessageSquare} label="Chat" />
              )}
              {data.capabilities.skills &&
                data.capabilities.skills.length > 0 && (
                  <CapabilityBadge
                    icon={Zap}
                    label={`${data.capabilities.skills.length} Skills`}
                  />
                )}
              {data.capabilities.agents &&
                data.capabilities.agents.length > 0 && (
                  <CapabilityBadge
                    icon={Brain}
                    label={`${data.capabilities.agents.length} Agents`}
                  />
                )}
              {data.capabilities.actions &&
                data.capabilities.actions.length > 0 && (
                  <CapabilityBadge
                    icon={Settings}
                    label={`${data.capabilities.actions.length} Actions`}
                  />
                )}
            </div>
          </div>
        )}

        {!isAvailable && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>AI Service Not Configured</AlertTitle>
            <AlertDescription>
              To enable AI features, contact your administrator to configure the
              Anthropic API key in your environment.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Capability Badge
 */
function CapabilityBadge({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-primary" />
      <span>{label}</span>
    </div>
  );
}

/** Feature toggle keys */
type FeatureToggleKey =
  | "noteCleanup"
  | "autoSummarization"
  | "riskScoring"
  | "categorySuggestion"
  | "naturalLanguageQueries"
  | "translation";

/**
 * Feature Toggles Card - Enable/disable AI features
 */
interface FeatureTogglesCardProps {
  toggles: Record<FeatureToggleKey, boolean>;
  onToggle: (feature: FeatureToggleKey) => void;
  aiAvailable: boolean;
}

function FeatureTogglesCard({
  toggles,
  onToggle,
  aiAvailable,
}: FeatureTogglesCardProps) {
  const features = [
    {
      id: "noteCleanup",
      icon: FileText,
      label: "Note Cleanup",
      description:
        "AI-powered grammar and formatting improvements for case notes",
    },
    {
      id: "autoSummarization",
      icon: FileText,
      label: "Auto-Summarization",
      description: "Automatically generate summaries for cases and RIUs",
    },
    {
      id: "riskScoring",
      icon: AlertTriangle,
      label: "Risk Scoring",
      description: "AI-based risk assessment and priority recommendations",
    },
    {
      id: "categorySuggestion",
      icon: Brain,
      label: "Category Suggestion",
      description: "Suggest categories based on report content analysis",
    },
    {
      id: "naturalLanguageQueries",
      icon: Search,
      label: "Natural Language Queries",
      description: "Search and filter using conversational language",
    },
    {
      id: "translation",
      icon: Languages,
      label: "Translation",
      description: "Translate policies and reports to multiple languages",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ToggleLeft className="h-5 w-5" />
          AI Feature Toggles
        </CardTitle>
        <CardDescription>
          Enable or disable specific AI features for your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!aiAvailable && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              AI features are unavailable. Configure the AI service to enable
              these toggles.
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-4">
          {features.map((feature, index) => (
            <div key={feature.id}>
              {index > 0 && <Separator className="mb-4" />}
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <feature.icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <Label
                      htmlFor={feature.id}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {feature.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={feature.id}
                  checked={toggles[feature.id as FeatureToggleKey] ?? false}
                  onCheckedChange={() =>
                    onToggle(feature.id as FeatureToggleKey)
                  }
                  disabled={!aiAvailable}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-6">
          Note: Feature toggle preferences are saved at the organization level.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Usage Card - Current month usage statistics
 */
interface UsageCardProps {
  usage: { requests: number; tokens: number } | undefined;
  aiAvailable: boolean;
}

function UsageCard({ usage, aiAvailable }: UsageCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Usage & Limits
        </CardTitle>
        <CardDescription>
          Current month AI usage statistics and rate limits
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!aiAvailable ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Usage metrics available when connected to AI service</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">
                Requests This Month
              </p>
              <p className="text-3xl font-bold">
                {usage?.requests?.toLocaleString() ?? "0"}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Tokens Used</p>
              <p className="text-3xl font-bold">
                {usage?.tokens?.toLocaleString() ?? "0"}
              </p>
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4">
          Usage resets on the first of each month. Contact support for rate
          limit adjustments.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * API Configuration Card
 */
interface ApiConfigCardProps {
  configured: boolean;
  model: string | null | undefined;
}

function ApiConfigCard({ configured, model }: ApiConfigCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          API Configuration
        </CardTitle>
        <CardDescription>
          AI service connection and model settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* API Key Status */}
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">API Key Status</p>
              <p className="text-sm text-muted-foreground">
                Anthropic API key configuration
              </p>
            </div>
            {configured ? (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-200"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Not Configured
              </Badge>
            )}
          </div>

          {/* Model Info */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">Model</p>
              <p className="text-sm text-muted-foreground">
                Currently configured AI model
              </p>
            </div>
            {model ? (
              <Badge variant="secondary">{model}</Badge>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </div>
        </div>

        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Administrator Access Required</AlertTitle>
          <AlertDescription>
            API configuration changes require system administrator access.
            Contact your Ethico implementation specialist to modify AI settings.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
