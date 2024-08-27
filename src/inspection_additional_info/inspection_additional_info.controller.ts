import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, UseGuards, UploadedFiles } from '@nestjs/common';
import { InspectionAdditionalInfoService } from './inspection_additional_info.service';
import { CreateInspectionAdditionalInfoDto } from './dto/create-inspection_additional_info.dto';
import { UpdateInspectionAdditionalInfoDto } from './dto/update-inspection_additional_info.dto';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ReqUser } from 'src/decorators/user.decorator';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { imageFileFilter, pdfFileFilter } from 'src/utils/groupBy';

@Controller('inspection-additional-info')
@ApiTags('inspection-additional-info')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InspectionAdditionalInfoController {
  constructor(private readonly inspectionAdditionalInfoService: InspectionAdditionalInfoService) { }

  @Post("createInspectionAdditionalnfo")
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor())
  async createInsectionAdditionalnfo
    (@Body() createInspectionAdditionalInfoDto: CreateInspectionAdditionalInfoDto,
      @ReqUser() user: any,
      @UploadedFiles() files: Express.Multer.File[]) {
    const [file, pdfFile] = files;
    createInspectionAdditionalInfoDto['createdBy'] = user.id;
    createInspectionAdditionalInfoDto['updatedBy'] = user.id;
    return this.inspectionAdditionalInfoService.createInsectionAdditionalnfo(createInspectionAdditionalInfoDto, file, pdfFile);
  }

  @Get('getAll')
  findAll() {
    return this.inspectionAdditionalInfoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inspectionAdditionalInfoService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInspectionAdditionalInfoDto: UpdateInspectionAdditionalInfoDto) {
    return this.inspectionAdditionalInfoService.update(+id, updateInspectionAdditionalInfoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inspectionAdditionalInfoService.remove(+id);
  }
}
