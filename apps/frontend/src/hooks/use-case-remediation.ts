import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRemediationPlansByCase,
  getRemediationPlan,
  createRemediationPlan,
  updateRemediationPlan,
  activateRemediationPlan,
  reorderRemediationSteps,
  completeRemediationStep,
  skipRemediationStep,
  createRemediationStep,
} from '@/lib/remediation-api';
import type {
  RemediationPlan,
  CreateRemediationPlanInput,
  UpdateRemediationPlanInput,
  StepReorderInput,
  CompleteStepInput,
  CreateRemediationStepInput,
} from '@/types/remediation';

const REMEDIATION_PLANS_KEY = 'remediation-plans';
const REMEDIATION_PLAN_KEY = 'remediation-plan';

/**
 * Hook for fetching remediation plans for a case.
 */
export function useCaseRemediation(caseId: string | undefined) {
  return useQuery({
    queryKey: [REMEDIATION_PLANS_KEY, 'by-case', caseId],
    queryFn: () => getRemediationPlansByCase(caseId!),
    enabled: !!caseId,
  });
}

/**
 * Hook for fetching a single remediation plan.
 */
export function useRemediationPlan(planId: string | undefined) {
  return useQuery({
    queryKey: [REMEDIATION_PLAN_KEY, planId],
    queryFn: () => getRemediationPlan(planId!),
    enabled: !!planId,
  });
}

/**
 * Hook for creating a new remediation plan.
 */
export function useCreateRemediationPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRemediationPlanInput) => createRemediationPlan(input),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({
        queryKey: [REMEDIATION_PLANS_KEY, 'by-case', plan.caseId],
      });
    },
  });
}

/**
 * Hook for updating a remediation plan.
 */
export function useUpdateRemediationPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      input,
    }: {
      planId: string;
      input: UpdateRemediationPlanInput;
    }) => updateRemediationPlan(planId, input),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({
        queryKey: [REMEDIATION_PLANS_KEY, 'by-case', plan.caseId],
      });
      queryClient.invalidateQueries({
        queryKey: [REMEDIATION_PLAN_KEY, plan.id],
      });
    },
  });
}

/**
 * Hook for activating a remediation plan.
 */
export function useActivateRemediationPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => activateRemediationPlan(planId),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({
        queryKey: [REMEDIATION_PLANS_KEY, 'by-case', plan.caseId],
      });
      queryClient.invalidateQueries({
        queryKey: [REMEDIATION_PLAN_KEY, plan.id],
      });
    },
  });
}

/**
 * Hook for reordering steps within a plan.
 */
export function useReorderSteps(planId: string | undefined, caseId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stepOrders: StepReorderInput[]) => {
      if (!planId) throw new Error('Plan ID is required');
      return reorderRemediationSteps(planId, stepOrders);
    },
    onSuccess: () => {
      if (caseId) {
        queryClient.invalidateQueries({
          queryKey: [REMEDIATION_PLANS_KEY, 'by-case', caseId],
        });
      }
      if (planId) {
        queryClient.invalidateQueries({
          queryKey: [REMEDIATION_PLAN_KEY, planId],
        });
      }
    },
  });
}

/**
 * Hook for completing a remediation step.
 */
export function useCompleteStep(caseId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      stepId,
      input,
    }: {
      stepId: string;
      input?: CompleteStepInput;
    }) => completeRemediationStep(stepId, input),
    onSuccess: () => {
      if (caseId) {
        queryClient.invalidateQueries({
          queryKey: [REMEDIATION_PLANS_KEY, 'by-case', caseId],
        });
      }
    },
  });
}

/**
 * Hook for skipping a remediation step.
 */
export function useSkipStep(caseId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stepId, reason }: { stepId: string; reason: string }) =>
      skipRemediationStep(stepId, reason),
    onSuccess: () => {
      if (caseId) {
        queryClient.invalidateQueries({
          queryKey: [REMEDIATION_PLANS_KEY, 'by-case', caseId],
        });
      }
    },
  });
}

/**
 * Hook for creating a new remediation step.
 */
export function useCreateRemediationStep(caseId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRemediationStepInput) => createRemediationStep(input),
    onSuccess: () => {
      if (caseId) {
        queryClient.invalidateQueries({
          queryKey: [REMEDIATION_PLANS_KEY, 'by-case', caseId],
        });
      }
    },
  });
}
