import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SsoService } from "./sso.service";
import { SsoConfigService } from "./sso-config.service";
import { DomainModule } from "../domain";
import { AuditModule } from "../../audit/audit.module";

/**
 * SSO Module - Core SSO orchestration services.
 *
 * Provides:
 * - SsoService: User lookup and JIT provisioning for SSO callbacks
 * - SsoConfigService: Per-tenant SSO configuration management
 *
 * Used by:
 * - Azure AD strategy (03-05)
 * - Google strategy (03-06)
 * - SAML strategy (03-07)
 * - Auth controller (SSO config endpoints)
 */
@Module({
  imports: [ConfigModule, forwardRef(() => DomainModule), AuditModule],
  providers: [SsoService, SsoConfigService],
  exports: [SsoService, SsoConfigService],
})
export class SsoModule {}
