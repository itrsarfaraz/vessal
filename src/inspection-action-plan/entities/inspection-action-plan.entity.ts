import { FilesAzureService } from 'src/blob-storage/blob-storage.service';
import { serverUrl, storageUrl } from 'src/constent';
import { inspection_questions } from 'src/inspection/entities/inspection.entity';
import { User } from 'src/user/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, AfterLoad, OneToOne } from 'typeorm';

import { v4 as uuidv4 } from 'uuid';

@Entity('inspection_action_plan')
export class InspectionActionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string = uuidv4();

  @Column()
  inspectionQuestionId: string;

  @Column('text')
  comment: string;

  @Column('date')
  dueDate: Date;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  completionPercent: number;

  @Column()
  tpManagerId: number;



  @CreateDateColumn({ type: 'timestamp' })
  createdOn: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedOn: Date;

  @ManyToOne(() => User, actionPlan => actionPlan.insActionPlan)
  @JoinColumn({ name: 'tpManagerId' })
  tpManager: User;


  @OneToOne(() => inspection_questions, actionPlan => actionPlan.actionPlan)
  @JoinColumn({ name: 'inspectionQuestionId' })
  inspection_question: inspection_questions;

  @OneToMany(() => InspectionActionPlanImages, images => images.inspectionActionPlan, { cascade: true })
  images: InspectionActionPlanImages[];

  @Column()
  status: string;

  @Column()
  ApprovedBy: string;

  @CreateDateColumn()
  ApprovedDate: Date;

}

@Entity('inspection_action_plan_images')
export class InspectionActionPlanImages {
  @PrimaryGeneratedColumn('uuid')
  id: string = uuidv4();

  @Column()
  imageName: string;

  @Column()
  imageUrl: string;

  @Column()
  inspActionPlanId: string;


  @ManyToOne(() => InspectionActionPlan, actionPlan => actionPlan.images)
  @JoinColumn({ name: 'inspActionPlanId' })
  inspectionActionPlan: InspectionActionPlan;


  @AfterLoad()
  async setFullImagePath() {
    if (this.imageUrl && !this.imageUrl?.startsWith(storageUrl)) {
      const fileService = new FilesAzureService(); // Adjust instantiation as necessary
      const containerName = "actionPlanImages"; // Replace with your actual container name
      this.imageUrl = await fileService.getFileUrl(this.imageUrl, containerName);
    }
  }
}
