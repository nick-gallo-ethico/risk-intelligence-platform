import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { PrismaModule } from "../prisma/prisma.module";
import { ActivityModule } from "../../common/activity.module";

/**
 * Module for user management within organizations.
 *
 * Provides:
 * - User CRUD operations (admin-only for mutations)
 * - User listing with filters and pagination
 * - Current user profile endpoint
 *
 * The UsersService is exported for use by other modules
 * that need to validate or lookup users (e.g., AuthModule).
 */
@Module({
  imports: [PrismaModule, ActivityModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
