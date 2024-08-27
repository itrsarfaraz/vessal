import { ApiProperty } from "@nestjs/swagger";
import { NotificationType } from "src/shared/enum/notificationType";

export class CreateNotificationSettingDto {
    @ApiProperty({default:null})
    id:string;

    @ApiProperty()
    userId:string;


    @ApiProperty({type: "enum", enum: NotificationType, enumName: "NotificationType", default: NotificationType.Alert })
    notificationType: NotificationType;

    @ApiProperty()
    isNewInspection:boolean;

    @ApiProperty()
    isInspectionFinish:boolean;

    @ApiProperty()
    isReportGenerate:boolean;

    @ApiProperty()
    anActionPlanUpdate:boolean;

    @ApiProperty()
    isEnabled: boolean;

}
