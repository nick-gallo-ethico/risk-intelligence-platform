import { Module } from "@nestjs/common";
import { PersonsController } from "./persons.controller";
import { PersonsService } from "./persons.service";
import { PrismaModule } from "../prisma/prisma.module";

/**
 * PersonsModule provides CRUD operations for Person records.
 * Person is the foundation for people-based pattern detection -
 * employees, external contacts, and anonymous reporters all become Person records.
 *
 * Exports PersonsService for use by other modules (e.g., RIUs, Cases).
 */
@Module({
  imports: [PrismaModule],
  controllers: [PersonsController],
  providers: [PersonsService],
  exports: [PersonsService],
})
export class PersonsModule {}
