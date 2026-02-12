"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckSquare,
  FileCheck,
  FileText,
  AlertTriangle,
  ClipboardCheck,
  ExternalLink,
  Settings,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

/**
 * Approval type configuration for the platform
 */
interface ApprovalType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  workflowId?: string;
  workflowName?: string;
  enabled: boolean;
  category: "policy" | "disclosure" | "case" | "remediation";
}

/**
 * Approvals Configuration Page
 *
 * Configure approval workflows for different platform activities:
 * - Policy Approval: Review and approval of policy changes
 * - Disclosure Approval: Review flagged disclosures
 * - Case Closure: Sign-off on case closures
 * - Remediation Sign-off: Approval of remediation plans
 */
export default function ApprovalsPage() {
  // Static approval types - would come from API in production
  const approvalTypes: ApprovalType[] = [
    {
      id: "policy_approval",
      name: "Policy Approval",
      description:
        "Requires approval before a policy can be published or major changes can be made. Routes to policy owners and designated reviewers.",
      icon: FileText,
      workflowId: "wf-policy-001",
      workflowName: "Policy Review Workflow",
      enabled: true,
      category: "policy",
    },
    {
      id: "disclosure_approval",
      name: "Disclosure Approval",
      description:
        "Flagged disclosures (conflicts of interest, gifts above threshold) require manager or compliance review before acceptance.",
      icon: FileCheck,
      workflowId: "wf-disclosure-001",
      workflowName: "Disclosure Review Workflow",
      enabled: true,
      category: "disclosure",
    },
    {
      id: "case_closure",
      name: "Case Closure Approval",
      description:
        "High-severity or high-risk cases require supervisor or CCO sign-off before closure to ensure proper documentation.",
      icon: AlertTriangle,
      workflowId: "wf-case-001",
      workflowName: "Case Closure Workflow",
      enabled: false,
      category: "case",
    },
    {
      id: "remediation_signoff",
      name: "Remediation Sign-off",
      description:
        "Remediation plans and corrective actions require stakeholder approval before implementation and completion sign-off.",
      icon: ClipboardCheck,
      workflowId: "wf-remediation-001",
      workflowName: "Remediation Approval Workflow",
      enabled: false,
      category: "remediation",
    },
  ];

  const getCategoryBadge = (category: ApprovalType["category"]) => {
    const styles: Record<
      ApprovalType["category"],
      { label: string; className: string }
    > = {
      policy: {
        label: "Policy",
        className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      },
      disclosure: {
        label: "Disclosure",
        className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
      },
      case: {
        label: "Case",
        className: "bg-orange-100 text-orange-800 hover:bg-orange-100",
      },
      remediation: {
        label: "Remediation",
        className: "bg-green-100 text-green-800 hover:bg-green-100",
      },
    };
    return styles[category];
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
        <span className="text-foreground">Approvals</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Approval Configuration</h1>
          <p className="text-muted-foreground">
            Configure approval workflows for policies, disclosures, cases, and
            remediation plans
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/settings/workflows">
            <Settings className="mr-2 h-4 w-4" />
            Manage Workflows
          </Link>
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <CheckSquare className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-blue-800 font-medium">
            About Approval Workflows
          </p>
          <p className="text-sm text-blue-700 mt-1">
            Approval workflows ensure proper review and authorization before
            critical actions are completed. Each approval type can be customized
            in the Workflow Builder to match your organization&apos;s policies.
          </p>
        </div>
      </div>

      {/* Approval Types Grid */}
      <div className="grid gap-4">
        {approvalTypes.map((approval) => {
          const categoryStyle = getCategoryBadge(approval.category);
          const Icon = approval.icon;

          return (
            <Card key={approval.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${approval.enabled ? "bg-primary/10" : "bg-muted"}`}
                    >
                      <Icon
                        className={`h-5 w-5 ${approval.enabled ? "text-primary" : "text-muted-foreground"}`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">
                          {approval.name}
                        </CardTitle>
                        <Badge
                          variant="secondary"
                          className={categoryStyle.className}
                        >
                          {categoryStyle.label}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1">
                        {approval.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs ${approval.enabled ? "text-green-600" : "text-muted-foreground"}`}
                    >
                      {approval.enabled ? "Enabled" : "Disabled"}
                    </span>
                    <Switch checked={approval.enabled} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      Current workflow:{" "}
                      <span className="font-medium text-foreground">
                        {approval.workflowName}
                      </span>
                    </span>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/settings/workflows/${approval.workflowId}`}>
                      Configure Workflow
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Global Approval Settings</CardTitle>
          <CardDescription>
            Settings that apply to all approval workflows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Email notifications for approvers</p>
              <p className="text-sm text-muted-foreground">
                Send email when an item requires approval
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Reminder notifications</p>
              <p className="text-sm text-muted-foreground">
                Send daily reminders for pending approvals
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Escalation on timeout</p>
              <p className="text-sm text-muted-foreground">
                Automatically escalate approvals not actioned within SLA
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
