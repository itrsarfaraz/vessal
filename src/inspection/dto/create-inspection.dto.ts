import { ApiProperty } from "@nestjs/swagger";
import { ImageStatus } from "src/shared/enum/imageStatus";
import { inspectionStatus } from "src/shared/enum/inspectionStatus";
import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsString, ValidateNested } from "class-validator";
import { TransformDateToISOString } from "src/decorators/date-to-isostring.transformer";

export class CreateInspectionDto {
    @ApiProperty({ default: null })
    id: string;
    @ApiProperty()
    vesselId: string;
    @ApiProperty()
    InspectionTypeId: string;
    @ApiProperty()
    InspectorId: string
    @ApiProperty()
    @TransformDateToISOString()
    inspectionDate: Date;
    @ApiProperty()
    startPortId: string;
    @ApiProperty()
    destinationPortId: string;
    @ApiProperty()
    performedBy: string;
    @ApiProperty()
    checklistTemplateId: string;
    @ApiProperty()
    status:inspectionStatus;
    @ApiProperty()
    progress: number;
}
export class CreateLetestStatusDto {
    @ApiProperty({default: inspectionStatus.Scheduled,enum: inspectionStatus})
    status: string;
}
export class CreateInspectionTypeDto {
    @ApiProperty({ default: null })
    id: string;
    @ApiProperty()
    name: string;
}

export class CreateInspectionImagesDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    inspectionQuestionId: string;

    @ApiProperty()
    imageName: string;

    @ApiProperty()
    originalName: string;

    @ApiProperty()
    imageStatus:ImageStatus;

}
export class CreateBestWorstInspectionImagesDto {
    @ApiProperty({ default: null })
    id: string;

    @ApiProperty({type: "enum", enum: ImageStatus, enumName: "status", default: ImageStatus.BEST })
    status: ImageStatus;
}

export class GeneralCommentDto {
    @ApiProperty({ default: null })
    id: string;

    @ApiProperty({default:null})
    generalComment: string;

    @ApiProperty({default:null})
    inspectionId: string;

    @ApiProperty({default:null})
    categoryName: string;
}

export class SaveBestWorstInspectionImagesDto {
    @ApiProperty({ type: [GeneralCommentDto]} )
    generalComments: GeneralCommentDto[];

    @ApiProperty({ type: [CreateBestWorstInspectionImagesDto] })
    bestWorstImages: CreateBestWorstInspectionImagesDto[];

    
}




export class saveInspectionDto {
    @ApiProperty()
    id: string

    @ApiProperty()
    comment: string;

    @ApiProperty()
    grade: string;

    @ApiProperty()
    observation: string;

    @ApiProperty()
    actions: string;

    @ApiProperty({type:[CreateInspectionImagesDto]})
    deleteImages: CreateInspectionImagesDto  
}

export class createInspectionQuesDto {
    @ApiProperty({type:saveInspectionDto})
    data: saveInspectionDto;

    @ApiProperty({ type: 'string', format: 'binary', required: false })
    image_file: any;
}

export class findQuestionsByCategoryDto {
    @ApiProperty()
    inspectionId: string;
    @ApiProperty()
    page: number;
    @ApiProperty()
    limit: number;

    @ApiProperty()
    categoryName: string;
    @ApiProperty()
    startDate: Date;

    @ApiProperty()
    endDate: Date;



    @ApiProperty({ default: [] })
    @IsArray()
    @Type(() => WhereClauseDTO)
    whereClause: WhereClauseDTO[];
}

class WhereClauseDTO {
    @ApiProperty()
    key: string;

    @ApiProperty()
    value: string;
}


export class UpdateInspectionStatusDto {
    @ApiProperty()
    @IsNotEmpty()
    inspectionId: string;
  }
