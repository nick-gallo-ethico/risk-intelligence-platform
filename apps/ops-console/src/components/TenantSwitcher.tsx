'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useImpersonation } from '@/hooks/useImpersonation';
import { Search, Building2, Users, Briefcase, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Tenant search result from the API
 */
interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  _count: {
    users: number;
    cases: number;
  };
}

/**
 * Common reasons for impersonation - displayed as quick-select options
 */
const COMMON_REASONS = [
  { value: 'Support ticket investigation', label: 'Support Ticket' },
  { value: 'Customer requested assistance', label: 'Customer Request' },
  { value: 'Configuration review', label: 'Config Review' },
  { value: 'Bug investigation', label: 'Bug Investigation' },
  { value: 'Training/demo preparation', label: 'Training/Demo' },
];

/**
 * Tenant switcher component for Support Console.
 *
 * Per CONTEXT.md:
 * - Search by org name, domain, or ID
 * - Recent tenants dropdown (last 5)
 * - Require reason input (min 10 chars)
 * - Link to support ticket (optional but tracked)
 * - Session timer always visible
 *
 * This component is hidden when actively impersonating - use ImpersonationBar to end session.
 */
export function TenantSwitcher() {
  const [query, setQuery] = useState('');
  const [reason, setReason] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showTicketInput, setShowTicketInput] = useState(false);

  const { startSession, isImpersonating, isStarting, startError } = useImpersonation();

  /**
   * Search for tenants matching the query
   */
  const {
    data: tenants,
    isLoading: isSearching,
    error: searchError,
  } = useQuery({
    queryKey: ['tenants', 'search', query],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/internal/support/tenants/search?query=${encodeURIComponent(query)}`
      );
      if (!res.ok) throw new Error('Failed to search tenants');
      return res.json() as Promise<Tenant[]>;
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  /**
   * Get recently accessed tenants
   */
  const { data: recentTenants } = useQuery({
    queryKey: ['tenants', 'recent'],
    queryFn: async () => {
      const res = await fetch('/api/v1/internal/support/tenants/recent');
      if (!res.ok) return [];
      return res.json() as Promise<Tenant[]>;
    },
    staleTime: 60 * 1000, // Cache for 1 minute
  });

  /**
   * Validate the reason meets minimum length requirement
   */
  const isReasonValid = useMemo(() => reason.trim().length >= 10, [reason]);

  /**
   * Handle selecting a quick reason
   */
  const handleQuickReason = (value: string) => {
    setReason(value);
  };

  /**
   * Handle starting the impersonation session
   */
  const handleStartSession = async () => {
    if (!selectedTenant || !isReasonValid) return;

    try {
      await startSession(
        selectedTenant.id,
        reason.trim(),
        ticketId.trim() || undefined
      );
      // Reset form on success
      setSelectedTenant(null);
      setReason('');
      setTicketId('');
      setQuery('');
    } catch (error) {
      // Error is handled by the hook
      console.error('Failed to start session:', error);
    }
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status: Tenant['status']) => {
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

  // Don't show switcher while impersonating - use ImpersonationBar to manage session
  if (isImpersonating) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Enter Client Context</h2>
        <p className="text-sm text-gray-500 mt-1">
          Search for a tenant to view their data and diagnose issues.
        </p>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="Search by name, domain, or ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn(
            'w-full pl-10 pr-4 py-3 border rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
            'placeholder:text-gray-400'
          )}
          aria-label="Search tenants"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Recent tenants (when no search query) */}
      {query.length < 2 && recentTenants && recentTenants.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Tenants</h3>
          <div className="border rounded-lg divide-y">
            {recentTenants.slice(0, 5).map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => setSelectedTenant(tenant)}
                className={cn(
                  'w-full p-3 text-left hover:bg-gray-50 flex items-center justify-between',
                  'transition-colors',
                  selectedTenant?.id === tenant.id && 'bg-blue-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  <div>
                    <div className="font-medium">{tenant.name}</div>
                    <div className="text-sm text-gray-500">{tenant.slug}</div>
                  </div>
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full', getStatusColor(tenant.status))}>
                  {tenant.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search results */}
      {query.length >= 2 && (
        <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
          {searchError ? (
            <div className="p-4 text-center text-red-500 flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>Failed to search tenants</span>
            </div>
          ) : isSearching ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : tenants?.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No tenants found matching "{query}"
            </div>
          ) : (
            tenants?.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => setSelectedTenant(tenant)}
                className={cn(
                  'w-full p-3 text-left hover:bg-gray-50 flex items-center justify-between',
                  'transition-colors',
                  selectedTenant?.id === tenant.id && 'bg-blue-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  <div>
                    <div className="font-medium">{tenant.name}</div>
                    <div className="text-sm text-gray-500">{tenant.slug}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <Users className="h-4 w-4" aria-hidden="true" />
                    <span>{tenant._count.users}</span>
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <Briefcase className="h-4 w-4" aria-hidden="true" />
                    <span>{tenant._count.cases}</span>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', getStatusColor(tenant.status))}>
                    {tenant.status}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Selected tenant - Start session form */}
      {selectedTenant && (
        <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium">{selectedTenant.name}</div>
                <div className="text-sm text-gray-500">{selectedTenant.slug}</div>
              </div>
            </div>
            <button
              onClick={() => setSelectedTenant(null)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Deselect tenant"
            >
              &times;
            </button>
          </div>

          {/* Quick reasons */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Quick select reason:
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => handleQuickReason(r.value)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-full border transition-colors',
                    reason === r.value
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom reason input */}
          <div>
            <label htmlFor="reason" className="text-sm font-medium text-gray-700 block mb-1">
              Reason for access: <span className="text-red-500">*</span>
            </label>
            <input
              id="reason"
              type="text"
              placeholder="Enter reason (min 10 characters)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={cn(
                'w-full px-3 py-2 border rounded-lg',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                !isReasonValid && reason.length > 0 && 'border-red-300'
              )}
            />
            {reason.length > 0 && !isReasonValid && (
              <p className="text-xs text-red-500 mt-1">
                Reason must be at least 10 characters ({reason.length}/10)
              </p>
            )}
          </div>

          {/* Optional ticket ID */}
          <div>
            <button
              type="button"
              onClick={() => setShowTicketInput(!showTicketInput)}
              className="text-sm text-primary hover:underline"
            >
              {showTicketInput ? 'Hide ticket reference' : 'Add support ticket reference (optional)'}
            </button>
            {showTicketInput && (
              <input
                type="text"
                placeholder="TICKET-123"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                className="w-full mt-2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            )}
          </div>

          {/* Error message */}
          {startError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{(startError as Error).message || 'Failed to start session'}</span>
            </div>
          )}

          {/* Start session button */}
          <button
            onClick={handleStartSession}
            disabled={!isReasonValid || isStarting}
            className={cn(
              'w-full py-2.5 rounded-lg font-medium transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary/50',
              isReasonValid
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            )}
          >
            {isStarting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting Session...
              </span>
            ) : (
              'Start Impersonation Session'
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Session will expire after 4 hours. All actions are logged.
          </p>
        </div>
      )}
    </div>
  );
}
