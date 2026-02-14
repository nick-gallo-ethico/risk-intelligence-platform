import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as Handlebars from "handlebars";
import * as fs from "fs";
import * as path from "path";
import mjml2html from "mjml";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Context variables for email template rendering.
 */
export interface EmailTemplateContext {
  org?: {
    name: string;
    branding?: {
      logoUrl?: string;
      primaryColor?: string;
      contactEmail?: string;
    };
  };
  user?: {
    name: string;
    email: string;
  };
  case?: {
    id: string;
    referenceNumber: string;
    categoryName: string;
    severity: string;
    dueDate?: Date | string;
    status?: string;
  };
  investigation?: {
    id: string;
    caseId: string;
    status?: string;
  };
  assignedBy?: {
    name: string;
  };
  recipient?: {
    name: string;
    email: string;
    language?: string;
  };
  appUrl?: string;
  hoursRemaining?: number;
  daysRemaining?: number;
  hoursOverdue?: number;
  daysOverdue?: number;
  isTransactional?: boolean;
  [key: string]: unknown;
}

/**
 * Result of retrieving a template.
 */
export interface TemplateResult {
  mjmlContent: string;
  subjectTemplate: string;
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
 * Parameters for saving a template.
 */
export interface SaveTemplateParams {
  organizationId: string;
  name: string;
  mjmlContent: string;
  subjectTemplate: string;
  description?: string;
}

/**
 * Rendered email output.
 */
export interface RenderedEmail {
  subject: string;
  html: string;
}

/**
 * EmailTemplateService manages MJML email templates with Handlebars templating.
 *
 * Features:
 * - Loads templates from filesystem on startup
 * - Supports organization-specific overrides via database
 * - Compiles MJML to responsive HTML
 * - Provides version history and rollback capability
 * - Registers partials for shared components (header, footer, styles)
 *
 * Template naming convention:
 * - base/layout - Main layout wrapper
 * - base/header - Email header with branding
 * - base/footer - Email footer with legal/unsubscribe
 * - base/styles - Shared MJML class definitions
 * - assignment/case-assigned - Case assignment notification
 * - deadline/sla-warning - SLA warning notification
 * - deadline/sla-breach - SLA breach notification
 */
@Injectable()
export class EmailTemplateService implements OnModuleInit {
  private readonly logger = new Logger(EmailTemplateService.name);
  private readonly compiledTemplates = new Map<
    string,
    Handlebars.TemplateDelegate
  >();
  private readonly subjectTemplates = new Map<
    string,
    Handlebars.TemplateDelegate
  >();
  private readonly rawTemplates = new Map<string, string>();
  private readonly templateDir: string;

  constructor(private readonly prisma: PrismaService) {
    // Templates are in the templates directory relative to this file
    this.templateDir = path.join(__dirname, "..", "templates");
  }

  async onModuleInit(): Promise<void> {
    await this.loadFileTemplates();
    this.registerHelpers();
    await this.loadSubjectTemplates();
    this.logger.log(`Loaded ${this.compiledTemplates.size} email templates`);
  }

