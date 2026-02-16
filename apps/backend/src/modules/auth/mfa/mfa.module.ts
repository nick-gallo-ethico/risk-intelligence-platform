import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MfaController } from "./mfa.controller";
import { MfaService } from "./mfa.service";
import { RecoveryCodesService } from "./recovery-codes.service";
import { AuditModule } from "../../audit/audit.module";
import { JwtKeyModule } from "../jwt-key.module";

/**
 * Module for MFA (Multi-Factor Authentication) functionality.
 *
 * Provides TOTP-based MFA with recovery codes.
 * Exports MfaService for use by auth flow.
 *
 * SEC-09: MfaService issues new JWT tokens with mfaVerified: true
 * after successful MFA verification during login.
 *
 * NOTE: JwtKeyService is imported from JwtKeyModule (a global singleton module)
 * to ensure consistent key management across the entire auth system.
 */
@Module({
  imports: [
    AuditModule,
    // JwtModule is configured in AuthModule, but we need access to JwtService here
    JwtModule,
    // Import JwtKeyModule to get JwtKeyService singleton
    JwtKeyModule,
  ],
  controllers: [MfaController],
  providers: [MfaService, RecoveryCodesService],
  exports: [MfaService],
})
export class MfaModule {}
