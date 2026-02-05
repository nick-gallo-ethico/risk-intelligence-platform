'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, FileWarning, ExternalLink, Trash2, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { policiesApi } from '@/services/policies';
import type { PolicyCaseAssociation, PolicyCaseLinkType } from '@/types/policy';
import { POLICY_LINK_TYPE_LABELS } from '@/types/policy';

interface PolicyCasesPanelProps {
  policyId: string;
}

// Link type badge colors
const LINK_TYPE_COLORS: Record<PolicyCaseLinkType, string> = {
  VIOLATION: 'bg-red-100 text-red-800 border-red-200',
  REFERENCE: 'bg-blue-100 text-blue-800 border-blue-200',
  GOVERNING: 'bg-gray-100 text-gray-800 border-gray-200',
};

/**
 * Policy cases panel component.
 *
 * Displays all cases linked to a policy with:
 * - Case reference and title
 * - Link type badge (VIOLATION red, REFERENCE blue, GOVERNING gray)
 * - Violation date (if applicable)
 * - Linked date
 * - Actions (view case, unlink)
 */
export function PolicyCasesPanel({ policyId }: PolicyCasesPanelProps) {
  const queryClient = useQueryClient();
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

  // Fetch case associations
  const { data: associations, isLoading } = useQuery({
    queryKey: ['policy-case-associations', policyId],
    queryFn: () => policiesApi.getCaseAssociations(policyId),
  });

  // Unlink mutation
  const unlinkMutation = useMutation({
    mutationFn: (associationId: string) => policiesApi.unlinkCase(associationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-case-associations', policyId] });
      setUnlinkingId(null);
    },
  });

  const handleUnlink = (associationId: string) => {
    unlinkMutation.mutate(associationId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Link button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Linked Cases</h3>
        <Button onClick={() => setIsLinkDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Link to Case
        </Button>
      </div>

      {/* Cases Table */}
      {associations && associations.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead>Link Type</TableHead>
                <TableHead>Violation Date</TableHead>
                <TableHead>Linked</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {associations.map((association) => (
                <TableRow key={association.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <Link
                        href={`/cases/${association.caseId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {association.case?.referenceNumber || association.caseId}
                      </Link>
                      {association.case?.title && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {association.case.title}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <LinkTypeBadge type={association.linkType} />
                  </TableCell>
                  <TableCell>
                    {association.violationDate
                      ? format(new Date(association.violationDate), 'MMM d, yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {format(new Date(association.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/cases/${association.caseId}`}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Case
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setUnlinkingId(association.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Unlink
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/30">
          <FileWarning className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Linked Cases</h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            Link cases that reference, violate, or are governed by this policy.
          </p>
        </div>
      )}

      {/* Unlink Confirmation Dialog */}
      <Dialog open={!!unlinkingId} onOpenChange={() => setUnlinkingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlink Case?</DialogTitle>
            <DialogDescription>
              This will remove the link between this policy and the case. The case
              itself will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => unlinkingId && handleUnlink(unlinkingId)}
              disabled={unlinkMutation.isPending}
            >
              {unlinkMutation.isPending ? 'Unlinking...' : 'Unlink'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Case Dialog (placeholder - would need case search) */}
      <LinkCaseDialog
        open={isLinkDialogOpen}
        onOpenChange={setIsLinkDialogOpen}
        policyId={policyId}
      />
    </div>
  );
}

interface LinkTypeBadgeProps {
  type: PolicyCaseLinkType;
}

function LinkTypeBadge({ type }: LinkTypeBadgeProps) {
  return (
    <Badge className={cn('border', LINK_TYPE_COLORS[type])}>
      {POLICY_LINK_TYPE_LABELS[type]}
    </Badge>
  );
}

interface LinkCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string;
}

function LinkCaseDialog({ open, onOpenChange, policyId }: LinkCaseDialogProps) {
  // This would typically include a case search component
  // For now, showing a placeholder

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link to Case</DialogTitle>
          <DialogDescription>
            Search for a case to link to this policy.
          </DialogDescription>
        </DialogHeader>
        <div className="py-8 text-center text-muted-foreground">
          <p>Case search component would go here.</p>
          <p className="text-sm mt-2">
            Search for cases by reference number, title, or details.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
