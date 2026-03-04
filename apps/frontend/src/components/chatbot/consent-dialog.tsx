"use client";

/**
 * ConsentDialog - GDPR-compliant consent dialog for anonymous chatbot users.
 *
 * Displayed before allowing anonymous users to interact with the Employee Chatbot.
 * Explains data handling and privacy practices before consent is captured.
 *
 * @example
 * ```tsx
 * <ConsentDialog
 *   open={consentRequired}
 *   onAccept={acceptConsent}
 *   onDecline={() => navigate('/ethics/report')}
 * />
 * ```
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, MessageCircle, Lock } from "lucide-react";

/**
 * Props for the ConsentDialog component.
 */
export interface ConsentDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when user accepts consent */
  onAccept: () => void;
  /** Callback when user declines consent */
  onDecline: () => void;
  /** Organization name to display (optional) */
  organizationName?: string;
}

/**
 * Consent dialog for anonymous chatbot users.
 *
 * Provides clear information about:
 * - What data is collected
 * - How the chatbot works
 * - Privacy protections in place
 * - User rights and choices
 */
export function ConsentDialog({
  open,
  onAccept,
  onDecline,
  organizationName,
}: ConsentDialogProps) {
  const orgDisplay = organizationName || "your organization";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDecline()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Welcome to the Ethics Assistant
          </DialogTitle>
          <DialogDescription>
            Before we begin, please review how your information will be handled.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-4 py-4">
            {/* Privacy section */}
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">
                  Your Privacy is Protected
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  This conversation is anonymous. We do not collect your name,
                  email, or any identifying information unless you choose to
                  share it.
                </p>
              </div>
            </div>

            {/* Data handling section */}
            <div className="flex gap-3">
              <Lock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">What We Collect</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Your conversation will be saved to help {orgDisplay} improve
                  compliance guidance. Messages may be reviewed by compliance
                  staff but are not linked to your identity.
                </p>
              </div>
            </div>

            {/* AI disclaimer section */}
            <div className="flex gap-3">
              <MessageCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">AI-Powered Assistance</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  This assistant uses AI to provide guidance based on{" "}
                  {orgDisplay}&apos;s policies. While helpful, responses should
                  not be considered legal advice. For complex matters, please
                  contact your compliance team directly.
                </p>
              </div>
            </div>

            {/* Your rights section */}
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">
                By continuing, you acknowledge that your conversation will be
                processed as described above. You may end this conversation at
                any time by closing the chat window.
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onDecline}
            className="w-full sm:w-auto"
          >
            No, thanks
          </Button>
          <Button onClick={onAccept} className="w-full sm:w-auto">
            I understand, start chatting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConsentDialog;
