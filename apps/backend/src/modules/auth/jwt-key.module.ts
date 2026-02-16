import { Global, Module } from "@nestjs/common";
import { JwtKeyService } from "./services/jwt-key.service";

/**
 * Global module for JWT key management.
 *
 * This module provides a singleton JwtKeyService that is shared across
 * the entire application. It must be imported by AppModule to ensure
 * a single instance is used for both signing and verification.
 *
 * The @Global() decorator makes JwtKeyService available everywhere
 * without explicit imports in other modules.
 */
@Global()
@Module({
  providers: [JwtKeyService],
  exports: [JwtKeyService],
})
export class JwtKeyModule {}
