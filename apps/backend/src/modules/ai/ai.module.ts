import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AiClientService } from "./services/ai-client.service";

@Module({
  imports: [ConfigModule],
  providers: [AiClientService],
  exports: [AiClientService],
})
export class AiModule {}
