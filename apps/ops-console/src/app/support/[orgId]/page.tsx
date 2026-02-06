'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useImpersonation } from '@/hooks/useImpersonation';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  Settings,
  Briefcase,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  FileText,
  RefreshCw,
  Shield,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Tenant detail data from the API
 */
interface TenantDetails {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  plan: string;
  createdAt: string;
  _count: {
    users: number;
    cases: number;
    policies: number;
    campaigns: number;
  };
}

/**
 * Error log entry from the API
 */
interface ErrorLogEntry {
  id: string;
  level: 'error' | 'warn' | 'info';
  action: string;
  actionDescription: string;
  entityType?: string;
  entityId?: string;
  error?: string;
  createdAt: string;
}

/**
 * Tenant configuration from the API
 */
interface TenantConfig {
  organization: {
    name: string;
    slug: string;
    ssoConfig?: {
      provider: string;
      enabled: boolean;
    };
    mfaRequired: boolean;
  };
  integrations: {
    hris?: {
      provider: string;
      lastSyncAt?: string;
      status: 'connected' | 'error' | 'pending';
    };
    email?: {
      provider: string;
      configured: boolean;
    };
  };
  featureFlags: Array<{
    name: string;
    isAdopted: boolean;
    adoptedAt?: string;
  }>;
}

/**
 * Job queue status from the API
 */
interface JobQueueStatus {
  exports: Array<{
    id: string;
    type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: string;
  }>;
  emails: Array<{
    id: string;
    to: string;
    status: 'pending' | 'sent' | 'failed';
    createdAt: string;
  }>;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

/**
 * Support Console tenant detail page.
 *
 * Shows comprehensive debug information for a specific tenant:
 * - Tenant overview and stats
 * - Recent error logs
 * - Configuration status (SSO, HRIS, features)
 * - Job queue status
 * - Search index health
 *
 * Per CONTEXT.md this enables Support to:
 * - Diagnose issues quickly
 * - View tenant config without manual DB access
 * - Monitor job queues and integrations
 */
export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const { getHeaders, isImpersonating, session } = useImpersonation();

  // Check if we're viewing the correct tenant
  const isCurrentTenant = session?.organizationId === orgId;

