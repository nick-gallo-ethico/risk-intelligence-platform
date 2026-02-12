"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Plug,
  Users,
  Mail,
  Shield,
  Webhook,
  Cloud,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Settings,
  RefreshCw,
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
import { Separator } from "@/components/ui/separator";

/**
 * Integrations Settings Page
 *
 * Hub for managing external service integrations:
 * - HRIS Integration (Workday, BambooHR, ADP, etc. via Merge.dev)
 * - Email (SMTP) configuration
 * - SSO / Identity Provider
 * - Webhooks management
 * - Storage (Azure Blob)
 *
 * For MVP: Display status and config info. Full management flows deferred.
 */
export default function IntegrationsPage() {
  // Mock status for demo - in production these would come from API
  const integrations = {
    hris: {
      connected: true,
      provider: "Workday",
      lastSync: "2026-02-11T15:30:00Z",
    },
    email: {
      configured: true,
      sender: "noreply@acme.local",
    },
    sso: {
      enabled: true,
      provider: "Azure AD",
    },
    webhooks: {
      count: 3,
    },
    storage: {
      configured: true,
      provider: "Azure Blob Storage",
    },
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
        <span className="text-foreground">Integrations</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Plug className="h-6 w-6" />
          Integrations
        </h1>
        <p className="text-muted-foreground">
          Connect external services and manage third-party integrations
        </p>
      </div>

      {/* Integration Cards */}
      <div className="grid gap-4">
        {/* HRIS Integration */}
        <IntegrationCard
          icon={Users}
          title="HRIS Integration"
          description="Sync employee data from your HR system. Supports Workday, BambooHR, ADP, UKG, SAP SuccessFactors, and more via Merge.dev."
          status={integrations.hris.connected ? "connected" : "not-connected"}
          statusLabel={
            integrations.hris.connected
              ? `Connected to ${integrations.hris.provider}`
              : "Not Connected"
          }
          details={
            integrations.hris.connected
              ? [
                  {
                    label: "Last Sync",
                    value: formatRelativeTime(integrations.hris.lastSync),
                  },
                  { label: "Provider", value: integrations.hris.provider },
                ]
              : undefined
          }
          actionLabel="Configure"
          actionHref="/settings/integrations/hris"
          supportedProviders={[
            "Workday",
            "BambooHR",
            "ADP",
            "UKG",
            "SAP SuccessFactors",
            "Oracle HCM",
            "Namely",
            "Rippling",
            "Gusto",
          ]}
        />

        {/* Email / SMTP */}
        <IntegrationCard
          icon={Mail}
          title="Email (SMTP)"
          description="Configure outbound email settings for notifications and reports."
          status={integrations.email.configured ? "connected" : "not-connected"}
          statusLabel={
            integrations.email.configured ? "Configured" : "Not Configured"
          }
          details={
            integrations.email.configured
              ? [{ label: "Sender Address", value: integrations.email.sender }]
              : undefined
          }
          actionLabel="Configure"
          actionHref="/settings/organization?tab=notifications"
        />

        {/* SSO / Identity Provider */}
        <IntegrationCard
          icon={Shield}
          title="SSO / Identity Provider"
          description="Single Sign-On configuration for Azure AD, Google Workspace, or SAML 2.0 providers."
          status={integrations.sso.enabled ? "connected" : "not-connected"}
          statusLabel={
            integrations.sso.enabled
              ? `Enabled (${integrations.sso.provider})`
              : "Not Enabled"
          }
          details={
            integrations.sso.enabled
              ? [{ label: "Provider", value: integrations.sso.provider }]
              : undefined
          }
          actionLabel="Configure SSO"
          actionHref="/settings/organization?tab=security"
        />

        {/* Webhooks */}
        <IntegrationCard
          icon={Webhook}
          title="Webhooks"
          description="Configure webhook endpoints for event-driven integrations with external systems."
          status={
            integrations.webhooks.count > 0 ? "connected" : "not-connected"
          }
          statusLabel={
            integrations.webhooks.count > 0
              ? `${integrations.webhooks.count} Active Webhooks`
              : "No Webhooks Configured"
          }
          actionLabel="Manage"
          actionHref="/settings/integrations/webhooks"
          comingSoon
        />

        {/* Storage */}
        <IntegrationCard
          icon={Cloud}
          title="Storage (Azure Blob)"
          description="Cloud storage for documents, attachments, and exports."
          status={
            integrations.storage.configured ? "connected" : "not-connected"
          }
          statusLabel={
            integrations.storage.configured ? "Connected" : "Not Configured"
          }
          details={
            integrations.storage.configured
              ? [{ label: "Provider", value: integrations.storage.provider }]
              : undefined
          }
          actionLabel="View Details"
          actionHref="/settings/integrations/storage"
          comingSoon
        />
      </div>

      {/* Help Section */}
      <Separator className="my-6" />
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-medium mb-2">Need Help?</h3>
        <p className="text-sm text-muted-foreground mb-3">
          For assistance setting up integrations, contact your Ethico
          implementation specialist or visit our knowledge base.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <ExternalLink className="h-4 w-4 mr-2" />
            Integration Docs
          </Button>
          <Button variant="outline" size="sm" disabled>
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Integration Card Component
 *
 * Displays a single integration with status, details, and action button.
 */
interface IntegrationCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  status: "connected" | "not-connected";
  statusLabel: string;
  details?: Array<{ label: string; value: string }>;
  actionLabel: string;
  actionHref: string;
  supportedProviders?: string[];
  comingSoon?: boolean;
}

function IntegrationCard({
  icon: Icon,
  title,
  description,
  status,
  statusLabel,
  details,
  actionLabel,
  actionHref,
  supportedProviders,
  comingSoon,
}: IntegrationCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`p-2.5 rounded-lg ${
                status === "connected" ? "bg-green-100" : "bg-muted"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  status === "connected"
                    ? "text-green-600"
                    : "text-muted-foreground"
                }`}
              />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                {title}
                {comingSoon && (
                  <Badge variant="outline" className="text-xs font-normal">
                    Coming Soon
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm">
                {description}
              </CardDescription>
            </div>
          </div>
          <StatusBadge status={status} label={statusLabel} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Details */}
        {details && details.length > 0 && (
          <div className="bg-muted/50 rounded-md p-3 mb-4">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {details.map((detail) => (
                <div key={detail.label}>
                  <dt className="text-muted-foreground">{detail.label}</dt>
                  <dd className="font-medium">{detail.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Supported Providers */}
        {supportedProviders && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">
              Supported Providers:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {supportedProviders.map((provider) => (
                <Badge
                  key={provider}
                  variant="secondary"
                  className="text-xs font-normal"
                >
                  {provider}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-between">
          {comingSoon ? (
            <Button variant="outline" size="sm" disabled>
              <Settings className="h-4 w-4 mr-2" />
              {actionLabel}
            </Button>
          ) : (
            <Link href={actionHref}>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                {actionLabel}
              </Button>
            </Link>
          )}
          {status === "connected" && !comingSoon && (
            <Button variant="ghost" size="sm" disabled>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Status Badge Component
 */
function StatusBadge({
  status,
  label,
}: {
  status: "connected" | "not-connected";
  label: string;
}) {
  if (status === "connected") {
    return (
      <Badge
        variant="outline"
        className="bg-green-50 text-green-700 border-green-200"
      >
        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
        {label}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="bg-muted text-muted-foreground border-muted-foreground/30"
    >
      <XCircle className="h-3.5 w-3.5 mr-1" />
      {label}
    </Badge>
  );
}

/**
 * Format relative time from ISO string
 */
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString();
}
