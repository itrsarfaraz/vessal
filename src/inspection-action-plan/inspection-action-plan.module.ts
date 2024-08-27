import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectionActionPlan } from './entities/inspection-action-plan.entity';
import { InspectionActionPlanImages } from './entities/inspection-action-plan.entity';
import { InspectionActionPlanService } from './inspection-action-plan.service';
import { InspectionActionPlanController } from './inspection-action-plan.controller';
import { SharedModule } from 'src/shared/shared.module';
import { Inspection, inspection_questions } from 'src/inspection/entities/inspection.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { User_Vessel } from 'src/user/entities/user.entity';
import { PdfGateway } from 'src/geteway/pdf.gateway';
import { NotificationSetting } from 'src/notification_setting/entities/notification_setting.entity';
import { KeyVaultModule } from 'src/kayvault/KeyVaultModule';

@Module({
  imports: [SharedModule, NotificationModule,KeyVaultModule, TypeOrmModule.forFeature([InspectionActionPlan,NotificationSetting, User_Vessel, InspectionActionPlanImages, Inspection, inspection_questions])],
  providers: [InspectionActionPlanService,PdfGateway],
  controllers: [InspectionActionPlanController],
})
export class InspectionActionPlanModule { }
