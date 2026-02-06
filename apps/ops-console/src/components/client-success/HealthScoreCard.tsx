'use client';

/**
 * Health Score Card Component
 *
 * Displays client health with traffic light indicator and numeric score.
 * Expands to show component breakdown per CONTEXT.md drill-down requirement.
 *
 * Score weights (from 12-08 backend):
 * - Login Activity: 20%
 * - Case Resolution: 25%
 * - Campaign Completion: 25%
 * - Feature Adoption: 15%
 * - Support Tickets: 15% (inverse)
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Bell,
  BellOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthScoreCardProps {
  client: {
    id: string;
    name: string;
    healthScore: number;
    trend: number; // -100 to +100
    components: {
      login: number;
      caseResolution: number;
      campaignCompletion: number;
      featureAdoption: number;
      ticketVolume: number;
    };
    alertsEnabled: boolean;
    lastActivity: string;
  };
}

export function HealthScoreCard({ client }: HealthScoreCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getHealthColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-green-500', text: 'text-green-700', light: 'bg-green-50', border: 'border-green-200' };
    if (score >= 60) return { bg: 'bg-yellow-500', text: 'text-yellow-700', light: 'bg-yellow-50', border: 'border-yellow-200' };
    return { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50', border: 'border-red-200' };
  };

  const colors = getHealthColor(client.healthScore);
  const TrendIcon = client.trend > 0 ? TrendingUp : client.trend < 0 ? TrendingDown : Minus;
  const trendColor = client.trend > 0 ? 'text-green-600' : client.trend < 0 ? 'text-red-600' : 'text-gray-500';

  const componentWeights = [
    { key: 'login', label: 'Login Activity', weight: '20%', value: client.components.login },
    { key: 'caseResolution', label: 'Case Resolution', weight: '25%', value: client.components.caseResolution },
    { key: 'campaignCompletion', label: 'Campaign Completion', weight: '25%', value: client.components.campaignCompletion },
    { key: 'featureAdoption', label: 'Feature Adoption', weight: '15%', value: client.components.featureAdoption },
    { key: 'ticketVolume', label: 'Support Tickets (inv)', weight: '15%', value: client.components.ticketVolume },
  ];

  return (
    <div className={cn('border rounded-lg overflow-hidden transition-shadow hover:shadow-md', colors.light, colors.border)}>
      {/* Main card */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <Link
            href={`/client-success/${client.id}`}
            className="flex items-center gap-3 hover:underline group"
          >
            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center group-hover:bg-gray-300 transition-colors">
              <Building2 className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{client.name}</div>
              <div className="text-xs text-gray-500">
                Last activity: {new Date(client.lastActivity).toLocaleDateString()}
              </div>
            </div>
          </Link>

          {/* Health Score with Traffic Light */}
          <div className="flex items-center gap-4">
            {/* Trend */}
            <div className={cn('flex items-center gap-1', trendColor)}>
              <TrendIcon className="h-4 w-4" />
              <span className="text-sm font-medium">
                {client.trend > 0 ? '+' : ''}
                {Math.abs(client.trend)}%
              </span>
            </div>

            {/* Alert status */}
            <div title={client.alertsEnabled ? 'Alerts enabled (high-touch)' : 'Alerts disabled (PLG/SMB)'}>
              {client.alertsEnabled ? (
                <Bell className="h-4 w-4 text-primary" />
              ) : (
                <BellOff className="h-4 w-4 text-gray-300" />
              )}
            </div>

            {/* Score circle - traffic light with numeric */}
            <div
              className={cn(
                'w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm',
                colors.bg
              )}
            >
              {client.healthScore}
            </div>
          </div>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {expanded ? 'Hide details' : 'Show score breakdown'}
        </button>
      </div>

      {/* Expanded detail - drill-down per CONTEXT.md */}
      {expanded && (
        <div className="border-t bg-white p-4 space-y-3">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Health Score Components
          </div>
          {componentWeights.map((comp) => {
            const compColors = getHealthColor(comp.value);
            return (
              <div key={comp.key} className="flex items-center justify-between gap-4">
                <div className="text-sm min-w-0">
                  <span className="font-medium text-gray-700">{comp.label}</span>
                  <span className="text-gray-400 ml-2">({comp.weight})</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full transition-all', compColors.bg)}
                      style={{ width: `${Math.min(100, Math.max(0, comp.value))}%` }}
                    />
                  </div>
                  <span className={cn('text-sm font-medium w-10 text-right', compColors.text)}>
                    {comp.value}%
                  </span>
                </div>
              </div>
            );
          })}

          {/* Quick action link */}
          <div className="pt-3 border-t mt-4">
            <Link
              href={`/client-success/${client.id}`}
              className="text-sm text-primary hover:underline"
            >
              View full details and usage metrics
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
