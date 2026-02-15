/**
 * JwtKeyService - RS256 Key Management with Rotation Support
 *
 * This service manages RSA key pairs for JWT RS256 signing:
 * - Production: Loads keys from environment variables
 * - Development: Generates ephemeral keys on startup (no env vars required)
 *
 * Key Rotation Strategy:
 * - Multiple keys can be active simultaneously (for graceful rotation)
 * - New tokens are always signed with the "current" key
 * - Old keys remain valid for verification until their tokens expire
 * - Key ID (kid) in JWT header identifies which key to use for verification
 *
 * Migration Support:
 * - Supports both RS256 (asymmetric) and HS256 (symmetric) during migration
 * - Falls back to HS256 if no RS256 keys are configured
 * - HS256 fallback allows existing tokens to remain valid during migration
 */

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

/**
 * Represents an RSA key pair with metadata.
 */
export interface JwtKeyPair {
  /** Key ID (used in JWT kid header) */
  kid: string;
  /** PEM-encoded private key (for signing) */
  privateKey: string;
  /** PEM-encoded public key (for verification) */
  publicKey: string;
  /** When this key was created */
  createdAt: Date;
  /** When this key expires (tokens signed after this are invalid) */
  expiresAt: Date;
  /** Whether this is the current signing key */
  isCurrent: boolean;
}

/**
 * Signing options for JWT token generation.
 */
export interface JwtSigningOptions {
  /** Algorithm to use (RS256 or HS256) */
  algorithm: "RS256" | "HS256";
  /** Key ID to include in JWT header (for RS256) */
  kid?: string;
  /** Private key or secret for signing */
  key: string;
}

/**
 * Configuration for RS256 key management.
 */
interface Rs256Config {
  privateKey?: string;
  publicKey?: string;
  keyId?: string;
  rotationEnabled: boolean;
  /** How long old keys remain valid for verification (default: 7 days) */
  keyOverlapDays: number;
}

@Injectable()
export class JwtKeyService implements OnModuleInit {
  private readonly logger = new Logger(JwtKeyService.name);

  /** Active key pairs (current + rotated keys within overlap period) */
  private keyPairs: Map<string, JwtKeyPair> = new Map();

  /** Current signing key ID */
  private currentKeyId: string | null = null;

  /** HS256 fallback secret (for migration support) */
  private readonly hs256Secret: string;

  /** Algorithm to use for new tokens */
  private readonly algorithm: "RS256" | "HS256";

  /** Key overlap period in milliseconds */
  private readonly keyOverlapMs: number;

  constructor(private readonly configService: ConfigService) {
    this.hs256Secret = this.configService.get<string>("jwt.secret") || "";

    // Determine algorithm: RS256 if keys are configured, else HS256
    const privateKey = this.configService.get<string>("jwt.rs256.privateKey");
    const publicKey = this.configService.get<string>("jwt.rs256.publicKey");

    // In production, require explicit RS256 config; in dev, auto-generate
    const nodeEnv = this.configService.get<string>("nodeEnv");
    const hasRs256Config = privateKey && publicKey;

    if (hasRs256Config) {
      this.algorithm = "RS256";
    } else if (nodeEnv === "production") {
      // Production requires explicit config - default to HS256 if not configured
      this.algorithm = "HS256";
      this.logger.warn(
        "RS256 keys not configured in production. Using HS256. " +
          "Set JWT_RS256_PRIVATE_KEY and JWT_RS256_PUBLIC_KEY for RS256.",
      );
    } else {
      // Development: auto-generate RS256 keys
      this.algorithm = "RS256";
    }

    // Key overlap period (default 7 days = refresh token lifetime)
    const overlapDays =
      this.configService.get<number>("jwt.rs256.keyOverlapDays") || 7;
    this.keyOverlapMs = overlapDays * 24 * 60 * 60 * 1000;
  }

  /**
   * Initialize key management on module startup.
   */
  async onModuleInit(): Promise<void> {
    if (this.algorithm === "RS256") {
      await this.initializeRs256Keys();
    }

    this.logger.log(
      `JWT key service initialized. Algorithm: ${this.algorithm}, ` +
        `Active keys: ${this.keyPairs.size}`,
    );
  }

  /**
   * Gets the signing options for new token generation.
   * Returns current signing key with algorithm configuration.
   */
  getSigningOptions(): JwtSigningOptions {
    if (this.algorithm === "HS256" || !this.currentKeyId) {
      return {
        algorithm: "HS256",
        key: this.hs256Secret,
      };
    }

    const currentKey = this.keyPairs.get(this.currentKeyId);
    if (!currentKey) {
      this.logger.error("Current key not found, falling back to HS256");
      return {
        algorithm: "HS256",
        key: this.hs256Secret,
      };
    }

    return {
      algorithm: "RS256",
      kid: this.currentKeyId,
      key: currentKey.privateKey,
    };
  }

  /**
   * Gets the signing key (private key for RS256, secret for HS256).
   * This is the primary method used by JwtService for signing.
   */
  getSigningKey(): string {
    const options = this.getSigningOptions();
    return options.key;
  }

  /**
   * Gets the current key ID (for RS256 tokens).
   * Returns undefined for HS256.
   */
  getCurrentKeyId(): string | undefined {
    if (this.algorithm === "HS256") {
      return undefined;
    }
    return this.currentKeyId || undefined;
  }

  /**
   * Gets a specific key by its ID.
   * Used for verifying tokens that include a kid header.
   */
  getKeyById(kid: string): JwtKeyPair | undefined {
    return this.keyPairs.get(kid);
  }

