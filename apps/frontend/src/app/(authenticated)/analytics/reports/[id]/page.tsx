'use client';

/**
 * Report Detail Page
 *
 * Displays a single report with its configuration and run options.
 * Route: /analytics/reports/[id]
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Download,
  Play,
  Settings,
  Star,
  Clock,
  FileText,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { analyticsApi } from '@/lib/analytics-api';
import type { Report } from '@/types/analytics';
import { cn } from '@/lib/utils';

type DateRange = 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'YEAR_TO_DATE' | 'CUSTOM';

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('LAST_30_DAYS');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportId = params?.id as string;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch report
  useEffect(() => {
    async function fetchReport() {
      if (!reportId || !isAuthenticated) return;

      try {
        setIsLoading(true);
        const data = await analyticsApi.getReport(reportId);
        setReport(data);
      } catch (err) {
        console.error('Failed to fetch report:', err);
        setError('Report not found');
      } finally {
        setIsLoading(false);
      }
    }

    fetchReport();
  }, [reportId, isAuthenticated]);

  const handleRunReport = async () => {
    setIsRunning(true);
    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    toast.success('Report generated successfully');
    setIsRunning(false);
  };

  const handleExport = (format: 'pdf' | 'csv' | 'excel') => {
    toast.info(`Exporting report as ${format.toUpperCase()}...`);
  };

  if (authLoading || isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-8 w-[200px]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Report not found or failed to load.</p>
          <Button variant="outline" asChild>
            <Link href="/analytics?tab=reports">Back to Reports</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/analytics?tab=reports">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to Reports</span>
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{report.name}</h1>
              {report.isSystem && (
                <Badge variant="secondary">System</Badge>
              )}
            </div>
            {report.description && (
              <p className="text-muted-foreground text-sm">{report.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleRunReport} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Report
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Output */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report Results
            </CardTitle>
            <CardDescription>
              {isRunning ? 'Generating report...' : 'Click "Run Report" to generate results'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="min-h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg">
              {isRunning ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p>Generating report...</p>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Report results will appear here after running
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Report Configuration */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date Range</label>
                <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                  <SelectTrigger className="mt-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LAST_7_DAYS">Last 7 Days</SelectItem>
                    <SelectItem value="LAST_30_DAYS">Last 30 Days</SelectItem>
                    <SelectItem value="LAST_90_DAYS">Last 90 Days</SelectItem>
                    <SelectItem value="YEAR_TO_DATE">Year to Date</SelectItem>
                    <SelectItem value="CUSTOM">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {report.category && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <p className="text-sm">{report.category}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Data Source</label>
                <p className="text-sm">{report.dataSource}</p>
              </div>

              {report.tags && report.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {report.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleExport('pdf')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleExport('csv')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleExport('excel')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Download Excel
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Report History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No previous runs found
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
