import { Module } from "@nestjs/common";
import { SavedViewsService } from "./saved-views.service";
import { SavedViewsController } from "./saved-views.controller";

/**
 * Module for saved views management.
 *
 * Provides functionality for users to save, manage, and apply
 * filtered views across Cases, RIUs, Investigations, and other entities.
 */
@Module({
  controllers: [SavedViewsController],
  providers: [SavedViewsService],
  exports: [SavedViewsService],
})
export class SavedViewsModule {}
