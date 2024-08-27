import { Module } from '@nestjs/common';
import { NotificationSettingService } from './notification_setting.service';
import { NotificationSettingController } from './notification_setting.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationSetting } from './entities/notification_setting.entity';

@Module({
  imports:[TypeOrmModule.forFeature([NotificationSetting])],
  controllers: [NotificationSettingController],
  providers: [NotificationSettingService],
})
export class NotificationSettingModule {}
