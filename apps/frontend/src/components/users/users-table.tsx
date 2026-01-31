'use client';

import { MoreHorizontal, Pencil, UserX, UserCheck } from 'lucide-react';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ROLE_LABELS } from '@/types/user';
import type { User } from '@/types/user';

interface UsersTableProps {
  users: User[];
  currentUserId: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  onEdit: (user: User) => void;
  onDeactivate: (user: User) => void;
  onReactivate: (user: User) => void;
}

const ROLE_COLORS: Record<string, string> = {
  SYSTEM_ADMIN: 'bg-purple-100 text-purple-800',
  CCO: 'bg-blue-100 text-blue-800',
  COMPLIANCE_OFFICER: 'bg-blue-100 text-blue-800',
  TRIAGE_LEAD: 'bg-indigo-100 text-indigo-800',
  INVESTIGATOR: 'bg-teal-100 text-teal-800',
  HR_PARTNER: 'bg-pink-100 text-pink-800',
  LEGAL_COUNSEL: 'bg-amber-100 text-amber-800',
  DEPARTMENT_ADMIN: 'bg-cyan-100 text-cyan-800',
  READ_ONLY: 'bg-gray-100 text-gray-800',
  EMPLOYEE: 'bg-slate-100 text-slate-800',
};

export function UsersTable({
  users,
  currentUserId,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDeactivate,
  onReactivate,
}: UsersTableProps) {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSortIndicator = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  const handleSort = (field: string) => {
    onSort(field);
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No users found matching your criteria.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => handleSort('firstName')}
          >
            Name{getSortIndicator('firstName')}
          </TableHead>
          <TableHead
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => handleSort('email')}
          >
            Email{getSortIndicator('email')}
          </TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => handleSort('lastLoginAt')}
          >
            Last Login{getSortIndicator('lastLoginAt')}
          </TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const isCurrentUser = user.id === currentUserId;

          return (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {user.firstName} {user.lastName}
                  {isCurrentUser && (
                    <Badge variant="outline" className="text-xs">
                      You
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-gray-600">{user.email}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-800'}
                >
                  {ROLE_LABELS[user.role] || user.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    user.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }
                >
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {formatDate(user.lastLoginAt)}
              </TableCell>
              <TableCell className="text-right">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-48 p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2"
                      onClick={() => onEdit(user)}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    {user.isActive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => onDeactivate(user)}
                        disabled={isCurrentUser}
                      >
                        <UserX className="h-4 w-4" />
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => onReactivate(user)}
                      >
                        <UserCheck className="h-4 w-4" />
                        Reactivate
                      </Button>
                    )}
                  </PopoverContent>
                </Popover>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
