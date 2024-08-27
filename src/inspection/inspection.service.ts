import { KeyVaultService } from "./../kayvault/KeyVaultService ";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import {
  CreateInspectionDto,
  CreateInspectionImagesDto,
  CreateInspectionTypeDto,
  CreateLetestStatusDto,
  createInspectionQuesDto,
  findQuestionsByCategoryDto,
  SaveBestWorstInspectionImagesDto,
} from "./dto/create-inspection.dto";
import { InjectRepository } from "@nestjs/typeorm";
import {
  GeneralComment,
  Inspection,
  InspectionType,
  QuestionHistory,
  inspection_images,
  inspection_questions,
} from "./entities/inspection.entity";
import { In, Repository } from "typeorm";
import { WriteResponse, paginateResponse } from "src/shared/response";
import { IPagination } from "src/shared/paginationEum";
import { inspectionStatus } from "src/shared/enum/inspectionStatus";
import { ChecklistTemplateQuestion } from "src/checklist_template/entities/checklist_template.entity";
import { ImageStatus } from "src/shared/enum/imageStatus";
import { extname } from "path";
import { FilesAzureService } from "src/blob-storage/blob-storage.service";
import { Observation } from "src/shared/enum/ObservationEnum";
import { Vessel } from "src/vessel/entities/vessel.entity";
import { InspectionActionPlan } from "src/inspection-action-plan/entities/inspection-action-plan.entity";
import { Role } from "src/shared/enum/Role";
import { User, User_Vessel } from "src/user/entities/user.entity";
import { GradeEnum } from "src/shared/enum/gradeEnum";
import { NotificationService } from "src/notification/notification.service";
import { NotificationAction } from "src/shared/enum/NotificationAction ";
import {
  INSPECTION_SCHEDULED_TEXT,
  INSPECTION_SCHEDULED_TITLE,
  STATUS_UPDATE_TEXT,
  STATUS_UPDATE_TITLE,
} from "src/utils/pushNotificationConstant";
import {
  INSPECTION_SCHEDULED_SUBJECT,
  INSPECTION_SCHEDULED_BODY,
  STATUS_UPDATE_SUBJECT,
  STATUS_UPDATE_BODY,
} from "src/utils/emailText";
import { format } from "date-fns";
import { PdfGateway } from "src/geteway/pdf.gateway";
import { env } from "process";
import { NotificationSetting } from "src/notification_setting/entities/notification_setting.entity";
import { Questions } from "src/questions/entities/question.entity";
@Injectable()
export class InspectionService {
  constructor(
    @InjectRepository(Inspection)
    private readonly inspectionRepo: Repository<Inspection>,
    @InjectRepository(InspectionType)
    private readonly inspectionTypeRepo: Repository<InspectionType>,
    @InjectRepository(inspection_questions)
    private readonly inspectionQuesRepo: Repository<inspection_questions>,
    @InjectRepository(ChecklistTemplateQuestion)
    private readonly checklistTemplateQuestion: Repository<ChecklistTemplateQuestion>,
    @InjectRepository(inspection_images)
    private readonly inspectionImagesRepo: Repository<inspection_images>,
    @InjectRepository(InspectionActionPlan)
    private readonly inspectionActionRepo: Repository<InspectionActionPlan>,
    @InjectRepository(GeneralComment)
    private readonly generalCommentRepo: Repository<GeneralComment>,
    @InjectRepository(Vessel)
    private readonly vesselRepo: Repository<Vessel>,
    @InjectRepository(User_Vessel)
    private readonly uservesselRepo: Repository<User_Vessel>,
    @InjectRepository(NotificationSetting)
    private readonly notificationSettingRepository: Repository<NotificationSetting>,
    private readonly fileService: FilesAzureService,
    private readonly notification: NotificationService,
    private readonly pdfGateway: PdfGateway,
    private readonly KeyVaultService: KeyVaultService,
  ) {}

