'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  Search,
  MessageSquare,
  BookOpen,
  ArrowRight,
  LucideIcon,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  variant: 'primary' | 'secondary';
  featureKey?: 'chatbot' | 'resources';
}

interface QuickActionsProps {
  /** Tenant slug for link generation */
  tenantSlug: string;
  /** Feature flags from tenant config */
  features?: {
    chatbotEnabled?: boolean;
    resourcesEnabled?: boolean;
  };
  /** Quick links configuration from tenant config */
  quickLinks?: {
    reportIssue?: boolean;
    checkStatus?: boolean;
    askQuestion?: boolean;
    browseResources?: boolean;
  };
  /** Additional CSS classes */
  className?: string;
}

/**
 * Quick action definitions.
 * Primary actions are highlighted more prominently.
 */
const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'report',
    title: 'Report an Issue',
    description:
      'Submit a confidential report about an ethics concern, policy violation, or workplace issue.',
    href: '/report',
    icon: AlertTriangle,
    variant: 'primary',
  },
  {
    id: 'status',
    title: 'Check Status',
    description:
      'View the status of a previous report and communicate with investigators.',
    href: '/status',
    icon: Search,
    variant: 'secondary',
  },
  {
    id: 'chat',
    title: 'Ask a Question',
    description:
      'Get answers to your ethics and compliance questions from our AI assistant.',
    href: '/chat',
    icon: MessageSquare,
    variant: 'secondary',
    featureKey: 'chatbot',
  },
  {
    id: 'resources',
    title: 'Browse Resources',
    description:
      'Access policies, code of conduct, FAQs, and training materials.',
    href: '/resources',
    icon: BookOpen,
    variant: 'secondary',
    featureKey: 'resources',
  },
];

/**
 * QuickActions - Grid of primary action cards for the Ethics Portal home page.
 *
 * Features:
 * - "Report an Issue" is always prominently displayed
 * - Other actions conditionally shown based on feature flags
 * - Responsive grid: vertical stack on mobile, 2x2 on desktop
 * - Each card has icon, title, description, and action button
 *
 * @example
 * ```tsx
 * <QuickActions
 *   tenantSlug="acme"
 *   features={{ chatbotEnabled: true, resourcesEnabled: true }}
 *   quickLinks={{ reportIssue: true, checkStatus: true }}
 * />
 * ```
 */
export function QuickActions({
  tenantSlug,
  features = {},
  quickLinks = {},
  className,
}: QuickActionsProps) {
  const basePath = `/ethics/${tenantSlug}`;

  // Filter actions based on feature flags and quick links config
  const visibleActions = QUICK_ACTIONS.filter((action) => {
    // Check feature flags
    if (action.featureKey === 'chatbot' && !features.chatbotEnabled) {
      return false;
    }
    if (action.featureKey === 'resources' && !features.resourcesEnabled) {
      return false;
    }

    // Check quick links config (if explicitly false, hide)
    if (action.id === 'report' && quickLinks.reportIssue === false) {
      return false;
    }
    if (action.id === 'status' && quickLinks.checkStatus === false) {
      return false;
    }
    if (action.id === 'chat' && quickLinks.askQuestion === false) {
      return false;
    }
    if (action.id === 'resources' && quickLinks.browseResources === false) {
      return false;
    }

    return true;
  });

  return (
    <section className={cn('py-12', className)} aria-labelledby="quick-actions-heading">
      <h2 id="quick-actions-heading" className="sr-only">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visibleActions.map((action) => (
          <QuickActionCard
            key={action.id}
            action={action}
            href={`${basePath}${action.href}`}
          />
        ))}
      </div>
    </section>
  );
}

interface QuickActionCardProps {
  action: QuickAction;
  href: string;
}

/**
 * Individual quick action card component.
 */
function QuickActionCard({ action, href }: QuickActionCardProps) {
  const isPrimary = action.variant === 'primary';

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200 hover:shadow-md',
        isPrimary
          ? 'border-primary/30 bg-primary/5 hover:border-primary/50'
          : 'hover:border-primary/20'
      )}
    >
      <CardHeader>
        <div
          className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center mb-2',
            isPrimary
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
          )}
        >
          <action.icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <CardTitle className="text-lg">{action.title}</CardTitle>
        <CardDescription className="text-sm">
          {action.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          asChild
          variant={isPrimary ? 'default' : 'outline'}
          className="w-full group-hover:gap-3 transition-all"
        >
          <Link href={href}>
            {isPrimary ? 'Start Report' : 'Learn More'}
            <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
