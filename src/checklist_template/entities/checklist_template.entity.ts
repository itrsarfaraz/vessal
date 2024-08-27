import { Category } from './../../category/entities/category.entity';
import { Inspection } from "src/inspection/entities/inspection.entity";
import { Questions } from "src/questions/entities/question.entity";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  Generated,
} from "typeorm";

@Entity()
export class ChecklistTemplate {
  @PrimaryColumn({ type: "uuid" })
  @Generated("uuid")
  id: string;

  @Column()
  checklist_name: string;

  @Column()
  createdBy: string;

  @Column({ default: false })
  isDeleted: boolean;

  @Column()
  uniqueId:string

  @OneToMany(() => ChecklistTemplateQuestion, (question) => question.template)
  questions: ChecklistTemplateQuestion[];

  @CreateDateColumn()
  createdOn: Date;

  @UpdateDateColumn()
  updatedOn: Date;

  @OneToMany(() => Inspection, (inspection) => inspection.checklist)
  inspection: Inspection;
  question: any;
  comment: any;
  grade: any;
  weight: any;
  guidelines: any;
  categoryName: any;
}

@Entity()
export class ChecklistTemplateQuestion {
  @PrimaryColumn({ type: "uuid" })
  @Generated("uuid")
  id: string;

  // @Column()
  // categoryId: string;



  @Column()
  templateId: string;

  // @Column()
  // sub_categoryId: string;

  @Column()
  questionId: string;

  @CreateDateColumn({type: "timestamp"})
  createdOn: Date;

  @UpdateDateColumn({type: "timestamp"})
  updatedOn: Date;

  @ManyToOne(() => ChecklistTemplate, (template) => template.questions)
  @JoinColumn({ name: "templateId" })
  template: ChecklistTemplate;

  @ManyToOne(() => Questions, (template) => template.questions,{eager:true})
  @JoinColumn({ name: "questionId" })
  question: Questions;

  // @ManyToOne(() => Category, (category) => category.checklist,{eager:true})
  // @JoinColumn({ name: "categoryId" })
  // Category: Category;

  // @ManyToOne(() => Category, (category) => category.checklist,{eager:true})
  // @JoinColumn({ name: "sub_categoryId" })
  // subCategory: Category;
}
