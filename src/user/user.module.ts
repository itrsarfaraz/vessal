import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import {  User, User_Info, User_Vessel } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/jwt/jwt.strategy';
import { SharedModule } from 'src/shared/shared.module';
import { Inspection } from 'src/inspection/entities/inspection.entity';
import { KeyVaultModule } from 'src/kayvault/KeyVaultModule';

@Module({
  imports: [
    SharedModule,KeyVaultModule,
    TypeOrmModule.forFeature([User,User_Info,User_Vessel,Inspection]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Replace with your own secret key
      signOptions: { expiresIn: '1d' }, // Set your desired expiration time
    }),
  ],

  controllers: [UserController],
  providers: [UserService,JwtStrategy],
  exports: [UserModule],
})
export class UserModule {}
