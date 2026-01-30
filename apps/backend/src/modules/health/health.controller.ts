import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

class HealthResponseDto {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({
    summary: "Health check",
    description:
      "Returns the current health status of the API including uptime and environment",
  })
  @ApiResponse({
    status: 200,
    description: "Service is healthy",
    type: HealthResponseDto,
  })
  check(): HealthResponseDto {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    };
  }
}
