import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy, AzureAdStrategy, GoogleStrategy, SamlStrategy } from "./strategies";
import { DomainModule } from "./domain";
import { SsoModule } from "./sso";
import { MfaModule } from "./mfa";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("jwt.secret"),
        signOptions: {
          expiresIn: configService.get<string>("jwt.accessTokenExpiry", "15m"),
        },
      }),
    }),
    DomainModule,
    SsoModule,
    MfaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AzureAdStrategy, GoogleStrategy, SamlStrategy],
  exports: [AuthService, JwtModule, DomainModule, SsoModule, MfaModule],
})
export class AuthModule {}
