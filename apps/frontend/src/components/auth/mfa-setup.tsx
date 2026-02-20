"use client";

/**
 * MFA Setup Component
 *
 * Multi-factor authentication setup flow with TOTP (authenticator app).
 * Shows QR code for scanning, manual entry option, and recovery codes.
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Loader2,
  Shield,
  Copy,
  Check,
  Smartphone,
  Key,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";

interface MfaSetupResponse {
  secret: string;
  qrCode: string;
  manualEntryKey: string;
}

interface MfaVerifyResponse {
  success: boolean;
  recoveryCodes: string[];
}

interface MfaSetupProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function MfaSetup({ onComplete, onCancel }: MfaSetupProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"setup" | "verify" | "recovery">("setup");
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Initialize MFA setup (get QR code and secret)
  const setupMutation = useMutation({
    mutationFn: async () => {
      const response =
        await apiClient.post<MfaSetupResponse>("/auth/mfa/setup");
      return response;
    },
    onSuccess: (data) => {
      setSetupData(data);
      setStep("setup");
    },
    onError: () => {
      toast.error("Failed to initialize MFA setup. Please try again.");
    },
  });

  // Verify TOTP code and enable MFA
  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiClient.post<MfaVerifyResponse>(
        "/auth/mfa/verify",
        {
          code,
        },
      );
      return response;
    },
    onSuccess: (data) => {
      setRecoveryCodes(data.recoveryCodes);
      setStep("recovery");
      queryClient.invalidateQueries({ queryKey: ["user", "me"] });
    },
    onError: () => {
      setCodeError("Invalid verification code. Please try again.");
    },
  });

  // Start setup on mount or when clicking retry
  const handleStartSetup = () => {
    setupMutation.mutate();
  };

  // Handle code input change
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setVerificationCode(value);
    setCodeError(null);
  };

  // Handle verify submission
  const handleVerify = () => {
    if (verificationCode.length !== 6) {
      setCodeError("Please enter a 6-digit code");
      return;
    }
    verifyMutation.mutate(verificationCode);
  };

  // Copy recovery codes to clipboard
  const handleCopyRecoveryCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setCopied(true);
      toast.success("Recovery codes copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy codes");
    }
  };

  // Download recovery codes as text file
  const handleDownloadRecoveryCodes = () => {
    const content = `MFA Recovery Codes - Risk Intelligence Platform
Generated: ${new Date().toISOString()}

${recoveryCodes.join("\n")}

Keep these codes in a safe place. Each code can only be used once.
`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mfa-recovery-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Recovery codes downloaded");
  };

  // Complete setup
  const handleComplete = () => {
    onComplete?.();
  };

  // Initial state - prompt to start setup
  if (!setupData && step === "setup") {
    return (
      <Card data-testid="mfa-setup">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Set Up Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account using an
            authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
            <Smartphone className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">You will need an authenticator app</p>
              <p className="text-sm text-muted-foreground">
                Download Google Authenticator, Authy, or similar app on your
                mobile device
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleStartSetup}
              disabled={setupMutation.isPending}
              data-testid="start-mfa-setup"
            >
              {setupMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Continue Setup
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Setup step - show QR code
  if (step === "setup" && setupData) {
    return (
      <Card data-testid="mfa-setup">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Scan QR Code
          </CardTitle>
          <CardDescription>
            Open your authenticator app and scan this QR code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR Code */}
          <div className="flex justify-center">
            <div
              className="p-4 bg-background rounded-lg border"
              data-testid="mfa-qr-code"
            >
              <img
                src={setupData.qrCode}
                alt="MFA QR Code"
                className="w-48 h-48"
              />
            </div>
          </div>

          {/* Manual entry option */}
          <div className="space-y-2" data-testid="manual-entry-section">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Key className="h-4 w-4" />
              <span>Or enter this code manually:</span>
            </div>
            <code
              className="block p-3 bg-muted rounded-md text-center font-mono text-lg tracking-wider"
              data-testid="manual-entry-code"
            >
              {setupData.manualEntryKey}
            </code>
          </div>

          <Button onClick={() => setStep("verify")} className="w-full">
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Verify step - enter code from app
  if (step === "verify") {
    return (
      <Card data-testid="mfa-setup">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Verify Setup
          </CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verification-code">Verification Code</Label>
            <Input
              id="verification-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={verificationCode}
              onChange={handleCodeChange}
              placeholder="000000"
              className="text-center text-2xl tracking-widest font-mono"
              data-testid="verification-code-input"
            />
            {codeError && (
              <p className="text-sm text-destructive" data-testid="code-error">
                {codeError}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("setup")}>
              Back
            </Button>
            <Button
              onClick={handleVerify}
              disabled={
                verificationCode.length !== 6 || verifyMutation.isPending
              }
              className="flex-1"
              data-testid="verify-code-button"
            >
              {verifyMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Verify
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Recovery codes step
  if (step === "recovery") {
    return (
      <Card data-testid="mfa-setup">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            MFA Enabled Successfully
          </CardTitle>
          <CardDescription>
            Save your recovery codes in a secure location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
              Important: Save these recovery codes
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              If you lose access to your authenticator app, you can use these
              codes to sign in. Each code can only be used once.
            </p>
          </div>

          <div
            className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm"
            data-testid="recovery-codes"
          >
            {recoveryCodes.map((code, index) => (
              <div key={index} className="p-2 bg-background rounded border">
                {code}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCopyRecoveryCodes}
              className="flex-1"
              data-testid="copy-codes-button"
            >
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy Codes"}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadRecoveryCodes}
              className="flex-1"
              data-testid="download-codes-button"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>

          <Button onClick={handleComplete} className="w-full">
            Done
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}

export default MfaSetup;
