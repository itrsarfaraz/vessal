import { Controller, Get, Post, Body, Param, UseInterceptors, UploadedFiles, Query, HttpStatus, UseGuards } from '@nestjs/common';
import { InspectionService } from './inspection.service';
import { CreateInspectionDto, CreateInspectionImagesDto, CreateInspectionTypeDto, CreateLetestStatusDto, SaveBestWorstInspectionImagesDto, UpdateInspectionStatusDto, createInspectionQuesDto, findQuestionsByCategoryDto } from './dto/create-inspection.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { IPagination, IPaginationSwagger } from 'src/shared/paginationEum';

import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { inspectionStatus } from 'src/shared/enum/inspectionStatus';
import { ReqUser } from 'src/decorators/user.decorator';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';

@Controller('inspection')
@ApiTags('inspection')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InspectionController {
  constructor(private readonly inspectionService: InspectionService) { }

  @Post('createUpdate')
  createInspection(@Body() createInspectionDto: CreateInspectionDto, @ReqUser() user) {
    return this.inspectionService.create(createInspectionDto, user);
  }

  @Post('inspectionType-createUpdate')
  create(@Body() createInspectionTypeDto: CreateInspectionTypeDto) {
    return this.inspectionService.createInspectionType(createInspectionTypeDto);
  }
  @Post('inspectionImages-createUpdate')
  createinspectionImages(@Body() CreateInspectionImagesDto: CreateInspectionImagesDto) {
    return this.inspectionService.createInspectionImages(CreateInspectionImagesDto)
  }


  @Post('BestWorstInspectionImages')
  @ApiBody({ type: SaveBestWorstInspectionImagesDto })
  createBestWorstInspectionImages(@Body() createBestWorstInspectionImages: SaveBestWorstInspectionImagesDto) {
    return this.inspectionService.createBestWorstInspectionImages(createBestWorstInspectionImages)
  }

  @Post('getLatestInspections')
  getLatestInspections(@Body() createLetestStatusDto: CreateLetestStatusDto) {
    return this.inspectionService.getLatestInspections(createLetestStatusDto)
  }



  @Get('inspectionType-getAll')
  findAll() {
    return this.inspectionService.inspectionTypefindAll();
  }

  @Get('inspection-getAll')
  inspectionfindAll(@ReqUser() user) {
    return this.inspectionService.inspectionfindAll(user);
  }

  @Get('inspectionFindOne/:id')
  findOne(@Param('id') id: string) {
    return this.inspectionService.findOne(id);
  }

  @Get('Archive/:id')
  Archive(@Param('id') id: string) {
    return this.inspectionService.archive(id);
  }

  @Post("pagination")
  @ApiBody({
    schema: {
      type: "object",
      properties: IPaginationSwagger,
    },
  })
  pagination(@Body() pagination: IPagination, @ReqUser() user) {
    return this.inspectionService.pagination(pagination, user);
  }

  @Post("paginationBestWorst")
  @ApiBody({
    schema: {
      type: "object",
      properties: IPaginationSwagger,
    },
  })
  paginationBW(@Body() pagination: IPagination) {
    return this.inspectionService.paginationBestWorst(pagination);
  }

  @Get('getQuesByInspection/:id')
  getQuestions(@Param('id') id: string, @Query("isActionPlan") isActionPlan: boolean) {
    return this.inspectionService.getQuestionByInspectionID(id, isActionPlan);
  }

  @Post('saveInspectionQues')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor()) // Handle file upload
  async saveInspectionQues(@UploadedFiles() image, @Body() updateInspecctionQues: createInspectionQuesDto,) {
    updateInspecctionQues.image_file = image
    return await this.inspectionService.saveInspectionQues(updateInspecctionQues);
  }

  @Post('getquesByCategory')
  getquesByCategory(@Body() category: findQuestionsByCategoryDto) {
    return this.inspectionService.getquesByCategory(category);
  }


  @Post('getquestionWithActionPlan')
  getquestionWithActionPlan(@Body() category: findQuestionsByCategoryDto, @ReqUser() user) {
    return this.inspectionService.getquestionWithActionPlan(category, user);
  }


  @Post('update-status')
  async updateInspectionStatus(@Body() updateInspectionStatusDto: UpdateInspectionStatusDto, @ReqUser() user) {
    const { inspectionId } = updateInspectionStatusDto;
    const status = await this.inspectionService.updateInspectionStatus(inspectionId, user);

    // if (status === inspectionStatus.Closed || status === inspectionStatus.PA) {
    return {
      statusCode: HttpStatus.OK,
      message: `Inspection status updated to ${inspectionStatus[status]}`,
      data: { status },
    };
    // } else {
    //   throw new HttpException('Unable to update inspection status', HttpStatus.BAD_REQUEST);
    // }
  }

  @Get('getGraphCount/:vesselId')
  async getGrapgh(@Param('vesselId') vesselId: string) {
    return this.inspectionService.getGraphCount(vesselId);
  }

  @Get('getBarCount/:vesselId')
  async getBar(@Param('vesselId') vesselId: string) {
    return this.inspectionService.getBarCount(vesselId);
  }

  @Get('getInspectionByStatus/:vesselId')
  async getins(@Param('vesselId') vesselId: string) {
    return this.inspectionService.getInspectionByStatus(vesselId);
  }

}
