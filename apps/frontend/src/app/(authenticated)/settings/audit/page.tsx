'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  ScrollText,
  Search,
  Filter,
  Download,
  User,
  Settings,
  FileText,
  Shield,
  Calendar,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actionDescription: string;
  actorUserId: string;
  actorUser?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  ipAddress?: string;
  userAgent?: string;
  context?: Record<string, unknown>;
  changes?: {
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
  };
  createdAt: string;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  total: number;
  limit: number;
  page: number;
}

/**
 * Audit Log Page
 *
 * Displays all system activity with filtering capabilities.
 * Shows who did what, when, and with what changes.
 */
export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState<string>('all');
  const [page, setPage] = useState(1);

  const {
    data: auditLog,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['audit-log', entityType, search, page],
    queryFn: async (): Promise<AuditLogResponse> => {
      const params: Record<string, string | number> = {
        page,
        limit: 50,
      };
      if (entityType !== 'all') {
        params.entityType = entityType;
      }
      if (search) {
        params.search = search;
      }
      const response = await api.get('/audit', { params });
      // Handle various response shapes
      if (Array.isArray(response.data)) {
        return { data: response.data, total: response.data.length, limit: 50, page };
      }
      return response.data || { data: [], total: 0, limit: 50, page };
    },
  });

  const getEntityIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'USER':
        return <User className="h-4 w-4" />;
      case 'CASE':
      case 'INVESTIGATION':
        return <FileText className="h-4 w-4" />;
      case 'POLICY':
        return <Shield className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getActionBadgeVariant = (action: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (action.includes('delete') || action.includes('removed')) return 'destructive';
    if (action.includes('create') || action.includes('added')) return 'default';
    return 'secondary';
  };

  const formatActorName = (entry: AuditLogEntry) => {
    if (entry.actorUser) {
      return `${entry.actorUser.firstName} ${entry.actorUser.lastName}`;
    }
    return entry.actorUserId || 'System';
  };

  if (error) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <div className="flex flex-col items-center justify-center py-12">
          <ScrollText className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to Load Audit Log</h2>
          <p className="text-muted-foreground mb-4">
            There was an error loading the audit log. Please try again.
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link
          href="/settings"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </Link>
        <span>/</span>
        <span className="text-foreground">Audit Log</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ScrollText className="h-6 w-6" />
            Audit Log
          </h1>
          <p className="text-muted-foreground mt-1">
            View all system activity and changes
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by description, user, or entity..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="CASE">Cases</SelectItem>
                <SelectItem value="INVESTIGATION">Investigations</SelectItem>
                <SelectItem value="POLICY">Policies</SelectItem>
                <SelectItem value="USER">Users</SelectItem>
                <SelectItem value="CAMPAIGN">Campaigns</SelectItem>
                <SelectItem value="RIU">RIUs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : auditLog?.data && auditLog.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Type</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="w-40">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLog.data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="p-2 bg-muted rounded-lg inline-flex">
                        {getEntityIcon(entry.entityType)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{entry.actionDescription}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getActionBadgeVariant(entry.action)}>
                            {entry.action}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {entry.entityType} · {entry.entityId.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{formatActorName(entry)}</p>
                          {entry.ipAddress && (
                            <p className="text-xs text-muted-foreground">{entry.ipAddress}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <ScrollText className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No audit log entries found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {auditLog && auditLog.total > auditLog.limit && (
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * auditLog.limit + 1} to{' '}
            {Math.min(page * auditLog.limit, auditLog.total)} of {auditLog.total} entries
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * auditLog.limit >= auditLog.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
