import {
  IsString,
  IsNotEmpty,
  Matches,
  IsOptional,
  IsBoolean,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AddDomainDto {
  @ApiProperty({ example: "acme.com", description: "Email domain to claim" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i, {
    message: "Invalid domain format",
  })
  domain: string;

  @ApiPropertyOptional({
    description: "Set as primary domain for organization",
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class DomainResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  domain: string;

  @ApiProperty()
  verified: boolean;

  @ApiProperty({ nullable: true })
  verifiedAt: Date | null;

  @ApiProperty()
  isPrimary: boolean;

  @ApiProperty({ required: false })
  verificationInstructions?: {
    recordType: string;
    recordName: string;
    recordValue: string;
    instructions: string;
  };
}

export class VerifyDomainResponseDto {
  @ApiProperty()
  verified: boolean;

  @ApiProperty({ nullable: true })
  message: string;
}
