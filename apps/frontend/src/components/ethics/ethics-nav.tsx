'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  AlertTriangle,
  Search,
  BookOpen,
  MessageSquare,
  LucideIcon,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** If true, this item is only shown when the feature is enabled */
  featureKey?: 'resources' | 'chatbot';
}

interface EthicsNavProps {
  /** Current tenant slug for link generation */
  tenantSlug: string;
  /** Current pathname for active link highlighting */
  currentPath?: string;
  /** Feature flags from tenant config */
  features?: {
    resourcesEnabled?: boolean;
    chatbotEnabled?: boolean;
  };
  /** Callback when a nav item is clicked (for mobile menu closing) */
  onNavClick?: () => void;
  /** Whether this is rendered in mobile menu (vertical layout) */
  isMobile?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Navigation items for the Ethics Portal.
 * The base path is /ethics/[tenant], so all hrefs are relative to that.
 */
const NAV_ITEMS: NavItem[] = [
  {
    label: 'Home',
    href: '',
    icon: Home,
  },
  {
    label: 'Report an Issue',
    href: '/report',
    icon: AlertTriangle,
  },
  {
    label: 'Check Status',
    href: '/status',
    icon: Search,
  },
  {
    label: 'Ask a Question',
    href: '/chat',
    icon: MessageSquare,
    featureKey: 'chatbot',
  },
  {
    label: 'Resources',
    href: '/resources',
    icon: BookOpen,
    featureKey: 'resources',
  },
];

/**
 * EthicsNav - Navigation links for the Ethics Portal.
 *
 * Shows navigation links with active state highlighting.
 * Supports both desktop (horizontal) and mobile (vertical) layouts.
 * Optional features (Resources, Chatbot) are conditionally shown.
 *
 * @example
 * ```tsx
 * // Desktop nav in header
 * <EthicsNav tenantSlug="acme" features={{ resourcesEnabled: true }} />
 *
 * // Mobile nav in sheet
 * <EthicsNav tenantSlug="acme" isMobile onNavClick={closeMenu} />
 * ```
 */
export function EthicsNav({
  tenantSlug,
  currentPath,
  features = {},
  onNavClick,
  isMobile = false,
  className,
}: EthicsNavProps) {
  const pathname = usePathname();
  const activePath = currentPath || pathname;
  const basePath = `/ethics/${tenantSlug}`;

  // Filter nav items based on feature flags
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.featureKey) return true;
    if (item.featureKey === 'resources') return features.resourcesEnabled;
    if (item.featureKey === 'chatbot') return features.chatbotEnabled;
    return true;
  });

  return (
    <nav
      className={cn(
        isMobile
          ? 'flex flex-col space-y-1'
          : 'flex items-center space-x-1',
        className
      )}
      aria-label="Main navigation"
    >
      {visibleItems.map((item) => {
        const fullHref = `${basePath}${item.href}`;
        const isActive =
          item.href === ''
            ? activePath === basePath || activePath === `${basePath}/`
            : activePath?.startsWith(fullHref) ?? false;

        return (
          <Link
            key={item.href}
            href={fullHref}
            onClick={onNavClick}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isMobile
                ? 'w-full'
                : '',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-foreground/70 hover:bg-muted hover:text-foreground'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
