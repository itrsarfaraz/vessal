import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { VesselService } from './vessel.service';
import { ArchiveDto, CreateVesselDto } from './dto/create-vessel.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { IPagination, IPaginationSwagger } from 'src/shared/paginationEum';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReqUser } from 'src/decorators/user.decorator';

@ApiTags('vessel')
@Controller('vessel')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VesselController {
  constructor(private readonly vesselService: VesselService,
    
  ) {}

  @Post("createOrUpdateVessel")
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image_file')) // Handle file upload
  async create(@ReqUser() user: any, @UploadedFile() imageFile: Express.Multer.File, @Body() createVesselDto: CreateVesselDto) {
    if(imageFile){
      createVesselDto.image_file = imageFile; // Attach uploaded file to DTO
    }
    return this.vesselService.create(createVesselDto,user);
  }

  @Get('getAllVessels')
  findAll(@ReqUser() user: any) {
    return this.vesselService.findAll(user);
  }

  @Get('getOneVessel/:id')
  findOne(@Param('id') id: string) {
    return this.vesselService.findOne(id);
  }

  @Get('getAllVesselTypes')
  allVesselTypes(@ReqUser() user: any) {
    return this.vesselService.allVesselTypes(user);
  }

  @Get('getAllManagers')
  getAllManagers() {
    return this.vesselService.findAllManagers();
  }

  @Post('deleteVessel/:id')
  remove(@Param('id') id: string) {
    return this.vesselService.remove(id);
  }

  @Post('archiveVessel')
  archive(@Body() archiveDto:ArchiveDto) {
    return this.vesselService.archive(archiveDto);
  }

  @Post("pagination")
  @ApiBody({
    schema: {
      type: "object",
      properties: IPaginationSwagger,
    },
  })
  pagination(@Body() pagination: IPagination) {
    return this.vesselService.pagination(pagination);
  }
}
