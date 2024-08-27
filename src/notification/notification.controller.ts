import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto, UpdateReadStatusDto, markAllReadDto } from './dto/create-notification.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { ReqUser } from 'src/decorators/user.decorator';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { ReadNotification } from './entities/notification.entity';
import { IPagination, IPaginationSwagger } from 'src/shared/paginationEum';

@Controller('notification')
@ApiTags('notification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }


  @Get('getAllNotification')
  findAll(@ReqUser() user) {
    return this.notificationService.findAll(user);
  }


  @Post("/mark-asRead")
  async updateReadStatus(
    @Body() updateReadStatusDto: UpdateReadStatusDto, @ReqUser() user
  ) {
    updateReadStatusDto.userId = user.id;
    return this.notificationService.updateReadStatus(updateReadStatusDto);
  }

  @Post("/mark-all-asRead")
  async markAllAsRead(
    @Body() updateReadStatusDto: markAllReadDto, @ReqUser() user
  ) {
    updateReadStatusDto.userId = user.id;
    return this.notificationService.updateMultipleReadStatus(updateReadStatusDto);
  }

  @Post("/removeNotification")
  async removeNotification(
    @Body() updateReadStatusDto: UpdateReadStatusDto, @ReqUser() user
  ) {
    updateReadStatusDto.userId = user.id;
    return this.notificationService.removeNotification(updateReadStatusDto);
  }

  @Post("pagination")
  @ApiBody({
    schema: {
      type: "object",
      properties: IPaginationSwagger,
    },
  })
  paginationBW(@Body() pagination: IPagination, @ReqUser() user) {
    return this.notificationService.pagination(user, pagination);
  }
}
