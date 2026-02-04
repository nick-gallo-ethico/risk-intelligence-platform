'use client';

/**
 * Employee Context
 *
 * Context for sharing employee profile data across the Employee Portal.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useEmployeeProfile, type EmployeeProfile } from '@/hooks/useEmployeeProfile';

/**
 * Context value type.
 */
export interface EmployeeContextValue {
  profile: EmployeeProfile | null;
  isLoading: boolean;
  refetch: () => void;
}

const EmployeeContext = createContext<EmployeeContextValue>({
  profile: null,
  isLoading: true,
  refetch: () => {},
});

/**
 * Hook to access employee profile context.
 */
export function useEmployee() {
  return useContext(EmployeeContext);
}

/**
 * Provider component for employee context.
 */
export function EmployeeProvider({ children }: { children: ReactNode }) {
  const { profile, isLoading, refetch } = useEmployeeProfile();

  return (
    <EmployeeContext.Provider value={{ profile, isLoading, refetch }}>
      {children}
    </EmployeeContext.Provider>
  );
}
