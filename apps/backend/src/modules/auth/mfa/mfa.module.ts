import { Module } from '@nestjs/common';
import { MfaController } from './mfa.controller';
import { MfaService } from './mfa.service';
import { RecoveryCodesService } from './recovery-codes.service';
import { AuditModule } from '../../audit/audit.module';

/**
 * Module for MFA (Multi-Factor Authentication) functionality.
 *
 * Provides TOTP-based MFA with recovery codes.
 * Exports MfaService for use by auth flow.
 */
@Module({
  imports: [AuditModule],
  controllers: [MfaController],
  providers: [MfaService, RecoveryCodesService],
  exports: [MfaService],
})
export class MfaModule {}
