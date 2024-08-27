import { KeyVaultModule } from './../kayvault/KeyVaultModule';
import { Module } from '@nestjs/common';
import { OfflineService } from './offline.service';
import { OfflineController } from './offline.controller';
import { SharedModule } from 'src/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeneralComment, Inspection, inspection_images, inspection_questions, InspectionType } from 'src/inspection/entities/inspection.entity';
import { ChecklistTemplateQuestion } from 'src/checklist_template/entities/checklist_template.entity';
import { InspectionActionPlan } from 'src/inspection-action-plan/entities/inspection-action-plan.entity';
import { Vessel } from 'src/vessel/entities/vessel.entity';
import { User_Vessel } from 'src/user/entities/user.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { InspectionAdditionalInfo } from 'src/inspection_additional_info/entities/inspection_additional_info.entity';
import { NotificationSetting } from 'src/notification_setting/entities/notification_setting.entity';
import { PdfGateway } from 'src/geteway/pdf.gateway';

@Module({
  imports:[SharedModule,KeyVaultModule,TypeOrmModule.forFeature([InspectionAdditionalInfo,NotificationSetting,Inspection,InspectionType,inspection_questions,ChecklistTemplateQuestion,inspection_images,InspectionActionPlan,Vessel,GeneralComment,User_Vessel]),NotificationModule],
  controllers: [OfflineController],
  providers: [OfflineService,PdfGateway],
})
export class OfflineModule {}
