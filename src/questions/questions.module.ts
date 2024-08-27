import { Module } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Questions } from './entities/question.entity';
import { Category } from 'src/category/entities/category.entity';
import { ChecklistTemplateQuestion } from 'src/checklist_template/entities/checklist_template.entity';
import { QuestionHistory } from 'src/inspection/entities/inspection.entity';

@Module({
  controllers: [QuestionsController],
  providers: [QuestionsService],
  imports:[TypeOrmModule.forFeature([Questions,Category,ChecklistTemplateQuestion,QuestionHistory])]
})
export class QuestionsModule {}
