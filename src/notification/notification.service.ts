import { serverUrl } from "src/constent";
import { Injectable } from "@nestjs/common";
import {
  CreateNotificationDto,
  UpdateReadStatusDto,
  markAllReadDto,
} from "./dto/create-notification.dto";
import { UpdateNotificationDto } from "./dto/update-notification.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Notification, ReadNotification } from "./entities/notification.entity";
import { writer } from "repl";
import { WriteResponse } from "src/shared/response";
import { NotificationSetting } from "src/notification_setting/entities/notification_setting.entity";
import { inspectionStatus } from "src/shared/enum/inspectionStatus";
import { NotificationType } from "src/shared/enum/notificationType";
import { Vessel } from "src/vessel/entities/vessel.entity";
import { User_Vessel } from "src/user/entities/user.entity";
import { Role } from "src/shared/enum/Role";
import { IPagination } from "src/shared/paginationEum";
const nodemailer = require("nodemailer");
@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationSetting)
    private readonly notificationSettingRepository: Repository<NotificationSetting>,
    @InjectRepository(User_Vessel)
    private readonly vesselRepository: Repository<User_Vessel>,
    @InjectRepository(ReadNotification)
    private readNotificationRepository: Repository<ReadNotification>,
  ) { }

  async findAll(users: any) {
    try {
      const data = await this.notificationRepository
        .createQueryBuilder("notification")
        .leftJoinAndSelect(
          "notification.readNotifications",
          "readNotification"
        )
        .orderBy("notification.createdAt", "DESC")
        .getMany();

      const permission = await this.notificationSettingRepository.findOne({
        where: { userId: users.id, notificationType: NotificationType.Alert },
      });

      if (!permission) {
        return WriteResponse(404, [], "User notification permission not found");
      }

      const vesselUsers = users?.userVessel ?? [];
      const isAdminOrSuperAdmin = users.role === Role.Admin || users.role === Role.SuperAdmin;
      const isTpManager = users.role === Role.TPManager;

      const filteredNotifications = data.filter((notification) => {
        const vesselId = notification?.detail?.vesselId;
        const readNotification = notification.readNotifications.find(
          (i) => i.notificationId == notification.id && i?.userId == users?.id
        );

        // Skip notifications that have been removed
        if (readNotification?.isRemoved) {
          console.log(`Notification ${notification.id} removed by user ${users.id}`);
          return false;
        }

        // Add isRead dynamically to the notification object
        notification["isRead"] = readNotification ? readNotification.isRead : false;

        // Check notification action against user's permissions
        const actionPermissions = {
          "Inspection Added": permission.isNewInspection,
          "InspectionFinish": permission.isInspectionFinish,
          "Report Generated": permission.isReportGenerate,
          "Action Plan Update": permission.anActionPlanUpdate,
          "Status Change": permission.onInspectionStatusChange,
          "Action Approved": permission.onActionApproved,
          "Approval Request": permission.onActionReqApproved,
        };

        // Approval Request is visible only to Admin and SuperAdmin
        if (notification.action === "Approval Request" && !isAdminOrSuperAdmin) {
          console.log(`Notification ${notification.id} not visible due to Approval Request action`);
          return false;
        }

        // Action Approved is visible only to TpManager or Admin/SuperAdmin
        if (notification.action === "Action Approved" && !(isTpManager || isAdminOrSuperAdmin)) {
          console.log(`Notification ${notification.id} not visible due to Action Approved action`);
          return false;
        }

        // Skip notifications that are not related to the user's vessels (for non-admin roles)
        if (!isAdminOrSuperAdmin && !vesselUsers.some(vu => vu.vessel_id === vesselId)) {
          console.log(`Notification ${notification.id} not visible due to vessel restriction`);
          return false;
        }

        // Finally, check the action permissions
        if (!actionPermissions[notification.action]) {
          console.log(`Notification ${notification.id} not visible due to permission restriction`);
          return false;
        }
        if (isAdminOrSuperAdmin && actionPermissions[notification.action]) {
          return true;
        }
        return true;
      });

      console.log(`Filtered notifications count: ${filteredNotifications.length}`);

      if (filteredNotifications.length > 0) {
        return WriteResponse(200, filteredNotifications, "Record Found Successfully.");
      } else {
        return WriteResponse(404, [], "Record Not Found");
      }
    } catch (err) {
      console.error(err);
      return WriteResponse(500, false, "Something Went Wrong.");
    }
  }

  public async sendNotification(
    createNotificationDto: CreateNotificationDto,
    userId?: any,
    subject?: any,
    emailText?: any,
    link?: any,
  ) {
    try {
      const save = await this.notificationRepository.save(createNotificationDto);
      const emailPromises = userId.map((user) => {
        return this.sendEmail(user.user, subject, emailText, link);
      });
      await Promise.all(emailPromises);
    } catch (err) {
      console.log(err.message);
      return WriteResponse(500, false, "Something went wrong");
    }
  }

  async updateReadStatus(updateReadStatusDto: UpdateReadStatusDto) {
    try {
      const { userId, notificationId, isRead } = updateReadStatusDto;

      let readNotification = await this.readNotificationRepository.findOne({
        where: { userId, notificationId },
      });

      if (!readNotification) {
        readNotification = this.readNotificationRepository.create({
          userId,
          notificationId,
        });
      }

      readNotification.isRead = isRead ?? true;
      this.readNotificationRepository.save(readNotification);
      return WriteResponse(200, true, "Notification marked as read.");
    } catch (err) {
      return WriteResponse(500, false, "Something went wrong");
    }
  }

  async removeNotification(updateReadStatusDto: UpdateReadStatusDto) {
    try {
      const { userId, notificationId } = updateReadStatusDto;

      let readNotification = await this.readNotificationRepository.findOne({
        where: { userId, notificationId },
      });

      if (!readNotification) {
        readNotification = this.readNotificationRepository.create({
          userId,
          notificationId,
        });
      }

      readNotification.isRemoved = true;
      this.readNotificationRepository.save(readNotification);
      return WriteResponse(200, true, "Notification removed successfully");
    } catch (err) {
      return WriteResponse(500, true, "Something went wrong");
    }
  }

  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com", // Replace with your SMTP server
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "ekta.microlent@gmail.com", // Your new email address
      pass: "gqor zrmd lrlg vhmz", // Your new email password
    },
  });

  // Function to send email
  async sendEmail(to, subject, text, link) {
    let info = await this.transporter.sendMail({
      from: "ekta.microlent@gmail.com",
      to: to.email, // List of receivers
      subject: subject, // Subject line
      text: text, // Plain text body
      html: `<h4>${to.fullName}</h4></br>
      <p>${text}</p></br>
      <a href=${link}>Check on Vessel Inspection App</a></br>
      <h5>Best regards,</h5>
      <h5>Inspection System Notification</h5>
      `,
    });
  }

  //Mark all notification as read
  async updateMultipleReadStatus(updateReadStatusDto: markAllReadDto) {
    const { userId, notificationIds, isRead } = updateReadStatusDto;

    try {
      const readNotifications = await this.readNotificationRepository.find({
        where: {
          userId,
          notificationId: In(notificationIds),
        },
      });

      const readNotificationMap = new Map(
        readNotifications.map((rn) => [rn.notificationId, rn]),
      );

      const newReadNotifications = notificationIds.map((notificationId) => {
        let readNotification = readNotificationMap.get(notificationId);

        if (!readNotification) {
          readNotification = this.readNotificationRepository.create({
            userId,
            notificationId,
          });
        }

        readNotification.isRead = isRead;
        return readNotification;
      });

      await this.readNotificationRepository.save(newReadNotifications);

      return WriteResponse(200, true, "Notifications marked as read.");
    } catch (err) {
      console.error(err);
      return WriteResponse(500, false, "Something went wrong");
    }
  }

  async pagination(users: any, pagination: IPagination) {
    try {
      const { curPage, perPage, whereClause } = pagination;
      const skip = (curPage - 1) * perPage;
      let lwhereClause = "";

      const fieldsToSearch = [
        "text",
        "title",
        "action",
      ];

      // Build the where clause based on individual fields
      fieldsToSearch.forEach((field) => {
        const fieldValue = whereClause.find((p) => p.key === field)?.value;
        if (fieldValue) {
          lwhereClause = `f.${field} LIKE '%${fieldValue}%'`;
        }
      });

      // Handle the 'all' search filter
      const allValue = whereClause.find((p) => p.key === "all")?.value;
      if (allValue) {
        const conditions = fieldsToSearch
          .map((field) => `f.${field} LIKE '%${allValue}%'`)
          .join(" OR ");
        lwhereClause = `(${conditions})`;
      }
      const [data, count] = await this.notificationRepository
        .createQueryBuilder("notification")
        .leftJoinAndSelect(
          "notification.readNotifications",
          "readNotification"
        ).where(lwhereClause)
        .andWhere("readNotification.isRead = :isRead", { isRead: false })
        .skip(skip)
        .take(perPage)
        .orderBy("notification.createdAt", "DESC")
        .getManyAndCount();

      const permission = await this.notificationSettingRepository.findOne({
        where: { userId: users.id, notificationType: NotificationType.Alert },
      });

      if (!permission) {
        return WriteResponse(404, [], "User notification permission not found");
      }

      const vesselUsers = users?.userVessel ?? [];
      const isAdminOrSuperAdmin = users.role === Role.Admin || users.role === Role.SuperAdmin;
      const isTpManager = users.role === Role.TPManager;
      const filteredNotifications = data.filter((notification) => {
        const vesselId = notification?.detail?.vesselId;
        const readNotification = notification.readNotifications.find(
          (i) => i.notificationId == notification.id && i?.userId == users?.id
        );

        // Skip notifications that have been removed
        if (readNotification?.isRemoved) {
          console.log(`Notification ${notification.id} removed by user ${users.id}`);
          return false;
        }

        // Add isRead dynamically to the notification object
        notification["isRead"] = readNotification ? readNotification.isRead : false;

        // Check notification action against user's permissions
        const actionPermissions = {
          "Inspection Added": permission.isNewInspection,
          "InspectionFinish": permission.isInspectionFinish,
          "Report Generated": permission.isReportGenerate,
          "Action Plan Update": permission.anActionPlanUpdate,
          "Status Change": permission.onInspectionStatusChange,
          "Action Approved": permission.onActionApproved,
          "Approval Request": permission.onActionReqApproved,
        };

        // Approval Request is visible only to Admin and SuperAdmin
        if (notification.action === "Approval Request" && !isAdminOrSuperAdmin) {
          console.log(`Notification ${notification.id} not visible due to Approval Request action`);
          return false;
        }

        // Action Approved is visible only to TpManager or Admin/SuperAdmin
        if (notification.action === "Action Approved" && !(isTpManager || isAdminOrSuperAdmin)) {
          console.log(`Notification ${notification.id} not visible due to Action Approved action`);
          return false;
        }

        // Skip notifications that are not related to the user's vessels (for non-admin roles)
        if (!isAdminOrSuperAdmin && !vesselUsers.some(vu => vu.vessel_id === vesselId)) {
          console.log(`Notification ${notification.id} not visible due to vessel restriction`);
          return false;
        }

        // Finally, check the action permissions
        if (!actionPermissions[notification.action]) {
          console.log(`Notification ${notification.id} not visible due to permission restriction`);
          return false;
        }
        if (isAdminOrSuperAdmin && actionPermissions[notification.action]) {
          return true;
        }
        return true;
      });
      console.log(filteredNotifications.length)

      if (filteredNotifications.length > 0) {
        return WriteResponse(200, { filteredNotifications, count }, "Record Found Successfully.");
      } else {
        return WriteResponse(404, [], "Record Not Found");
      }
    } catch (err) {
      console.error(err);
      return WriteResponse(500, false, "Something Went Wrong.");
    }
  }
}
