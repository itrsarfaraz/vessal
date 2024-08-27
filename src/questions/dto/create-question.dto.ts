import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsString, Length } from "class-validator";

export class CreateQuestionDto {
  @ApiProperty()
  id:string

    @ApiProperty()
    @IsNotEmpty({message:' question should not be empty'})
    question:string

    @ApiProperty()
    @IsNotEmpty({message:' weight should not be empty'})
    weight: number

    @ApiProperty()
    @IsNotEmpty({message:'  categoryId should not be empty'})
    categoryId:string

    @ApiProperty()
    @IsNotEmpty({message:'  subCategoryId should not be empty'})
    subCategoryId:string

    @ApiProperty()
    // @IsNotEmpty({message:'  guidelines should not be empty'})
    guidelines:string

    @ApiProperty()
    grade:boolean

    @ApiProperty()
    uniqueId: number

    @ApiProperty()
    comment: boolean

    @ApiProperty()
    status:boolean

    isArchive:boolean 
}

export class searchQuestionDto{
    @ApiProperty()
    @IsString()
    @Length(0, 150, { message: 'Question must be between 1 and 150 characters and cannot be null.' })
    question:string;
}

export class FindQuestionsDto {
    @ApiProperty()
    @IsInt()
    currentPage: number;
  
    @ApiProperty()
    @IsInt()
    itemsPerPage: number;
  
  }

  export class FindSearchQuestionDto {
    @ApiProperty()
    @IsInt()
    currentPage: number;
  
    @ApiProperty()
    @IsInt()
    itemsPerPage: number;
  
    @ApiProperty()
    @IsString()
    @Length(1, 255)
    question: string;
  }

  export class isArchiveDto{

    @ApiProperty()
    @IsString()
    questionid:string

    @ApiProperty({default:false})
    isArchive:boolean;
}