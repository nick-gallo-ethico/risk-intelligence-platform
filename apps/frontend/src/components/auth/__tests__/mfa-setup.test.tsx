import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/mocks/server";
import { MfaSetup } from "../mfa-setup";

/**
 * MFA Setup Component Tests
 *
 * Tests for multi-factor authentication setup flow.
 * Covers QR code display, manual entry, code verification, and recovery codes.
 */

const API_BASE = "*/api/v1";

// Mock MFA setup response
const mockMfaSetupResponse = {
  secret: "JBSWY3DPEHPK3PXP",
  qrCode: "data:image/png;base64,mockQrCodeData",
  manualEntryKey: "JBSW Y3DP EHPK 3PXP",
};

// Mock MFA verify response with recovery codes
const mockMfaVerifyResponse = {
  success: true,
  recoveryCodes: [
    "abc123-def456",
    "ghi789-jkl012",
    "mno345-pqr678",
    "stu901-vwx234",
    "yza567-bcd890",
    "efg123-hij456",
    "klm789-nop012",
    "qrs345-tuv678",
  ],
};

// Query client for React Query
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

const renderMfaSetup = (props = {}) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MfaSetup {...props} />
    </QueryClientProvider>,
  );
};

describe("MfaSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default handlers
    server.use(
      http.post(`${API_BASE}/auth/mfa/setup`, () => {
        return HttpResponse.json(mockMfaSetupResponse);
      }),
      http.post(`${API_BASE}/auth/mfa/verify`, () => {
        return HttpResponse.json(mockMfaVerifyResponse);
      }),
    );
  });

  describe("Initial State", () => {
    it("should render setup prompt initially", () => {
      renderMfaSetup();

      expect(
        screen.getByText(/set up two-factor authentication/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/add an extra layer of security/i),
      ).toBeInTheDocument();
    });

    it("should show authenticator app instructions", () => {
      renderMfaSetup();

      expect(
        screen.getByText(/you will need an authenticator app/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/google authenticator|authy/i),
      ).toBeInTheDocument();
    });

    it("should render continue setup button", () => {
      renderMfaSetup();

      expect(
        screen.getByRole("button", { name: /continue setup/i }),
      ).toBeInTheDocument();
    });

    it("should render cancel button when onCancel provided", () => {
      const onCancel = vi.fn();
      renderMfaSetup({ onCancel });

      expect(
        screen.getByRole("button", { name: /cancel/i }),
      ).toBeInTheDocument();
    });
  });

  describe("QR Code Display", () => {
    it("should render QR code for TOTP setup after continuing", async () => {
      const user = userEvent.setup();
      renderMfaSetup();

      const continueButton = screen.getByRole("button", {
        name: /continue setup/i,
      });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByTestId("mfa-qr-code")).toBeInTheDocument();
      });
    });

    it("should display QR code image", async () => {
      const user = userEvent.setup();
      renderMfaSetup();

      await user.click(screen.getByRole("button", { name: /continue setup/i }));

      await waitFor(() => {
        const qrImage = screen.getByAltText(/mfa qr code/i);
        expect(qrImage).toBeInTheDocument();
        expect(qrImage).toHaveAttribute(
          "src",
          expect.stringContaining("data:image/png"),
        );
      });
    });

    it("should show manual entry code option", async () => {
      const user = userEvent.setup();
      renderMfaSetup();

      await user.click(screen.getByRole("button", { name: /continue setup/i }));

      await waitFor(() => {
        expect(screen.getByTestId("manual-entry-section")).toBeInTheDocument();
        expect(
          screen.getByText(/enter this code manually/i),
        ).toBeInTheDocument();
      });
    });

    it("should display manual entry key", async () => {
      const user = userEvent.setup();
      renderMfaSetup();

      await user.click(screen.getByRole("button", { name: /continue setup/i }));

      await waitFor(() => {
        const manualCode = screen.getByTestId("manual-entry-code");
        expect(manualCode).toHaveTextContent(
          mockMfaSetupResponse.manualEntryKey,
        );
      });
    });
  });

  describe("Code Verification", () => {
    it("should validate 6-digit TOTP code format", async () => {
      const user = userEvent.setup();
      renderMfaSetup();

      await user.click(screen.getByRole("button", { name: /continue setup/i }));
      await waitFor(() => {
        expect(screen.getByTestId("mfa-qr-code")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /continue/i }));

      // Find verification code input
      const codeInput = screen.getByTestId("verification-code-input");
      expect(codeInput).toBeInTheDocument();

      // Try to submit with less than 6 digits
      await user.type(codeInput, "123");
      const verifyButton = screen.getByTestId("verify-code-button");
      expect(verifyButton).toBeDisabled();
    });

    it("should only accept numeric input", async () => {
      const user = userEvent.setup();
      renderMfaSetup();

      await user.click(screen.getByRole("button", { name: /continue setup/i }));
      await waitFor(() => {
        expect(screen.getByTestId("mfa-qr-code")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /continue/i }));

      const codeInput = screen.getByTestId("verification-code-input");
      await user.type(codeInput, "abc123def456");

      // Should only have numbers
      expect(codeInput).toHaveValue("123456");
    });

    it("should show error on invalid code", async () => {
      server.use(
        http.post(`${API_BASE}/auth/mfa/verify`, () => {
          return new HttpResponse(null, { status: 400 });
        }),
      );

      const user = userEvent.setup();
      renderMfaSetup();

      await user.click(screen.getByRole("button", { name: /continue setup/i }));
      await waitFor(() => {
        expect(screen.getByTestId("mfa-qr-code")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /continue/i }));

      const codeInput = screen.getByTestId("verification-code-input");
      await user.type(codeInput, "123456");

      const verifyButton = screen.getByTestId("verify-code-button");
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByTestId("code-error")).toHaveTextContent(
          /invalid verification code/i,
        );
      });
    });

    it("should enable verify button only with 6 digits", async () => {
      const user = userEvent.setup();
      renderMfaSetup();

      await user.click(screen.getByRole("button", { name: /continue setup/i }));
      await waitFor(() => {
        expect(screen.getByTestId("mfa-qr-code")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /continue/i }));

      const codeInput = screen.getByTestId("verification-code-input");
      const verifyButton = screen.getByTestId("verify-code-button");

      // Initially disabled
      expect(verifyButton).toBeDisabled();

      // With 5 digits - still disabled
      await user.type(codeInput, "12345");
      expect(verifyButton).toBeDisabled();

      // With 6 digits - enabled
      await user.type(codeInput, "6");
      expect(verifyButton).not.toBeDisabled();
    });
  });

  describe("Recovery Codes", () => {
    it("should show recovery codes after successful setup", async () => {
      const user = userEvent.setup();
      renderMfaSetup();

      // Start setup
      await user.click(screen.getByRole("button", { name: /continue setup/i }));
      await waitFor(() => {
        expect(screen.getByTestId("mfa-qr-code")).toBeInTheDocument();
      });

      // Continue to verification
      await user.click(screen.getByRole("button", { name: /continue/i }));

      // Enter valid code
      const codeInput = screen.getByTestId("verification-code-input");
      await user.type(codeInput, "123456");
      await user.click(screen.getByTestId("verify-code-button"));

      // Should show recovery codes
      await waitFor(() => {
        expect(screen.getByTestId("recovery-codes")).toBeInTheDocument();
        expect(
          screen.getByText(/mfa enabled successfully/i),
        ).toBeInTheDocument();
      });
    });

    it("should display all recovery codes", async () => {
      const user = userEvent.setup();
      renderMfaSetup();

      await user.click(screen.getByRole("button", { name: /continue setup/i }));
      await waitFor(() => {
        expect(screen.getByTestId("mfa-qr-code")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /continue/i }));
      await user.type(screen.getByTestId("verification-code-input"), "123456");
      await user.click(screen.getByTestId("verify-code-button"));

      await waitFor(() => {
        const codesContainer = screen.getByTestId("recovery-codes");
        mockMfaVerifyResponse.recoveryCodes.forEach((code) => {
          expect(codesContainer).toHaveTextContent(code);
        });
      });
    });

    it("should allow copying recovery codes", async () => {
      const user = userEvent.setup();
      renderMfaSetup();

      await user.click(screen.getByRole("button", { name: /continue setup/i }));
      await waitFor(() => {
        expect(screen.getByTestId("mfa-qr-code")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /continue/i }));
      await user.type(screen.getByTestId("verification-code-input"), "123456");
      await user.click(screen.getByTestId("verify-code-button"));

      await waitFor(() => {
        expect(screen.getByTestId("copy-codes-button")).toBeInTheDocument();
      });

      // The copy button should be clickable
      const copyButton = screen.getByTestId("copy-codes-button");
      expect(copyButton).toBeEnabled();
      expect(copyButton).toHaveTextContent(/copy codes/i);
    });

    it("should allow downloading recovery codes", async () => {
      const user = userEvent.setup();
      renderMfaSetup();

      await user.click(screen.getByRole("button", { name: /continue setup/i }));
      await waitFor(() => {
        expect(screen.getByTestId("mfa-qr-code")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /continue/i }));
      await user.type(screen.getByTestId("verification-code-input"), "123456");
      await user.click(screen.getByTestId("verify-code-button"));

      await waitFor(() => {
        expect(screen.getByTestId("download-codes-button")).toBeInTheDocument();
      });

      // Download button should be present and clickable
      const downloadButton = screen.getByTestId("download-codes-button");
      expect(downloadButton).toBeEnabled();
    });
  });

  describe("Setup Completion", () => {
    it("should confirm MFA setup completion", async () => {
      const user = userEvent.setup();
      renderMfaSetup();

      await user.click(screen.getByRole("button", { name: /continue setup/i }));
      await waitFor(() => {
        expect(screen.getByTestId("mfa-qr-code")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /continue/i }));
      await user.type(screen.getByTestId("verification-code-input"), "123456");
      await user.click(screen.getByTestId("verify-code-button"));

      await waitFor(() => {
        expect(
          screen.getByText(/mfa enabled successfully/i),
        ).toBeInTheDocument();
      });
    });

    it("should call onComplete callback when done", async () => {
      const onComplete = vi.fn();
      const user = userEvent.setup();
      renderMfaSetup({ onComplete });

      await user.click(screen.getByRole("button", { name: /continue setup/i }));
      await waitFor(() => {
        expect(screen.getByTestId("mfa-qr-code")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /continue/i }));
      await user.type(screen.getByTestId("verification-code-input"), "123456");
      await user.click(screen.getByTestId("verify-code-button"));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /done/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /done/i }));

      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle setup initialization error", async () => {
      server.use(
        http.post(`${API_BASE}/auth/mfa/setup`, () => {
          return new HttpResponse(null, { status: 500 });
        }),
      );

      const user = userEvent.setup();
      renderMfaSetup();

      await user.click(screen.getByRole("button", { name: /continue setup/i }));

      // Should stay on initial screen after error
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /continue setup/i }),
        ).toBeInTheDocument();
      });
    });
  });
});
