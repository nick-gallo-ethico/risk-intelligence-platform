import { Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import {
  Strategy,
  Profile,
  PassportSamlConfig,
  VerifiedCallback,
} from "@node-saml/passport-saml";
import { Request } from "express";
import { SsoService } from "../sso/sso.service";
import { SsoConfigService } from "../sso/sso-config.service";
import { SsoUserData } from "../interfaces";

/**
 * SAML 2.0 Strategy with multi-tenant support.
 *
 * Each organization can configure their own IdP (Okta, Ping, OneLogin, etc.).
 * Configuration is loaded dynamically per-request based on tenant slug.
 *
 * SECURITY CRITICAL:
 * - Always validate assertion signatures (wantAssertionsSigned: true)
 * - Always validate response signatures (wantAuthnResponseSigned: true)
 * - Use SHA-256 or higher for signatures
 * - CVE-2022-39299: Ensure using @node-saml/passport-saml v5+
 */
@Injectable()
export class SamlStrategy extends PassportStrategy(Strategy, "saml") {
  private readonly logger = new Logger(SamlStrategy.name);

  constructor(
    private ssoConfigService: SsoConfigService,
    private ssoService: SsoService,
  ) {
    // Multi-tenant SAML uses getSamlOptions callback for per-request configuration
    // Provide default callbackUrl and issuer to satisfy @node-saml requirements
    // These are overridden per-request by getSamlOptions
    super({
      callbackUrl: "http://localhost:3000/api/v1/auth/saml/default/callback",
      issuer: "ethico-platform",
      idpCert: "placeholder", // Required but overridden by getSamlOptions
      passReqToCallback: true,
      getSamlOptions: async (
        req: Request,
        done: (err: Error | null, options: PassportSamlConfig | null) => void,
      ) => {
        try {
          // Extract tenant from URL path: /api/v1/auth/saml/:tenant/callback
          const tenant = req.params.tenant;

          if (!tenant) {
            return done(
              new Error("Tenant identifier required for SAML SSO"),
              null,
            );
          }

          // Load tenant-specific SAML configuration
          const config = await this.ssoConfigService.getSamlConfig(tenant);

          this.logger.log(`Loading SAML config for tenant: ${tenant}`);

          done(null, {
            callbackUrl: config.callbackUrl,
            entryPoint: config.entryPoint,
            issuer: config.issuer,
            idpCert: config.cert, // idpCert is the required property name in node-saml
            wantAssertionsSigned: config.wantAssertionsSigned,
            wantAuthnResponseSigned: config.wantAuthnResponseSigned,
            signatureAlgorithm: config.signatureAlgorithm,
            // Additional security settings
            acceptedClockSkewMs: 60000, // 1 minute clock skew tolerance
            disableRequestedAuthnContext: true, // Better IdP compatibility
          });
        } catch (error) {
          this.logger.error(`SAML config error for tenant: ${error.message}`);
          done(error, null);
        }
      },
    });

    this.logger.log("SAML strategy initialized (multi-tenant mode)");
  }

  /**
   * Validate SAML assertion from IdP.
   * Called after successful SAML authentication.
   *
   * @param req - Express request (contains tenant info)
   * @param profile - User profile from SAML assertion
   * @param done - Passport callback
   */
  async validate(
    req: Request,
    profile: Profile,
    done: VerifiedCallback,
  ): Promise<void> {
    try {
      const email = this.extractEmail(profile);
      const tenant = req.params.tenant;

      this.logger.log(`SAML callback for user: ${email} (tenant: ${tenant})`);

      if (!email) {
        this.logger.error("SAML assertion missing email");
        return done(
          new Error("Email not provided in SAML assertion"),
          undefined,
          undefined,
        );
      }

      // Extract user data from SAML profile
      const ssoUser: SsoUserData = {
        email: email.toLowerCase(),
        firstName: this.extractFirstName(profile),
        lastName: this.extractLastName(profile),
        provider: "saml",
        ssoId: profile.nameID || email, // Use nameID as stable identifier
        rawProfile: profile as unknown as Record<string, unknown>,
      };

      // Use SsoService for user lookup/creation
      const user = await this.ssoService.findOrCreateSsoUser(ssoUser);

      done(null, user);
    } catch (error) {
      this.logger.error(`SAML validation error: ${error.message}`);
      done(error, undefined, undefined);
    }
  }

  /**
   * Extract email from SAML profile.
   * SAML assertions can have email in various attributes.
   */
  private extractEmail(profile: Profile): string {
    return (
      profile.nameID ||
      profile.email ||
      (profile as any)[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
      ] ||
      (profile as any)[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn"
      ] ||
      ""
    );
  }

  /**
   * Extract first name from SAML profile.
   */
  private extractFirstName(profile: Profile): string {
    return (
      profile.firstName ||
      (profile as any).givenName ||
      (profile as any)[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"
      ] ||
      ""
    );
  }

  /**
   * Extract last name from SAML profile.
   */
  private extractLastName(profile: Profile): string {
    return (
      profile.lastName ||
      (profile as any).surname ||
      (profile as any)[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
      ] ||
      ""
    );
  }
}
