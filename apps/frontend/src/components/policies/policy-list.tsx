'use client';

import { useRouter } from 'next/navigation';
import { MoreHorizontal, Edit, Eye, Send, Archive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Policy, PolicyStatus, PolicyType } from '@/types/policy';
import { POLICY_TYPE_LABELS } from '@/types/policy';

interface PolicyListProps {
  policies: Policy[];
  total: number;
  page: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onSubmitForApproval?: (policy: Policy) => void;
  onRetire?: (policy: Policy) => void;
}

/**
 * Status badge colors per context document.
 * DRAFT: gray, PENDING_APPROVAL: yellow, APPROVED: blue, PUBLISHED: green, RETIRED: red
 */
const STATUS_STYLES: Record<PolicyStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  APPROVED: 'bg-blue-100 text-blue-700 border-blue-200',
  PUBLISHED: 'bg-green-100 text-green-700 border-green-200',
  RETIRED: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<PolicyStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  RETIRED: 'Retired',
};

/**
 * Format policy type for display.
 * CODE_OF_CONDUCT -> "Code of Conduct"
 */
function formatPolicyType(type: PolicyType): string {
  return POLICY_TYPE_LABELS[type] || type.replace(/_/g, ' ');
}

/**
 * Format relative time for "Last Updated" column.
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Policy list table component.
 *
 * Displays policies with:
 * - Title (clickable to edit)
 * - Type
 * - Status (color-coded badge)
 * - Version
 * - Owner
 * - Last Updated
 * - Actions dropdown
 */
export function PolicyList({
  policies,
  total,
  page,
  pageSize = 20,
  onPageChange,
  onSubmitForApproval,
  onRetire,
}: PolicyListProps) {
  const router = useRouter();

  const handleRowClick = (policy: Policy) => {
    router.push(`/policies/${policy.id}/edit`);
  };

  const totalPages = Math.ceil(total / pageSize);

  if (policies.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No policies found.</p>
        <p className="text-sm mt-1">
          Create your first policy to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {policies.map((policy) => (
            <TableRow
              key={policy.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleRowClick(policy)}
            >
              <TableCell className="font-medium">
                {policy.title}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatPolicyType(policy.policyType)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(STATUS_STYLES[policy.status])}
                >
                  {STATUS_LABELS[policy.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {policy.currentVersion > 0 ? `v${policy.currentVersion}` : 'Draft'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {policy.owner
                  ? `${policy.owner.firstName} ${policy.owner.lastName}`
                  : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatRelativeTime(policy.updatedAt)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/policies/${policy.id}/edit`);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/policies/${policy.id}`);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>

                    {/* Submit for Approval - only for DRAFT */}
                    {policy.status === 'DRAFT' && onSubmitForApproval && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onSubmitForApproval(policy);
                          }}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Submit for Approval
                        </DropdownMenuItem>
                      </>
                    )}

                    {/* Retire - only for PUBLISHED */}
                    {policy.status === 'PUBLISHED' && onRetire && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onRetire(policy);
                          }}
                          className="text-red-600"
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Retire
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to{' '}
            {Math.min(page * pageSize, total)} of {total} policies
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
