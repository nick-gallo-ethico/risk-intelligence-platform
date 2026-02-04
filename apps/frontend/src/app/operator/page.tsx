'use client';

/**
 * Operator Console Main Page
 *
 * Entry point for the Operator Console.
 * Manages call state and renders the OperatorConsoleLayout.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { OperatorConsoleLayout } from '@/components/operator/operator-console-layout';
import { useClientProfile } from '@/hooks/useClientProfile';
import type { ClientProfile } from '@/types/operator.types';

export default function OperatorConsolePage() {
  // Client profile from phone lookup
  const {
    clientProfile,
    isLoading: isClientLoading,
    lookupByPhone,
    loadClient,
    clearClient,
  } = useClientProfile();

  // Call state
  const [callActive, setCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Start/stop call timer
  useEffect(() => {
    if (callActive) {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callActive]);

  // Handle phone number lookup (called from call controls)
  const handlePhoneLookup = useCallback(
    async (phoneNumber: string) => {
      // Simulate call starting when phone is looked up
      const profile = await lookupByPhone(phoneNumber);
      if (profile) {
        setCallActive(true);
        setCallDuration(0);
      }
      return profile;
    },
    [lookupByPhone]
  );

  // Handle ending the call
  const handleCallEnd = useCallback(() => {
    setCallActive(false);
    setCallDuration(0);
    clearClient();
  }, [clearClient]);

  // Handle client change (manual selection from list)
  const handleClientChange = useCallback(
    async (clientId: string) => {
      await loadClient(clientId);
      // Start call when client is manually selected
      setCallActive(true);
      setCallDuration(0);
    },
    [loadClient]
  );

  return (
    <OperatorConsoleLayout
      clientProfile={clientProfile}
      isClientLoading={isClientLoading}
      callActive={callActive}
      callDuration={callDuration}
      onCallEnd={handleCallEnd}
      onClientChange={handleClientChange}
      onPhoneLookup={handlePhoneLookup}
    />
  );
}
