import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AIProvider } from "../interfaces/ai-provider.interface";
import { ClaudeProvider } from "../providers/claude.provider";

/**
 * ProviderRegistryService - Registry for AI providers.
 *
 * Manages provider registration and selection, enabling:
 * - Multiple AI providers (Claude, Azure OpenAI, self-hosted)
 * - Runtime provider switching via configuration
 * - Feature detection via provider capabilities
 * - Graceful fallback when providers are unavailable
 *
 * Usage:
 * ```typescript
 * // Get the default provider
 * const provider = registry.getDefaultProvider();
 *
 * // Get a specific provider
 * const claude = registry.getProvider('claude');
 *
 * // Check if any provider is available
 * if (registry.hasAvailableProvider()) {
 *   const response = await provider.createMessage(params);
 * }
 * ```
 */
@Injectable()
export class ProviderRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ProviderRegistryService.name);
  private readonly providers = new Map<string, AIProvider>();
  private defaultProviderName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly claudeProvider: ClaudeProvider,
  ) {
    this.defaultProviderName = this.configService.get<string>(
      "AI_DEFAULT_PROVIDER",
      "claude",
    );
  }

  onModuleInit() {
    // Register built-in providers
    this.registerProvider(this.claudeProvider);

    this.logger.log(`Registered ${this.providers.size} AI provider(s)`);

    // Verify default provider is available
    const defaultProvider = this.providers.get(this.defaultProviderName);
    if (!defaultProvider?.isReady()) {
      this.logger.warn(
        `Default AI provider '${this.defaultProviderName}' is not ready`,
      );
    } else {
      this.logger.log(`Default AI provider: ${this.defaultProviderName}`);
    }
  }

  /**
   * Register an AI provider.
   * Can be used to add custom providers at runtime.
   */
  registerProvider(provider: AIProvider): void {
    if (this.providers.has(provider.name)) {
      this.logger.warn(`Overwriting existing provider: ${provider.name}`);
    }
    this.providers.set(provider.name, provider);
    this.logger.debug(`Registered provider: ${provider.name}`);
  }

  /**
   * Get a provider by name.
   * Falls back to default if name not specified.
   *
   * @throws Error if provider not found or not ready
   */
  getProvider(name?: string): AIProvider {
    const providerName = name || this.defaultProviderName;
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(
        `AI provider '${providerName}' not found. Available: ${this.listProviders().join(", ")}`,
      );
    }

    if (!provider.isReady()) {
      throw new Error(
        `AI provider '${providerName}' is not ready (check configuration)`,
      );
    }

    return provider;
  }

  /**
   * Get the default provider.
   * Convenience method equivalent to getProvider() with no arguments.
   */
  getDefaultProvider(): AIProvider {
    return this.getProvider(this.defaultProviderName);
  }

  /**
   * Try to get a provider without throwing.
   * Returns null if provider not found or not ready.
   */
  tryGetProvider(name?: string): AIProvider | null {
    try {
      return this.getProvider(name);
    } catch {
      return null;
    }
  }

  /**
   * List all registered provider names.
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * List ready (configured) providers.
   * Only returns providers that have passed isReady() check.
   */
  listReadyProviders(): string[] {
    return Array.from(this.providers.entries())
      .filter(([, provider]) => provider.isReady())
      .map(([name]) => name);
  }

  /**
   * Check if any provider is available.
   * Use this to gracefully disable AI features when no provider is configured.
   */
  hasAvailableProvider(): boolean {
    return this.listReadyProviders().length > 0;
  }

  /**
   * Get the default provider name (from configuration).
   */
  getDefaultProviderName(): string {
    return this.defaultProviderName;
  }
}
