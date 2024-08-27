import { KeyVaultService } from "./../kayvault/KeyVaultService ";
import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FilesAzureService } from "src/blob-storage/blob-storage.service";
import { ChecklistTemplateQuestion } from "src/checklist_template/entities/checklist_template.entity";
import { PdfGateway } from "src/geteway/pdf.gateway";
import { validateImageFile } from "src/helper";
import { InspectionActionPlan } from "src/inspection-action-plan/entities/inspection-action-plan.entity";
import {
  createInspectionQuesDto,
  findQuestionsByCategoryDto,
} from "src/inspection/dto/create-inspection.dto";
import {
  GeneralComment,
  Inspection,
  inspection_images,
  inspection_questions,
  InspectionType,
} from "src/inspection/entities/inspection.entity";
import { CreateInspectionAdditionalInfoDto } from "src/inspection_additional_info/dto/create-inspection_additional_info.dto";
import { InspectionAdditionalInfo } from "src/inspection_additional_info/entities/inspection_additional_info.entity";
import { NotificationService } from "src/notification/notification.service";
import { NotificationSetting } from "src/notification_setting/entities/notification_setting.entity";
import { ImageStatus } from "src/shared/enum/imageStatus";
import { inspectionStatus } from "src/shared/enum/inspectionStatus";
import { NotificationAction } from "src/shared/enum/NotificationAction ";
import { Observation } from "src/shared/enum/ObservationEnum";
import { Role } from "src/shared/enum/Role";
import { paginateResponse, WriteResponse } from "src/shared/response";
import { User, User_Vessel } from "src/user/entities/user.entity";
import { STATUS_UPDATE_BODY, STATUS_UPDATE_SUBJECT } from "src/utils/emailText";
import {
  STATUS_UPDATE_TEXT,
  STATUS_UPDATE_TITLE,
} from "src/utils/pushNotificationConstant";
import { Vessel } from "src/vessel/entities/vessel.entity";
import { In, Repository } from "typeorm";
import { CreateAdditionalInfonDto } from "./dto/create-offline.dto";

