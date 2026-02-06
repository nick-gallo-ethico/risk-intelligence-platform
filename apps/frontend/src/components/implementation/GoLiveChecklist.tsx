'use client';

/**
 * Go-Live Checklist Component
 *
 * Displays go-live readiness with three sections per CONTEXT.md:
 * 1. Hard Gates (must pass - blockers)
 * 2. Readiness Score (weighted, 85% recommended)
 * 3. Client Sign-off (required if below threshold)
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  XCircle,
  Lock,
  FileSignature,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoLiveChecklistProps {
  projectId: string;
  status: {
    allGatesPassed: boolean;
    passedGates: number;
    totalGates: number;
    readinessScore: number;
    recommendedScore: number;
    isRecommendedMet: boolean;
    hasSignoff: boolean;
    canGoLive: boolean;
  };
}

// Hard gates per CONTEXT.md
const HARD_GATES = [
  {
    id: 'auth_configured',
    name: 'Authentication configured',
    description: 'SSO or password authentication is set up and tested',
  },
  {
    id: 'admin_trained',
    name: 'At least 1 admin trained/certified',
    description: 'Primary admin has completed Platform Fundamentals certification',
  },
  {
    id: 'terms_signed',
    name: 'Terms & data processing agreement signed',
    description: 'Legal agreements are executed',
  },
  {
    id: 'contact_designated',
    name: 'Primary contact designated',
    description: 'Escalation contact information is on file',
  },
];

interface SignoffData {
  clientSignerName: string;
  clientSignerEmail: string;
  acknowledgedRisks: string[];
  signoffStatement: string;
}

export function GoLiveChecklist({ projectId, status }: GoLiveChecklistProps) {
  const queryClient = useQueryClient();
  const [showSignoff, setShowSignoff] = useState(false);
  const [signoffData, setSignoffData] = useState<SignoffData>({
    clientSignerName: '',
    clientSignerEmail: '',
    acknowledgedRisks: [],
    signoffStatement: '',
  });

  const signoffMutation = useMutation({
    mutationFn: async (data: SignoffData) => {
      const res = await fetch(
        `/api/v1/internal/implementations/${projectId}/go-live/signoff/client`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) {
        throw new Error('Failed to submit sign-off');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['go-live-status', projectId] });
      setShowSignoff(false);
      setSignoffData({
        clientSignerName: '',
        clientSignerEmail: '',
        acknowledgedRisks: [],
        signoffStatement: '',
      });
    },
  });

  const handleRiskToggle = (riskId: string) => {
    setSignoffData((prev) => ({
      ...prev,
      acknowledgedRisks: prev.acknowledgedRisks.includes(riskId)
        ? prev.acknowledgedRisks.filter((r) => r !== riskId)
        : [...prev.acknowledgedRisks, riskId],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Hard Gates Section */}
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="p-4 border-b flex items-center gap-3">
          <Lock className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">
            Hard Gates (Blockers - must pass)
          </h3>
          <span className="ml-auto text-sm text-gray-500">
            {status.passedGates}/{status.totalGates} passed
          </span>
        </div>
        <div className="divide-y">
          {HARD_GATES.map((gate, index) => {
            // Assume gates pass in order until passedGates count
            const isPassed = index < status.passedGates;
            return (
              <div
                key={gate.id}
                className={cn(
                  'p-4 flex items-start gap-3',
                  isPassed ? 'bg-green-50/50' : ''
                )}
              >
                {isPassed ? (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-300 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div
                    className={cn(
                      'font-medium text-sm',
                      isPassed ? 'text-green-800' : 'text-gray-900'
                    )}
                  >
                    {gate.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {gate.description}
                  </div>
                </div>
                {isPassed && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                    Passed
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Readiness Score Section */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Readiness Score</h3>
          <span className="text-sm text-gray-500">
            Recommended: {status.recommendedScore}%+
          </span>
        </div>

        <div className="relative">
          {/* Score display */}
          <div className="flex items-baseline gap-2 mb-3">
            <span
              className={cn(
                'text-4xl font-bold',
                status.isRecommendedMet ? 'text-green-600' : 'text-yellow-600'
              )}
            >
              {status.readinessScore}%
            </span>
            {status.isRecommendedMet ? (
              <span className="text-sm text-green-600 font-medium">
                Meets threshold
              </span>
            ) : (
              <span className="text-sm text-yellow-600 font-medium">
                Below threshold
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all rounded-full',
                status.isRecommendedMet ? 'bg-green-500' : 'bg-yellow-500'
              )}
              style={{ width: `${status.readinessScore}%` }}
            />
            {/* Threshold marker */}
            <div
              className="absolute top-0 h-full w-0.5 bg-gray-500"
              style={{ left: `${status.recommendedScore}%` }}
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
                {status.recommendedScore}%
              </div>
            </div>
          </div>

          {/* Below threshold warning */}
          {!status.isRecommendedMet && (
            <p className="mt-4 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              Score is below recommended threshold. Client sign-off required to
              proceed with go-live.
            </p>
          )}
        </div>
      </div>

      {/* Sign-off Section (only shown when gates passed but score below threshold) */}
      {status.allGatesPassed && !status.isRecommendedMet && !status.hasSignoff && (
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileSignature className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900">
              Client Sign-off Required
            </h3>
          </div>

          {!showSignoff ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Since the readiness score is below the recommended threshold,
                client sign-off is required to proceed with go-live.
              </p>
              <button
                onClick={() => setShowSignoff(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Begin Sign-off Process
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                signoffMutation.mutate(signoffData);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Signer Name
                </label>
                <input
                  type="text"
                  value={signoffData.clientSignerName}
                  onChange={(e) =>
                    setSignoffData({
                      ...signoffData,
                      clientSignerName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Smith"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Signer Email
                </label>
                <input
                  type="email"
                  value={signoffData.clientSignerEmail}
                  onChange={(e) =>
                    setSignoffData({
                      ...signoffData,
                      clientSignerEmail: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="john.smith@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Acknowledge Risks
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={signoffData.acknowledgedRisks.includes(
                        'below_threshold'
                      )}
                      onChange={() => handleRiskToggle('below_threshold')}
                      className="mt-0.5 rounded border-gray-300"
                    />
                    <span className="text-gray-700">
                      I acknowledge the readiness score is below the recommended
                      threshold of {status.recommendedScore}%
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={signoffData.acknowledgedRisks.includes(
                        'accept_responsibility'
                      )}
                      onChange={() => handleRiskToggle('accept_responsibility')}
                      className="mt-0.5 rounded border-gray-300"
                    />
                    <span className="text-gray-700">
                      I accept responsibility for any issues arising from
                      launching below the recommended threshold
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sign-off Statement
                </label>
                <textarea
                  value={signoffData.signoffStatement}
                  onChange={(e) =>
                    setSignoffData({
                      ...signoffData,
                      signoffStatement: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="I authorize proceeding with go-live despite the readiness score being below the recommended threshold..."
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={
                    signoffMutation.isPending ||
                    signoffData.acknowledgedRisks.length < 2
                  }
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {signoffMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Submit Sign-off
                </button>
                <button
                  type="button"
                  onClick={() => setShowSignoff(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
              </div>

              {signoffMutation.isError && (
                <p className="text-sm text-red-600">
                  Failed to submit sign-off. Please try again.
                </p>
              )}
            </form>
          )}
        </div>
      )}

      {/* Sign-off Complete Indicator */}
      {status.hasSignoff && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
          <div>
            <div className="font-medium text-green-800">
              Client Sign-off Complete
            </div>
            <div className="text-sm text-green-700">
              Approved to proceed below recommended threshold
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
