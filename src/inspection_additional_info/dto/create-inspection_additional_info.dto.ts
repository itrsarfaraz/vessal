import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class CreateInspectionAdditionalInfoDto {
    @ApiProperty({ default: null })
    id: string;

    @ApiProperty()
    inspectionId: string

    @ApiProperty()
    psc: string;

    @ApiProperty({ type: 'string', format: 'binary',required: false })
    file: any;

    @ApiProperty({ type: 'string', format: 'binary', required: false })
    @IsOptional()
    pdf_file: any;
}



