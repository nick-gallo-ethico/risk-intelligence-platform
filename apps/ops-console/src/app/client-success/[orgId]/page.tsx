'use client';

/**
 * Client Detail Page
 *
 * Shows detailed health metrics, usage data, and feature adoption for a specific client.
 * Per CONTEXT.md:
 * - Traffic light + numeric with drill-down
 * - Configurable alerts per account (high-touch vs PLG)
 * - Binary feature flags for adoption tracking
 */

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { UsageMetricsChart } from '@/components/client-success/UsageMetricsChart';
import { FeatureAdoptionGrid } from '@/components/client-success/FeatureAdoptionGrid';
import { ArrowLeft, Bell, BellOff, Calendar, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ClientHealthResponse {
  id: string;
  name: string;
  slug: string;
  healthScore: number;
  trend: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  components: {
    login: number;
    caseResolution: number;
    campaignCompletion: number;
    featureAdoption: number;
    ticketVolume: number;
  };
  alertsEnabled: boolean;
  lastActivity: string;
  recentActivity: Array<{
    timestamp: string;
    description: string;
    type: string;
  }>;
  stats: {
    totalUsers: number;
    activeCases: number;
    pendingCampaigns: number;
    openTickets: number;
  };
}

interface UsageDataResponse {
  daily: Array<{
    date: string;
    logins: number;
    casesCreated: number;
    casesResolved: number;
    campaignResponses: number;
  }>;
  summary: {
    totalLogins: number;
    uniqueUsers: number;
    avgSessionDuration: number;
    peakDay: string;
  };
}

interface FeatureResponse {
  features: Array<{
    key: string;
    name: string;
    category: string;
    adopted: boolean;
    firstUsed?: string;
    lastUsed?: string;
  }>;
}

export default function ClientDetailPage() {
  const params = useParams();
  const orgId = params?.orgId as string;
  const queryClient = useQueryClient();

  const { data: client, isLoading, refetch, isRefetching } = useQuery<ClientHealthResponse>({
    queryKey: ['client-health', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/client-success/health/${orgId}`);
      if (!res.ok) throw new Error('Failed to fetch client health');
      return res.json();
    },
    enabled: !!orgId,
  });

  const { data: usageData } = useQuery<UsageDataResponse>({
    queryKey: ['client-usage', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/client-success/usage/${orgId}`);
      if (!res.ok) throw new Error('Failed to fetch usage data');
      return res.json();
    },
    enabled: !!orgId,
  });

  const { data: featuresData } = useQuery<FeatureResponse>({
    queryKey: ['client-features', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/client-success/features/${orgId}`);
      if (!res.ok) throw new Error('Failed to fetch features');
      return res.json();
    },
    enabled: !!orgId,
  });

  const toggleAlertsMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await fetch(`/api/v1/internal/client-success/alerts/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error('Failed to toggle alerts');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-health', orgId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-gray-500">Loading client details...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Client not found</p>
        <Link href="/client-success" className="text-primary hover:underline mt-2 inline-block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const healthColor =
    client.healthScore >= 80
      ? { bg: 'bg-green-500', text: 'text-green-700', light: 'bg-green-50' }
      : client.healthScore >= 60
      ? { bg: 'bg-yellow-500', text: 'text-yellow-700', light: 'bg-yellow-50' }
      : { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/client-success"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <span className="text-sm text-gray-400">{client.slug}</span>
          </div>
          <p className="text-gray-500">Client health and usage details</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
          Refresh
        </button>
        <div
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg',
            healthColor.bg
          )}
        >
          {client.healthScore}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-white border rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{client.stats?.totalUsers || 0}</div>
          <div className="text-sm text-gray-500">Total Users</div>
        </div>
        <div className="p-4 bg-white border rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{client.stats?.activeCases || 0}</div>
          <div className="text-sm text-gray-500">Active Cases</div>
        </div>
        <div className="p-4 bg-white border rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{client.stats?.pendingCampaigns || 0}</div>
          <div className="text-sm text-gray-500">Pending Campaigns</div>
        </div>
        <div className="p-4 bg-white border rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{client.stats?.openTickets || 0}</div>
          <div className="text-sm text-gray-500">Open Tickets</div>
        </div>
      </div>

      {/* Alert Settings - per CONTEXT.md configurable alerts */}
      <div className="bg-white border rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {client.alertsEnabled ? (
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <BellOff className="h-5 w-5 text-gray-400" />
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">Proactive Alerts</div>
            <div className="text-sm text-gray-500">
              {client.alertsEnabled
                ? 'You will be notified when health score drops (high-touch mode)'
                : 'Alerts disabled - dashboard monitoring only (PLG/SMB mode)'}
            </div>
          </div>
        </div>
        <button
          onClick={() => toggleAlertsMutation.mutate(!client.alertsEnabled)}
          disabled={toggleAlertsMutation.isPending}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            client.alertsEnabled
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-primary text-white hover:bg-primary/90',
            toggleAlertsMutation.isPending && 'opacity-50'
          )}
        >
          {client.alertsEnabled ? 'Disable Alerts' : 'Enable Alerts'}
        </button>
      </div>

      {/* Usage Metrics Chart */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage Metrics (30 days)</h2>
        <UsageMetricsChart data={usageData} />
      </div>

      {/* Feature Adoption */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Feature Adoption</h2>
        <FeatureAdoptionGrid features={featuresData?.features} />
      </div>

      {/* Recent Activity */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {client.recentActivity?.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent activity</p>
          ) : (
            client.recentActivity?.map((activity, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-500 w-32 flex-shrink-0">
                  {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                </span>
                <span className="text-gray-700">{activity.description}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Quick Actions</h3>
        <div className="flex items-center gap-3">
          <Link
            href={`/client-success/benchmarks?orgId=${orgId}`}
            className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" />
            View Benchmarks
          </Link>
          <Link
            href={`/support/${orgId}`}
            className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" />
            Support Console
          </Link>
          <Link
            href={`/implementations?orgId=${orgId}`}
            className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" />
            Implementation
          </Link>
        </div>
      </div>
    </div>
  );
}