  /**
   * Render an email template with context.
   * Checks database for org-specific override, falls back to file template.
   *
   * @param templateName - Template name (e.g., 'assignment/case-assigned')
   * @param context - Variables to inject into the template
   * @param organizationId - Optional org ID for custom templates
   * @returns Rendered subject and HTML
   */
  async render(
    templateName: string,
    context: EmailTemplateContext,
    organizationId?: string,
  ): Promise<RenderedEmail> {
    // Add default values
    context.appUrl =
      context.appUrl || process.env.APP_URL || "https://app.ethico.com";
    context.isTransactional = context.isTransactional ?? true;

    let mjmlContent: string | undefined;
    let subjectTemplateStr: string | undefined;

    // Check for organization-specific override in database
    if (organizationId) {
      const dbTemplate = await this.prisma.emailTemplate.findFirst({
        where: {
          organizationId,
          name: templateName,
          isActive: true,
        },
        orderBy: { version: "desc" },
      });

      if (dbTemplate) {
        mjmlContent = dbTemplate.mjmlContent;
        subjectTemplateStr = dbTemplate.subjectTemplate;
      }
    }

    // Fall back to file template
    if (!mjmlContent) {
      const rawTemplate = this.rawTemplates.get(templateName);
      if (!rawTemplate) {
        throw new Error(`Email template not found: ${templateName}`);
      }
      mjmlContent = rawTemplate;
    }

    let renderedSubject: string;
    if (subjectTemplateStr) {
      const compiledSubject = Handlebars.compile(subjectTemplateStr);
      renderedSubject = compiledSubject(context);
    } else {
      const compiledSubject = this.subjectTemplates.get(templateName);
      if (!compiledSubject) {
        throw new Error(`Subject template not found: ${templateName}`);
      }
      renderedSubject = compiledSubject(context);
    }

    // First pass: Render Handlebars template
    const handlebarsCompiled = Handlebars.compile(mjmlContent);
    const renderedMjml = handlebarsCompiled(context);

    // Second pass: Compile MJML to HTML
    const { html, errors } = mjml2html(renderedMjml, {
      validationLevel: "soft",
      minify: true,
    });

    if (errors && errors.length > 0) {
      this.logger.warn(
        `MJML compilation warnings for ${templateName}: ${JSON.stringify(errors)}`,
      );
    }

    return {
      subject: renderedSubject,
      html,
    };
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
    organizationId?: string,
  ): Promise<TemplateResult> {
    if (organizationId) {
      const dbTemplate = await this.prisma.emailTemplate.findFirst({
        where: {
          organizationId,
          name: templateName,
          isActive: true,
        },
        orderBy: { version: "desc" },
      });

      if (dbTemplate) {
        return {
          mjmlContent: dbTemplate.mjmlContent,
          subjectTemplate: dbTemplate.subjectTemplate,
          source: "database",
          version: dbTemplate.version,
        };
      }
    }

    const mjmlContent = this.rawTemplates.get(templateName);
    const subjectCompiled = this.subjectTemplates.get(templateName);

    if (!mjmlContent) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Read subject from _subjects.json
    const subjectsPath = path.join(this.templateDir, "_subjects.json");
    let subjectTemplate = "";
    if (fs.existsSync(subjectsPath)) {
      const subjects = JSON.parse(fs.readFileSync(subjectsPath, "utf-8"));
      subjectTemplate = subjects[templateName] || "";
    }

    return {
      mjmlContent,
      subjectTemplate,
      source: "file",
    };
  }

