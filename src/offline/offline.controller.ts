import { CreateInspectionAdditionalInfoDto } from './../inspection_additional_info/dto/create-inspection_additional_info.dto';
import { Controller, Get, Post, Body, Param, Delete, UseGuards, Query, UseInterceptors, UploadedFiles, UploadedFile, HttpStatus } from '@nestjs/common';
import { OfflineService } from './offline.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { IPagination, IPaginationSwagger } from 'src/shared/paginationEum';
import { ReqUser } from 'src/decorators/user.decorator';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { findQuestionsByCategoryDto, saveInspectionDto } from 'src/inspection/dto/create-inspection.dto';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { CreateAdditionalInfonDto, CreateInspectionQuestionDto, UpdateStatusDto } from './dto/create-offline.dto';
import { imageFileFilter } from 'src/utils/groupBy';

@Controller("offline")
@ApiTags("offline")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OfflineController {
  constructor(private readonly offlineService: OfflineService) { }
  @Post("inspection/pagination")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        ...IPaginationSwagger,
        startDate: {
          type: "date",
          default: new Date(),
        },
        endDate: {
          type: "date",
          default: new Date(),
        },
      },
    },
  })
  pagination(@Body() pagination: IPagination, @ReqUser() user) {
    return this.offlineService.pagination(pagination, user);
  }

  @Get("getQuesByInspection")
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  getQuestions(@Query("startDate") start: Date, @Query("endDate") end: Date) {
    return this.offlineService.getQuestionByInspectionID(start, end);
  }

  @Get("getAllInspectionQuestion")
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  getQuestionsAll(
    @Query("startDate") start: string,
    @Query("endDate") end: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    return this.offlineService.getAllInspectionQuestion(
      startDate,
      endDate,
      page,
      limit,
    );
  }

  @Post("getquesByCategory")
  getquesByCategory(@Body() category: findQuestionsByCategoryDto) {
    return this.offlineService.getquesByCategory(category);
  }

  @Post("sync")
  @UseInterceptors(AnyFilesInterceptor())
  async syncInspectionQues(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() updateInspecctionQues: CreateInspectionQuestionDto,
  ) {
    return this.offlineService.handleSync(files, updateInspecctionQues);
  }

  @Post("syncAdditionalInfo")
  async syncAdditionalInfo(
    @Body() updateInspecctionQues: CreateAdditionalInfonDto,
  ) {
    return this.offlineService.handleSyncAdditionalInfo(updateInspecctionQues);
  }

  @Post("saveInspectionQues")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(AnyFilesInterceptor()) // Handle file upload
  async saveInspectionQues(
    @UploadedFiles() images: Express.Multer.File[],
    @Body() updateInspecctionQues: CreateInspectionQuestionDto,
  ) {
    try {
      let convertData =
        typeof updateInspecctionQues.inspectionQuestions == "string"
          ? JSON.parse(updateInspecctionQues.inspectionQuestions)
          : updateInspecctionQues.inspectionQuestions;
      convertData = Array.isArray(convertData) ? convertData : [convertData];
      const questions = convertData.map((item: any, index) => {
        item.image_file = images.filter(
          (img) => img.fieldname.split("_")[1] === index.toString(),
        );
        return item;
      });

      for (const question of questions) {
        await this.offlineService.saveInspectionQues(question);
      }
      return {
        statusCode: 200,
        message: "Sync successfully.",
        data: convertData,
      };
    } catch (e) {
      return {
        statusCode: 400,
        message: "something went wrong.",
        data: null,
      };
    }
  }

  @Post("createInspectionAdditionalnfo")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(AnyFilesInterceptor()) // Handle file upload
  async createInsectionAdditionalnfo(
    @Body()
    createInspectionAdditionalInfoDto: CreateAdditionalInfonDto,
    @ReqUser() user: any,
    @UploadedFiles() file: Express.Multer.File[],
  ) {
    return this.offlineService.createInsectionAdditionalInfo(
      createInspectionAdditionalInfoDto,
      file,
      user
    );
  }

  @Get("getAllAdditionalInfo")
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getAllAdditionalInfo(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ) {
    return this.offlineService.getAllAdditionalInfo(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      page,
      limit,
    );
  }
  @Post('update-status')
  async updateInspectionStatus(@Body() updateInspectionStatusDto: UpdateStatusDto, @ReqUser() user) {
    const { inspectionId } = updateInspectionStatusDto;
    await this.offlineService.updateInspectionStatus(inspectionId, user);
    return {
      statusCode: HttpStatus.OK,
      message: `Inspection status updated`,
      data: true,
    };
  }

}
