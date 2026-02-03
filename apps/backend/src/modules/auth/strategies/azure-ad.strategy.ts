import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  OIDCStrategy,
  IProfile,
  VerifyCallback,
  IOIDCStrategyOptionWithoutRequest,
} from 'passport-azure-ad';
import { ConfigService } from '@nestjs/config';
import { SsoService } from '../sso/sso.service';
import { SsoUserData } from '../interfaces';

/**
 * Build Azure AD OIDC strategy options from environment configuration.
 * Extracted to allow super() to be called with computed options.
 */
function buildAzureAdOptions(configService: ConfigService): IOIDCStrategyOptionWithoutRequest {
  const clientId = configService.get<string>('AZURE_AD_CLIENT_ID', 'not-configured');
  const clientSecret = configService.get<string>('AZURE_AD_CLIENT_SECRET', 'not-configured');
  const apiUrl = configService.get<string>('API_URL', 'http://localhost:3000');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  return {
    // Use "common" for multi-tenant - allows any Azure AD tenant
    identityMetadata: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
    clientID: clientId,
    clientSecret: clientSecret,
    responseType: 'code',
    responseMode: 'form_post',
    redirectUrl: `${apiUrl}/api/v1/auth/azure-ad/callback`,
    allowHttpForRedirectUrl: nodeEnv === 'development',
    scope: ['openid', 'profile', 'email'],
    passReqToCallback: false,
    loggingLevel: nodeEnv === 'production' ? 'warn' : 'info',
    loggingNoPII: true, // Never log personally identifiable info
  };
}

/**
 * Azure AD OIDC Strategy for enterprise SSO.
 *
 * Uses the "common" endpoint to support multi-tenant apps where users
 * from any Azure AD tenant can sign in. Tenant routing is handled by
 * our domain verification system.
 *
 * Required environment variables:
 * - AZURE_AD_CLIENT_ID: Application (client) ID from Azure portal
 * - AZURE_AD_CLIENT_SECRET: Client secret from Azure portal
 * - API_URL: Base URL for callback (e.g., https://api.ethico.com)
 *
 * If AZURE_AD_CLIENT_ID and AZURE_AD_CLIENT_SECRET are not set, the strategy
 * will be registered but non-functional, allowing the app to start without
 * Azure AD configuration.
 */
@Injectable()
export class AzureAdStrategy extends PassportStrategy(OIDCStrategy, 'azure-ad') {
  private readonly logger = new Logger(AzureAdStrategy.name);
  private readonly isConfigured: boolean;

  constructor(
    configService: ConfigService,
    private ssoService: SsoService,
  ) {
    super(buildAzureAdOptions(configService));

    // Track whether strategy is actually configured
    const clientId = configService.get<string>('AZURE_AD_CLIENT_ID');
    const clientSecret = configService.get<string>('AZURE_AD_CLIENT_SECRET');
    this.isConfigured = !!(clientId && clientSecret);

    if (!this.isConfigured) {
      this.logger.warn('Azure AD strategy not configured - AZURE_AD_CLIENT_ID and AZURE_AD_CLIENT_SECRET required');
    }
  }

  /**
   * Validate callback from Azure AD.
   * Called by Passport after successful authentication with Azure AD.
   *
   * @param profile - User profile from Azure AD
   * @param done - Passport callback
   */
  async validate(profile: IProfile, done: VerifyCallback): Promise<void> {
    try {
      if (!this.isConfigured) {
        return done(new Error('Azure AD SSO is not configured'), null);
      }

      this.logger.log(`Azure AD callback for user: ${profile._json?.email || profile._json?.preferred_username}`);

      // Extract user data from Azure AD profile
      const ssoUser: SsoUserData = {
        email: this.extractEmail(profile),
        firstName: profile._json?.given_name || '',
        lastName: profile._json?.family_name || '',
        provider: 'azure-ad',
        ssoId: profile.oid || '', // Azure object ID - stable unique identifier
        azureTenantId: profile._json?.tid, // Azure tenant ID
        rawProfile: profile._json,
      };

      if (!ssoUser.email) {
        this.logger.error('Azure AD profile missing email');
        return done(new Error('Email not provided by Azure AD'), null);
      }

      if (!ssoUser.ssoId) {
        this.logger.error('Azure AD profile missing oid');
        return done(new Error('User ID (oid) not provided by Azure AD'), null);
      }

      // Use SsoService for user lookup/creation
      const user = await this.ssoService.findOrCreateSsoUser(ssoUser);

      done(null, user);
    } catch (error) {
      this.logger.error(`Azure AD validation error: ${error.message}`);
      done(error, null);
    }
  }

  /**
   * Extract email from Azure AD profile.
   * Azure AD can return email in different fields depending on configuration.
   */
  private extractEmail(profile: IProfile): string {
    // Priority: email claim > preferred_username (usually email) > upn
    return (
      profile._json?.email ||
      profile._json?.preferred_username ||
      profile._json?.upn ||
      ''
    );
  }
}
