import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import {
  JwtStrategy,
  AzureAdStrategy,
  GoogleStrategy,
  SamlStrategy,
} from "./strategies";
import { DomainModule } from "./domain";
import { SsoModule } from "./sso";
import { MfaModule } from "./mfa";
import { JwtKeyModule } from "./jwt-key.module";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Determine algorithm based on RS256 key availability
        const privateKey = configService.get<string>("jwt.rs256.privateKey");
        const publicKey = configService.get<string>("jwt.rs256.publicKey");
        const nodeEnv = configService.get<string>("nodeEnv");

        // RS256 if keys configured OR in development (auto-generated keys)
        const useRs256 = (privateKey && publicKey) || nodeEnv !== "production";

        if (useRs256 && privateKey && publicKey) {
          // Production RS256 with configured keys
          return {
            privateKey: normalizeKey(privateKey),
            publicKey: normalizeKey(publicKey),
            signOptions: {
              algorithm: "RS256" as const,
              expiresIn: configService.get<string>(
                "jwt.accessTokenExpiry",
                "15m",
              ),
            },
            verifyOptions: {
              // SECURITY: RS256 only - prevents algorithm confusion attack (CVE-2015-9235)
              // HS256 removed - attackers could forge tokens using public key as HMAC secret
              algorithms: ["RS256"] as const,
            },
          };
        }

        // Development fallback - JwtKeyService provides signing key dynamically
        // SECURITY: In production, RS256 keys MUST be configured
        const jwtSecret = configService.get<string>("jwt.secret");
        if (!jwtSecret && nodeEnv === "production") {
          throw new Error(
            "FATAL: JWT secret is required in production when RS256 keys not configured",
          );
        }

        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: configService.get<string>(
              "jwt.accessTokenExpiry",
              "15m",
            ),
          },
        };
      },
    }),
    DomainModule,
    SsoModule,
    MfaModule,
    // JwtKeyModule provides singleton JwtKeyService for consistent key management
    JwtKeyModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    AzureAdStrategy,
    GoogleStrategy,
    SamlStrategy,
  ],
  exports: [
    AuthService,
    JwtModule,
    JwtKeyModule,
    DomainModule,
    SsoModule,
    MfaModule,
  ],
})
export class AuthModule {}

/**
 * Normalizes PEM key format (handles base64-encoded or escaped newlines).
 */
function normalizeKey(key: string): string {
  // If key is base64-encoded (no PEM headers), decode it
  if (!key.includes("-----BEGIN")) {
    try {
      const decoded = Buffer.from(key, "base64").toString("utf8");
      if (decoded.includes("-----BEGIN")) {
        return decoded;
      }
    } catch {
      // Not base64, continue
    }
  }

  // Replace escaped newlines with actual newlines
  return key.replace(/\\n/g, "\n");
}
