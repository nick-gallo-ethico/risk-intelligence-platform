import { Module } from "@nestjs/common";
import { CasesController } from "./cases.controller";
import { CasesService } from "./cases.service";
import { CasePipelineService } from "./case-pipeline.service";
import { CaseMergeService } from "./case-merge.service";
import { PrismaModule } from "../prisma/prisma.module";
import { ExportsModule } from "../analytics/exports/exports.module";

@Module({
  imports: [PrismaModule, ExportsModule],
  controllers: [CasesController],
  providers: [CasesService, CasePipelineService, CaseMergeService],
  exports: [CasesService, CasePipelineService, CaseMergeService],
})
export class CasesModule {}
