'use client';

import { useState } from 'react';
import {
  MoreHorizontal,
  Pencil,
  UserX,
  UserCheck,
  Mail,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ROLE_LABELS,
  ROLE_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  type UserStatus,
} from '@/types/user';
import type { User } from '@/types/user';

/**
 * Get initials from a name for avatar fallback
 */
function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Format a date as relative time or absolute
 */
function formatLastLogin(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
    }
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

/**
 * Derive user status from user properties
 */
function getUserStatus(user: User): UserStatus {
  if (user.status) return user.status;
  // Fallback derivation for backwards compatibility
  if (!user.isActive) return 'INACTIVE';
  if (!user.lastLoginAt) return 'PENDING_INVITE';
  return 'ACTIVE';
}

interface UserListProps {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  currentUserId: string;
  onPageChange: (page: number) => void;
  onEdit: (user: User) => void;
  onDeactivate: (user: User) => void;
  onReactivate: (user: User) => void;
  onResendInvite: (user: User) => void;
  onResetMfa: (user: User) => void;
  isLoading?: boolean;
}

/**
 * UserList component displays users in a table with actions.
 *
 * Features:
 * - Avatar with name and email
 * - Role badge with color coding
 * - Status badge (ACTIVE, PENDING_INVITE, INACTIVE, SUSPENDED)
 * - Last login relative time
 * - Actions dropdown: Edit, Deactivate/Reactivate, Resend Invite, Reset MFA
 */
export function UserList({
  users,
  total,
  page,
  pageSize,
  currentUserId,
  onPageChange,
  onEdit,
  onDeactivate,
  onReactivate,
  onResendInvite,
  onResetMfa,
  isLoading,
}: UserListProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'deactivate' | 'reactivate' | 'resend' | 'mfa';
    user: User | null;
  }>({ open: false, type: 'deactivate', user: null });

  const totalPages = Math.ceil(total / pageSize);

  const handleConfirm = () => {
    if (!confirmDialog.user) return;

    switch (confirmDialog.type) {
      case 'deactivate':
        onDeactivate(confirmDialog.user);
        break;
      case 'reactivate':
        onReactivate(confirmDialog.user);
        break;
      case 'resend':
        onResendInvite(confirmDialog.user);
        break;
      case 'mfa':
        onResetMfa(confirmDialog.user);
        break;
    }

    setConfirmDialog({ open: false, type: 'deactivate', user: null });
  };

  if (users.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No users found</p>
        <p className="text-sm mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const status = getUserStatus(user);
              const isCurrentUser = user.id === currentUserId;

              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback>
                          {getInitials(user.firstName, user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {user.firstName} {user.lastName}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={ROLE_COLORS[user.role] || 'bg-gray-100'}
                    >
                      {ROLE_LABELS[user.role] || user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={STATUS_COLORS[status]}
                    >
                      {STATUS_LABELS[status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatLastLogin(user.lastLoginAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(user)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>

                        {status === 'PENDING_INVITE' && (
                          <DropdownMenuItem
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                type: 'resend',
                                user,
                              })
                            }
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Resend Invite
                          </DropdownMenuItem>
                        )}

                        {user.mfaEnabled && (
                          <DropdownMenuItem
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                type: 'mfa',
                                user,
                              })
                            }
                          >
                            <KeyRound className="h-4 w-4 mr-2" />
                            Reset MFA
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        {status === 'ACTIVE' || status === 'PENDING_INVITE' ? (
                          <DropdownMenuItem
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                type: 'deactivate',
                                user,
                              })
                            }
                            disabled={isCurrentUser}
                            className="text-destructive focus:text-destructive"
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                type: 'reactivate',
                                user,
                              })
                            }
                            className="text-green-600 focus:text-green-600"
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Reactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to{' '}
            {Math.min(page * pageSize, total)} of {total} users
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <div className="text-sm">
              Page {page} of {totalPages}
            </div>
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

      {/* Confirmation Dialogs */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === 'deactivate' && 'Deactivate User'}
              {confirmDialog.type === 'reactivate' && 'Reactivate User'}
              {confirmDialog.type === 'resend' && 'Resend Invitation'}
              {confirmDialog.type === 'mfa' && 'Reset MFA'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === 'deactivate' &&
                `Are you sure you want to deactivate ${confirmDialog.user?.firstName} ${confirmDialog.user?.lastName}? They will no longer be able to access the platform.`}
              {confirmDialog.type === 'reactivate' &&
                `Are you sure you want to reactivate ${confirmDialog.user?.firstName} ${confirmDialog.user?.lastName}? They will be able to access the platform again.`}
              {confirmDialog.type === 'resend' &&
                `A new invitation email will be sent to ${confirmDialog.user?.email}.`}
              {confirmDialog.type === 'mfa' &&
                `This will reset MFA for ${confirmDialog.user?.firstName} ${confirmDialog.user?.lastName}. They will need to set up MFA again on their next login.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                confirmDialog.type === 'deactivate'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {confirmDialog.type === 'deactivate' && 'Deactivate'}
              {confirmDialog.type === 'reactivate' && 'Reactivate'}
              {confirmDialog.type === 'resend' && 'Send Invite'}
              {confirmDialog.type === 'mfa' && 'Reset MFA'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
