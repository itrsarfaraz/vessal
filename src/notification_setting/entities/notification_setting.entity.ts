import { NotificationType } from "src/shared/enum/notificationType";
import { User } from "src/user/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";

@Entity({ name: "notification_setting" })
export class NotificationSetting {
  @PrimaryColumn({ type: "uuid" })
  @Generated("uuid")
  id: string;

  @Column()
  userId: string;
  @Column({
    type: "enum",
    enum: NotificationType,
    default: NotificationType.Activity,
  })
  notificationType: NotificationType;

  @Column()
  isNewInspection: boolean;

  @Column()
  isInspectionFinish: boolean;

  @Column()
  isReportGenerate: boolean;

  @Column()
  anActionPlanUpdate: boolean;

  @CreateDateColumn()
  createdOn: Date;

  @CreateDateColumn()
  updatedOn: Date;

  @Column()
  isDeleted: boolean;

  @Column({ default: false })
  isEnabled: boolean;

  @ManyToOne(() => User, (u) => u.notificationSetting)
  user: User;

  @Column({ type: "boolean", default: false })
  onInspectionStatusChange: boolean;

  @Column({ type: "boolean", default: false })
  onActionApproved: boolean;

  @Column({ type: "boolean", default: false })
  onActionReqApproved: boolean;
}
