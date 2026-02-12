"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  Users,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RolePermissionsTable } from "@/components/settings/role-permissions-table";
import {
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_COLORS,
  USER_ROLES,
} from "@/types/user";
import type { UserRole } from "@/types/auth";

/**
 * Role info with user count (would come from API in production)
 */
interface RoleInfo {
  role: UserRole;
  userCount: number;
}

/**
 * Permission Sets (Roles) Page
 *
 * Displays all platform roles with their descriptions and permission matrices.
 * Each role can be expanded to show detailed permissions.
 *
 * Note: Custom permission sets are planned for a future release.
 */
export default function RolesPage() {
  const [expandedRole, setExpandedRole] = useState<UserRole | null>(null);

  // Role info with static user counts - would come from API
  const roleInfos: RoleInfo[] = USER_ROLES.map((role, index) => ({
    role,
    // Static demo user counts
    userCount:
      role === "SYSTEM_ADMIN"
        ? 3
        : role === "COMPLIANCE_OFFICER"
          ? 8
          : role === "INVESTIGATOR"
            ? 12
            : role === "CCO"
              ? 2
              : role === "EMPLOYEE"
                ? 245
                : role === "READ_ONLY"
                  ? 15
                  : Math.floor(Math.random() * 10) + 1,
  }));

  const toggleRole = (role: UserRole) => {
    setExpandedRole(expandedRole === role ? null : role);
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
        <span className="text-foreground">Roles & Permissions</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">Roles & Permissions</h1>
        <p className="text-muted-foreground">
          View platform roles and their associated permissions. Each role
          defines what users can access and modify.
        </p>
      </div>

      {/* Info Banner - Custom Roles Coming Soon */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-blue-800 font-medium">
            Custom Permission Sets Coming Soon
          </p>
          <p className="text-sm text-blue-700 mt-1">
            In a future release, you&apos;ll be able to create custom permission
            sets tailored to your organization&apos;s unique needs. For now,
            users are assigned to predefined roles with standard permissions.
          </p>
        </div>
      </div>

      {/* Full Permission Matrix (Collapsed by default) */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <CardTitle className="text-base">
                      Full Permission Matrix
                    </CardTitle>
                    <CardDescription>
                      Compare permissions across all roles
                    </CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  View Matrix
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <RolePermissionsTable />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Individual Role Cards */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          All Roles ({roleInfos.length})
        </h2>

        <div className="grid gap-3">
          {roleInfos.map(({ role, userCount }) => (
            <Collapsible
              key={role}
              open={expandedRole === role}
              onOpenChange={() => toggleRole(role)}
            >
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge className={ROLE_COLORS[role]}>
                          {ROLE_LABELS[role]}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {ROLE_DESCRIPTIONS[role]}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {userCount} {userCount === 1 ? "user" : "users"}
                        </span>
                        {expandedRole === role ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 border-t">
                    <div className="pt-4">
                      <RolePermissionsTableSingle role={role} />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Single role permission display - shows permissions for just one role
 */
function RolePermissionsTableSingle({ role }: { role: UserRole }) {
  // Permission matrix for this role (matches the full table)
  const RESOURCES = [
    {
      key: "cases",
      label: "Cases",
      description: "Case management and investigation",
    },
    {
      key: "investigations",
      label: "Investigations",
      description: "Investigation workflows and findings",
    },
    {
      key: "policies",
      label: "Policies",
      description: "Policy creation, approval, and publishing",
    },
    {
      key: "campaigns",
      label: "Campaigns",
      description: "Disclosure and attestation campaigns",
    },
    {
      key: "reports",
      label: "Reports",
      description: "Analytics and reporting dashboards",
    },
    {
      key: "users",
      label: "Users",
      description: "User management and access control",
    },
    {
      key: "settings",
      label: "Settings",
      description: "Organization configuration",
    },
  ] as const;

  type PermissionLevel = "full" | "read" | "limited" | "none";
  type ResourceKey = (typeof RESOURCES)[number]["key"];

  const PERMISSION_MATRIX: Record<
    UserRole,
    Record<ResourceKey, PermissionLevel>
  > = {
    SYSTEM_ADMIN: {
      cases: "full",
      investigations: "full",
      policies: "full",
      campaigns: "full",
      reports: "full",
      users: "full",
      settings: "full",
    },
    CCO: {
      cases: "full",
      investigations: "full",
      policies: "full",
      campaigns: "full",
      reports: "full",
      users: "read",
      settings: "read",
    },
    COMPLIANCE_OFFICER: {
      cases: "full",
      investigations: "full",
      policies: "full",
      campaigns: "full",
      reports: "full",
      users: "none",
      settings: "limited",
    },
    TRIAGE_LEAD: {
      cases: "full",
      investigations: "limited",
      policies: "read",
      campaigns: "limited",
      reports: "limited",
      users: "none",
      settings: "none",
    },
    INVESTIGATOR: {
      cases: "limited",
      investigations: "full",
      policies: "read",
      campaigns: "read",
      reports: "limited",
      users: "none",
      settings: "none",
    },
    HR_PARTNER: {
      cases: "limited",
      investigations: "limited",
      policies: "read",
      campaigns: "read",
      reports: "limited",
      users: "none",
      settings: "none",
    },
    LEGAL_COUNSEL: {
      cases: "limited",
      investigations: "limited",
      policies: "read",
      campaigns: "read",
      reports: "read",
      users: "none",
      settings: "none",
    },
    DEPARTMENT_ADMIN: {
      cases: "limited",
      investigations: "limited",
      policies: "read",
      campaigns: "limited",
      reports: "limited",
      users: "none",
      settings: "limited",
    },
    MANAGER: {
      cases: "limited",
      investigations: "none",
      policies: "read",
      campaigns: "read",
      reports: "limited",
      users: "none",
      settings: "none",
    },
    READ_ONLY: {
      cases: "read",
      investigations: "read",
      policies: "read",
      campaigns: "read",
      reports: "read",
      users: "none",
      settings: "none",
    },
    EMPLOYEE: {
      cases: "limited",
      investigations: "none",
      policies: "read",
      campaigns: "limited",
      reports: "none",
      users: "none",
      settings: "none",
    },
    OPERATOR: {
      cases: "limited",
      investigations: "none",
      policies: "none",
      campaigns: "none",
      reports: "none",
      users: "none",
      settings: "none",
    },
  };

  const getPermissionBadge = (level: PermissionLevel) => {
    switch (level) {
      case "full":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Full Access
          </Badge>
        );
      case "read":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            Read Only
          </Badge>
        );
      case "limited":
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            Limited
          </Badge>
        );
      case "none":
        return (
          <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100">
            No Access
          </Badge>
        );
    }
  };

  const permissions = PERMISSION_MATRIX[role];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {RESOURCES.map((resource) => (
        <div
          key={resource.key}
          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
        >
          <span className="text-sm font-medium">{resource.label}</span>
          {getPermissionBadge(permissions[resource.key])}
        </div>
      ))}
    </div>
  );
}
