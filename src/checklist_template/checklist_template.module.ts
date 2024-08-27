import { Module } from '@nestjs/common';
import { ChecklistTemplateService } from './checklist_template.service';
import { ChecklistTemplateController } from './checklist_template.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChecklistTemplate, ChecklistTemplateQuestion } from './entities/checklist_template.entity';
import { Inspection } from 'src/inspection/entities/inspection.entity';

@Module({
  imports:[TypeOrmModule.forFeature([ChecklistTemplate,ChecklistTemplateQuestion,Inspection])],
  controllers: [ChecklistTemplateController],
  providers: [ChecklistTemplateService],
})
export class ChecklistTemplateModule {}
