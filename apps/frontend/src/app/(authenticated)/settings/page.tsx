"use client";

import Link from "next/link";
import {
  User,
  Bell,
  ListChecks,
  Settings2,
  Users,
  ClipboardList,
  Plug,
  CheckSquare,
  Sparkles,
  Database,
  Boxes,
  Workflow,
  ArrowUpDown,
  Settings,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Settings Index Page
 *
 * Hub for all settings sections organized into 4 HubSpot-style categories:
 * 1. Your Preferences - Profile, Notifications, Task defaults
 * 2. Account Management - Account Defaults, Users & Teams, Audit Log, Integrations, Approvals, AI Settings
 * 3. Data Management - Properties, Objects
 * 4. Tools - Workflows, Import/Export
 */
export default function SettingsPage() {
  const settingsSections = [
    {
      title: "Your Preferences",
      description: "Customize your personal experience",
      items: [
        {
          icon: User,
          title: "Profile",
          description:
            "Your personal information, security settings, and preferences",
          href: "/settings/profile",
        },
        {
          icon: Bell,
          title: "Notifications",
          description:
            "Email alerts, in-app notifications, and digest settings",
          href: "/settings/profile?tab=notifications",
        },
        {
          icon: ListChecks,
          title: "Task Defaults",
          description:
            "Default reminders, assignment preferences, and work settings",
          href: "/settings/profile?tab=tasks",
        },
      ],
    },
    {
      title: "Account Management",
      description: "Organization settings and team configuration",
      items: [
        {
          icon: Settings2,
          title: "Account Defaults",
          description:
            "Organization settings, timezone, branding, and defaults",
          href: "/settings/organization",
        },
        {
          icon: Users,
          title: "Users & Teams",
          description: "Manage users, roles, permissions, and team assignments",
          href: "/settings/users",
        },
        {
          icon: ClipboardList,
          title: "Audit Log",
          description: "View all system activity, changes, and user actions",
          href: "/settings/audit",
        },
        {
          icon: Plug,
          title: "Integrations",
          description: "Connect HRIS, SSO, and third-party services",
          href: "/settings/integrations",
        },
        {
          icon: CheckSquare,
          title: "Approvals",
          description: "Configure approval workflows and escalation rules",
          href: "/settings/approvals",
        },
        {
          icon: Sparkles,
          title: "AI Settings",
          description: "Configure AI features, prompts, and automation rules",
          href: "/settings/ai",
        },
      ],
    },
    {
      title: "Data Management",
      description: "Customize your data model and object definitions",
      items: [
        {
          icon: Database,
          title: "Properties",
          description:
            "Manage custom fields, dropdowns, and data validation rules",
          href: "/settings/properties",
        },
        {
          icon: Boxes,
          title: "Objects",
          description:
            "Configure entity types, relationships, and custom objects",
          href: "/settings/objects",
        },
      ],
    },
    {
      title: "Tools",
      description: "Automation and data management tools",
      items: [
        {
          icon: Workflow,
          title: "Workflows",
          description:
            "Build automated workflows for cases, tasks, and notifications",
          href: "/settings/workflows",
        },
        {
          icon: ArrowUpDown,
          title: "Import / Export",
          description: "Bulk import data or export reports and records",
          href: "/settings/import-export",
        },
      ],
    },
  ];

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your preferences, organization settings, and system
          configuration
        </p>
      </div>

      <div className="space-y-10">
        {settingsSections.map((section) => (
          <div key={section.title}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="text-sm text-muted-foreground">
                {section.description}
              </p>
            </div>
            <div className="grid gap-3">
              {section.items.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <item.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {item.title}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {item.description}
                            </CardDescription>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
