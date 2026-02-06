/**
 * Benchmark Compare Component
 *
 * Visualizes client position relative to peer benchmarks.
 * Per CONTEXT.md: Show percentile, median, P25/P75 with visual indicator.
 *
 * Display format from CONTEXT.md:
 * ├────────────────────●────────────────────┤
 * 68%                 81%                  89%
 * (25th)            (median)             (75th)
 */

import { cn } from '@/lib/utils';

interface BenchmarkCompareProps {
  title: string;
  metric: string;
  clientValue: number | null | undefined;
  benchmarkData?: {
    p25: number;
    median: number;
    p75: number;
    mean?: number;
    min?: number;
    max?: number;
    peerCount: number;
  };
  invertComparison?: boolean; // For metrics where lower is better (e.g., resolution time)
  unit?: string;
}

export function BenchmarkCompare({
  title,
  metric,
  clientValue,
  benchmarkData,
  invertComparison = false,
  unit = '%',
}: BenchmarkCompareProps) {
  if (!benchmarkData) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="h-32 flex items-center justify-center text-gray-400">
          No benchmark data available
        </div>
      </div>
    );
  }

  const { p25, median, p75, peerCount } = benchmarkData;

  // Calculate display range (extend beyond quartiles for visualization)
  const range = p75 - p25;
  const min = Math.max(0, p25 - range * 0.5);
  const max = p75 + range * 0.5;

  // Calculate position on the scale (0-100%)
  const getPosition = (value: number): number => {
    if (max === min) return 50;
    return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  };

  // Calculate percentile rank
  const getPercentile = (value: number): number => {
    if (invertComparison) {
      // Lower is better
      if (value <= p25) return 75 + Math.min(25, ((p25 - value) / (p25 || 1)) * 25);
      if (value <= median) return 50 + ((median - value) / (median - p25 || 1)) * 25;
      if (value <= p75) return 25 + ((p75 - value) / (p75 - median || 1)) * 25;
      return Math.max(0, 25 - ((value - p75) / (p75 || 1)) * 25);
    } else {
      // Higher is better
      if (value >= p75) return 75 + Math.min(25, ((value - p75) / (p75 || 1)) * 25);
      if (value >= median) return 50 + ((value - median) / (p75 - median || 1)) * 25;
      if (value >= p25) return 25 + ((value - p25) / (median - p25 || 1)) * 25;
      return Math.max(0, (value / (p25 || 1)) * 25);
    }
  };

  const clientPercentile = clientValue != null ? Math.round(getPercentile(clientValue)) : null;
  const clientPosition = clientValue != null ? getPosition(clientValue) : null;

  // Color based on percentile
  const getPercentileColor = (percentile: number): string => {
    if (percentile >= 75) return 'text-green-600';
    if (percentile >= 50) return 'text-blue-600';
    if (percentile >= 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPercentileLabel = (percentile: number): string => {
    if (percentile >= 75) return 'Excellent';
    if (percentile >= 50) return 'Good';
    if (percentile >= 25) return 'Fair';
    return 'Needs Attention';
  };

  const formatValue = (value: number): string => {
    if (unit === ' days') return `${Math.round(value)}${unit}`;
    return `${Math.round(value)}${unit}`;
  };

  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>

      {/* Client value and percentile */}
      {clientValue != null && clientPercentile != null ? (
        <div className="mb-6">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900">{formatValue(clientValue)}</span>
            <span className={cn('text-lg font-medium', getPercentileColor(clientPercentile))}>
              {clientPercentile}th percentile
            </span>
          </div>
          <div className={cn('text-sm mt-1', getPercentileColor(clientPercentile))}>
            {getPercentileLabel(clientPercentile)}
            {invertComparison && clientValue < median && ' (lower is better)'}
            {!invertComparison && clientValue > median && ' (higher is better)'}
          </div>
        </div>
      ) : (
        <div className="mb-6 text-gray-400">Select a client to see comparison</div>
      )}

      {/* Visual benchmark scale */}
      <div className="relative pt-10 pb-8">
        {/* Scale bar */}
        <div className="h-4 bg-gray-200 rounded-full relative overflow-visible">
          {/* Quartile ranges */}
          <div
            className="absolute top-0 bottom-0 bg-gray-300 rounded-l-full"
            style={{
              left: `${getPosition(p25)}%`,
              width: `${getPosition(median) - getPosition(p25)}%`,
            }}
          />
          <div
            className="absolute top-0 bottom-0 bg-blue-200 rounded-r-full"
            style={{
              left: `${getPosition(median)}%`,
              width: `${getPosition(p75) - getPosition(median)}%`,
            }}
          />

          {/* P25 marker */}
          <div
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `${getPosition(p25)}%` }}
          >
            <div className="w-0.5 h-8 bg-gray-400" />
            <div className="text-center mt-1">
              <div className="text-xs font-medium text-gray-600">{formatValue(p25)}</div>
              <div className="text-xs text-gray-400">25th</div>
            </div>
          </div>

          {/* Median marker */}
          <div
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `${getPosition(median)}%` }}
          >
            <div className="w-0.5 h-8 bg-blue-500" />
            <div className="text-center mt-1">
              <div className="text-xs font-medium text-blue-600">{formatValue(median)}</div>
              <div className="text-xs text-gray-400">median</div>
            </div>
          </div>

          {/* P75 marker */}
          <div
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `${getPosition(p75)}%` }}
          >
            <div className="w-0.5 h-8 bg-gray-400" />
            <div className="text-center mt-1">
              <div className="text-xs font-medium text-gray-600">{formatValue(p75)}</div>
              <div className="text-xs text-gray-400">75th</div>
            </div>
          </div>

          {/* Client position marker */}
          {clientPosition != null && (
            <div
              className="absolute -top-8 -translate-x-1/2 transition-all duration-300"
              style={{ left: `${Math.min(95, Math.max(5, clientPosition))}%` }}
            >
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-purple-600 mb-1">Your client</div>
                <div className="w-4 h-4 bg-purple-600 rounded-full border-2 border-white shadow-lg" />
                <div className="w-0.5 h-10 bg-purple-600" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Peer count */}
      <div className="text-xs text-gray-400 text-center pt-2 border-t">
        Compared to {peerCount} peer organizations
      </div>
    </div>
  );
}
