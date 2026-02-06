'use client';

/**
 * Peer Benchmarks Page
 *
 * Per CONTEXT.md:
 * - Peer comparison with configurable filtering (by size/industry)
 * - Minimum 5 peers for privacy
 * - Show percentile, median, P25/P75 with visual indicator
 * - Cache aggregates nightly
 */

import { useState, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BenchmarkCompare } from '@/components/client-success/BenchmarkCompare';
import { ArrowLeft, Filter, AlertTriangle, Building2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type SizeFilter = 'all' | 'enterprise' | 'midmarket' | 'smb';
type IndustryFilter = 'all' | 'financial' | 'healthcare' | 'technology' | 'manufacturing' | 'retail';

interface BenchmarkMetric {
  p25: number;
  median: number;
  p75: number;
  mean: number;
  min: number;
  max: number;
  peerCount: number;
}

interface BenchmarkResponse {
  peerCount: number;
  filters: {
    size: string | null;
    industry: string | null;
  };
  benchmarks: {
    attestationCompletion: BenchmarkMetric;
    caseResolutionDays: BenchmarkMetric;
    loginRate: BenchmarkMetric;
    featureAdoption: BenchmarkMetric;
    healthScore: BenchmarkMetric;
  };
  clientMetrics: Record<
    string,
    {
      attestationCompletion: number;
      caseResolutionDays: number;
      loginRate: number;
      featureAdoption: number;
      healthScore: number;
    }
  >;
  lastCalculated: string;
}

interface ClientListResponse {
  clients: Array<{
    id: string;
    name: string;
    healthScore: number;
  }>;
}

const MIN_PEER_COUNT = 5; // Per CONTEXT.md privacy requirement

// Wrapper component to handle useSearchParams with Suspense
function BenchmarksContent() {
  const searchParams = useSearchParams();
  const preselectedOrgId = searchParams?.get('orgId') || null;

  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');
  const [industryFilter, setIndustryFilter] = useState<IndustryFilter>('all');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(preselectedOrgId);

  const {
    data: benchmarkData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<BenchmarkResponse>({
    queryKey: ['benchmarks', sizeFilter, industryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sizeFilter !== 'all') params.set('size', sizeFilter);
      if (industryFilter !== 'all') params.set('industry', industryFilter);
      const res = await fetch(`/api/v1/internal/client-success/benchmarks?${params}`);
      if (!res.ok) throw new Error('Failed to fetch benchmarks');
      return res.json();
    },
  });

  const { data: clientList } = useQuery<ClientListResponse>({
    queryKey: ['client-list-benchmarks'],
    queryFn: async () => {
      const res = await fetch('/api/v1/internal/client-success/portfolio');
      if (!res.ok) throw new Error('Failed to fetch client list');
      return res.json();
    },
  });

  const hasSufficientPeers = (benchmarkData?.peerCount || 0) >= MIN_PEER_COUNT;

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
          <h1 className="text-2xl font-bold text-gray-900">Peer Benchmarks</h1>
          <p className="text-gray-500">Compare client metrics against peer groups</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Size:</span>
            {(['all', 'enterprise', 'midmarket', 'smb'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setSizeFilter(opt)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-full transition-colors',
                  sizeFilter === opt
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {opt === 'all' ? 'All Sizes' : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-gray-200" />

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Industry:</span>
            {(['all', 'financial', 'healthcare', 'technology', 'manufacturing', 'retail'] as const).map(
              (opt) => (
                <button
                  key={opt}
                  onClick={() => setIndustryFilter(opt)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-full transition-colors',
                    industryFilter === opt
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              )
            )}
          </div>
        </div>

        {/* Last calculated info */}
        {benchmarkData?.lastCalculated && (
          <div className="text-xs text-gray-400">
            Benchmarks last calculated:{' '}
            {new Date(benchmarkData.lastCalculated).toLocaleString()}
          </div>
        )}
      </div>

      {/* Privacy notice - 5 peer minimum per CONTEXT.md */}
      {!hasSufficientPeers && !isLoading && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-yellow-800">Privacy Protection Active</div>
            <p className="text-sm text-yellow-700 mt-1">
              Benchmark data requires at least {MIN_PEER_COUNT} peers in the comparison group for
              privacy. Current filter shows {benchmarkData?.peerCount || 0} peer
              {(benchmarkData?.peerCount || 0) !== 1 ? 's' : ''}.
            </p>
            <p className="text-sm text-yellow-600 mt-2">
              Please broaden your filters to see benchmark comparisons.
            </p>
          </div>
        </div>
      )}

      {/* Client selector */}
      <div className="bg-white border rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Building2 className="h-4 w-4 inline mr-2" />
          Select client to compare:
        </label>
        <select
          value={selectedOrgId || ''}
          onChange={(e) => setSelectedOrgId(e.target.value || null)}
          className="w-64 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="">Select a client...</option>
          {clientList?.clients?.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name} ({client.healthScore}%)
            </option>
          ))}
        </select>
        {selectedOrgId && (
          <button
            onClick={() => setSelectedOrgId(null)}
            className="ml-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Benchmark comparisons */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-pulse text-gray-500">Loading benchmark data...</div>
        </div>
      ) : hasSufficientPeers ? (
        <div className="grid grid-cols-2 gap-6">
          <BenchmarkCompare
            title="Health Score"
            metric="healthScore"
            clientValue={
              selectedOrgId ? benchmarkData?.clientMetrics?.[selectedOrgId]?.healthScore : null
            }
            benchmarkData={benchmarkData?.benchmarks?.healthScore}
            unit="%"
          />
          <BenchmarkCompare
            title="Attestation Completion Rate"
            metric="attestationCompletion"
            clientValue={
              selectedOrgId
                ? benchmarkData?.clientMetrics?.[selectedOrgId]?.attestationCompletion
                : null
            }
            benchmarkData={benchmarkData?.benchmarks?.attestationCompletion}
            unit="%"
          />
          <BenchmarkCompare
            title="Average Case Resolution Time"
            metric="caseResolutionDays"
            clientValue={
              selectedOrgId
                ? benchmarkData?.clientMetrics?.[selectedOrgId]?.caseResolutionDays
                : null
            }
            benchmarkData={benchmarkData?.benchmarks?.caseResolutionDays}
            invertComparison // Lower is better
            unit=" days"
          />
          <BenchmarkCompare
            title="Weekly Login Rate"
            metric="loginRate"
            clientValue={
              selectedOrgId ? benchmarkData?.clientMetrics?.[selectedOrgId]?.loginRate : null
            }
            benchmarkData={benchmarkData?.benchmarks?.loginRate}
            unit="%"
          />
          <BenchmarkCompare
            title="Feature Adoption"
            metric="featureAdoption"
            clientValue={
              selectedOrgId ? benchmarkData?.clientMetrics?.[selectedOrgId]?.featureAdoption : null
            }
            benchmarkData={benchmarkData?.benchmarks?.featureAdoption}
            unit="%"
          />
        </div>
      ) : null}

      {/* Help text */}
      {hasSufficientPeers && !selectedOrgId && (
        <div className="text-center py-4 text-sm text-gray-500">
          Select a client above to see their position relative to peers
        </div>
      )}
    </div>
  );
}

// Default export wraps content in Suspense for useSearchParams
export default function BenchmarksPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    }>
      <BenchmarksContent />
    </Suspense>
  );
}
