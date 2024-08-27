import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortsAdministrationService } from './ports_administration.service';
import { PortsAdministration } from './entities/ports_administration.entity'; 
import { PortsAdministrationController } from './ports_administration.controller';

@Module({
   imports: [TypeOrmModule.forFeature([PortsAdministration])],
   controllers :[PortsAdministrationController],
   providers: [PortsAdministrationService], 

})
export class PortsAdministrationModule {}
