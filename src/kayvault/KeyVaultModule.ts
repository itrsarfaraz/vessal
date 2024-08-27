import { Module } from '@nestjs/common';
import { KeyVaultService } from './KeyVaultService ';


@Module({
  providers: [KeyVaultService],
  exports: [KeyVaultService],
})
export class KeyVaultModule {}
