'use client';

/**
 * Analytics Page
 *
 * Main analytics page with tabs for Dashboards and Reports.
 * Provides access to pre-built dashboards and report templates.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth-context';
import {
  useDashboards,
  useDashboardTemplates,
  useToggleDashboardFavorite,
  useCreateDashboard,
  useDeleteDashboard,
  useReports,
  useToggleReportFavorite,
} from '@/hooks/use-dashboards';
import {
  DashboardsList,
  ReportsList,
  DashboardTemplatePicker,
} from '@/components/analytics';
import type { DashboardTemplate } from '@/types/analytics';

type TabValue = 'dashboards' | 'reports';

export default function AnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Get initial tab from URL or default to dashboards
  const initialTab = (searchParams?.get('tab') as TabValue) || 'dashboards';
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // Data hooks
  const { data: dashboardsData, isLoading: dashboardsLoading } = useDashboards({
    includeSystem: true,
  });
  const { data: templates = [], isLoading: templatesLoading } = useDashboardTemplates();
  const { data: reportsData, isLoading: reportsLoading } = useReports();

  // Mutation hooks
  const toggleDashboardFavorite = useToggleDashboardFavorite();
  const createDashboard = useCreateDashboard();
  const deleteDashboard = useDeleteDashboard();
  const toggleReportFavorite = useToggleReportFavorite();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Sync tab with URL
  useEffect(() => {
    const tabParam = searchParams?.get('tab') as TabValue | undefined;
    if (tabParam && ['dashboards', 'reports'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Handle tab change - update URL
  const handleTabChange = useCallback(
    (value: string) => {
      const newTab = value as TabValue;
      setActiveTab(newTab);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('tab', newTab);
      router.replace(newUrl.pathname + newUrl.search, { scroll: false });
    },
    [router]
  );

  // Dashboard handlers
  const handleToggleDashboardFavorite = useCallback(
    (id: string) => {
      toggleDashboardFavorite.mutate(id, {
        onError: () => {
          toast.error('Failed to update favorite status');
        },
      });
    },
    [toggleDashboardFavorite]
  );

  const handleSelectDashboard = useCallback(
    (id: string) => {
      router.push(`/analytics/dashboards/${id}`);
    },
    [router]
  );

  const handleDeleteDashboard = useCallback(
    (id: string) => {
      if (window.confirm('Are you sure you want to delete this dashboard?')) {
        deleteDashboard.mutate(id, {
          onSuccess: () => {
            toast.success('Dashboard deleted');
          },
          onError: () => {
            toast.error('Failed to delete dashboard');
          },
        });
      }
    },
    [deleteDashboard]
  );

  const handleTemplateSelect = useCallback(
    (template: DashboardTemplate) => {
      createDashboard.mutate(
        {
          name: `New ${template.name}`,
          description: template.description,
          dashboardType: template.dashboardType,
          templateId: template.id,
        },
        {
          onSuccess: (dashboard) => {
            toast.success('Dashboard created');
            router.push(`/analytics/dashboards/${dashboard.id}`);
          },
          onError: () => {
            toast.error('Failed to create dashboard');
          },
        }
      );
    },
    [createDashboard, router]
  );

  // Report handlers
  const handleToggleReportFavorite = useCallback(
    (id: string) => {
      toggleReportFavorite.mutate(id, {
        onError: () => {
          toast.error('Failed to update favorite status');
        },
      });
    },
    [toggleReportFavorite]
  );

  const handleSelectReport = useCallback(
    (id: string) => {
      router.push(`/analytics/reports/${id}`);
    },
    [router]
  );

  const handleRunReport = useCallback(
    (id: string) => {
      router.push(`/analytics/reports/${id}/run`);
    },
    [router]
  );

  const handleCreateReport = useCallback(() => {
    toast.info('Report builder is under development');
  }, []);

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const dashboards = dashboardsData?.data || [];
  const reports = reportsData?.data || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            View dashboards and reports
          </p>
        </div>
        {activeTab === 'dashboards' && (
          <Button onClick={() => setTemplatePickerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Dashboard
          </Button>
        )}
        {activeTab === 'reports' && (
          <Button onClick={handleCreateReport}>
            <Plus className="mr-2 h-4 w-4" />
            Create Report
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboards" className="mt-6">
          <DashboardsList
            dashboards={dashboards}
            isLoading={dashboardsLoading}
            onToggleFavorite={handleToggleDashboardFavorite}
            onSelect={handleSelectDashboard}
            onDelete={handleDeleteDashboard}
          />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <ReportsList
            reports={reports}
            isLoading={reportsLoading}
            onToggleFavorite={handleToggleReportFavorite}
            onSelect={handleSelectReport}
            onRun={handleRunReport}
          />
        </TabsContent>
      </Tabs>

      {/* Template Picker Dialog */}
      <DashboardTemplatePicker
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        templates={templates}
        isLoading={templatesLoading}
        onSelect={handleTemplateSelect}
      />
    </div>
  );
}
