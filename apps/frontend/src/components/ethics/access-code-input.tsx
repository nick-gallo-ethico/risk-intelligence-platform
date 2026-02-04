'use client';

import * as React from 'react';
import { useCallback, useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface AccessCodeInputProps {
  /** Called when all segments are filled with the complete code */
  onComplete: (code: string) => void;
  /** Disable input (e.g., during loading or lockout) */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Optional class name for the container */
  className?: string;
}

/** Number of segments (3 segments of 4 characters each = 12 total) */
const SEGMENT_COUNT = 3;
/** Characters per segment */
const CHARS_PER_SEGMENT = 4;
/** Total code length */
const CODE_LENGTH = SEGMENT_COUNT * CHARS_PER_SEGMENT;

/**
 * Segmented access code input component for the Ethics Portal.
 *
 * Features:
 * - Three segments of 4 characters each (total 12)
 * - Auto-advance to next segment on fill
 * - Backspace moves to previous segment
 * - Uppercase only, alphanumeric
 * - Paste support (handles full code paste)
 * - Mobile-friendly with large touch targets
 * - Error state with shake animation
 */
export function AccessCodeInput({
  onComplete,
  disabled = false,
  error,
  className,
}: AccessCodeInputProps) {
  // Store each segment's value
  const [segments, setSegments] = useState<string[]>(
    Array(SEGMENT_COUNT).fill('')
  );
  // Track if shake animation should play
  const [shake, setShake] = useState(false);
  // Refs for each input
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Trigger shake on error change
  useEffect(() => {
    if (error) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Normalize input to uppercase alphanumeric only
  const normalizeInput = useCallback((value: string): string => {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }, []);

  // Check if code is complete and call onComplete
  const checkComplete = useCallback(
    (newSegments: string[]) => {
      const fullCode = newSegments.join('');
      if (fullCode.length === CODE_LENGTH) {
        onComplete(fullCode);
      }
    },
    [onComplete]
  );

  // Handle input change for a segment
  const handleChange = useCallback(
    (index: number, value: string) => {
      const normalized = normalizeInput(value);
      const newSegments = [...segments];

      // If pasting a full code, distribute across segments
      if (normalized.length >= CODE_LENGTH) {
        const fullCode = normalized.slice(0, CODE_LENGTH);
        for (let i = 0; i < SEGMENT_COUNT; i++) {
          newSegments[i] = fullCode.slice(
            i * CHARS_PER_SEGMENT,
            (i + 1) * CHARS_PER_SEGMENT
          );
        }
        setSegments(newSegments);
        // Focus last segment
        inputRefs.current[SEGMENT_COUNT - 1]?.focus();
        checkComplete(newSegments);
        return;
      }

      // Normal input - take only up to CHARS_PER_SEGMENT characters
      const segmentValue = normalized.slice(0, CHARS_PER_SEGMENT);
      newSegments[index] = segmentValue;
      setSegments(newSegments);

      // Auto-advance to next segment if filled
      if (segmentValue.length === CHARS_PER_SEGMENT && index < SEGMENT_COUNT - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      checkComplete(newSegments);
    },
    [segments, normalizeInput, checkComplete]
  );

  // Handle key down for backspace navigation
  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && segments[index] === '' && index > 0) {
        // Move to previous segment when backspacing from empty segment
        inputRefs.current[index - 1]?.focus();
        // Clear the previous segment's last character
        const newSegments = [...segments];
        newSegments[index - 1] = newSegments[index - 1].slice(0, -1);
        setSegments(newSegments);
        e.preventDefault();
      }
    },
    [segments]
  );

  // Handle paste event
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pastedText = e.clipboardData.getData('text');
      const normalized = normalizeInput(pastedText);

      if (normalized.length > 0) {
        e.preventDefault();
        const newSegments = [...segments];

        // Distribute pasted content across segments
        const fullCode = normalized.slice(0, CODE_LENGTH);
        for (let i = 0; i < SEGMENT_COUNT; i++) {
          newSegments[i] = fullCode.slice(
            i * CHARS_PER_SEGMENT,
            (i + 1) * CHARS_PER_SEGMENT
          );
        }

        setSegments(newSegments);

        // Focus appropriate input
        const filledSegments = newSegments.filter((s) => s.length === CHARS_PER_SEGMENT).length;
        const focusIndex = Math.min(filledSegments, SEGMENT_COUNT - 1);
        inputRefs.current[focusIndex]?.focus();

        checkComplete(newSegments);
      }
    },
    [segments, normalizeInput, checkComplete]
  );

  // Clear all segments
  const clearAll = useCallback(() => {
    setSegments(Array(SEGMENT_COUNT).fill(''));
    inputRefs.current[0]?.focus();
  }, []);

  // Note: To expose clearAll to parent, this component would need to use forwardRef.
  // For now, the clear functionality is internal only.

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div
        className={cn(
          'flex items-center gap-2 sm:gap-3',
          shake && 'animate-shake'
        )}
      >
        {segments.map((segment, index) => (
          <React.Fragment key={index}>
            <input
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={CHARS_PER_SEGMENT}
              value={segment}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={disabled}
              className={cn(
                // Base styles
                'w-20 sm:w-24 h-14 sm:h-16 text-center text-xl sm:text-2xl font-mono',
                'rounded-lg border-2 bg-background',
                'transition-all duration-200',
                // Focus styles
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                // Normal state
                !error && !disabled && 'border-input focus:border-primary focus:ring-primary/20',
                // Error state
                error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
                // Disabled state
                disabled && 'cursor-not-allowed opacity-50 bg-muted'
              )}
              aria-label={`Access code segment ${index + 1} of ${SEGMENT_COUNT}`}
              aria-invalid={!!error}
            />
            {/* Separator between segments */}
            {index < SEGMENT_COUNT - 1 && (
              <span className="text-muted-foreground text-xl font-bold">-</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive mt-1 text-center" role="alert">
          {error}
        </p>
      )}

      {/* Visual hint */}
      <p className="text-xs text-muted-foreground text-center mt-1">
        {CODE_LENGTH} characters (letters and numbers)
      </p>

      {/* Add shake animation keyframes via inline style */}
      <style jsx global>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-4px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(4px);
          }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
