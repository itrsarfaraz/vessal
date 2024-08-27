import { ApiProperty } from "@nestjs/swagger";
import { notification } from "src/shared/enum/notification";

export class CreateNotificationDto {
        @ApiProperty()
        type: string;
        
        @ApiProperty()
        title: string;
        
        @ApiProperty()
        text: string;
        
        @ApiProperty()
        action: string;
        
        @ApiProperty()
        detail: any;

        @ApiProperty({default:null})
        link:any;
}


import { IsBoolean, IsNumber, IsString } from 'class-validator';

export class UpdateReadStatusDto {
  userId: string;
  @ApiProperty()
  @IsString()
  notificationId: string;
  @ApiProperty()
  @IsBoolean()
  isRead: boolean;
  @ApiProperty()
  @IsBoolean()
  isRemoved: boolean;
}
export class markAllReadDto {
  userId: string;
  @ApiProperty()
  notificationIds: string[];
  @ApiProperty()
  @IsBoolean()
  isRead: boolean;
}

