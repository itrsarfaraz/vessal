import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { CreateManagerDto } from './dto/create-manager.dto';
import { UpdateManagerDto } from './dto/update-manager.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';

@Controller('manager')
@ApiTags("manager")
 @UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Post('createOrUpdate')
  create(@Body() createManagerDto: CreateManagerDto) {
    return this.managerService.createOrUpdate(createManagerDto);
  }

  @Get('getAll')
  findAll() {
    return this.managerService.findAll();
  }

  @Get('getOne/:id')
  findOne(@Param('id') id: string) {
    return this.managerService.findOne(id);
  }

  
  @Get('delete/:id')
  remove(@Param('id') id: string) {
    return this.managerService.remove(id);
  }
}
