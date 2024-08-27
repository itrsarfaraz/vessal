import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    Length,
    Matches,
    MaxLength,
} from 'class-validator';

export class CreateCategoryDto {

    id: string;

    @ApiProperty()
    @IsString()
    @Length(0, 50, { message: 'Category name must be between 1 and 50 characters and cannot be null.' })
    categoryName: string;

    sortCode: string;

    @ApiProperty()
    @Transform(({value}) => value == "" || value == undefined ? null : value)
    parentCategoryId: string;

    @ApiProperty()
    @IsString()
    @MaxLength(500, { message: 'Description must be under 500 characters.' })
    description: string;

}
export class UpdateCategorySortCode {
    @ApiProperty()
    @IsNotEmpty()
    id: string;
    @ApiProperty()
    @IsNotEmpty()
    sortCode: string;
}
