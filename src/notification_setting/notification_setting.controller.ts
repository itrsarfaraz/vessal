import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { NotificationSettingService } from './notification_setting.service';
import { CreateNotificationSettingDto } from './dto/create-notification_setting.dto';
import { UpdateNotificationSettingDto } from './dto/update-notification_setting.dto';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

@Controller('notification-setting')
@ApiTags('notification-setting')

export class NotificationSettingController {
  constructor(private readonly notificationSettingService: NotificationSettingService) {}

  @Post('create-or-update')
  create(@Body() createNotificationSettingDto: CreateNotificationSettingDto) {
    return this.notificationSettingService.creatEnabled(createNotificationSettingDto);
  }

  @Get("getNotification/settings")
  @ApiQuery({name: "userId", description: "enter userId where notification need to fetch",example: new Date().getMilliseconds()})
  async findAll(@Query("userId") userId: string) {
    return await this.notificationSettingService.findAll(userId);
  }
  @Post('Update')
  createOrupdate(@Body() createNotificationSettingDto :CreateNotificationSettingDto){
  return this.notificationSettingService.createOrUpdate(createNotificationSettingDto)
  }
  
 
  }

