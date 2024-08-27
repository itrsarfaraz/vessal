import { Injectable } from '@nestjs/common';
import { CreateQuestionDto, FindQuestionsDto, FindSearchQuestionDto, isArchiveDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { WriteResponse, paginateResponse } from 'src/shared/response';
import { IPagination } from 'src/shared/paginationEum';
import { InjectRepository } from '@nestjs/typeorm';
import { Questions } from './entities/question.entity';
import { Repository } from 'typeorm';
import { Category } from 'src/category/entities/category.entity';
import { ChecklistTemplate, ChecklistTemplateQuestion } from 'src/checklist_template/entities/checklist_template.entity';
import { QuestionHistory } from 'src/inspection/entities/inspection.entity';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Questions)
    private readonly questionsRepo: Repository<Questions>,
    @InjectRepository(Category)
    private readonly categoriesRepo: Repository<Category>,
    @InjectRepository(ChecklistTemplateQuestion)
    private readonly checklistTemplateQuestionRepository: Repository<ChecklistTemplateQuestion>,
    @InjectRepository(QuestionHistory)
    private readonly quesHistoryRepo: Repository<QuestionHistory>,

  ) { }

  async createOrUpdateQuestion(createQuestionDto: CreateQuestionDto, user?:any) {
    try {
      if (createQuestionDto.id === null || createQuestionDto.id === "") {
        delete createQuestionDto.id;
      }

      const { categoryId, subCategoryId } = createQuestionDto;

      const categoryExists = await this.categoriesRepo.findOne({ where: { id: categoryId, isdeleted: false } });
      if (!categoryExists) {
        return WriteResponse(404, false, 'Invalid category, category does not exist.');
      }

      if (subCategoryId) {
        const subCategoryExists = await this.categoriesRepo.findOne({ where: { id: subCategoryId, isdeleted: false } });
        if (!subCategoryExists) {
          return WriteResponse(404, false, 'Invalid subCategory, subcategory does not exist.');
        }
      }

      const lastRecord = await this.questionsRepo.find({
        order: { uniqueId: 'DESC' },
        where: { subCategoryId: createQuestionDto.subCategoryId, isArchive: false },
        take: 1
      });
      let newUniqueId = 1;
      if (lastRecord.length > 0 && lastRecord[0].uniqueId) {
        const lastUniqueIdNumber = lastRecord[0].uniqueId;
        newUniqueId = lastUniqueIdNumber + 1;
      }

      const { id } = createQuestionDto;

      const responseMsg = id ? "Question updated successfully" : "Question created successfully";
      if (!id) createQuestionDto.uniqueId = newUniqueId;
      else {
        const quesData: any = await this.questionsRepo.findOne({ where: { id: id } });

        if (quesData) {
          quesData.questionId = quesData.id;
          const existingRecord = await this.quesHistoryRepo.findOne({
            where: { isDeleted: false, questionId: id },
            order: { version: 'DESC' }, // Order by version in descending order
          });
          delete quesData.id;
          if (existingRecord && existingRecord.version) {
            // If an existing record is found, increment the version
            const currentVersionNumber = parseInt(existingRecord.version.slice(1)) + 1; // Get the numeric part of the version and increment
            quesData.version = `v${currentVersionNumber}`;
          } else {
            // If no existing record is found, start with version v1
            quesData.version = 'v1';
          }
          
          quesData.updatedBy = user?.id;

          await this.quesHistoryRepo.save(quesData);
        }
      }
      const data = await this.questionsRepo.save(createQuestionDto);

      return WriteResponse(200, data, responseMsg);
    } catch (err) {
      console.error("Error in createques:", err);
      return WriteResponse(500, false, "Something went wrong");
    }
  }

  async findAllQuestion() {
    try {
      const question = await this.questionsRepo.find({ where: { isArchive: false }, relations: ['category'] });

      if (question.length > 0) {
        return WriteResponse(200, question, "Record Found Successfully.");
      }
      return WriteResponse(404, [], "Record Not Found");
    } catch (err) {
      return WriteResponse(500, false, "Something Went Wrong.");
    }
  }


  async findOneQuestion(id: string) {
    const question = await this.questionsRepo.findOne({ where: { id: id } });
    if (!question) {
      return WriteResponse(404, false, "Question Not Found.");
    }
    return WriteResponse(200, question, "Question Found Successfully.");
  }


  async paginationQuestion(pagination: IPagination) {
    try {
      const { curPage, perPage, whereClause } = pagination;
      let lwhereClause = "f.isDeleted = false";

      const fieldsToSearch = [
        "question",
        "weight",
        "categoryId",
        "guidelines",
        "grade",
        "comment",
      ];
      fieldsToSearch.forEach((field) => {
        const fieldValue = whereClause.find((p) => p.key === field)?.value;
        if (fieldValue) {
          lwhereClause += ` AND f.${field} LIKE '%${fieldValue}%'`;
        }
      });

      const allValue = whereClause.find((p) => p.key === "all")?.value;
      if (allValue) {
        const conditions = fieldsToSearch
          .map((field) => `f.${field} LIKE '%${allValue}%'`)
          .join(" OR ");
        lwhereClause += ` AND (${conditions} or category.categoryName like '%${allValue}%')`;
      }

      const isArchiveVal = whereClause.find((p) => p.key === "isArchive")?.value;
      if (isArchiveVal) {
        lwhereClause += ` AND f.isArchive=${isArchiveVal == 'true' ? true : false}`;
      }

      const skip = (curPage - 1) * perPage;
      const [list, count] = await this.questionsRepo
        .createQueryBuilder("f")
        .leftJoinAndSelect('f.category', 'category')
        .leftJoinAndSelect('f.subCategory', 'subCategory')
        .where(lwhereClause)
        .skip(skip)
        .take(perPage)
        .orderBy("f.createdOn", "DESC")
        .getManyAndCount();


      return paginateResponse(list, count);
    } catch (err) {
      return WriteResponse(500, false, 'Something Went Wrong')
    }
  }


  async findAll(FindQuestionsDto: FindQuestionsDto) {
    try {
      const currentPage = FindQuestionsDto.currentPage
      const itemsPerPage = FindQuestionsDto.itemsPerPage
      // const question=FindQuestionsDto.question
      const question = null;
      // Calculate skip and take for pagination
      const skip = (currentPage - 1) * itemsPerPage;
      const take = itemsPerPage;

      // Build query
      const queryBuilder = this.questionsRepo.createQueryBuilder('question')
        .leftJoinAndSelect('question.category', 'category')
        .skip(skip)
        .take(take);

      // Add LIKE condition if question parameter is provided
      if (question) {
        queryBuilder.where('question.question LIKE :question', { question: `%${question}%` });
      }

      // Execute query and get raw data and total count
      const [data, totalItems] = await queryBuilder.getManyAndCount();

      // Calculate total pages
      const totalPages = Math.ceil(totalItems / itemsPerPage);

      // Prepare response data
      let response = {
        statusCode: 200,
        message: "Success",
        data: data,
        // currentPage: currentPage,
        // itemsPerPage: itemsPerPage,
        count: totalItems,
        // totalPages: totalPages
      };
      return response;
    } catch (error) {
      return WriteResponse(500, null, "Internal Server Error.")
    }
  }

  async questionSearch(FindQuestionsDto: FindSearchQuestionDto) {
    try {
      const currentPage = FindQuestionsDto.currentPage
      const itemsPerPage = FindQuestionsDto.itemsPerPage
      const question = FindQuestionsDto.question
      // Calculate skip and take for pagination
      const skip = (currentPage - 1) * itemsPerPage;
      const take = itemsPerPage;

      // Build query
      const queryBuilder = this.questionsRepo.createQueryBuilder('question')
        .leftJoinAndSelect('question.category', 'category')
        .skip(skip)
        .take(take);

      // Add LIKE condition if question parameter is provided
      if (question) {
        queryBuilder.where('question.question LIKE :question', { question: `%${question}%` });
      }

      // Execute query and get raw data and total count
      const [data, totalItems] = await queryBuilder.getManyAndCount();

      // Calculate total pages
      const totalPages = Math.ceil(totalItems / itemsPerPage);

      // Prepare response data
      let response = {
        statusCode: 200,
        message: "Success",
        data: data,
        // currentPage: currentPage,
        // itemsPerPage: itemsPerPage,
        count: totalItems,
        // totalPages: totalPages
      };
      return response;
    } catch (error) {
      return WriteResponse(500, null, "Internal Server Error.")
    }
  }

  async isArchive(isArchiveDto: isArchiveDto) {
    try {
      const responseMsg = isArchiveDto.isArchive === true ? "Question archived successfully" : "Question unarchived successfully";
      const question = await this.questionsRepo.findOne({ where: { id: isArchiveDto.questionid } });

      if (!question) {
        return WriteResponse(404, false, "Question not found");
      }

      const checklistTemplates = await this.checklistTemplateQuestionRepository.findOne({ where: { questionId: isArchiveDto.questionid } });

      if (checklistTemplates) {
        return WriteResponse(400, false, "Question cannot be archived because it has associated checklist templates");
      }

      // await this.questionsRepo.update(isArchiveDto.questionid, { isArchive: isArchiveDto.isArchive });
      await this.questionsRepo.update(isArchiveDto.questionid, { isArchive: isArchiveDto.isArchive })
      return WriteResponse(200, true, responseMsg);
    } catch (error) {
      console.error("Error in isArchive method:", error);
      return WriteResponse(500, false, "Something went wrong");
    }
  }

}

