import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomPropertiesService } from './custom-properties.service';
import { CustomPropertiesController } from './custom-properties.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CustomPropertiesController],
  providers: [CustomPropertiesService],
  exports: [CustomPropertiesService],
})
export class CustomPropertiesModule {}
