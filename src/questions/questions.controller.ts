import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto, FindQuestionsDto, FindSearchQuestionDto, isArchiveDto, searchQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { IPagination, IPaginationSwagger } from 'src/shared/paginationEum';
import { ReqUser } from 'src/decorators/user.decorator';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';

@ApiTags('questions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post('createOrUpdateQuestion')
  create(@Body() createQuestionDto: CreateQuestionDto, @ReqUser() user) {
    return this.questionsService.createOrUpdateQuestion(createQuestionDto, user);
  }

  @Get('getAllQuestion')
  findAllQuestion() {
    return this.questionsService.findAllQuestion();
  }

  @Get('getOneQuestion/:id')
  findOneQuestion(@Param('id') id: string) {
    return this.questionsService.findOneQuestion(id);
  }

  @Post("paginationQuestion")
  @ApiBody({
    schema: {
      type: "object",
      properties: IPaginationSwagger,
    },
  })
  paginationQuestion(@Body() pagination: IPagination) {
    return this.questionsService.paginationQuestion(pagination);
  }


  @Post("getAllQuestions")
  findAll(@Body() FindQuestionsDto:FindQuestionsDto) {
    return this.questionsService.findAll(FindQuestionsDto);
  }

  @Post("questionSearch")
  questionSearch(@Body() FindSearchQuestionsDto:FindSearchQuestionDto) {
    return this.questionsService.questionSearch(FindSearchQuestionsDto);
  }


  @Post("archiveQuestions")
  archiveQuestions(@Body() archiveDto:isArchiveDto) {
    return this.questionsService.isArchive(archiveDto);
  }

}
