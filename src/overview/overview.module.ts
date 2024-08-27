import { Module } from '@nestjs/common';
import { OverviewService } from './overview.service';
import { OverviewController } from './overview.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inspection } from 'src/inspection/entities/inspection.entity';
import { VesselTypes } from 'src/vessel/entities/vessel.entity';

@Module({
  imports:[TypeOrmModule.forFeature([Inspection, VesselTypes])],
  controllers: [OverviewController],
  providers: [OverviewService],
})
export class OverviewModule {}
