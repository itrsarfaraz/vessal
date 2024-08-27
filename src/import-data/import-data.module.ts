import { Module } from '@nestjs/common';
import { ImportDataService } from './import-data.service';
import { ImportDataController } from './import-data.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from 'src/category/entities/category.entity';
import { Questions } from 'src/questions/entities/question.entity';
import { PortsAdministration } from 'src/ports_administration/entities/ports_administration.entity';

@Module({
  controllers: [ImportDataController],
  providers: [ImportDataService],
  imports: [TypeOrmModule.forFeature([Category, Questions,PortsAdministration]),]
})
export class ImportDataModule {}
