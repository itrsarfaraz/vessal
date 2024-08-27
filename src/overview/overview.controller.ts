import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { OverviewService } from './overview.service';
import { CreateOverviewDto } from './dto/create-overview.dto';
import { UpdateOverviewDto } from './dto/update-overview.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';

@Controller('overview')
@ApiTags('Overview')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Post()
  create(@Body() createOverviewDto: CreateOverviewDto) {
    return this.overviewService.create(createOverviewDto);
  }

  @Get('inspectionOrVesselCounts')
  async getInspectionCounts() {
    return this.overviewService.getGroupedInspectionStatusCounts();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.overviewService.findOne(+id);
  }

 @Delete(':id')
  remove(@Param('id') id: string) {
    return this.overviewService.remove(+id);
  }
}
