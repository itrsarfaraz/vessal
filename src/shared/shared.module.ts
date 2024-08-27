// src/shared/shared.module.ts
import { Module } from '@nestjs/common';
import { FilesAzureService } from 'src/blob-storage/blob-storage.service';

@Module({
  providers: [FilesAzureService],
  exports: [FilesAzureService],
})
export class SharedModule {}
