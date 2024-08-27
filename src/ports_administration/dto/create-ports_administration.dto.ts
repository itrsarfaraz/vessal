import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

export class CreatePortsAdministrationDto {
    @ApiProperty()
    id : string;

    @ApiProperty()
    @IsNotEmpty({message:'name should not be empty'})
    @Length(1,255)
    name : string;

    @ApiProperty()
    @IsNotEmpty({message:'countryCode should not be empty'})
    countryCode: string;

    @ApiProperty()
    @IsNotEmpty({message:'portNo should not be empty'})
    portNo : string;

    @ApiProperty()
    @IsNotEmpty({message:'  unCode should not be empty'})
    unCode: string;

    @ApiProperty()
    @IsNotEmpty({message:'  longitude should not be empty'})
    longitude : string;

    @ApiProperty()
    @IsNotEmpty({message:'  latitude should not be empty'})
    latitude : string;

    isDeleted: boolean;
}
export class isArchiveDto{

    @ApiProperty()
    @IsString()
    administrationid:string

    @ApiProperty({default:false})
    isArchive:boolean;
}
