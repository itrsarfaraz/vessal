import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification, ReadNotification } from './entities/notification.entity';
import { NotificationSetting } from 'src/notification_setting/entities/notification_setting.entity';
import { Vessel } from 'src/vessel/entities/vessel.entity';
import { User_Vessel } from 'src/user/entities/user.entity';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService],
  imports: [TypeOrmModule.forFeature([ReadNotification,Notification, NotificationSetting,User_Vessel])],
  exports: [NotificationService]
})
export class NotificationModule { }
