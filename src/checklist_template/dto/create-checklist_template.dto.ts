import { ApiProperty } from "@nestjs/swagger";


export class CreateChecklistTemplateQuestionDto {
    readonly templateId: string;
    // @ApiProperty()
    // readonly categoryId: string;
    // @ApiProperty()
    // readonly sub_categoryId: string;
    @ApiProperty()
    readonly questionId: string;
  }


export class CreateChecklistTemplateDto {
    @ApiProperty()
    readonly id: string;
    @ApiProperty()
    readonly checklist_name: string;
    createdBy: string;
    @ApiProperty({type: [CreateChecklistTemplateQuestionDto]})
    readonly questions: CreateChecklistTemplateQuestionDto[];
}



  
  
