import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, Length} from "class-validator";

export class VesselDto{
  @ApiProperty({default:null})
  id: string;

  vesselImage:string;

  @ApiProperty()
  @IsNotEmpty()
  @Length(1,255)
  vesselName:string;

  @ApiProperty()
  @IsNotEmpty()
  vesselTypeId:string;

  @ApiProperty()
  @IsNotEmpty()
  flag:string;

  @ApiProperty()
  @IsNotEmpty()
  imoNo:number;

  @ApiProperty()
  class:string;

  @ApiProperty()
  dwt:number;

  @ApiProperty()
  yearBuilt:number;

  @ApiProperty()
  teus:number;

  @ApiProperty()
  engine:string;

  @ApiProperty()
  lastDueDateDryDock:Date;

  @ApiProperty()
  nextDueDateDryDock:Date;

  @ApiProperty()
  owner:string;

  @ApiProperty()
  ownershipStartDate:Date;

  // @ApiProperty()
  // manager:string;

  @ApiProperty()
  charterer:string;

  @ApiProperty()
  chartererRangeStartDate:Date;

  @ApiProperty()
  chartererRangeEndDate:Date;

  @ApiProperty()
  hireRate:number;

  @ApiProperty()
  lastVettingInspection:Date;

  @ApiProperty()
  offHires:number;

  @ApiProperty()
  country:string;
}
export class CreateVesselDto {
  @ApiProperty({type:VesselDto})
  data:VesselDto;

  @ApiProperty({ type: 'string', format: 'binary',required: false })
  image_file: any; // Include this field for file upload
}

export class ArchiveDto{
  @ApiProperty()
  vesselId:string;

  @ApiProperty({default:false})
  isArchive:boolean;
}
