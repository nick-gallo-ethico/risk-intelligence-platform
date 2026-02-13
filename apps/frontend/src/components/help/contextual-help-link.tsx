"use client";

/**
 * ContextualHelpLink Component
 *
 * Displays a contextual "Need help?" link that shows relevant knowledge base
 * articles based on the current page path. Maps routes to article slugs
 * for in-context assistance.
 *
 * Usage:
 *   <ContextualHelpLink className="absolute top-4 right-4" />
 *
 * The component renders nothing if there are no relevant articles for the
 * current page.
 */

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { HelpCircle, ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Static mapping of page routes to relevant KB article slugs.
 * Routes can be exact matches or patterns with [param] placeholders.
 */
const CONTEXTUAL_HELP_MAP: Record<string, { slug: string; label: string }[]> = {
  // Cases module
  "/cases": [
    { slug: "working-with-cases", label: "Working with Cases" },
    { slug: "case-investigations", label: "Managing Investigations" },
  ],
  "/cases/[id]": [
    { slug: "working-with-cases", label: "Case Management" },
    { slug: "case-investigations", label: "Investigations" },
    { slug: "anonymous-communication", label: "Anonymous Communication" },
  ],

  // Campaigns module
  "/campaigns": [
    { slug: "campaign-overview", label: "Campaign Overview" },
    { slug: "creating-campaigns", label: "Creating Campaigns" },
  ],
  "/campaigns/[id]": [
    { slug: "campaign-overview", label: "Campaign Overview" },
    { slug: "creating-campaigns", label: "Managing Campaigns" },
  ],
  "/campaigns/new": [
    { slug: "creating-campaigns", label: "Creating Campaigns" },
  ],

  // Policies module
  "/policies": [
    { slug: "policy-management", label: "Managing Policies" },
    { slug: "policy-attestations", label: "Policy Attestations" },
  ],
  "/policies/[id]": [
    { slug: "policy-management", label: "Policy Lifecycle" },
    { slug: "policy-attestations", label: "Attestations" },
  ],

  // Analytics / Reports
  "/analytics": [
    { slug: "understanding-analytics", label: "Understanding Analytics" },
    { slug: "creating-reports", label: "Creating Reports" },
  ],
  "/reports": [
    { slug: "creating-reports", label: "Custom Reports" },
    { slug: "understanding-analytics", label: "Analytics Overview" },
  ],

  // Settings
  "/settings": [
    { slug: "organization-settings", label: "Organization Settings" },
    { slug: "user-management", label: "User Management" },
  ],
  "/settings/users": [{ slug: "user-management", label: "User Management" }],
  "/settings/organization": [
    { slug: "organization-settings", label: "Organization Settings" },
  ],

  // Dashboard
  "/dashboard": [
    { slug: "navigating-the-dashboard", label: "Dashboard Guide" },
    { slug: "getting-started-overview", label: "Getting Started" },
  ],
  "/": [
    { slug: "getting-started-overview", label: "Getting Started" },
    { slug: "navigating-the-dashboard", label: "Dashboard Guide" },
  ],
};

/**
 * Matches a pathname to a route pattern.
 * Handles dynamic segments like [id] by replacing them with regex.
 */
function matchPath(
  pathname: string,
  pattern: string,
): { slug: string; label: string }[] | null {
  // Exact match first
  if (CONTEXTUAL_HELP_MAP[pathname]) {
    return CONTEXTUAL_HELP_MAP[pathname];
  }

  // Convert pattern to regex (e.g., "/cases/[id]" -> "/cases/[^/]+")
  const regexPattern = pattern.replace(/\[[\w-]+\]/g, "[^/]+");
  const regex = new RegExp(`^${regexPattern}$`);

  if (regex.test(pathname)) {
    return CONTEXTUAL_HELP_MAP[pattern];
  }

  return null;
}

/**
 * Finds the best matching articles for a given pathname.
 * Tries exact match first, then pattern matches.
 */
function getArticlesForPath(
  pathname: string,
): { slug: string; label: string }[] {
  // Try exact match
  if (CONTEXTUAL_HELP_MAP[pathname]) {
    return CONTEXTUAL_HELP_MAP[pathname];
  }

  // Try pattern matches
  for (const pattern of Object.keys(CONTEXTUAL_HELP_MAP)) {
    if (pattern.includes("[")) {
      const match = matchPath(pathname, pattern);
      if (match) {
        return match;
      }
    }
  }

  return [];
}

interface ContextualHelpLinkProps {
  /** Additional CSS classes for positioning */
  className?: string;
}

/**
 * ContextualHelpLink renders a dropdown with relevant help articles
 * for the current page. If no articles are mapped, nothing is rendered.
 */
export function ContextualHelpLink({ className }: ContextualHelpLinkProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const articles = getArticlesForPath(pathname || "/");

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  // Don't render if no articles for this page
  if (articles.length === 0) {
    return null;
  }

  // Single article - render direct link
  if (articles.length === 1) {
    return (
      <Link
        href={`/help/articles/${articles[0].slug}`}
        className={cn(
          "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors",
          className,
        )}
      >
        <HelpCircle className="h-4 w-4" />
        <span>Need help?</span>
      </Link>
    );
  }

  // Multiple articles - render dropdown
  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary h-auto py-1 px-2"
      >
        <HelpCircle className="h-4 w-4" />
        <span>Need help?</span>
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")}
        />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 rounded-md border bg-popover shadow-lg z-50">
          <div className="p-1">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Related articles
            </div>
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/help/articles/${article.slug}`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                <span>{article.label}</span>
              </Link>
            ))}
          </div>
          <div className="border-t p-1">
            <Link
              href="/help"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground"
            >
              <HelpCircle className="h-3 w-3" />
              <span>Browse all articles</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Export the help map for use in other components if needed.
 */
export { CONTEXTUAL_HELP_MAP };
