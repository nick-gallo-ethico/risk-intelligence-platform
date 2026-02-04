'use client';

/**
 * OperatorConsoleLayout - Main Layout Component
 *
 * HubSpot-inspired split-screen layout for hotline operators:
 * - Top bar (h-14): Call controls section
 * - Left panel (w-3/5): Intake form area
 * - Right panel (w-2/5): Context tabs (Script, HRIS, History)
 *
 * This is the container that orchestrates all operator console components.
 */

import { useState } from 'react';
import { CallControls } from './call-controls';
import { ContextTabs } from './context-tabs';
import type { ClientProfile } from '@/types/operator.types';

export interface OperatorConsoleLayoutProps {
  /** Currently loaded client profile (null if no client) */
  clientProfile: ClientProfile | null;
  /** Whether client profile is loading */
  isClientLoading: boolean;
  /** Whether a call is currently active */
  callActive: boolean;
  /** Call duration in seconds */
  callDuration: number;
  /** Called when call ends */
  onCallEnd: () => void;
  /** Called when client is changed (manual selection) */
  onClientChange: (clientId: string) => void;
  /** Called when phone number is entered for lookup */
  onPhoneLookup: (phoneNumber: string) => Promise<ClientProfile | null>;
  /** Optional intake form component to render in left panel */
  intakeFormSlot?: React.ReactNode;
}

export function OperatorConsoleLayout({
  clientProfile,
  isClientLoading,
  callActive,
  callDuration,
  onCallEnd,
  onClientChange,
  onPhoneLookup,
  intakeFormSlot,
}: OperatorConsoleLayoutProps) {
  // Track intake progress for directive stage highlighting
  const [intakeInProgress, setIntakeInProgress] = useState(false);
  const [currentIntakeStage, setCurrentIntakeStage] = useState<
    'opening' | 'intake' | 'closing'
  >('opening');

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar: Call Controls */}
      <CallControls
        clientProfile={clientProfile}
        isClientLoading={isClientLoading}
        callActive={callActive}
        callDuration={callDuration}
        onCallEnd={onCallEnd}
        onPhoneLookup={onPhoneLookup}
      />

      {/* Main Content: Split Screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Intake Form (60%) */}
        <div className="w-3/5 border-r overflow-y-auto p-6">
          {intakeFormSlot ? (
            intakeFormSlot
          ) : (
            <IntakeFormPlaceholder
              clientProfile={clientProfile}
              callActive={callActive}
            />
          )}
        </div>

        {/* Right Panel: Context Tabs (40%) */}
        <div className="w-2/5 overflow-hidden flex flex-col">
          <ContextTabs
            clientProfile={clientProfile}
            currentStage={currentIntakeStage}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Placeholder for intake form - will be replaced by actual IntakeForm component.
 */
function IntakeFormPlaceholder({
  clientProfile,
  callActive,
}: {
  clientProfile: ClientProfile | null;
  callActive: boolean;
}) {
  if (!clientProfile) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">No client loaded</p>
          <p className="text-sm mt-1">
            Enter a phone number above to look up a client
          </p>
        </div>
      </div>
    );
  }

  if (!callActive) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">Ready for call</p>
          <p className="text-sm mt-1">
            Client: {clientProfile.name}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Intake Form - {clientProfile.name}
        </h2>
        <p className="text-muted-foreground">
          Intake form component will be rendered here.
        </p>
      </div>
    </div>
  );
}
