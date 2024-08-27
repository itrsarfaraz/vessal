import { FilesAzureService } from "src/blob-storage/blob-storage.service";
import { ChecklistTemplate } from "src/checklist_template/entities/checklist_template.entity";
import { serverUrl, storageUrl } from "src/constent";
import { PdfGateway } from "src/geteway/pdf.gateway";
import { InspectionActionPlan } from "src/inspection-action-plan/entities/inspection-action-plan.entity";
import { InspectionAdditionalInfo } from "src/inspection_additional_info/entities/inspection_additional_info.entity";
import { PortsAdministration } from "src/ports_administration/entities/ports_administration.entity";
import { Report } from "src/report/entities/report.entity";
import { ImageStatus } from "src/shared/enum/imageStatus";
import { inspectionStatus } from "src/shared/enum/inspectionStatus";
import { User } from "src/user/entities/user.entity";
import { Vessel } from "src/vessel/entities/vessel.entity";
import { AfterInsert, AfterLoad, Column, CreateDateColumn, Entity, Generated, JoinColumn, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Inspection {
  @PrimaryColumn({ type: "uuid" })
  @Generated("uuid")
  id: string;

  @Column()
  vesselId: string

  @Column()
  InspectionTypeId: string

  @Column()
  InspectorId: string

  @Column({ type: "datetime" })
  inspectionDate: Date

  @Column({ default: null, nullable: true })
  lastInspectionDate: Date

  @Column()
  startPortId: string

  @Column()
  uniqueId: number

  @Column()
  isArchive: boolean

  @Column()
  status: inspectionStatus

  @Column()
  progress: number

  @Column()
  checklistTemplateId: string

  @Column()
  destinationPortId: string
  @Column()
  performedBy: string

  @CreateDateColumn()
  createdOn: Date

  @UpdateDateColumn()
  updatedOn: Date

  @ManyToOne(() => Vessel, (vessel) => vessel.inspection, { eager: true })
  @JoinColumn({ name: "vesselId" })
  vessel: Vessel;

  @ManyToOne(() => InspectionType, (inspection) => inspection.inspection, { eager: true })
  @JoinColumn({ name: "InspectionTypeId" })
  inspectionType: InspectionType[];


  @ManyToOne(() => ChecklistTemplate, (checklist) => checklist.inspection)
  @JoinColumn({ name: "checklistTemplateId" })
  checklist: ChecklistTemplate;

  @ManyToOne(() => User, (user) => user.inspection)
  @JoinColumn({ name: "InspectorId" })
  user: User;

  @ManyToOne(() => PortsAdministration, (port) => port.inspection)
  @JoinColumn({ name: "startPortId" })
  startPort: PortsAdministration;

  @ManyToOne(() => PortsAdministration, (port) => port.inspection)
  @JoinColumn({ name: "destinationPortId" })
  destinationPort: PortsAdministration;

  @OneToOne(() => InspectionAdditionalInfo, (additionalInfo) => additionalInfo.inspection)
  additionalInfo: InspectionAdditionalInfo;

  @OneToMany(() => Report, (inspect) => inspect.inspection)
  report: Report;

  @OneToMany(() => inspection_questions, (inspect) => inspect.inspection)
  questions: inspection_questions[];
  @OneToMany(() => GeneralComment, (inspect) => inspect.inspection)
  generalComment: GeneralComment[];


  @AfterInsert()
  async afterInsert() {
    if (this.status === inspectionStatus.Scheduled || this.status == inspectionStatus.Closed) {
      const pdfGateway = new PdfGateway(); // Instantiate PdfGateway
      pdfGateway.sendNotification(this);
    }
  }
}

@Entity()
export class InspectionType {
  @PrimaryColumn({ type: "uuid" })
  @Generated("uuid")
  id: string;

  @Column()
  name: string;

  @Column()
  isDeleted: boolean


  @CreateDateColumn()
  updatedOn: Date;

  @CreateDateColumn()
  createdOn: Date;

  @OneToMany(() => Inspection, (inspect) => inspect.inspectionType)
  inspection: Inspection;
}


@Entity()
export class inspection_questions {
  @PrimaryColumn({ type: "uuid" })
  @Generated("uuid")
  id: string;

  @Column()
  inspectionId: string;

  @Column()
  oldInspectionId: string;

  @Column()
  isCopy: boolean;


  @Column()
  hasAnswer: boolean;

  @Column()
  categoryName: string;

  @Column()
  subcategoryName: string;

  @Column()
  question: string;
  
  @Column()
  questionId: string;
  @Column()
  questionUniqueId: number;

  @Column()
  isComment: boolean;

  @Column()
  isGrade: boolean;

  @Column()
  weight: number;

  @Column()
  guidelines: string;

  @Column()
  comment: string;

  @Column()
  grade: string;

  @Column()
  observation: string;

  @Column()
  actions: string;

  @Column()
  categorySortCode: string;

  @Column()
  subCategorySortCode: string;

  @OneToOne(() => InspectionActionPlan, (a) => a.inspection_question)
  actionPlan: InspectionActionPlan


  @OneToMany(() => inspection_images, (a) => a.inspection_question)
  images: inspection_images[]

  @ManyToOne(() => Inspection, (i) => i.questions)
  @JoinColumn({ name: "inspectionId" })
  inspection: Inspection;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedOn: Date;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdOn: Date;
}

@Entity()
export class inspection_images {
  @PrimaryColumn({ type: "uuid" })
  @Generated("uuid")
  id: string;

  @Column()
  inspectionQuestionId: string;

  @Column()
  imageName: string;

  imageUrl: string;


  @Column()
  imageStatus: ImageStatus;

  @Column()
  originalName: string;

  @ManyToOne(() => inspection_questions, (e) => e.images)
  inspection_question: inspection_questions



  @AfterLoad()
  async setFullImagePath() {
    if (this.imageName && !this.imageName?.startsWith(storageUrl)) {
      const fileService = new FilesAzureService(); // Adjust instantiation as necessary
      const containerName = "inspection_images"; // Replace with your actual container name
      this.imageUrl = await fileService.getFileUrl(this.imageName, containerName);
    }
  }
}
@Entity({ name: "inspection_general_comments" })
export class GeneralComment {
  @PrimaryColumn({ type: "uuid" })
  @Generated("uuid")
  id: string;

  @Column()
  generalComment: string;

  @Column()
  inspectionId: string;

  @Column()
  categoryName: string;

  @ManyToOne(() => Inspection, (i) => i.generalComment)
  @JoinColumn({ name: "inspectionId" })
  inspection: Inspection;
}
@Entity('question_history')
export class QuestionHistory {
  @PrimaryColumn({ type: "uuid" })
  @Generated("uuid")
  id: string;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight: number;

  @Column({ type: 'char', length: 36, nullable: true })
  categoryId: string;

  @Column({ type: 'char', length: 36, nullable: true })
  uniqueId: string;

  @Column({ type: 'char', length: 36, nullable: true })
  subCategoryId: string;

  @Column({ type: 'text', nullable: true })
  guidelines: string;

  @Column({ type: 'text', nullable: true })
  grade: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'text', nullable: true })
  status: string;

  @Column({ type: 'boolean', default: false })
  isArchive: boolean;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdOn: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedOn: Date;

  @Column({ type: 'char', length: 36, nullable: true })
  createdBy: string;

  @Column({ type: 'char', length: 36, nullable: true })
  updatedBy: string;

  @Column({ type: 'char', length: 36, nullable: true })
  questionId: string;

  @Column({ type: 'int', nullable: true })
  version: string;
}

