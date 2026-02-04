/**
 * Directives Types - Type definitions for client directive management.
 *
 * Directives are client-specific scripts that operators read during calls.
 * They can be opening statements, category-specific guidance, or closing scripts.
 */

import { ClientDirective, DirectiveStage, Category } from '@prisma/client';

/**
 * A ClientDirective with its category relation included.
 */
export interface DirectiveWithCategory extends ClientDirective {
  category: Pick<Category, 'id' | 'name' | 'code'> | null;
}

/**
 * Grouped directives for all stages of a call.
 * This structure is returned by getDirectivesForCall() to provide
 * all directives an operator needs in a single request.
 */
export interface CallDirectives {
  /** Opening directives - read at the start of the call */
  opening: DirectiveWithCategory[];

  /** Intake directives - general guidance during intake process */
  intake: DirectiveWithCategory[];

  /** Category-specific directives - loaded when category is selected */
  categorySpecific: DirectiveWithCategory[];

  /** Closing directives - read at the end of the call */
  closing: DirectiveWithCategory[];
}

/**
 * Grouped directives by stage for admin display.
 * Similar to CallDirectives but uses DirectiveStage enum keys.
 */
export interface DirectivesByStage {
  [DirectiveStage.OPENING]: DirectiveWithCategory[];
  [DirectiveStage.INTAKE]: DirectiveWithCategory[];
  [DirectiveStage.CATEGORY_SPECIFIC]: DirectiveWithCategory[];
  [DirectiveStage.CLOSING]: DirectiveWithCategory[];
}

/**
 * Options for querying directives.
 */
export interface GetDirectivesOptions {
  /** Filter by stage */
  stage?: DirectiveStage;

  /** Filter by category (for CATEGORY_SPECIFIC stage) */
  categoryId?: string;

  /** Include inactive directives (default: false) */
  includeInactive?: boolean;
}
