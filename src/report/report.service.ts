import { CreateReportDto } from "./dto/create-report.dto";
import { Head, HttpException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Inspection,
  inspection_questions,
} from "src/inspection/entities/inspection.entity";
import { In, Repository } from "typeorm";
import { WriteResponse, paginateResponse } from "src/shared/response";
import { PdfGenerator } from "src/utils/pdf-generator";
import { existsSync, readFileSync } from "fs";
import { Report } from "./entities/report.entity";
import { IPagination } from "src/shared/paginationEum";
import { PdfGateway } from "src/geteway/pdf.gateway";
import { InspectionReportStatus } from "src/shared/enum/InspectionReportStatus";
import { serverUrl, storageUrl } from "src/constent";
import { GradeEnum } from "src/shared/enum/gradeEnum";
import { getAverageColor, getAverageFontColor, getAverageText, GradeColorMapping } from "src/utils/groupBy";
import { NotificationService } from "src/notification/notification.service";
import { NotificationSetting } from "src/notification_setting/entities/notification_setting.entity";
import { User_Vessel } from "src/user/entities/user.entity";
import { Observation } from "src/shared/enum/ObservationEnum";
import { FilesAzureService } from "src/blob-storage/blob-storage.service";

interface CategorySummary {
  categoryName: string;
  categorySortCode: string;
  count: number;
  yesCount: number;
  totalWeight: number;
  weightedSum: number;
  average: any;
  subcategories: {
    subcategoryName: string;
    subcategorySortCode: string;
    questions: any[]; // Define the type of questions appropriately
  }[];
}

