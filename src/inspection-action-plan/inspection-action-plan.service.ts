import { KeyVaultService } from './../kayvault/KeyVaultService ';
import { read } from 'fs';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { InspectionActionPlan } from "./entities/inspection-action-plan.entity";
import { InspectionActionPlanImages } from "./entities/inspection-action-plan.entity";
import { CreateInspectionActionPlanDto, statusUpdate } from "./dto/create-inspection-action-plan.dto";
import { FilesAzureService } from "src/blob-storage/blob-storage.service";
import { Inspection, inspection_questions } from "src/inspection/entities/inspection.entity";
import { inspectionStatus } from "src/shared/enum/inspectionStatus";
import { WriteResponse } from "src/shared/response";
import { NotificationService } from "src/notification/notification.service";
import { NotificationAction } from "src/shared/enum/NotificationAction ";
import { ACTION_APPROVED_TEXT, ACTION_APPROVED_TITLE, ACTION_PLAN_APPROVED_REQUEST_TEXT, ACTION_PLAN_APPROVED_REQUEST_TITLE, ACTION_PLAN_UPDATED_TEXT, ACTION_PLAN_UPDATED_TITLE } from "src/utils/pushNotificationConstant";
import { User_Vessel } from "src/user/entities/user.entity";
import { ACTION_PLAN_UPDATED_BODY, ACTION_PLAN_UPDATED_SUBJECT, APPROVAL_REQUEST_BODY, APPROVAL_REQUEST_SUBJECT, APPROVED_ACTION_BODY, APPROVED_ACTION_SUBJECT } from "src/utils/emailText";
import { PdfGateway } from 'src/geteway/pdf.gateway';
import { actionPlanEnum } from "src/shared/enum/actionPlanEnum";
import { NotificationSetting } from "src/notification_setting/entities/notification_setting.entity";
import { Role } from "src/shared/enum/Role";

@Injectable()
export class InspectionActionPlanService {
  constructor(
    @InjectRepository(InspectionActionPlan)
    private readonly inspectionActionPlanRepository: Repository<InspectionActionPlan>,
    @InjectRepository(InspectionActionPlanImages)
    private readonly inspectionActionPlanImagesRepository: Repository<InspectionActionPlanImages>,
    @InjectRepository(inspection_questions)
    private readonly inspectionQuesRepository: Repository<inspection_questions>,
    @InjectRepository(Inspection)
    private readonly inspectionRepository: Repository<Inspection>,
    @InjectRepository(User_Vessel)
    private readonly uservesselRepo: Repository<User_Vessel>,
    @InjectRepository(NotificationSetting)
    private readonly notificationSettingRepository: Repository<NotificationSetting>,
    private readonly fileService: FilesAzureService,
    private readonly notification: NotificationService,
    private readonly pdfGateway: PdfGateway,
    private readonly KeyVaultService: KeyVaultService

  ) { }

