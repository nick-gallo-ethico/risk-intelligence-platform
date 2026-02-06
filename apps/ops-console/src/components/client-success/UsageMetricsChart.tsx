'use client';

/**
 * Usage Metrics Chart Component
 *
 * Displays login frequency and feature usage over time.
 * Per CONTEXT.md: login frequency, feature adoption metrics with visual charts.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface UsageMetricsChartProps {
  data?: {
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
  };
}

type MetricType = 'logins' | 'cases' | 'campaigns';

export function UsageMetricsChart({ data }: UsageMetricsChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('logins');

  if (!data || !data.daily || data.daily.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
        No usage data available for this period
      </div>
    );
  }

  const maxValue = Math.max(
    ...data.daily.map((d) => {
      if (selectedMetric === 'logins') return d.logins;
      if (selectedMetric === 'cases') return d.casesCreated + d.casesResolved;
      return d.campaignResponses;
    }),
    1 // Prevent division by zero
  );

  const metrics = [
    { key: 'logins' as const, label: 'Logins', color: 'bg-blue-500' },
    { key: 'cases' as const, label: 'Cases', color: 'bg-green-500' },
    { key: 'campaigns' as const, label: 'Campaigns', color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-4">
      {/* Metric selector */}
      <div className="flex items-center gap-2">
        {metrics.map((metric) => (
          <button
            key={metric.key}
            onClick={() => setSelectedMetric(metric.key)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-full transition-colors',
              selectedMetric === metric.key
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {metric.label}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {data.summary.totalLogins.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Total Logins</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{data.summary.uniqueUsers}</div>
          <div className="text-xs text-gray-500">Unique Users</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(data.summary.avgSessionDuration)}m
          </div>
          <div className="text-xs text-gray-500">Avg Session</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{data.summary.peakDay}</div>
          <div className="text-xs text-gray-500">Peak Day</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="h-48 flex items-end gap-1 pt-4 border-b border-l border-gray-200 relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-gray-400 -ml-10">
          <span>{maxValue}</span>
          <span>{Math.round(maxValue / 2)}</span>
          <span>0</span>
        </div>

        {/* Bars */}
        {data.daily.map((day, i) => {
          const value =
            selectedMetric === 'logins'
              ? day.logins
              : selectedMetric === 'cases'
              ? day.casesCreated + day.casesResolved
              : day.campaignResponses;

          const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const barColor = metrics.find((m) => m.key === selectedMetric)?.color || 'bg-blue-500';

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center group relative">
              {/* Bar */}
              <div className="w-full flex justify-center">
                <div
                  className={cn(
                    'w-full max-w-[20px] rounded-t transition-all group-hover:opacity-80',
                    barColor
                  )}
                  style={{ height: `${height * 1.8}px`, minHeight: value > 0 ? '2px' : '0' }}
                />
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 pointer-events-none">
                <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                  <div className="font-medium">{new Date(day.date).toLocaleDateString()}</div>
                  <div>{value} {selectedMetric}</div>
                </div>
              </div>

              {/* X-axis label (show every 5th) */}
              {i % 5 === 0 && (
                <div className="text-xs text-gray-400 mt-1 absolute -bottom-5">
                  {new Date(day.date).getDate()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-gray-500 pt-2">
        {selectedMetric === 'cases' && (
          <>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded" />
              Cases Created + Resolved
            </div>
          </>
        )}
        {selectedMetric === 'logins' && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            User Logins
          </div>
        )}
        {selectedMetric === 'campaigns' && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-500 rounded" />
            Campaign Responses
          </div>
        )}
      </div>
    </div>
  );
}
