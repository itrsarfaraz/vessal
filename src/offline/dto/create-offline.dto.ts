
import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsOptional, ValidateNested } from "class-validator";
import { saveInspectionDto } from "src/inspection/dto/create-inspection.dto";
import { CreateInspectionAdditionalInfoDto } from "src/inspection_additional_info/dto/create-inspection_additional_info.dto";

export class CreateInspectionQuestionDto {
    @ApiProperty()
    inspectionQuestions: saveInspectionDto[];

    @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' } })
    @IsOptional()
    @IsArray()
    imageFile?: Express.Multer.File[];
}

export class UpdateStatusDto {
    @ApiProperty()
    @IsNotEmpty()
    inspectionId: string;
}


export class CreateInspectionAdditionalInfoOfflineDto {
    @ApiProperty({ default: null })
    id: string;

    @ApiProperty()
    inspectionId: string

    @ApiProperty()
    psc: string;
}

export class CreateAdditionalInfonDto {
    @ApiProperty({ type: [CreateInspectionAdditionalInfoOfflineDto] })
    @ValidateNested({ each: true })
    @Type(() => CreateInspectionAdditionalInfoOfflineDto)
    @Transform(({ value }) => {
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    })
    inspection: CreateInspectionAdditionalInfoOfflineDto[];

    @ApiProperty({ type: 'array', required: false, items: { type: 'string', format: 'binary'} })
    @IsOptional()
    imageFile?: Express.Multer.File[];
}