@Injectable()
export class OfflineService {
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
    @InjectRepository(InspectionAdditionalInfo)
    private readonly additionalInfo: Repository<InspectionAdditionalInfo>,
    @InjectRepository(GeneralComment)
    private readonly generalCommentRepo: Repository<GeneralComment>,
    @InjectRepository(Vessel)
    private readonly vesselRepo: Repository<Vessel>,
    @InjectRepository(User_Vessel)
    private readonly uservesselRepo: Repository<User_Vessel>,
    @InjectRepository(InspectionAdditionalInfo)
    private inspectionAdditionalInfoRepo: Repository<InspectionAdditionalInfo>,
    private readonly fileService: FilesAzureService,
    @InjectRepository(NotificationSetting)
    private readonly notificationSettingRepository: Repository<NotificationSetting>,
    private readonly notification: NotificationService,
    private readonly pdfGateway: PdfGateway,
    private readonly KeyVaultService: KeyVaultService,
  ) {}

  async pagination(pagination: any, user: User): Promise<any> {
    try {
      const { curPage, perPage, whereClause, startDate, endDate } = pagination;
      let lwhereClause = "f.isArchive = 0";

      if (user.role === Role.Inspector) {
        lwhereClause += ` and f.InspectorId= '${user.id}'`;
      }

      if (startDate) {
        lwhereClause += ` and Date(f.createdOn) >= Date('${startDate}') `;
      }

      if (endDate) {
        lwhereClause += ` and Date(f.createdOn) <= Date('${endDate}') `;
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
      console.log(err.message);
      return WriteResponse(500, false, "Something Went Wrong");
    }
  }

  async getQuestionByInspectionID(start: any, end: any): Promise<any> {
    try {
      let lwhere = `f.isArchive = false `;

      if (start && end) {
        lwhere += ` and Date(f.createdOn) BETWEEN Date('${start}') AND Date('${end}')`;
      }
      const inspections = await this.inspectionRepo
        .createQueryBuilder("f")
        .where(lwhere)
        .getMany();
      let result = [];
      if (inspections.length > 0) {
        for (const inspection of inspections) {
          const inspectionId = inspection.id;
          const questions = await this.getFilteredQuestions(
            inspectionId,
            start,
            end,
          );
          if (questions.length > 0) {
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
                  item.images?.filter(
                    (i) => i.imageStatus === ImageStatus.WORST,
                  ).length ?? 0;

                acc[item.categoryName] = category;
                return acc;
              },
              {} as Record<string, any>,
            );

            const groupedQuestions = Object.entries(
              categorySubCategoryCount,
            ).map(([categoryName, data]) => ({
              categoryName,
              subcategoriesCount: data.subcategories.size,
              totalCount: data.totalCount,
              completedCount: data.completedCount,
              bestCount: data.bestCount,
              worstCount: data.worstCount,
              subcategory: Array.from(data.subcategories),
            }));

            const completedQuesCount = groupedQuestions.reduce(
              (sum, group) => sum + group.completedCount,
              0,
            );

            result.push({
              inspectionId: inspectionId,
              groupedQuestions,
              completedQuesCount,
              totalQuesCount: questions.length,
            });
          }
        }
      }

      return WriteResponse(200, result, "Record found successfully");
    } catch (error) {
      console.log(error.message);
      return WriteResponse(400, false, "something went wrong.");
    }
  }
  async getAllInspectionQuestion(
    start: any,
    end: any,
    page?: number,
    limit?: number,
  ): Promise<any> {
    try {
      let query = this.inspectionQuesRepo
        .createQueryBuilder("f")
        .leftJoinAndSelect("f.images", "images");

      // Apply date filtering if both start and end dates are provided
      if (start && end) {
        query = query.where(
          "Date(f.createdOn) BETWEEN Date(:start) AND Date(:end)",
          {
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
          },
        );
      }

      // Apply pagination only if page and limit are provided
      if (page && limit) {
        query = query.skip((page - 1) * limit).take(limit);
      }

      const [list, total] = await query
        .orderBy("f.questionUniqueId", "ASC")
        .addOrderBy("f.subCategorySortCode", "ASC")
        .getManyAndCount();

      return paginateResponse(list, total);
    } catch (error) {
      console.error(error.message);
      return WriteResponse(400, false, "Something went wrong.");
    }
  }

  async getFilteredQuestions(inspectionId, startDate?: Date, endDate?: Date) {
    const query = this.inspectionQuesRepo
      .createQueryBuilder("q")
      .leftJoinAndSelect("q.images", "i");

    query.where("q.inspectionId = :inspectionId", { inspectionId });
    if (startDate && endDate) {
      query.andWhere(
        "Date(q.createdOn) BETWEEN Date(:startDate) AND Date(:endDate)",
        { startDate, endDate },
      );
    }
    query.orderBy("q.categorySortCode", "ASC");

    const questions = await query.getMany();
    return questions;
  }

  // Adjust the import according to your project structure

  async getquesByCategory(payload: findQuestionsByCategoryDto) {
    try {
      const { startDate, endDate, page = 1, limit = 10 } = payload;
      let whereClause = "f.inspectionId is not null";

      if (startDate) {
        whereClause += ` and Date(f.createdOn) >= Date(:startDate) `;
      }

      if (endDate) {
        whereClause += ` and Date(f.createdOn) <= Date(:endDate) `;
      }

      const [questions, count] = await this.inspectionQuesRepo
        .createQueryBuilder("f")
        .leftJoinAndSelect("f.actionPlan", "a")
        .where(whereClause, { startDate, endDate })
        .orderBy("f.subCategorySortCode", "ASC")
        .addOrderBy("f.questionUniqueId", "ASC")
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      const inspectQuesId = questions.map((i) => i.id);
      const imageData = await this.inspectionImagesRepo.find({
        where: { inspectionQuestionId: In(inspectQuesId) },
      });

      const questionsWithImages = questions.map((question) => {
        question.images = imageData.filter(
          (image) => image.inspectionQuestionId === question.id,
        );
        return question;
      });

      if (questionsWithImages.length > 0) {
        return WriteResponse(
          200,
          {
            list: questionsWithImages,
            count,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
          },
          "Record found successfully",
        );
      } else {
        return WriteResponse(404, false, "Record not found");
      }
    } catch (e) {
      console.error(e.message);
      return WriteResponse(500, false, "Record not found");
    }
  }

  async saveInspectionQues(savPayload: any) {
    try {
      const { deleteImages, images, ...rest } = savPayload;

      // Fetch the current data from the database to compare timestamps
      const existingQuestion = await this.inspectionQuesRepo.findOne({
        where: { id: rest.id },
      });

      if (existingQuestion) {
        const newImageFileNames: string[] = [];
        if (savPayload?.image_file && savPayload.image_file.length > 0) {
          await this.uploadImages(
            savPayload.image_file,
            rest.id,
            newImageFileNames,
          );
        }

        // Handle image deletions
        if (deleteImages && deleteImages.length > 0) {
          await this.deleteImages(deleteImages);
        }

        // Update inspection question data in database
        if (rest.grade || rest.comment || rest.observation)
          rest.hasAnswer = true;
        await this.inspectionQuesRepo.save(rest);
        // if (images && images?.length > 0) {
        //   await this.updateImages(images, rest.id);
        // }
        // Return success response
        return WriteResponse(200, true, "Record saved successfully");
      } else {
        // If no existing data, assume local data is the first entry
        await this.inspectionQuesRepo.save(rest);

        // Handle image uploads
        const newImageFileNames: string[] = [];
        if (savPayload?.image_file && savPayload.image_file.length > 0) {
          await this.uploadImages(
            savPayload.image_file,
            rest.id,
            newImageFileNames,
          );
        }

        // Return success response
        return WriteResponse(200, true, "Record saved successfully");
      }
    } catch (e) {
      console.log(e);
      return WriteResponse(500, false, "Internal server error");
    }
  }

  async handleSync(images: Express.Multer.File[], updateInspecctionQues: any) {
    try {
      let convertData =
        typeof updateInspecctionQues.inspectionQuestions === "string"
          ? JSON.parse(updateInspecctionQues.inspectionQuestions)
          : updateInspecctionQues.inspectionQuestions;
      convertData = Array.isArray(convertData) ? convertData : [convertData];
      const questions = convertData.map((item: any, index) => {
        if (images?.length > 0) {
          // item.image_file = images.filter(
          //   (img) => img.fieldname.split("_")[1] === index.toString(),
          // );
        }
        return item;
      });

      const confirmationData = await this.compareData(questions);
      return {
        statusCode: 200,
        message: "Data comparison complete. Please confirm data to sync.",
        data: confirmationData,
      };
    } catch (e) {
      console.log(e);
      return {
        statusCode: 400,
        message: "Something went wrong.",
        data: null,
      };
    }
  }

  private async compareData(offlineData: any[]) {
    const confirmationData = [];
    for (const question of offlineData) {
      const existingQuestion = await this.inspectionQuesRepo.findOne({
        where: { id: question.id },
      });
      if (existingQuestion) {
        if (
          new Date(question.offlineDate) > new Date(existingQuestion.updatedOn)
        ) {
          confirmationData.push({ ...question, conflict: "local_newer" });
        } else {
          confirmationData.push({
            ...existingQuestion,
            conflict: "online_newer",
          });
        }
      } else {
        confirmationData.push({ ...question, conflict: "new_entry" });
      }
    }
    return confirmationData;
  }

  // Helper method to upload images
  private async uploadImages(
    images: Express.Multer.File[],
    inspectionQuestionId: string,
    newImageFileNames: string[],
  ) {
    for (const image of images) {
      if (!validateImageFile(image)) {
        throw new Error("Only image files (jpg, jpeg, png, gif) are allowed.");
      }
      const fileName = await this.fileService.uploadFile(
        image,
        "inspection_images",
      );

      // Save image record to database
      const saveImage = {
        inspectionQuestionId,
        imageName: fileName,
        originalName: image.originalname,
      };
      await this.inspectionImagesRepo.save(saveImage);

      newImageFileNames.push(fileName);
    }
  }

  private async updateImages(images: any[], questionId: string): Promise<void> {
    if (!images || images.length === 0) {
      console.log("No images provided");
    }
    const deleteResult = await this.inspectionImagesRepo.delete({
      inspectionQuestionId: questionId,
    });
    if (deleteResult.affected === 0) {
      console.log(`No records found for questionId: ${questionId}`);
    }
    await this.inspectionImagesRepo.save(images);
  }

  // Helper method to delete images
  private async deleteImages(
    deleteImages: { id: string; imageName: string }[],
  ) {
    const deletePromises = deleteImages.map(async (image) => {
      if (image.imageName) {
        const fileName = "inspection_images/" + image.imageName;
        await this.fileService.deleteFile(fileName, "public");
      }
      await this.inspectionImagesRepo.delete({ id: image.id });
    });
    await Promise.all(deletePromises);
  }

  async createInsectionAdditionalInfo(
    createInspectionAdditionalInfoDto: CreateAdditionalInfonDto,
    files: Express.Multer.File[],
    user: any,
  ) {
    const payload = createInspectionAdditionalInfoDto.inspection ?? [];
    const MAX_FILE_SIZE_MB = 5;
    const ACCEPTED_FILE_TYPES = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/heic",
      "image/webp",
    ];

    const processedItems = await Promise.all(
      payload.map(async (item: any, index: number) => {
        if (!item.id || item.id === "null") {
          delete item.id;
        }

        const image = files?.find(
          (file) => file.fieldname?.split("_")?.[1] == String(index),
        );
        if (image) {
          // Validate file size
          // const fileSizeInMB = image.size / (1024 * 1024);
          // if (fileSizeInMB > MAX_FILE_SIZE_MB) {
          //   throw new BadRequestException(
          //     `File at index ${index} exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB} MB.`,
          //   );
          // }

          // Validate file type
          // if (!ACCEPTED_FILE_TYPES.includes(image.mimetype)) {
          //   throw new BadRequestException(
          //     `File at index ${index} has an invalid file type. Accepted types are: ${ACCEPTED_FILE_TYPES.join(", ")}.`,
          //   );
          // }

          try {
            const fileName = await this.fileService.uploadFile(
              image,
              "additionalInfo",
            );
            item.fileName = fileName;
            item.originalFileName = image.originalname;
          } catch (error) {
            console.error(
              `Failed to upload file for item at index ${index}:`,
              error,
            );
            throw new BadRequestException(
              `Failed to upload file at index ${index}.`,
            );
          }
        }

        item.updatedBy = user.id;
        return item;
      }),
    );

    try {
      const additionalInfo =
        await this.inspectionAdditionalInfoRepo.save(processedItems);
      return WriteResponse(
        200,
        additionalInfo,
        "Inspection additional info saved successfully",
      );
    } catch (error) {
      return WriteResponse(
        404,
        false,
        "Failed to save inspection additional info",
      );
    }
  }

  async getAllAdditionalInfo(
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    limit: number = 10,
  ) {
    // const skip = (page - 1) * limit;

    // Assuming you're using TypeORM or a similar ORM for database interaction
    const query = this.additionalInfo.createQueryBuilder("f");

    if (startDate) {
      query.andWhere("Date(f.createdOn) >= Date(:startDate)", { startDate });
    }

    if (endDate) {
      query.andWhere("Date(f.createdOn) <= Date(:endDate)", { endDate });
    }

    // query.skip(skip).take(limit);

    const [result, total] = await query.getManyAndCount();

    return {
      statusCode: 200,
      data: result,
      total,
      page,
      limit,
    };
  }

  async updateInspectionStatus(
    inspectionId: string,
    user: any,
  ): Promise<string> {
    try {
      const inspection = await this.inspectionRepo.findOne({
        where: { id: inspectionId },
      });
      let status = inspectionStatus.InProgress;
      if (inspection) {
        inspection.status = status;
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

        //  we are enable keyvalut in production after configure keyvalut on azure

        // const serverUrl = await this.KeyVaultService.getSecret('PROD-DB-SERVER_URL');

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
          `${process.env.SERVER_URL}/inspections`, //replace serverurl
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

  async handleSyncAdditionalInfo(
    updateInspecctionQues: CreateAdditionalInfonDto,
  ) {
    try {
      const questions = updateInspecctionQues.inspection;
      const confirmationData = await this.compareAdditionalData(questions);
      return {
        statusCode: 200,
        message: "Data comparison complete. Please confirm data to sync.",
        data: confirmationData,
      };
    } catch (e) {
      console.log(e);
      return {
        statusCode: 400,
        message: "Something went wrong.",
        data: null,
      };
    }
  }

  private async compareAdditionalData(offlineData: any[]) {
    const confirmationData = [];
    for (const question of offlineData) {
      const existingQuestion = await this.additionalInfo.findOne({
        where: { inspectionId: question.inspectionId },
      });
      if (existingQuestion) {
        if (
          new Date(question.offlineDate) > new Date(existingQuestion.updatedOn)
        ) {
          confirmationData.push({ ...question, conflict: "local_newer" });
        } else {
          confirmationData.push({
            ...existingQuestion,
            conflict: "online_newer",
          });
        }
      } else {
        confirmationData.push({ ...question, conflict: "new_entry" });
      }
    }
    return confirmationData;
  }
}
