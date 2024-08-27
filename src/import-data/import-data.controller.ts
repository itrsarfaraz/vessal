import { Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ImportDataService } from './import-data.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { ImportExelDto } from './dto';
import { existsSync, fstat, unlinkSync } from 'fs';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';

@Controller('import-data')
@ApiTags("import-data")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ImportDataController {
  constructor(private readonly importDataService: ImportDataService) {

  }

  @Post('import')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads', // Directory to store the file temporarily
      filename: (req, file, callback) => {
        const filename = `${Date.now()}-${file.originalname}`;
        callback(null, filename);
      },
    }),
  }))
  async importExcel(@UploadedFile() file: Express.Multer.File): Promise<void> {
    const filePath = join(__dirname, '..', '..', 'uploads', file.filename);
    await this.importDataService.importExcel(filePath);
  }
  @Post('import-port')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads', // Directory to store the file temporarily
      filename: (req, file, callback) => {
        const filename = `${Date.now()}-${file.originalname}`;
        callback(null, filename);
      },
    }),
  }))
  async importPortExcel(@UploadedFile() file: Express.Multer.File): Promise<any> {
    const filePath = join(__dirname, '..', '..', 'uploads', file.filename);
    const response = await this.importDataService.importPort(filePath);
    if(existsSync(filePath)) {
       unlinkSync(filePath);
    }
    return response
  }
}
