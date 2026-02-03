import { Injectable, Logger } from "@nestjs/common";
import * as dns from "dns";
import * as crypto from "crypto";

/**
 * Service for verifying domain ownership via DNS TXT records.
 *
 * Domain verification is CRITICAL for SSO security:
 * - Without verification, anyone could claim a domain
 * - Attackers could intercept users via JIT provisioning
 * - Verification proves the requester controls the domain's DNS
 */
@Injectable()
export class DomainVerificationService {
  private readonly logger = new Logger(DomainVerificationService.name);

  /**
   * DNS TXT record prefix for verification
   * Format: _ethico-verify.domain.com TXT "ethico-verify=TOKEN"
   */
  private readonly DNS_PREFIX = "_ethico-verify";
  private readonly TXT_PREFIX = "ethico-verify=";

  /**
   * Generate a cryptographically secure verification token.
   * Token is 32 bytes (64 hex characters) for sufficient entropy.
   */
  generateVerificationToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Get the DNS TXT record name for a domain.
   * @param domain - The domain to verify (e.g., "acme.com")
   * @returns The full TXT record name (e.g., "_ethico-verify.acme.com")
   */
  getTxtRecordName(domain: string): string {
    return `${this.DNS_PREFIX}.${domain}`;
  }

  /**
   * Get the expected TXT record value for a token.
   * @param token - The verification token
   * @returns The expected TXT value (e.g., "ethico-verify=abc123...")
   */
  getExpectedTxtValue(token: string): string {
    return `${this.TXT_PREFIX}${token}`;
  }

  /**
   * Verify domain ownership via DNS TXT record lookup.
   *
   * @param domain - The domain to verify
   * @param expectedToken - The verification token to look for
   * @returns true if valid TXT record found, false otherwise
   */
  async verifyDnsTxtRecord(
    domain: string,
    expectedToken: string,
  ): Promise<boolean> {
    const recordName = this.getTxtRecordName(domain);
    const expectedValue = this.getExpectedTxtValue(expectedToken);

    try {
      // Set timeout for DNS lookup (5 seconds)
      const resolver = new dns.Resolver();
      resolver.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]); // Use public DNS

      const records = await dns.promises.resolveTxt(recordName);

      // DNS TXT records are arrays of strings (can be chunked)
      // Flatten and check each record
      for (const record of records) {
        const value = record.join(""); // Join chunked values
        if (value === expectedValue) {
          this.logger.log(`Domain ${domain} verified successfully`);
          return true;
        }
      }

      this.logger.warn(
        `Domain ${domain} verification failed: token not found in TXT records`,
      );
      return false;
    } catch (error) {
      const dnsError = error as NodeJS.ErrnoException;
      if (dnsError.code === "ENOTFOUND" || dnsError.code === "ENODATA") {
        this.logger.warn(
          `Domain ${domain} verification failed: TXT record not found`,
        );
        return false;
      }

      this.logger.error(
        `Domain ${domain} verification error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return false;
    }
  }

  /**
   * Get instructions for domain verification.
   * Returns user-friendly instructions for adding the DNS TXT record.
   */
  getVerificationInstructions(
    domain: string,
    token: string,
  ): {
    recordType: string;
    recordName: string;
    recordValue: string;
    instructions: string;
  } {
    return {
      recordType: "TXT",
      recordName: this.getTxtRecordName(domain),
      recordValue: this.getExpectedTxtValue(token),
      instructions:
        `Add a TXT record to your DNS configuration:\n\n` +
        `Host/Name: ${this.DNS_PREFIX}\n` +
        `Type: TXT\n` +
        `Value: ${this.getExpectedTxtValue(token)}\n\n` +
        `Note: DNS changes can take up to 24-48 hours to propagate.`,
    };
  }
}
