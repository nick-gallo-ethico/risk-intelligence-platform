'use client';

import Link from 'next/link';
import { TenantSwitcher } from '@/components/TenantSwitcher';
import { useImpersonation } from '@/hooks/useImpersonation';
import {
  AlertCircle,
  Settings,
  Briefcase,
  Search,
  Database,
  RefreshCw,
  Activity,
  Shield,
} from 'lucide-react';

/**
 * Support Console main page.
 *
 * Per CONTEXT.md Support Team needs:
 * - Tenant switcher with impersonation (full audit trail)
 * - Cross-tenant search for cases, users, errors
 * - Error log viewer with filtering
 * - Configuration inspector
 * - System health dashboard
 *
 * When not impersonating, shows TenantSwitcher to enter client context.
 * When impersonating, shows quick links to debug tools.
 */
export default function SupportConsolePage() {
  const { session, isImpersonating } = useImpersonation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support Console</h1>
        <p className="text-gray-500 mt-1">
          {isImpersonating
            ? `Viewing ${session?.organizationName || 'client'} data`
            : 'Search for a client to enter their context'}
        </p>
      </div>

      {!isImpersonating ? (
        /* Not impersonating - show tenant switcher */
        <div className="max-w-xl">
          <TenantSwitcher />
        </div>
      ) : (
        /* Impersonating - show debug tools */
        <div className="space-y-6">
          {/* Current context info */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <h2 className="font-semibold">Active Session</h2>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Organization:</span>
                <span className="ml-2 font-medium">{session?.organizationName}</span>
              </div>
              <div>
                <span className="text-gray-500">Slug:</span>
                <span className="ml-2 font-mono">{session?.organizationSlug}</span>
              </div>
              <div>
                <span className="text-gray-500">ID:</span>
                <span className="ml-2 font-mono text-xs">{session?.organizationId}</span>
              </div>
            </div>
          </div>

          {/* Quick access tools */}
          <div className="grid grid-cols-2 gap-4">
            <Link
              href={`/support/${session?.organizationId}/errors`}
              className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-medium">Error Logs</h3>
                  <p className="text-sm text-gray-500">View recent errors and warnings</p>
                </div>
              </div>
            </Link>

            <Link
              href={`/support/${session?.organizationId}/config`}
              className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <Settings className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">Configuration</h3>
                  <p className="text-sm text-gray-500">View tenant settings and integrations</p>
                </div>
              </div>
            </Link>

            <Link
              href={`/support/${session?.organizationId}/jobs`}
              className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <Briefcase className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium">Job Queues</h3>
                  <p className="text-sm text-gray-500">View pending and running jobs</p>
                </div>
              </div>
            </Link>

            <Link
              href={`/support/${session?.organizationId}/search`}
              className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <Search className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Search Index</h3>
                  <p className="text-sm text-gray-500">View Elasticsearch index status</p>
                </div>
              </div>
            </Link>

            <Link
              href={`/support/${session?.organizationId}/database`}
              className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                  <Database className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-medium">Database Stats</h3>
                  <p className="text-sm text-gray-500">View data counts and usage</p>
                </div>
              </div>
            </Link>

            <Link
              href={`/support/${session?.organizationId}/activity`}
              className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 rounded-lg group-hover:bg-cyan-200 transition-colors">
                  <Activity className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <h3 className="font-medium">Activity Log</h3>
                  <p className="text-sm text-gray-500">Recent user and system activity</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Detailed view link */}
          <div className="text-center">
            <Link
              href={`/support/${session?.organizationId}`}
              className="text-primary hover:underline inline-flex items-center gap-2"
            >
              <span>View full tenant dashboard</span>
              <RefreshCw className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
