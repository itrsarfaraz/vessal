import { Controller, Get, Post, Body, Param, UseInterceptors, UploadedFiles, UseGuards } from '@nestjs/common';
import { InspectionActionPlanService } from './inspection-action-plan.service';
import { CreateInspectionActionPlanDto, statusUpdate } from './dto/create-inspection-action-plan.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { editFileName } from 'src/helper';
import { ReqUser } from 'src/decorators/user.decorator';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';

@Controller('inspection-action-plan')
@ApiTags('inspection-action-plan')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class InspectionActionPlanController {
  constructor(private readonly inspectionActionPlanService: InspectionActionPlanService) { }

  @Post('save')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'images', maxCount: 10 },
  ]))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Create Inspection Action Plan',
    type: CreateInspectionActionPlanDto,
  })
  async saveInspectionActionPlan(
    @Body() data: CreateInspectionActionPlanDto,
    @UploadedFiles() files: { images?: Express.Multer.File[],
    
     },
     @ReqUser() user: any
  ) {
    return this.inspectionActionPlanService.saveInspectionActionPlan(data, files.images,user);
  }

  @Get('getById/:id')
  async getInspectionActionPlan(@Param('id') id: string) {
    return this.inspectionActionPlanService.getInspectionActionPlan(id);
  }


  @Get('getByInspectionQuestionId/:inspectionQuestionId')
  async getInspectionActionPlansByQuestionId(@Param('inspectionQuestionId') inspectionQuestionId: string) {
    return this.inspectionActionPlanService.getInspectionActionPlansByQuestionId(inspectionQuestionId);
  }

  @Post('statusChange')
  async statusUpdate(@Body() data: statusUpdate, @ReqUser() user) {
    return this.inspectionActionPlanService.statusUpdate(data, user);
  }
}
