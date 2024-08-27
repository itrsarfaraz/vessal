import { Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { KeyVaultModule } from './kayvault/KeyVaultModule';

@Module({
  imports:[KeyVaultModule],
  providers: [ConfigService],
  exports: [ConfigService], // Export the ConfigService
})
export class ConfigModule {}
