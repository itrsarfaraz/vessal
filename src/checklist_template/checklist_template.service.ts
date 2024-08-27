import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChecklistTemplate, ChecklistTemplateQuestion } from './entities/checklist_template.entity';
import { CreateChecklistTemplateDto } from './dto/create-checklist_template.dto';
import { WriteResponse, paginateResponse } from 'src/shared/response';
import { IPagination } from 'src/shared/paginationEum';
import { Inspection } from 'src/inspection/entities/inspection.entity';
import { inspectionStatus } from 'src/shared/enum/inspectionStatus';
import { Role } from 'src/shared/enum/Role';

@Injectable()
export class ChecklistTemplateService {
  constructor(
    @InjectRepository(ChecklistTemplate)
    private readonly checklistTemplateRepository: Repository<ChecklistTemplate>,
    @InjectRepository(ChecklistTemplateQuestion)
    private readonly checklistTemplateQuestionRepository: Repository<ChecklistTemplateQuestion>,
    @InjectRepository(Inspection)
    private readonly inspectionRepo: Repository<Inspection>
  ) { }

  async create(createChecklistTemplateDto: CreateChecklistTemplateDto) {
    const { id, checklist_name, questions } = createChecklistTemplateDto;

    if (id) {
      return await this.update(id, createChecklistTemplateDto);
    }
    const lastRecord = await this.checklistTemplateRepository.find({
      order: { uniqueId: 'DESC' },
      where:{isDeleted: false},
      take: 1
    });
    let newUniqueId = 'CT-1';
    if (lastRecord.length > 0 && lastRecord[0].uniqueId) {
      const lastUniqueIdNumber = parseInt(lastRecord[0].uniqueId.split('-')[1], 10);
      newUniqueId = `CT-${lastUniqueIdNumber + 1}`;
    }
    const checklistTemplate = await this.checklistTemplateRepository.save({
      checklist_name,
      uniqueId: newUniqueId,
    }); const checklistTemplateQuestions: any = questions.map((question: any) => {
      const checklistTemplateQuestion = this.checklistTemplateQuestionRepository.create({
        ...question,
        templateId: checklistTemplate.id,
      });
      return checklistTemplateQuestion;
    });
    await this.checklistTemplateQuestionRepository.save(checklistTemplateQuestions);
    return WriteResponse(200, { checklistTemplate, checklistTemplateQuestions }, 'Checklist Template created successfully');
  }

  async findAll() {
    const templates = await this.checklistTemplateRepository.find({ relations: ['questions'] });
    return WriteResponse(200, templates, 'Checklist Templates retrieved successfully');
  }

  async findOne(id: string) {
    const template = await this.checklistTemplateRepository.findOne({ where: { id },relations:['questions'] });
    if (!template) {
      return WriteResponse(404, null, 'Checklist Template not found');
    }
    return WriteResponse(200, template, 'Checklist Template retrieved successfully');
  }

  async update(id: string, updateChecklistTemplateDto: Partial<CreateChecklistTemplateDto>) {
    const { checklist_name, questions } = updateChecklistTemplateDto;

    if (checklist_name) {
      await this.checklistTemplateRepository.update(id, { checklist_name });
    }

    if (questions) {
      await this.checklistTemplateQuestionRepository.delete({ template: { id } });
      const checklistTemplateQuestions: any = questions.map((question: any) => {
        const checklistTemplateQuestion = this.checklistTemplateQuestionRepository.create({
          ...question,
          template: { id },
        });
        return checklistTemplateQuestion;
      });
      await this.checklistTemplateQuestionRepository.save(checklistTemplateQuestions);
    }

    const updatedTemplate = await this.checklistTemplateRepository.findOne({ where: { id }, relations: ['questions'] });
    return WriteResponse(200, updatedTemplate, 'Checklist Template updated successfully');
  }

  async remove(id: string) {
    try{
      const inspection = await this.inspectionRepo.findOne({
        where: { checklistTemplateId: id, status:inspectionStatus.Scheduled }
      });
      
      if(inspection){
        return WriteResponse(400, false, "Cannot delete checklist template because it has scheduled inspections");
      }
      
     await this.checklistTemplateQuestionRepository.delete({ template: { id } });
    await this.checklistTemplateRepository.delete(id);

    return WriteResponse(200, null, 'Checklist Template deleted successfully');
  } catch (error) {
    console.error("Error in remove method:", error);
    return WriteResponse(500, false, "Something went wrong");
  }
  }

  async pagination(pagination: IPagination,user): Promise<any> {
    try {
      const { curPage, perPage, whereClause } = pagination;
      let lwhereClause = "f.isDeleted = false";

      const fieldsToSearch = [
        "checklist_name",
        "uniqueId",
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
        lwhereClause += ` AND (${conditions})`;
      }
      // const archived = whereClause.find((p) => p.key === "isArchive")?.value;
      // if (archived) {
      //   lwhereClause += ` AND f.isArchive=${archived == 'true' ? true : false}`;
      // }
      const skip = (curPage - 1) * perPage;
      const [list, count] = await this.checklistTemplateRepository
        .createQueryBuilder("f")
        .where(lwhereClause)
        .skip(skip)
        .take(perPage)
        .leftJoinAndSelect('f.questions','question')
        .orderBy("f.uniqueId", "DESC")
        .getManyAndCount();

      return paginateResponse(list, count);
    } catch (err) {
     
      return WriteResponse(500, false, 'Something Went Wrong')
    }
  }
}
