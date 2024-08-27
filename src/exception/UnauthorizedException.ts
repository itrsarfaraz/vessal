import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { UnauthorizedException } from '@nestjs/common';
import { KeyVaultService } from '../kayvault/KeyVaultService '; // Adjust the path as necessary

// we are enable keyvalut in production after configure keyvalut on azure

// let clientUrl: string;
// async function initializeClientUrl() {
//   const keyVaultService = new KeyVaultService();
//   const serverUrl = await keyVaultService.getSecret('SERVER_URL');
//   clientUrl = `${serverUrl}/account/login?error=unauthorize`;
// }

// initializeClientUrl();

const clientUrl = `${process.env.SERVER_URL}/account/login?error=unauthorize`;

@Catch(UnauthorizedException)
export class ViewAuthFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    response.status(status).redirect(clientUrl);
  }
}
