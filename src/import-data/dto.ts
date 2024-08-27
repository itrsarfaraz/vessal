import { ApiProperty } from "@nestjs/swagger";

export class ImportExelDto {
    @ApiProperty({name: "file", type: "binary", description: "File to import"})
     file: Express.Multer.File;
}