  async create(createInspectionDto: CreateInspectionDto, user?: any) {
    if (
      user.role != Role.Admin &&
      user.role != Role.SuperAdmin &&
      user.role != Role.Inspector
    ) {
      return WriteResponse(
        400,
        false,
        "Only Admin, Superadmin and Inspector can create the inspection",
      );
    }
    const { id }: any = createInspectionDto;
    if (createInspectionDto.id === null || createInspectionDto.id === "") {
      delete createInspectionDto.id;
    }
    if (id) {
      const res = await this.inspectionRepo.update(id, createInspectionDto);
      return WriteResponse(200, res, "Inspection Updated successfully");
    } else {
      const existingInspection = await this.inspectionRepo.findOne({
        where: {
          vesselId: createInspectionDto.vesselId,
          inspectionDate: createInspectionDto.inspectionDate,
          isArchive: false,
        },
      });
      if (existingInspection) {
        return WriteResponse(
          400,
          false,
          "Inspection with the same vessel and inspectionDate already exists.",
        );
      } else {
        const today = new Date();
        const inspectionDate = new Date(createInspectionDto.inspectionDate);
        if (inspectionDate > today) {
          createInspectionDto.status = inspectionStatus.Scheduled;
        } else {
          createInspectionDto.status = inspectionStatus.InProgress;
        }
        const lastInspection = await this.inspectionRepo
          .createQueryBuilder("inspection")
          .orderBy("inspection.uniqueId", "DESC")
          .getOne();
        const res = await this.inspectionRepo.save(createInspectionDto);

        const checklistTemplateId = res.checklistTemplateId;
        if (lastInspection) {
          await this.inspectionRepo.update(res.id, {
            uniqueId: lastInspection.uniqueId + 1,
          }); // Start with 1 if no records found
        } else {
          await this.inspectionRepo.update(res.id, { uniqueId: 1 }); // Start with 1 if no records found
        }
        const lwhereClause = "f.templateId = :checklistTemplateId";

        const checklistData = await this.checklistTemplateQuestion
          .createQueryBuilder("f")
          .where(lwhereClause, { checklistTemplateId })
          .leftJoinAndSelect("f.question", "question")
          .leftJoinAndSelect("question.category", "category")
          .leftJoinAndSelect("question.subCategory", "subCategory")
          .leftJoinAndSelect("f.template", "template")
          .orderBy("f.createdOn", "DESC")
          .getMany();

        for (const item of checklistData) {
          const saveData = {
            inspectionId: res.id,
            question: item.question.question,
            questionId: item.question.id,
            isComment: item.question.comment,
            isGrade: item.question.grade,
            weight: item.question.weight,
            guidelines: item.question.guidelines,
            categoryName: item.question.category.categoryName,
            subcategoryName: item.question.subCategory.categoryName,
            categorySortCode: item.question.category.sortCode,
            subCategorySortCode: item.question.subCategory.sortCode,
            questionUniqueId: item.question.uniqueId,
          };

          await this.inspectionQuesRepo.save(saveData);
        }
        const vessel = await this.vesselRepo.findOne({
          where: { id: createInspectionDto.vesselId },
        });
        const insp = await this.inspectionRepo.findOne({
          select: ["startPort"],
          where: { id: res.id },
          relations: ["startPort"],
        });
        const formattedDate = format(
          new Date(createInspectionDto?.inspectionDate),
          "dd-MM-yyyy",
        );
        const notify = {
          type: res.status,
          detail: res,
          title: INSPECTION_SCHEDULED_TITLE.replace(
            "{{vessel_name}}",
            vessel?.vesselName,
          ),
          text: INSPECTION_SCHEDULED_TEXT.replace(
            "{{inspection_date}}",
            "" + formattedDate,
          ).replace("{{port_name}}", insp?.startPort?.name ?? ""),
          action: NotificationAction.INSPECTION_ADDED,
          link: `/inspections`,
        };
        const userVessel = await this.uservesselRepo.find({
          where: { vessel_id: vessel.id },
          relations: ["user"],
        });
        const permission = await this.notificationSettingRepository.findOne({
          where: { userId: user.id },
        });
        if (permission) {
          userVessel.forEach((i) => {
            if (i.user_id == user.id) {
              if (
                notify.action === "Inspection Added" &&
                permission.isNewInspection
              )
                this.pdfGateway.sendNotification({
                  notification: notify,
                  data: res,
                });
            }
          });
        }

        // we are enable keyvalut in production after configure keyvalut on azure

        // const serverurl = await this.KeyVaultService.getSecret('PROD-DB-SERVER_URL');

        this.notification.sendNotification(
          notify,
          userVessel,
          INSPECTION_SCHEDULED_SUBJECT.replace(
            "{{vessel_name}}",
            vessel?.vesselName,
          ),
          INSPECTION_SCHEDULED_BODY.replace("{{user_name}}", user?.fullName)
            .replace("{{vessel_name}}", vessel.vesselName)
            .replace("{{inspection_date}}", "" + formattedDate)
            .replace("{{port_name}}", "" + insp?.startPort?.name ?? ""),
          `${process.env.SERVER_URL}/inspections`,  //replace with serverUrl
        );

        return WriteResponse(200, res, "Inspection created successfully");
      }
    }
  }

  async createInspectionType(createInspectionTypeDto: CreateInspectionTypeDto) {
    const reqBody: any = createInspectionTypeDto;
    if (reqBody.id && reqBody.id != null && reqBody.id != "") {
      const res = await this.inspectionTypeRepo.update(
        reqBody.id,
        createInspectionTypeDto,
      );
      return WriteResponse(200, res, "Inspection Updated successfully");
    } else {
      const res = await this.inspectionTypeRepo.save(reqBody);
      return WriteResponse(200, res, "Inspection created successfully");
    }
  }

  async createInspectionImages(
    CreateInspectionImagesDto: CreateInspectionImagesDto,
  ) {
    try {
      if (
        CreateInspectionImagesDto.id === null ||
        CreateInspectionImagesDto.id === ""
      ) {
        delete CreateInspectionImagesDto.id;
      }

      // if(CreateInspectionImagesDto.id){
      // const {id} =CreateInspectionImagesDto;
      const images = await this.inspectionImagesRepo.findOne({
        where: {
          inspectionQuestionId: CreateInspectionImagesDto.inspectionQuestionId,
        },
      });

      if (!images) {
        return WriteResponse(404, false, "Image not found");
      }

      const savedImage = await this.inspectionImagesRepo.save(
        CreateInspectionImagesDto,
      );

      return WriteResponse(
        200,
        savedImage,
        "Inspection image saved successfully.",
      );
    } catch (err) {
      return WriteResponse(
        500,
        false,
        "Something went wrong while saving the inspection image.",
      );
    }
  }

