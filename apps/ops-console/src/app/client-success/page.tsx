'use client';

/**
 * Client Success Dashboard - Portfolio View
 *
 * Traffic light health indicators with drill-down per CONTEXT.md:
 * - Red (<60%): Critical - needs immediate attention
 * - Amber (60-79%): At Risk - needs monitoring
 * - Green (80%+): Healthy - normal operations
 *
 * Health score components (per 12-08 backend):
 * - Login Activity: 20% weight
 * - Case Resolution: 25% weight
 * - Campaign Completion: 25% weight
 * - Feature Adoption: 15% weight
 * - Support Tickets: 15% weight (inverse - lower is better)
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { HealthScoreCard } from '@/components/client-success/HealthScoreCard';
import { TrendingUp, TrendingDown, Minus, Filter, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type HealthFilter = 'all' | 'red' | 'amber' | 'green';
type SortOption = 'score' | 'name' | 'trend';

interface ClientHealthData {
  id: string;
  name: string;
  healthScore: number;
  trend: number;
  components: {
    login: number;
    caseResolution: number;
    campaignCompletion: number;
    featureAdoption: number;
    ticketVolume: number;
  };
  alertsEnabled: boolean;
  lastActivity: string;
}

interface PortfolioResponse {
  clients: ClientHealthData[];
  summary: {
    total: number;
    healthy: number;
    atRisk: number;
    critical: number;
    averageScore: number;
  };
  lastUpdated: string;
}

export default function ClientSuccessDashboardPage() {
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('score');

  const { data, isLoading, refetch, isRefetching } = useQuery<PortfolioResponse>({
    queryKey: ['client-health-portfolio'],
    queryFn: async () => {
      const res = await fetch('/api/v1/internal/client-success/portfolio');
      if (!res.ok) throw new Error('Failed to fetch portfolio');
      return res.json();
    },
  });

  const getHealthColor = (score: number): 'red' | 'amber' | 'green' => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'amber';
    return 'red';
  };

  const filteredClients = data?.clients
    ?.filter((client) => {
      if (healthFilter === 'all') return true;
      return getHealthColor(client.healthScore) === healthFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'score') return b.healthScore - a.healthScore;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'trend') return b.trend - a.trend;
      return 0;
    });

  const healthCounts = {
    red: data?.clients?.filter((c) => c.healthScore < 60).length || 0,
    amber: data?.clients?.filter((c) => c.healthScore >= 60 && c.healthScore < 80).length || 0,
    green: data?.clients?.filter((c) => c.healthScore >= 80).length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Success Dashboard</h1>
          <p className="text-gray-500">Portfolio health and usage metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
            Refresh
          </button>
          <Link
            href="/client-success/benchmarks"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium"
          >
            View Benchmarks
          </Link>
        </div>
      </div>

      {/* Portfolio Summary - Traffic Light View */}
      <div className="grid grid-cols-4 gap-4">
        <button
          onClick={() => setHealthFilter('all')}
          className={cn(
            'p-4 bg-white border rounded-lg text-left transition-all',
            healthFilter === 'all' && 'ring-2 ring-primary shadow-sm'
          )}
        >
          <div className="text-3xl font-bold text-gray-900">{data?.clients?.length || 0}</div>
          <div className="text-sm text-gray-500 mt-1">Total Clients</div>
          {data?.summary && (
            <div className="text-xs text-gray-400 mt-2">
              Avg score: {Math.round(data.summary.averageScore)}%
            </div>
          )}
        </button>

        <button
          onClick={() => setHealthFilter('green')}
          className={cn(
            'p-4 bg-green-50 border border-green-200 rounded-lg text-left transition-all',
            healthFilter === 'green' && 'ring-2 ring-green-500 shadow-sm'
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-3xl font-bold text-green-700">{healthCounts.green}</span>
          </div>
          <div className="text-sm text-green-600 mt-1">Healthy (80%+)</div>
          <div className="flex items-center gap-1 text-xs text-green-500 mt-2">
            <TrendingUp className="h-3 w-3" />
            Normal operations
          </div>
        </button>

        <button
          onClick={() => setHealthFilter('amber')}
          className={cn(
            'p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left transition-all',
            healthFilter === 'amber' && 'ring-2 ring-yellow-500 shadow-sm'
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-3xl font-bold text-yellow-700">{healthCounts.amber}</span>
          </div>
          <div className="text-sm text-yellow-600 mt-1">At Risk (60-79%)</div>
          <div className="flex items-center gap-1 text-xs text-yellow-500 mt-2">
            <Minus className="h-3 w-3" />
            Needs monitoring
          </div>
        </button>

        <button
          onClick={() => setHealthFilter('red')}
          className={cn(
            'p-4 bg-red-50 border border-red-200 rounded-lg text-left transition-all',
            healthFilter === 'red' && 'ring-2 ring-red-500 shadow-sm'
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-3xl font-bold text-red-700">{healthCounts.red}</span>
          </div>
          <div className="text-sm text-red-600 mt-1">Critical (&lt;60%)</div>
          <div className="flex items-center gap-1 text-xs text-red-500 mt-2">
            <TrendingDown className="h-3 w-3" />
            Immediate attention
          </div>
        </button>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-3 bg-white p-3 border rounded-lg">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-500">Sort by:</span>
        {(['score', 'name', 'trend'] as const).map((option) => (
          <button
            key={option}
            onClick={() => setSortBy(option)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-full transition-colors',
              sortBy === option
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {option === 'score' && 'Health Score'}
            {option === 'name' && 'Name'}
            {option === 'trend' && 'Trend'}
          </button>
        ))}

        <div className="flex-1" />

        {data?.lastUpdated && (
          <span className="text-xs text-gray-400">
            Last updated: {new Date(data.lastUpdated).toLocaleString()}
          </span>
        )}
      </div>

      {/* Client List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-pulse text-gray-500">Loading client health data...</div>
        </div>
      ) : filteredClients?.length === 0 ? (
        <div className="text-center py-12 bg-white border rounded-lg">
          <p className="text-gray-500">No clients match the current filter</p>
          <button
            onClick={() => setHealthFilter('all')}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Show all clients
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredClients?.map((client) => (
            <HealthScoreCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
