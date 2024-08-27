import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class CreateManagerDto {
    @ApiProperty()
    id : string;

    @ApiProperty()
    @IsNotEmpty({message:'name should not be empty'})
    name : string;

    isDeleted:boolean
}
