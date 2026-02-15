import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MfaController } from "./mfa.controller";
import { MfaService } from "./mfa.service";
import { RecoveryCodesService } from "./recovery-codes.service";
import { AuditModule } from "../../audit/audit.module";
import { JwtKeyService } from "../services/jwt-key.service";

/**
 * Module for MFA (Multi-Factor Authentication) functionality.
 *
 * Provides TOTP-based MFA with recovery codes.
 * Exports MfaService for use by auth flow.
 *
 * SEC-09: MfaService issues new JWT tokens with mfaVerified: true
 * after successful MFA verification during login.
 */
@Module({
  imports: [
    AuditModule,
    // JwtModule is configured in AuthModule, but we need access to JwtService here
    JwtModule,
  ],
  controllers: [MfaController],
  providers: [MfaService, RecoveryCodesService, JwtKeyService],
  exports: [MfaService],
})
export class MfaModule {}