  /**
   * Fetch tenant details
   */
  const {
    data: details,
    isLoading: isLoadingDetails,
    error: detailsError,
  } = useQuery({
    queryKey: ['tenant-details', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/support/tenants/${orgId}`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load tenant details');
      return res.json() as Promise<TenantDetails>;
    },
  });

  /**
   * Fetch recent errors
   */
  const { data: errors, isLoading: isLoadingErrors } = useQuery({
    queryKey: ['tenant-errors', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/support/tenants/${orgId}/errors`, {
        headers: getHeaders(),
      });
      if (!res.ok) return [];
      return res.json() as Promise<ErrorLogEntry[]>;
    },
    enabled: !!orgId,
  });

  /**
   * Fetch configuration
   */
  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['tenant-config', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/support/tenants/${orgId}/config`, {
        headers: getHeaders(),
      });
      if (!res.ok) return null;
      return res.json() as Promise<TenantConfig>;
    },
    enabled: !!orgId,
  });

  /**
   * Fetch job queue status
   */
  const { data: jobs, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['tenant-jobs', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/support/tenants/${orgId}/jobs`, {
        headers: getHeaders(),
      });
      if (!res.ok) return null;
      return res.json() as Promise<JobQueueStatus>;
    },
    enabled: !!orgId,
  });

  // Loading state
  if (isLoadingDetails) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
          <span className="text-gray-500">Loading tenant details...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (detailsError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <div>
            <h2 className="font-semibold text-red-900">Failed to load tenant</h2>
            <p className="text-red-700 text-sm">{(detailsError as Error).message}</p>
          </div>
        </div>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-red-700 hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Go back
        </button>
      </div>
    );
  }

  // Get status badge color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'trial':
        return 'bg-blue-100 text-blue-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-700';
      case 'suspended':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Count pending/failed jobs
  const pendingJobs = (jobs?.exports?.filter((j) => j.status === 'pending').length || 0) +
    (jobs?.emails?.filter((j) => j.status === 'pending').length || 0);
  const failedJobs = (jobs?.exports?.filter((j) => j.status === 'failed').length || 0) +
    (jobs?.emails?.filter((j) => j.status === 'failed').length || 0);

  // Count enabled features
  const enabledFeatures = config?.featureFlags?.filter((f) => f.isAdopted).length || 0;
  const totalFeatures = config?.featureFlags?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/support')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Back to Support Console"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{details?.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-500 font-mono text-sm">{details?.slug}</span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full', getStatusColor(details?.status))}>
                {details?.status}
              </span>
              {details?.plan && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  {details.plan}
                </span>
              )}
            </div>
          </div>
        </div>

        {!isCurrentTenant && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-800">
            <Shield className="h-4 w-4 inline mr-2" />
            Not currently impersonating this tenant
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-white border rounded-lg">
          <div className="flex items-center justify-between">
            <AlertCircle className={cn('h-5 w-5', (errors?.length || 0) > 0 ? 'text-red-500' : 'text-gray-400')} />
            {(errors?.length || 0) > 0 ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
          </div>
          <div className="text-2xl font-bold mt-2">{errors?.length || 0}</div>
          <div className="text-sm text-gray-500">Recent Errors</div>
        </div>

        <div className="p-4 bg-white border rounded-lg">
          <div className="flex items-center justify-between">
            <Briefcase className={cn('h-5 w-5', pendingJobs > 0 ? 'text-blue-500' : 'text-gray-400')} />
            {failedJobs > 0 ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : pendingJobs > 0 ? (
              <Clock className="h-4 w-4 text-blue-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
          </div>
          <div className="text-2xl font-bold mt-2">{pendingJobs}</div>
          <div className="text-sm text-gray-500">
            Pending Jobs {failedJobs > 0 && <span className="text-red-500">({failedJobs} failed)</span>}
          </div>
        </div>

        <div className="p-4 bg-white border rounded-lg">
          <div className="flex items-center justify-between">
            <Settings className="h-5 w-5 text-gray-400" />
            <Minus className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold mt-2">
            {enabledFeatures}/{totalFeatures}
          </div>
          <div className="text-sm text-gray-500">Features Enabled</div>
        </div>

        <div className="p-4 bg-white border rounded-lg">
          <div className="flex items-center justify-between">
            <Users className="h-5 w-5 text-gray-400" />
            <Activity className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold mt-2">{details?._count?.users || 0}</div>
          <div className="text-sm text-gray-500">Users</div>
        </div>
      </div>

      {/* Data counts */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-3 bg-white border rounded-lg flex items-center gap-3">
          <FileText className="h-5 w-5 text-gray-400" />
          <div>
            <div className="font-semibold">{details?._count?.cases || 0}</div>
            <div className="text-xs text-gray-500">Cases</div>
          </div>
        </div>
        <div className="p-3 bg-white border rounded-lg flex items-center gap-3">
          <FileText className="h-5 w-5 text-gray-400" />
          <div>
            <div className="font-semibold">{details?._count?.policies || 0}</div>
            <div className="text-xs text-gray-500">Policies</div>
          </div>
        </div>
        <div className="p-3 bg-white border rounded-lg flex items-center gap-3">
          <FileText className="h-5 w-5 text-gray-400" />
          <div>
            <div className="font-semibold">{details?._count?.campaigns || 0}</div>
            <div className="text-xs text-gray-500">Campaigns</div>
          </div>
        </div>
        <div className="p-3 bg-white border rounded-lg flex items-center gap-3">
          <Clock className="h-5 w-5 text-gray-400" />
          <div>
            <div className="font-semibold">
              {details?.createdAt ? formatDistanceToNow(new Date(details.createdAt), { addSuffix: true }) : '-'}
            </div>
            <div className="text-xs text-gray-500">Created</div>
          </div>
        </div>
      </div>

      {/* Recent errors */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-medium">Recent Errors</h2>
          <Link
            href={`/support/${orgId}/errors`}
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="divide-y max-h-64 overflow-y-auto">
          {isLoadingErrors ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : !errors || errors.length === 0 ? (
            <div className="p-4 text-gray-500 text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              No recent errors
            </div>
          ) : (
            errors.slice(0, 5).map((error) => (
              <div key={error.id} className="p-3 text-sm hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <XCircle
                    className={cn(
                      'h-4 w-4',
                      error.level === 'error' ? 'text-red-500' : 'text-yellow-500'
                    )}
                  />
                  <span className="font-medium">{error.action}</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-500">
                    {formatDistanceToNow(new Date(error.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="text-gray-600 mt-1 ml-6">{error.actionDescription}</div>
                {error.error && (
                  <div className="text-red-600 mt-1 ml-6 font-mono text-xs">{error.error}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-medium">Configuration</h2>
          <Link
            href={`/support/${orgId}/config`}
            className="text-sm text-primary hover:underline"
          >
            View full config
          </Link>
        </div>
        {isLoadingConfig ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="p-4 space-y-4">
            {/* SSO */}
            <div>
              <h4 className="text-sm font-medium mb-2">SSO Configuration</h4>
              <div className="flex items-center gap-2">
                {config?.organization?.ssoConfig?.enabled ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>{config.organization.ssoConfig.provider}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Enabled
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-500">Not configured</span>
                  </>
                )}
              </div>
            </div>

            {/* MFA */}
            <div>
              <h4 className="text-sm font-medium mb-2">MFA Requirement</h4>
              <div className="flex items-center gap-2">
                {config?.organization?.mfaRequired ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Required for all users</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-gray-500">Optional</span>
                  </>
                )}
              </div>
            </div>

            {/* HRIS Integration */}
            <div>
              <h4 className="text-sm font-medium mb-2">HRIS Integration</h4>
              <div className="flex items-center gap-2">
                {config?.integrations?.hris ? (
                  <>
                    {config.integrations.hris.status === 'connected' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : config.integrations.hris.status === 'error' ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    <span>{config.integrations.hris.provider}</span>
                    {config.integrations.hris.lastSyncAt && (
                      <span className="text-gray-500 text-sm">
                        Last sync:{' '}
                        {formatDistanceToNow(new Date(config.integrations.hris.lastSyncAt), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-500">Not configured</span>
                  </>
                )}
              </div>
            </div>

            {/* Feature flags */}
            <div>
              <h4 className="text-sm font-medium mb-2">Feature Adoption</h4>
              <div className="flex flex-wrap gap-2">
                {config?.featureFlags?.slice(0, 6).map((flag) => (
                  <span
                    key={flag.name}
                    className={cn(
                      'text-xs px-2 py-1 rounded-full',
                      flag.isAdopted
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    )}
                  >
                    {flag.name}
                  </span>
                ))}
                {(config?.featureFlags?.length || 0) > 6 && (
                  <span className="text-xs text-gray-500">
                    +{(config?.featureFlags?.length || 0) - 6} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