  async saveInspectionActionPlan(
    data: CreateInspectionActionPlanDto,
    files: Express.Multer.File[],
    user
  ): Promise<any> {
    const { id, images, deleteImages, ...rest }: any = data;
    let inspectionActionPlan;
    const inspection = await this.inspectionQuesRepository.findOne({ where: { id: data.inspectionQuestionId, observation: 'YES' } });
    const inspectionId = inspection.inspectionId;
    const inProgress = await this.inspectionRepository.findOne({ where: { id: inspectionId }, relations: ["questions", "vessel"] });


    if (inProgress && inProgress.status != inspectionStatus.InProgress) {
      if (id) {
        inspectionActionPlan = await this.inspectionActionPlanRepository.findOne({
          where: { id },
        });
        if (inspectionActionPlan) {

          let imagesArrays = JSON.parse(deleteImages ?? "[]");
          imagesArrays = Array.isArray(imagesArrays) ? imagesArrays : [imagesArrays];
          if (imagesArrays && imagesArrays.length > 0) {
            const promises = []
            for (const image of imagesArrays) {


              if (image?.imageName) {
                const filePath = "actionPlanImages/" + image?.imageName
                promises.push(this.fileService.deleteFile(filePath, "public"));
              }

              // Delete image record from database
              promises.push(this.inspectionActionPlanImagesRepository.delete({
                id: image?.id,
              }));
            }
            await Promise.all(promises);
          }
          rest.status = (data.completionPercent == 100 && rest.status == null) ? actionPlanEnum.SUBMITTED : rest.status;
          await this.inspectionActionPlanRepository.update(id, rest);
          const questionId = inspection.subCategorySortCode + "." + inspection?.questionUniqueId
          const notify = {
            type: NotificationAction.ACTION_PLAN_UPDATE,
            detail: rest,
            title: ACTION_PLAN_UPDATED_TITLE.replace("{{vessel_name}}", inProgress?.vessel.vesselName),
            text: ACTION_PLAN_UPDATED_TEXT.replace("{{user_name}}", user?.fullName).replace("{{question_ID}}", questionId).replace("{{inspection_ID}}", "INS-" + inProgress?.uniqueId),
            action: NotificationAction.ACTION_PLAN_UPDATE,
            link: `/action-plan/${inProgress.id}`
          }
          const userVessel = await this.uservesselRepo.find({ where: { vessel_id: inProgress.vesselId }, relations: ['user'] });
          const permission = await this.notificationSettingRepository.findOne({ where: { userId: user.id } });
          if (permission) {
            userVessel.forEach(i => {
              if (i.user_id == user.id) {
                if (notify.action === NotificationAction.ACTION_PLAN_UPDATE && permission.anActionPlanUpdate)
                  this.pdfGateway.sendNotification({ notification: notify, data: rest });
              }
            });
          }

          // we are enable keyvalut in production after configure keyvalut on azure

          // const serverUrl = await this.KeyVaultService.getSecret('PROD-DB-SERVER_URL');


          this.notification.sendNotification(notify, userVessel, ACTION_PLAN_UPDATED_SUBJECT.replace("{{inspection_ID}}", "INS-" + inProgress?.uniqueId).replace("{{vessel_name}}", inProgress?.vessel.vesselName),
            ACTION_PLAN_UPDATED_BODY.replace("{{user_name}}", user?.fullName).replace("{{question_ID}}", questionId).replace("{{inspection_ID}}", "INS-" + inProgress?.uniqueId).replace("{{vessel_name}}", inProgress?.vessel.vesselName),
            `${process.env.SERVER_URL}/action-plan/${inProgress.id}`);  // replace with serverUrl
        } else {
          return {
            statusCode: 404,
            message: "Inspection Action Plan not found",
            data: null,
          };
        }
      } else {
        inspectionActionPlan = this.inspectionActionPlanRepository.create({
          status: (data.completionPercent == 100 && rest.status == null) ? actionPlanEnum.SUBMITTED : rest.status,
          ...rest,
          tpManagerId: user.id
        });
        const res = await this.inspectionActionPlanRepository.save(inspectionActionPlan);
        const questionId = inspection.subCategorySortCode + "." + inspection?.questionUniqueId;
        let type = user.role == Role.TPManager ? NotificationAction.APPROVAL_REQUEST : NotificationAction.ACTION_APPROVED;
        let title = user.role == Role.TPManager ? ACTION_PLAN_APPROVED_REQUEST_TITLE.replace("{{vesselName}}", inProgress?.vessel?.vesselName) : ACTION_APPROVED_TITLE.replace("{{questionID}}", questionId);
        let text = user.role == Role.TPManager ? ACTION_PLAN_APPROVED_REQUEST_TEXT.replace("{{userName}}", user?.fullName).replace("{{questionID}}", questionId) : ACTION_APPROVED_TEXT.replace("{{userName}}", user?.fullName).replace("{{questionID}}", questionId)
        const notify = {
          type: type,
          detail: res,
          title: title,
          text: text,
          action: NotificationAction.APPROVAL_REQUEST,
          link: `/action-plan/${inProgress.id}`
        }
        const userVesel = await this.uservesselRepo.find({ where: { vessel_id: inProgress.vesselId }, relations: ['user'] });
        const permission = await this.notificationSettingRepository.findOne({ where: { userId: user.id } });
        if (permission) {
          userVesel.forEach(i => {
            if (i.user_id == user.id) {
              if (notify.action === NotificationAction.APPROVAL_REQUEST && permission.onActionReqApproved)
                this.pdfGateway.sendNotification({ notification: notify, data: res });
            }
          });
        }


        // we are enable keyvalut in production after configure keyvalut on azure

        // const serverurl = await this.KeyVaultService.getSecret('PROD-DB-SERVER_URL');
       
        this.notification.sendNotification(notify, userVesel, APPROVAL_REQUEST_SUBJECT.replace("{{vessel_name}}", inProgress?.vessel?.vesselName),
          APPROVAL_REQUEST_BODY.replace("{{user_name}}", user?.fullName).replace("{{user_name}}", user?.fullName).replace("{{question_ID}}", questionId),
          `${process.env.SERVER_URL}/action-plan/${inProgress.id}`); //replace with serverurl
      }

      if (files && files.length > 0) {
        for (const file of files) {
          const fileName = await this.fileService.uploadFile(file, "actionPlanImages");
          const inspectionActionPlanImage =
            this.inspectionActionPlanImagesRepository.create({
              imageName: file.originalname,
              imageUrl: fileName, // Adjust this if you store the image differently
              inspActionPlanId: inspectionActionPlan.id,
            });
          await this.inspectionActionPlanImagesRepository.save(
            inspectionActionPlanImage,
          );
        }
      }

      if (inProgress) {
        var closedActions = await this.inspectionActionPlanRepository.find({
          where: { inspectionQuestionId: In(inProgress.questions.map(x => x.id)) },
        });
        var totalObservations = inProgress.questions.filter(x => x.observation == 'YES');
        if (closedActions.length > 0) {
          var filtered = closedActions.filter(x => x.completionPercent == 100);
          if (filtered.length == totalObservations.length) {
            await this.inspectionRepository.update(inspectionId, { status: inspectionStatus.Closed })
          }
        }
      }

      return {
        statusCode: 200,
        message: "Inspection Action Plan saved successfully",
        data: inspectionActionPlan,
      };
    } else {
      return WriteResponse(400, false, 'Action plan cannot be added as inpection is inProgress');
    }
  }

