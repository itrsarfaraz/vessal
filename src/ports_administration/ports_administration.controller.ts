import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { PortsAdministrationService } from './ports_administration.service';
import { CreatePortsAdministrationDto, isArchiveDto } from './dto/create-ports_administration.dto';
import { UpdatePortsAdministrationDto } from './dto/update-ports_administration.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { IPagination, IPaginationSwagger } from 'src/shared/paginationEum';

@Controller("ports-administration")
@ApiTags("ports-administration")
 @UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PortsAdministrationController {
  constructor(private readonly portsAdministrationService: PortsAdministrationService) {}

  @Post('create-Or-Update')
  create(@Body() createPortsAdministrationDto: CreatePortsAdministrationDto) {
    return this.portsAdministrationService.createOrUpdate(createPortsAdministrationDto);
  }

  @Get('getAll')
  findAll() {
    return this.portsAdministrationService.findAll();
  }

  @Get('getOne/:id')
  findOne(@Param('id') id: string) {
    return this.portsAdministrationService.findOne(id);
  }


  @Get('delete/:id')
  remove(@Param('id') id: string) {
    return this.portsAdministrationService.remove(id);
  }

  @Post("pagination")
  @ApiBody({
    schema: {
      type: "object",
      properties: IPaginationSwagger,
    },
  })
  pagination(@Body() pagination: IPagination) {
    return this.portsAdministrationService.pagination(pagination);
  }

  @Post("archive")
  archiveQuestions(@Body() archiveDto:isArchiveDto) {
    return this.portsAdministrationService.isArchive(archiveDto);
  }

}
