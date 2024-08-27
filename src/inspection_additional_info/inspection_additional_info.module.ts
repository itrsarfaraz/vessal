import { Module } from '@nestjs/common';
import { InspectionAdditionalInfoService } from './inspection_additional_info.service';
import { InspectionAdditionalInfoController } from './inspection_additional_info.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectionAdditionalInfo } from './entities/inspection_additional_info.entity';
import { SharedModule } from 'src/shared/shared.module';

@Module({imports:[SharedModule, TypeOrmModule.forFeature([InspectionAdditionalInfo])],
  controllers: [InspectionAdditionalInfoController],
  providers: [InspectionAdditionalInfoService],
})
export class InspectionAdditionalInfoModule {}
