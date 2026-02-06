/**
 * Feature Adoption Grid Component
 *
 * Displays binary feature adoption status per CONTEXT.md:
 * "Binary feature flags for adoption tracking - which features each tenant has used (yes/no)"
 */

import { CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureAdoptionGridProps {
  features?: Array<{
    key: string;
    name: string;
    category: string;
    adopted: boolean;
    firstUsed?: string;
    lastUsed?: string;
  }>;
}

const categoryOrder = ['Core', 'Advanced', 'Integration', 'Reporting'];
const categoryColors: Record<string, string> = {
  Core: 'bg-blue-50 border-blue-200',
  Advanced: 'bg-purple-50 border-purple-200',
  Integration: 'bg-amber-50 border-amber-200',
  Reporting: 'bg-green-50 border-green-200',
};

export function FeatureAdoptionGrid({ features }: FeatureAdoptionGridProps) {
  if (!features || features.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        No feature adoption data available
      </div>
    );
  }

  const groupedFeatures = features.reduce(
    (acc, feature) => {
      if (!acc[feature.category]) acc[feature.category] = [];
      acc[feature.category].push(feature);
      return acc;
    },
    {} as Record<string, typeof features>
  );

  const adoptedCount = features.filter((f) => f.adopted).length;
  const adoptionRate = Math.round((adoptedCount / features.length) * 100);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">{adoptionRate}%</span>
          <span className="text-sm text-gray-500">adoption rate</span>
        </div>
        <div className="h-6 w-px bg-gray-200" />
        <div className="text-gray-500">
          <span className="font-medium text-gray-900">{adoptedCount}</span> of{' '}
          <span className="font-medium text-gray-900">{features.length}</span> features adopted
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${adoptionRate}%` }}
        />
      </div>

      {/* Feature grid by category */}
      {categoryOrder.map((category) => {
        const categoryFeatures = groupedFeatures[category];
        if (!categoryFeatures || categoryFeatures.length === 0) return null;

        const categoryAdopted = categoryFeatures.filter((f) => f.adopted).length;
        const categoryTotal = categoryFeatures.length;

        return (
          <div key={category}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm text-gray-700">{category}</h3>
              <span className="text-xs text-gray-400">
                {categoryAdopted}/{categoryTotal} adopted
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {categoryFeatures.map((feature) => (
                <div
                  key={feature.key}
                  className={cn(
                    'p-3 border rounded-lg flex items-center gap-2 transition-all',
                    feature.adopted
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  )}
                  title={
                    feature.adopted
                      ? `First used: ${feature.firstUsed ? new Date(feature.firstUsed).toLocaleDateString() : 'Unknown'}`
                      : 'Not yet adopted'
                  }
                >
                  {feature.adopted ? (
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                  )}
                  <span
                    className={cn(
                      'text-sm truncate',
                      feature.adopted ? 'text-gray-700' : 'text-gray-400'
                    )}
                  >
                    {feature.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Recently adopted */}
      {features.some((f) => f.adopted && f.lastUsed) && (
        <div className="pt-4 border-t">
          <h3 className="font-medium text-sm text-gray-700 mb-3">Recently Active Features</h3>
          <div className="flex flex-wrap gap-2">
            {features
              .filter((f) => f.adopted && f.lastUsed)
              .sort((a, b) => {
                if (!a.lastUsed || !b.lastUsed) return 0;
                return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
              })
              .slice(0, 5)
              .map((feature) => (
                <span
                  key={feature.key}
                  className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full"
                >
                  {feature.name}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
