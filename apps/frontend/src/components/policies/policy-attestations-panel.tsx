'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, ClipboardCheck, ExternalLink } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { policiesApi } from '@/services/policies';
import type { AttestationCampaign, AttestationCampaignStatus } from '@/types/policy';

interface PolicyAttestationsPanelProps {
  policyId: string;
}

// Campaign status colors
const STATUS_COLORS: Record<AttestationCampaignStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 border-gray-200',
  SCHEDULED: 'bg-purple-100 text-purple-800 border-purple-200',
  ACTIVE: 'bg-blue-100 text-blue-800 border-blue-200',
  PAUSED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_LABELS: Record<AttestationCampaignStatus, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

/**
 * Policy attestations panel component.
 *
 * Displays all attestation campaigns for a policy with:
 * - Campaign name and status
 * - Progress bar (completed/total)
 * - Due date
 * - Link to view campaign details
 */
export function PolicyAttestationsPanel({ policyId }: PolicyAttestationsPanelProps) {
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['policy-attestation-campaigns', policyId],
    queryFn: () => policiesApi.getAttestationCampaigns(policyId),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Create button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Attestation Campaigns</h3>
        <Button asChild>
          <Link href={`/campaigns/new?type=attestation&policyId=${policyId}`}>
            <Plus className="h-4 w-4 mr-2" />
            Create Attestation Campaign
          </Link>
        </Button>
      </div>

      {/* Campaigns Grid */}
      {campaigns && campaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/30">
          <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Attestation Campaigns</h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            Create an attestation campaign to track employee acknowledgment of this policy.
          </p>
        </div>
      )}
    </div>
  );
}

interface CampaignCardProps {
  campaign: AttestationCampaign;
}

function CampaignCard({ campaign }: CampaignCardProps) {
  const total = campaign.totalAssignments;
  const completed = campaign.completedAssignments;
  const overdue = campaign.overdueAssignments;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-medium">{campaign.name}</CardTitle>
          <Badge className={cn('border', STATUS_COLORS[campaign.status])}>
            {STATUS_LABELS[campaign.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        {campaign.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {campaign.description}
          </p>
        )}

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {completed} / {total} ({progressPercent}%)
            </span>
          </div>
          <Progress value={progressPercent} />
          {overdue > 0 && (
            <p className="text-sm text-destructive">
              {overdue} overdue
            </p>
          )}
        </div>

        {/* Due date */}
        {campaign.dueDate && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Due Date</span>
            <span>{format(new Date(campaign.dueDate), 'MMM d, yyyy')}</span>
          </div>
        )}

        {/* View link */}
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href={`/campaigns/${campaign.id}`}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Campaign
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