  /**
   * Save a custom template version for an organization.
   * Creates a new version and deactivates previous versions.
   *
   * @param params - Template save parameters
   * @returns Created template ID and version
   */
  async saveTemplate(
    params: SaveTemplateParams,
  ): Promise<{ id: string; version: number }> {
    // Validate MJML before saving
    const { errors } = mjml2html(params.mjmlContent, {
      validationLevel: "strict",
    });

    if (errors && errors.length > 0) {
      throw new Error(`Invalid MJML template: ${JSON.stringify(errors)}`);
    }

    // Get current version
    const current = await this.prisma.emailTemplate.findFirst({
      where: {
        organizationId: params.organizationId,
        name: params.name,
      },
      orderBy: { version: "desc" },
    });

    const newVersion = (current?.version || 0) + 1;

    // Deactivate previous versions
    if (current) {
      await this.prisma.emailTemplate.updateMany({
        where: {
          organizationId: params.organizationId,
          name: params.name,
        },
        data: { isActive: false },
      });
    }

    // Create new version
    const template = await this.prisma.emailTemplate.create({
      data: {
        organizationId: params.organizationId,
        name: params.name,
        version: newVersion,
        mjmlContent: params.mjmlContent,
        subjectTemplate: params.subjectTemplate,
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
    return Array.from(this.compiledTemplates.keys()).filter(
      (name) => !name.startsWith("base/"),
    );
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
    organizationId: string,
  ): Promise<TemplateHistoryEntry[]> {
    const templates = await this.prisma.emailTemplate.findMany({
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
    version: number,
  ): Promise<void> {
    const template = await this.prisma.emailTemplate.findFirst({
      where: {
        organizationId,
        name: templateName,
        version,
      },
    });

    if (!template) {
      throw new Error(
        `Template version not found: ${templateName} v${version}`,
      );
    }

    // Deactivate all versions
    await this.prisma.emailTemplate.updateMany({
      where: {
        organizationId,
        name: templateName,
      },
      data: { isActive: false },
    });

    // Activate the target version
    await this.prisma.emailTemplate.update({
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
    organizationId: string,
  ): Promise<void> {
    await this.prisma.emailTemplate.deleteMany({
      where: {
        organizationId,
        name: templateName,
      },
    });
  }

  /**
   * Preview a template with sample data without saving.
   *
   * @param mjmlContent - MJML template content
   * @param context - Sample context data
   * @returns Rendered HTML
   */
  async preview(
    mjmlContent: string,
    context: EmailTemplateContext,
  ): Promise<{ html: string; errors?: string[] }> {
    // Render Handlebars
    const handlebarsCompiled = Handlebars.compile(mjmlContent);
    const renderedMjml = handlebarsCompiled(context);

    // Compile MJML
    const { html, errors } = mjml2html(renderedMjml, {
      validationLevel: "soft",
    });

    return {
      html,
      errors: errors?.map((e) => e.message),
    };
  }

  /**
   * Load all templates from the file system.
   */
  private async loadFileTemplates(): Promise<void> {
    await this.loadTemplatesFromDir(this.templateDir, "");
  }

  /**
   * Load subject templates from _subjects.json file.
   */
  private async loadSubjectTemplates(): Promise<void> {
    const subjectsPath = path.join(this.templateDir, "_subjects.json");
    if (!fs.existsSync(subjectsPath)) {
      this.logger.warn("Subject templates file not found: _subjects.json");
      return;
    }

    const subjects = JSON.parse(fs.readFileSync(subjectsPath, "utf-8"));
    for (const [templateName, subjectTemplate] of Object.entries(subjects)) {
      const compiled = Handlebars.compile(subjectTemplate as string);
      this.subjectTemplates.set(templateName, compiled);
    }

    this.logger.log(`Loaded ${this.subjectTemplates.size} subject templates`);
  }

  /**
   * Recursively load templates from a directory.
   */
  private async loadTemplatesFromDir(
    dir: string,
    prefix: string,
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
      } else if (entry.name.endsWith(".mjml.hbs")) {
        const templateName = prefix
          ? `${prefix}/${entry.name.replace(".mjml.hbs", "")}`
          : entry.name.replace(".mjml.hbs", "");

        const content = fs.readFileSync(fullPath, "utf-8");

        // Store raw template for rendering
        this.rawTemplates.set(templateName, content);

        // Compile for quick validation
        const compiled = Handlebars.compile(content);
        this.compiledTemplates.set(templateName, compiled);

        // Register as partial for nested templates (e.g., {{> base/header}})
        Handlebars.registerPartial(templateName, content);

        this.logger.debug(`Loaded email template: ${templateName}`);
      }
    }
  }

  /**
   * Register common Handlebars helpers for email templates.
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

    // Logical AND helper
    Handlebars.registerHelper("and", (...args) => {
      args.pop(); // Remove options object
      return args.every(Boolean);
    });

    // Logical OR helper
    Handlebars.registerHelper("or", (...args) => {
      args.pop(); // Remove options object
      return args.some(Boolean);
    });

    // Default value helper
    Handlebars.registerHelper("default", (value, defaultValue) => {
      return value !== undefined && value !== null ? value : defaultValue;
    });

    // Date formatting helper
    Handlebars.registerHelper("formatDate", (date: Date | string) => {
      if (!date) return "";
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    });

    // Date and time formatting helper
    Handlebars.registerHelper("formatDateTime", (date: Date | string) => {
      if (!date) return "";
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    });

    // Relative time helper (e.g., "in 24 hours", "2 days ago")
    Handlebars.registerHelper("relativeTime", (hours: number) => {
      if (!hours) return "";
      if (hours < 0) {
        const absHours = Math.abs(hours);
        if (absHours < 24) {
          return `${absHours} hour${absHours !== 1 ? "s" : ""} ago`;
        }
        const days = Math.floor(absHours / 24);
        return `${days} day${days !== 1 ? "s" : ""} ago`;
      }
      if (hours < 24) {
        return `in ${hours} hour${hours !== 1 ? "s" : ""}`;
      }
      const days = Math.floor(hours / 24);
      return `in ${days} day${days !== 1 ? "s" : ""}`;
    });

    // Urgent badge helper for high priority items
    Handlebars.registerHelper("urgentBadge", (severity: string) => {
      if (severity === "HIGH" || severity === "CRITICAL") {
        return new Handlebars.SafeString(
          '<span style="background-color: #dc2626; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">URGENT</span>',
        );
      }
      return "";
    });

    // Severity color helper
    Handlebars.registerHelper("severityColor", (severity: string) => {
      switch (severity) {
        case "CRITICAL":
          return "#7f1d1d";
        case "HIGH":
          return "#dc2626";
        case "MEDIUM":
          return "#f59e0b";
        case "LOW":
          return "#22c55e";
        default:
          return "#6b7280";
      }
    });

    // Status color helper
    Handlebars.registerHelper("statusColor", (status: string) => {
      switch (status) {
        case "OPEN":
        case "IN_PROGRESS":
          return "#2563eb";
        case "COMPLETED":
        case "CLOSED":
          return "#22c55e";
        case "ON_HOLD":
          return "#f59e0b";
        case "CANCELLED":
          return "#6b7280";
        default:
          return "#374151";
      }
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

    // Array length helper
    Handlebars.registerHelper("length", (arr: unknown[]) => {
      return Array.isArray(arr) ? arr.length : 0;
    });
  }
}
