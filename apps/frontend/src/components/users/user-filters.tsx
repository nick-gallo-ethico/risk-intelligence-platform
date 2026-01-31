'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { USER_ROLES, ROLE_LABELS } from '@/types/user';
import type { UserRole } from '@/types/auth';

interface UserFiltersProps {
  search: string;
  role: UserRole | '';
  isActive: boolean | '';
  onSearchChange: (value: string) => void;
  onRoleChange: (value: UserRole | '') => void;
  onStatusChange: (value: boolean | '') => void;
}

export function UserFilters({
  search,
  role,
  isActive,
  onSearchChange,
  onRoleChange,
  onStatusChange,
}: UserFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Role filter */}
      <Select
        value={role}
        onValueChange={(value) => onRoleChange(value === 'ALL' ? '' : (value as UserRole))}
      >
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="All Roles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Roles</SelectItem>
          {USER_ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {ROLE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select
        value={isActive === '' ? 'ALL' : isActive ? 'active' : 'inactive'}
        onValueChange={(value) => {
          if (value === 'ALL') {
            onStatusChange('');
          } else {
            onStatusChange(value === 'active');
          }
        }}
      >
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