interface ImageWithCategory {
  imageName: string; // Adjust with actual image properties
  imageStatus: "BEST" | "WORST"; // Adjust with actual image status type
  categoryName: string;
  categorySortCode: number;
}

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Inspection)
    private readonly inspectionRepo: Repository<Inspection>,
    @InjectRepository(inspection_questions)
    private readonly inspectionQuesRepo: Repository<inspection_questions>,
    @InjectRepository(Report)
    private readonly inspectionReportRepo: Repository<Report>,
    private readonly pdfGateway: PdfGateway,
    @InjectRepository(NotificationSetting)
    private readonly notificationSettingRepository: Repository<NotificationSetting>,
    private readonly notification: NotificationService,
    @InjectRepository(User_Vessel)
    private readonly uservesselRepo: Repository<User_Vessel>,
  ) { }

  private sortData(data: any[]){
    return data
      .sort((a, b) => a?.categorySortCode?.localeCompare(b?.categorySortCode)) // Sort categories
      .map(category => {
        // Sort subcategories within each category
        category.subcategories = category.subcategories
          .sort((a, b) => a?.subcategorySortCode?.localeCompare(b?.subcategorySortCode))
          .map(subcategory => {
            // Sort questions within each subcategory
            subcategory.questions = subcategory.questions
              .sort((a, b) => a?.questionUniqueId - b.questionUniqueId);
            
            return subcategory;
          });
  
        return category;
      });
  };

  private async fetchInspectionData(id: string,isActionPlan = null) {
    // isActionPlan only send when need to generated action plan report
    const inspection = await this.inspectionRepo.findOne({
      where: { id },
      relations: [
        "vessel",
        "inspectionType",
        "checklist",
        "user",
        "startPort",
        "destinationPort",
        "generalComment",
        "additionalInfo",
      ],
    });

    if (inspection) {
      inspection["quarter"] = this?.getQuarterFromDateISOString(
        inspection.inspectionDate,
      );
      const questions = await this.inspectionQuesRepo.find({
        where: { inspectionId: id },
        relations: ["images", "actionPlan","actionPlan.images"],
      });
      const hasAnswerQuestions = questions.filter((i) => isActionPlan ? i.observation == Observation.Yes : i.hasAnswer);
      inspection["questions"] = hasAnswerQuestions
      inspection["categorySummary"] = this.sortData(this.generateCategorySummary(hasAnswerQuestions))
      inspection["gradeColor"] = GradeColorMapping;
     
      let totalWeight = 0;
      let weightedSum = 0;

      for (let i = 0; i < inspection["categorySummary"].length; i++) {
        totalWeight += inspection["categorySummary"][i].totalWeight;
        weightedSum += inspection["categorySummary"][i].weightedSum;
      }
      const overallAverage = weightedSum / totalWeight;
      inspection["overallAverage"] = overallAverage.toFixed(1);
      inspection["overallAverageValue"] = getAverageText(
        inspection["overallAverage"],
      );
      inspection["overallAverageColor"] = getAverageColor(
        overallAverage?.toFixed(),
      );
      inspection['fontColor'] = getAverageFontColor(overallAverage)
      return inspection;
    } else {
      return null;
    }
  }

  async findById(id: string, user?: any) {
    const inspection: any = await this.fetchInspectionData(id);
    if (inspection) {
      const saveReort = {
        id: null,
        inspectionId: id,
        vesselId: inspection.vesselId,
        inspectorId: inspection.InspectorId,
        reportGeneratedDate: new Date(),
        inspectionDate: inspection.inspectionDate,
        type: "full",
        reportStatus: InspectionReportStatus.Progress,
        userId: null,
        reportUniqueId: null,
      };
      const report = await this.create(saveReort, user);
      const questions = inspection["questions"];
      const filePath = `report/${report.id}`;
      const header = await PdfGenerator.generateFullReportHeader(inspection);
      const footer = await PdfGenerator.generateFullReportFooter(
        inspection?.quarter,
      );

      const options = {
        displayHeaderFooter: true,
        headerTemplate: header.replace(/\r\n/g, ""),
        footerTemplate: footer.replace(/\r\n/g, ""),
      };
      PdfGenerator.generatePdf(  
        "full-report",
        inspection,
        filePath,
        options,
      ).then(async () => {
        this.inspectionReportRepo.update(report.id, {
          reportStatus: InspectionReportStatus.Completed,
        });
        const notify = {
          type: report.type,
          detail: report,
          title: ` Your ${report.type} Report for Inspection INS-${inspection.uniqueId} is ready`,
          text: ` You can now download your report from the Inspection Reports Page`,
          action: 'Report Generated',
          link:'/inspection-reports'
        }
        const userVessel = await this.uservesselRepo.find({ where: { vessel_id: inspection.vesselId }, relations: ['user'] });
        const permission = await this.notificationSettingRepository.findOne({ where: { userId: user.id } });
        if (permission) {
          userVessel.forEach(i => {
            if (i.user_id == user.id) {
              if (notify.action === 'Report Generated' && permission.isReportGenerate)
                this.pdfGateway.sendNotification({ notification: notify, data: report });
            }
          });
        }
        await this.notification.sendNotification(notify)
      });
      return WriteResponse(
        200,
        { inspection, questions },
        "Report generation in progress. We'll notify you once it's ready.",
      );
    } else {
      return WriteResponse(404, false, "Record not found");
    }
  }

  async findByInspectionId(id: string, user?: any) {
    const inspection: any = await this.fetchInspectionData(id);
    if (inspection) {
      const saveReport = {
        id: null,
        inspectionId: id,
        vesselId: inspection.vesselId,
        inspectorId: inspection.InspectorId,
        reportGeneratedDate: new Date(),
        inspectionDate: inspection.inspectionDate,
        type: "consolidated",
        reportStatus: InspectionReportStatus.Progress,
        userId: null,
        reportUniqueId: null,
      };
      const report = await this.create(saveReport, user);
      const questions = inspection["questions"];
      let bestWorstImagesArray: {
        categoryName: string;
        count: number;
        comment: string;
        bestImages: ImageWithCategory[];
        worstImages: ImageWithCategory[];
        average: number;
        averageColor: string,
      }[] = [];
      questions.forEach((question) => {
        let categoryEntry = bestWorstImagesArray.find(
          (entry) => entry.categoryName === question.categoryName,
        );

        const avg = inspection["categorySummary"]?.find((entry) => entry?.categoryName == question?.categoryName);

        if (!categoryEntry) {
          const generalComment = inspection?.generalComment?.find((d) => d.categoryName === question.categoryName);
          categoryEntry = {
            categoryName: question.categoryName,
            bestImages: [],
            worstImages: [],
            count: 1,
            comment: generalComment?.generalComment ?? "",
            average: avg?.average ?? 0,
            averageColor: getAverageColor(avg?.average)
          };
          bestWorstImagesArray.push(categoryEntry);
        } else {
          categoryEntry.count += 1;
        }

        question.images.forEach((image) => {
          const imageWithCategory: ImageWithCategory = {
            ...image,
            imageName: image.imageName, // Adjust with actual image properties
            imageStatus: image.imageStatus, // Adjust with actual image status property
            categoryName: question.categoryName,
            categorySortCode: question.categorySortCode,
             // Assuming categorySortCode is of type string based on your example
          };

          if (image.imageStatus === "BEST") {
            categoryEntry.bestImages.push(imageWithCategory);
          } else if (image.imageStatus === "WORST") {
            categoryEntry.worstImages.push(imageWithCategory);
          }
        });
      });
      inspection.bestWorstImages = bestWorstImagesArray.filter(
        (category) =>
          category?.bestImages?.length > 0 || category?.worstImages?.length > 0,
      );

      const filePath = `report/${report.id}`;
      const header = await PdfGenerator.generateFullReportHeader(inspection);
      const footer = await PdfGenerator.generateFullReportFooter(
        inspection?.quarter,
      );
      const options = {
        displayHeaderFooter: true,
        headerTemplate: header.replace(/\r\n/g, ""),
        footerTemplate: footer.replace(/\r\n/g, ""),
      };
      var fileUrl = `${serverUrl}${filePath}`;

      PdfGenerator.generatePdf(
        "consolidate-report",
        inspection,
        filePath,
        options,
      ).then(async () => {
        this.inspectionReportRepo.update(report.id, {
          reportStatus: InspectionReportStatus.Completed,
        });
        const notify = {
          type: report.type,
          detail: report,
          title: ` Your ${report.type} Report for Inspection INS-${report.reportUniqueId} is ready`,
          text: ` You can now download your report from the Inspection Reports Page`,
          action: 'Report Generated',
          link:'/inspection-reports'
        }
        const userVessel = await this.uservesselRepo.find({ where: { vessel_id: inspection.vesselId }, relations: ['user'] });
        const permission = await this.notificationSettingRepository.findOne({ where: { userId: user.id } });
        if (permission) {
          userVessel.forEach(i => {
            if (i.user_id == user.id) {
              if (notify.action === 'Report Generated' && permission.isReportGenerate)
                this.pdfGateway.sendNotification({ notification: notify, data: report });
            }
          });
        }
        await this.notification.sendNotification(notify)
        // this.pdfGateway.sendProgressUpdate({
        //   data: inspection,
        //   fileUrl: fileUrl,
        //   message: "PDF is ready to download.",
        // });
      });
      return WriteResponse(
        200,
        { inspection },
        "Report generation is in progress. We'll notify you once it's ready.",
      );
    } else {
      return WriteResponse(404, false, "Record not found");
    }
  }

  async generateActionPlanReport(id: string,user?:any){
    let isActionPlan = true
    const inspection: any = await this.fetchInspectionData(id,isActionPlan);
    if (inspection) {
      const saveReort = {
        id: null,
        inspectionId: id,
        vesselId: inspection.vesselId,
        inspectorId: inspection.InspectorId,
        reportGeneratedDate: new Date(),
        inspectionDate: inspection.inspectionDate,
        type: "Action-Plan",
        reportStatus: InspectionReportStatus.Progress,
        userId: null,
        reportUniqueId: null,
      };
      const report = await this.create(saveReort, user);
      const questions = inspection["questions"];
      const filePath = `report/${report.id}`;
      const header = await PdfGenerator.generateFullReportHeader(inspection);
      const footer = await PdfGenerator.generateFullReportFooter(
        inspection?.quarter,
      );

      const options = {
        displayHeaderFooter: true,
        headerTemplate: header.replace(/\r\n/g, ""),
        footerTemplate: footer.replace(/\r\n/g, ""),
      };
      PdfGenerator.generatePdf(
        "action-plan-report",
        inspection,
        filePath,
        options,
        {actionPlan: true}
      ).then(async () => {
        this.inspectionReportRepo.update(report.id, {
          reportStatus: InspectionReportStatus.Completed,
        });
        const notify = {
          type: report.type,
          detail: report,
          title: ` Your ${report.type} Report for Inspection INS-${inspection.uniqueId} is ready`,
          text: ` You can now download your report from the Inspection Reports Page`,
          action: 'Report Generated',
          link:'/inspection-reports'
        }
        const userVessel = await this.uservesselRepo.find({ where: { vessel_id: inspection.vesselId }, relations: ['user'] });
        const permission = await this.notificationSettingRepository.findOne({ where: { userId: user.id } });
        if (permission) {
          userVessel.forEach(i => {
            if (i.user_id == user.id) {
              if (notify.action === 'Report Generated' && permission.isReportGenerate)
                this.pdfGateway.sendNotification({ notification: notify, data: report });
            }
          });
        }
        await this.notification.sendNotification(notify)
      });
      return WriteResponse(
        200,
        { inspection, questions },
        "Report generation in progress. We'll notify you once it's ready.",
      );
    } else {
      return WriteResponse(404, false, "Record not found");
    }
  }

  async downloadPdf(id: string) {
    try {
      return `${storageUrl}report/${id}/full-report.pdf`
    } catch (error) {
      throw new HttpException(`Error downloading PDF: ${error.message}`, 500);
    }
  }

  async downloadConsolidatePdf(id: string) {
    try {
      const filePath = `public/report/${id}/consolidate-report.pdf`;
      if (!existsSync(filePath)) {
        throw new HttpException("PDF file not found", 404);
      }
      return readFileSync(filePath);
    } catch (error) {
      throw new HttpException(`Error downloading PDF: ${error.message}`, 500);
    }
  }

  getQuarterFromDateISOString(isoString) {
    if (!isoString) {
      return "-";
    }
    const date = new Date(isoString);
    return this.getQuarter(date);
  }

  getQuarter(date) {
    if (!(date instanceof Date)) {
      throw new Error(
        "Invalid date format. Please provide a valid Date object.",
      );
    }

    const month = date.getMonth();

    if (month >= 0 && month <= 2) {
      return "Q1"; // January, February, March
    } else if (month >= 3 && month <= 5) {
      return "Q2"; // April, May, June
    } else if (month >= 6 && month <= 8) {
      return "Q3"; // July, August, September
    } else {
      return "Q4"; // October, November, December
    }
  }

  generateCategorySummary(questions: any[]): CategorySummary[] {
    const summaryMap: Record<
      string,
      {
        categorySortCode: string;
        count: number;
        yesCount: number;
        totalWeight: number;
        weightedSum: number;
        average: any;
        fontColor: string;
        subcategories: Record<
          string,
          { subcategorySortCode: string; questions: any[] }
        >;
      }
    > = {};

    questions.forEach((question) => {
      const {
        categoryName,
        categorySortCode,
        subcategoryName,
        subCategorySortCode,
        observation,
        weight,
        grade,
      } = question;

      if (!summaryMap[categoryName]) {
        summaryMap[categoryName] = {
          categorySortCode,
          count: 0,
          yesCount: 0,
          totalWeight: 0,
          weightedSum: 0,
          average: 0,
          fontColor: "ffffff",
          subcategories: {},
        };
      }

      const score: any = GradeEnum[grade] || 0;

      summaryMap[categoryName].count += 1;
      summaryMap[categoryName].totalWeight += weight;
      summaryMap[categoryName].weightedSum += weight * score;

      if (observation === "Yes") {
        summaryMap[categoryName].yesCount += 1;
      }

      if (!summaryMap[categoryName].subcategories[subcategoryName]) {
        summaryMap[categoryName].subcategories[subcategoryName] = {
          subcategorySortCode: subCategorySortCode,
          questions: [],
        };
      }

      summaryMap[categoryName].subcategories[subcategoryName].questions.push(
        question,
      );
    });

    return Object.entries(summaryMap).map(
      ([
        categoryName,
        {
          categorySortCode,
          count,
          yesCount,
          subcategories,
          totalWeight,
          weightedSum,
        },
      ]) => ({
        categoryName,
        categorySortCode,
        count,
        yesCount,
        totalWeight: totalWeight,
        weightedSum: weightedSum,
        average: (weightedSum / totalWeight)?.toFixed(1),
        averageColor: getAverageColor((weightedSum / totalWeight).toFixed(1)),
        fontColor: getAverageFontColor((weightedSum / totalWeight).toFixed(1)),
        subcategories: Object.entries(subcategories).map(
          ([subcategoryName, { subcategorySortCode, questions }]) => ({
            subcategoryName,
            subcategorySortCode,
            questions: questions.sort((a:any,b:any) => a?.questionUniqueId - b?.questionUniqueId ),
          }),
        ),
      }),
    );
  }

  async create(CreateReportDto: CreateReportDto, user?: any) {
    let reportUniqueId: number;
  
    // Check if there is an existing report with the same inspectionId and type
    const existingReport = await this.inspectionReportRepo.findOne({
      where: { inspectionId: CreateReportDto.inspectionId, type: CreateReportDto.type },
      order: { reportUniqueId: 'DESC' }, // Order by reportUniqueId in descending order to get the highest one
    });
  
    if (CreateReportDto.id) {
      // If an ID is provided, update the existing report
      return await this.inspectionReportRepo.save(CreateReportDto);
    } else {
      // If no ID is provided, create a new report
      if (existingReport) {
        reportUniqueId = existingReport.reportUniqueId ? existingReport.reportUniqueId + 1 : 1; // Increment the highest reportUniqueId by 1
      } else {
        reportUniqueId = 1; // If no report exists, start with 1
      }
  
      // Assign the generated reportUniqueId
      CreateReportDto.reportUniqueId = reportUniqueId;
      delete CreateReportDto.id; // Ensure that a new report is created by removing the ID field
  
      // Save the new report
      return await this.inspectionReportRepo.save(CreateReportDto);
    }
  }
  

  async pagination(pagination: IPagination) {
    try {
      const { curPage, perPage, whereClause } = pagination;
      const queryBuilder = this.inspectionReportRepo.createQueryBuilder("f");

      const fieldsToSearch = [
        "id",
        "inspectionId",
        "vesselId",
        "inspectorId",
        "type",
        "reportStatus",
        "userId",
      ];

      fieldsToSearch.forEach((field) => {
        const fieldValue = whereClause.find((p) => p.key === field)?.value;
        if (fieldValue) {
          queryBuilder.andWhere(`f.${field} LIKE :${field}`, {
            [field]: `%${fieldValue}%`,
          });
        }
      });

      const allValue = whereClause.find((p) => p.key === "all")?.value;
      if (allValue) {
        const conditions = fieldsToSearch
          .map((field) => `f.${field} LIKE :allValue`)
          .join(" OR ");
        queryBuilder.andWhere(`(${conditions})`, { allValue: `%${allValue}%` });
      }

      const inspectionStartDate = whereClause.find(
        (p) => p.key === "insStartDate",
      )?.value;
      const inspectionEndDate = whereClause.find(
        (p) => p.key === "insEndDate",
      )?.value;
      if (inspectionStartDate && inspectionEndDate) {
        queryBuilder.andWhere(
          "DATE(f.inspectionDate) BETWEEN :inspectionStartDate AND :inspectionEndDate",
          { inspectionStartDate, inspectionEndDate },
        );
      }

      const reportGeneratedStartDate = whereClause.find(
        (p) => p.key === "reportStartDate",
      )?.value;
      const reportGeneratedEndDate = whereClause.find(
        (p) => p.key === "reportEndDate",
      )?.value;
      if (reportGeneratedStartDate && reportGeneratedEndDate) {
        queryBuilder.andWhere(
          "DATE(f.reportGeneratedDate) BETWEEN :reportGeneratedStartDate AND :reportGeneratedEndDate",
          { reportGeneratedStartDate, reportGeneratedEndDate },
        );
      }
      const type = whereClause.find((p) => p.key === "full");
      if (type) {
        const full = ["Full", "Consolidated",'Action-Plan'];
        await queryBuilder.andWhere("f.type IN (:...full)", { full });
      }
      const typeOverview = whereClause.find((p) => p.key === "overview");
      if (typeOverview) {
        const overview = "Overview";
        await queryBuilder.andWhere("f.type = :overview", { overview });
      }

      const skip = (curPage - 1) * perPage;
      const [list, count] = await queryBuilder
        .skip(skip)
        .take(perPage)
        .leftJoinAndSelect("f.inspection", "i")
        .leftJoinAndSelect("i.vessel", "v")
        .leftJoinAndSelect("i.user", "u")
        .orderBy("f.createdOn", "DESC")
        .getManyAndCount();

      return paginateResponse(list, count);
    } catch (err) {
      console.log(err);
      return WriteResponse(500, false, "Something Went Wrong");
    }
  }



  async getBlobAndCompress(containerName: string, blobName: string): Promise<Buffer> {
    const buffer = new FilesAzureService().getBlobAndCompress(containerName,blobName);
    return buffer
  }  
}
