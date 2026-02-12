"use client";

/**
 * Settings Layout
 *
 * Provides a sidebar navigation layout for settings pages (HubSpot pattern).
 * Left sidebar (~240px) with grouped navigation links.
 *
 * IMPORTANT: Workflow builder pages (/new, /[id]) are excluded from sidebar
 * since they have their own full-height layouts.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Bell,
  Building2,
  Settings2,
  Users,
  Shield,
  ClipboardList,
  Plug,
  CheckSquare,
  Sparkles,
  Database,
  Boxes,
  Workflow,
  ChevronLeft,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ============================================================================
// Navigation Configuration
// ============================================================================

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const settingsNavigation: NavSection[] = [
  {
    title: "Your Preferences",
    items: [
      { title: "Profile", href: "/settings/profile", icon: User },
      { title: "Notifications", href: "/settings/notifications", icon: Bell },
    ],
  },
  {
    title: "Account Management",
    items: [
      {
        title: "Organization",
        href: "/settings/organization",
        icon: Building2,
      },
      {
        title: "Account Defaults",
        href: "/settings/defaults",
        icon: Settings2,
      },
      { title: "Users & Teams", href: "/settings/users", icon: Users },
      { title: "Roles & Permissions", href: "/settings/roles", icon: Shield },
      { title: "Audit Log", href: "/settings/audit", icon: ClipboardList },
      { title: "Integrations", href: "/settings/integrations", icon: Plug },
      { title: "Approvals", href: "/settings/approvals", icon: CheckSquare },
      { title: "AI Settings", href: "/settings/ai", icon: Sparkles },
    ],
  },
  {
    title: "Data Management",
    items: [
      { title: "Properties", href: "/settings/properties", icon: Database },
      { title: "Objects", href: "/settings/objects", icon: Boxes },
    ],
  },
  {
    title: "Tools",
    items: [
      { title: "Workflows", href: "/settings/workflows", icon: Workflow },
    ],
  },
];

// ============================================================================
// Sidebar Navigation Component
// ============================================================================

interface SidebarNavProps {
  pathname: string;
  onItemClick?: () => void;
}

function SidebarNav({ pathname, onItemClick }: SidebarNavProps) {
  return (
    <nav className="space-y-6 py-4">
      {settingsNavigation.map((section) => (
        <div key={section.title}>
          <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {section.title}
          </h3>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              // Check if the current path matches this nav item
              const isActive =
                pathname === item.href ||
                (item.href !== "/settings" &&
                  pathname.startsWith(item.href + "/"));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onItemClick}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                      "hover:bg-accent/50",
                      isActive
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// ============================================================================
// Layout Export
// ============================================================================

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Check if we're on a page that should NOT have the sidebar
  // - Workflow builder pages have their own full-height layouts
  // - /settings/workflows is fine (list page)
  // - /settings/workflows/new and /settings/workflows/[id] should not have sidebar
  const isWorkflowBuilderPage =
    pathname?.startsWith("/settings/workflows/new") ||
    (pathname?.startsWith("/settings/workflows/") &&
      pathname !== "/settings/workflows" &&
      !pathname?.endsWith("/instances"));

  // If we're on a workflow builder page, just render children without sidebar
  if (isWorkflowBuilderPage) {
    return <>{children}</>;
  }

  // Check if we're on the main settings hub - no sidebar needed there either
  const isSettingsHub = pathname === "/settings";
  if (isSettingsHub) {
    return <div className="p-6">{children}</div>;
  }

  return (
    <div className="flex h-full">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r bg-muted/30">
        <div className="flex items-center gap-2 p-4 border-b">
          <Link
            href="/settings"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="font-medium">Settings</span>
          </Link>
        </div>
        <ScrollArea className="flex-1">
          <SidebarNav pathname={pathname || ""} />
        </ScrollArea>
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-background border-b p-2 flex items-center gap-2">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open settings menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex items-center justify-between p-4 border-b">
              <Link
                href="/settings"
                className="text-sm font-medium"
                onClick={() => setMobileOpen(false)}
              >
                Settings
              </Link>
            </div>
            <ScrollArea className="h-[calc(100vh-65px)]">
              <SidebarNav
                pathname={pathname || ""}
                onItemClick={() => setMobileOpen(false)}
              />
            </ScrollArea>
          </SheetContent>
        </Sheet>
        <span className="font-medium text-sm">Settings</span>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 md:pt-6 pt-16">{children}</div>
      </main>
    </div>
  );
}
