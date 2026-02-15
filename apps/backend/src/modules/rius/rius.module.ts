import { Module } from "@nestjs/common";
import { RiusService } from "./rius.service";
import { RiuAccessService } from "./riu-access.service";
import { RiusController } from "./rius.controller";
import { RiuAccessController } from "./riu-access.controller";
import {
  HotlineRiuService,
  DisclosureRiuService,
  WebFormRiuService,
} from "./extensions";
import { RiuQueryService } from "./services/riu-query.service";
import { RiuFormDataService } from "./services/riu-form-data.service";
import { RiuUpdateService } from "./services/riu-update.service";

/**
 * RIU (Risk Intelligence Unit) Module
 *
 * Provides services for managing RIUs - immutable intake records.
 * RIU content is frozen at creation; only status and AI enrichment can change.
 *
 * Services:
 * - RiusService: Thin coordinator delegating to sub-services
 * - RiuQueryService: Read operations (find, list)
 * - RiuFormDataService: Form data structuring for UI
 * - RiuUpdateService: Update operations (status, AI enrichment, language)
 * - RiuAccessService: Anonymous access code generation and lookup
 *
 * Extension services manage type-specific data:
 * - HotlineRiuService: Call metadata and QA workflow
 * - DisclosureRiuService: Value tracking and conflict detection
 * - WebFormRiuService: Form metadata and validation tracking
 *
 * Controllers:
 * - RiusController: Authenticated endpoints for RIU operations
 * - RiuAccessController: Public endpoints for anonymous status check and messaging
 */
@Module({
  controllers: [RiusController, RiuAccessController],
  providers: [
    RiusService,
    RiuAccessService,
    RiuQueryService,
    RiuFormDataService,
    RiuUpdateService,
    HotlineRiuService,
    DisclosureRiuService,
    WebFormRiuService,
  ],
  exports: [
    RiusService,
    RiuAccessService,
    RiuQueryService,
    RiuFormDataService,
    RiuUpdateService,
    HotlineRiuService,
    DisclosureRiuService,
    WebFormRiuService,
  ],
})
export class RiusModule {}
