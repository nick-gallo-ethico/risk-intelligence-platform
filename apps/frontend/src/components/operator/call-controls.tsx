'use client';

/**
 * CallControls - Top Bar Component
 *
 * Call management controls for the Operator Console:
 * - Left: Client name badge, hotline number badge
 * - Center: Phone number input for manual lookup
 * - Right (when call active): Timer, Mute, Hold, Transfer, End Call
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CallTimer } from './call-timer';
import {
  MicOff,
  Mic,
  Pause,
  Play,
  ArrowRightLeft,
  Phone,
  PhoneOff,
  Search,
  Loader2,
} from 'lucide-react';
import type { ClientProfile } from '@/types/operator.types';

export interface CallControlsProps {
  /** Currently loaded client profile */
  clientProfile: ClientProfile | null;
  /** Whether client profile is loading */
  isClientLoading: boolean;
  /** Whether a call is currently active */
  callActive: boolean;
  /** Call duration in seconds */
  callDuration: number;
  /** Called when call ends */
  onCallEnd: () => void;
  /** Called when phone number is entered for lookup */
  onPhoneLookup: (phoneNumber: string) => Promise<ClientProfile | null>;
}

export function CallControls({
  clientProfile,
  isClientLoading,
  callActive,
  callDuration,
  onCallEnd,
  onPhoneLookup,
}: CallControlsProps) {
  const [phoneInput, setPhoneInput] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Handle phone lookup
  const handleLookup = useCallback(async () => {
    if (!phoneInput.trim()) return;

    setIsLookingUp(true);
    setLookupError(null);

    try {
      const profile = await onPhoneLookup(phoneInput.trim());
      if (!profile) {
        setLookupError('No client found for this number');
      }
    } catch (error) {
      setLookupError('Failed to look up phone number');
    } finally {
      setIsLookingUp(false);
    }
  }, [phoneInput, onPhoneLookup]);

  // Handle phone input key press
  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLookup();
    }
  };

  // Get the primary hotline number for display
  const primaryHotline = clientProfile?.hotlineNumbers?.find((h) => h.isActive);

  return (
    <div className="h-14 border-b bg-muted/50 flex items-center justify-between px-4">
      {/* Left Section: Client Info */}
      <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
        {clientProfile ? (
          <>
            <span className="font-medium text-sm truncate max-w-[200px]">
              {clientProfile.name}
            </span>
            {primaryHotline && (
              <Badge variant="outline" className="text-xs font-mono">
                {primaryHotline.displayName || primaryHotline.phoneNumber}
              </Badge>
            )}
          </>
        ) : (
          <span className="text-muted-foreground text-sm">
            No client loaded
          </span>
        )}
      </div>

      {/* Center Section: Phone Lookup */}
      <div className="flex items-center gap-2 flex-1 max-w-md mx-4">
        <div className="relative flex-1">
          <Input
            type="tel"
            placeholder="Enter phone number to look up..."
            value={phoneInput}
            onChange={(e) => {
              setPhoneInput(e.target.value);
              setLookupError(null);
            }}
            onKeyDown={handlePhoneKeyDown}
            className="pr-10 font-mono"
            disabled={isLookingUp || callActive}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full"
            onClick={handleLookup}
            disabled={isLookingUp || !phoneInput.trim() || callActive}
          >
            {isLookingUp || isClientLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        {lookupError && (
          <span className="text-destructive text-xs whitespace-nowrap">
            {lookupError}
          </span>
        )}
      </div>

      {/* Right Section: Call Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {callActive ? (
          <>
            {/* Call Timer */}
            <CallTimer duration={callDuration} isActive={!isOnHold} />

            {/* Mute Button */}
            <Button
              variant={isMuted ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <MicOff className="h-4 w-4 text-destructive" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>

            {/* Hold Button */}
            <Button
              variant={isOnHold ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setIsOnHold(!isOnHold)}
              title={isOnHold ? 'Resume' : 'Hold'}
            >
              {isOnHold ? (
                <Play className="h-4 w-4 text-primary" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>

            {/* Transfer Button */}
            <Button
              variant="ghost"
              size="icon"
              title="Transfer Call"
              onClick={() => {
                // TODO: Implement transfer modal
                console.log('Transfer clicked');
              }}
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>

            {/* End Call Button */}
            <Button
              variant="destructive"
              size="sm"
              onClick={onCallEnd}
              className="gap-1.5"
            >
              <PhoneOff className="h-4 w-4" />
              End Call
            </Button>
          </>
        ) : (
          // When no call is active, show placeholder or start call button
          clientProfile && (
            <Badge variant="outline" className="text-muted-foreground">
              Ready
            </Badge>
          )
        )}
      </div>
    </div>
  );
}
