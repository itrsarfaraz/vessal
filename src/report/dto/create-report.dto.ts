import { ApiProperty } from "@nestjs/swagger";

export class CreateReportDto {
    @ApiProperty({default:null})
    id:string;
    
    @ApiProperty()
    inspectionId:string;
    
    @ApiProperty()
    vesselId:string;

    @ApiProperty()
    inspectorId:string;

    @ApiProperty()
    reportGeneratedDate:Date;

    @ApiProperty()
    inspectionDate:Date

    @ApiProperty()
    type:string;

    @ApiProperty()
    reportStatus:string;

    @ApiProperty()
    userId:string;

    @ApiProperty()
    reportUniqueId:number;
}


export class GetFleetStatusDto {
    type: 'all' | 'fleet' | 'vessel';
    fleetId?: string;
    vesselId: string;
  }