  async getInspectionActionPlan(id: string): Promise<any> {
    const inspectionActionPlan =
      await this.inspectionActionPlanRepository.findOne({
        where: { id },
        relations: ["images", "tpManager"],
      });

    if (!inspectionActionPlan) {
      return {
        statusCode: 404,
        message: "Inspection Action Plan not found",
        data: null,
      };
    }

    return {
      statusCode: 200,
      message: "Inspection Action Plan retrieved successfully",
      data: inspectionActionPlan,
    };
  }

  async getInspectionActionPlansByQuestionId(
    inspectionQuestionId: string,
  ): Promise<any> {
    const inspectionActionPlans =
      await this.inspectionActionPlanRepository.find({
        where: { inspectionQuestionId },
        relations: ["images", "tpManager"],
      });

    if (!inspectionActionPlans.length) {
      return {
        statusCode: 404,
        message:
          "No Inspection Action Plans found for the given inspectionQuestionId",
        data: null,
      };
    }

    return {
      statusCode: 200,
      message: "Inspection Action Plans retrieved successfully",
      data: inspectionActionPlans,
    };
  }

  async statusUpdate(data: statusUpdate, user: any) {
    try {
      const record = await this.inspectionActionPlanRepository.findOne({ where: { id: data.id } });
      if (!record) {
        return WriteResponse(404, false, 'Record not found');
      }
      await this.inspectionActionPlanRepository.update(data.id, { status: data.status, ApprovedBy: user.id, ApprovedDate: new Date() });
      const inspection = await this.inspectionQuesRepository.findOne({ where: { id: record.inspectionQuestionId } });
      const questionId = inspection.subCategorySortCode + "." + inspection?.questionUniqueId

      const notify = {
        type: NotificationAction.ACTION_APPROVED,
        detail: record,
        title: ACTION_APPROVED_TITLE.replace("{{questionID}}", questionId),
        text: ACTION_APPROVED_TEXT.replace("{{userName}}", user?.fullName).replace("{{questionID}}", questionId),
        action: NotificationAction.ACTION_APPROVED,
        link: `/action-plan/${inspection.id}`
      }
      const dataIns = await this.inspectionRepository.findOne({ where: { id: inspection.inspectionId } });
      const userVessl = await this.uservesselRepo.find({ where: { vessel_id: dataIns.vesselId }, relations: ['user'] });
      const permission = await this.notificationSettingRepository.findOne({ where: { userId: user.id } });
      if (permission) {
        userVessl.forEach(i => {
          if (i.user_id == user.id) {
            if (notify.action === NotificationAction.ACTION_APPROVED && permission.onActionApproved)
              this.pdfGateway.sendNotification({ notification: notify, data: record });
          }
        });
      }


      // we are enable keyvalut in production after configure keyvalut on azure

      // const serverUrl = await this.KeyVaultService.getSecret('PROD-DB-SERVER_URL');


      this.notification.sendNotification(notify, userVessl, APPROVED_ACTION_SUBJECT.replace("{{question_ID}}", questionId),
        APPROVED_ACTION_BODY.replace("{{user_name}}", user?.fullName).replace("{{user_name}}", user?.fullName).replace("{{question_ID}}", questionId),
        `${process.env.SERVER_URL}/action-plan/${inspection.inspectionId}`);
      return WriteResponse(200, true, 'Status updated successfully'); //replace with serverurl
    }
    catch (error) {
      console.log(error)
      return WriteResponse(500, error, 'Internal server error');
    }
  }
}
