// src/auth/azure-ad.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AzureAdAuthGuard extends AuthGuard('azure-ad') {
  canActivate(context: ExecutionContext) {
    // Add custom authorization logic here if needed
    return super.canActivate(context);
  }
}
