'use client';

import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Campaign } from '@/types/campaign';
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_COLORS,
  CAMPAIGN_TYPE_LABELS,
  CAMPAIGN_TYPE_COLORS,
} from '@/types/campaign';

interface CampaignsTableProps {
  campaigns: Campaign[];
  isLoading: boolean;
  onSort: (column: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Data table for displaying campaigns list.
 * Supports sorting, navigation, and shows completion progress.
 */
export function CampaignsTable({
  campaigns,
  isLoading,
  onSort,
  sortBy,
  sortOrder,
}: CampaignsTableProps) {
  const router = useRouter();

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground/50" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4" />
    );
  };

  const handleRowClick = (campaignId: string) => {
    router.push(`/campaigns/${campaignId}`);
  };

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'startDate', label: 'Start Date', sortable: true },
    { key: 'dueDate', label: 'Due Date', sortable: true },
    { key: 'completionPercentage', label: 'Completion', sortable: true },
    { key: 'owner', label: 'Owner', sortable: false },
  ];

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-48" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-28" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No campaigns found.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new campaign to get started.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className={cn(
                col.sortable && 'cursor-pointer hover:bg-muted/50 select-none'
              )}
              onClick={() => col.sortable && onSort(col.key)}
            >
              <div className="flex items-center">
                {col.label}
                {col.sortable && getSortIcon(col.key)}
              </div>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.map((campaign) => (
          <TableRow
            key={campaign.id}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleRowClick(campaign.id)}
          >
            <TableCell className="font-medium">
              <div>
                <p className="font-medium">{campaign.name}</p>
                {campaign.description && (
                  <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                    {campaign.description}
                  </p>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={CAMPAIGN_STATUS_COLORS[campaign.status]}
              >
                {CAMPAIGN_STATUS_LABELS[campaign.status]}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={CAMPAIGN_TYPE_COLORS[campaign.type]}
              >
                {CAMPAIGN_TYPE_LABELS[campaign.type]}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(campaign.startDate)}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(campaign.dueDate)}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2 min-w-[140px]">
                <Progress
                  value={campaign.completionPercentage}
                  className="h-2 w-20"
                />
                <span className="text-sm text-muted-foreground">
                  {campaign.completionPercentage}%
                </span>
              </div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {campaign.ownerName || '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