  async createBestWorstInspectionImages(
    createBestWorstInspectionImagesDto: SaveBestWorstInspectionImagesDto,
  ): Promise<any> {
    try {
      const results = [];

      // Process bestWorstImages
      for (const {
        id,
        status,
      } of createBestWorstInspectionImagesDto.bestWorstImages) {
        await this.inspectionImagesRepo.update({ id }, { imageStatus: status });
        results.push({
          id,
          status,
          message: "Image status updated successfully",
        });
      }

      // Process generalComments
      const comments = createBestWorstInspectionImagesDto.generalComments?.map(
        ({ id, ...rest }) => {
          return id ? { id, ...rest } : { ...rest };
        },
      );

      if (comments && comments.length > 0) {
        await this.generalCommentRepo.save(comments);
      }

      // Returning the response after processing all images
      return WriteResponse(200, results, "Image status update completed");
    } catch (error) {
      console.log(error);
      // Logging the error for debugging purposes

      // Returning a generic error response
      return WriteResponse(500, false, "Something went wrong");
    }
  }

  async getLatestInspections(createLetestStatusDto: CreateLetestStatusDto) {
    const { status }: any = createLetestStatusDto;

    const result = await this.inspectionRepo.find({
      where: { status: status, isArchive: false },
      order: { createdOn: "DESC" },
      take: 10,
    });

    return WriteResponse(200, result);
  }

  async inspectionTypefindAll() {
    const res = await this.inspectionTypeRepo.find({
      where: { isDeleted: false },
    });
    if (res && res.length > 0) {
      return WriteResponse(200, res, "Inspection Type retrieved successfully");
    } else {
      return WriteResponse(404, false, "Record not found");
    }
  }

  async inspectionfindAll(user: any) {
    try {
      const baseConditions = { isArchive: false };
      let whereConditions;
      if (user.role === Role.SuperAdmin) {
        whereConditions = baseConditions;
      } else {
        const vesselIds = user.userVessel.map((i) => i.vessel_id);
        if (vesselIds?.length == 0) {
          return WriteResponse(200, [], "Record not found.");
        }
        whereConditions = {
          ...baseConditions,
          id: In(vesselIds),
        };
      }
      const res = await this.inspectionRepo.find({
        where: whereConditions,
      });
      if (res && res.length > 0) {
        return WriteResponse(200, res, "Inspection retrieved successfully");
      }
      return WriteResponse(404, false, "Record not found");
    } catch (err) {
      return WriteResponse(500, false, "something went wrong");
    }
  }

  async findOne(id: any) {
    const res = await this.inspectionRepo.findOne({
      where: { isArchive: false, id: id },
      relations: ["additionalInfo", "generalComment"],
    });
    if (res) {
      return WriteResponse(200, res, "Inspection retrieved successfully");
    } else {
      return WriteResponse(404, false, "Record not found");
    }
  }

  async archive(id: any) {
    const res = await this.inspectionRepo.findOne({ where: { id: id } });
    if (res && !res.isArchive) {
      await this.inspectionRepo.update(id, { isArchive: true });
      return WriteResponse(200, true, "Inspection Archived successfully");
    } else if (res && res.isArchive) {
      await this.inspectionRepo.update(id, { isArchive: false });
      return WriteResponse(200, true, "Inspection UnArchived successfully");
    } else return WriteResponse(404, false, "Record not found");
  }

