import { IsUUID, IsNotEmpty, IsString, IsNumber, IsDate, IsArray, ValidateNested, Min, Max, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';



export class CreateInspectionActionPlanImageDto {
    @ApiProperty({ required: false })
    @IsOptional()
    id?: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    imageName: string;
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    imageUrl: string;
    @ApiProperty()
    inspActionPlanId?: string;
}


export class CreateInspectionActionPlanDto {
    @ApiProperty({ required: false })
    @IsOptional()
    id?: string;
    @ApiProperty()
    @IsNotEmpty()
    inspectionQuestionId: string;
    @ApiProperty()
    // @IsString()
    // @IsNotEmpty()
    comment: string;
    @ApiProperty()
    // @IsDate()
    // @Type(() => Date)
    dueDate: Date;
    @ApiProperty()
    @Transform(({ value }) => value ? parseInt(value, 10) : null)
    @IsNumber()
    @Min(0)
    @Max(100)
    completionPercent: number = 0;
    @ApiProperty({ required: false })
    tpManagerId: number;
    @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' }, description: 'Images for the action plan' })
    images: CreateInspectionActionPlanImageDto[];

    @ApiProperty({ type: [CreateInspectionActionPlanImageDto] })
    deleteImages: CreateInspectionActionPlanImageDto
}

export class statusUpdate {
    @ApiProperty()
    id: string;

    @ApiProperty()
    status: string;
}
