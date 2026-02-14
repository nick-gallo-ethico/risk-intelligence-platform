import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

/**
 * Azure Key Vault service for secure secrets management.
 *
 * USAGE:
 * - Production: Set AZURE_KEY_VAULT_URL env var, secrets loaded from vault
 * - Development: Leave AZURE_KEY_VAULT_URL unset, falls back to env vars
 *
 * SECRET NAMING:
 * Key Vault uses kebab-case (e.g., "database-url", "jwt-secret")
 * This service maps them to env var names (DATABASE_URL, JWT_SECRET)
 */
@Injectable()
export class KeyVaultService implements OnModuleInit {
  private readonly logger = new Logger(KeyVaultService.name);
  private client: SecretClient | null = null;
  private secrets: Map<string, string> = new Map();
  private isInitialized = false;

  async onModuleInit(): Promise<void> {
    const vaultUrl = process.env.AZURE_KEY_VAULT_URL;
    const nodeEnv = process.env.NODE_ENV || "development";

    if (!vaultUrl) {
      this.logger.log(
        "Azure Key Vault URL not configured - using environment variables for secrets",
      );
      this.isInitialized = true;
      return;
    }

    // Only require Key Vault in production
    if (nodeEnv !== "production") {
      this.logger.log(
        "Key Vault URL configured but not in production - using environment variables",
      );
      this.isInitialized = true;
      return;
    }

    try {
      this.logger.log(`Initializing Azure Key Vault client (${vaultUrl})`);

      // DefaultAzureCredential tries multiple auth methods:
      // 1. Environment variables (AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID)
      // 2. Managed Identity (in Azure)
      // 3. Azure CLI credentials (local development)
      const credential = new DefaultAzureCredential();
      this.client = new SecretClient(vaultUrl, credential);

      // Pre-load critical secrets
      await this.loadSecrets([
        "database-url",
        "jwt-secret",
        "redis-password",
        "anthropic-api-key",
        "azure-storage-account-key",
      ]);

      this.isInitialized = true;
      this.logger.log(
        `Azure Key Vault initialized - loaded ${this.secrets.size} secrets`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to initialize Azure Key Vault: ${errorMessage}`,
      );

      // In production, fail fast if Key Vault is configured but unavailable
      if (nodeEnv === "production") {
        throw new Error(
          `Azure Key Vault initialization failed: ${errorMessage}. ` +
            "Ensure AZURE_KEY_VAULT_URL is correct and the application has access.",
        );
      }

      // In non-production, warn and fall back to env vars
      this.logger.warn("Falling back to environment variables");
      this.isInitialized = true;
    }
  }

  /**
   * Load multiple secrets from Key Vault.
   * Secrets that don't exist are silently skipped.
   */
  private async loadSecrets(names: string[]): Promise<void> {
    if (!this.client) return;

    const results = await Promise.allSettled(
      names.map(async (name) => {
        try {
          const secret = await this.client!.getSecret(name);
          if (secret.value) {
            this.secrets.set(name, secret.value);
          }
        } catch {
          // Secret doesn't exist - not an error, just skip
          this.logger.debug(`Secret "${name}" not found in Key Vault`);
        }
      }),
    );

    const loaded = results.filter((r) => r.status === "fulfilled").length;
    this.logger.debug(
      `Loaded ${loaded}/${names.length} secrets from Key Vault`,
    );
  }

  /**
   * Get a secret value.
   * Checks Key Vault cache first, then falls back to environment variable.
   *
   * @param name - Key Vault secret name (kebab-case, e.g., "database-url")
   * @param envVarName - Optional environment variable name (e.g., "DATABASE_URL")
   * @returns Secret value or undefined
   */
  getSecret(name: string, envVarName?: string): string | undefined {
    // Check Key Vault cache first
    if (this.secrets.has(name)) {
      return this.secrets.get(name);
    }

    // Fall back to environment variable
    const envName = envVarName || this.kebabToEnvVar(name);
    return process.env[envName];
  }

  /**
   * Get a secret value, throwing if not found.
   *
   * @param name - Key Vault secret name
   * @param envVarName - Optional environment variable name
   * @returns Secret value
   * @throws Error if secret not found
   */
  getSecretOrThrow(name: string, envVarName?: string): string {
    const value = this.getSecret(name, envVarName);
    if (!value) {
      const envName = envVarName || this.kebabToEnvVar(name);
      throw new Error(
        `Required secret "${name}" not found in Key Vault or environment variable ${envName}`,
      );
    }
    return value;
  }

  /**
   * Convert kebab-case to UPPER_SNAKE_CASE.
   * e.g., "database-url" -> "DATABASE_URL"
   */
  private kebabToEnvVar(name: string): string {
    return name.toUpperCase().replace(/-/g, "_");
  }

  /**
   * Check if Key Vault is available and initialized.
   */
  isAvailable(): boolean {
    return this.isInitialized && this.client !== null;
  }
}
