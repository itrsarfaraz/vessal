import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ChecklistTemplateService } from './checklist_template.service';
import { CreateChecklistTemplateDto } from './dto/create-checklist_template.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { IPagination, IPaginationSwagger } from 'src/shared/paginationEum';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { ReqUser } from 'src/decorators/user.decorator';

@Controller('checklist-templates')
@ApiTags('checklist-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ChecklistTemplateController {
  constructor(private readonly checklistTemplateService: ChecklistTemplateService) {}

    @Post("create-or-update")
    create(@Body() createChecklistTemplateDto: CreateChecklistTemplateDto,@ReqUser() user) {
    if(!createChecklistTemplateDto.id){
      createChecklistTemplateDto['createdBy'] = user.id
    }
    return this.checklistTemplateService.create(createChecklistTemplateDto);
  }

  @Get("findAll")
  findAll() {
    return this.checklistTemplateService.findAll();
  }

  @Get('findOne/:id')
  findOne(@Param('id') id: string) {
    return this.checklistTemplateService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateChecklistTemplateDto: Partial<CreateChecklistTemplateDto>) {
    return this.checklistTemplateService.update(id, updateChecklistTemplateDto);
  }

  @Get('delete/:id')
  remove(@Param('id') id: string) {
    return this.checklistTemplateService.remove(id);
  }

  @Post("pagination")
  @ApiBody({
    schema: {
      type: "object",
      properties: IPaginationSwagger,
    },
  })
  pagination(@Body() pagination: IPagination,@ReqUser() user) {
    return this.checklistTemplateService.pagination(pagination,user);
  }
}
