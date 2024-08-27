import { KeyVaultService } from './../kayvault/KeyVaultService ';
// src/auth/auth.controller.ts
import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, Query, Req, Res, UseFilters, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AzureAdAuthGuard } from './azure-ad.guard';
import { ViewAuthFilter } from 'src/exception/UnauthorizedException';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { MobileLoginDto } from 'src/user/dto/create-user.dto';
import { WriteResponse } from 'src/shared/response';
import { Role } from 'src/shared/enum/Role';
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly KeyVaultService: KeyVaultService) { }
  @Get('azuread')
  @UseGuards(AzureAdAuthGuard)
  @UseFilters(ViewAuthFilter)
  azureAdLogin(@Req() req: any) {
  }

  @Post('azuread/callback')
  @UseGuards(AzureAdAuthGuard)
  azureAdCallback(@Req() req: any, @Res() res: Response) {
    // Handle the callback from Azure AD and complete the login process
    res.redirect(`${process.env.SERVER_URL}/sign-in?token=${req.user?.token}`); // Redirect to the home page or another route after login


    // we are enable keyvalut in production after configure keyvalut on azure

    //   const serverUrl = await this.KeyVaultService.getSecret('PROD-DB-SERVER_URL');
    //   res.redirect(`${serverUrl}/sign-in?token=${req.user?.token}`);
  }

  @Post('mobile-login')
  async mobileLogin(@Body() mobileLoginDto: MobileLoginDto): Promise<any> {
    if (!mobileLoginDto.email) {
      return WriteResponse(400, false, "Email is required.")
    }
    const user = await this.authService.loginWithMobile(mobileLoginDto);
    if (!user) {
      return WriteResponse(400, false, "Invalid token or user creation failed")
    }
    if (user.role == Role.Inspector || user.role == Role.SuperAdmin) {
      return WriteResponse(200, user, "success");
    }
    throw new ForbiddenException('You do not have access to this application. Please contact support or the administrator.');

  }
}
