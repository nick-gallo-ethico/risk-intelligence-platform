"use client";

import * as React from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface PiiWarningDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when dialog closes */
  onOpenChange: (open: boolean) => void;
  /** PII warnings detected */
  warnings: string[];
  /** Callback when user acknowledges and proceeds */
  onProceed: (acknowledgedWarnings: string[]) => void;
  /** Callback when user cancels */
  onCancel: () => void;
}

/**
 * PiiWarningDialog - Alert dialog shown when PII detected in investigator message.
 *
 * User must acknowledge each warning before proceeding.
 * This protects anonymous reporters from accidental identity disclosure.
 */
export function PiiWarningDialog({
  open,
  onOpenChange,
  warnings,
  onProceed,
  onCancel,
}: PiiWarningDialogProps) {
  const [acknowledged, setAcknowledged] = React.useState<Set<string>>(
    new Set(),
  );

  // Reset acknowledgments when dialog opens
  React.useEffect(() => {
    if (open) {
      setAcknowledged(new Set());
    }
  }, [open]);

  const allAcknowledged =
    warnings.length > 0 && acknowledged.size === warnings.length;

  const handleToggle = (warning: string) => {
    setAcknowledged((prev) => {
      const next = new Set(prev);
      if (next.has(warning)) {
        next.delete(warning);
      } else {
        next.add(warning);
      }
      return next;
    });
  };

  const handleProceed = () => {
    if (allAcknowledged) {
      onProceed(Array.from(acknowledged));
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
            <ShieldAlert className="h-5 w-5" />
            Potential Identity Disclosure
          </AlertDialogTitle>
          <AlertDialogDescription>
            Your message may contain information that could identify you or the
            reporter. Please review the following warnings carefully.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {warnings.map((warning, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
            >
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {warning}
                </p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`ack-${index}`}
                    checked={acknowledged.has(warning)}
                    onCheckedChange={() => handleToggle(warning)}
                  />
                  <Label
                    htmlFor={`ack-${index}`}
                    className="text-sm font-medium text-amber-900 dark:text-amber-100 cursor-pointer"
                  >
                    I understand this risk
                  </Label>
                </div>
              </div>
            </div>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Edit Message</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleProceed}
            disabled={!allAcknowledged}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Send Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