  async pagination(pagination: IPagination, user: User): Promise<any> {
    try {
      const { curPage, perPage, whereClause } = pagination;
      let lwhereClause = "f.isArchive = 0";

      if (user.role === Role.Inspector) {
        lwhereClause += ` and f.InspectorId= '${user.id}'`;
      }

      if (user.role != Role.Inspector && user.role !== Role.SuperAdmin) {
        const vesselIds = user.userVessel.map((x) => `'${x.vessel_id}'`);
        lwhereClause += ` and f.vesselId IN (${vesselIds})`;
      }

      const fieldsToSearch = [
        "vesselId",
        "inspectionDate",
        "status",
        "progress",
        "isArchive",
      ];

      fieldsToSearch.forEach((field) => {
        const fieldValue = whereClause.find((p) => p.key === field)?.value;
        if (fieldValue) {
          lwhereClause += ` AND f.${field} = '${fieldValue}'`;
        }
      });

      const allStatus = whereClause.find((p) => p.key === "allStatus")?.value;

      if (allStatus && Array.isArray(allStatus)) {
        lwhereClause += ` AND f.status in (${allStatus.map((i) => `'${i}'`)})`;
      }

      const managerId = whereClause.find((p) => p.key === "managerId")?.value;
      if (managerId) {
        lwhereClause += ` AND vessel.managerId = '${managerId}'`;
      }

      const allValue = whereClause.find((p) => p.key === "all")?.value;
      if (allValue) {
        let conditions = fieldsToSearch
          .map((field) => `f.${field} LIKE '%${allValue}%'`)
          .join(" OR ");
        conditions += ` or vessel.vesselName like '%${allValue}%'`;
        lwhereClause += ` AND (${conditions})`;
      }

      const skip = (curPage - 1) * perPage;

      // Fetch inspections with pagination
      const [inspections, count] = await this.inspectionRepo
        .createQueryBuilder("f")
        .where(lwhereClause)
        .skip(skip)
        .take(perPage)
        .leftJoinAndSelect("f.vessel", "vessel")
        .leftJoinAndSelect("vessel.managers", "managers")
        .leftJoinAndSelect("f.inspectionType", "inspectionType")
        .leftJoinAndSelect("f.checklist", "checklist")
        .leftJoinAndSelect("f.user", "user")
        .leftJoinAndSelect("f.startPort", "startPort")
        .leftJoinAndSelect("f.destinationPort", "destinationPort")
        .orderBy("f.createdOn", "DESC")
        .getManyAndCount();

      // Extract inspection IDs
      const inspectionIds = inspections.map((inspection) => inspection.id);
      if (inspectionIds.length === 0) {
        return paginateResponse([], 0);
      }

      // Fetch related questions for the fetched inspections
      const questions = await this.inspectionQuesRepo
        .createQueryBuilder("q")
        .where("q.inspectionId IN (:...inspectionIds)", { inspectionIds })
        .getMany();

      const inspectionsWithGroupedQuestions = inspections.map((inspection) => {
        let completedQuesCount = 0;
        let observationCount = 0;
        const filteredQuestions =
          inspection.status === "InProgress" ||
          inspection.status === "Scheduled"
            ? questions.filter(
                (question) => question.inspectionId === inspection.id,
              )
            : questions.filter(
                (question) =>
                  question.inspectionId === inspection.id && question.hasAnswer,
              );

        // Filter and reduce to get unique category names and ids
        const groupedQuestions = filteredQuestions
          .filter((question) => question.inspectionId === inspection.id)
          .reduce(
            (acc, question) => {
              if (question.observation == "YES") {
                observationCount++;
              }
              if (question.hasAnswer) {
                completedQuesCount++;
              }
              const existingCategory = acc.find(
                (item) => item.categoryName === question.categoryName,
              );

              if (existingCategory) {
                existingCategory.totalCount++;
                if (question.observation != null) {
                  existingCategory.completedCount++;
                }
              } else {
                acc.push({
                  categoryName: question.categoryName,
                  totalCount: 1,
                  completedCount:
                    question.observation != null ||
                    question.comment != null ||
                    question.grade != null
                      ? 1
                      : 0,
                });
              }
              return acc;
            },

            [],
          );

        return {
          ...inspection,
          questions_category: groupedQuestions, // Direct array with categoryName and id
          completedQuesCount,
          observationCount,
          totalQuesCount: filteredQuestions.filter(
            (question) => question.inspectionId === inspection.id,
          ).length, // Total questions count for the inspection
        };
      });
      // Return paginated response with modified inspections array
      return paginateResponse(inspectionsWithGroupedQuestions, count);
    } catch (err) {
      console.log(err);
      return WriteResponse(500, false, "Something Went Wrong");
    }
  }

