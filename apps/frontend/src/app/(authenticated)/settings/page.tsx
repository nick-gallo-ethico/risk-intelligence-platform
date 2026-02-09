'use client';

import Link from 'next/link';
import {
  Building2,
  Users,
  Shield,
  Bell,
  Palette,
  Key,
  ScrollText,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Settings Index Page
 *
 * Hub for all settings sections with clear navigation.
 * Organized by category: Organization, Access, System.
 */
export default function SettingsPage() {
  const settingsSections = [
    {
      title: 'Organization',
      items: [
        {
          icon: Building2,
          title: 'Organization Settings',
          description: 'General settings, branding, and timezone',
          href: '/settings/organization',
        },
        {
          icon: Users,
          title: 'Users & Permissions',
          description: 'Manage users, roles, and access permissions',
          href: '/settings/users',
        },
        {
          icon: Bell,
          title: 'Notification Preferences',
          description: 'Configure email digests and notification channels',
          href: '/settings/organization?tab=notifications',
        },
      ],
    },
    {
      title: 'Security & Access',
      items: [
        {
          icon: Shield,
          title: 'Security Settings',
          description: 'MFA, password policies, and session management',
          href: '/settings/organization?tab=security',
        },
        {
          icon: Key,
          title: 'SSO Configuration',
          description: 'Configure single sign-on with your identity provider',
          href: '/settings/sso',
        },
      ],
    },
    {
      title: 'System',
      items: [
        {
          icon: ScrollText,
          title: 'Audit Log',
          description: 'View all system activity and changes',
          href: '/settings/audit',
        },
        {
          icon: Palette,
          title: 'Branding',
          description: 'Customize colors, logos, and appearance',
          href: '/settings/organization?tab=branding',
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
          Manage your organization settings, users, and system configuration
        </p>
      </div>

      <div className="space-y-8">
        {settingsSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
              {section.title}
            </h2>
            <div className="grid gap-4">
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
                            <CardTitle className="text-base">{item.title}</CardTitle>
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
