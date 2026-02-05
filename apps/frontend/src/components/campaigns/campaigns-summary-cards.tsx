'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Megaphone, Clock, CheckCircle, Users } from 'lucide-react';
import type { CampaignDashboardStats } from '@/types/campaign';

interface CampaignsSummaryCardsProps {
  stats: CampaignDashboardStats | undefined;
  isLoading: boolean;
}

/**
 * Summary cards showing campaign statistics.
 * Displays Active Campaigns, Pending Review, Completed, and Total Reach.
 */
export function CampaignsSummaryCards({ stats, isLoading }: CampaignsSummaryCardsProps) {
  const cards = [
    {
      title: 'Active Campaigns',
      value: stats?.activeCampaigns ?? 0,
      icon: Megaphone,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Pending Review',
      value: stats?.draftCampaigns ?? 0,
      icon: Clock,
      iconColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      subtitle: 'drafts',
    },
    {
      title: 'Completed',
      value: stats?.completedCampaigns ?? 0,
      icon: CheckCircle,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Total Reach',
      value: stats?.totalAssignments ?? 0,
      icon: Users,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      subtitle: 'assignments',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-md ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {card.value.toLocaleString()}
                </span>
                {card.subtitle && (
                  <span className="text-sm text-muted-foreground">{card.subtitle}</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
