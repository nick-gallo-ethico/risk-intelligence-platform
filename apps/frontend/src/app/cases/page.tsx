'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { casesApi } from '@/lib/cases-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { Case, CaseStatus, Severity, CaseQueryParams } from '@/types/case';

const STATUS_COLORS: Record<CaseStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  OPEN: 'bg-yellow-100 text-yellow-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

const SEVERITY_COLORS: Record<Severity, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

export default function CasesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [cases, setCases] = useState<Case[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: CaseQueryParams = {
        limit,
        offset: page * limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter as CaseStatus;
      }
      if (severityFilter !== 'all') {
        params.severity = severityFilter as Severity;
      }
      if (search.trim()) {
        params.search = search.trim();
      }

      const response = await casesApi.list(params);
      setCases(response.data);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch cases:', err);
      setError('Failed to load cases. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, severityFilter, search]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCases();
    }
  }, [isAuthenticated, fetchCases]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchCases();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="font-semibold text-gray-900">
                Risk Intelligence Platform
              </span>
            </div>
            <nav className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" className="font-semibold">
                Cases
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cases</h1>
            <p className="text-gray-600 mt-1">
              {total} total cases in your organization
            </p>
          </div>
          <Button onClick={() => router.push('/cases/new')}>
            + New Case
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search by reference, details, summary..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={severityFilter}
                onValueChange={(value) => {
                  setSeverityFilter(value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" variant="outline">
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Cases Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Cases</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-red-600 mb-4 p-4 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Loading cases...
              </div>
            ) : cases.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No cases found. Create your first case to get started.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cases.map((caseItem) => (
                      <TableRow
                        key={caseItem.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push(`/cases/${caseItem.id}`)}
                      >
                        <TableCell className="font-mono text-sm font-medium">
                          {caseItem.referenceNumber}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {caseItem.summary || caseItem.details.slice(0, 100)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={STATUS_COLORS[caseItem.status]}
                          >
                            {caseItem.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {caseItem.severity ? (
                            <Badge
                              variant="outline"
                              className={SEVERITY_COLORS[caseItem.severity]}
                            >
                              {caseItem.severity}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {caseItem.sourceChannel.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(caseItem.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/cases/${caseItem.id}`);
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      Showing {page * limit + 1} to{' '}
                      {Math.min((page + 1) * limit, total)} of {total} cases
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
