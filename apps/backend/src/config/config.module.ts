import { Global, Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { KeyVaultService } from "./keyvault.service";
import configuration from "./configuration";
import { validateEnv } from "./env.validation";

/**
 * Global configuration module.
 *
 * Provides:
 * - NestJS ConfigModule with environment validation
 * - KeyVaultService for secure secrets access
 *
 * Import this module once in AppModule.
 * KeyVaultService is globally available after import.
 *
 * SECRETS STRATEGY:
 * - Development: Environment variables (.env file)
 * - Production: Azure Key Vault with env var fallback
 *
 * To use Key Vault secrets, inject KeyVaultService:
 *
 * @example
 * constructor(private keyVaultService: KeyVaultService) {}
 *
 * const dbUrl = this.keyVaultService.getSecret('database-url');
 * const jwtSecret = this.keyVaultService.getSecretOrThrow('jwt-secret');
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [".env", ".env.local"],
      validate: validateEnv,
    }),
  ],
  providers: [KeyVaultService],
  exports: [KeyVaultService],
})
export class AppConfigModule {}
