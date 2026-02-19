"use client";

/**
 * Internal Operations Dashboard
 * Home page for internal Ethico operations tools
 */

import Link from "next/link";
import {
  Building2,
  Headphones,
  LayoutDashboard,
  Settings,
  ArrowRight,
} from "lucide-react";

const MODULES = [
  {
    title: "Support Console",
    description: "Impersonation, debugging, error logs, job monitoring",
    href: "/internal/support",
    icon: Headphones,
    color:
      "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  },
  {
    title: "Implementation Portal",
    description: "Project tracking, checklists, migrations, go-live readiness",
    href: "/internal/implementation",
    icon: Building2,
    color:
      "bg-green-50 text-green-600 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800",
  },
  {
    title: "Client Health",
    description: "Health scores, usage metrics, benchmarks",
    href: "/internal/health",
    icon: LayoutDashboard,
    color:
      "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800",
  },
  {
    title: "Admin",
    description: "System configuration and management",
    href: "/internal/admin",
    icon: Settings,
    color: "bg-muted text-muted-foreground border-border",
  },
];

export default function InternalDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Internal Operations
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Ethico internal tools and management console
        </p>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {MODULES.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.href}
              href={module.href}
              className={`p-6 rounded-lg border-2 transition-all hover:shadow-lg ${module.color}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="h-6 w-6" />
                    <h3 className="text-lg font-semibold text-foreground">
                      {module.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {module.description}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground mt-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
