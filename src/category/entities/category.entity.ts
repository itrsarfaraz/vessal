// import { Length } from "class-validator";
// import { Questions } from "src/questions/entities/question.entity";
import { ChecklistTemplateQuestion } from "src/checklist_template/entities/checklist_template.entity";
import { Questions } from "src/questions/entities/question.entity";
import { User } from "src/user/entities/user.entity";
import { Column, CreateDateColumn, Entity, Generated, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";

@Entity({ name: 'categories' })
export class Category {
    @PrimaryColumn({ type: 'uuid' })
    @Generated('uuid')
    id: string

    @Column({ length: 50, nullable: false })
    categoryName: string


    @Column({ length: 50, nullable: false })
    sortCode: string

    @Column({ nullable: true })
    parentCategoryId: string

    @Column()
    description: string

    @CreateDateColumn()
    createdOn: Date

    @CreateDateColumn()
    updatedOn: Date

    @Column({ nullable: true })
    createdBy: string

    @Column({ nullable: true })
    updatedBy: string

    @Column({ nullable: true })
    deletedBy: string

    @Column({ type: 'boolean', default: false })
    isdeleted: boolean;

    @OneToMany(() => Questions, (user) => user.category)
    questions: Questions[];

    @OneToMany(() => Questions, (user) => user.subCategory)
    subquestions: Questions[];


    @ManyToOne(() => Category, (category) => category.subCategories)
    @JoinColumn({ name: "parentCategoryId" })
    parentCategory?: Category;

    // Non-database field
    @OneToMany(() => Category, (category) => category.parentCategory)
    subCategories?: Category[];

    // @OneToMany(() => ChecklistTemplateQuestion, (category) => category.Category)
    // checklist: ChecklistTemplateQuestion;
}

