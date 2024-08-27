import { KeyVaultModule } from './../kayvault/KeyVaultModule';
import { NotificationSetting } from './../notification_setting/entities/notification_setting.entity';
import { Module } from '@nestjs/common';
import { InspectionService } from './inspection.service';
import { InspectionController } from './inspection.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeneralComment, Inspection, InspectionType, QuestionHistory, inspection_images, inspection_questions } from './entities/inspection.entity';
import { ChecklistTemplateQuestion } from 'src/checklist_template/entities/checklist_template.entity';
import { FilesAzureService } from 'src/blob-storage/blob-storage.service';
import { InspectionCronService } from 'src/cronJobs/inspection-cron.service';
import { InspectionActionPlan } from 'src/inspection-action-plan/entities/inspection-action-plan.entity';
import { Vessel } from 'src/vessel/entities/vessel.entity';
import { SharedModule } from 'src/shared/shared.module';
import { NotificationModule } from 'src/notification/notification.module';
import { PdfGateway } from 'src/geteway/pdf.gateway';
import { User_Vessel } from 'src/user/entities/user.entity';
import { Questions } from 'src/questions/entities/question.entity';

@Module({
  imports: [SharedModule, KeyVaultModule, TypeOrmModule.forFeature([Inspection, QuestionHistory, InspectionType, NotificationSetting,
    inspection_questions, ChecklistTemplateQuestion, inspection_images, InspectionActionPlan, Vessel, GeneralComment, Questions,
    User_Vessel]), NotificationModule],
  controllers: [InspectionController],
  providers: [InspectionService, InspectionCronService, PdfGateway],
})
export class InspectionModule { }
