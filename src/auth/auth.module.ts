// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AzureAdStrategy } from './azure-ad.strategy';
import { AuthController } from './auth.controller';
import { AzureAdAuthGuard } from './azure-ad.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { KeyVaultModule } from 'src/kayvault/KeyVaultModule';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'azure-ad', session: false }),KeyVaultModule, TypeOrmModule.forFeature([User])],
  providers: [AzureAdStrategy, AzureAdAuthGuard, JwtService, AuthService],
  controllers: [AuthController],

})
export class AuthModule { }