  async getQuestionByInspectionID(
    inspectionId: string,
    isActionPlan = false,
  ): Promise<any> {
    try {
      let questions: inspection_questions[] = [];
      let inspection = await this.inspectionRepo.findOne({
        where: { id: inspectionId },
      });
      if (!isActionPlan) {
        questions = await this.inspectionQuesRepo.find({
          where: { inspectionId },
          relations: ["images"],
          order: { categorySortCode: "ASC" },
        });
        if (
          inspection &&
          inspection.status != inspectionStatus.InProgress &&
          inspection.status != inspectionStatus.Scheduled
        ) {
          questions = questions.filter((i) => i.hasAnswer);
        }
      } else {
        questions = await this.inspectionQuesRepo
          .createQueryBuilder("f")
          .leftJoinAndSelect("f.images", "i")
          .leftJoinAndSelect("f.actionPlan", "a")
          .where("f.inspectionId = :inspectionId", { inspectionId })
          .andWhere("f.observation = :observation", {
            observation: Observation.Yes,
          })
          .orderBy("f.categorySortCode", "ASC")
          .getMany();
        questions = questions.filter((i) => i.hasAnswer);
      }
      if (!questions.length) {
        return WriteResponse(404, false, "Record not found");
      }

      const categorySubCategoryCount = questions.reduce(
        (acc, item) => {
          const category = acc[item.categoryName] || {
            subcategories: new Set<string>(),
            totalCount: 0,
            completedCount: 0,
            bestCount: 0,
            worstCount: 0,
          };

          category.subcategories.add(item.subcategoryName);
          category.totalCount++;
          category.completedCount += item.hasAnswer ? 1 : 0;
          category.bestCount +=
            item.images?.filter((i) => i.imageStatus === ImageStatus.BEST)
              .length ?? 0;
          category.worstCount +=
            item.images?.filter((i) => i.imageStatus === ImageStatus.WORST)
              .length ?? 0;

          acc[item.categoryName] = category;
          return acc;
        },
        {} as Record<string, any>,
      );

      const groupedQuestions = Object.entries(categorySubCategoryCount).map(
        ([categoryName, data]) => ({
          categoryName,
          subcategoriesCount: data.subcategories.size,
          totalCount: data.totalCount,
          completedCount: data.completedCount,
          bestCount: data.bestCount,
          worstCount: data.worstCount,
          subcategory: Array.from(data.subcategories),
        }),
      );

      const completedQuesCount = groupedQuestions.reduce(
        (sum, group) => sum + group.completedCount,
        0,
      );

      return WriteResponse(
        200,
        {
          groupedQuestions,
          completedQuesCount,
          totalQuesCount: questions.length,
        },
        "Record found successfully",
      );
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: "An error occurred while fetching questions",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private validateImageFile(filename: string): boolean {
    const allowedExtensions = [
      ".pdf",
      ".png",
      ".jpg",
      ".jpeg",
      ".svg",
      ".webp",
      ".HEIC",
    ];
    const fileExt = extname(filename).toLowerCase();
    return allowedExtensions.includes(fileExt);
  }

  async saveInspectionQues(savPayload: createInspectionQuesDto) {
    try {
      let saveData;

      // Parse data if it's a string
      if (typeof savPayload.data === "string") {
        saveData = JSON.parse(savPayload.data);
      } else {
        saveData = savPayload.data;
      }

      const { deleteImages, ...rest } = saveData;

      // Handle image uploads
      let newImageFileNames: string[] = [];
      if (savPayload?.image_file && savPayload?.image_file.length > 0) {
        for (const image of savPayload?.image_file) {
          // Validate image file
          if (!this.validateImageFile(image.originalname)) {
            return WriteResponse(
              405,
              false,
              "Only image files (jpg, jpeg, png, gif) are allowed.",
            );
          }

          // Save uploaded image
          // const fileExt = extname(image.originalname).toLowerCase();
          // const newImageFileName = `${uuid()}${fileExt}`;
          // const uploadedImagePath = `${folderPath}${newImageFileName}`;
          // writeFileSync(uploadedImagePath, image.buffer);
          const fileName = await this.fileService.uploadFile(
            image,
            "inspection_images",
          );

          // Save image record to database
          const saveImage = {
            inspectionQuestionId: rest.id,
            imageName: fileName,
            originalName: image.originalname,
          };
          await this.inspectionImagesRepo.save(saveImage);

          // Add new image file name to list
          newImageFileNames.push(fileName);
        }
      }

      // Handle image deletions
      if (deleteImages && deleteImages.length > 0) {
        let promises = [];
        for (const image of deleteImages) {
          if (image.imageName) {
            let fileName = "inspection_images/" + image?.imageName;
            promises.push(this.fileService.deleteFile(fileName, "public"));
          }
          // Delete image record from database

          promises.push(this.inspectionImagesRepo.delete({ id: image?.id }));
        }
        await Promise.all(promises);
      }

      // Update inspection question data in database
      if (rest.grade || rest.comment || rest.observation) rest.hasAnswer = true;
      await this.inspectionQuesRepo.update(saveData.id, rest);

      // Return success response
      return WriteResponse(200, true, "Record saved successfully");
    } catch (e) {
      console.log(e);
      return WriteResponse(500, false, "Internal server error");
    }
  }

  async getquesByCategory(payload: findQuestionsByCategoryDto) {
    try {
      const { categoryName, inspectionId, whereClause } = payload;

      // Initialize the where clause and parameters
      const conditions = ["f.inspectionId = :inspectionId"];
      const parameters: Record<string, any> = { inspectionId };

      if (categoryName) {
        conditions.push("LOWER(f.categoryName) = LOWER(:categoryName)");
        parameters.categoryName = categoryName;
      }

      const fieldsToSearch = [
        "categoryName",
        "subcategoryName",
        "question",
        "weight",
        "guidelines",
        "comment",
        "grade",
        "observation",
        "actions",
      ];

      // Add specific field conditions
      whereClause.forEach(({ key, value }) => {
        if (value && fieldsToSearch.includes(key)) {
          conditions.push(`f.${key} = :${key}`);
          parameters[key] = value;
        }
      });

      // Add 'all' condition
      const allValue = whereClause.find((p) => p.key === "all")?.value;
      if (allValue) {
        const allConditions = fieldsToSearch
          .map((field) => `f.${field} LIKE :allValue`)
          .join(" OR ");
        conditions.push(`(${allConditions})`);
        parameters.allValue = `%${allValue}%`;
      }

      const [questions, count] = await this.inspectionQuesRepo
        .createQueryBuilder("f")
        .leftJoinAndSelect("f.images", "images")
        .leftJoinAndSelect("f.actionPlan", "a")
        .where(conditions.join(" AND "), parameters)
        .orderBy("f.subCategorySortCode", "ASC")
        .addOrderBy("f.questionUniqueId", "ASC")
        .getManyAndCount();

      let res = questions;

      const inspection = await this.inspectionRepo.findOne({
        where: { id: inspectionId },
      });
      if (
        inspection &&
        inspection.status !== inspectionStatus.InProgress &&
        inspection.status !== inspectionStatus.Scheduled
      ) {
        res = questions.filter((q) => q.hasAnswer);
      }

      if (res.length > 0) {
        return WriteResponse(200, { res, count }, "Record found successfully");
      } else {
        return WriteResponse(404, false, "Record not found");
      }
    } catch (error) {
      console.error("Error fetching questions by category:", error);
      return WriteResponse(500, false, "Record not found");
    }
  }

  async paginationBestWorst(pagination: IPagination) {
    try {
      const { curPage, perPage, whereClause } = pagination;
      let lwhereClause = "";
      // let inspection = await this.inspectionRepo.findOne({ where: { id: inspectionId } });

      const fieldsToSearch = [
        "categoryName",
        "subcategoryName",
        "question",
        "weight",
        "guidelines",
        "comment",
        "grade",
        "observation",
        "actions",
        "inspectionId",
      ];
      const inspect = whereClause.find((p) => p.key === "inspectionId")?.value;
      const cat = whereClause.find((p) => p.key === "categoryName")?.value;

      const allValue = whereClause.find((p) => p.key === "all")?.value;
      if (allValue) {
        const conditions = fieldsToSearch
          .map((field) => `f.${field} LIKE '%${allValue}%'`)
          .join(" OR ");
        lwhereClause = ` (${conditions})`;
      }

      const skip = (curPage - 1) * perPage;
      let questions: any = await this.inspectionQuesRepo.find({
        where: { inspectionId: inspect, categoryName: cat },
      });

      const inspectionQuesId = questions.map((i) => i.id);
      let [result, counts]: any = await this.inspectionImagesRepo
        .createQueryBuilder("f")
        .skip(skip)
        .take(perPage)
        .where({ inspectionQuestionId: In(inspectionQuesId) })
        .getManyAndCount();

      if (result && result.length > 0) {
        return WriteResponse(
          200,
          { result, counts },
          "Record found successfully",
        );
      } else {
        return WriteResponse(404, false, "Record not found");
      }
    } catch (e) {
      console.log(e);
      return WriteResponse(500, false, "Record not found");
    }
  }

  async getquestionWithActionPlan(
    payload: findQuestionsByCategoryDto,
    user: User,
  ) {
    const categoryName = payload.categoryName;
    const inspectionId = payload.inspectionId;

    let lwhereClause =
      "f.inspectionId = :inspectionId AND f.observation = 'YES'";

    if (categoryName) {
      lwhereClause += ` and  lower(f.categoryName) = lower('${categoryName}')`;
    }

    const parameters: Record<string, any> = {
      inspectionId: inspectionId,
    };

    const fieldsToSearch = [
      "categoryName",
      "subcategoryName",
      "question",
      "weight",
      "guidelines",
      "comment",
      "grade",
      "observation",
      "actions",
    ];

    const fieldsToSearchForActionPlan = ["completionPercent", "dueDate"];

    // Add specific field conditions
    payload.whereClause.forEach(({ key, value }) => {
      if (value && fieldsToSearch.includes(key)) {
        lwhereClause += ` AND f.${key} = :${key}`;
        parameters[key] = value;
      }
    });
    payload.whereClause.forEach(({ key, value }) => {
      if (value && fieldsToSearchForActionPlan.includes(key)) {
        lwhereClause += ` AND a.${key} = :${key}`;
        parameters[key] = value;
      }
    });

    // Add 'all' condition
    const allValue = payload.whereClause.find((p) => p.key === "all")?.value;
    if (allValue) {
      const conditions = fieldsToSearch
        .map((field) => `f.${field} LIKE :allValue`)
        .join(" OR ");
      lwhereClause += ` AND (${conditions})`;
      parameters.allValue = `%${allValue}%`;
    }

    if (user.role != Role.Admin && user.role != Role.SuperAdmin) {
      lwhereClause += ` AND (a.status = 'Submitted' || a.status IS NULL)`;
    }

    const res = await this.inspectionQuesRepo
      .createQueryBuilder("f")
      .leftJoinAndSelect("f.images", "fi")
      .leftJoinAndSelect("f.actionPlan", "a")
      .leftJoinAndSelect("a.images", "i")
      .leftJoinAndSelect("a.tpManager", "t")
      .where(lwhereClause, parameters)
      .orderBy("f.subCategorySortCode", "ASC")
      .addOrderBy("f.questionUniqueId", "ASC")
      .getMany();

    if (res && res.length > 0) {
      return WriteResponse(200, res, "Record found successfully");
    } else {
      return WriteResponse(404, false, "Record not found");
    }
  }

  async updateInspectionStatus(
    inspectionId: string,
    user: any,
  ): Promise<string> {
    try {
      const inspection = await this.inspectionRepo.findOne({
        where: { id: inspectionId },
        relations: ["startPort", "vessel"],
      });
      let status = null;
      if (inspection) {
        if (
          inspection.status == inspectionStatus.PA ||
          inspection.status == inspectionStatus.Closed
        ) {
          status =
            inspection.inspectionDate?.toLocaleDateString() <=
            new Date().toLocaleDateString()
              ? inspectionStatus.InProgress
              : inspectionStatus.Scheduled;
        } else {
          const questions = await this.inspectionQuesRepo.find({
            where: {
              inspectionId,
            },
          });
          for (const question of questions) {
            if (question.observation === Observation.Yes) {
              status = inspectionStatus.PA;
              break;
            }
          }

          if (
            questions.every(
              (question) =>
                question.observation === Observation.No ||
                question.observation == null,
            )
          ) {
            status = inspectionStatus.Closed;
          }
        }
      }

      if (inspection) {
        inspection.status = status ?? inspection.status;
        const res = await this.inspectionRepo.save(inspection);
        const notify = {
          type: status,
          detail: inspection,
          title: STATUS_UPDATE_TITLE.replace(
            "{{inspection_ID}}",
            "INS-" + inspection?.uniqueId,
          ).replace("{{vessel_name}}", inspection.vessel.vesselName),
          text: STATUS_UPDATE_TEXT.replace(
            "{{inspection_ID}}",
            "INS-" + inspection?.uniqueId,
          ).replace("{{current_status}}", status),
          action: NotificationAction.STATUS_CHANGE,
          link: `/inspections`,
        };
        const userVessel = await this.uservesselRepo.find({
          where: { vessel_id: inspection.vesselId },
          relations: ["user"],
        });
        const permission = await this.notificationSettingRepository.findOne({
          where: { userId: user.id },
        });
        if (permission) {
          userVessel.forEach((i) => {
            if (i.user_id == user.id) {
              if (
                notify.action === NotificationAction.STATUS_CHANGE &&
                permission.onInspectionStatusChange
              )
                this.pdfGateway.sendNotification({
                  notification: notify,
                  data: res,
                });
            }
          });
        }

        // we are enable keyvalut in production after configure keyvalut on azure

        // const serverurl = await this.KeyVaultService.getSecret('PROD-DB-SERVER_URL');

        this.notification.sendNotification(
          notify,
          userVessel,
          STATUS_UPDATE_SUBJECT.replace(
            "{{inspection_ID}}",
            "INS-" + inspection?.uniqueId,
          ).replace("{{vessel_name}}", inspection?.vessel.vesselName),
          STATUS_UPDATE_BODY.replace("{{user_name}}", user?.fullName)
            .replace("{{inspection_ID}}", "INS-" + inspection?.uniqueId)
            .replace("{{vessel_name}}", inspection?.vessel.vesselName)
            .replace("{{current_status}}", res.status),
          `${process.env.SERVER_URL}/inspections`, //replace with serverUrl
        );
        return status;
      } else {
        throw new Error("Inspection not found");
      }
    } catch (e) {
      console.log(e);
      throw new Error("Something went wrong");
    }
  }

  async getGraphCount(vesselId: any) {
    // Fetch inspections with QueryBuilder
    const inspections = await this.inspectionRepo
      .createQueryBuilder("inspection")
      .where("inspection.isArchive = :isArchive", { isArchive: false })
      .andWhere("inspection.vesselId = :vesselId", { vesselId })
      .orderBy("inspection.inspectionDate", "ASC")
      .getMany();

    const inspectionIds = inspections.map((i) => i.id);

    if (inspectionIds.length === 0) {
      return WriteResponse(404, false, "Record not found");
    }

    // Fetch observations with QueryBuilder
    const observations = await this.inspectionQuesRepo
      .createQueryBuilder("observation")
      .where("observation.inspectionId IN (:...inspectionIds)", {
        inspectionIds,
      })
      .getMany();

    const observationIds = observations.map((o) => o.id);

    if (observationIds.length == 0) {
      return WriteResponse(404, false, "Record not found");
    }

    // Fetch closed actions with QueryBuilder
    const closedActions = await this.inspectionActionRepo
      .createQueryBuilder("action")
      .where("action.inspectionQuestionId IN (:...observationIds)", {
        observationIds,
      })
      .andWhere("action.completionPercent = 100")
      .getMany();

    const groupedInspections = inspections.reduce((acc, inspection) => {
      if (
        inspection.status === inspectionStatus.Closed ||
        inspection.status === inspectionStatus.ClosedPA ||
        inspection.status === inspectionStatus.PA
      ) {
        const date = inspection.inspectionDate.toISOString().split("T")[0]; // Group by date only, ignoring time

        if (!acc[date]) {
          acc[date] = {
            inspectionDate: new Date(date),
            closedCount: 0,
            observationCount: 0,
            gradeSum: 0,
            gradeCount: 0,
            averageGrade: 0,
          };
        }

        observations.forEach((observation) => {
          closedActions.forEach((action) => {
            if (
              action.inspectionQuestionId === observation.id &&
              observation.inspectionId === inspection.id &&
              observation.observation === "YES"
            ) {
              acc[date].closedCount += 1;
            }
          });

          if (
            observation.inspectionId === inspection.id &&
            observation.observation === "YES"
          ) {
            acc[date].observationCount += 1;
            if (observation.grade != null && observation.weight != null) {
              acc[date].gradeSum +=
                GradeEnum[observation.grade] * Number(observation.weight);
              acc[date].gradeCount += Number(observation.weight);
              acc[date].averageGrade = Number(
                (acc[date].gradeSum / acc[date].gradeCount).toFixed(3),
              );
            }
          }
        });
      }
      return acc;
    }, {});

    // Convert the grouped inspections to an array
    const sortedRecords = Object.values(groupedInspections);

    // Get the last 7 records
    const last7Records = sortedRecords.slice(-7);

    if (last7Records.length > 0)
      return WriteResponse(200, last7Records, "Record found successfully");
    else return WriteResponse(404, false, "Record not found");
  }

  async getBarCount(vesselTypeId: any) {
    // Fetch vessels based on the presence of vesselTypeId
    let vesselCondition = { isArchive: false, isDeleted: false };
    if (vesselTypeId != "null") {
      vesselCondition["vesselTypeId"] = vesselTypeId;
    }
    const vessels = await this.vesselRepo.find({ where: vesselCondition });
    const vesselIds = vessels.map((i) => i.id);

    if (vesselIds.length == 0) {
      return WriteResponse(404, false, "Record not found");
    }

    const status = [
      inspectionStatus.Closed,
      inspectionStatus.ClosedPA,
      inspectionStatus.PA,
    ];

    const inspections = await this.inspectionRepo.find({
      where: { isArchive: false, vesselId: In(vesselIds), status: In(status) },
    });

    if (inspections.length === 0) {
      return WriteResponse(404, false, "Record not found");
    }

    const inspectionIds = inspections.map((i) => i.id);
    const observations = await this.inspectionQuesRepo.find({
      where: { inspectionId: In(inspectionIds) },
    });
    const observationIds = observations.map((o) => o.id);
    const actionData = await this.inspectionActionRepo.find({
      where: { inspectionQuestionId: In(observationIds) },
    });

    let data = {
      observation: 0,
      actionProcess: 0,
      actionClosed: 0,
      actionTransfer: 0,
      observationTotal: 0,
      closedTotal: 0,
    };

    observations.forEach((i) => {
      if (i.observation === "YES") {
        data.observation++;
      }
      if (i.isCopy == true) {
        data.actionTransfer++;
      }
    });

    actionData.forEach((el) => {
      if (el.completionPercent === 100) {
        data.actionClosed++;
      } else {
        data.actionProcess++;
      }
    });

    // Fetch all vessels again for the total calculations
    const allVessels = await this.vesselRepo.find({
      where: { isArchive: false, isDeleted: false },
    });
    const allVesselIDs = allVessels.map((i) => i.id);
    const allInspections = await this.inspectionRepo.find({
      where: { isArchive: false, vesselId: In(allVesselIDs) },
    });

    if (allInspections.length === 0) {
      return WriteResponse(404, false, "Record not found");
    }

    const allInspectionIds = allInspections.map((i) => i.id);
    const allObservations = await this.inspectionQuesRepo.find({
      where: { inspectionId: In(allInspectionIds) },
    });
    const allObservationIds = allObservations.map((o) => o.id);
    const allActionData = await this.inspectionActionRepo.find({
      where: { inspectionQuestionId: In(allObservationIds) },
    });

    allObservations.forEach((i) => {
      if (i.observation === "YES") {
        data.observationTotal++;
      }
    });

    allActionData.forEach((el) => {
      if (el.completionPercent === 100) {
        data.closedTotal++;
      }
    });

    return WriteResponse(200, data, "Record found successfully");
  }

  async getInspectionByStatus(vesselId: any) {
    // Fetch inspections with QueryBuilder
    const inspections: any = await this.inspectionRepo
      .createQueryBuilder("inspection")
      .where("inspection.vesselId = :vesselId", { vesselId })
      .andWhere("inspection.status != :status", { status: "Scheduled" })
      .leftJoinAndSelect("inspection.startPort", "startPort")
      .leftJoinAndSelect("inspection.destinationPort", "desPort")
      .leftJoinAndSelect("inspection.vessel", "vessel")
      .orderBy("inspection.createdOn", "DESC")
      .limit(7)
      .getMany();

    const inspectionsScheduled = await this.inspectionRepo
      .createQueryBuilder("inspection")
      .where("inspection.vesselId = :vesselId", { vesselId })
      .andWhere("inspection.status = :status", { status: "Scheduled" })
      .leftJoinAndSelect("inspection.startPort", "startPort")
      .leftJoinAndSelect("inspection.destinationPort", "desPort")
      .leftJoinAndSelect("inspection.vessel", "vessel")
      .orderBy("inspection.createdOn", "DESC")
      .limit(7)
      .getMany();

    if (inspections)
      return WriteResponse(
        200,
        { inspections, inspectionsScheduled },
        "Record found successfully",
      );
    else return WriteResponse(404, false, "Record not found");
  }
}
