
import { Category } from "src/category/entities/category.entity";
import { ChecklistTemplateQuestion } from "src/checklist_template/entities/checklist_template.entity";
import { Column, CreateDateColumn, Entity, Generated, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";

@Entity({ name: 'questions' })
export class Questions {
    @PrimaryColumn({type:'uuid'})
    @Generated('uuid')
    id:string;

    @Column()
    question:string;

    @Column()
    weight: number;

    @Column()
    uniqueId: number;

    @Column()
    categoryId:string;

    @Column()
    subCategoryId:string;

    @Column()
    guidelines:string;

    @Column({type:'boolean',default:false})
    grade:boolean;

    @Column({type:'boolean',default:false})
    comment:boolean;

    @Column({type:'boolean',default:false})
    status:boolean;

    @Column({type:'boolean',default:false})
    isArchive:boolean ;

    @CreateDateColumn()
    createdOn : Date;

    @CreateDateColumn()
    updatedOn : Date;
    
    @Column()
    createdBy:string;
  
    @CreateDateColumn()
    updatedBy:string;

    @ManyToOne(() => Category, (category) => category.questions)
    @JoinColumn({ name: 'categoryId' })
    category: Category;


    @ManyToOne(() => Category, (category) => category.subquestions)
    @JoinColumn({ name: 'subCategoryId' })
    subCategory: Category;

    @OneToMany(() => ChecklistTemplateQuestion, (question) => question.template)
    questions: ChecklistTemplateQuestion[];
  
  
}
















    // @ManyToOne(() => Categories2, (categories) => categories.questions)
    // @JoinColumn({ name: 'categoryId' })
    // category: Categories2;