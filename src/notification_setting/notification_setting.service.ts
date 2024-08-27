import { Injectable } from "@nestjs/common";
import { CreateNotificationSettingDto } from "./dto/create-notification_setting.dto";
import { UpdateNotificationSettingDto } from "./dto/update-notification_setting.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WriteResponse } from "src/shared/response";
import { NotificationSetting } from "./entities/notification_setting.entity";

@Injectable()
export class NotificationSettingService {
  constructor(
    @InjectRepository(NotificationSetting)
    private readonly notificationRepo: Repository<NotificationSetting>,
  ) {}
  async creatEnabled(
    createNotificationSettingDto: CreateNotificationSettingDto,
  ) {
    if (!createNotificationSettingDto?.id) {
      delete createNotificationSettingDto.id;
    }
    await this.notificationRepo.delete({userId: createNotificationSettingDto?.[0].userId})
    const data = await this.notificationRepo.save(createNotificationSettingDto);
    return WriteResponse(200,data);
  }


  async findAll(userId:any) {
    const users = await this.notificationRepo.find({where: { userId: userId}});
    if(users.length > 0) {
       return WriteResponse(200,users)
    }
    return WriteResponse(200,[])
    
  }

  async createOrUpdate(createNotificationSettingDto:CreateNotificationSettingDto){
    try{
      if(createNotificationSettingDto.id===null){
      delete createNotificationSettingDto.id }

    const {userId} = createNotificationSettingDto;
  
    const msg = userId ? "Notification Updated successfully" : "Notification Created successfully"
  
    const notification = await this.notificationRepo.save(createNotificationSettingDto);
    return WriteResponse(200, notification,msg );
  }catch(err){
    
    return WriteResponse(500,false,'Something went wrong');
   }

}
async getNotificationsUserId(createNotificationSettingDto:CreateNotificationSettingDto){
const {userId}:any = createNotificationSettingDto;

  const notification =await this.notificationRepo.find({ where: { userId } });
  return WriteResponse(200,notification);
}
}

