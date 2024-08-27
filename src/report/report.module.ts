import { User_Vessel } from './../user/entities/user.entity';
import { NotificationSetting } from './../notification_setting/entities/notification_setting.entity';
import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inspection, inspection_images, inspection_questions } from 'src/inspection/entities/inspection.entity';
import { Report } from './entities/report.entity';
import { PdfGateway } from 'src/geteway/pdf.gateway';
import { FleetService } from './fleet.service';
import { Vessel } from 'src/vessel/entities/vessel.entity';
import { Category } from 'src/category/entities/category.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { FilesAzureService } from 'src/blob-storage/blob-storage.service';

@Module({
  imports:[TypeOrmModule.forFeature([Inspection,NotificationSetting,User_Vessel,inspection_questions,inspection_images,Report,Vessel,Category]),NotificationModule],
  controllers: [ReportController],
  providers: [ReportService,PdfGateway,FleetService, FilesAzureService],
})
export class ReportModule {}
