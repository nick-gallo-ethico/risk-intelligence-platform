import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as Handlebars from "handlebars";
import * as fs from "fs";
import * as path from "path";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Context variables for prompt template rendering.
 */
export interface TemplateContext {
  org?: {
    name: string;
    contextFile?: string;
  };
  user?: {
    name: string;
    role: string;
  };
  entity?: Record<string, unknown>;
  currentDateTime?: string;
  [key: string]: unknown;
}

/**
 * Result of retrieving a template.
 */
export interface TemplateResult {
  content: string;
  source: "database" | "file";
  version?: number;
}

/**
 * Template history entry.
 */
export interface TemplateHistoryEntry {
  version: number;
  createdAt: Date;
  isActive: boolean;
}

/**
 * PromptService manages versioned prompt templates using Handlebars.
 *
 * Features:
 * - Loads templates from filesystem on startup
 * - Supports organization-specific overrides via database
 * - Provides version history and rollback capability
 * - Registers common Handlebars helpers
 *
 * Template naming convention:
 * - system/base - Base system prompt
 * - system/investigation-agent - Investigation context
 * - system/case-agent - Case context
 * - skills/summarize - Summarization skill
 * - skills/note-cleanup - Note cleanup skill
 */
@Injectable()
export class PromptService implements OnModuleInit {
  private readonly logger = new Logger(PromptService.name);
  private readonly compiledTemplates = new Map<
    string,
    Handlebars.TemplateDelegate
  >();
  private readonly templateDir: string;

  constructor(private readonly prisma: PrismaService) {
    // Templates are in the prompts/templates directory relative to this file
    this.templateDir = path.join(__dirname, "..", "prompts", "templates");
  }

  async onModuleInit(): Promise<void> {
    await this.loadFileTemplates();
    this.registerHelpers();
    this.logger.log(`Loaded ${this.compiledTemplates.size} prompt templates`);
  }

  /**
   * Render a prompt template with context.
   * Checks database for org-specific override, falls back to file template.
   *
   * @param templateName - Template name (e.g., 'system/base', 'skills/summarize')
   * @param context - Variables to inject into the template
   * @param organizationId - Optional org ID for custom templates
   * @returns Rendered prompt string
   */
  async render(
    templateName: string,
    context: TemplateContext,
    organizationId?: string
  ): Promise<string> {
    // Add current datetime
    context.currentDateTime = new Date().toISOString();

    // Check for organization-specific override in database
    if (organizationId) {
      const dbTemplate = await this.prisma.promptTemplate.findFirst({
        where: {
          organizationId,
          name: templateName,
          isActive: true,
        },
        orderBy: { version: "desc" },
      });

      if (dbTemplate) {
        const compiled = Handlebars.compile(dbTemplate.content);
        return compiled(context);
      }
    }

    // Use file template
    const compiled = this.compiledTemplates.get(templateName);
    if (!compiled) {
      throw new Error(`Prompt template not found: ${templateName}`);
    }

    return compiled(context);
  }

  /**
   * Get the raw template content (for display/editing).
   *
   * @param templateName - Template name
   * @param organizationId - Optional org ID for custom templates
   * @returns Template content and metadata
   */
  async getTemplate(
    templateName: string,
    organizationId?: string
  ): Promise<TemplateResult> {
    if (organizationId) {
      const dbTemplate = await this.prisma.promptTemplate.findFirst({
        where: {
          organizationId,
          name: templateName,
          isActive: true,
        },
        orderBy: { version: "desc" },
      });

      if (dbTemplate) {
        return {
          content: dbTemplate.content,
          source: "database",
          version: dbTemplate.version,
        };
      }
    }

    const filePath = this.resolveTemplatePath(templateName);
    if (fs.existsSync(filePath)) {
      return {
        content: fs.readFileSync(filePath, "utf-8"),
        source: "file",
      };
    }

    throw new Error(`Template not found: ${templateName}`);
  }

  /**
   * Save a custom template version for an organization.
   * Creates a new version and deactivates previous versions.
   *
   * @param params - Template save parameters
   * @returns Created template ID and version
   */
  async saveTemplate(params: {
    organizationId: string;
    name: string;
    content: string;
    description?: string;
  }): Promise<{ id: string; version: number }> {
    // Get current version
    const current = await this.prisma.promptTemplate.findFirst({
      where: {
        organizationId: params.organizationId,
        name: params.name,
      },
      orderBy: { version: "desc" },
    });

    const newVersion = (current?.version || 0) + 1;

    // Deactivate previous versions
    if (current) {
      await this.prisma.promptTemplate.updateMany({
        where: {
          organizationId: params.organizationId,
          name: params.name,
        },
        data: { isActive: false },
      });
    }

    // Create new version
    const template = await this.prisma.promptTemplate.create({
      data: {
        organizationId: params.organizationId,
        name: params.name,
        version: newVersion,
        content: params.content,
        description: params.description,
        isActive: true,
      },
    });

    return { id: template.id, version: template.version };
  }

  /**
   * List available template names from file system.
   *
   * @returns Array of template names
   */
  listTemplates(): string[] {
    return Array.from(this.compiledTemplates.keys());
  }

