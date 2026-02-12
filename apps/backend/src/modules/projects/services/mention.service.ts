/**
 * MentionService - Extracts and validates @mentions from rich text content.
 *
 * Supports two mention formats:
 * 1. HTML: <span data-mention-id="userId">@Name</span>
 * 2. Markdown-style: @[Name](userId)
 *
 * Used by the project task conversation system for notifying mentioned users.
 */

import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Result of mention extraction and validation.
 */
export interface MentionExtractionResult {
  /** All user IDs found in the content */
  mentionedUserIds: string[];
  /** Count of mentions found */
  mentionCount: number;
}

/**
 * Validated mention result with user details.
 */
export interface ValidatedMention {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

@Injectable()
export class MentionService {
  private readonly logger = new Logger(MentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Extract user IDs from content containing @mention spans.
   *
   * Supports two formats:
   * 1. HTML: <span data-mention-id="userId">@Name</span>
   * 2. Plaintext: @[Name](userId) (Markdown-style fallback)
   *
   * @param content - Raw content string (HTML or markdown)
   * @returns Array of unique user IDs found in content
   */
  extractMentions(content: string): string[] {
    if (!content || typeof content !== "string") {
      return [];
    }

    const mentions = new Set<string>();

    // HTML data attribute pattern: data-mention-id="uuid"
    // Matches UUID format (with or without dashes)
    const htmlPattern = /data-mention-id="([a-f0-9-]{36}|[a-f0-9]{32})"/gi;
    let match: RegExpExecArray | null;

    while ((match = htmlPattern.exec(content)) !== null) {
      const userId = match[1];
      if (this.isValidUUID(userId)) {
        mentions.add(userId);
      }
    }

    // Markdown-style fallback pattern: @[Name](userId)
    // Allows names with spaces, dashes, apostrophes
    const mdPattern = /@\[([^\]]+)\]\(([a-f0-9-]{36}|[a-f0-9]{32})\)/gi;

    while ((match = mdPattern.exec(content)) !== null) {
      const userId = match[2];
      if (this.isValidUUID(userId)) {
        mentions.add(userId);
      }
    }

    const result = Array.from(mentions);

    if (result.length > 0) {
      this.logger.debug(`Extracted ${result.length} mention(s) from content`);
    }

    return result;
  }

  /**
   * Extract mentions and return structured result.
   *
   * @param content - Raw content string
   * @returns Structured extraction result
   */
  extractMentionsWithCount(content: string): MentionExtractionResult {
    const mentionedUserIds = this.extractMentions(content);
    return {
      mentionedUserIds,
      mentionCount: mentionedUserIds.length,
    };
  }

  /**
   * Validate that mentioned user IDs exist in the organization.
   * Returns only valid user IDs (filters out invalid/deleted users).
   *
   * @param userIds - Array of user IDs to validate
   * @param organizationId - Organization ID for tenant scoping
   * @returns Array of valid user IDs that exist in the organization
   */
  async validateMentions(
    userIds: string[],
    organizationId: string,
  ): Promise<string[]> {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    // Filter to valid UUIDs first
    const validUUIDs = userIds.filter((id) => this.isValidUUID(id));
    if (validUUIDs.length === 0) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: validUUIDs },
        organizationId,
        isActive: true, // Only active users can be mentioned
      },
      select: { id: true },
    });

    const validIds = users.map((u) => u.id);

    if (validIds.length !== userIds.length) {
      this.logger.debug(
        `Validated ${validIds.length} of ${userIds.length} mentioned users`,
      );
    }

    return validIds;
  }

  /**
   * Extract and validate mentions in one call.
   * Returns full user details for notification purposes.
   *
   * @param content - Raw content string
   * @param organizationId - Organization ID for tenant scoping
   * @returns Array of validated user details
   */
  async extractAndValidateMentions(
    content: string,
    organizationId: string,
  ): Promise<ValidatedMention[]> {
    const userIds = this.extractMentions(content);
    if (userIds.length === 0) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        organizationId,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    return users.map((u) => ({
      userId: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
    }));
  }

  /**
   * Check if a user is mentioned in the content.
   *
   * @param content - Raw content string
   * @param userId - User ID to check for
   * @returns True if user is mentioned
   */
  isUserMentioned(content: string, userId: string): boolean {
    if (!content || !userId) {
      return false;
    }
    const mentions = this.extractMentions(content);
    return mentions.includes(userId);
  }

  /**
   * Validate UUID format.
   * Accepts both dashed (8-4-4-4-12) and non-dashed (32 hex chars) formats.
   *
   * @param str - String to validate
   * @returns True if valid UUID format
   */
  private isValidUUID(str: string): boolean {
    if (!str) return false;

    // UUID with dashes: 8-4-4-4-12 format
    const uuidWithDashes =
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

    // UUID without dashes: 32 hex chars
    const uuidWithoutDashes = /^[a-f0-9]{32}$/i;

    return uuidWithDashes.test(str) || uuidWithoutDashes.test(str);
  }
}
