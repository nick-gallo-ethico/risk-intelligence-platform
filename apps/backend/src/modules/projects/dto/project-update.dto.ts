import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTaskUpdateDto {
  @ApiProperty({ description: "Update content (rich text HTML)" })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: "Array of mentioned user IDs",
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsUUID("4", { each: true })
  mentionedUserIds?: string[];

  @ApiPropertyOptional({ description: "Parent update ID for threaded replies" })
  @IsUUID()
  @IsOptional()
  parentUpdateId?: string;
}

export class UpdateTaskUpdateDto {
  @ApiProperty({ description: "Updated content" })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: "Array of mentioned user IDs",
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsUUID("4", { each: true })
  mentionedUserIds?: string[];
}

export class AddReactionDto {
  @ApiProperty({ description: "Emoji identifier", example: "thumbsup" })
  @IsString()
  @IsNotEmpty()
  emoji: string;
}

export class SubscribeToTaskDto {
  @ApiProperty({ description: "User ID to subscribe" })
  @IsUUID()
  userId: string;
}

export class CreateTaskDependencyDto {
  @ApiProperty({ description: "ID of the task this task depends on" })
  @IsUUID()
  dependsOnTaskId: string;

  @ApiPropertyOptional({
    description: "Dependency type",
    enum: [
      "FINISH_TO_START",
      "START_TO_START",
      "FINISH_TO_FINISH",
      "START_TO_FINISH",
    ],
    default: "FINISH_TO_START",
  })
  @IsString()
  @IsOptional()
  type?: string;
}
