'use client';

import { Check, Minus, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/types/user';
import type { UserRole } from '@/types/auth';

/**
 * Permission level for a resource-role combination
 * - 'full': Full CRUD access
 * - 'read': Read-only access
 * - 'limited': Partial access (varies by context)
 * - 'none': No access
 */
type PermissionLevel = 'full' | 'read' | 'limited' | 'none';

/**
 * Resources in the platform
 */
const RESOURCES = [
  { key: 'cases', label: 'Cases', description: 'Case management and investigation' },
  { key: 'investigations', label: 'Investigations', description: 'Investigation workflows and findings' },
  { key: 'policies', label: 'Policies', description: 'Policy creation, approval, and publishing' },
  { key: 'campaigns', label: 'Campaigns', description: 'Disclosure and attestation campaigns' },
  { key: 'reports', label: 'Reports', description: 'Analytics and reporting dashboards' },
  { key: 'users', label: 'Users', description: 'User management and access control' },
  { key: 'settings', label: 'Settings', description: 'Organization configuration' },
] as const;

type ResourceKey = typeof RESOURCES[number]['key'];

/**
 * Roles to display in the table (excluding system-only roles)
 */
const DISPLAY_ROLES: UserRole[] = [
  'SYSTEM_ADMIN',
  'CCO',
  'COMPLIANCE_OFFICER',
  'TRIAGE_LEAD',
  'INVESTIGATOR',
  'DEPARTMENT_ADMIN',
  'READ_ONLY',
  'EMPLOYEE',
];

/**
 * Permission matrix defining access levels for each role-resource combination
 */
const PERMISSION_MATRIX: Record<UserRole, Record<ResourceKey, PermissionLevel>> = {
  SYSTEM_ADMIN: {
    cases: 'full',
    investigations: 'full',
    policies: 'full',
    campaigns: 'full',
    reports: 'full',
    users: 'full',
    settings: 'full',
  },
  CCO: {
    cases: 'full',
    investigations: 'full',
    policies: 'full',
    campaigns: 'full',
    reports: 'full',
    users: 'read',
    settings: 'read',
  },
  COMPLIANCE_OFFICER: {
    cases: 'full',
    investigations: 'full',
    policies: 'full',
    campaigns: 'full',
    reports: 'full',
    users: 'none',
    settings: 'limited',
  },
  TRIAGE_LEAD: {
    cases: 'full',
    investigations: 'limited',
    policies: 'read',
    campaigns: 'limited',
    reports: 'limited',
    users: 'none',
    settings: 'none',
  },
  INVESTIGATOR: {
    cases: 'limited',
    investigations: 'full',
    policies: 'read',
    campaigns: 'read',
    reports: 'limited',
    users: 'none',
    settings: 'none',
  },
  HR_PARTNER: {
    cases: 'limited',
    investigations: 'limited',
    policies: 'read',
    campaigns: 'read',
    reports: 'limited',
    users: 'none',
    settings: 'none',
  },
  LEGAL_COUNSEL: {
    cases: 'limited',
    investigations: 'limited',
    policies: 'read',
    campaigns: 'read',
    reports: 'read',
    users: 'none',
    settings: 'none',
  },
  DEPARTMENT_ADMIN: {
    cases: 'limited',
    investigations: 'limited',
    policies: 'read',
    campaigns: 'limited',
    reports: 'limited',
    users: 'none',
    settings: 'limited',
  },
  MANAGER: {
    cases: 'limited',
    investigations: 'none',
    policies: 'read',
    campaigns: 'read',
    reports: 'limited',
    users: 'none',
    settings: 'none',
  },
  READ_ONLY: {
    cases: 'read',
    investigations: 'read',
    policies: 'read',
    campaigns: 'read',
    reports: 'read',
    users: 'none',
    settings: 'none',
  },
  EMPLOYEE: {
    cases: 'limited',
    investigations: 'none',
    policies: 'read',
    campaigns: 'limited',
    reports: 'none',
    users: 'none',
    settings: 'none',
  },
  OPERATOR: {
    cases: 'limited',
    investigations: 'none',
    policies: 'none',
    campaigns: 'none',
    reports: 'none',
    users: 'none',
    settings: 'none',
  },
};

/**
 * Get icon and styling for a permission level
 */
function getPermissionIcon(level: PermissionLevel) {
  switch (level) {
    case 'full':
      return {
        icon: <Check className="h-4 w-4 text-green-600" />,
        label: 'Full access',
        className: 'bg-green-50',
      };
    case 'read':
      return {
        icon: <Check className="h-4 w-4 text-blue-600" />,
        label: 'Read only',
        className: 'bg-blue-50',
      };
    case 'limited':
      return {
        icon: <Minus className="h-4 w-4 text-amber-600" />,
        label: 'Limited access',
        className: 'bg-amber-50',
      };
    case 'none':
      return {
        icon: <X className="h-4 w-4 text-gray-400" />,
        label: 'No access',
        className: '',
      };
  }
}

/**
 * Role permissions matrix table.
 *
 * Displays a matrix showing permission levels for each role-resource combination.
 * Provides visual icons and tooltips to explain access levels.
 */
export function RolePermissionsTable() {
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-green-50">
              <Check className="h-3.5 w-3.5 text-green-600" />
            </div>
            <span className="text-muted-foreground">Full access</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-50">
              <Check className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <span className="text-muted-foreground">Read only</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-amber-50">
              <Minus className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <span className="text-muted-foreground">Limited</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded">
              <X className="h-3.5 w-3.5 text-gray-400" />
            </div>
            <span className="text-muted-foreground">No access</span>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px] sticky left-0 bg-background">
                  Permission
                </TableHead>
                {DISPLAY_ROLES.map((role) => (
                  <TableHead key={role} className="text-center min-w-[100px]">
                    <Tooltip>
                      <TooltipTrigger className="cursor-help">
                        {ROLE_LABELS[role].split(' ')[0]}
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{ROLE_LABELS[role]}</p>
                        <p className="text-xs text-muted-foreground max-w-[200px]">
                          {ROLE_DESCRIPTIONS[role]}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {RESOURCES.map((resource) => (
                <TableRow key={resource.key}>
                  <TableCell className="font-medium sticky left-0 bg-background">
                    <Tooltip>
                      <TooltipTrigger className="cursor-help">
                        {resource.label}
                      </TooltipTrigger>
                      <TooltipContent>
                        {resource.description}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  {DISPLAY_ROLES.map((role) => {
                    const level = PERMISSION_MATRIX[role][resource.key];
                    const { icon, label, className } = getPermissionIcon(level);

                    return (
                      <TableCell key={role} className="text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`inline-flex h-8 w-8 items-center justify-center rounded ${className}`}
                            >
                              {icon}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {label} for {resource.label.toLowerCase()}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
