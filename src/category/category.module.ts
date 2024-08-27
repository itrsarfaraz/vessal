import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Questions } from 'src/questions/entities/question.entity';

@Module({
  imports:[TypeOrmModule.forFeature([Category,Questions])],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}
