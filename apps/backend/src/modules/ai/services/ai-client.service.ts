import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import {
  CreateChatDto,
  StreamEvent,
  AiResponse,
  MessageRole,
} from "../dto/chat-message.dto";

@Injectable()
export class AiClientService implements OnModuleInit {
  private readonly logger = new Logger(AiClientService.name);
  private client: Anthropic | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>("ANTHROPIC_API_KEY");
    if (!apiKey) {
      this.logger.warn(
        "ANTHROPIC_API_KEY not set - AI features will be disabled",
      );
      return;
    }

    this.client = new Anthropic({ apiKey });
    this.logger.log("Anthropic client initialized");
  }

  isConfigured(): boolean {
    return !!this.client;
  }
}
