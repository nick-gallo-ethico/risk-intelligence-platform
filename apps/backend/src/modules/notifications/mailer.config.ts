/**
 * Mailer Configuration
 *
 * Configures the MailerModule with SMTP transport settings.
 * Uses environment variables for flexibility across environments:
 * - Development: Mailhog (localhost:1025)
 * - Production: SendGrid, SES, or other SMTP provider
 *
 * @see https://nest-modules.github.io/mailer/
 */

import { ConfigService } from "@nestjs/config";
import { MailerOptions } from "@nestjs-modules/mailer";

/**
 * Factory function for MailerModule async configuration.
 * Reads SMTP settings from environment variables.
 */
export const mailerConfig = (configService: ConfigService): MailerOptions => {
  const host = configService.get<string>("SMTP_HOST", "localhost");
  const port = configService.get<number>("SMTP_PORT", 1025);
  const user = configService.get<string>("SMTP_USER", "");
  const pass = configService.get<string>("SMTP_PASS", "");
  const from = configService.get<string>("EMAIL_FROM", "noreply@ethico.local");
  const secure = configService.get<boolean>("SMTP_SECURE", false);

  // Determine if auth should be used (only if credentials provided)
  const hasAuth = user && pass;

  return {
    transport: {
      host,
      port,
      secure, // true for 465, false for other ports
      ...(hasAuth && {
        auth: {
          user,
          pass,
        },
      }),
      // Connection pool settings for production
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      // Timeout settings
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 60000, // 60 seconds for slow sends
    },
    defaults: {
      from: from,
    },
    // We're using pre-rendered HTML, so no template engine needed here
    // Templates are rendered by EmailTemplateService using Handlebars + MJML
  };
};

/**
 * SMTP configuration interface for type safety.
 */
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

/**
 * Get SMTP configuration from environment.
 * Used for health checks and diagnostics.
 */
export const getSmtpConfig = (configService: ConfigService): SmtpConfig => ({
  host: configService.get<string>("SMTP_HOST", "localhost"),
  port: configService.get<number>("SMTP_PORT", 1025),
  secure: configService.get<boolean>("SMTP_SECURE", false),
  user: configService.get<string>("SMTP_USER"),
  pass: configService.get<string>("SMTP_PASS"),
  from: configService.get<string>("EMAIL_FROM", "noreply@ethico.local"),
});