  /**
   * Get template version history for an organization.
   *
   * @param templateName - Template name
   * @param organizationId - Organization ID
   * @returns Array of version history entries
   */
  async getTemplateHistory(
    templateName: string,
    organizationId: string
  ): Promise<TemplateHistoryEntry[]> {
    const templates = await this.prisma.promptTemplate.findMany({
      where: {
        organizationId,
        name: templateName,
      },
      orderBy: { version: "desc" },
      select: {
        version: true,
        createdAt: true,
        isActive: true,
      },
    });

    return templates;
  }

  /**
   * Revert to a previous template version.
   * Activates the specified version and deactivates all others.
   *
   * @param templateName - Template name
   * @param organizationId - Organization ID
   * @param version - Version to revert to
   */
  async revertToVersion(
    templateName: string,
    organizationId: string,
    version: number
  ): Promise<void> {
    const template = await this.prisma.promptTemplate.findFirst({
      where: {
        organizationId,
        name: templateName,
        version,
      },
    });

    if (!template) {
      throw new Error(`Template version not found: ${templateName} v${version}`);
    }

    // Deactivate all versions
    await this.prisma.promptTemplate.updateMany({
      where: {
        organizationId,
        name: templateName,
      },
      data: { isActive: false },
    });

    // Activate the target version
    await this.prisma.promptTemplate.update({
      where: { id: template.id },
      data: { isActive: true },
    });
  }

  /**
   * Delete all custom template versions for an organization.
   * Useful for resetting to default templates.
   *
   * @param templateName - Template name
   * @param organizationId - Organization ID
   */
  async deleteOrgTemplate(
    templateName: string,
    organizationId: string
  ): Promise<void> {
    await this.prisma.promptTemplate.deleteMany({
      where: {
        organizationId,
        name: templateName,
      },
    });
  }

  /**
   * Load all templates from the file system.
   */
  private async loadFileTemplates(): Promise<void> {
    await this.loadTemplatesFromDir(this.templateDir, "");
  }

  /**
   * Recursively load templates from a directory.
   */
  private async loadTemplatesFromDir(
    dir: string,
    prefix: string
  ): Promise<void> {
    if (!fs.existsSync(dir)) {
      this.logger.warn(`Template directory not found: ${dir}`);
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const newPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
        await this.loadTemplatesFromDir(fullPath, newPrefix);
      } else if (entry.name.endsWith(".hbs")) {
        const templateName = prefix
          ? `${prefix}/${entry.name.replace(".hbs", "")}`
          : entry.name.replace(".hbs", "");

        const content = fs.readFileSync(fullPath, "utf-8");
        const compiled = Handlebars.compile(content);
        this.compiledTemplates.set(templateName, compiled);

        // Also register as partial for nested templates (e.g., {{> system/base}})
        Handlebars.registerPartial(templateName, content);

        this.logger.debug(`Loaded template: ${templateName}`);
      }
    }
  }

  /**
   * Resolve a template name to a file path.
   */
  private resolveTemplatePath(templateName: string): string {
    return path.join(this.templateDir, `${templateName}.hbs`);
  }

  /**
   * Register common Handlebars helpers.
   */
  private registerHelpers(): void {
    // Equality helper
    Handlebars.registerHelper("eq", (a, b) => a === b);

    // Not equal helper
    Handlebars.registerHelper("neq", (a, b) => a !== b);

    // Greater than helper
    Handlebars.registerHelper("gt", (a, b) => a > b);

    // Less than helper
    Handlebars.registerHelper("lt", (a, b) => a < b);

    // Greater than or equal helper
    Handlebars.registerHelper("gte", (a, b) => a >= b);

    // Less than or equal helper
    Handlebars.registerHelper("lte", (a, b) => a <= b);

    // Logical AND helper
    Handlebars.registerHelper("and", (...args) => {
      // Remove options object from args
      args.pop();
      return args.every(Boolean);
    });

    // Logical OR helper
    Handlebars.registerHelper("or", (...args) => {
      // Remove options object from args
      args.pop();
      return args.some(Boolean);
    });

    // JSON stringify helper
    Handlebars.registerHelper("json", (obj) => JSON.stringify(obj, null, 2));

    // Date formatting helper
    Handlebars.registerHelper("formatDate", (date: Date | string) => {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    });

    // ISO date helper
    Handlebars.registerHelper("isoDate", (date: Date | string) => {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toISOString().split("T")[0];
    });

    // Truncate helper
    Handlebars.registerHelper("truncate", (str: string, len: number) => {
      if (!str) return "";
      if (str.length <= len) return str;
      return str.slice(0, len) + "...";
    });

    // Uppercase helper
    Handlebars.registerHelper("upper", (str: string) => str?.toUpperCase());

    // Lowercase helper
    Handlebars.registerHelper("lower", (str: string) => str?.toLowerCase());

    // Capitalize helper
    Handlebars.registerHelper("capitalize", (str: string) => {
      if (!str) return "";
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });

    // Default value helper
    Handlebars.registerHelper("default", (value, defaultValue) => {
      return value !== undefined && value !== null ? value : defaultValue;
    });

    // Array length helper
    Handlebars.registerHelper("length", (arr: unknown[]) => {
      return Array.isArray(arr) ? arr.length : 0;
    });

    // Array join helper
    Handlebars.registerHelper(
      "join",
      (arr: unknown[], separator: string = ", ") => {
        return Array.isArray(arr) ? arr.join(separator) : "";
      }
    );
  }
}
