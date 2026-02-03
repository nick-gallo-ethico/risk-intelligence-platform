import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { SsoService } from '../sso/sso.service';
import { SsoUserData } from '../interfaces';

/**
 * Build Google OAuth 2.0 strategy options from environment configuration.
 * Extracted to allow super() to be called with computed options.
 */
function buildGoogleOptions(configService: ConfigService): {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  scope: string[];
} {
  const clientId = configService.get<string>('GOOGLE_CLIENT_ID', 'not-configured');
  const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET', 'not-configured');
  const apiUrl = configService.get<string>('API_URL', 'http://localhost:3000');

  return {
    clientID: clientId,
    clientSecret: clientSecret,
    callbackURL: `${apiUrl}/api/v1/auth/google/callback`,
    scope: ['email', 'profile', 'openid'],
  };
}

/**
 * Google OAuth 2.0 Strategy for SSO.
 *
 * Supports Google Workspace (G Suite) domains for enterprise SSO.
 * Domain routing is handled by our domain verification system -
 * users with verified domains are routed to their organization.
 *
 * Required environment variables:
 * - GOOGLE_CLIENT_ID: OAuth 2.0 Client ID from Google Cloud Console
 * - GOOGLE_CLIENT_SECRET: OAuth 2.0 Client Secret from Google Cloud Console
 * - API_URL: Base URL for callback (e.g., https://api.ethico.com)
 *
 * If GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not set, the strategy
 * will be registered but non-functional, allowing the app to start without
 * Google OAuth configuration.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);
  private readonly isConfigured: boolean;

  constructor(
    configService: ConfigService,
    private ssoService: SsoService,
  ) {
    super(buildGoogleOptions(configService));

    // Track whether strategy is actually configured
    const clientId = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    this.isConfigured = !!(clientId && clientSecret);

    if (!this.isConfigured) {
      this.logger.warn('Google OAuth strategy not configured - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required');
    }
  }

  /**
   * Validate callback from Google OAuth.
   * Called by Passport after successful authentication with Google.
   *
   * @param accessToken - Google access token (not stored)
   * @param refreshToken - Google refresh token (not stored)
   * @param profile - User profile from Google
   * @param done - Passport callback
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      if (!this.isConfigured) {
        return done(new Error('Google OAuth SSO is not configured'), false);
      }

      const email = profile.emails?.[0]?.value;

      this.logger.log(`Google OAuth callback for user: ${email}`);

      if (!email) {
        this.logger.error('Google profile missing email');
        return done(new Error('Email not provided by Google'), false);
      }

      if (!profile.id) {
        this.logger.error('Google profile missing id');
        return done(new Error('User ID not provided by Google'), false);
      }

      // Extract user data from Google profile
      const ssoUser: SsoUserData = {
        email: email.toLowerCase(),
        firstName: profile.name?.givenName || '',
        lastName: profile.name?.familyName || '',
        provider: 'google',
        ssoId: profile.id, // Google user ID - stable unique identifier
        avatarUrl: profile.photos?.[0]?.value,
        rawProfile: profile._json,
      };

      // Use SsoService for user lookup/creation
      const user = await this.ssoService.findOrCreateSsoUser(ssoUser);

      done(null, user);
    } catch (error) {
      this.logger.error(`Google OAuth validation error: ${error.message}`);
      done(error, false);
    }
  }
}