  /**
   * Gets all valid verification keys.
   * Includes current key and any rotated keys within overlap period.
   */
  getVerificationKeys(): JwtKeyPair[] {
    const now = new Date();
    return Array.from(this.keyPairs.values()).filter(
      (key) => key.expiresAt > now,
    );
  }

  /**
   * Gets the verification key for a token.
   * Handles both RS256 (kid lookup) and HS256 (static secret).
   *
   * @param kid - Key ID from JWT header (optional for RS256)
   * @returns Verification key string
   */
  getVerificationKey(kid?: string): string {
    // If no kid or algorithm is HS256, return HS256 secret
    if (!kid || this.algorithm === "HS256") {
      return this.hs256Secret;
    }

    // Look up RS256 key by kid
    const keyPair = this.keyPairs.get(kid);
    if (keyPair) {
      return keyPair.publicKey;
    }

    // Kid not found - might be an old HS256 token during migration
    this.logger.warn(
      `Key ID ${kid} not found. Token may be from before RS256 migration.`,
    );
    return this.hs256Secret;
  }

  /**
   * Gets the algorithm currently in use.
   */
  getAlgorithm(): "RS256" | "HS256" {
    return this.algorithm;
  }

  /**
   * Rotates to a new signing key.
   * The old key remains valid for verification during the overlap period.
   *
   * In production, new key material should be provided via environment variables
   * and loaded via config refresh. This method handles the rotation logic.
   *
   * @returns New key ID
   */
  async rotateKey(): Promise<string> {
    if (this.algorithm === "HS256") {
      throw new Error(
        "Key rotation not supported for HS256. Configure RS256 keys.",
      );
    }

    // Generate new key pair
    const newKeyPair = this.generateKeyPair();

    // Mark old current key as non-current
    if (this.currentKeyId) {
      const oldKey = this.keyPairs.get(this.currentKeyId);
      if (oldKey) {
        oldKey.isCurrent = false;
        // Set expiration to overlap period from now
        oldKey.expiresAt = new Date(Date.now() + this.keyOverlapMs);
      }
    }

    // Add new key and make it current
    this.keyPairs.set(newKeyPair.kid, newKeyPair);
    this.currentKeyId = newKeyPair.kid;

    // Clean up expired keys
    this.cleanupExpiredKeys();

    this.logger.log(
      `Key rotated. New key: ${newKeyPair.kid}, ` +
        `Active keys: ${this.keyPairs.size}`,
    );

    return newKeyPair.kid;
  }

  /**
   * Checks if RS256 is properly configured and active.
   */
  isRs256Active(): boolean {
    return this.algorithm === "RS256" && this.currentKeyId !== null;
  }

  /**
   * Gets key status for health checks and monitoring.
   */
  getKeyStatus(): {
    algorithm: string;
    activeKeys: number;
    currentKeyId: string | null;
    currentKeyAge?: number;
  } {
    let currentKeyAge: number | undefined;
    if (this.currentKeyId) {
      const currentKey = this.keyPairs.get(this.currentKeyId);
      if (currentKey) {
        currentKeyAge = Date.now() - currentKey.createdAt.getTime();
      }
    }

    return {
      algorithm: this.algorithm,
      activeKeys: this.keyPairs.size,
      currentKeyId: this.currentKeyId,
      currentKeyAge,
    };
  }

  /**
   * Initialize RS256 keys from config or generate for development.
   */
  private async initializeRs256Keys(): Promise<void> {
    const privateKey = this.configService.get<string>("jwt.rs256.privateKey");
    const publicKey = this.configService.get<string>("jwt.rs256.publicKey");
    const keyId = this.configService.get<string>("jwt.rs256.keyId");

    if (privateKey && publicKey) {
      // Load keys from environment
      const kid = keyId || this.generateKeyId();
      const keyPair: JwtKeyPair = {
        kid,
        privateKey: this.normalizeKey(privateKey),
        publicKey: this.normalizeKey(publicKey),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.keyOverlapMs * 2), // Longer initial validity
        isCurrent: true,
      };

      this.keyPairs.set(kid, keyPair);
      this.currentKeyId = kid;

      this.logger.log(`Loaded RS256 keys from environment. Key ID: ${kid}`);
    } else {
      // Generate ephemeral keys for development
      const keyPair = this.generateKeyPair();
      this.keyPairs.set(keyPair.kid, keyPair);
      this.currentKeyId = keyPair.kid;

      this.logger.log(
        `Generated ephemeral RS256 keys for development. Key ID: ${keyPair.kid}. ` +
          "These keys will be lost on restart.",
      );
    }
  }

  /**
   * Generates a new RSA key pair.
   */
  private generateKeyPair(): JwtKeyPair {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });

    return {
      kid: this.generateKeyId(),
      privateKey,
      publicKey,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.keyOverlapMs * 2),
      isCurrent: true,
    };
  }

  /**
   * Generates a unique key ID.
   */
  private generateKeyId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString("hex");
    return `key-${timestamp}-${random}`;
  }

  /**
   * Normalizes PEM key format (handles base64-encoded or escaped newlines).
   */
  private normalizeKey(key: string): string {
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

  /**
   * Removes expired keys from memory.
   */
  private cleanupExpiredKeys(): void {
    const now = new Date();
    let removed = 0;

    for (const [kid, keyPair] of this.keyPairs.entries()) {
      if (keyPair.expiresAt < now && !keyPair.isCurrent) {
        this.keyPairs.delete(kid);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger.debug(`Cleaned up ${removed} expired keys`);
    }
  }
}
