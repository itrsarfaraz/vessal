
import { FilesAzureService } from 'src/blob-storage/blob-storage.service';
import { serverUrl, storageUrl } from 'src/constent';
import { InspectionActionPlan } from 'src/inspection-action-plan/entities/inspection-action-plan.entity';
import { Inspection } from 'src/inspection/entities/inspection.entity';
import { Notification } from 'src/notification/entities/notification.entity';
import { NotificationSetting } from 'src/notification_setting/entities/notification_setting.entity';
import { Role } from 'src/shared/enum/Role';
import { Vessel } from 'src/vessel/entities/vessel.entity';

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  PrimaryColumn,
  Generated,
  ManyToOne,
  JoinColumn,
  OneToOne,
  ManyToMany,
  AfterLoad,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  @Generated('uuid')
  id: string;

  @Column({ nullable: false })
  fullName: string;

  
  @Column({ nullable: false })
  email: string;


  @Column({ nullable: false })
  profilePicture: string;

  @Column({ default: Role.Viewer })
  role: string;

  @Column({ nullable: false })
  notes: string;
  @Column({ nullable: false })
  address: string;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  created_on: Date;

  @CreateDateColumn()
  updated_on: Date;

  @OneToMany(() => User_Info, (user) => user.user)
  user_info: User_Info[];

  @OneToMany(() => User_Vessel, (user) => user.user)
  userVessel: User_Vessel[];

  @OneToMany(() => Inspection, (user) => user.user)
  inspection: Inspection;

  @OneToMany(() => InspectionActionPlan, images => images.tpManager)
  insActionPlan: InspectionActionPlan[];

  @OneToMany(() => NotificationSetting, s => s.user)
  notificationSetting: NotificationSetting[];

  
  image_url: string;

  @AfterLoad()
  async setImageUrl() {
    if (this.profilePicture) {
      const fileService = new FilesAzureService(); // Adjust instantiation as necessary
      const containerName = "profile_images"; // Replace with your actual container name
      this.image_url = await fileService.getFileUrl(this.profilePicture, containerName);
    }
  }
}


@Entity({ name: 'user_info' })
export class User_Info {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: ['EMAIL', 'PHONE'], nullable: true })
  type: string;

  @Column({ type: 'enum', enum: ['WORK', 'HOME', 'OTHER'], nullable: true })
  label: string;

  @Column({ type: 'text', nullable: true })
  field_value: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  country_code: string;

  @CreateDateColumn()
  created_on: Date;

  @CreateDateColumn()
  updated_on: Date;

  @ManyToOne(() => User, (u) => u.user_info)
  @JoinColumn({name: "userId"})
  user: User;
}

@Entity({ name: 'user_vessel' })
export class User_Vessel {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column({nullable:false})
  user_id: string;

  @CreateDateColumn()
  created_on: Date;

  @CreateDateColumn()
  updated_on: Date;

  @Column({ type: 'boolean', nullable: true, default: false })
  isDeleted: boolean;

  @Column({nullable:false})
  vessel_id: string;

  @ManyToOne(() => User, (user: User) => user.userVessel)
  @JoinColumn({name: "user_id"})
  user: User;


  @ManyToOne(() => Vessel, (user: Vessel) => user.userVessels)
  @JoinColumn({name: "vessel_id"})
  vessel: Vessel;
}





