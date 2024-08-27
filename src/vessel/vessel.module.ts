import { Module } from '@nestjs/common';
import { VesselService } from './vessel.service';
import { VesselController } from './vessel.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vessel, VesselTypes } from './entities/vessel.entity';
import { Inspection } from 'src/inspection/entities/inspection.entity';
import { FilesAzureService } from 'src/blob-storage/blob-storage.service';
import { SharedModule } from 'src/shared/shared.module';
import { User_Vessel } from 'src/user/entities/user.entity';

@Module({
  imports:[SharedModule,TypeOrmModule.forFeature([Vessel,VesselTypes,Inspection,User_Vessel])],
  controllers: [VesselController],
  providers: [VesselService],
})
export class VesselModule {}
